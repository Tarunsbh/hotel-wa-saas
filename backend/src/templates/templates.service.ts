import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async findAll(
    hotelId: string,
    query: { status?: string; category?: string; page?: number; limit?: number },
  ) {
    const { status, category } = query;
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = { hotelId, deletedAt: null };

    if (status) where.status = status;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count({ where }),
    ]);

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

  async findOne(hotelId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, hotelId, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async create(hotelId: string, dto: CreateTemplateDto) {
    // Build Meta-format components from form fields if not explicitly provided
    const components = (dto.components && (dto.components as any[]).length > 0)
      ? dto.components
      : this.buildComponentsFromFields({
          headerType: dto.headerType,
          headerText: dto.headerText,
          bodyText:   dto.bodyText || '',
          footerText: dto.footerText,
          buttons:    dto.buttons,
        });

    const template = await this.prisma.template.create({
      data: {
        hotelId,
        name:       dto.name,
        category:   dto.category,
        language:   dto.language,
        status:     'DRAFT',
        components: components as any,
        headerType: dto.headerType,
        headerText: dto.headerText,
        bodyText:   dto.bodyText || '',
        footerText: dto.footerText,
        buttons:    dto.buttons as any,
      },
    });

    if (dto.submitToMeta) {
      try {
        const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });

        if (hotel?.wabaId && hotel.wabaId !== 'CONFIGURE_IN_SETTINGS') {
          const result = await this.whatsappService.createTemplateOnMeta(
            hotelId,
            hotel.wabaId,
            {
              name:       template.name,
              category:   template.category,
              language:   template.language,
              components: template.components,
            },
          );

          await this.prisma.template.update({
            where: { id: template.id },
            data:  { metaTemplateId: result.id, status: 'PENDING', rejectionReason: null },
          });

          return this.findOne(hotelId, template.id);
        }
      } catch (e) {
        const errorMessage = this.getMetaErrorMessage(e);
        await this.prisma.template.update({
          where: { id: template.id },
          data:  { rejectionReason: errorMessage },
        });
        throw new BadRequestException(`Meta submission failed: ${errorMessage}`);
      }
    }

    return template;
  }

  async update(hotelId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(hotelId, id);

    // Rebuild components if form fields changed
    const components = (dto.components && (dto.components as any[]).length > 0)
      ? dto.components
      : this.buildComponentsFromFields({
          headerType: dto.headerType,
          headerText: dto.headerText,
          bodyText:   dto.bodyText,
          footerText: dto.footerText,
          buttons:    dto.buttons,
        });

    return this.prisma.template.update({
      where: { id },
      data: {
        name:       dto.name,
        category:   dto.category,
        language:   dto.language,
        components: components as any,
        headerType: dto.headerType,
        headerText: dto.headerText,
        bodyText:   dto.bodyText,
        footerText: dto.footerText,
        buttons:    dto.buttons as any,
      },
    });
  }

  async softDelete(hotelId: string, id: string) {
    await this.findOne(hotelId, id);
    return this.prisma.template.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
  }

  // ── Sync templates from Meta ──────────────────────────────────────────────
  // wabaId is optional — if not provided we use the hotel's stored wabaId
  async syncFromMeta(hotelId: string, wabaId?: string) {
    // Resolve wabaId — prefer explicit param, fall back to hotel record
    let resolvedWabaId = wabaId;
    if (!resolvedWabaId) {
      const hotel = await this.prisma.hotel.findUnique({
        where:  { id: hotelId },
        select: { wabaId: true },
      });
      resolvedWabaId = hotel?.wabaId;
    }

    if (!resolvedWabaId || resolvedWabaId === 'CONFIGURE_IN_SETTINGS') {
      throw new BadRequestException(
        'WABA ID is not configured. Go to Settings → WhatsApp and save your WABA ID.',
      );
    }

    const metaTemplates =
      await this.whatsappService.fetchTemplatesFromMeta(hotelId, resolvedWabaId);

    let synced = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const mt of metaTemplates) {
      try {
        const existing = await this.prisma.template.findFirst({
          where: { hotelId, metaTemplateId: mt.id },
        });

        const data: any = {
          name:            mt.name,
          category:        mt.category,
          language:        mt.language,
          status:          mt.status,
          components:      mt.components,
          bodyText:        this.extractBodyText(mt.components) || mt.name,
          headerText:      this.extractHeaderText(mt.components),
          footerText:      this.extractFooterText(mt.components),
          rejectionReason: mt.rejected_reason,
          syncedAt:        new Date(),
          deletedAt:       null,
        };

        if (existing) {
          await this.prisma.template.update({ where: { id: existing.id }, data });
        } else {
          await this.prisma.template.create({
            data: { ...data, hotelId, metaTemplateId: mt.id },
          });
        }
        synced++;
      } catch (e) {
        errors++;
        errorMessages.push(`Template ${mt.name}: ${e.message}`);
      }
    }

    return { synced, errors, errorMessages };
  }

  async duplicate(hotelId: string, id: string) {
    const original = await this.findOne(hotelId, id);

    const baseName = `${original.name}_copy`;
    let name = baseName;
    let counter = 1;

    while (
      await this.prisma.template.findFirst({
        where: { hotelId, name, deletedAt: null },
      })
    ) {
      name = `${baseName}_${counter++}`;
    }

    return this.prisma.template.create({
      data: {
        hotelId,
        name,
        category:   original.category,
        language:   original.language,
        status:     'DRAFT',
        components: original.components as any,
        headerType: original.headerType,
        headerText: original.headerText,
        bodyText:   original.bodyText,
        footerText: original.footerText,
        buttons:    original.buttons as any,
      },
    });
  }

  // ── Submit a DRAFT template to Meta for approval ──────────────────────────
  async submitToMeta(hotelId: string, id: string) {
    const template = await this.findOne(hotelId, id);

    if (!['DRAFT', 'REJECTED'].includes(template.status)) {
      throw new BadRequestException(
        'Only DRAFT or REJECTED templates can be submitted to Meta',
      );
    }

    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });

    if (!hotel?.wabaId || hotel.wabaId === 'CONFIGURE_IN_SETTINGS') {
      throw new BadRequestException(
        'WABA ID not configured. Go to Settings and save your WABA ID.',
      );
    }

    // Ensure we have valid components — build them from stored fields if needed
    let components = template.components as any[];
    if (!components || !components.length) {
      components = this.buildComponentsFromFields({
        headerType: template.headerType,
        headerText: template.headerText,
        bodyText:   template.bodyText,
        footerText: template.footerText,
        buttons:    template.buttons as any[],
      });
      // Persist the generated components so future re-submits are consistent
      await this.prisma.template.update({ where: { id }, data: { components: components as any } });
    }

    try {
      const result = await this.whatsappService.createTemplateOnMeta(
        hotelId,
        hotel.wabaId,
        {
          name:       template.name,
          category:   template.category,
          language:   template.language,
          components,
        },
      );

      return this.prisma.template.update({
        where: { id },
        data:  { metaTemplateId: result.id, status: 'PENDING', rejectionReason: null },
      });
    } catch (e) {
      const errorMessage = this.getMetaErrorMessage(e);
      await this.prisma.template.update({
        where: { id },
        data:  { rejectionReason: errorMessage },
      });
      throw new BadRequestException(`Meta submission failed: ${errorMessage}`);
    }
  }

  // ── Delete template on Meta ───────────────────────────────────────────────
  async deleteOnMeta(hotelId: string, id: string) {
    const template = await this.findOne(hotelId, id);
    const hotel    = await this.prisma.hotel.findUnique({ where: { id: hotelId } });

    if (!hotel?.wabaId || hotel.wabaId === 'CONFIGURE_IN_SETTINGS') {
      throw new BadRequestException('WABA ID not configured');
    }

    await this.whatsappService.deleteTemplateOnMeta(hotelId, hotel.wabaId, template.name);
    return this.prisma.template.update({
      where: { id },
      data:  { status: 'DRAFT', metaTemplateId: null },
    });
  }

  // ── Build Meta-format components array from individual fields ─────────────
  //
  // Meta API expects components like:
  // [
  //   { type: "HEADER", format: "TEXT", text: "..." },
  //   { type: "BODY",   text: "..." },
  //   { type: "FOOTER", text: "..." },
  //   { type: "BUTTONS", buttons: [ { type: "QUICK_REPLY", text: "..." } ] }
  // ]
  private buildComponentsFromFields(fields: {
    headerType?: string;
    headerText?: string;
    bodyText?:   string;
    footerText?: string;
    buttons?:    any[];
  }): any[] {
    const components: any[] = [];

    // ── HEADER ──
    if (fields.headerType && fields.headerType !== 'NONE') {
      const format = fields.headerType.toUpperCase(); // TEXT | IMAGE | VIDEO | DOCUMENT
      if (format === 'TEXT') {
        if (fields.headerText) {
          components.push({ type: 'HEADER', format, text: fields.headerText });
        }
      } else {
        throw new BadRequestException(
          'Media header templates (IMAGE/VIDEO/DOCUMENT) are not supported yet. Use a TEXT header or NONE.',
        );
      }
    }

    // ── BODY ──
    if (fields.bodyText) {
      components.push({ type: 'BODY', text: fields.bodyText });
    }

    // ── FOOTER ──
    if (fields.footerText) {
      components.push({ type: 'FOOTER', text: fields.footerText });
    }

    // ── BUTTONS ──
    if (fields.buttons && fields.buttons.length > 0) {
      const buttons = fields.buttons.map((btn: any) => {
        const b: any = { type: btn.type, text: btn.text };
        if (btn.type === 'URL')          b.url          = btn.url;
        if (btn.type === 'PHONE_NUMBER') b.phone_number = btn.phone_number || btn.phoneNumber;
        return b;
      });
      components.push({ type: 'BUTTONS', buttons });
    }

    return components;
  }

  // ── Helpers to extract text from Meta components ──────────────────────────
  private extractBodyText(components?: any[]): string {
    const body = components?.find((c) => c.type === 'BODY');
    return body?.text || '';
  }

  private extractHeaderText(components?: any[]): string | undefined {
    const header = components?.find((c) => c.type === 'HEADER');
    return header?.text || undefined;
  }

  private extractFooterText(components?: any[]): string | undefined {
    const footer = components?.find((c) => c.type === 'FOOTER');
    return footer?.text || undefined;
  }

  private getMetaErrorMessage(error: any): string {
    return (
      error?.response?.data?.error?.message ||
      error?.response?.data?.error?.error_user_msg ||
      error?.message ||
      'Unknown Meta error'
    );
  }
}
