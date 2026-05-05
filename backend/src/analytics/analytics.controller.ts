import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  getDashboard(@Request() req: any) {
    return this.analyticsService.getDashboard(req.user.hotelId);
  }

  @Get('message-volume')
  @ApiOperation({ summary: 'Get daily message volume for the last N days' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (default: 7)',
  })
  getMessageVolume(@Request() req: any, @Query('days') days?: number) {
    return this.analyticsService.getMessageVolume(
      req.user.hotelId,
      days ? Number(days) : 7,
    );
  }

  @Get('campaigns')
  @ApiOperation({
    summary: 'Get campaign performance. Optionally filter by campaignId.',
  })
  @ApiQuery({ name: 'campaignId', required: false })
  getCampaignPerformance(
    @Request() req: any,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.analyticsService.getCampaignPerformance(
      req.user.hotelId,
      campaignId,
    );
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get per-agent resolution and messaging stats' })
  getAgentPerformance(@Request() req: any) {
    return this.analyticsService.getAgentPerformance(req.user.hotelId);
  }
}
