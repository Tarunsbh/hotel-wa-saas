import { Job } from 'bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
export interface TokenRefreshJobData {
    tokenId: string;
    hotelId: string;
}
export declare class TokenRefreshProcessor {
    private readonly prisma;
    private readonly whatsappService;
    private readonly tokenRefreshQueue;
    private readonly logger;
    constructor(prisma: PrismaService, whatsappService: WhatsAppService, tokenRefreshQueue: Queue);
    scheduleTokenRefreshes(): Promise<void>;
    handleRefresh(job: Job<TokenRefreshJobData>): Promise<void>;
    onFailed(job: Job, error: Error): Promise<void>;
}
