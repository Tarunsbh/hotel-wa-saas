import { Controller, Post, Get, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Agent login — returns JWT' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new agent (Admin/Manager only)' })
  register(@Body() dto: RegisterDto, @Request() req: any) {
    return this.auth.register(dto, req.user.hotelId, req.user.role);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Request() req: any) { return this.auth.me(req.user.sub); }

  @Get('agents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  agents(@Request() req: any) { return this.auth.listAgents(req.user.hotelId); }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Body() body: { currentPassword: string; newPassword: string }, @Request() req: any) {
    return this.auth.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }
}
