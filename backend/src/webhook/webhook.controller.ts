import {
  Controller, Get, Post, Query, Body, Res,
  Headers, HttpCode, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { WebhookService } from './webhook.service';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger('WebhookController');

  constructor(private readonly webhookService: WebhookService) {}

  // ── GET /api/v1/webhook — Meta verification handshake ────────────────────
  @Get()
  @ApiExcludeEndpoint()
  verify(
    @Query('hub.mode')         mode:      string,
    @Query('hub.verify_token') token:     string,
    @Query('hub.challenge')    challenge: string,
    @Res() res: Response,
  ) {
    this.logger.log(`🔐 Verification request: mode=${mode} token=${token}`);

    if (mode === 'subscribe' && this.webhookService.verifyToken(token)) {
      this.logger.log('✅ Webhook verified — returning challenge');
      return res.status(200).send(challenge);
    }

    this.logger.warn(`❌ Verification FAILED — mode=${mode} token=${token}`);
    return res.status(403).send('Forbidden');
  }

  // ── POST /api/v1/webhook — Incoming events from Meta ─────────────────────
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive WhatsApp events from Meta' })
  async receive(
    @Body()    body:    any,
    @Headers() headers: any,
  ) {
    this.logger.log(`📥 POST /webhook hit — object=${body?.object} entries=${body?.entry?.length || 0}`);

    // Always respond 200 immediately (Meta requires < 20s response)
    // Process the event asynchronously so we never timeout
    this.webhookService.processEvent(body).catch((err) => {
      this.logger.error(`❌ processEvent threw: ${err.message}`, err.stack);
    });

    return 'EVENT_RECEIVED';
  }

  // ── GET /api/v1/webhook/debug — Check configuration ──────────────────────
  @Get('debug')
  @ApiOperation({ summary: 'Debug: show webhook config + hotel phoneNumberId values' })
  async debug() {
    this.logger.log('🔍 Debug endpoint called');
    return this.webhookService.getDebugInfo();
  }
}
