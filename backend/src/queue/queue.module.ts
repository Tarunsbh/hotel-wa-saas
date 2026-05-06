import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { MessageProcessor } from './message.processor';
import { CampaignProcessor } from './campaign.processor';
import { TokenRefreshProcessor } from './token-refresh.processor';
import { AutomationProcessor } from './automation.processor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: 'messages' },
      { name: 'campaigns' },
      { name: 'automation' },
      { name: 'token-refresh' },
    ),
  ],
  providers: [MessageProcessor, CampaignProcessor, TokenRefreshProcessor, AutomationProcessor],
  exports: [BullModule],
})
export class QueueModule {}
