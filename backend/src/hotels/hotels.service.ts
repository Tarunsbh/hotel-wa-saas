import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@Injectable()
export class HotelsService {
  private readonly logger = new Logger(HotelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async findOne(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        timezone: true,
        country: true,
        wabaId: true,
        phoneNumberId: true,
        plan: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel ${hotelId} not found`);
    }

    return hotel;
  }

  async update(hotelId: string, dto: UpdateHotelDto) {
    const hotel = await this.findOne(hotelId);

    const mergedSettings = {
      ...(hotel.settings as Record<string, any> || {}),
      ...(dto.settings as Record<string, any> || {}),
    };

    return this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: dto.name,
        timezone: dto.timezone,
        country: dto.country,
        wabaId: dto.wabaId,
        phoneNumberId: dto.phoneNumberId,
        settings: mergedSettings,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        country: true,
        wabaId: true,
        phoneNumberId: true,
        plan: true,
        isActive: true,
        settings: true,
        updatedAt: true,
      },
    });
  }

  async storeToken(hotelId: string, tokenData: {
    accessToken: string;
    wabaId?: string;
    phoneNumberId?: string;
    expiresIn?: number;
  }) {
    await this.findOne(hotelId);

    if (!tokenData.accessToken) {
      throw new BadRequestException('accessToken is required');
    }

    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : undefined;

    // Try validation but don't block if it fails
    try {
      await this.whatsappService.validateToken(tokenData.accessToken);
    } catch (e) {
      this.logger.warn(`Token validation warning: ${e.message} — storing anyway`);
    }

    const token = await this.whatsappService.storeToken(
      hotelId,
      tokenData.accessToken,
      expiresAt,
    );

    if (tokenData.wabaId || tokenData.phoneNumberId) {
      await this.prisma.hotel.update({
        where: { id: hotelId },
        data: {
          wabaId: tokenData.wabaId,
          phoneNumberId: tokenData.phoneNumberId,
        },
      });
    }

    return {
      id: token.id,
      hotelId: token.hotelId,
      expiresAt: token.expiresAt,
      isActive: token.isActive,
      createdAt: token.createdAt,
    };
  }

  async getTokens(hotelId: string) {
    await this.findOne(hotelId);

    const tokens = await this.prisma.tokenStorage.findMany({
      where: { hotelId },
      select: {
        id: true,
        hotelId: true,
        tokenType: true,
        tokenValue: true,
        isActive: true,
        expiresAt: true,
        refreshAt: true,
        refreshCount: true,
        lastRefreshed: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token) => ({
      id: token.id,
      hotelId: token.hotelId,
      tokenType: token.tokenType,
      isActive: token.isActive,
      expiresAt: token.expiresAt,
      refreshAt: token.refreshAt,
      refreshCount: token.refreshCount,
      lastRefreshed: token.lastRefreshed,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      accessToken: this.maskToken(
        this.whatsappService.decryptToken(token.tokenValue),
      ),
    }));
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
  }
}
