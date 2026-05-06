import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation/rules')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @ApiOperation({ summary: 'List all automation rules' })
  findAll(@Request() req: any) {
    return this.automationService.findAll(req.user.hotelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single automation rule' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.automationService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an automation rule' })
  create(@Request() req: any, @Body() dto: CreateAutomationRuleDto) {
    return this.automationService.create(
      req.user.hotelId,
      req.user.sub,
      dto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an automation rule' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    return this.automationService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an automation rule' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Request() req: any, @Param('id') id: string) {
    return this.automationService.softDelete(req.user.hotelId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle automation rule active/inactive' })
  @ApiParam({ name: 'id', type: 'string' })
  toggle(@Request() req: any, @Param('id') id: string) {
    return this.automationService.toggle(req.user.hotelId, id);
  }

  @Post(':id/run-now')
  @ApiOperation({ summary: 'Manually trigger an automation rule' })
  @ApiParam({ name: 'id', type: 'string' })
  async runNow(@Request() req: any, @Param('id') id: string) {
    await this.automationService.findOne(req.user.hotelId, id);
    return this.automationService.runRule(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get execution logs for an automation rule' })
  @ApiParam({ name: 'id', type: 'string' })
  getLogs(@Request() req: any, @Param('id') id: string) {
    return this.automationService.getLogs(req.user.hotelId, id);
  }
}
