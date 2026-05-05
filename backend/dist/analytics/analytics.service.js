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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(hotelId) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        const [totalGuests, totalConversations, openConversations, pendingConversations, resolvedConversations, totalMessages, totalCampaigns, messagesSentToday, messagesReceivedToday, sentMessages, deliveredMessages, readMessages,] = await Promise.all([
            this.prisma.guest.count({
                where: { hotelId, deletedAt: null },
            }),
            this.prisma.conversation.count({
                where: { hotelId },
            }),
            this.prisma.conversation.count({
                where: { hotelId, status: 'OPEN' },
            }),
            this.prisma.conversation.count({
                where: { hotelId, status: 'PENDING' },
            }),
            this.prisma.conversation.count({
                where: { hotelId, status: 'RESOLVED' },
            }),
            this.prisma.message.count({
                where: { hotelId },
            }),
            this.prisma.campaign.count({
                where: { hotelId, deletedAt: null },
            }),
            this.prisma.message.count({
                where: {
                    hotelId,
                    direction: 'OUTBOUND',
                    createdAt: { gte: startOfToday, lt: endOfToday },
                },
            }),
            this.prisma.message.count({
                where: {
                    hotelId,
                    direction: 'INBOUND',
                    createdAt: { gte: startOfToday, lt: endOfToday },
                },
            }),
            this.prisma.message.count({
                where: {
                    hotelId,
                    direction: 'OUTBOUND',
                    status: { in: ['SENT', 'DELIVERED', 'READ'] },
                },
            }),
            this.prisma.message.count({
                where: {
                    hotelId,
                    direction: 'OUTBOUND',
                    status: { in: ['DELIVERED', 'READ'] },
                },
            }),
            this.prisma.message.count({
                where: {
                    hotelId,
                    direction: 'OUTBOUND',
                    status: 'READ',
                },
            }),
        ]);
        const deliveryRate = sentMessages > 0
            ? Math.round((deliveredMessages / sentMessages) * 100)
            : 0;
        const readRate = deliveredMessages > 0
            ? Math.round((readMessages / deliveredMessages) * 100)
            : 0;
        return {
            totalGuests,
            totalConversations,
            totalMessages,
            totalCampaigns,
            openConversations,
            pendingConversations,
            resolvedConversations,
            messagesSentToday,
            messagesReceivedToday,
            activeConversations: openConversations,
            messagesToday: messagesSentToday + messagesReceivedToday,
            campaignsSent: totalCampaigns,
            deliveryRate,
            readRate,
        };
    }
    async getMessageVolume(hotelId, days = 7) {
        const results = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            const [inbound, outbound] = await Promise.all([
                this.prisma.message.count({
                    where: {
                        hotelId,
                        direction: 'INBOUND',
                        createdAt: { gte: startOfDay, lt: endOfDay },
                    },
                }),
                this.prisma.message.count({
                    where: {
                        hotelId,
                        direction: 'OUTBOUND',
                        createdAt: { gte: startOfDay, lt: endOfDay },
                    },
                }),
            ]);
            results.push({
                date: startOfDay.toISOString().split('T')[0],
                inbound,
                outbound,
                total: inbound + outbound,
            });
        }
        return results;
    }
    async getCampaignPerformance(hotelId, campaignId) {
        const where = { hotelId, deletedAt: null };
        if (campaignId) {
            where.id = campaignId;
        }
        else {
            where.status = { in: ['COMPLETED', 'RUNNING'] };
        }
        const campaigns = await this.prisma.campaign.findMany({
            where,
            include: {
                template: { select: { id: true, name: true } },
                _count: { select: { recipients: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: campaignId ? 1 : 20,
        });
        const results = await Promise.all(campaigns.map(async (campaign) => {
            const stats = await this.prisma.campaignRecipient.groupBy({
                by: ['status'],
                where: { campaignId: campaign.id },
                _count: { status: true },
            });
            const statusCounts = {};
            let total = 0;
            for (const s of stats) {
                statusCounts[s.status.toLowerCase()] = s._count.status;
                total += s._count.status;
            }
            const sent = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.read || 0);
            const delivered = (statusCounts.delivered || 0) + (statusCounts.read || 0);
            const read = statusCounts.read || 0;
            return {
                id: campaign.id,
                name: campaign.name,
                template: campaign.template,
                status: campaign.status,
                total,
                sent,
                delivered,
                read,
                failed: statusCounts.failed || 0,
                deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
                readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
                launchedAt: campaign.startedAt,
                completedAt: campaign.completedAt,
            };
        }));
        return campaignId ? (results[0] || null) : results;
    }
    async getAgentPerformance(hotelId) {
        const agents = await this.prisma.user.findMany({
            where: { hotelId, isActive: true },
            select: { id: true, name: true, email: true },
        });
        const results = await Promise.all(agents.map(async (agent) => {
            const [assigned, resolved, resolvedConversations] = await Promise.all([
                this.prisma.conversation.count({
                    where: { hotelId, assignedAgentId: agent.id },
                }),
                this.prisma.conversation.count({
                    where: {
                        hotelId,
                        assignedAgentId: agent.id,
                        status: 'RESOLVED',
                    },
                }),
                this.prisma.conversation.findMany({
                    where: {
                        hotelId,
                        assignedAgentId: agent.id,
                        status: 'RESOLVED',
                        resolvedAt: { not: null },
                    },
                    select: { createdAt: true, resolvedAt: true },
                }),
            ]);
            const messagesSent = await this.prisma.message.count({
                where: {
                    hotelId,
                    senderId: agent.id,
                    direction: 'OUTBOUND',
                },
            });
            const avgResolutionTimeMinutes = resolvedConversations.length > 0
                ? Math.round(resolvedConversations.reduce((total, conversation) => {
                    const resolvedAt = conversation.resolvedAt || new Date();
                    return (total +
                        (resolvedAt.getTime() - conversation.createdAt.getTime()) /
                            60000);
                }, 0) / resolvedConversations.length)
                : null;
            return {
                agent: { id: agent.id, name: agent.name, email: agent.email },
                assigned,
                resolved,
                resolutionRate: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0,
                avgResolutionTimeMinutes,
                messagesSent,
            };
        }));
        return results;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map