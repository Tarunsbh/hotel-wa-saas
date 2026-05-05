import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null, isActive: true },
      include: { hotel: true },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = this.jwt.sign({ sub: user.id, hotelId: user.hotelId, role: user.role });
    const { passwordHash, ...safeUser } = user;
    return { token, access_token: token, user: safeUser };
  }

  async register(dto: RegisterDto, actorHotelId: string, actorRole: string) {
    // Only admins and managers can create users
    if (!['ADMIN', 'MANAGER'].includes(actorRole)) throw new ForbiddenException('Insufficient permissions');

    const exists = await this.prisma.user.findFirst({ where: { email: dto.email, hotelId: actorHotelId, deletedAt: null } });
    if (exists) throw new ConflictException('Email already registered in this hotel');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
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

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { hotel: true } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async changePassword(userId: string, oldPw: string, newPw: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(oldPw, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const hash = await bcrypt.hash(newPw, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Password changed successfully' };
  }

  async listAgents(hotelId: string) {
    try {
      return await this.prisma.user.findMany({
        where: { hotelId, deletedAt: null },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
    } catch {
      return [];
    }
  }
}
