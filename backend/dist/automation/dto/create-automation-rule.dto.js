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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAutomationRuleDto = exports.RuleAudienceType = exports.TriggerType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var TriggerType;
(function (TriggerType) {
    TriggerType["SCHEDULED"] = "SCHEDULED";
    TriggerType["CHECK_IN"] = "CHECK_IN";
    TriggerType["CHECK_OUT"] = "CHECK_OUT";
    TriggerType["KEYWORD"] = "KEYWORD";
    TriggerType["INACTIVITY"] = "INACTIVITY";
    TriggerType["BEFORE_ARRIVAL"] = "BEFORE_ARRIVAL";
    TriggerType["AFTER_CHECKIN"] = "AFTER_CHECKIN";
    TriggerType["DURING_STAY"] = "DURING_STAY";
    TriggerType["BEFORE_CHECKOUT"] = "BEFORE_CHECKOUT";
    TriggerType["AFTER_CHECKOUT"] = "AFTER_CHECKOUT";
    TriggerType["CUSTOM_DATE"] = "CUSTOM_DATE";
})(TriggerType || (exports.TriggerType = TriggerType = {}));
var RuleAudienceType;
(function (RuleAudienceType) {
    RuleAudienceType["ALL"] = "ALL";
    RuleAudienceType["ARRIVING"] = "ARRIVING";
    RuleAudienceType["CHECKED_IN"] = "CHECKED_IN";
    RuleAudienceType["IN_HOUSE"] = "IN_HOUSE";
    RuleAudienceType["CHECKED_OUT"] = "CHECKED_OUT";
    RuleAudienceType["TAG"] = "TAG";
    RuleAudienceType["CUSTOM"] = "CUSTOM";
    RuleAudienceType["CSV"] = "CSV";
})(RuleAudienceType || (exports.RuleAudienceType = RuleAudienceType = {}));
class CreateAutomationRuleDto {
}
exports.CreateAutomationRuleDto = CreateAutomationRuleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Rule name', example: 'Check-in Welcome Message' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateAutomationRuleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Trigger type', enum: TriggerType }),
    (0, class_validator_1.IsEnum)(TriggerType),
    __metadata("design:type", String)
], CreateAutomationRuleDto.prototype, "triggerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Trigger configuration (cron expression, keyword, hours, etc.)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAutomationRuleDto.prototype, "triggerConfig", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template ID to send' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAutomationRuleDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Audience type', enum: RuleAudienceType }),
    (0, class_validator_1.IsEnum)(RuleAudienceType),
    __metadata("design:type", String)
], CreateAutomationRuleDto.prototype, "audienceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Audience filter criteria' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAutomationRuleDto.prototype, "audienceFilter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template variable values' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAutomationRuleDto.prototype, "variableValues", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether rule is active', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAutomationRuleDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-automation-rule.dto.js.map