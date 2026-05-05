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
exports.HotelsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const hotels_service_1 = require("./hotels.service");
const update_hotel_dto_1 = require("./dto/update-hotel.dto");
let HotelsController = class HotelsController {
    constructor(hotelsService) {
        this.hotelsService = hotelsService;
    }
    getMe(req) {
        return this.hotelsService.findOne(req.user.hotelId);
    }
    update(req, dto) {
        return this.hotelsService.update(req.user.hotelId, dto);
    }
    storeToken(req, accessToken, wabaId, phoneNumberId, expiresIn) {
        return this.hotelsService.storeToken(req.user.hotelId, {
            accessToken,
            wabaId,
            phoneNumberId,
            expiresIn,
        });
    }
    getTokens(req) {
        return this.hotelsService.getTokens(req.user.hotelId);
    }
};
exports.HotelsController = HotelsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current hotel information' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HotelsController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Update current hotel settings' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_hotel_dto_1.UpdateHotelDto]),
    __metadata("design:returntype", void 0)
], HotelsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('me/token'),
    (0, swagger_1.ApiOperation)({ summary: 'Store/update WhatsApp access token' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                wabaId: { type: 'string' },
                phoneNumberId: { type: 'string' },
                expiresIn: { type: 'number', description: 'Token TTL in seconds' },
            },
            required: ['accessToken'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('accessToken')),
    __param(2, (0, common_1.Body)('wabaId')),
    __param(3, (0, common_1.Body)('phoneNumberId')),
    __param(4, (0, common_1.Body)('expiresIn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number]),
    __metadata("design:returntype", void 0)
], HotelsController.prototype, "storeToken", null);
__decorate([
    (0, common_1.Get)('me/tokens'),
    (0, swagger_1.ApiOperation)({ summary: 'List stored WhatsApp tokens (masked)' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HotelsController.prototype, "getTokens", null);
exports.HotelsController = HotelsController = __decorate([
    (0, swagger_1.ApiTags)('hotels'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('hotels'),
    __metadata("design:paramtypes", [hotels_service_1.HotelsService])
], HotelsController);
//# sourceMappingURL=hotels.controller.js.map