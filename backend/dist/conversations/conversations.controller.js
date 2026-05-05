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
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const conversations_service_1 = require("./conversations.service");
let ConversationsController = class ConversationsController {
    constructor(conversationsService) {
        this.conversationsService = conversationsService;
    }
    findAll(req, status, agentId, search, page, limit) {
        return this.conversationsService.findAll(req.user.hotelId, {
            status,
            agentId,
            search,
            page,
            limit,
        });
    }
    findOne(req, id) {
        return this.conversationsService.findOne(req.user.hotelId, id);
    }
    assign(req, id, agentId) {
        return this.conversationsService.assign(req.user.hotelId, id, agentId);
    }
    updateStatus(req, id, status) {
        return this.conversationsService.updateStatus(req.user.hotelId, id, status);
    }
    markRead(req, id) {
        return this.conversationsService.markRead(req.user.hotelId, id);
    }
    remove(req, id) {
        return this.conversationsService.remove(req.user.hotelId, id);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List conversations' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'agentId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('agentId')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a conversation by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a conversation to an agent' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                agentId: { type: 'string' },
            },
            required: ['agentId'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "assign", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update conversation status' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['OPEN', 'PENDING', 'RESOLVED', 'ARCHIVED'],
                },
            },
            required: ['status'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark conversation as read (reset unread count)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a conversation' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "remove", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, swagger_1.ApiTags)('conversations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('conversations'),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map