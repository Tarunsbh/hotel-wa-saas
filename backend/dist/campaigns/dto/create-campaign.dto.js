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
exports.CreateCampaignDto = exports.AudienceType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var AudienceType;
(function (AudienceType) {
    AudienceType["ALL"] = "ALL";
    AudienceType["ARRIVING"] = "ARRIVING";
    AudienceType["CHECKED_IN"] = "CHECKED_IN";
    AudienceType["IN_HOUSE"] = "IN_HOUSE";
    AudienceType["CHECKED_OUT"] = "CHECKED_OUT";
    AudienceType["TAG"] = "TAG";
    AudienceType["CUSTOM"] = "CUSTOM";
    AudienceType["CSV"] = "CSV";
})(AudienceType || (exports.AudienceType = AudienceType = {}));
class CreateCampaignDto {
}
exports.CreateCampaignDto = CreateCampaignDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Campaign name', example: 'Welcome Campaign Jan 2024' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template ID to use for this campaign' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Audience type for targeting', enum: AudienceType }),
    (0, class_validator_1.IsEnum)(AudienceType),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "audienceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Audience filter criteria (depends on audienceType)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "audienceFilter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date string for scheduling', example: '2024-01-20T10:00:00Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Variable values for template placeholders' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "variableValues", void 0);
//# sourceMappingURL=create-campaign.dto.js.map