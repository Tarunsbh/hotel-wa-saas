import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
export interface SendTemplateJobData {
    hotelId: string;
    phoneNumberId: string;
    to: string;
    templateName: string;
    language: string;
    components: any[];
    messageId: string;
    recipientId?: string;
}
export declare class MessageProcessor {
    private readonly prisma;
    private readonly whatsappService;
    private readonly logger;
    constructor(prisma: PrismaService, whatsappService: WhatsAppService);
    handleSendTemplate(job: Job<SendTemplateJobData>): Promise<{
        waMessageId: string;
        messageId: string;
    }>;
    onFailed(job: Job, error: Error): Promise<void>;
    onCompleted(job: Job, result: any): Promise<void>;
}
