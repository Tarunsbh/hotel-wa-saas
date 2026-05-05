"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let TemplatesService = class TemplatesService {
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
    }
    async findAll(hotelId, query) {
        const { status, category } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 20);
        const skip = (page - 1) * limit;
        const where = { hotelId, deletedAt: null };
        if (status)
            where.status = status;
        if (category)
            where.category = category;
        const [data, total] = await Promise.all([
            this.prisma.template.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.template.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(hotelId, id) {
        const template = await this.prisma.template.findFirst({
            where: { id, hotelId, deletedAt: null },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template ${id} not found`);
        }
        return template;
    }
    async create(hotelId, dto) {
        const components = (dto.components && dto.components.length > 0)
            ? dto.components
            : this.buildComponentsFromFields({
                headerType: dto.headerType,
                headerText: dto.headerText,
                bodyText: dto.bodyText || '',
                footerText: dto.footerText,
                buttons: dto.buttons,
            });
        const template = await this.prisma.template.create({
            data: {
                hotelId,
                name: dto.name,
                category: dto.category,
                language: dto.language,
                status: 'DRAFT',
                components: components,
                headerType: dto.headerType,
                headerText: dto.headerText,
                bodyText: dto.bodyText || '',
                footerText: dto.footerText,
                buttons: dto.buttons,
            },
        });
        if (dto.submitToMeta) {
            try {
                const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
                if (hotel?.wabaId && hotel.wabaId !== 'CONFIGURE_IN_SETTINGS') {
                    const result = await this.whatsappService.createTemplateOnMeta(hotelId, hotel.wabaId, {
                        name: template.name,
                        category: template.category,
                        language: template.language,
                        components: template.components,
                    });
                    await this.prisma.template.update({
                        where: { id: template.id },
                        data: { metaTemplateId: result.id, status: 'PENDING', rejectionReason: null },
                    });
                    return this.findOne(hotelId, template.id);
                }
            }
            catch (e) {
                const errorMessage = this.getMetaErrorMessage(e);
                await this.prisma.template.update({
                    where: { id: template.id },
                    data: { rejectionReason: errorMessage },
                });
                throw new common_1.BadRequestException(`Meta submission failed: ${errorMessage}`);
            }
        }
        return template;
    }
    async update(hotelId, id, dto) {
        await this.findOne(hotelId, id);
        const components = (dto.components && dto.components.length > 0)
            ? dto.components
            : this.buildComponentsFromFields({
                headerType: dto.headerType,
                headerText: dto.headerText,
                bodyText: dto.bodyText,
                footerText: dto.footerText,
                buttons: dto.buttons,
            });
        return this.prisma.template.update({
            where: { id },
            data: {
                name: dto.name,
                category: dto.category,
                language: dto.language,
                components: components,
                headerType: dto.headerType,
                headerText: dto.headerText,
                bodyText: dto.bodyText,
                footerText: dto.footerText,
                buttons: dto.buttons,
            },
        });
    }
    async softDelete(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.template.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async syncFromMeta(hotelId, wabaId) {
        let resolvedWabaId = wabaId;
        if (!resolvedWabaId) {
            const hotel = await this.prisma.hotel.findUnique({
                where: { id: hotelId },
                select: { wabaId: true },
            });
            resolvedWabaId = hotel?.wabaId;
        }
        if (!resolvedWabaId || resolvedWabaId === 'CONFIGURE_IN_SETTINGS') {
            throw new common_1.BadRequestException('WABA ID is not configured. Go to Settings → WhatsApp and save your WABA ID.');
        }
        const metaTemplates = await this.whatsappService.fetchTemplatesFromMeta(hotelId, resolvedWabaId);
        let synced = 0;
        let errors = 0;
        const errorMessages = [];
        for (const mt of metaTemplates) {
            try {
                const existing = await this.prisma.template.findFirst({
                    where: { hotelId, metaTemplateId: mt.id },
                });
                const data = {
                    name: mt.name,
                    category: mt.category,
                    language: mt.language,
                    status: mt.status,
                    components: mt.components,
                    bodyText: this.extractBodyText(mt.components) || mt.name,
                    headerText: this.extractHeaderText(mt.components),
                    footerText: this.extractFooterText(mt.components),
                    rejectionReason: mt.rejected_reason,
                    syncedAt: new Date(),
                    deletedAt: null,
                };
                if (existing) {
                    await this.prisma.template.update({ where: { id: existing.id }, data });
                }
                else {
                    await this.prisma.template.create({
                        data: { ...data, hotelId, metaTemplateId: mt.id },
                    });
                }
                synced++;
            }
            catch (e) {
                errors++;
                errorMessages.push(`Template ${mt.name}: ${e.message}`);
            }
        }
        return { synced, errors, errorMessages };
    }
    async duplicate(hotelId, id) {
        const original = await this.findOne(hotelId, id);
        const baseName = `${original.name}_copy`;
        let name = baseName;
        let counter = 1;
        while (await this.prisma.template.findFirst({
            where: { hotelId, name, deletedAt: null },
        })) {
            name = `${baseName}_${counter++}`;
        }
        return this.prisma.template.create({
            data: {
                hotelId,
                name,
                category: original.category,
                language: original.language,
                status: 'DRAFT',
                components: original.components,
                headerType: original.headerType,
                headerText: original.headerText,
                bodyText: original.bodyText,
                footerText: original.footerText,
                buttons: original.buttons,
            },
        });
    }
    async submitToMeta(hotelId, id) {
        const template = await this.findOne(hotelId, id);
        if (!['DRAFT', 'REJECTED'].includes(template.status)) {
            throw new common_1.BadRequestException('Only DRAFT or REJECTED templates can be submitted to Meta');
        }
        const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel?.wabaId || hotel.wabaId === 'CONFIGURE_IN_SETTINGS') {
            throw new common_1.BadRequestException('WABA ID not configured. Go to Settings and save your WABA ID.');
        }
        let components = template.components;
        if (!components || !components.length) {
            components = this.buildComponentsFromFields({
                headerType: template.headerType,
                headerText: template.headerText,
                bodyText: template.bodyText,
                footerText: template.footerText,
                buttons: template.buttons,
            });
            await this.prisma.template.update({ where: { id }, data: { components: components } });
        }
        try {
            const result = await this.whatsappService.createTemplateOnMeta(hotelId, hotel.wabaId, {
                name: template.name,
                category: template.category,
                language: template.language,
                components,
            });
            return this.prisma.template.update({
                where: { id },
                data: { metaTemplateId: result.id, status: 'PENDING', rejectionReason: null },
            });
        }
        catch (e) {
            const errorMessage = this.getMetaErrorMessage(e);
            await this.prisma.template.update({
                where: { id },
                data: { rejectionReason: errorMessage },
            });
            throw new common_1.BadRequestException(`Meta submission failed: ${errorMessage}`);
        }
    }
    async deleteOnMeta(hotelId, id) {
        const template = await this.findOne(hotelId, id);
        const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel?.wabaId || hotel.wabaId === 'CONFIGURE_IN_SETTINGS') {
            throw new common_1.BadRequestException('WABA ID not configured');
        }
        await this.whatsappService.deleteTemplateOnMeta(hotelId, hotel.wabaId, template.name);
        return this.prisma.template.update({
            where: { id },
            data: { status: 'DRAFT', metaTemplateId: null },
        });
    }
    buildComponentsFromFields(fields) {
        const components = [];
        if (fields.headerType && fields.headerType !== 'NONE') {
            const format = fields.headerType.toUpperCase();
            if (format === 'TEXT') {
                if (fields.headerText) {
                    components.push({ type: 'HEADER', format, text: fields.headerText });
                }
            }
            else {
                throw new common_1.BadRequestException('Media header templates (IMAGE/VIDEO/DOCUMENT) are not supported yet. Use a TEXT header or NONE.');
            }
        }
        if (fields.bodyText) {
            components.push({ type: 'BODY', text: fields.bodyText });
        }
        if (fields.footerText) {
            components.push({ type: 'FOOTER', text: fields.footerText });
        }
        if (fields.buttons && fields.buttons.length > 0) {
            const buttons = fields.buttons.map((btn) => {
                const b = { type: btn.type, text: btn.text };
                if (btn.type === 'URL')
                    b.url = btn.url;
                if (btn.type === 'PHONE_NUMBER')
                    b.phone_number = btn.phone_number || btn.phoneNumber;
                return b;
            });
            components.push({ type: 'BUTTONS', buttons });
        }
        return components;
    }
    extractBodyText(components) {
        const body = components?.find((c) => c.type === 'BODY');
        return body?.text || '';
    }
    extractHeaderText(components) {
        const header = components?.find((c) => c.type === 'HEADER');
        return header?.text || undefined;
    }
    extractFooterText(components) {
        const footer = components?.find((c) => c.type === 'FOOTER');
        return footer?.text || undefined;
    }
    getMetaErrorMessage(error) {
        return (error?.response?.data?.error?.message ||
            error?.response?.data?.error?.error_user_msg ||
            error?.message ||
            'Unknown Meta error');
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map