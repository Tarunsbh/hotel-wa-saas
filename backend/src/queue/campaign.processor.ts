import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
  InjectQueue,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

export interface CampaignJobData {
  campaignId: string;
  hotelId: string;
}

const BATCH_SIZE = 50;
const DELAY_BETWEEN_MESSAGES_MS = 100;

@Processor('campaigns')
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('messages') private readonly messagesQueue: Queue,
  ) {}

  @Process({ name: 'process', concurrency: 2 })
  async handleProcess(job: Job<CampaignJobData>) {
    const { campaignId, hotelId } = job.data;

    this.logger.log(`Processing campaign ${campaignId}`);

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, hotelId },
      include: { template: true },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== 'RUNNING') {
      this.logger.warn(
        `Campaign ${campaignId} is not in RUNNING status (${campaign.status}). Skipping.`,
      );
      return;
    }

    if (!campaign.template) {
      await this.markCampaignFailed(campaignId, 'Template not found');
      throw new Error('Campaign template not found');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { phoneNumberId: true },
    });

    if (!hotel?.phoneNumberId) {
      await this.markCampaignFailed(campaignId, 'Hotel has no phoneNumberId');
      throw new Error('Hotel has no phoneNumberId configured');
    }

    const pendingRecipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    const totalRecipients = pendingRecipients.length;
    this.logger.log(
      `Campaign ${campaignId}: enqueuing ${totalRecipients} messages`,
    );

    let processed = 0;

    for (let i = 0; i < pendingRecipients.length; i += BATCH_SIZE) {
      const batch = pendingRecipients.slice(i, i + BATCH_SIZE);

      for (const recipient of batch) {
        const conversation = await this.prisma.conversation.upsert({
          where: {
            guestId_hotelId: {
              guestId: recipient.guestId,
              hotelId,
            },
          },
          update: {},
          create: {
            hotelId,
            guestId: recipient.guestId,
            status: 'OPEN',
            lastMessage: campaign.template!.bodyText || campaign.template!.name,
            lastMessageAt: new Date(),
            lastMessageType: 'TEMPLATE',
          },
        });

        const message = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            hotelId,
            direction: 'OUTBOUND',
            type: 'TEMPLATE',
            body: campaign.template!.bodyText || campaign.template!.name,
            templateId: campaign.template!.id,
            status: 'PENDING',
            campaignId,
          },
        });

        await this.messagesQueue.add(
          'send-template',
          {
            hotelId,
            phoneNumberId: hotel.phoneNumberId,
            to: recipient.phone,
            templateName: campaign.template!.name,
            language: campaign.template!.language,
            // Build runtime body parameters from variableValues.
            // Meta API send format: [{ type: "body", parameters: [{ type: "text", text: "val" }] }]
            components: this.buildSendComponents(
              campaign.variableValues as Record<string, string> | null,
            ),
            messageId: message.id,
            recipientId: recipient.id,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            delay: i * DELAY_BETWEEN_MESSAGES_MS,
            removeOnComplete: false,
          },
        );

        processed++;
      }

      await job.progress(Math.round((processed / totalRecipients) * 100));
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Campaign ${campaignId} processing complete: ${processed} messages enqueued`,
    );

    return { processed };
  }

  /**
   * Build runtime body parameters from variableValues for Meta API send call.
   * variableValues: { "1": "John", "2": "Room 201" }
   * → [{ type: "body", parameters: [{ type: "text", text: "John" }, { type: "text", text: "Room 201" }] }]
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

  private async markCampaignFailed(campaignId: string, reason: string) {
    this.logger.error(`Campaign ${campaignId} failed: ${reason}`);
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    });
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Campaign job ${job.id} failed: ${error.message}`,
      error.stack,
    );

    const { campaignId } = job.data as CampaignJobData;
    if (campaignId && job.attemptsMade >= (job.opts?.attempts || 3)) {
      await this.markCampaignFailed(campaignId, error.message).catch(() => {});
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job) {
    this.logger.log(`Campaign job ${job.id} completed`);
  }
}
