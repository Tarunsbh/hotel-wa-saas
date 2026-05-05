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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const phone_util_1 = require("../common/utils/phone.util");
let MessagesService = class MessagesService {
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
    }
    async getConversationWithGuest(hotelId, conversationId) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, hotelId },
            include: {
                guest: true,
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation ${conversationId} not found`);
        }
        return conversation;
    }
    async getPhoneNumberId(hotelId) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { phoneNumberId: true },
        });
        if (!hotel?.phoneNumberId) {
            throw new common_1.BadRequestException('Hotel has no WhatsApp Phone Number ID configured');
        }
        return hotel.phoneNumberId;
    }
    async findByConversation(hotelId, conversationId, query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 50);
        await this.getConversationWithGuest(hotelId, conversationId);
        const total = await this.prisma.message.count({ where: { conversationId } });
        const skip = Math.max(0, total - (page * limit));
        const take = Math.min(limit, total - (page - 1) * limit);
        const data = await this.prisma.message.findMany({
            where: { conversationId },
            skip,
            take: take > 0 ? take : limit,
            orderBy: { createdAt: 'asc' },
        });
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
    async sendText(hotelId, userId, conversationId, body) {
        const conversation = await this.getConversationWithGuest(hotelId, conversationId);
        const phoneNumberId = await this.getPhoneNumberId(hotelId);
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                hotelId,
                direction: 'OUTBOUND',
                type: 'TEXT',
                body,
                status: 'PENDING',
                senderId: userId,
            },
        });
        try {
            const result = await this.whatsappService.sendText(hotelId, phoneNumberId, conversation.guest.phone, body);
            await this.prisma.message.update({
                where: { id: message.id },
                data: {
                    status: 'SENT',
                    waMessageId: result || null,
                    sentAt: new Date(),
                },
            });
            await this.updateConversationLastMessage(conversationId, message.id);
            return this.prisma.message.findUnique({ where: { id: message.id } });
        }
        catch (e) {
            await this.prisma.message.update({
                where: { id: message.id },
                data: { status: 'FAILED', errorMessage: e.message },
            });
            throw e;
        }
    }
    async sendTemplate(hotelId, userId, conversationId, templateId, variableValues) {
        const conversation = await this.getConversationWithGuest(hotelId, conversationId);
        const phoneNumberId = await this.getPhoneNumberId(hotelId);
        const template = await this.prisma.template.findFirst({
            where: { id: templateId, hotelId, deletedAt: null },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template ${templateId} not found`);
        }
        if (template.status !== 'APPROVED') {
            throw new common_1.BadRequestException('Template is not approved for sending');
        }
        const mergedVariableValues = await this.resolveTemplateVariableValues(hotelId, conversation.guest, template, variableValues);
        const components = this.buildTemplateComponents(template, mergedVariableValues);
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                hotelId,
                direction: 'OUTBOUND',
                type: 'TEMPLATE',
                body: template.bodyText || template.name,
                templateId,
                status: 'PENDING',
                senderId: userId,
                metadata: { variableValues: mergedVariableValues },
            },
        });
        try {
            const result = await this.whatsappService.sendTemplate(hotelId, phoneNumberId, conversation.guest.phone, template.name, template.language, components);
            await this.prisma.message.update({
                where: { id: message.id },
                data: {
                    status: 'SENT',
                    waMessageId: result || null,
                    sentAt: new Date(),
                },
            });
            await this.updateConversationLastMessage(conversationId, message.id);
            return this.prisma.message.findUnique({ where: { id: message.id } });
        }
        catch (e) {
            await this.prisma.message.update({
                where: { id: message.id },
                data: { status: 'FAILED', errorMessage: e.message },
            });
            throw e;
        }
    }
    async sendMedia(hotelId, userId, conversationId, type, link, caption) {
        const validTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'];
        if (!validTypes.includes(type.toUpperCase())) {
            throw new common_1.BadRequestException(`Invalid media type. Must be one of: ${validTypes.join(', ')}`);
        }
        const conversation = await this.getConversationWithGuest(hotelId, conversationId);
        const phoneNumberId = await this.getPhoneNumberId(hotelId);
        const mediaType = type.toLowerCase();
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                hotelId,
                direction: 'OUTBOUND',
                type: type.toUpperCase(),
                body: caption || '',
                mediaUrl: link,
                status: 'PENDING',
                senderId: userId,
            },
        });
        try {
            const result = await this.whatsappService.sendMedia(hotelId, phoneNumberId, conversation.guest.phone, mediaType, link, caption);
            await this.prisma.message.update({
                where: { id: message.id },
                data: {
                    status: 'SENT',
                    waMessageId: result || null,
                    sentAt: new Date(),
                },
            });
            await this.updateConversationLastMessage(conversationId, message.id);
            return this.prisma.message.findUnique({ where: { id: message.id } });
        }
        catch (e) {
            await this.prisma.message.update({
                where: { id: message.id },
                data: { status: 'FAILED', errorMessage: e.message },
            });
            throw e;
        }
    }
    async sendToNumber(hotelId, userId, phone, body) {
        const normalizedPhone = (0, phone_util_1.toE164)(phone);
        if (!(0, phone_util_1.isValidE164)(normalizedPhone)) {
            throw new common_1.BadRequestException('Phone must be in E.164 format (e.g. +971501234567)');
        }
        const withoutPlus = (0, phone_util_1.stripPlus)(normalizedPhone);
        const phoneNumberId = await this.getPhoneNumberId(hotelId);
        let guest = await this.prisma.guest.findFirst({
            where: {
                hotelId,
                deletedAt: null,
                OR: [{ phone: normalizedPhone }, { phone: withoutPlus }],
            },
        });
        if (!guest) {
            guest = await this.prisma.guest.create({
                data: {
                    hotelId,
                    phone: normalizedPhone,
                    name: normalizedPhone,
                    optIn: true,
                },
            });
        }
        else if (guest.phone !== normalizedPhone) {
            await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: normalizedPhone } });
            guest.phone = normalizedPhone;
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: { hotelId, guestId: guest.id, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    hotelId,
                    guestId: guest.id,
                    status: 'OPEN',
                    channel: 'WHATSAPP',
                    unreadCount: 0,
                },
            });
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                hotelId,
                direction: 'OUTBOUND',
                type: 'TEXT',
                body,
                status: 'PENDING',
                senderId: userId,
            },
        });
        try {
            const result = await this.whatsappService.sendText(hotelId, phoneNumberId, normalizedPhone, body);
            await this.prisma.message.update({
                where: { id: message.id },
                data: { status: 'SENT', waMessageId: result || null, sentAt: new Date() },
            });
            await this.updateConversationLastMessage(conversation.id, message.id);
            return {
                conversation: { ...conversation, guest },
                message: await this.prisma.message.findUnique({ where: { id: message.id } }),
            };
        }
        catch (e) {
            await this.prisma.message.update({
                where: { id: message.id },
                data: { status: 'FAILED', errorMessage: e.message },
            });
            throw e;
        }
    }
    async findOrCreateGuestConversation(hotelId, phone) {
        const normalizedPhone = (0, phone_util_1.toE164)(phone);
        if (!(0, phone_util_1.isValidE164)(normalizedPhone)) {
            throw new common_1.BadRequestException('Phone must be in E.164 format (e.g. +971501234567)');
        }
        const withoutPlus = (0, phone_util_1.stripPlus)(normalizedPhone);
        let guest = await this.prisma.guest.findFirst({
            where: {
                hotelId,
                deletedAt: null,
                OR: [{ phone: normalizedPhone }, { phone: withoutPlus }],
            },
        });
        if (!guest) {
            guest = await this.prisma.guest.create({
                data: {
                    hotelId,
                    phone: normalizedPhone,
                    name: normalizedPhone,
                    optIn: true,
                },
            });
        }
        else if (guest.phone !== normalizedPhone) {
            await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: normalizedPhone } });
            guest.phone = normalizedPhone;
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: { hotelId, guestId: guest.id, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    hotelId,
                    guestId: guest.id,
                    status: 'OPEN',
                    channel: 'WHATSAPP',
                    unreadCount: 0,
                },
            });
        }
        return { guest, conversation };
    }
    async sendTemplateToNumber(hotelId, userId, phone, templateId, variableValues) {
        const { conversation, guest } = await this.findOrCreateGuestConversation(hotelId, phone);
        const message = await this.sendTemplate(hotelId, userId, conversation.id, templateId, variableValues);
        return {
            conversation: { ...conversation, guest },
            message,
        };
    }
    async updateConversationLastMessage(conversationId, messageId) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: { body: true, type: true, createdAt: true },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: message?.body || '',
                lastMessageAt: message?.createdAt || new Date(),
                lastMessageType: message?.type || 'TEXT',
                updatedAt: new Date(),
            },
        });
    }
    async resolveTemplateVariableValues(hotelId, guest, template, variableValues) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { name: true, settings: true },
        });
        const settings = (hotel?.settings || {});
        const defaults = {
            '1': guest?.name || '',
            '2': hotel?.name || '',
            '3': String(settings.address || settings.website || ''),
            '4': String(settings.direction || ''),
        };
        if (!this.shouldAutoFillAddressForTemplate(template)) {
            delete defaults['3'];
        }
        const merged = { ...defaults, ...(variableValues || {}) };
        return Object.fromEntries(Object.entries(merged).filter(([, value]) => String(value || '').trim() !== ''));
    }
    shouldAutoFillAddressForTemplate(template) {
        const text = [template?.headerText, template?.bodyText, template?.footerText]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        if (!/{{\s*3\s*}}/.test(text)) {
            return false;
        }
        const addressKeywords = /(address|location|street|road|drive|lane|avenue|boulevard|map|website|site|hotel|direction|directions)/;
        const nonAddressKeywords = /(review|feedback|link|share|rate|survey|google|click)/;
        const regex = /{{\s*3\s*}}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = Math.max(0, match.index - 40);
            const end = Math.min(text.length, match.index + match[0].length + 40);
            const context = text.slice(start, end);
            if (nonAddressKeywords.test(context)) {
                return false;
            }
            if (addressKeywords.test(context)) {
                return true;
            }
        }
        return false;
    }
    buildTemplateComponents(template, variableValues) {
        const values = variableValues || {};
        const components = [];
        if (Array.isArray(template?.components) && template.components.length > 0) {
            for (const comp of template.components) {
                if (!comp?.type || !['HEADER', 'BODY', 'FOOTER'].includes(comp.type)) {
                    continue;
                }
                const text = String(comp.text || '');
                const matches = [...text.matchAll(/{{\s*(\d+)\s*}}/g)];
                if (!matches.length) {
                    continue;
                }
                const parameters = matches.map((match) => {
                    const key = match[1];
                    const value = values[key];
                    if (value === undefined || value === null || String(value).trim() === '') {
                        throw new common_1.BadRequestException(`Missing value for template variable {{${key}}}`);
                    }
                    return { type: 'text', text: String(value) };
                });
                components.push({ type: comp.type.toLowerCase(), parameters });
            }
            return components;
        }
        const variableKeys = Object.keys(values).filter((key) => values[key] != null);
        if (variableKeys.length === 0) {
            return [];
        }
        const bodyParams = variableKeys
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .map((key) => {
            const value = values[key];
            if (value === undefined || value === null || String(value).trim() === '') {
                throw new common_1.BadRequestException(`Missing value for template variable {{${key}}}`);
            }
            return { type: 'text', text: String(value) };
        });
        return bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map