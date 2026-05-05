"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const schedule_1 = require("@nestjs/schedule");
const message_processor_1 = require("./message.processor");
const campaign_processor_1 = require("./campaign.processor");
const token_refresh_processor_1 = require("./token-refresh.processor");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.registerQueue({ name: 'messages' }, { name: 'campaigns' }, { name: 'automation' }, { name: 'token-refresh' }),
        ],
        providers: [message_processor_1.MessageProcessor, campaign_processor_1.CampaignProcessor, token_refresh_processor_1.TokenRefreshProcessor],
        exports: [bull_1.BullModule],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map