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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all templates with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.templatesService.findAll(req.user.hotelId, {
      status,
      category,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a template' })
  create(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a template' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.softDelete(req.user.hotelId, id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync templates from Meta WABA (uses hotel stored wabaId if not provided)' })
  sync(
    @Request() req: any,
    @Body('wabaId') wabaId?: string,
  ) {
    return this.templatesService.syncFromMeta(req.user.hotelId, wabaId);
  }

  @Post(':id/delete-on-meta')
  @ApiOperation({ summary: 'Delete template on Meta by name' })
  @ApiParam({ name: 'id', type: 'string' })
  async deleteOnMeta(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.deleteOnMeta(req.user.hotelId, id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a template' })
  @ApiParam({ name: 'id', type: 'string' })
  duplicate(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.duplicate(req.user.hotelId, id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit DRAFT template to Meta for approval' })
  @ApiParam({ name: 'id', type: 'string' })
  submitToMeta(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.submitToMeta(req.user.hotelId, id);
  }
}
