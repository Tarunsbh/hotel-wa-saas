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

  /** Recent execution logs for a rule (last 50) */
  async getLogs(hotelId: string, ruleId: string, limit = 50) {
    await this.findOne(hotelId, ruleId);

    const logs = await this.prisma.automationLog.findMany({
      where: { ruleId, hotelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        guest: { select: { id: true, name: true, phone: true } },
      },
    });

    const total   = await this.prisma.automationLog.count({ where: { ruleId, hotelId } });
    const success = await this.prisma.automationLog.count({ where: { ruleId, hotelId, status: 'SUCCESS' } });
    const failed  = await this.prisma.automationLog.count({ where: { ruleId, hotelId, status: 'FAILED' } });

    return { logs, stats: { total, success, failed } };
  }

  /**
   * Manual "Run Now" execution — sends to all matching audience guests.
   * Deduplicates: skips guests who already received this rule today.
   * Called directly from the controller (not via queue) so the HTTP caller
   * gets an immediate result.
   */
  async runRule(ruleId: string): Promise<{
    sent: number;
    failed: number;
    skipped: number;
    errors: string[];
  }> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: { template: true },
    });

    if (!rule) throw new NotFoundException(`Rule ${ruleId} not found`);

    if (!rule.template || rule.template.status !== 'APPROVED') {
      return { sent: 0, failed: 0, skipped: 0, errors: ['Template not approved'] };
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: rule.hotelId },
      select: { phoneNumberId: true },
    });

    if (!hotel?.phoneNumberId) {
      return { sent: 0, failed: 0, skipped: 0, errors: ['Hotel has no phoneNumberId'] };
    }

    const guests = await this.buildRuleAudience(
      rule.hotelId,
      rule.audienceType,
      rule.audienceFilter as any,
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sendComponents = this.buildSendComponents(
      rule.variableValues as Record<string, string> | null,
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const guest of guests) {
      // Per-guest deduplication
      const alreadyRan = await this.prisma.automationLog.findFirst({
        where: {
          ruleId,
          guestId:   guest.id,
          status:    'SUCCESS',
          createdAt: { gte: todayStart },
        },
      });

      if (alreadyRan) {
        skipped++;
        continue;
      }

      try {
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
            hotelId:  rule.hotelId,
            guestId:  guest.id,
            status:   'SUCCESS',
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
            status:  'FAILED',
            error:   e.message,
          },
        });
      }
    }

    await this.prisma.automationRule.update({
      where: { id: ruleId },
      data:  { lastRunAt: new Date(), runCount: { increment: 1 } },
    });

    this.logger.log(`Rule ${ruleId}: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    return { sent, failed, skipped, errors };
  }

  /**
   * Every minute: evaluate which automation rules are due and queue them.
   *
   * CUSTOM_DATE rules  — fire once per day at the configured sendTime.
   *   Due = sendTime matches the current HH:MM AND not already run today.
   *
   * Stay-event rules (BEFORE_ARRIVAL / AFTER_CHECKIN / BEFORE_CHECKOUT /
   *   AFTER_CHECKOUT / DURING_STAY) are triggered by guest stay-status changes.
   *   As a catch-up, this cron also scans guests updated in the last 2 minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async runAllDueRules() {
    const now        = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // ── CUSTOM_DATE: fire once per day at sendTime ───────────────────────
    const customRules = await this.prisma.automationRule.findMany({
      where: { isActive: true, deletedAt: null, triggerType: 'CUSTOM_DATE' },
    });

    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let queued = 0;
    for (const rule of customRules) {
      const sendTime        = rule.sendTime || '00:00';
      const alreadyRunToday = rule.lastRunAt && rule.lastRunAt >= todayStart;

      if (sendTime === currentHHMM && !alreadyRunToday) {
        try {
          await this.automationQueue.add(
            'run-rule',
            { ruleId: rule.id },
            { attempts: 2, backoff: { type: 'fixed', delay: 10_000 }, removeOnComplete: true },
          );
          queued++;
        } catch (e) {
          this.logger.error(`Failed to queue CUSTOM_DATE rule ${rule.id}: ${e.message}`);
        }
      }
    }

    // ── Stay-event catch-up: guests whose stayStatus changed in last 2 min ─
    const twoMinsAgo   = new Date(now.getTime() - 2 * 60 * 1_000);
    const recentGuests = await this.prisma.guest.findMany({
      where: {
        updatedAt:  { gte: twoMinsAgo },
        deletedAt:  null,
        optIn:      true,
        stayStatus: { not: 'NO_STAY' as any },
      },
      select: { id: true, hotelId: true, stayStatus: true },
    });

    for (const guest of recentGuests) {
      await this.runStayEventRulesForGuest(
        guest.id,
        guest.hotelId,
        String(guest.stayStatus),
      ).catch((e) =>
        this.logger.error(`Stay-event check failed for guest ${guest.id}: ${e.message}`),
      );
    }

    if (queued > 0) {
      this.logger.log(`Queued ${queued} CUSTOM_DATE automation rules at ${currentHHMM}`);
    }
  }

  /**
   * Fire all active stay-event rules matching a guest's current stay status.
   * Called from cron catch-up and from the guest update/webhook flow.
   *
   * Trigger mapping:
   *   ARRIVING    → BEFORE_ARRIVAL
   *   IN_HOUSE    → AFTER_CHECKIN, DURING_STAY
   *   CHECKED_OUT → BEFORE_CHECKOUT, AFTER_CHECKOUT
   */
  async runStayEventRulesForGuest(
    guestId: string,
    hotelId: string,
    stayStatus: string,
  ): Promise<void> {
    const triggerMap: Record<string, string[]> = {
      ARRIVING:    ['BEFORE_ARRIVAL'],
      IN_HOUSE:    ['AFTER_CHECKIN', 'DURING_STAY'],
      CHECKED_OUT: ['BEFORE_CHECKOUT', 'AFTER_CHECKOUT'],
    };

    const triggerTypes = triggerMap[stayStatus];
    if (!triggerTypes || triggerTypes.length === 0) return;

    const rules = await this.prisma.automationRule.findMany({
      where: {
        hotelId,
        isActive:    true,
        deletedAt:   null,
        triggerType: { in: triggerTypes as any[] },
      },
    });

    if (rules.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const rule of rules) {
      // Deduplicate: skip if this rule already succeeded for this guest today
      const alreadyRan = await this.prisma.automationLog.findFirst({
        where: {
          ruleId:    rule.id,
          guestId,
          status:    'SUCCESS',
          createdAt: { gte: todayStart },
        },
      });
      if (alreadyRan) {
        this.logger.debug(`Rule ${rule.id} already ran for guest ${guestId} today — skipping`);
        continue;
      }

      const delayMs = (rule.triggerOffsetHours || 0) * 60 * 60 * 1_000;

      await this.automationQueue.add(
        'run-rule-for-guest',
        { ruleId: rule.id, guestId },
        {
          attempts:         2,
          backoff:          { type: 'fixed', delay: 10_000 },
          delay:            delayMs,
          removeOnComplete: true,
        },
      ).catch((e) =>
        this.logger.error(`Failed to queue stay-event rule ${rule.id} for guest ${guestId}: ${e.message}`),
      );

      this.logger.log(
        `Queued stay-event rule "${rule.name}" for guest ${guestId} (delay: ${delayMs / 60_000}min)`,
      );
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
