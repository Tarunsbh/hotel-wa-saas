import { ConversationsService } from './conversations.service';
export declare class ConversationsController {
    private readonly conversationsService;
    constructor(conversationsService: ConversationsService);
    findAll(req: any, status?: string, agentId?: string, search?: string, page?: number, limit?: number): Promise<{
        data: ({
            guest: {
                id: string;
                phone: string;
                name: string;
                email: string;
                roomNumber: string;
            };
            assignedAgent: {
                id: string;
                name: string;
                email: string;
            };
        } & {
            id: string;
            hotelId: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            tags: import("@prisma/client/runtime/library").JsonValue | null;
            guestId: string;
            status: import(".prisma/client").$Enums.ConversationStatus;
            assignedAgentId: string | null;
            channel: string;
            lastMessage: string | null;
            lastMessageAt: Date | null;
            lastMessageType: string | null;
            unreadCount: number;
            resolvedAt: Date | null;
            resolvedBy: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(req: any, id: string): Promise<{
        guest: {
            id: string;
            hotelId: string;
            phone: string;
            name: string | null;
            email: string | null;
            countryCode: string | null;
            language: string;
            gender: import(".prisma/client").$Enums.Gender | null;
            stayStatus: import(".prisma/client").$Enums.StayStatus;
            checkInDate: Date | null;
            checkOutDate: Date | null;
            roomNumber: string | null;
            bookingRef: string | null;
            pmsGuestId: string | null;
            nationality: string | null;
            notes: string | null;
            optIn: boolean;
            optInAt: Date | null;
            optOutAt: Date | null;
            source: import(".prisma/client").$Enums.GuestSource;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        assignedAgent: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        guestId: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedAgentId: string | null;
        channel: string;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        lastMessageType: string | null;
        unreadCount: number;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    assign(req: any, id: string, agentId: string): Promise<{
        guest: {
            id: string;
            phone: string;
            name: string;
        };
        assignedAgent: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        guestId: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedAgentId: string | null;
        channel: string;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        lastMessageType: string | null;
        unreadCount: number;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    updateStatus(req: any, id: string, status: string): Promise<{
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        guestId: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedAgentId: string | null;
        channel: string;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        lastMessageType: string | null;
        unreadCount: number;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    markRead(req: any, id: string): Promise<{
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        guestId: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedAgentId: string | null;
        channel: string;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        lastMessageType: string | null;
        unreadCount: number;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        hotelId: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        guestId: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedAgentId: string | null;
        channel: string;
        lastMessage: string | null;
        lastMessageAt: Date | null;
        lastMessageType: string | null;
        unreadCount: number;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
}
