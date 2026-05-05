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
var HotelsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let HotelsService = HotelsService_1 = class HotelsService {
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.logger = new common_1.Logger(HotelsService_1.name);
    }
    async findOne(hotelId) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: {
                id: true,
                name: true,
                timezone: true,
                country: true,
                wabaId: true,
                phoneNumberId: true,
                plan: true,
                isActive: true,
                settings: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!hotel) {
            throw new common_1.NotFoundException(`Hotel ${hotelId} not found`);
        }
        return hotel;
    }
    async update(hotelId, dto) {
        const hotel = await this.findOne(hotelId);
        const mergedSettings = {
            ...(hotel.settings || {}),
            ...(dto.settings || {}),
        };
        return this.prisma.hotel.update({
            where: { id: hotelId },
            data: {
                name: dto.name,
                timezone: dto.timezone,
                country: dto.country,
                wabaId: dto.wabaId,
                phoneNumberId: dto.phoneNumberId,
                settings: mergedSettings,
            },
            select: {
                id: true,
                name: true,
                timezone: true,
                country: true,
                wabaId: true,
                phoneNumberId: true,
                plan: true,
                isActive: true,
                settings: true,
                updatedAt: true,
            },
        });
    }
    async storeToken(hotelId, tokenData) {
        await this.findOne(hotelId);
        if (!tokenData.accessToken) {
            throw new common_1.BadRequestException('accessToken is required');
        }
        const expiresAt = tokenData.expiresIn
            ? new Date(Date.now() + tokenData.expiresIn * 1000)
            : undefined;
        try {
            await this.whatsappService.validateToken(tokenData.accessToken);
        }
        catch (e) {
            this.logger.warn(`Token validation warning: ${e.message} — storing anyway`);
        }
        const token = await this.whatsappService.storeToken(hotelId, tokenData.accessToken, expiresAt);
        if (tokenData.wabaId || tokenData.phoneNumberId) {
            await this.prisma.hotel.update({
                where: { id: hotelId },
                data: {
                    wabaId: tokenData.wabaId,
                    phoneNumberId: tokenData.phoneNumberId,
                },
            });
        }
        return {
            id: token.id,
            hotelId: token.hotelId,
            expiresAt: token.expiresAt,
            isActive: token.isActive,
            createdAt: token.createdAt,
        };
    }
    async getTokens(hotelId) {
        await this.findOne(hotelId);
        const tokens = await this.prisma.tokenStorage.findMany({
            where: { hotelId },
            select: {
                id: true,
                hotelId: true,
                tokenType: true,
                tokenValue: true,
                isActive: true,
                expiresAt: true,
                refreshAt: true,
                refreshCount: true,
                lastRefreshed: true,
                lastUsedAt: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return tokens.map((token) => ({
            id: token.id,
            hotelId: token.hotelId,
            tokenType: token.tokenType,
            isActive: token.isActive,
            expiresAt: token.expiresAt,
            refreshAt: token.refreshAt,
            refreshCount: token.refreshCount,
            lastRefreshed: token.lastRefreshed,
            lastUsedAt: token.lastUsedAt,
            createdAt: token.createdAt,
            updatedAt: token.updatedAt,
            accessToken: this.maskToken(this.whatsappService.decryptToken(token.tokenValue)),
        }));
    }
    maskToken(token) {
        if (!token || token.length < 10)
            return '***';
        return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
    }
};
exports.HotelsService = HotelsService;
exports.HotelsService = HotelsService = HotelsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService])
], HotelsService);
//# sourceMappingURL=hotels.service.js.map