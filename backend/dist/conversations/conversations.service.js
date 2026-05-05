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
var ConversationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = exports.ConversationStatus = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["OPEN"] = "OPEN";
    ConversationStatus["PENDING"] = "PENDING";
    ConversationStatus["RESOLVED"] = "RESOLVED";
    ConversationStatus["ARCHIVED"] = "ARCHIVED";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
let ConversationsService = ConversationsService_1 = class ConversationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ConversationsService_1.name);
    }
    async findAll(hotelId, query) {
        const { status, agentId, search } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 20);
        const skip = (page - 1) * limit;
        const where = { hotelId, deletedAt: null };
        if (status)
            where.status = status;
        if (agentId)
            where.assignedAgentId = agentId;
        if (search) {
            where.OR = [
                { guest: { name: { contains: search } } },
                { guest: { phone: { contains: search } } },
            ];
        }
        try {
            const [data, total] = await Promise.all([
                this.prisma.conversation.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    include: {
                        guest: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                roomNumber: true,
                            },
                        },
                        assignedAgent: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                    orderBy: { updatedAt: 'desc' },
                }),
                this.prisma.conversation.count({ where }),
            ]);
            return {
                data,
                meta: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (err) {
            this.logger.error(`findAll failed for hotel ${hotelId}: ${err.message}`, err.stack);
            throw new common_1.InternalServerErrorException(`Database query failed: ${err.message}`);
        }
    }
    async findOne(hotelId, id) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id, hotelId, deletedAt: null },
            include: {
                guest: true,
                assignedAgent: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation ${id} not found`);
        }
        return conversation;
    }
    async assign(hotelId, id, agentId) {
        await this.findOne(hotelId, id);
        const agent = await this.prisma.user.findFirst({
            where: { id: agentId, hotelId },
        });
        if (!agent) {
            throw new common_1.NotFoundException(`Agent ${agentId} not found in this hotel`);
        }
        return this.prisma.conversation.update({
            where: { id },
            data: { assignedAgentId: agentId },
            include: {
                guest: {
                    select: { id: true, name: true, phone: true },
                },
                assignedAgent: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }
    async updateStatus(hotelId, id, status) {
        await this.findOne(hotelId, id);
        const validStatuses = Object.values(ConversationStatus);
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        const data = { status };
        if (status === ConversationStatus.RESOLVED) {
            data.resolvedAt = new Date();
        }
        return this.prisma.conversation.update({
            where: { id },
            data,
        });
    }
    async markRead(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.conversation.update({
            where: { id },
            data: { unreadCount: 0 },
        });
    }
    async remove(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.conversation.delete({
            where: { id },
        });
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = ConversationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map