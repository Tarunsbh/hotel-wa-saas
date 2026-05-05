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
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const CryptoJS = require("crypto-js");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../prisma/prisma.service");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(WhatsAppService_1.name);
        this.graphBase = config.get('WA_API_BASE') || 'https://graph.facebook.com';
        this.apiVersion = config.get('WA_API_VERSION') || 'v18.0';
        this.encryptionKey = config.get('TOKEN_ENCRYPTION_KEY') || 'default_key_change_in_production';
    }
    encryptToken(token) {
        return CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
    }
    decryptToken(encrypted) {
        const bytes = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
    async getActiveToken(hotelId) {
        const stored = await this.prisma.tokenStorage.findFirst({
            where: { hotelId, isActive: true, tokenType: 'ACCESS' },
            orderBy: { createdAt: 'desc' },
        });
        if (stored) {
            await this.prisma.tokenStorage.update({
                where: { id: stored.id },
                data: { lastUsedAt: new Date() },
            });
            return {
                token: this.decryptToken(stored.tokenValue),
                source: 'db',
                tokenId: stored.id,
            };
        }
        return { token: this.config.get('WA_ACCESS_TOKEN') || '', source: 'env' };
    }
    buildClientWithToken(token) {
        return axios_1.default.create({
            baseURL: `${this.graphBase}/${this.apiVersion}`,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 15000,
        });
    }
    async buildClient(hotelId) {
        const tokenInfo = await this.getActiveToken(hotelId);
        return this.buildClientWithToken(tokenInfo.token);
    }
    isAuthError(e) {
        const status = e.response?.status;
        const msg = String(e.response?.data?.error?.message || e.message || '').toLowerCase();
        return (status === 401 ||
            status === 403 ||
            msg.includes('authentication') ||
            msg.includes('auth') ||
            msg.includes('invalid access token'));
    }
    async requestWithFallback(hotelId, requestFn) {
        const tokenInfo = await this.getActiveToken(hotelId);
        const client = this.buildClientWithToken(tokenInfo.token);
        try {
            return await requestFn(client);
        }
        catch (e) {
            if (tokenInfo.source === 'db' && this.isAuthError(e)) {
                this.logger.warn(`Stored WA token invalid for hotel ${hotelId}; falling back to env token`);
                if (tokenInfo.tokenId) {
                    await this.prisma.tokenStorage.update({
                        where: { id: tokenInfo.tokenId },
                        data: { isActive: false },
                    }).catch(() => undefined);
                }
                const envToken = this.config.get('WA_ACCESS_TOKEN') || '';
                if (!envToken) {
                    throw e;
                }
                const fallbackClient = this.buildClientWithToken(envToken);
                return await requestFn(fallbackClient);
            }
            throw e;
        }
    }
    async sendText(hotelId, phoneNumberId, to, body) {
        try {
            const res = await this.requestWithFallback(hotelId, (client) => client.post(`/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body, preview_url: false },
            }));
            return res.data?.messages?.[0]?.id || '';
        }
        catch (e) {
            this.logger.error(`sendText failed: ${e.response?.data?.error?.message || e.message}`);
            throw new common_1.InternalServerErrorException(e.response?.data?.error?.message || 'Failed to send message');
        }
    }
    async sendTemplate(hotelId, phoneNumberId, to, templateName, languageCode, components) {
        try {
            const res = await this.requestWithFallback(hotelId, (client) => {
                const payload = {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'template',
                    template: { name: templateName, language: { code: languageCode } },
                };
                if (components?.length)
                    payload.template.components = components;
                return client.post(`/${phoneNumberId}/messages`, payload);
            });
            return res.data?.messages?.[0]?.id || '';
        }
        catch (e) {
            this.logger.error(`sendTemplate failed: ${e.response?.data?.error?.message || e.message}`);
            throw new common_1.InternalServerErrorException(e.response?.data?.error?.message || 'Failed to send template');
        }
    }
    async sendMedia(hotelId, phoneNumberId, to, type, link, caption, filename) {
        const mediaPayload = { link };
        if (caption)
            mediaPayload.caption = caption;
        if (filename)
            mediaPayload.filename = filename;
        try {
            const res = await this.requestWithFallback(hotelId, (client) => client.post(`/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                to,
                type,
                [type]: mediaPayload,
            }));
            return res.data?.messages?.[0]?.id || '';
        }
        catch (e) {
            throw new common_1.InternalServerErrorException(e.response?.data?.error?.message || 'Media send failed');
        }
    }
    async markRead(hotelId, phoneNumberId, waMessageId) {
        const client = await this.buildClient(hotelId);
        try {
            await client.post(`/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: waMessageId,
            });
        }
        catch (e) {
            this.logger.warn(`markRead failed: ${e.message}`);
        }
    }
    async fetchTemplatesFromMeta(hotelId, wabaId) {
        const client = await this.buildClient(hotelId);
        try {
            const res = await client.get(`/${wabaId}/message_templates`, {
                params: { limit: 100, fields: 'id,name,category,language,status,components,quality_score,rejected_reason' },
            });
            return res.data?.data || [];
        }
        catch (e) {
            this.logger.error(`fetchTemplates failed: ${e.message}`);
            return [];
        }
    }
    async createTemplateOnMeta(hotelId, wabaId, payload) {
        const client = await this.buildClient(hotelId);
        const res = await client.post(`/${wabaId}/message_templates`, payload);
        return res.data;
    }
    async deleteTemplateOnMeta(hotelId, wabaId, name) {
        const client = await this.buildClient(hotelId);
        await client.delete(`/${wabaId}/message_templates`, { params: { name } });
    }
    async storeToken(hotelId, token, expiresAt) {
        const encrypted = this.encryptToken(token);
        const hash = CryptoJS.SHA256(token).toString();
        const refreshAt = expiresAt ? new Date(expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000) : undefined;
        await this.prisma.tokenStorage.updateMany({
            where: { hotelId, isActive: true, tokenType: 'ACCESS' },
            data: { isActive: false },
        });
        return this.prisma.tokenStorage.create({
            data: {
                id: (0, uuid_1.v4)(),
                hotelId,
                tokenType: 'ACCESS',
                tokenValue: encrypted,
                tokenHash: hash,
                expiresAt,
                refreshAt,
                isActive: true,
            },
        });
    }
    async validateToken(token) {
        if (!token || token.trim().length < 10) {
            throw new Error('Token is empty or too short');
        }
        await axios_1.default.get(`${this.graphBase}/${this.apiVersion}/me`, {
            params: { access_token: token },
            timeout: 10000,
        });
    }
    async refreshToken(token) {
        const appId = this.config.get('WA_APP_ID') || this.config.get('META_APP_ID');
        const appSecret = this.config.get('WA_APP_SECRET') || this.config.get('META_APP_SECRET');
        if (!appId || !appSecret) {
            throw new Error('WA_APP_ID and WA_APP_SECRET are required to refresh tokens');
        }
        const res = await axios_1.default.get(`${this.graphBase}/${this.apiVersion}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: token,
            },
            timeout: 15000,
        });
        return res.data;
    }
    async debugToken(hotelId, token) {
        const client = await this.buildClient(hotelId);
        const res = await client.get('/debug_token', { params: { input_token: token } });
        return res.data?.data || {};
    }
    buildTemplateComponents(variables, bodyText) {
        if (!variables.length)
            return [];
        return [{
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: v })),
            }];
    }
    validatePhone(phone) {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleaned.startsWith('+'))
            return `+${cleaned}`;
        return cleaned;
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService, prisma_service_1.PrismaService])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map