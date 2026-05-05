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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
let CampaignsService = CampaignsService_1 = class CampaignsService {
    constructor(prisma, campaignsQueue) {
        this.prisma = prisma;
        this.campaignsQueue = campaignsQueue;
        this.logger = new common_1.Logger(CampaignsService_1.name);
    }
    normalizeAudienceType(audienceType) {
        if (!audienceType)
            return undefined;
        const normalized = audienceType.toUpperCase();
        if (normalized === 'CHECKED_IN')
            return 'IN_HOUSE';
        if (normalized === 'CUSTOM')
            return 'CSV';
        return normalized;
    }
    async findAll(hotelId, query) {
        const { status } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 20);
        const skip = (page - 1) * limit;
        const where = { hotelId, deletedAt: null };
        if (status)
            where.status = status;
        const [data, total] = await Promise.all([
            this.prisma.campaign.findMany({
                where,
                skip,
                take: limit,
                include: {
                    template: { select: { id: true, name: true, category: true } },
                    _count: { select: { recipients: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.campaign.count({ where }),
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
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, hotelId, deletedAt: null },
            include: {
                template: true,
                _count: { select: { recipients: true } },
            },
        });
        if (!campaign) {
            throw new common_1.NotFoundException(`Campaign ${id} not found`);
        }
        return campaign;
    }
    async create(hotelId, userId, dto) {
        const template = await this.prisma.template.findFirst({
            where: { id: dto.templateId, hotelId, deletedAt: null },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template ${dto.templateId} not found`);
        }
        const campaign = await this.prisma.campaign.create({
            data: {
                hotelId,
                createdById: userId,
                name: dto.name,
                templateId: dto.templateId,
                audienceType: this.normalizeAudienceType(dto.audienceType),
                audienceFilter: dto.audienceFilter,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                variableValues: dto.variableValues,
                status: 'DRAFT',
            },
        });
        const guests = await this.buildAudience(hotelId, dto.audienceType, dto.audienceFilter);
        const recipientCount = guests.length;
        if (recipientCount > 0) {
            await this.prisma.campaignRecipient.createMany({
                data: guests.map((g) => ({
                    campaignId: campaign.id,
                    guestId: g.id,
                    phone: g.phone,
                    status: 'PENDING',
                })),
                skipDuplicates: true,
            });
        }
        await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { totalRecipients: recipientCount },
        });
        return this.findOne(hotelId, campaign.id);
    }
    async update(hotelId, id, dto) {
        const campaign = await this.findOne(hotelId, id);
        if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
            throw new common_1.BadRequestException('Only DRAFT or SCHEDULED campaigns can be updated');
        }
        const updateData = {};
        if (dto.name !== undefined) {
            updateData.name = dto.name;
        }
        if (dto.scheduledAt !== undefined) {
            updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
        }
        if (dto.variableValues !== undefined) {
            updateData.variableValues = dto.variableValues;
        }
        if (dto.audienceFilter !== undefined) {
            updateData.audienceFilter = dto.audienceFilter;
        }
        if (dto.audienceType !== undefined) {
            updateData.audienceType = this.normalizeAudienceType(dto.audienceType);
        }
        if (dto.templateId !== undefined) {
            const template = await this.prisma.template.findFirst({
                where: { id: dto.templateId, hotelId, deletedAt: null },
            });
            if (!template) {
                throw new common_1.NotFoundException(`Template ${dto.templateId} not found`);
            }
            updateData.templateId = dto.templateId;
        }
        await this.prisma.campaign.update({
            where: { id },
            data: updateData,
        });
        if (dto.audienceType !== undefined || dto.audienceFilter !== undefined) {
            const audienceType = dto.audienceType !== undefined ? dto.audienceType : campaign.audienceType;
            const audienceFilter = dto.audienceFilter !== undefined
                ? dto.audienceFilter
                : campaign.audienceFilter;
            await this.prisma.campaignRecipient.deleteMany({
                where: { campaignId: id },
            });
            const guests = await this.buildAudience(hotelId, audienceType, audienceFilter);
            if (guests.length > 0) {
                await this.prisma.campaignRecipient.createMany({
                    data: guests.map((g) => ({
                        campaignId: id,
                        guestId: g.id,
                        phone: g.phone,
                        status: 'PENDING',
                    })),
                    skipDuplicates: true,
                });
            }
            await this.prisma.campaign.update({
                where: { id },
                data: { totalRecipients: guests.length },
            });
        }
        return this.findOne(hotelId, id);
    }
    async launch(hotelId, id) {
        const campaign = await this.findOne(hotelId, id);
        if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
            throw new common_1.BadRequestException('Only DRAFT or SCHEDULED campaigns can be launched');
        }
        const recipientCount = await this.prisma.campaignRecipient.count({
            where: { campaignId: id },
        });
        if (recipientCount === 0) {
            throw new common_1.BadRequestException('Campaign has no recipients');
        }
        await this.prisma.campaign.update({
            where: { id },
            data: { status: 'RUNNING', startedAt: new Date() },
        });
        await this.campaignsQueue.add('process', { campaignId: id, hotelId }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: false,
            removeOnFail: false,
        });
        return this.findOne(hotelId, id);
    }
    async cancel(hotelId, id) {
        const campaign = await this.findOne(hotelId, id);
        if (!['DRAFT', 'SCHEDULED', 'RUNNING'].includes(campaign.status)) {
            throw new common_1.BadRequestException(`Campaign cannot be cancelled in status ${campaign.status}`);
        }
        return this.prisma.campaign.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
    async queueScheduledCampaigns() {
        const now = new Date();
        const dueCampaigns = await this.prisma.campaign.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { lte: now },
                deletedAt: null,
            },
            select: { id: true, hotelId: true },
        });
        for (const campaign of dueCampaigns) {
            const recipientCount = await this.prisma.campaignRecipient.count({
                where: { campaignId: campaign.id },
            });
            if (recipientCount === 0) {
                this.logger.warn(`Scheduled campaign ${campaign.id} has no recipients and cannot be launched`);
                await this.prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'FAILED' },
                });
                continue;
            }
            await this.prisma.campaign.update({
                where: { id: campaign.id },
                data: { status: 'RUNNING', startedAt: new Date() },
            });
            await this.campaignsQueue.add('process', {
                campaignId: campaign.id,
                hotelId: campaign.hotelId,
            });
        }
    }
    async getRecipients(hotelId, campaignId, query) {
        await this.findOne(hotelId, campaignId);
        const { status } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 20);
        const skip = (page - 1) * limit;
        const where = { campaignId };
        if (status)
            where.status = status;
        const [data, total] = await Promise.all([
            this.prisma.campaignRecipient.findMany({
                where,
                skip,
                take: limit,
                include: {
                    guest: { select: { id: true, name: true, phone: true, email: true } },
                },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.campaignRecipient.count({ where }),
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
    async getStats(hotelId, campaignId) {
        await this.findOne(hotelId, campaignId);
        const stats = await this.prisma.campaignRecipient.groupBy({
            by: ['status'],
            where: { campaignId },
            _count: { status: true },
        });
        const result = {
            total: 0,
            pending: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
        };
        for (const s of stats) {
            const key = s.status.toLowerCase();
            result[key] = s._count.status;
            result.total += s._count.status;
        }
        const deliveryRate = result.sent > 0
            ? Math.round(((result.delivered + result.read) / result.sent) * 100)
            : 0;
        const readRate = result.delivered > 0
            ? Math.round((result.read / result.delivered) * 100)
            : 0;
        return { ...result, deliveryRate, readRate };
    }
    async buildAudience(hotelId, audienceType, filter) {
        const where = {
            hotelId,
            deletedAt: null,
            optIn: true,
        };
        switch (this.normalizeAudienceType(audienceType)) {
            case 'ALL':
                break;
            case 'ARRIVING':
                where.stayStatus = 'ARRIVING';
                break;
            case 'IN_HOUSE':
                where.stayStatus = 'IN_HOUSE';
                break;
            case 'CHECKED_OUT':
                where.stayStatus = 'CHECKED_OUT';
                break;
            case 'TAG':
                if (filter?.tagId) {
                    where.guestTags = {
                        some: { tagId: filter.tagId },
                    };
                }
                break;
            case 'CSV':
                if (filter?.guestIds && Array.isArray(filter.guestIds)) {
                    where.id = { in: filter.guestIds };
                }
                if (filter?.checkInAfter) {
                    where.checkInDate = { gte: new Date(filter.checkInAfter) };
                }
                if (filter?.checkOutBefore) {
                    where.checkOutDate = { lte: new Date(filter.checkOutBefore) };
                }
                break;
            default:
                break;
        }
        return this.prisma.guest.findMany({
            where,
            select: { id: true, phone: true, name: true },
        });
    }
    async softDelete(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.campaign.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.CampaignsService = CampaignsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignsService.prototype, "queueScheduledCampaigns", null);
exports.CampaignsService = CampaignsService = CampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bull_1.InjectQueue)('campaigns')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map