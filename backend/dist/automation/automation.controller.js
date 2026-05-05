"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const automation_service_1 = require("./automation.service");
const create_automation_rule_dto_1 = require("./dto/create-automation-rule.dto");
const update_automation_rule_dto_1 = require("./dto/update-automation-rule.dto");
let AutomationController = class AutomationController {
    constructor(automationService) {
        this.automationService = automationService;
    }
    findAll(req) {
        return this.automationService.findAll(req.user.hotelId);
    }
    findOne(req, id) {
        return this.automationService.findOne(req.user.hotelId, id);
    }
    create(req, dto) {
        return this.automationService.create(req.user.hotelId, req.user.sub, dto);
    }
    update(req, id, dto) {
        return this.automationService.update(req.user.hotelId, id, dto);
    }
    softDelete(req, id) {
        return this.automationService.softDelete(req.user.hotelId, id);
    }
    toggle(req, id) {
        return this.automationService.toggle(req.user.hotelId, id);
    }
    async runNow(req, id) {
        await this.automationService.findOne(req.user.hotelId, id);
        return this.automationService.runRule(id);
    }
};
exports.AutomationController = AutomationController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all automation rules' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single automation rule' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create an automation rule' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_automation_rule_dto_1.CreateAutomationRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an automation rule' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_automation_rule_dto_1.UpdateAutomationRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete an automation rule' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "softDelete", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle automation rule active/inactive' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationController.prototype, "toggle", null);
__decorate([
    (0, common_1.Post)(':id/run-now'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger an automation rule' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "runNow", null);
exports.AutomationController = AutomationController = __decorate([
    (0, swagger_1.ApiTags)('automation'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('automation/rules'),
    __metadata("design:paramtypes", [automation_service_1.AutomationService])
], AutomationController);
//# sourceMappingURL=automation.controller.js.map