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
var MessageProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let MessageProcessor = MessageProcessor_1 = class MessageProcessor {
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.logger = new common_1.Logger(MessageProcessor_1.name);
    }
    async handleSendTemplate(job) {
        const { hotelId, phoneNumberId, to, templateName, language, components, messageId, recipientId, } = job.data;
        this.logger.log(`Processing send-template job ${job.id} for message ${messageId}`);
        try {
            const result = await this.whatsappService.sendTemplate(hotelId, phoneNumberId, to, templateName, language, components);
            const waMessageId = result || null;
            await this.prisma.message.update({
                where: { id: messageId },
                data: {
                    status: 'SENT',
                    waMessageId,
                    sentAt: new Date(),
                },
            });
            if (recipientId) {
                await this.prisma.campaignRecipient.update({
                    where: { id: recipientId },
                    data: {
                        status: 'SENT',
                        waMessageId,
                        sentAt: new Date(),
                    },
                });
            }
            this.logger.log(`Successfully sent template message ${messageId} (wa: ${waMessageId})`);
            return { waMessageId, messageId };
        }
        catch (error) {
            this.logger.error(`Failed to send template message ${messageId}: ${error.message}`, error.stack);
            const attemptsMade = job.attemptsMade + 1;
            const maxAttempts = job.opts?.attempts || 3;
            if (attemptsMade >= maxAttempts) {
                await this.prisma.message.update({
                    where: { id: messageId },
                    data: {
                        status: 'FAILED',
                        errorMessage: error.message,
                    },
                });
                if (recipientId) {
                    await this.prisma.campaignRecipient.update({
                        where: { id: recipientId },
                        data: {
                            status: 'FAILED',
                            errorMessage: error.message,
                        },
                    });
                }
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`);
    }
    async onCompleted(job, result) {
        this.logger.log(`Job ${job.id} (${job.name}) completed`);
    }
};
exports.MessageProcessor = MessageProcessor;
__decorate([
    (0, bull_1.Process)('send-template'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessageProcessor.prototype, "handleSendTemplate", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], MessageProcessor.prototype, "onFailed", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessageProcessor.prototype, "onCompleted", null);
exports.MessageProcessor = MessageProcessor = MessageProcessor_1 = __decorate([
    (0, bull_1.Processor)('messages'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService])
], MessageProcessor);
//# sourceMappingURL=message.processor.js.map