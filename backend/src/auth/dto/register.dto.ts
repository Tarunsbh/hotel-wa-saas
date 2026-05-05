import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['ADMIN','MANAGER','AGENT'], required: false })
  @IsOptional() @IsEnum(['ADMIN','MANAGER','AGENT']) role?: 'ADMIN'|'MANAGER'|'AGENT';
}
