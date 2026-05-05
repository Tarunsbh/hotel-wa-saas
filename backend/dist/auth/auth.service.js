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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: { email: dto.email, deletedAt: null, isActive: true },
            include: { hotel: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const token = this.jwt.sign({ sub: user.id, hotelId: user.hotelId, role: user.role });
        const { passwordHash, ...safeUser } = user;
        return { token, access_token: token, user: safeUser };
    }
    async register(dto, actorHotelId, actorRole) {
        if (!['ADMIN', 'MANAGER'].includes(actorRole))
            throw new common_1.ForbiddenException('Insufficient permissions');
        const exists = await this.prisma.user.findFirst({ where: { email: dto.email, hotelId: actorHotelId, deletedAt: null } });
        if (exists)
            throw new common_1.ConflictException('Email already registered in this hotel');
        const hash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
                hotelId: actorHotelId,
                email: dto.email,
                passwordHash: hash,
                name: dto.name,
                role: dto.role || 'AGENT',
                isActive: true,
            },
        });
        const { passwordHash, ...safe } = user;
        return safe;
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { hotel: true } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const { passwordHash, ...safe } = user;
        return safe;
    }
    async changePassword(userId, oldPw, newPw) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const valid = await bcrypt.compare(oldPw, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const hash = await bcrypt.hash(newPw, 12);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
        return { message: 'Password changed successfully' };
    }
    async listAgents(hotelId) {
        try {
            return await this.prisma.user.findMany({
                where: { hotelId, deletedAt: null },
                select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
                orderBy: { name: 'asc' },
            });
        }
        catch {
            return [];
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map