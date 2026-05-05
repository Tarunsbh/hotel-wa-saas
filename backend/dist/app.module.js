"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const hotels_module_1 = require("./hotels/hotels.module");
const guests_module_1 = require("./guests/guests.module");
const whatsapp_module_1 = require("./whatsapp/whatsapp.module");
const webhook_module_1 = require("./webhook/webhook.module");
const templates_module_1 = require("./templates/templates.module");
const campaigns_module_1 = require("./campaigns/campaigns.module");
const conversations_module_1 = require("./conversations/conversations.module");
const messages_module_1 = require("./messages/messages.module");
const automation_module_1 = require("./automation/automation.module");
const queue_module_1 = require("./queue/queue.module");
const analytics_module_1 = require("./analytics/analytics.module");
const logs_module_1 = require("./logs/logs.module");
const gateway_module_1 = require("./gateway/gateway.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST') || 'localhost',
                        port: config.get('REDIS_PORT') || 6379,
                        password: config.get('REDIS_PASSWORD'),
                    },
                    defaultJobOptions: {
                        removeOnComplete: 100,
                        removeOnFail: 500,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 5000 },
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            hotels_module_1.HotelsModule,
            guests_module_1.GuestsModule,
            whatsapp_module_1.WhatsAppModule,
            webhook_module_1.WebhookModule,
            templates_module_1.TemplatesModule,
            campaigns_module_1.CampaignsModule,
            conversations_module_1.ConversationsModule,
            messages_module_1.MessagesModule,
            automation_module_1.AutomationModule,
            queue_module_1.QueueModule,
            analytics_module_1.AnalyticsModule,
            logs_module_1.LogsModule,
            gateway_module_1.GatewayModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map