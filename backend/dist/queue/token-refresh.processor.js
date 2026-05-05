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
var TokenRefreshProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRefreshProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bull_2 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let TokenRefreshProcessor = TokenRefreshProcessor_1 = class TokenRefreshProcessor {
    constructor(prisma, whatsappService, tokenRefreshQueue) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.tokenRefreshQueue = tokenRefreshQueue;
        this.logger = new common_1.Logger(TokenRefreshProcessor_1.name);
    }
    async scheduleTokenRefreshes() {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        const tokens = await this.prisma.tokenStorage.findMany({
            where: {
                isActive: true,
                tokenType: 'ACCESS',
                refreshAt: {
                    lte: oneHourFromNow,
                },
            },
            select: { id: true, hotelId: true },
        });
        this.logger.log(`Found ${tokens.length} tokens due for refresh`);
        for (const token of tokens) {
            await this.tokenRefreshQueue.add('refresh', { tokenId: token.id, hotelId: token.hotelId }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: true,
                jobId: `refresh-${token.id}`,
            });
        }
    }
    async handleRefresh(job) {
        const { tokenId, hotelId } = job.data;
        this.logger.log(`Refreshing token ${tokenId} for hotel ${hotelId}`);
        const tokenRecord = await this.prisma.tokenStorage.findFirst({
            where: { id: tokenId, hotelId, isActive: true, tokenType: 'ACCESS' },
        });
        if (!tokenRecord) {
            this.logger.warn(`Token ${tokenId} not found or inactive, skipping`);
            return;
        }
        try {
            const refreshed = await this.whatsappService.refreshToken(this.whatsappService.decryptToken(tokenRecord.tokenValue));
            const expiresAt = refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000)
                : null;
            const refreshAt = expiresAt
                ? new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000)
                : null;
            await this.prisma.tokenStorage.update({
                where: { id: tokenId },
                data: {
                    tokenValue: this.whatsappService.encryptToken(refreshed.access_token),
                    tokenHash: require('crypto-js')
                        .SHA256(refreshed.access_token)
                        .toString(),
                    expiresAt,
                    refreshAt,
                    lastRefreshed: new Date(),
                    refreshCount: { increment: 1 },
                },
            });
            this.logger.log(`Successfully refreshed token ${tokenId}`);
        }
        catch (error) {
            this.logger.error(`Failed to refresh token ${tokenId}: ${error.message}`, error.stack);
            await this.prisma.tokenStorage.update({
                where: { id: tokenId },
                data: {
                    lastRefreshed: new Date(),
                },
            });
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`Token refresh job ${job.id} failed: ${error.message}`);
    }
};
exports.TokenRefreshProcessor = TokenRefreshProcessor;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TokenRefreshProcessor.prototype, "scheduleTokenRefreshes", null);
__decorate([
    (0, bull_1.Process)('refresh'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TokenRefreshProcessor.prototype, "handleRefresh", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], TokenRefreshProcessor.prototype, "onFailed", null);
exports.TokenRefreshProcessor = TokenRefreshProcessor = TokenRefreshProcessor_1 = __decorate([
    (0, bull_1.Processor)('token-refresh'),
    __param(2, (0, bull_2.InjectQueue)('token-refresh')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService, Object])
], TokenRefreshProcessor);
//# sourceMappingURL=token-refresh.processor.js.map