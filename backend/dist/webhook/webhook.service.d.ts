import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
export declare class WebhookService {
    private readonly prisma;
    private readonly config;
    private readonly eventsGateway;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, eventsGateway: EventsGateway);
    verifyToken(token: string): boolean;
    processEvent(body: any): Promise<void>;
    private handleIncomingMessage;
    private handleStatusUpdate;
    private parseMessage;
    private normalizeType;
    private log;
    getDebugInfo(): Promise<{
        configured_verify_token: any;
        env_phone_number_id: any;
        hotels: {
            name: string;
            id: string;
            isActive: boolean;
            phoneNumberId: string;
            wabaId: string;
        }[];
        timestamp: string;
    }>;
}
