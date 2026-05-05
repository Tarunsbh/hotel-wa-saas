import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

export interface TokenRefreshJobData {
  tokenId: string;
  hotelId: string;
}

@Processor('token-refresh')
export class TokenRefreshProcessor {
  private readonly logger = new Logger(TokenRefreshProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    @InjectQueue('token-refresh') private readonly tokenRefreshQueue: Queue,
  ) {}

  @Cron('0 * * * *') // Every hour
  async scheduleTokenRefreshes() {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const tokens = await this.prisma.tokenStorage.findMany({
      where: {
        isActive: true,
        tokenType: 'ACCESS',
        refreshAt: {
          lte: oneHourFromNow,
        },
      },
      select: { id: true, hotelId: true },
    });

    this.logger.log(`Found ${tokens.length} tokens due for refresh`);

    for (const token of tokens) {
      await this.tokenRefreshQueue.add(
        'refresh',
        { tokenId: token.id, hotelId: token.hotelId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          jobId: `refresh-${token.id}`,
        },
      );
    }
  }

  @Process('refresh')
  async handleRefresh(job: Job<TokenRefreshJobData>) {
    const { tokenId, hotelId } = job.data;

    this.logger.log(`Refreshing token ${tokenId} for hotel ${hotelId}`);

    const tokenRecord = await this.prisma.tokenStorage.findFirst({
      where: { id: tokenId, hotelId, isActive: true, tokenType: 'ACCESS' },
    });

    if (!tokenRecord) {
      this.logger.warn(`Token ${tokenId} not found or inactive, skipping`);
      return;
    }

    try {
      const refreshed = await this.whatsappService.refreshToken(
        this.whatsappService.decryptToken(tokenRecord.tokenValue),
      );

      const expiresAt = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : null;

      const refreshAt = expiresAt
        ? new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000)
        : null;

      await this.prisma.tokenStorage.update({
        where: { id: tokenId },
        data: {
          tokenValue: this.whatsappService.encryptToken(refreshed.access_token),
          tokenHash: require('crypto-js')
            .SHA256(refreshed.access_token)
            .toString(),
          expiresAt,
          refreshAt,
          lastRefreshed: new Date(),
          refreshCount: { increment: 1 },
        },
      });

      this.logger.log(`Successfully refreshed token ${tokenId}`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh token ${tokenId}: ${error.message}`,
        error.stack,
      );

      await this.prisma.tokenStorage.update({
        where: { id: tokenId },
        data: {
          lastRefreshed: new Date(),
        },
      });

      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Token refresh job ${job.id} failed: ${error.message}`,
    );
  }
}
