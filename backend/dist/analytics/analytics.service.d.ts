import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboard(hotelId: string): Promise<{
        totalGuests: number;
        totalConversations: number;
        totalMessages: number;
        totalCampaigns: number;
        openConversations: number;
        pendingConversations: number;
        resolvedConversations: number;
        messagesSentToday: number;
        messagesReceivedToday: number;
        activeConversations: number;
        messagesToday: number;
        campaignsSent: number;
        deliveryRate: number;
        readRate: number;
    }>;
    getMessageVolume(hotelId: string, days?: number): Promise<{
        date: string;
        inbound: number;
        outbound: number;
        total: number;
    }[]>;
    getCampaignPerformance(hotelId: string, campaignId?: string): Promise<{
        id: string;
        name: string;
        template: {
            name: string;
            id: string;
        };
        status: import(".prisma/client").$Enums.CampaignStatus;
        total: number;
        sent: number;
        delivered: number;
        read: number;
        failed: number;
        deliveryRate: number;
        readRate: number;
        launchedAt: Date;
        completedAt: any;
    } | {
        id: string;
        name: string;
        template: {
            name: string;
            id: string;
        };
        status: import(".prisma/client").$Enums.CampaignStatus;
        total: number;
        sent: number;
        delivered: number;
        read: number;
        failed: number;
        deliveryRate: number;
        readRate: number;
        launchedAt: Date;
        completedAt: any;
    }[]>;
    getAgentPerformance(hotelId: string): Promise<{
        agent: {
            id: string;
            name: string;
            email: string;
        };
        assigned: number;
        resolved: number;
        resolutionRate: number;
        avgResolutionTimeMinutes: number;
        messagesSent: number;
    }[]>;
}
