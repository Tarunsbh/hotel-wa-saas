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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const csv = require("csv-parse/sync");
let GuestsService = class GuestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    validateE164(phone) {
        return /^\+[1-9]\d{1,14}$/.test(phone);
    }
    toGuestData(dto) {
        const { status, externalId, ...rest } = dto;
        return {
            ...rest,
            stayStatus: this.normalizeStayStatus(status),
            pmsGuestId: externalId,
        };
    }
    normalizeStayStatus(status) {
        if (!status)
            return undefined;
        const normalized = status.toUpperCase();
        if (normalized === 'ACTIVE')
            return 'NO_STAY';
        if (normalized === 'CHECKED_IN')
            return 'IN_HOUSE';
        if (normalized === 'INACTIVE')
            return 'NO_STAY';
        return normalized;
    }
    async findAll(hotelId, query) {
        const { search, status, tag } = query;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Number(query.limit) || 20);
        const skip = (page - 1) * limit;
        const where = {
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
    async findOne(hotelId, id) {
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
            throw new common_1.NotFoundException(`Guest ${id} not found`);
        }
        return guest;
    }
    async create(hotelId, dto) {
        if (!this.validateE164(dto.phone)) {
            throw new common_1.BadRequestException('Phone must be in E.164 format (e.g. +14155552671)');
        }
        const existing = await this.prisma.guest.findFirst({
            where: { hotelId, phone: dto.phone, deletedAt: null },
        });
        if (existing) {
            throw new common_1.ConflictException(`Guest with phone ${dto.phone} already exists`);
        }
        return this.prisma.guest.create({
            data: {
                ...this.toGuestData(dto),
                hotelId,
            },
        });
    }
    async update(hotelId, id, dto) {
        await this.findOne(hotelId, id);
        if (dto.phone) {
            if (!this.validateE164(dto.phone)) {
                throw new common_1.BadRequestException('Phone must be in E.164 format');
            }
            const conflict = await this.prisma.guest.findFirst({
                where: { hotelId, phone: dto.phone, deletedAt: null, id: { not: id } },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Another guest with phone ${dto.phone} already exists`);
            }
        }
        return this.prisma.guest.update({
            where: { id },
            data: this.toGuestData(dto),
        });
    }
    async softDelete(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.guest.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async forceDelete(hotelId, id) {
        await this.findOne(hotelId, id);
        return this.prisma.guest.delete({
            where: { id },
        });
    }
    async importCsv(hotelId, buffer) {
        let records;
        try {
            records = csv.parse(buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        }
        catch (e) {
            throw new common_1.BadRequestException(`CSV parse error: ${e.message}`);
        }
        let imported = 0;
        let skipped = 0;
        const errors = [];
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
            }
            catch (e) {
                errors.push(`Row ${rowNum}: ${e.message}`);
                skipped++;
            }
        }
        return { imported, skipped, errors };
    }
    async addTag(hotelId, guestId, tagId) {
        await this.findOne(hotelId, guestId);
        const tag = await this.prisma.tag.findFirst({
            where: { id: tagId, hotelId, deletedAt: null },
        });
        if (!tag) {
            throw new common_1.NotFoundException(`Tag ${tagId} not found`);
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
    async removeTag(hotelId, guestId, tagId) {
        await this.findOne(hotelId, guestId);
        const guestTag = await this.prisma.guestTag.findFirst({
            where: { guestId, tagId },
        });
        if (!guestTag) {
            throw new common_1.NotFoundException(`Tag not assigned to guest`);
        }
        return this.prisma.guestTag.delete({
            where: { guestId_tagId: { guestId, tagId } },
        });
    }
    async getTags(hotelId) {
        return this.prisma.tag.findMany({
            where: { hotelId, deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
    async createTag(hotelId, name, color) {
        const existing = await this.prisma.tag.findFirst({
            where: { hotelId, name, deletedAt: null },
        });
        if (existing) {
            throw new common_1.ConflictException(`Tag "${name}" already exists`);
        }
        return this.prisma.tag.create({
            data: { hotelId, name, color },
        });
    }
    async deleteTag(hotelId, tagId) {
        const tag = await this.prisma.tag.findFirst({
            where: { id: tagId, hotelId, deletedAt: null },
        });
        if (!tag) {
            throw new common_1.NotFoundException(`Tag ${tagId} not found`);
        }
        return this.prisma.tag.update({
            where: { id: tagId },
            data: { deletedAt: new Date() },
        });
    }
    async optOut(hotelId, guestId) {
        await this.findOne(hotelId, guestId);
        return this.prisma.guest.update({
            where: { id: guestId },
            data: { optIn: false, optOutAt: new Date() },
        });
    }
};
exports.GuestsService = GuestsService;
exports.GuestsService = GuestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuestsService);
//# sourceMappingURL=guests.service.js.map