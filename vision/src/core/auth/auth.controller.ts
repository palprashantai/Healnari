import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from '@/core/auth/auth.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';

export class RegisterDto {
  @ApiProperty({ example: 'priya.sharma@example.com' }) @IsEmail() email: string;
  @ApiProperty({ example: 'password123' }) @IsString() @MinLength(6) password: string;
  // Admin accounts are provisioned manually, never through public self-signup.
  @ApiProperty({ enum: [ProfileRole.DOCTOR, ProfileRole.PATIENT], example: ProfileRole.PATIENT })
  @IsIn([ProfileRole.DOCTOR, ProfileRole.PATIENT])
  role: ProfileRole;
  @ApiProperty({ example: 'Priya Sharma' }) @IsString() fullName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialty?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() registrationNo?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'priya.sharma@example.com' }) @IsEmail() email: string;
  @ApiProperty({ example: 'password123' }) @IsString() password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class UpdateMeDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() fullName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialty?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() registrationNo?: string;
}

/** All identity/session state lives in Supabase Auth. This controller is a
 * thin proxy so the frontend only ever has to talk to vision, never to
 * Supabase directly. */
@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Register a new patient or doctor account' })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.USER_REGISTERED);
  }

  @Public()
  @ApiOperation({ summary: 'Log in with email + password' })
  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body.email, body.password);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.LOGIN_SUCCESS);
  }

  @Public()
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    const result = await this.authService.refresh(body.refreshToken);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.LOGIN_SUCCESS);
  }

  @ApiOperation({ summary: "Get the caller's own profile" })
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return ResponseHelper.success(this.authService.toAppUser(user));
  }

  @ApiOperation({ summary: "Update the caller's own profile" })
  @Put('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: UpdateMeDto) {
    const result = await this.authService.updateMe(user.id, body);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }
}
