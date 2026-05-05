"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsService = exports.LogType = exports.LogLevel = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["DEBUG"] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogType;
(function (LogType) {
    LogType["API"] = "API";
    LogType["ERROR"] = "ERROR";
    LogType["MESSAGE"] = "MESSAGE";
    LogType["CAMPAIGN"] = "CAMPAIGN";
    LogType["AUTOMATION"] = "AUTOMATION";
    LogType["SYSTEM"] = "SYSTEM";
    LogType["TOKEN"] = "TOKEN";
})(LogType || (exports.LogType = LogType = {}));
let LogsService = class LogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLogs(hotelId, query) {
        const { type, level } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 50);
        const skip = (page - 1) * limit;
        const where = { hotelId };
        if (type)
            where.type = type;
        if (level)
            where.level = level;
        const [data, total] = await Promise.all([
            this.prisma.log.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.log.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createLog(hotelId, type, level, message, context) {
        return this.prisma.log.create({
            data: {
                hotelId,
                type: type,
                level: level,
                message,
                context: context,
            },
        });
    }
};
exports.LogsService = LogsService;
exports.LogsService = LogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogsService);
//# sourceMappingURL=logs.service.js.map