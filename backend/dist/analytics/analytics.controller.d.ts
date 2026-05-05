import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboard(req: any): Promise<{
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
    getMessageVolume(req: any, days?: number): Promise<{
        date: string;
        inbound: number;
        outbound: number;
        total: number;
    }[]>;
    getCampaignPerformance(req: any, campaignId?: string): Promise<{
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
    getAgentPerformance(req: any): Promise<{
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
