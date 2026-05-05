import { PrismaService } from '../prisma/prisma.service';
export declare enum LogLevel {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    DEBUG = "DEBUG"
}
export declare enum LogType {
    API = "API",
    ERROR = "ERROR",
    MESSAGE = "MESSAGE",
    CAMPAIGN = "CAMPAIGN",
    AUTOMATION = "AUTOMATION",
    SYSTEM = "SYSTEM",
    TOKEN = "TOKEN"
}
export declare class LogsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLogs(hotelId: string, query: {
        type?: string;
        level?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            type: import(".prisma/client").$Enums.LogType;
            id: bigint;
            hotelId: string | null;
            createdAt: Date;
            message: string;
            ip: string | null;
            level: import(".prisma/client").$Enums.LogLevel;
            userId: string | null;
            context: import("@prisma/client/runtime/library").JsonValue | null;
            requestId: string | null;
            userAgent: string | null;
            durationMs: number | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createLog(hotelId: string, type: string, level: string, message: string, context?: Record<string, any>): Promise<{
        type: import(".prisma/client").$Enums.LogType;
        id: bigint;
        hotelId: string | null;
        createdAt: Date;
        message: string;
        ip: string | null;
        level: import(".prisma/client").$Enums.LogLevel;
        userId: string | null;
        context: import("@prisma/client/runtime/library").JsonValue | null;
        requestId: string | null;
        userAgent: string | null;
        durationMs: number | null;
    }>;
}
