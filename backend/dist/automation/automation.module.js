"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const schedule_1 = require("@nestjs/schedule");
const automation_controller_1 = require("./automation.controller");
const automation_service_1 = require("./automation.service");
let AutomationModule = class AutomationModule {
};
exports.AutomationModule = AutomationModule;
exports.AutomationModule = AutomationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({
                name: 'automation',
            }),
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [automation_controller_1.AutomationController],
        providers: [automation_service_1.AutomationService],
        exports: [automation_service_1.AutomationService],
    })
], AutomationModule);
//# sourceMappingURL=automation.module.js.map