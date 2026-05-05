import { HotelsService } from './hotels.service';
import { UpdateHotelDto } from './dto/update-hotel.dto';
export declare class HotelsController {
    private readonly hotelsService;
    constructor(hotelsService: HotelsService);
    getMe(req: any): Promise<{
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
    update(req: any, dto: UpdateHotelDto): Promise<{
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
    storeToken(req: any, accessToken: string, wabaId?: string, phoneNumberId?: string, expiresIn?: number): Promise<{
        id: string;
        hotelId: string;
        expiresAt: Date;
        isActive: boolean;
        createdAt: Date;
    }>;
    getTokens(req: any): Promise<{
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
}
