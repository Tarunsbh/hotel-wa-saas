import {
  Controller,
  Get,
  Post,
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
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByConversation(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.findByConversation(
      req.user.hotelId,
      conversationId,
      { page, limit },
    );
  }

  @Post('send/text')
  @ApiOperation({ summary: 'Send a text message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['conversationId', 'body'],
    },
  })
  sendText(
    @Request() req: any,
    @Body('conversationId') conversationId: string,
    @Body('body') body: string,
  ) {
    return this.messagesService.sendText(
      req.user.hotelId,
      req.user.sub,
      conversationId,
      body,
    );
  }

  @Post('send/template')
  @ApiOperation({ summary: 'Send a template message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        templateId: { type: 'string' },
        variableValues: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['conversationId', 'templateId'],
    },
  })
  sendTemplate(
    @Request() req: any,
    @Body('conversationId') conversationId: string,
    @Body('templateId') templateId: string,
    @Body('variableValues') variableValues: Record<string, string>,
  ) {
    return this.messagesService.sendTemplate(
      req.user.hotelId,
      req.user.sub,
      conversationId,
      templateId,
      variableValues || {},
    );
  }

  @Post('send/to-number')
  @ApiOperation({ summary: 'Send text to any phone number (auto creates guest + conversation)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone in E.164 format, e.g. +971501234567' },
        body: { type: 'string' },
      },
      required: ['to', 'body'],
    },
  })
  sendToNumber(
    @Request() req: any,
    @Body('to') to: string,
    @Body('body') body: string,
  ) {
    return this.messagesService.sendToNumber(
      req.user.hotelId,
      req.user.sub,
      to,
      body,
    );
  }

  @Post('send/template/to-number')
  @ApiOperation({ summary: 'Send a template message to any phone number (creates guest + conversation)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone in E.164 format, e.g. +971501234567' },
        templateId: { type: 'string' },
        variableValues: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['to', 'templateId'],
    },
  })
  sendTemplateToNumber(
    @Request() req: any,
    @Body('to') to: string,
    @Body('templateId') templateId: string,
    @Body('variableValues') variableValues: Record<string, string>,
  ) {
    return this.messagesService.sendTemplateToNumber(
      req.user.hotelId,
      req.user.sub,
      to,
      templateId,
      variableValues || {},
    );
  }

  @Post('send/media')
  @ApiOperation({ summary: 'Send a media message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        type: {
          type: 'string',
          enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'],
        },
        link: { type: 'string' },
        caption: { type: 'string' },
      },
      required: ['conversationId', 'type', 'link'],
    },
  })
  sendMedia(
    @Request() req: any,
    @Body('conversationId') conversationId: string,
    @Body('type') type: string,
    @Body('link') link: string,
    @Body('caption') caption?: string,
  ) {
    return this.messagesService.sendMedia(
      req.user.hotelId,
      req.user.sub,
      conversationId,
      type,
      link,
      caption,
    );
  }
}
