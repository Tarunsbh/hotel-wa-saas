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
exports.CreateTemplateDto = exports.HeaderType = exports.TemplateCategory = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var TemplateCategory;
(function (TemplateCategory) {
    TemplateCategory["MARKETING"] = "MARKETING";
    TemplateCategory["UTILITY"] = "UTILITY";
    TemplateCategory["AUTHENTICATION"] = "AUTHENTICATION";
})(TemplateCategory || (exports.TemplateCategory = TemplateCategory = {}));
var HeaderType;
(function (HeaderType) {
    HeaderType["NONE"] = "NONE";
    HeaderType["TEXT"] = "TEXT";
    HeaderType["IMAGE"] = "IMAGE";
    HeaderType["VIDEO"] = "VIDEO";
    HeaderType["DOCUMENT"] = "DOCUMENT";
})(HeaderType || (exports.HeaderType = HeaderType = {}));
class CreateTemplateDto {
}
exports.CreateTemplateDto = CreateTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name (used in Meta API)', example: 'welcome_message' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template category', enum: TemplateCategory }),
    (0, class_validator_1.IsEnum)(TemplateCategory),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template language code', example: 'en' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Header text content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "headerText", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template header type', enum: HeaderType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(HeaderType),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "headerType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Body text content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1024),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "bodyText", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Footer text content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "footerText", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template components (Meta format)', type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateTemplateDto.prototype, "components", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template buttons configuration', type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateTemplateDto.prototype, "buttons", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Submit to Meta immediately after creation', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTemplateDto.prototype, "submitToMeta", void 0);
//# sourceMappingURL=create-template.dto.js.map