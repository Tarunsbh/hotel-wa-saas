import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum HeaderType {
  NONE = 'NONE',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name (used in Meta API)', example: 'welcome_message' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name: string;

  @ApiProperty({ description: 'Template category', enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ description: 'Template language code', example: 'en' })
  @IsString()
  @MaxLength(10)
  language: string;

  @ApiPropertyOptional({ description: 'Header text content' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  headerText?: string;

  @ApiPropertyOptional({ description: 'Template header type', enum: HeaderType })
  @IsOptional()
  @IsEnum(HeaderType)
  headerType?: HeaderType;

  @ApiPropertyOptional({ description: 'Body text content' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  bodyText?: string;

  @ApiPropertyOptional({ description: 'Footer text content' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  footerText?: string;

  @ApiPropertyOptional({ description: 'Template components (Meta format)', type: 'array' })
  @IsOptional()
  @IsArray()
  components?: any[];

  @ApiPropertyOptional({ description: 'Template buttons configuration', type: 'array' })
  @IsOptional()
  @IsArray()
  buttons?: any[];

  @ApiPropertyOptional({ description: 'Submit to Meta immediately after creation', default: false })
  @IsOptional()
  @IsBoolean()
  submitToMeta?: boolean;
}
