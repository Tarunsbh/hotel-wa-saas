import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHotelDto {
  @ApiPropertyOptional({ description: 'Hotel name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Hotel contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Hotel contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Hotel address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Hotel timezone', example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Hotel locale', example: 'en-IN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ description: 'Hotel country code', example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @ApiPropertyOptional({ description: 'WhatsApp Business Account ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wabaId?: string;

  @ApiPropertyOptional({ description: 'WhatsApp Phone Number ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneNumberId?: string;

  @ApiPropertyOptional({ description: 'Hotel settings JSON object' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
