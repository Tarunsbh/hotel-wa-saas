import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        access_token: string;
        user: {
            hotel: {
                name: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                settings: import("@prisma/client/runtime/library").JsonValue | null;
                slug: string;
                phoneNumberId: string;
                wabaId: string;
                businessId: string | null;
                webhookVerifyToken: string;
                timezone: string;
                country: string;
                plan: import(".prisma/client").$Enums.Plan;
            };
            name: string;
            id: string;
            hotelId: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            avatarUrl: string | null;
            isActive: boolean;
            lastLoginAt: Date | null;
        };
    }>;
    register(dto: RegisterDto, req: any): Promise<{
        name: string;
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
    }>;
    me(req: any): Promise<{
        hotel: {
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            settings: import("@prisma/client/runtime/library").JsonValue | null;
            slug: string;
            phoneNumberId: string;
            wabaId: string;
            businessId: string | null;
            webhookVerifyToken: string;
            timezone: string;
            country: string;
            plan: import(".prisma/client").$Enums.Plan;
        };
        name: string;
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        avatarUrl: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
    }>;
    agents(req: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date;
    }[]>;
    changePassword(body: {
        currentPassword: string;
        newPassword: string;
    }, req: any): Promise<{
        message: string;
    }>;
}
