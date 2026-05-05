import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HotelsModule } from './hotels/hotels.module';
import { GuestsModule } from './guests/guests.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { WebhookModule } from './webhook/webhook.module';
import { TemplatesModule } from './templates/templates.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { AutomationModule } from './automation/automation.module';
import { QueueModule } from './queue/queue.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LogsModule } from './logs/logs.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),

    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
      inject: [ConfigService],
    }),

    PrismaModule,
    AuthModule,
    HotelsModule,
    GuestsModule,
    WhatsAppModule,
    WebhookModule,
    TemplatesModule,
    CampaignsModule,
    ConversationsModule,
    MessagesModule,
    AutomationModule,
    QueueModule,
    AnalyticsModule,
    LogsModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
