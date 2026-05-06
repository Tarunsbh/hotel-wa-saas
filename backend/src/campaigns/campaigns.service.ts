import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('campaigns') private readonly campaignsQueue: Queue,
  ) {}

  private normalizeAudienceType(audienceType?: string) {
    if (!audienceType) return undefined;

    const normalized = audienceType.toUpperCase();
    if (normalized === 'CHECKED_IN') return 'IN_HOUSE';
    if (normalized === 'CUSTOM') return 'CSV';
    return normalized;
  }

  async findAll(
    hotelId: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const { status } = query;
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = { hotelId, deletedAt: null };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        include: {
          template: { select: { id: true, name: true, category: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
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

  async findOne(hotelId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, hotelId, deletedAt: null },
      include: {
        template: true,
        _count: { select: { recipients: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  async create(hotelId: string, userId: string, dto: CreateCampaignDto) {
    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, hotelId, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    // Set status to SCHEDULED if a future scheduledAt is provided; otherwise DRAFT
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const status      = scheduledAt && scheduledAt > new Date() ? 'SCHEDULED' : 'DRAFT';

    const campaign = await this.prisma.campaign.create({
      data: {
        hotelId,
        createdById: userId,
        name: dto.name,
        templateId: dto.templateId,
        audienceType: this.normalizeAudienceType(dto.audienceType) as any,
        audienceFilter: dto.audienceFilter as any,
        scheduledAt,
        variableValues: dto.variableValues as any,
        status: status as any,
      },
    });

    const guests = await this.buildAudience(
      hotelId,
      dto.audienceType,
      dto.audienceFilter,
    );

    const recipientCount = guests.length;

    if (recipientCount > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: guests.map((g) => ({
          campaignId: campaign.id,
          guestId: g.id,
          phone: g.phone,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });
    }

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { totalRecipients: recipientCount },
    });

    return this.findOne(hotelId, campaign.id);
  }

  async update(hotelId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(hotelId, id);

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException(
        'Only DRAFT or SCHEDULED campaigns can be updated',
      );
    }

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }

    if (dto.variableValues !== undefined) {
      updateData.variableValues = dto.variableValues as any;
    }

    if (dto.audienceFilter !== undefined) {
      updateData.audienceFilter = dto.audienceFilter as any;
    }

    if (dto.audienceType !== undefined) {
      updateData.audienceType = this.normalizeAudienceType(dto.audienceType) as any;
    }

    if (dto.templateId !== undefined) {
      const template = await this.prisma.template.findFirst({
        where: { id: dto.templateId, hotelId, deletedAt: null },
      });
      if (!template) {
        throw new NotFoundException(`Template ${dto.templateId} not found`);
      }
      updateData.templateId = dto.templateId;
    }

    await this.prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    if (dto.audienceType !== undefined || dto.audienceFilter !== undefined) {
      const audienceType =
        dto.audienceType !== undefined ? dto.audienceType : campaign.audienceType;
      const audienceFilter =
        dto.audienceFilter !== undefined
          ? dto.audienceFilter
          : campaign.audienceFilter;

      await this.prisma.campaignRecipient.deleteMany({
        where: { campaignId: id },
      });

      const guests = await this.buildAudience(
        hotelId,
        audienceType,
        audienceFilter,
      );

      if (guests.length > 0) {
        await this.prisma.campaignRecipient.createMany({
          data: guests.map((g) => ({
            campaignId: id,
            guestId: g.id,
            phone: g.phone,
            status: 'PENDING',
          })),
          skipDuplicates: true,
        });
      }

      await this.prisma.campaign.update({
        where: { id },
        data: { totalRecipients: guests.length },
      });
    }

    return this.findOne(hotelId, id);
  }

  async launch(hotelId: string, id: string) {
    const campaign = await this.findOne(hotelId, id);

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException(
        'Only DRAFT or SCHEDULED campaigns can be launched',
      );
    }

    // Validate the template is APPROVED before sending anything
    if (!campaign.template || campaign.template.status !== 'APPROVED') {
      throw new BadRequestException(
        'Campaign template must be APPROVED by Meta before launching. ' +
        `Current status: ${campaign.template?.status || 'UNKNOWN'}`,
      );
    }

    const recipientCount = await this.prisma.campaignRecipient.count({
      where: { campaignId: id },
    });

    if (recipientCount === 0) {
      throw new BadRequestException('Campaign has no recipients. The selected audience may be empty.');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    await this.campaignsQueue.add(
      'process',
      { campaignId: id, hotelId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return this.findOne(hotelId, id);
  }

  async cancel(hotelId: string, id: string) {
    const campaign = await this.findOne(hotelId, id);

    if (!['DRAFT', 'SCHEDULED', 'RUNNING'].includes(campaign.status)) {
      throw new BadRequestException(`Campaign cannot be cancelled in status ${campaign.status}`);
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async queueScheduledCampaigns() {
    const now = new Date();

    const dueCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, hotelId: true },
    });

    for (const campaign of dueCampaigns) {
      const recipientCount = await this.prisma.campaignRecipient.count({
        where: { campaignId: campaign.id },
      });

      if (recipientCount === 0) {
        this.logger.warn(
          `Scheduled campaign ${campaign.id} has no recipients and cannot be launched`,
        );
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'FAILED' },
        });
        continue;
      }

      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      await this.campaignsQueue.add('process', {
        campaignId: campaign.id,
        hotelId: campaign.hotelId,
      });
    }
  }

  async getRecipients(
    hotelId: string,
    campaignId: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    await this.findOne(hotelId, campaignId);

    const { status } = query;
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = { campaignId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where,
        skip,
        take: limit,
        include: {
          guest: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.campaignRecipient.count({ where }),
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

  async getStats(hotelId: string, campaignId: string) {
    await this.findOne(hotelId, campaignId);

    const stats = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const result: Record<string, number> = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const s of stats) {
      const key = s.status.toLowerCase();
      result[key] = s._count.status;
      result.total += s._count.status;
    }

    const deliveryRate =
      result.sent > 0
        ? Math.round(((result.delivered + result.read) / result.sent) * 100)
        : 0;

    const readRate =
      result.delivered > 0
        ? Math.round((result.read / result.delivered) * 100)
        : 0;

    return { ...result, deliveryRate, readRate };
  }

  async buildAudience(
    hotelId: string,
    audienceType: string,
    filter?: any,
  ): Promise<any[]> {
    const where: any = {
      hotelId,
      deletedAt: null,
      optIn: true,
    };

    switch (this.normalizeAudienceType(audienceType)) {
      case 'ALL':
        break;

      case 'ARRIVING':
        where.stayStatus = 'ARRIVING';
        break;

      case 'IN_HOUSE':
        where.stayStatus = 'IN_HOUSE';
        break;

      case 'CHECKED_OUT':
        where.stayStatus = 'CHECKED_OUT';
        break;

      case 'TAG':
        if (filter?.tagId) {
          where.guestTags = {
            some: { tagId: filter.tagId },
          };
        }
        break;

      case 'CSV':
        if (filter?.guestIds && Array.isArray(filter.guestIds)) {
          where.id = { in: filter.guestIds };
        }
        if (filter?.checkInAfter) {
          where.checkInDate = { gte: new Date(filter.checkInAfter) };
        }
        if (filter?.checkOutBefore) {
          where.checkOutDate = { lte: new Date(filter.checkOutBefore) };
        }
        break;

      default:
        break;
    }

    return this.prisma.guest.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });
  }

  async softDelete(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Summary analytics across all campaigns — for the dashboard header cards */
  async getAnalytics(hotelId: string) {
    const [statusCounts, totals] = await Promise.all([
      this.prisma.campaign.groupBy({
        by: ['status'],
        where: { hotelId, deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.campaign.aggregate({
        where: { hotelId, deletedAt: null },
        _sum: {
          totalRecipients: true,
          sentCount:       true,
          deliveredCount:  true,
          readCount:       true,
          failedCount:     true,
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status.toLowerCase()] = row._count.status;
    }

    const sent      = totals._sum.sentCount      || 0;
    const delivered = totals._sum.deliveredCount || 0;
    const read      = totals._sum.readCount      || 0;
    const failed    = totals._sum.failedCount    || 0;

    return {
      byStatus,
      totals: {
        campaigns:    statusCounts.reduce((s, r) => s + r._count.status, 0),
        recipients:   totals._sum.totalRecipients || 0,
        sent,
        delivered,
        read,
        failed,
        deliveryRate: sent > 0 ? Math.round(((delivered + read) / sent) * 100) : 0,
        readRate:     delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      },
    };
  }
}
