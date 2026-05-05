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
exports.CreateGuestDto = exports.GuestStatus = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var GuestStatus;
(function (GuestStatus) {
    GuestStatus["ACTIVE"] = "ACTIVE";
    GuestStatus["ARRIVING"] = "ARRIVING";
    GuestStatus["CHECKED_IN"] = "CHECKED_IN";
    GuestStatus["IN_HOUSE"] = "IN_HOUSE";
    GuestStatus["CHECKED_OUT"] = "CHECKED_OUT";
    GuestStatus["INACTIVE"] = "INACTIVE";
    GuestStatus["NO_STAY"] = "NO_STAY";
})(GuestStatus || (exports.GuestStatus = GuestStatus = {}));
class CreateGuestDto {
}
exports.CreateGuestDto = CreateGuestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number in E.164 format', example: '+14155552671' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone must be in E.164 format (e.g. +14155552671)',
    }),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Guest full name', example: 'John Doe' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guest email address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Room number', example: '101' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "roomNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Check-in date', example: '2024-01-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "checkInDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Check-out date', example: '2024-01-20' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "checkOutDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guest language preference', example: 'en' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guest status', enum: GuestStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(GuestStatus),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether guest has opted in to messaging', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateGuestDto.prototype, "optIn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional notes about the guest' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'External CRM ID for reference' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateGuestDto.prototype, "externalId", void 0);
//# sourceMappingURL=create-guest.dto.js.map