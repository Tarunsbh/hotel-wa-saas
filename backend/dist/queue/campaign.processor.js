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
var CampaignProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const BATCH_SIZE = 50;
const DELAY_BETWEEN_MESSAGES_MS = 100;
let CampaignProcessor = CampaignProcessor_1 = class CampaignProcessor {
    constructor(prisma, messagesQueue) {
        this.prisma = prisma;
        this.messagesQueue = messagesQueue;
        this.logger = new common_1.Logger(CampaignProcessor_1.name);
    }
    async handleProcess(job) {
        const { campaignId, hotelId } = job.data;
        this.logger.log(`Processing campaign ${campaignId}`);
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, hotelId },
            include: { template: true },
        });
        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found`);
        }
        if (campaign.status !== 'RUNNING') {
            this.logger.warn(`Campaign ${campaignId} is not in RUNNING status (${campaign.status}). Skipping.`);
            return;
        }
        if (!campaign.template) {
            await this.markCampaignFailed(campaignId, 'Template not found');
            throw new Error('Campaign template not found');
        }
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { phoneNumberId: true },
        });
        if (!hotel?.phoneNumberId) {
            await this.markCampaignFailed(campaignId, 'Hotel has no phoneNumberId');
            throw new Error('Hotel has no phoneNumberId configured');
        }
        const pendingRecipients = await this.prisma.campaignRecipient.findMany({
            where: { campaignId, status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
        });
        const totalRecipients = pendingRecipients.length;
        this.logger.log(`Campaign ${campaignId}: enqueuing ${totalRecipients} messages`);
        let processed = 0;
        for (let i = 0; i < pendingRecipients.length; i += BATCH_SIZE) {
            const batch = pendingRecipients.slice(i, i + BATCH_SIZE);
            for (const recipient of batch) {
                const conversation = await this.prisma.conversation.upsert({
                    where: {
                        guestId_hotelId: {
                            guestId: recipient.guestId,
                            hotelId,
                        },
                    },
                    update: {},
                    create: {
                        hotelId,
                        guestId: recipient.guestId,
                        status: 'OPEN',
                        lastMessage: campaign.template.bodyText || campaign.template.name,
                        lastMessageAt: new Date(),
                        lastMessageType: 'TEMPLATE',
                    },
                });
                const message = await this.prisma.message.create({
                    data: {
                        conversationId: conversation.id,
                        hotelId,
                        direction: 'OUTBOUND',
                        type: 'TEMPLATE',
                        body: campaign.template.bodyText || campaign.template.name,
                        templateId: campaign.template.id,
                        status: 'PENDING',
                        campaignId,
                    },
                });
                await this.messagesQueue.add('send-template', {
                    hotelId,
                    phoneNumberId: hotel.phoneNumberId,
                    to: recipient.phone,
                    templateName: campaign.template.name,
                    language: campaign.template.language,
                    components: this.buildSendComponents(campaign.variableValues),
                    messageId: message.id,
                    recipientId: recipient.id,
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 3000 },
                    delay: i * DELAY_BETWEEN_MESSAGES_MS,
                    removeOnComplete: false,
                });
                processed++;
            }
            await job.progress(Math.round((processed / totalRecipients) * 100));
        }
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });
        this.logger.log(`Campaign ${campaignId} processing complete: ${processed} messages enqueued`);
        return { processed };
    }
    buildSendComponents(variableValues) {
        if (!variableValues || Object.keys(variableValues).length === 0)
            return [];
        const bodyParams = Object.keys(variableValues)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .map((k) => ({ type: 'text', text: String(variableValues[k] || '') }));
        return bodyParams.length > 0
            ? [{ type: 'body', parameters: bodyParams }]
            : [];
    }
    async markCampaignFailed(campaignId, reason) {
        this.logger.error(`Campaign ${campaignId} failed: ${reason}`);
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'FAILED' },
        });
    }
    async onFailed(job, error) {
        this.logger.error(`Campaign job ${job.id} failed: ${error.message}`, error.stack);
        const { campaignId } = job.data;
        if (campaignId && job.attemptsMade >= (job.opts?.attempts || 3)) {
            await this.markCampaignFailed(campaignId, error.message).catch(() => { });
        }
    }
    async onCompleted(job) {
        this.logger.log(`Campaign job ${job.id} completed`);
    }
};
exports.CampaignProcessor = CampaignProcessor;
__decorate([
    (0, bull_1.Process)({ name: 'process', concurrency: 2 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignProcessor.prototype, "handleProcess", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], CampaignProcessor.prototype, "onFailed", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignProcessor.prototype, "onCompleted", null);
exports.CampaignProcessor = CampaignProcessor = CampaignProcessor_1 = __decorate([
    (0, bull_1.Processor)('campaigns'),
    __param(1, (0, bull_1.InjectQueue)('messages')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], CampaignProcessor);
//# sourceMappingURL=campaign.processor.js.map