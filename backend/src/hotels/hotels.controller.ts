import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HotelsService } from './hotels.service';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@ApiTags('hotels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current hotel information' })
  getMe(@Request() req: any) {
    return this.hotelsService.findOne(req.user.hotelId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current hotel settings' })
  update(@Request() req: any, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.update(req.user.hotelId, dto);
  }

  @Post('me/token')
  @ApiOperation({ summary: 'Store/update WhatsApp access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        wabaId: { type: 'string' },
        phoneNumberId: { type: 'string' },
        expiresIn: { type: 'number', description: 'Token TTL in seconds' },
      },
      required: ['accessToken'],
    },
  })
  storeToken(
    @Request() req: any,
    @Body('accessToken') accessToken: string,
    @Body('wabaId') wabaId?: string,
    @Body('phoneNumberId') phoneNumberId?: string,
    @Body('expiresIn') expiresIn?: number,
  ) {
    return this.hotelsService.storeToken(req.user.hotelId, {
      accessToken,
      wabaId,
      phoneNumberId,
      expiresIn,
    });
  }

  @Get('me/tokens')
  @ApiOperation({ summary: 'List stored WhatsApp tokens (masked)' })
  getTokens(@Request() req: any) {
    return this.hotelsService.getTokens(req.user.hotelId);
  }
}
