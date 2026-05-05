import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GuestStatus {
  ACTIVE = 'ACTIVE',
  ARRIVING = 'ARRIVING',
  CHECKED_IN = 'CHECKED_IN',
  IN_HOUSE = 'IN_HOUSE',
  CHECKED_OUT = 'CHECKED_OUT',
  INACTIVE = 'INACTIVE',
  NO_STAY = 'NO_STAY',
}

export class CreateGuestDto {
  @ApiProperty({ description: 'Phone number in E.164 format', example: '+14155552671' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in E.164 format (e.g. +14155552671)',
  })
  phone: string;

  @ApiProperty({ description: 'Guest full name', example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Guest email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Room number', example: '101' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Check-in date', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({ description: 'Check-out date', example: '2024-01-20' })
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @ApiPropertyOptional({ description: 'Guest language preference', example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ description: 'Guest status', enum: GuestStatus })
  @IsOptional()
  @IsEnum(GuestStatus)
  status?: GuestStatus;

  @ApiPropertyOptional({ description: 'Whether guest has opted in to messaging', default: true })
  @IsOptional()
  @IsBoolean()
  optIn?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes about the guest' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'External CRM ID for reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;
}
