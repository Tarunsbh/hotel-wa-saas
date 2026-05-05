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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    getDashboard(req) {
        return this.analyticsService.getDashboard(req.user.hotelId);
    }
    getMessageVolume(req, days) {
        return this.analyticsService.getMessageVolume(req.user.hotelId, days ? Number(days) : 7);
    }
    getCampaignPerformance(req, campaignId) {
        return this.analyticsService.getCampaignPerformance(req.user.hotelId, campaignId);
    }
    getAgentPerformance(req) {
        return this.analyticsService.getAgentPerformance(req.user.hotelId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard summary metrics' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('message-volume'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily message volume for the last N days' }),
    (0, swagger_1.ApiQuery)({
        name: 'days',
        required: false,
        type: Number,
        description: 'Number of days to include (default: 7)',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getMessageVolume", null);
__decorate([
    (0, common_1.Get)('campaigns'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get campaign performance. Optionally filter by campaignId.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'campaignId', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getCampaignPerformance", null);
__decorate([
    (0, common_1.Get)('agents'),
    (0, swagger_1.ApiOperation)({ summary: 'Get per-agent resolution and messaging stats' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAgentPerformance", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map