import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TriggerType {
  SCHEDULED = 'SCHEDULED',
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  KEYWORD = 'KEYWORD',
  INACTIVITY = 'INACTIVITY',
  BEFORE_ARRIVAL = 'BEFORE_ARRIVAL',
  AFTER_CHECKIN = 'AFTER_CHECKIN',
  DURING_STAY = 'DURING_STAY',
  BEFORE_CHECKOUT = 'BEFORE_CHECKOUT',
  AFTER_CHECKOUT = 'AFTER_CHECKOUT',
  CUSTOM_DATE = 'CUSTOM_DATE',
}

export enum RuleAudienceType {
  ALL = 'ALL',
  ARRIVING = 'ARRIVING',
  CHECKED_IN = 'CHECKED_IN',
  IN_HOUSE = 'IN_HOUSE',
  CHECKED_OUT = 'CHECKED_OUT',
  TAG = 'TAG',
  CUSTOM = 'CUSTOM',
  CSV = 'CSV',
}

export class CreateAutomationRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Check-in Welcome Message' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Trigger type', enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiPropertyOptional({ description: 'Trigger configuration (cron expression, keyword, hours, etc.)' })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ description: 'Template ID to send' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Audience type', enum: RuleAudienceType })
  @IsEnum(RuleAudienceType)
  audienceType: RuleAudienceType;

  @ApiPropertyOptional({ description: 'Audience filter criteria' })
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template variable values' })
  @IsOptional()
  @IsObject()
  variableValues?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
