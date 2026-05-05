import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    hotelId: string,
    query: {
      status?: string;
      agentId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, agentId, search } = query;
    const page  = Math.max(1,  Number(query.page)  || 1);
    const limit = Math.max(1,  Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = { hotelId, deletedAt: null };

    if (status) where.status = status;
    if (agentId) where.assignedAgentId = agentId;

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
    } catch (err) {
      this.logger.error(`findAll failed for hotel ${hotelId}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Database query failed: ${err.message}`);
    }
  }

  async findOne(hotelId: string, id: string) {
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
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return conversation;
  }

  async assign(hotelId: string, id: string, agentId: string) {
    await this.findOne(hotelId, id);

    const agent = await this.prisma.user.findFirst({
      where: { id: agentId, hotelId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found in this hotel`);
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

  async updateStatus(hotelId: string, id: string, status: string) {
    await this.findOne(hotelId, id);

    const validStatuses = Object.values(ConversationStatus);
    if (!validStatuses.includes(status as ConversationStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const data: any = { status };

    if (status === ConversationStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async markRead(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  async remove(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.conversation.delete({
      where: { id },
    });
  }
}
