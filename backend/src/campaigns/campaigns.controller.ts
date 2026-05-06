import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.findAll(req.user.hotelId, {
      status,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  create(@Request() req: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(
      req.user.hotelId,
      req.user.sub,
      dto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.softDelete(req.user.hotelId, id);
  }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  launch(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.launch(req.user.hotelId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.cancel(req.user.hotelId, id);
  }

  @Get(':id/recipients')
  @ApiOperation({ summary: 'Get campaign recipients' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecipients(
    @Request() req: any,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.getRecipients(req.user.hotelId, id, {
      status,
      page,
      limit,
    });
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiParam({ name: 'id', type: 'string' })
  getStats(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getStats(req.user.hotelId, id);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get aggregate campaign analytics for dashboard' })
  getAnalytics(@Request() req: any) {
    return this.campaignsService.getAnalytics(req.user.hotelId);
  }
}
