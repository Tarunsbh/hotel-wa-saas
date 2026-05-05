import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import * as csv from 'csv-parse/sync';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateE164(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  private toGuestData(dto: CreateGuestDto | UpdateGuestDto) {
    const { status, externalId, ...rest } = dto as any;

    return {
      ...rest,
      stayStatus: this.normalizeStayStatus(status),
      pmsGuestId: externalId,
    };
  }

  private normalizeStayStatus(status?: string) {
    if (!status) return undefined;

    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVE') return 'NO_STAY';
    if (normalized === 'CHECKED_IN') return 'IN_HOUSE';
    if (normalized === 'INACTIVE') return 'NO_STAY';
    return normalized;
  }

  async findAll(
    hotelId: string,
    query: {
      search?: string;
      status?: string;
      tag?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, status, tag } = query;
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = {
      hotelId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (status) {
      where.stayStatus = this.normalizeStayStatus(status);
    }

    if (tag) {
      where.guestTags = {
        some: {
          tag: {
            name: tag,
            deletedAt: null,
          },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.guest.findMany({
        where,
        skip,
        take: limit,
        include: {
          guestTags: {
            include: { tag: true },
            where: { tag: { deletedAt: null } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guest.count({ where }),
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
    const guest = await this.prisma.guest.findFirst({
      where: { id, hotelId, deletedAt: null },
      include: {
        guestTags: {
          include: { tag: true },
          where: { tag: { deletedAt: null } },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }

    return guest;
  }

  async create(hotelId: string, dto: CreateGuestDto) {
    if (!this.validateE164(dto.phone)) {
      throw new BadRequestException(
        'Phone must be in E.164 format (e.g. +14155552671)',
      );
    }

    const existing = await this.prisma.guest.findFirst({
      where: { hotelId, phone: dto.phone, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        `Guest with phone ${dto.phone} already exists`,
      );
    }

    return this.prisma.guest.create({
      data: {
        ...this.toGuestData(dto),
        hotelId,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateGuestDto) {
    await this.findOne(hotelId, id);

    if (dto.phone) {
      if (!this.validateE164(dto.phone)) {
        throw new BadRequestException('Phone must be in E.164 format');
      }

      const conflict = await this.prisma.guest.findFirst({
        where: { hotelId, phone: dto.phone, deletedAt: null, id: { not: id } },
      });

      if (conflict) {
        throw new ConflictException(
          `Another guest with phone ${dto.phone} already exists`,
        );
      }
    }

    return this.prisma.guest.update({
      where: { id },
      data: this.toGuestData(dto),
    });
  }

  async softDelete(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.guest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async forceDelete(hotelId: string, id: string) {
    await this.findOne(hotelId, id);

    return this.prisma.guest.delete({
      where: { id },
    });
  }

  async importCsv(
    hotelId: string,
    buffer: Buffer,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let records: any[];

    try {
      records = csv.parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      throw new BadRequestException(`CSV parse error: ${e.message}`);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      const phone = row.phone?.trim();
      const name = row.name?.trim();

      if (!phone) {
        errors.push(`Row ${rowNum}: missing phone`);
        skipped++;
        continue;
      }

      if (!this.validateE164(phone)) {
        errors.push(`Row ${rowNum}: invalid phone format "${phone}"`);
        skipped++;
        continue;
      }

      try {
        await this.prisma.guest.upsert({
          where: { phone_hotelId: { phone, hotelId } },
          update: {
            name: name || undefined,
            email: row.email?.trim() || undefined,
            checkInDate: row.check_in_date
              ? new Date(row.check_in_date)
              : undefined,
            checkOutDate: row.check_out_date
              ? new Date(row.check_out_date)
              : undefined,
            roomNumber: row.room_number?.trim() || undefined,
            deletedAt: null,
          },
          create: {
            hotelId,
            phone,
            name: name || '',
            email: row.email?.trim() || null,
            checkInDate: row.check_in_date ? new Date(row.check_in_date) : null,
            checkOutDate: row.check_out_date
              ? new Date(row.check_out_date)
              : null,
            roomNumber: row.room_number?.trim() || null,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`Row ${rowNum}: ${e.message}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  async addTag(hotelId: string, guestId: string, tagId: string) {
    await this.findOne(hotelId, guestId);

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, hotelId, deletedAt: null },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    const existing = await this.prisma.guestTag.findFirst({
      where: { guestId, tagId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.guestTag.create({
      data: { guestId, tagId },
    });
  }

  async removeTag(hotelId: string, guestId: string, tagId: string) {
    await this.findOne(hotelId, guestId);

    const guestTag = await this.prisma.guestTag.findFirst({
      where: { guestId, tagId },
    });

    if (!guestTag) {
      throw new NotFoundException(`Tag not assigned to guest`);
    }

    return this.prisma.guestTag.delete({
      where: { guestId_tagId: { guestId, tagId } },
    });
  }

  async getTags(hotelId: string) {
    return this.prisma.tag.findMany({
      where: { hotelId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(hotelId: string, name: string, color: string) {
    const existing = await this.prisma.tag.findFirst({
      where: { hotelId, name, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Tag "${name}" already exists`);
    }

    return this.prisma.tag.create({
      data: { hotelId, name, color },
    });
  }

  async deleteTag(hotelId: string, tagId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, hotelId, deletedAt: null },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: { deletedAt: new Date() },
    });
  }

  async optOut(hotelId: string, guestId: string) {
    await this.findOne(hotelId, guestId);

    return this.prisma.guest.update({
      where: { id: guestId },
      data: { optIn: false, optOutAt: new Date() },
    });
  }
}
