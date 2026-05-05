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
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const messages_service_1 = require("./messages.service");
let MessagesController = class MessagesController {
    constructor(messagesService) {
        this.messagesService = messagesService;
    }
    findByConversation(req, conversationId, page, limit) {
        return this.messagesService.findByConversation(req.user.hotelId, conversationId, { page, limit });
    }
    sendText(req, conversationId, body) {
        return this.messagesService.sendText(req.user.hotelId, req.user.sub, conversationId, body);
    }
    sendTemplate(req, conversationId, templateId, variableValues) {
        return this.messagesService.sendTemplate(req.user.hotelId, req.user.sub, conversationId, templateId, variableValues || {});
    }
    sendToNumber(req, to, body) {
        return this.messagesService.sendToNumber(req.user.hotelId, req.user.sub, to, body);
    }
    sendTemplateToNumber(req, to, templateId, variableValues) {
        return this.messagesService.sendTemplateToNumber(req.user.hotelId, req.user.sub, to, templateId, variableValues || {});
    }
    sendMedia(req, conversationId, type, link, caption) {
        return this.messagesService.sendMedia(req.user.hotelId, req.user.sub, conversationId, type, link, caption);
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Get)('conversation/:conversationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages for a conversation' }),
    (0, swagger_1.ApiParam)({ name: 'conversationId', type: 'string' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "findByConversation", null);
__decorate([
    (0, common_1.Post)('send/text'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a text message' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                conversationId: { type: 'string' },
                body: { type: 'string' },
            },
            required: ['conversationId', 'body'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('conversationId')),
    __param(2, (0, common_1.Body)('body')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendText", null);
__decorate([
    (0, common_1.Post)('send/template'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a template message' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                conversationId: { type: 'string' },
                templateId: { type: 'string' },
                variableValues: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                },
            },
            required: ['conversationId', 'templateId'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('conversationId')),
    __param(2, (0, common_1.Body)('templateId')),
    __param(3, (0, common_1.Body)('variableValues')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendTemplate", null);
__decorate([
    (0, common_1.Post)('send/to-number'),
    (0, swagger_1.ApiOperation)({ summary: 'Send text to any phone number (auto creates guest + conversation)' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Phone in E.164 format, e.g. +971501234567' },
                body: { type: 'string' },
            },
            required: ['to', 'body'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('to')),
    __param(2, (0, common_1.Body)('body')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendToNumber", null);
__decorate([
    (0, common_1.Post)('send/template/to-number'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a template message to any phone number (creates guest + conversation)' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Phone in E.164 format, e.g. +971501234567' },
                templateId: { type: 'string' },
                variableValues: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                },
            },
            required: ['to', 'templateId'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('to')),
    __param(2, (0, common_1.Body)('templateId')),
    __param(3, (0, common_1.Body)('variableValues')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendTemplateToNumber", null);
__decorate([
    (0, common_1.Post)('send/media'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a media message' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                conversationId: { type: 'string' },
                type: {
                    type: 'string',
                    enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'],
                },
                link: { type: 'string' },
                caption: { type: 'string' },
            },
            required: ['conversationId', 'type', 'link'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('conversationId')),
    __param(2, (0, common_1.Body)('type')),
    __param(3, (0, common_1.Body)('link')),
    __param(4, (0, common_1.Body)('caption')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendMedia", null);
exports.MessagesController = MessagesController = __decorate([
    (0, swagger_1.ApiTags)('messages'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map