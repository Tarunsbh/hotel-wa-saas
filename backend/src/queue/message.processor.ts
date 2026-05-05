import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

export interface SendTemplateJobData {
  hotelId: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  language: string;
  components: any[];
  messageId: string;
  recipientId?: string;
}

@Processor('messages')
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Process('send-template')
  async handleSendTemplate(job: Job<SendTemplateJobData>) {
    const {
      hotelId,
      phoneNumberId,
      to,
      templateName,
      language,
      components,
      messageId,
      recipientId,
    } = job.data;

    this.logger.log(
      `Processing send-template job ${job.id} for message ${messageId}`,
    );

    try {
      const result = await this.whatsappService.sendTemplate(
        hotelId,
        phoneNumberId,
        to,
        templateName,
        language,
        components,
      );

      const waMessageId = result || null;

      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          waMessageId,
          sentAt: new Date(),
        },
      });

      if (recipientId) {
        await this.prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'SENT',
            waMessageId,
            sentAt: new Date(),
          },
        });
      }

      this.logger.log(
        `Successfully sent template message ${messageId} (wa: ${waMessageId})`,
      );

      return { waMessageId, messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send template message ${messageId}: ${error.message}`,
        error.stack,
      );

      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
          },
        });

        if (recipientId) {
          await this.prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: {
              status: 'FAILED',
              errorMessage: error.message,
            },
          });
        }
      }

      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }
}
