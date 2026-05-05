import { Response } from 'express';
import { WebhookService } from './webhook.service';
export declare class WebhookController {
    private readonly webhookService;
    private readonly logger;
    constructor(webhookService: WebhookService);
    verify(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    receive(body: any, headers: any): Promise<string>;
    debug(): Promise<{
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
