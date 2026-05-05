import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum LogType {
  API = 'API',
  ERROR = 'ERROR',
  MESSAGE = 'MESSAGE',
  CAMPAIGN = 'CAMPAIGN',
  AUTOMATION = 'AUTOMATION',
  SYSTEM = 'SYSTEM',
  TOKEN = 'TOKEN',
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(
    hotelId: string,
    query: {
      type?: string;
      level?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, level } = query;
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Number(query.limit) || 50);
    const skip  = (page - 1) * limit;

    const where: any = { hotelId };

    if (type) where.type = type;
    if (level) where.level = level;

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

  async createLog(
    hotelId: string,
    type: string,
    level: string,
    message: string,
    context?: Record<string, any>,
  ) {
    return this.prisma.log.create({
      data: {
        hotelId,
        type: type as any,
        level: level as any,
        message,
        context: context as any,
      },
    });
  }
}
