import { Job, Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
export interface CampaignJobData {
    campaignId: string;
    hotelId: string;
}
export declare class CampaignProcessor {
    private readonly prisma;
    private readonly messagesQueue;
    private readonly logger;
    constructor(prisma: PrismaService, messagesQueue: Queue);
    handleProcess(job: Job<CampaignJobData>): Promise<{
        processed: number;
    }>;
    private buildSendComponents;
    private markCampaignFailed;
    onFailed(job: Job, error: Error): Promise<void>;
    onCompleted(job: Job): Promise<void>;
}
