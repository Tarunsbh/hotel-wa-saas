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
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const webhook_service_1 = require("./webhook.service");
let WebhookController = class WebhookController {
    constructor(webhookService) {
        this.webhookService = webhookService;
        this.logger = new common_1.Logger('WebhookController');
    }
    verify(mode, token, challenge, res) {
        this.logger.log(`🔐 Verification request: mode=${mode} token=${token}`);
        if (mode === 'subscribe' && this.webhookService.verifyToken(token)) {
            this.logger.log('✅ Webhook verified — returning challenge');
            return res.status(200).send(challenge);
        }
        this.logger.warn(`❌ Verification FAILED — mode=${mode} token=${token}`);
        return res.status(403).send('Forbidden');
    }
    async receive(body, headers) {
        this.logger.log(`📥 POST /webhook hit — object=${body?.object} entries=${body?.entry?.length || 0}`);
        this.webhookService.processEvent(body).catch((err) => {
            this.logger.error(`❌ processEvent threw: ${err.message}`, err.stack);
        });
        return 'EVENT_RECEIVED';
    }
    async debug() {
        this.logger.log('🔍 Debug endpoint called');
        return this.webhookService.getDebugInfo();
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Receive WhatsApp events from Meta' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "receive", null);
__decorate([
    (0, common_1.Get)('debug'),
    (0, swagger_1.ApiOperation)({ summary: 'Debug: show webhook config + hotel phoneNumberId values' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "debug", null);
exports.WebhookController = WebhookController = __decorate([
    (0, swagger_1.ApiTags)('webhook'),
    (0, common_1.Controller)('webhook'),
    __metadata("design:paramtypes", [webhook_service_1.WebhookService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map