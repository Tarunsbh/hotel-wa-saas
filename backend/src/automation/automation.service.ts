import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    @InjectQueue('automation') private readonly automationQueue: Queue,
  ) {}

  private normalizeTriggerType(triggerType?: string) {
    if (!triggerType) return undefined;

    const normalized = triggerType.toUpperCase();
    if (normalized === 'SCHEDULED') return 'CUSTOM_DATE';
    if (normalized === 'CHECK_IN') return 'AFTER_CHECKIN';
    if (normalized === 'CHECK_OUT') return 'AFTER_CHECKOUT';
    if (normalized === 'KEYWORD' || normalized === 'INACTIVITY') {
      return 'CUSTOM_DATE';
    }
    return normalized;
  }

  private normalizeAudienceType(audienceType?: string) {
    if (!audienceType) return undefined;

    const normalized = audienceType.toUpperCase();
    if (normalized === 'CHECKED_IN') return 'IN_HOUSE';
    if (normalized === 'CUSTOM') return 'CSV';
    return normalized;
  }

  private normalizeOffsetDirection(direction?: string) {
    return direction?.toUpperCase() === 'BEFORE' ? 'BEFORE' : 'AFTER';
  }

  async findAll(hotelId: string) {
    return this.prisma.automationRule.findMany({
      where: { hotelId, deletedAt: null },
      include: {
        template: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(hotelId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, hotelId, deletedAt: null },
      include: {
        template: { select: { id: true, name: true, category: true } },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${id} not found`);
    }

    return rule;
  }

  async create(
    hotelId: string,
    userId: string,
    dto: CreateAutomationRuleDto,
  ) {
    return this.prisma.automationRule.create({
      data: {
        hotelId,
        createdById: userId,
        name: dto.name,
        triggerType: this.normalizeTriggerType(dto.triggerType) as any,
        triggerOffsetHours: Number(dto.triggerConfig?.offsetHours || 0),
        triggerOffsetDirection: this.normalizeOffsetDirection(
          dto.triggerConfig?.offsetDirection,
        ) as any,
        sendTime: dto.triggerConfig?.sendTime,
        conditions: dto.triggerConfig as any,
        templateId: dto.templateId,
        audienceType: this.normalizeAudienceType(dto.audienceType) as any,
        audienceFilter: dto.audienceFilter as any,
        variableValues: dto.variableValues as any,
        isActive: dto.isActive ?? true,
      },
      include: {
        template: { select: { id: true, name: true } },
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateAutomationRuleDto) {
    await this.findOne(hotelId, id);

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        name: dto.name,
        triggerType: this.normalizeTriggerType(dto.triggerType) as any,
        triggerOffsetHours: dto.triggerConfig?.offsetHours,
        triggerOffsetDirection: dto.triggerConfig?.offsetDirection
          ? (this.normalizeOffsetDirection(dto.triggerConfig.offsetDirection) as any)
          : undefined,
        sendTime: dto.triggerConfig?.sendTime,
        conditions: dto.triggerConfig as any,
        templateId: dto.templateId,
        audienceType: this.normalizeAudienceType(dto.audienceType) as any,
        audienceFilter: dto.audienceFilter as any,
        variableValues: dto.variableValues as any,
        isActive: dto.isActive,
      },
    });
  }

  async toggle(hotelId: string, id: string) {
    const rule = await this.findOne(hotelId, id);

    return this.prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }

  async softDelete(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.automationRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async runRule(ruleId: string): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: { template: true },
    });

    if (!rule) {
      throw new NotFoundException(`Rule ${ruleId} not found`);
    }

    if (!rule.template || rule.template.status !== 'APPROVED') {
      return {
        sent: 0,
        failed: 0,
        errors: ['Template not approved'],
      };
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: rule.hotelId },
      select: { phoneNumberId: true },
    });

    if (!hotel?.phoneNumberId) {
      return { sent: 0, failed: 0, errors: ['Hotel has no phoneNumberId'] };
    }

    const guests = await this.buildRuleAudience(
      rule.hotelId,
      rule.audienceType,
      rule.audienceFilter as any,
    );

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const guest of guests) {
      try {
        // Build runtime send-components from variableValues (NOT the stored template structure).
        // Meta API expects body/header parameters at send time, not the full template definition.
        const sendComponents = this.buildSendComponents(
          rule.variableValues as Record<string, string> | null,
        );

        const result = await this.whatsappService.sendTemplate(
          rule.hotelId,
          hotel.phoneNumberId,
          guest.phone,
          rule.template.name,
          rule.template.language,
          sendComponents,
        );

        await this.prisma.automationLog.create({
          data: {
            ruleId,
            hotelId: rule.hotelId,
            guestId: guest.id,
            status: 'SUCCESS',
            metadata: { waMessageId: result } as any,
          },
        });

        sent++;
      } catch (e) {
        failed++;
        errors.push(`Guest ${guest.phone}: ${e.message}`);

        await this.prisma.automationLog.create({
          data: {
            ruleId,
            hotelId: rule.hotelId,
            guestId: guest.id,
            status: 'FAILED',
            error: e.message,
          },
        });
      }
    }

    await this.prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });

    this.logger.log(
      `Rule ${ruleId} executed: ${sent} sent, ${failed} failed`,
    );

    return { sent, failed, errors };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runAllDueRules() {
    const now = new Date();

    const rules = await this.prisma.automationRule.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        triggerType: 'CUSTOM_DATE',
        lastRunAt: null,
      },
    });

    for (const rule of rules) {
      try {
        await this.automationQueue.add(
          'run-rule',
          { ruleId: rule.id },
          {
            attempts: 2,
            backoff: { type: 'fixed', delay: 10000 },
            removeOnComplete: true,
          },
        );
      } catch (e) {
        this.logger.error(`Failed to queue rule ${rule.id}: ${e.message}`);
      }
    }

    if (rules.length > 0) {
      this.logger.log(`Queued ${rules.length} automation rules`);
    }
  }

  /**
   * Build the runtime parameter components for sending a template via Meta API.
   *
   * Meta API send format (NOT the template definition format):
   *   components: [{ type: "body", parameters: [{ type: "text", text: "value1" }, ...] }]
   *
   * variableValues: { "1": "John", "2": "Room 201" }
   */
  private buildSendComponents(variableValues: Record<string, string> | null | undefined): any[] {
    if (!variableValues || Object.keys(variableValues).length === 0) return [];

    const bodyParams = Object.keys(variableValues)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((k) => ({ type: 'text', text: String(variableValues[k] || '') }));

    return bodyParams.length > 0
      ? [{ type: 'body', parameters: bodyParams }]
      : [];
  }

  private async buildRuleAudience(
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
          where.guestTags = { some: { tagId: filter.tagId } };
        }
        break;
      case 'CSV':
        if (filter?.guestIds) {
          where.id = { in: filter.guestIds };
        }
        break;
    }

    return this.prisma.guest.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });
  }
}
