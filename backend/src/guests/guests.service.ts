import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import * as csv from 'csv-parse/sync';

@Injectable()
export class GuestsService {
  private readonly logger = new Logger(GuestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private validateE164(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /** Convert a date string like '2026-07-05' to a proper Date object for Prisma. */
  private parseDate(value?: string | null): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  private toGuestData(dto: CreateGuestDto | UpdateGuestDto) {
    const { status, externalId, checkInDate, checkOutDate, ...rest } = dto as any;

    // Build the clean data object — omit undefined values so Prisma doesn't
    // try to write NULL for unset optional fields, and convert date strings
    // to Date objects so MySQL's @db.Date binding never receives a raw string.
    const data: Record<string, any> = {
      ...rest,
      stayStatus: this.normalizeStayStatus(status) ?? undefined,
      pmsGuestId: externalId ?? undefined,
    };

    const ciDate = this.parseDate(checkInDate);
    const coDate = this.parseDate(checkOutDate);
    if (ciDate !== undefined) data.checkInDate  = ciDate;
    if (coDate !== undefined) data.checkOutDate = coDate;

    // Strip any keys whose value is undefined so Prisma doesn't include them
    return Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
  }

  private normalizeStayStatus(status?: string) {
    if (!status) return undefined;

    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVE') return 'NO_STAY';
    if (normalized === 'CHECKED_IN') return 'IN_HOUSE';
    if (normalized === 'INACTIVE') return 'NO_STAY';
    return normalized;
  }

  /** Map a Prisma error to a meaningful HTTP exception. */
  private handlePrismaError(e: unknown, phone?: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          phone
            ? `A guest with phone ${phone} already exists`
            : 'A guest with this phone number already exists',
        );
      }
      if (e.code === 'P2025') {
        throw new NotFoundException('Guest not found');
      }
      this.logger.error(`Prisma error ${e.code}: ${e.message}`);
      throw new BadRequestException(`Database error: ${e.code}`);
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma validation error: ${e.message}`);
      throw new BadRequestException(
        'Invalid guest data — please check all fields and try again',
      );
    }
    throw e; // re-throw unknown errors
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

    // Check for active guest AND also soft-deleted guest (unique constraint
    // on [phone, hotelId] doesn't filter by deletedAt, so a soft-deleted
    // guest with the same phone would still trigger P2002).
    const existing = await this.prisma.guest.findFirst({
      where: { hotelId, phone: dto.phone },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException(
          `A guest with phone ${dto.phone} already exists`,
        );
      }
      // Soft-deleted guest with same phone — restore and update instead
      const { hotelId: _hid, ...restoreData } = this.toGuestData(dto) as any;
      return this.prisma.guest.update({
        where: { id: existing.id },
        data: { ...restoreData, deletedAt: null },
      });
    }

    try {
      return await this.prisma.guest.create({
        data: {
          ...(this.toGuestData(dto) as any),
          hotelId,
        },
      });
    } catch (e) {
      this.handlePrismaError(e, dto.phone);
    }
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

    try {
      return await this.prisma.guest.update({
        where: { id },
        data: this.toGuestData(dto),
      });
    } catch (e) {
      this.handlePrismaError(e, dto.phone);
    }
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
