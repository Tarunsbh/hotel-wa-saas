import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly graphBase: string;
  private readonly apiVersion: string;
  private readonly encryptionKey: string;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.graphBase    = config.get('WA_API_BASE') || 'https://graph.facebook.com';
    this.apiVersion   = config.get('WA_API_VERSION') || 'v18.0';
    this.encryptionKey = config.get('TOKEN_ENCRYPTION_KEY') || 'default_key_change_in_production';
  }

  // ── Token Encryption ──────────────────────────────────────
  encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
  }

  decryptToken(encrypted: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // ── Get active token for a hotel ─────────────────────────
  async getActiveToken(hotelId: string): Promise<{ token: string; source: 'db' | 'env'; tokenId?: string }> {
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

    // Fall back to env token
    return { token: this.config.get('WA_ACCESS_TOKEN') || '', source: 'env' };
  }

  private buildClientWithToken(token: string): AxiosInstance {
    return axios.create({
      baseURL: `${this.graphBase}/${this.apiVersion}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  }

  private async buildClient(hotelId: string): Promise<AxiosInstance> {
    const tokenInfo = await this.getActiveToken(hotelId);
    return this.buildClientWithToken(tokenInfo.token);
  }

  private isAuthError(e: any): boolean {
    const status = e.response?.status;
    const msg = String(e.response?.data?.error?.message || e.message || '').toLowerCase();
    return (
      status === 401 ||
      status === 403 ||
      msg.includes('authentication') ||
      msg.includes('auth') ||
      msg.includes('invalid access token')
    );
  }

  private async requestWithFallback<T>(
    hotelId: string,
    requestFn: (client: AxiosInstance) => Promise<T>,
  ): Promise<T> {
    const tokenInfo = await this.getActiveToken(hotelId);
    const client = this.buildClientWithToken(tokenInfo.token);

    try {
      return await requestFn(client);
    } catch (e) {
      if (tokenInfo.source === 'db' && this.isAuthError(e)) {
        this.logger.warn(
          `Stored WA token invalid for hotel ${hotelId}; falling back to env token`,
        );
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

  // ── Send Text Message ─────────────────────────────────────
  async sendText(hotelId: string, phoneNumberId: string, to: string, body: string): Promise<string> {
    try {
      const res = await this.requestWithFallback(hotelId, (client) =>
        client.post(`/${phoneNumberId}/messages`, {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body, preview_url: false },
        }),
      );
      return res.data?.messages?.[0]?.id || '';
    } catch (e) {
      this.logger.error(`sendText failed: ${e.response?.data?.error?.message || e.message}`);
      throw new InternalServerErrorException(e.response?.data?.error?.message || 'Failed to send message');
    }
  }

  // ── Send Template Message ─────────────────────────────────
  async sendTemplate(hotelId: string, phoneNumberId: string, to: string, templateName: string, languageCode: string, components?: any[]): Promise<string> {
    try {
      const res = await this.requestWithFallback(hotelId, (client) => {
        const payload: any = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: templateName, language: { code: languageCode } },
        };
        if (components?.length) payload.template.components = components;
        return client.post(`/${phoneNumberId}/messages`, payload);
      });
      return res.data?.messages?.[0]?.id || '';
    } catch (e) {
      this.logger.error(`sendTemplate failed: ${e.response?.data?.error?.message || e.message}`);
      throw new InternalServerErrorException(e.response?.data?.error?.message || 'Failed to send template');
    }
  }

  // ── Send Media Message ────────────────────────────────────
  async sendMedia(hotelId: string, phoneNumberId: string, to: string, type: 'image'|'document'|'audio'|'video', link: string, caption?: string, filename?: string): Promise<string> {
    const mediaPayload: any = { link };
    if (caption) mediaPayload.caption = caption;
    if (filename) mediaPayload.filename = filename;
    try {
      const res = await this.requestWithFallback(hotelId, (client) =>
        client.post(`/${phoneNumberId}/messages`, {
          messaging_product: 'whatsapp',
          to,
          type,
          [type]: mediaPayload,
        }),
      );
      return res.data?.messages?.[0]?.id || '';
    } catch (e) {
      throw new InternalServerErrorException(e.response?.data?.error?.message || 'Media send failed');
    }
  }

  // ── Mark Message as Read ──────────────────────────────────
  async markRead(hotelId: string, phoneNumberId: string, waMessageId: string) {
    const client = await this.buildClient(hotelId);
    try {
      await client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: waMessageId,
      });
    } catch (e) {
      this.logger.warn(`markRead failed: ${e.message}`);
    }
  }

  // ── Fetch Templates from Meta ─────────────────────────────
  async fetchTemplatesFromMeta(hotelId: string, wabaId: string): Promise<any[]> {
    const client = await this.buildClient(hotelId);
    try {
      const res = await client.get(`/${wabaId}/message_templates`, {
        params: { limit: 100, fields: 'id,name,category,language,status,components,quality_score,rejected_reason' },
      });
      return res.data?.data || [];
    } catch (e) {
      this.logger.error(`fetchTemplates failed: ${e.message}`);
      return [];
    }
  }

  // ── Create Template via Meta API ──────────────────────────
  async createTemplateOnMeta(hotelId: string, wabaId: string, payload: any): Promise<any> {
    const client = await this.buildClient(hotelId);
    const res = await client.post(`/${wabaId}/message_templates`, payload);
    return res.data;
  }

  // ── Delete Template on Meta ───────────────────────────────
  async deleteTemplateOnMeta(hotelId: string, wabaId: string, name: string): Promise<void> {
    const client = await this.buildClient(hotelId);
    await client.delete(`/${wabaId}/message_templates`, { params: { name } });
  }

  // ── Store token securely in DB ────────────────────────────
  async storeToken(hotelId: string, token: string, expiresAt?: Date) {
    const encrypted = this.encryptToken(token);
    const hash = CryptoJS.SHA256(token).toString();
    const refreshAt = expiresAt ? new Date(expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000) : undefined; // 7 days before expiry

    // Deactivate old tokens
    await this.prisma.tokenStorage.updateMany({
      where: { hotelId, isActive: true, tokenType: 'ACCESS' },
      data: { isActive: false },
    });

    return this.prisma.tokenStorage.create({
      data: {
        id: uuidv4(),
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

  // ── Validate a token before storing it ────────────────────
  async validateToken(token: string): Promise<void> {
    if (!token || token.trim().length < 10) {
      throw new Error('Token is empty or too short');
    }

    await axios.get(`${this.graphBase}/${this.apiVersion}/me`, {
      params: { access_token: token },
      timeout: 10000,
    });
  }

  // ── Exchange a token for a long-lived token when app creds exist ───────────
  async refreshToken(token: string): Promise<any> {
    const appId = this.config.get('WA_APP_ID') || this.config.get('META_APP_ID');
    const appSecret =
      this.config.get('WA_APP_SECRET') || this.config.get('META_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('WA_APP_ID and WA_APP_SECRET are required to refresh tokens');
    }

    const res = await axios.get(`${this.graphBase}/${this.apiVersion}/oauth/access_token`, {
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

  // ── Debug token (get expiry info) ─────────────────────────
  async debugToken(hotelId: string, token: string): Promise<any> {
    const client = await this.buildClient(hotelId);
    const res = await client.get('/debug_token', { params: { input_token: token } });
    return res.data?.data || {};
  }

  // ── Build template components from variables ──────────────
  buildTemplateComponents(variables: string[], bodyText: string): any[] {
    if (!variables.length) return [];
    return [{
      type: 'body',
      parameters: variables.map(v => ({ type: 'text', text: v })),
    }];
  }

  // ── Validate phone number (E.164) ─────────────────────────
  validatePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleaned.startsWith('+')) return `+${cleaned}`;
    return cleaned;
  }
}
