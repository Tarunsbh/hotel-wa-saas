import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

export interface RunRuleJobData {
  ruleId: string;
  guestId?: string; // if set: single-guest (stay-event); if absent: all-guest (custom_date)
}

@Processor('automation')
export class AutomationProcessor {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // ── run-rule: all-guest execution (CUSTOM_DATE) ─────────────────────────
  @Process('run-rule')
  async handleRunRule(job: Job<RunRuleJobData>) {
    return this.executeRule(job.data.ruleId, null);
  }

  // ── run-rule-for-guest: single-guest execution (stay-event triggers) ───
  @Process('run-rule-for-guest')
  async handleRunRuleForGuest(job: Job<RunRuleJobData>) {
    const { ruleId, guestId } = job.data;
    if (!guestId) throw new Error('guestId is required for run-rule-for-guest');
    return this.executeRule(ruleId, guestId);
  }

  /**
   * Core execution logic shared by both job types.
   * guestId = null  → send to all matching audience guests
   * guestId = <id>  → send only to that one guest
   */
  private async executeRule(ruleId: string, singleGuestId: string | null) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: { template: true },
    });

    if (!rule) throw new Error(`Automation rule ${ruleId} not found`);

    if (!rule.isActive) {
      this.logger.warn(`Rule ${ruleId} is inactive — skipping`);
      return { sent: 0, failed: 0 };
    }

    if (!rule.template || rule.template.status !== 'APPROVED') {
      this.logger.warn(`Rule ${ruleId} template not APPROVED — skipping`);
      return { sent: 0, failed: 0, errors: ['Template not approved'] };
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: rule.hotelId },
      select: { phoneNumberId: true },
    });

    if (!hotel?.phoneNumberId) {
      throw new Error(`Hotel ${rule.hotelId} has no phoneNumberId`);
    }

    // Build the guest list
    let guests: Array<{ id: string; phone: string; name: string | null }>;

    if (singleGuestId) {
      const g = await this.prisma.guest.findFirst({
        where: { id: singleGuestId, hotelId: rule.hotelId, deletedAt: null, optIn: true },
        select: { id: true, phone: true, name: true },
      });
      guests = g ? [g] : [];
    } else {
      guests = await this.buildAudience(rule.hotelId, String(rule.audienceType), rule.audienceFilter as any);
    }

    if (guests.length === 0) {
      this.logger.log(`Rule ${ruleId}: no eligible guests`);
      return { sent: 0, failed: 0 };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sendComponents = this.buildSendComponents(
      rule.variableValues as Record<string, string> | null,
    );

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const guest of guests) {
      // Per-guest deduplication: skip if already succeeded today
      const alreadyRan = await this.prisma.automationLog.findFirst({
        where: {
          ruleId,
          guestId: guest.id,
          status:    'SUCCESS',
          createdAt: { gte: todayStart },
        },
      });

      if (alreadyRan) {
        this.logger.debug(`Rule ${ruleId} already ran for guest ${guest.id} today — skipping`);
        continue;
      }

      try {
        const waMessageId = await this.whatsappService.sendTemplate(
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
            metadata: { waMessageId } as any,
          },
        });

        sent++;
      } catch (e) {
        failed++;
        const errMsg = `Guest ${guest.phone}: ${e.message}`;
        errors.push(errMsg);

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

    // Update lastRunAt and increment runCount
    await this.prisma.automationRule.update({
      where: { id: ruleId },
      data:  {
        lastRunAt: new Date(),
        runCount:  { increment: 1 },
      },
    });

    this.logger.log(`Rule ${ruleId}: ${sent} sent, ${failed} failed`);
    return { sent, failed, errors };
  }

  private buildSendComponents(variableValues: Record<string, string> | null | undefined): any[] {
    if (!variableValues || Object.keys(variableValues).length === 0) return [];

    const bodyParams = Object.keys(variableValues)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((k) => ({ type: 'text', text: String(variableValues[k] || '') }));

    return bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];
  }

  private async buildAudience(
    hotelId: string,
    audienceType: string,
    filter?: any,
  ): Promise<Array<{ id: string; phone: string; name: string | null }>> {
    const where: any = { hotelId, deletedAt: null, optIn: true };

    switch (audienceType.toUpperCase()) {
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
        if (filter?.tagId) where.guestTags = { some: { tagId: filter.tagId } };
        break;
      case 'CSV':
        if (filter?.guestIds) where.id = { in: filter.guestIds };
        break;
      case 'ALL':
      default:
        break;
    }

    return this.prisma.guest.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Automation job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Automation job ${job.id} (${job.name}) completed`);
  }
}
