import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AudienceType {
  ALL = 'ALL',
  ARRIVING = 'ARRIVING',
  CHECKED_IN = 'CHECKED_IN',
  IN_HOUSE = 'IN_HOUSE',
  CHECKED_OUT = 'CHECKED_OUT',
  TAG = 'TAG',
  CUSTOM = 'CUSTOM',
  CSV = 'CSV',
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Welcome Campaign Jan 2024' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Template ID to use for this campaign' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Audience type for targeting', enum: AudienceType })
  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @ApiPropertyOptional({ description: 'Audience filter criteria (depends on audienceType)' })
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'ISO date string for scheduling', example: '2024-01-20T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Variable values for template placeholders' })
  @IsOptional()
  @IsObject()
  variableValues?: Record<string, string>;
}
