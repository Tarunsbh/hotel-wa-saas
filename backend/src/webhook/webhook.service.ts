/**
 * WebhookService — handles all incoming WhatsApp Cloud API events.
 *
 * Flow: Meta → POST /api/v1/webhook → processEvent()
 *         → handleIncomingMessage()  → save to DB → emit socket
 *         → handleStatusUpdate()     → update DB → emit socket
 *
 * Phone normalization:
 *   Meta sends `from` WITHOUT `+` (e.g. "919555009712").
 *   We always store guests in E.164 WITH `+` (e.g. "+919555009712").
 *   Guest lookup searches both forms to prevent duplicate guests.
 *
 * Resilience:
 *   If no hotel matches phoneNumberId, fall back to first active hotel
 *   and auto-update its phoneNumberId so future messages route correctly.
 *
 * Deduplication:
 *   If a waMessageId already exists in the DB the event is silently dropped.
 *   If duplicate guests exist for the same normalized phone, the older record
 *   is merged into the newer one (conversations + messages reassigned).
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { toE164, stripPlus } from '../common/utils/phone.util';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('Webhook');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ── Token verification ────────────────────────────────────────────────────
  verifyToken(token: string): boolean {
    const expected = this.config.get('WEBHOOK_VERIFY_TOKEN') || 'apple';
    const ok = token === expected;
    this.logger.log(`🔐 Token check: received="${token}" expected="${expected}" → ${ok ? '✅' : '❌'}`);
    return ok;
  }

  // ── Main entry point ──────────────────────────────────────────────────────
  async processEvent(body: any): Promise<void> {
    this.logger.log('─────────────────────────────────────────────');
    this.logger.log('📥 WEBHOOK EVENT RECEIVED');
    this.logger.log(`📋 object="${body?.object}"`);
    this.logger.log(`📋 entries=${body?.entry?.length || 0}`);
    this.logger.debug(`📋 RAW BODY: ${JSON.stringify(body)}`);

    if (body?.object !== 'whatsapp_business_account') {
      this.logger.warn(`⚠️  Ignoring — object is "${body?.object}", expected "whatsapp_business_account"`);
      return;
    }

    for (const entry of body.entry || []) {
      this.logger.log(`🔄 Processing entry id=${entry.id}`);

      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) {
          this.logger.warn('⚠️  change.value is empty — skipping');
          continue;
        }

        const phoneNumberId = value.metadata?.phone_number_id;
        const displayPhone  = value.metadata?.display_phone_number;
        this.logger.log(`📞 phone_number_id="${phoneNumberId}" display="${displayPhone}"`);

        const msgCount    = value.messages?.length  || 0;
        const statusCount = value.statuses?.length  || 0;
        this.logger.log(`📊 messages=${msgCount} statuses=${statusCount}`);

        // ── Process inbound messages
        for (const msg of value.messages || []) {
          this.logger.log(`💬 Inbound msg id=${msg.id} from=${msg.from} type=${msg.type}`);
          try {
            await this.handleIncomingMessage(msg, value.metadata);
          } catch (e) {
            this.logger.error(`❌ handleIncomingMessage FAILED: ${e.message}`, e.stack);
          }
        }

        // ── Process delivery/read statuses
        for (const status of value.statuses || []) {
          this.logger.log(`📊 Status update: id=${status.id} status=${status.status} recipient=${status.recipient_id}`);
          try {
            await this.handleStatusUpdate(status);
          } catch (e) {
            this.logger.error(`❌ handleStatusUpdate FAILED: ${e.message}`);
          }
        }
      }
    }

    this.logger.log('✅ WEBHOOK EVENT PROCESSING COMPLETE');
    this.logger.log('─────────────────────────────────────────────');
  }

  // ── Handle inbound message ────────────────────────────────────────────────
  private async handleIncomingMessage(msg: any, metadata: any): Promise<void> {
    const phoneNumberId = metadata?.phone_number_id;
    const waMessageId   = msg.id;
    const timestamp     = new Date(parseInt(msg.timestamp, 10) * 1000);

    // Normalize sender phone to E.164 — Meta omits the `+`
    const rawFrom = String(msg.from || '').trim();
    const from    = toE164(rawFrom);   // "+919555009712"

    this.logger.log(`🔍 Phone normalize: raw="${rawFrom}" → e164="${from}"`);
    this.logger.log(`🔍 Looking up hotel for phoneNumberId="${phoneNumberId}"`);

    // ── Hotel lookup with fallback ────────────────────────────────────────
    let hotel = await this.prisma.hotel.findFirst({
      where: { phoneNumberId, deletedAt: null },
    });

    if (!hotel) {
      this.logger.warn(`⚠️  No hotel matched phoneNumberId="${phoneNumberId}" — trying fallback`);

      hotel = await this.prisma.hotel.findFirst({
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!hotel) {
        this.logger.error('❌ No active hotel found at all — cannot process message');
        return;
      }

      this.logger.warn(`⚠️  Using fallback hotel "${hotel.name}" (id=${hotel.id})`);
      this.logger.warn(`⚠️  Auto-updating hotel phoneNumberId to "${phoneNumberId}"`);

      await this.prisma.hotel.update({
        where: { id: hotel.id },
        data:  { phoneNumberId },
      });
      hotel.phoneNumberId = phoneNumberId;
    }

    this.logger.log(`🏨 Hotel: "${hotel.name}" (id=${hotel.id})`);

    // ── Dedup check — drop duplicate webhook deliveries ───────────────────
    const existing = await this.prisma.message.findUnique({ where: { waMessageId } });
    if (existing) {
      this.logger.log(`⚡ Duplicate — waMessageId="${waMessageId}" already stored, skipping`);
      return;
    }

    // ── Guest lookup + deduplication ──────────────────────────────────────
    // Search by both forms (+919... and 919...) to catch legacy records
    const withPlus    = from;               // "+919555009712"
    const withoutPlus = stripPlus(from);    // "919555009712"

    const matchingGuests = await this.prisma.guest.findMany({
      where: {
        hotelId:   hotel.id,
        deletedAt: null,
        OR: [
          { phone: withPlus    },
          { phone: withoutPlus },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    this.logger.log(`👤 Found ${matchingGuests.length} matching guest(s) for phone="${from}"`);

    let guest: any;

    if (matchingGuests.length === 0) {
      // No guest — create fresh
      const guestName = msg.profile?.name || from;
      guest = await this.prisma.guest.create({
        data: {
          id:      uuidv4(),
          hotelId: hotel.id,
          phone:   withPlus,
          name:    guestName,
          source:  'API',
          optIn:   true,
          optInAt: timestamp,
        },
      });
      this.logger.log(`👤 Guest created: id=${guest.id} name="${guest.name}"`);

    } else if (matchingGuests.length === 1) {
      guest = matchingGuests[0];
      this.logger.log(`👤 Guest found: id=${guest.id} name="${guest.name}" phone="${guest.phone}"`);

      // Normalize phone to E.164 if it was stored without `+`
      if (guest.phone !== withPlus) {
        this.logger.log(`👤 Normalizing guest phone "${guest.phone}" → "${withPlus}"`);
        await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: withPlus } });
        guest.phone = withPlus;
      }

    } else {
      // Multiple guests for same number — merge duplicates into canonical (first created)
      guest = matchingGuests[0]; // oldest = canonical
      this.logger.warn(`⚠️  ${matchingGuests.length} duplicate guests for "${from}" — merging into id=${guest.id}`);

      for (const dup of matchingGuests.slice(1)) {
        this.logger.warn(`⚠️  Merging duplicate guest id=${dup.id} into id=${guest.id}`);

        // Reassign conversations from duplicate to canonical
        await this.prisma.conversation.updateMany({
          where: { guestId: dup.id },
          data:  { guestId: guest.id },
        }).catch((e) => this.logger.warn(`  ⚠️  Conversation reassign skipped: ${e.message}`));

        // Reassign messages
        await this.prisma.message.updateMany({
          where: { conversationId: { in: (await this.prisma.conversation.findMany({
            where: { guestId: dup.id },
            select: { id: true },
          })).map(c => c.id) } },
          data: {},
        }).catch(() => {});

        // Soft-delete the duplicate guest
        await this.prisma.guest.update({
          where: { id: dup.id },
          data:  { deletedAt: new Date() },
        }).catch((e) => this.logger.warn(`  ⚠️  Guest soft-delete skipped: ${e.message}`));
      }

      // Normalize canonical phone to E.164
      if (guest.phone !== withPlus) {
        await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: withPlus } });
        guest.phone = withPlus;
      }
    }

    // ── Parse message content ──────────────────────────────────────────────
    const parsed = this.parseMessage(msg);
    this.logger.log(`💬 Parsed: type=${parsed.type} body="${parsed.body?.substring(0, 80)}"`);

    // ── Conversation — find or create (one per guest per hotel) ───────────
    this.logger.log(`💬 Looking up conversation for guestId=${guest.id} hotelId=${hotel.id}`);

    let conv = await this.prisma.conversation.findFirst({
      where: {
        guestId:   guest.id,
        hotelId:   hotel.id,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conv) {
      this.logger.log(`💬 No conversation — creating new one`);
      try {
        conv = await this.prisma.conversation.create({
          data: {
            id:              uuidv4(),
            hotelId:         hotel.id,
            guestId:         guest.id,
            status:          'OPEN',
            channel:         'WHATSAPP',
            lastMessage:     parsed.body,
            lastMessageAt:   timestamp,
            lastMessageType: parsed.type,
            unreadCount:     1,
          },
        });
        this.logger.log(`💬 Conversation created: id=${conv.id}`);
      } catch (e) {
        // Race condition — another request created the conversation; re-fetch
        this.logger.warn(`⚠️  Conversation create race — re-fetching: ${e.message}`);
        conv = await this.prisma.conversation.findFirst({
          where: { guestId: guest.id, hotelId: hotel.id, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
        if (!conv) throw e;
      }
    } else {
      this.logger.log(`💬 Conversation found: id=${conv.id} status=${conv.status}`);
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data:  {
          lastMessage:     parsed.body,
          lastMessageAt:   timestamp,
          lastMessageType: parsed.type,
          unreadCount:     { increment: 1 },
          status:          'OPEN',
          updatedAt:       new Date(),
        },
      });
    }

    // ── Save message ──────────────────────────────────────────────────────
    this.logger.log(`💾 Saving message to DB...`);

    const savedMessage = await this.prisma.message.create({
      data: {
        id:              uuidv4(),
        conversationId:  conv.id,
        hotelId:         hotel.id,
        waMessageId,
        direction:       'INBOUND',
        type:            this.normalizeType(parsed.type),
        body:            parsed.body,
        mediaId:         parsed.mediaId,
        mediaMimeType:   parsed.mimeType,
        mediaFilename:   parsed.filename,
        mediaCaption:    parsed.caption,
        status:          'DELIVERED',
        deliveredAt:     timestamp,
        sentAt:          timestamp,
        metadata:        msg,
      },
    });

    this.logger.log(`💾 Message saved: id=${savedMessage.id}`);

    // ── Emit Socket.IO events ──────────────────────────────────────────────
    this.logger.log(`📡 Emitting new_message to hotel:${hotel.id}`);

    this.eventsGateway.emitNewMessage(hotel.id, {
      conversationId: conv.id,
      message:        savedMessage,
      guest:          { id: guest.id, name: guest.name, phone: guest.phone },
    });

    this.eventsGateway.emitConversationUpdate(hotel.id, {
      conversationId:  conv.id,
      lastMessage:     parsed.body,
      lastMessageAt:   timestamp,
      unreadCount:     (conv.unreadCount || 0) + 1,
    });

    this.logger.log(`📡 Socket events emitted`);

    // ── Audit log ─────────────────────────────────────────────────────────
    await this.log(hotel.id, 'MESSAGE', 'INFO', `Inbound ${parsed.type} from ${from}`);
    this.logger.log(`✅ Inbound [${parsed.type}] from ${from} → hotel "${hotel.name}" conv=${conv.id}`);
  }

  // ── Handle status update ──────────────────────────────────────────────────
  private async handleStatusUpdate(status: any): Promise<void> {
    const { id: waMessageId, status: newStatus, timestamp, errors } = status;
    if (!waMessageId || !newStatus) return;

    const ts: Date = new Date(parseInt(timestamp, 10) * 1000);

    const update: any = { status: newStatus.toUpperCase() };
    if (newStatus === 'sent')      update.sentAt      = ts;
    if (newStatus === 'delivered') update.deliveredAt = ts;
    if (newStatus === 'read')      update.readAt      = ts;
    if (newStatus === 'failed') {
      update.failedAt     = ts;
      update.errorCode    = String(errors?.[0]?.code    || '');
      update.errorMessage = errors?.[0]?.message || '';
    }

    const msg = await this.prisma.message.findUnique({ where: { waMessageId } });
    if (!msg) {
      this.logger.warn(`⚠️  Status update for unknown waMessageId="${waMessageId}"`);
      return;
    }

    await this.prisma.message.update({ where: { waMessageId }, data: update });
    this.logger.log(`📊 Status updated: waMessageId="${waMessageId}" → ${newStatus.toUpperCase()}`);

    this.eventsGateway.emitStatusUpdate(msg.hotelId, {
      waMessageId,
      messageId:      msg.id,
      status:         newStatus.toUpperCase(),
      conversationId: msg.conversationId,
    });

    // Update campaign stats if this was a campaign message
    if (msg.campaignId) {
      const countField = `${newStatus}Count`;
      if (['sent', 'delivered', 'read', 'failed'].includes(newStatus)) {
        await this.prisma.campaign.update({
          where: { id: msg.campaignId },
          data:  { [countField]: { increment: 1 } },
        }).catch(() => {});
      }
      await this.prisma.campaignRecipient.updateMany({
        where: { waMessageId, campaignId: msg.campaignId },
        data:  update,
      }).catch(() => {});
    }
  }

  // ── Parse message content by type ─────────────────────────────────────────
  private parseMessage(msg: any): {
    type: string; body: string;
    mediaId?: string; mimeType?: string; filename?: string; caption?: string;
  } {
    const type = (msg.type || 'unknown').toLowerCase();
    switch (type) {
      case 'text':
        return { type: 'TEXT', body: msg.text?.body || '' };
      case 'image':
        return { type: 'IMAGE', body: msg.image?.caption || '',
          mediaId: msg.image?.id, mimeType: msg.image?.mime_type };
      case 'document':
        return { type: 'DOCUMENT', body: msg.document?.caption || '',
          mediaId: msg.document?.id, mimeType: msg.document?.mime_type,
          filename: msg.document?.filename };
      case 'audio':
        return { type: 'AUDIO', body: '[Voice message]',
          mediaId: msg.audio?.id, mimeType: msg.audio?.mime_type };
      case 'video':
        return { type: 'VIDEO', body: msg.video?.caption || '',
          mediaId: msg.video?.id, mimeType: msg.video?.mime_type };
      case 'sticker':
        return { type: 'STICKER', body: '[Sticker]', mediaId: msg.sticker?.id };
      case 'location':
        return { type: 'LOCATION',
          body: `📍 ${msg.location?.name || `${msg.location?.latitude}, ${msg.location?.longitude}`}` };
      case 'reaction':
        return { type: 'REACTION', body: msg.reaction?.emoji || '👍' };
      case 'interactive':
        return { type: 'INTERACTIVE',
          body: msg.interactive?.button_reply?.title
             || msg.interactive?.list_reply?.title
             || '[Interactive response]' };
      case 'button':
        return { type: 'BUTTON', body: msg.button?.text || '[Button]' };
      case 'order':
        return { type: 'ORDER', body: '[Order]' };
      default:
        return { type: 'TEXT', body: `[${type}]` };
    }
  }

  // Map parsed type string to Prisma MessageType enum value
  private normalizeType(type: string): any {
    const map: Record<string, string> = {
      TEXT: 'TEXT', IMAGE: 'IMAGE', DOCUMENT: 'DOCUMENT', AUDIO: 'AUDIO',
      VIDEO: 'VIDEO', STICKER: 'STICKER', LOCATION: 'LOCATION',
      REACTION: 'REACTION', INTERACTIVE: 'INTERACTIVE', BUTTON: 'TEXT',
      ORDER: 'TEXT',
    };
    return map[type?.toUpperCase()] || 'TEXT';
  }

  // ── Audit log helper ──────────────────────────────────────────────────────
  private async log(hotelId: string, type: any, level: any, message: string): Promise<void> {
    await this.prisma.log.create({ data: { hotelId, type, level, message } }).catch(() => {});
  }

  // ── Debug info (called by controller debug endpoint) ──────────────────────
  async getDebugInfo() {
    const hotels = await this.prisma.hotel.findMany({
      where:  { deletedAt: null },
      select: { id: true, name: true, phoneNumberId: true, isActive: true, wabaId: true },
    });
    return {
      configured_verify_token: this.config.get('WEBHOOK_VERIFY_TOKEN') || 'apple',
      env_phone_number_id:     this.config.get('WA_PHONE_NUMBER_ID') || '(NOT SET)',
      hotels,
      timestamp: new Date().toISOString(),
    };
  }
}
