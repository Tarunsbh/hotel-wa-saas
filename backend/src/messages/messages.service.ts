import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { toE164, isValidE164, stripPlus } from '../common/utils/phone.util';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  private async getConversationWithGuest(hotelId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, hotelId },
      include: {
        guest: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  private async getPhoneNumberId(hotelId: string): Promise<string> {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { phoneNumberId: true },
    });

    if (!hotel?.phoneNumberId) {
      throw new BadRequestException('Hotel has no WhatsApp Phone Number ID configured');
    }

    return hotel.phoneNumberId;
  }

  async findByConversation(
    hotelId: string,
    conversationId: string,
    query: { page?: number; limit?: number },
  ) {
    const page  = Math.max(1,  Number(query.page)  || 1);
    const limit = Math.max(1,  Number(query.limit) || 50);

    await this.getConversationWithGuest(hotelId, conversationId);

    const total = await this.prisma.message.count({ where: { conversationId } });

    // For page 1, get the most recent `limit` messages (sorted asc for display)
    const skip = Math.max(0, total - (page * limit));
    const take = Math.min(limit, total - (page - 1) * limit);

    const data = await this.prisma.message.findMany({
      where: { conversationId },
      skip,
      take: take > 0 ? take : limit,
      orderBy: { createdAt: 'asc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendText(
    hotelId: string,
    userId: string,
    conversationId: string,
    body: string,
  ) {
    const conversation = await this.getConversationWithGuest(hotelId, conversationId);
    const phoneNumberId = await this.getPhoneNumberId(hotelId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        hotelId,
        direction: 'OUTBOUND',
        type: 'TEXT',
        body,
        status: 'PENDING',
        senderId: userId,
      },
    });

    try {
      const result = await this.whatsappService.sendText(
        hotelId,
        phoneNumberId,
        conversation.guest.phone,
        body,
      );

      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          waMessageId: result || null,
          sentAt: new Date(),
        },
      });

      await this.updateConversationLastMessage(conversationId, message.id);

      return this.prisma.message.findUnique({ where: { id: message.id } });
    } catch (e) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: e.message },
      });
      throw e;
    }
  }

  async sendTemplate(
    hotelId: string,
    userId: string,
    conversationId: string,
    templateId: string,
    variableValues: Record<string, string>,
  ) {
    const conversation = await this.getConversationWithGuest(hotelId, conversationId);
    const phoneNumberId = await this.getPhoneNumberId(hotelId);

    const template = await this.prisma.template.findFirst({
      where: { id: templateId, hotelId, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    if (template.status !== 'APPROVED') {
      throw new BadRequestException('Template is not approved for sending');
    }

    const mergedVariableValues = await this.resolveTemplateVariableValues(
      hotelId,
      conversation.guest,
      template,
      variableValues,
    );

    const components = this.buildTemplateComponents(template, mergedVariableValues);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        hotelId,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        body: template.bodyText || template.name,
        templateId,
        status: 'PENDING',
        senderId: userId,
        metadata: { variableValues: mergedVariableValues } as any,
      },
    });

    try {
      const result = await this.whatsappService.sendTemplate(
        hotelId,
        phoneNumberId,
        conversation.guest.phone,
        template.name,
        template.language,
        components,
      );

      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          waMessageId: result || null,
          sentAt: new Date(),
        },
      });

      await this.updateConversationLastMessage(conversationId, message.id);

      return this.prisma.message.findUnique({ where: { id: message.id } });
    } catch (e) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: e.message },
      });
      throw e;
    }
  }

  async sendMedia(
    hotelId: string,
    userId: string,
    conversationId: string,
    type: string,
    link: string,
    caption?: string,
  ) {
    const validTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'];
    if (!validTypes.includes(type.toUpperCase())) {
      throw new BadRequestException(
        `Invalid media type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    const conversation = await this.getConversationWithGuest(hotelId, conversationId);
    const phoneNumberId = await this.getPhoneNumberId(hotelId);
    const mediaType = type.toLowerCase() as 'image' | 'document' | 'audio' | 'video';

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        hotelId,
        direction: 'OUTBOUND',
        type: type.toUpperCase() as any,
        body: caption || '',
        mediaUrl: link,
        status: 'PENDING',
        senderId: userId,
      },
    });

    try {
      const result = await this.whatsappService.sendMedia(
        hotelId,
        phoneNumberId,
        conversation.guest.phone,
        mediaType,
        link,
        caption,
      );

      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          waMessageId: result || null,
          sentAt: new Date(),
        },
      });

      await this.updateConversationLastMessage(conversationId, message.id);

      return this.prisma.message.findUnique({ where: { id: message.id } });
    } catch (e) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: e.message },
      });
      throw e;
    }
  }

  // ── Send to any phone number (auto creates guest + conversation) ─────────
  async sendToNumber(
    hotelId: string,
    userId: string,
    phone: string,
    body: string,
  ) {
    // Normalize phone to E.164 using shared utility
    const normalizedPhone = toE164(phone);
    if (!isValidE164(normalizedPhone)) {
      throw new BadRequestException(
        'Phone must be in E.164 format (e.g. +971501234567)',
      );
    }

    const withoutPlus = stripPlus(normalizedPhone);
    const phoneNumberId = await this.getPhoneNumberId(hotelId);

    // Find guest — search both +919... and 919... to avoid duplicates
    let guest = await this.prisma.guest.findFirst({
      where: {
        hotelId,
        deletedAt: null,
        OR: [{ phone: normalizedPhone }, { phone: withoutPlus }],
      },
    });
    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          hotelId,
          phone: normalizedPhone,
          name: normalizedPhone, // default name = phone number
          optIn: true,
        },
      });
    } else if (guest.phone !== normalizedPhone) {
      // Normalize legacy record stored without `+`
      await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: normalizedPhone } });
      guest.phone = normalizedPhone;
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { hotelId, guestId: guest.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          hotelId,
          guestId: guest.id,
          status: 'OPEN',
          channel: 'WHATSAPP',
          unreadCount: 0,
        },
      });
    }

    // Save message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        hotelId,
        direction: 'OUTBOUND',
        type: 'TEXT',
        body,
        status: 'PENDING',
        senderId: userId,
      },
    });

    try {
      const result = await this.whatsappService.sendText(
        hotelId,
        phoneNumberId,
        normalizedPhone,
        body,
      );

      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'SENT', waMessageId: result || null, sentAt: new Date() },
      });

      await this.updateConversationLastMessage(conversation.id, message.id);

      return {
        conversation: { ...conversation, guest },
        message: await this.prisma.message.findUnique({ where: { id: message.id } }),
      };
    } catch (e) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', errorMessage: e.message },
      });
      throw e;
    }
  }

  private async findOrCreateGuestConversation(hotelId: string, phone: string) {
    const normalizedPhone = toE164(phone);
    if (!isValidE164(normalizedPhone)) {
      throw new BadRequestException(
        'Phone must be in E.164 format (e.g. +971501234567)',
      );
    }

    const withoutPlus = stripPlus(normalizedPhone);

    let guest = await this.prisma.guest.findFirst({
      where: {
        hotelId,
        deletedAt: null,
        OR: [{ phone: normalizedPhone }, { phone: withoutPlus }],
      },
    });

    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          hotelId,
          phone: normalizedPhone,
          name: normalizedPhone,
          optIn: true,
        },
      });
    } else if (guest.phone !== normalizedPhone) {
      await this.prisma.guest.update({ where: { id: guest.id }, data: { phone: normalizedPhone } });
      guest.phone = normalizedPhone;
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { hotelId, guestId: guest.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          hotelId,
          guestId: guest.id,
          status: 'OPEN',
          channel: 'WHATSAPP',
          unreadCount: 0,
        },
      });
    }

    return { guest, conversation };
  }

  async sendTemplateToNumber(
    hotelId: string,
    userId: string,
    phone: string,
    templateId: string,
    variableValues: Record<string, string>,
  ) {
    const { conversation, guest } = await this.findOrCreateGuestConversation(hotelId, phone);
    const message = await this.sendTemplate(
      hotelId,
      userId,
      conversation.id,
      templateId,
      variableValues,
    );

    return {
      conversation: { ...conversation, guest },
      message,
    };
  }

  private async updateConversationLastMessage(
    conversationId: string,
    messageId: string,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { body: true, type: true, createdAt: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: message?.body || '',
        lastMessageAt: message?.createdAt || new Date(),
        lastMessageType: message?.type || 'TEXT',
        updatedAt: new Date(),
      },
    });
  }

  private async resolveTemplateVariableValues(
    hotelId: string,
    guest: { name?: string },
    template: any,
    variableValues: Record<string, string>,
  ): Promise<Record<string, string>> {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, settings: true },
    });

    const settings = (hotel?.settings || {}) as Record<string, any>;
    const defaults: Record<string, string> = {
      '1': guest?.name || '',
      '2': hotel?.name || '',
      '3': String(settings.address || settings.website || ''),
      '4': String(settings.direction || ''),
    };

    if (!this.shouldAutoFillAddressForTemplate(template)) {
      delete defaults['3'];
    }

    const merged = { ...defaults, ...(variableValues || {}) };
    return Object.fromEntries(
      Object.entries(merged).filter(([, value]) => String(value || '').trim() !== ''),
    );
  }

  private shouldAutoFillAddressForTemplate(template: any): boolean {
    const text = [template?.headerText, template?.bodyText, template?.footerText]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!/{{\s*3\s*}}/.test(text)) {
      return false;
    }

    const addressKeywords = /(address|location|street|road|drive|lane|avenue|boulevard|map|website|site|hotel|direction|directions)/;
    const nonAddressKeywords = /(review|feedback|link|share|rate|survey|google|click)/;
    const regex = /{{\s*3\s*}}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end);

      if (nonAddressKeywords.test(context)) {
        return false;
      }
      if (addressKeywords.test(context)) {
        return true;
      }
    }

    return false;
  }

  private buildTemplateComponents(
    template: any,
    variableValues: Record<string, string>,
  ): any[] {
    const values = variableValues || {};
    const components: any[] = [];

    if (Array.isArray(template?.components) && template.components.length > 0) {
      for (const comp of template.components) {
        if (!comp?.type || !['HEADER', 'BODY', 'FOOTER'].includes(comp.type)) {
          continue;
        }

        const text = String(comp.text || '');
        const matches = [...text.matchAll(/{{\s*(\d+)\s*}}/g)];
        if (!matches.length) {
          continue;
        }

        const parameters = matches.map((match) => {
          const key = match[1];
          const value = values[key];
          if (value === undefined || value === null || String(value).trim() === '') {
            throw new BadRequestException(`Missing value for template variable {{${key}}}`);
          }
          return { type: 'text', text: String(value) };
        });

        components.push({ type: comp.type.toLowerCase(), parameters });
      }

      return components;
    }

    const variableKeys = Object.keys(values).filter((key) => values[key] != null);
    if (variableKeys.length === 0) {
      return [];
    }

    const bodyParams = variableKeys
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((key) => {
        const value = values[key];
        if (value === undefined || value === null || String(value).trim() === '') {
          throw new BadRequestException(`Missing value for template variable {{${key}}}`);
        }
        return { type: 'text', text: String(value) };
      });

    return bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];
  }
}
