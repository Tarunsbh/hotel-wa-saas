import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UpdateHotelDto } from './dto/update-hotel.dto';
export declare class HotelsService {
    private readonly prisma;
    private readonly whatsappService;
    private readonly logger;
    constructor(prisma: PrismaService, whatsappService: WhatsAppService);
    findOne(hotelId: string): Promise<{
        id: string;
        name: string;
        phoneNumberId: string;
        wabaId: string;
        timezone: string;
        country: string;
        plan: import(".prisma/client").$Enums.Plan;
        isActive: boolean;
        settings: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(hotelId: string, dto: UpdateHotelDto): Promise<{
        id: string;
        name: string;
        phoneNumberId: string;
        wabaId: string;
        timezone: string;
        country: string;
        plan: import(".prisma/client").$Enums.Plan;
        isActive: boolean;
        settings: import("@prisma/client/runtime/library").JsonValue;
        updatedAt: Date;
    }>;
    storeToken(hotelId: string, tokenData: {
        accessToken: string;
        wabaId?: string;
        phoneNumberId?: string;
        expiresIn?: number;
    }): Promise<{
        id: string;
        hotelId: string;
        expiresAt: Date;
        isActive: boolean;
        createdAt: Date;
    }>;
    getTokens(hotelId: string): Promise<{
        id: string;
        hotelId: string;
        tokenType: import(".prisma/client").$Enums.TokenType;
        isActive: boolean;
        expiresAt: Date;
        refreshAt: Date;
        refreshCount: number;
        lastRefreshed: Date;
        lastUsedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        accessToken: string;
    }[]>;
    private maskToken;
}
