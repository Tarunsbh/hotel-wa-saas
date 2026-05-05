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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@ApiTags('guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('tags')
  @ApiOperation({ summary: 'List all tags for hotel' })
  getTags(@Request() req: any) {
    return this.guestsService.getTags(req.user.hotelId);
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['name', 'color'],
    },
  })
  createTag(
    @Request() req: any,
    @Body('name') name: string,
    @Body('color') color: string,
  ) {
    return this.guestsService.createTag(req.user.hotelId, name, color);
  }

  @Delete('tags/:tagId')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'tagId', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTag(@Request() req: any, @Param('tagId') tagId: string) {
    return this.guestsService.deleteTag(req.user.hotelId, tagId);
  }

  @Get()
  @ApiOperation({ summary: 'List guests with pagination and filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.guestsService.findAll(req.user.hotelId, {
      search,
      status,
      tag,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single guest' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a guest' })
  create(@Request() req: any, @Body() dto: CreateGuestDto) {
    return this.guestsService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a guest' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
  ) {
    return this.guestsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a guest' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.softDelete(req.user.hotelId, id);
  }

  @Delete(':id/force')
  @ApiOperation({ summary: 'Delete a guest and associated conversations from database' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  forceDelete(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.forceDelete(req.user.hotelId, id);
  }

  @Post('import-csv')
  @ApiOperation({ summary: 'Import guests from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.guestsService.importCsv(req.user.hotelId, file.buffer);
  }

  @Post(':id/opt-out')
  @ApiOperation({ summary: 'Opt-out a guest from messaging' })
  @ApiParam({ name: 'id', type: 'string' })
  optOut(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.optOut(req.user.hotelId, id);
  }

  @Post(':id/tags/:tagId')
  @ApiOperation({ summary: 'Add tag to guest' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'tagId', type: 'string' })
  addTag(
    @Request() req: any,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.guestsService.addTag(req.user.hotelId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove tag from guest' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'tagId', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(
    @Request() req: any,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.guestsService.removeTag(req.user.hotelId, id, tagId);
  }
}
