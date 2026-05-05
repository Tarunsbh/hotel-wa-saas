import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List conversations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.conversationsService.findAll(req.user.hotelId, {
      status,
      agentId,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.conversationsService.findOne(req.user.hotelId, id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a conversation to an agent' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
      },
      required: ['agentId'],
    },
  })
  assign(
    @Request() req: any,
    @Param('id') id: string,
    @Body('agentId') agentId: string,
  ) {
    return this.conversationsService.assign(req.user.hotelId, id, agentId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update conversation status' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'PENDING', 'RESOLVED', 'ARCHIVED'],
        },
      },
      required: ['status'],
    },
  })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.conversationsService.updateStatus(req.user.hotelId, id, status);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read (reset unread count)' })
  @ApiParam({ name: 'id', type: 'string' })
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.conversationsService.markRead(req.user.hotelId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.conversationsService.remove(req.user.hotelId, id);
  }
}
