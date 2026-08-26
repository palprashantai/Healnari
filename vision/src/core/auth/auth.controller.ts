import { BadRequestException, Body, Controller, Delete, Get, Headers, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiProperty, ApiConsumes } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from '@/core/auth/auth.service';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  @ApiProperty({ required: false }) @IsOptional() emailNotifications?: boolean;
  @ApiProperty({ required: false }) @IsOptional() smsNotifications?: boolean;
}

export class UpdatePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty({ example: 'newPassword123' }) @IsString() @MinLength(6) newPassword: string;
}

/** All identity/session state lives in Supabase Auth. This controller is a
 * thin proxy so the frontend only ever has to talk to vision, never to
 * Supabase directly. */
@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // AUDIT_REPORT.md SEC-3 — the only other rate limit anywhere is a flat
  // 100 req/min/IP applied to every route; that's far too permissive for
  // credential stuffing against login specifically.
  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new patient or doctor account' })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.USER_REGISTERED);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @ApiOperation({ summary: 'Log out and invalidate session' })
  @Post('logout')
  async logout(@Headers('authorization') authHeader?: string) {
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (token) {
        await this.authService.logout(token);
      }
    }
    return ResponseHelper.success(null, 'Logged out successfully');
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

  @ApiOperation({ summary: "Change the caller's password" })
  @Put('password')
  async updatePassword(@CurrentUser() user: AuthUser, @Body() body: UpdatePasswordDto) {
    await this.authService.updatePassword(user, body.currentPassword, body.newPassword);
    return ResponseHelper.success(null, SUCCESS_MESSAGES.PASSWORD_UPDATED);
  }

  @ApiOperation({ summary: "Upload the caller's profile photo" })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @Post('me/avatar')
  async uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST);
    // AUDIT_REPORT.md SEC-5 — previously only size-limited; lab report
    // uploads already enforce a mimetype allow-list, avatars didn't.
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) throw new BadRequestException(ERROR_MESSAGES.INVALID_IMAGE_TYPE);
    const result = await this.authService.uploadAvatar(user, file);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }

  @ApiOperation({ summary: "Remove the caller's profile photo" })
  @Delete('me/avatar')
  async removeAvatar(@CurrentUser() user: AuthUser) {
    const result = await this.authService.removeAvatar(user);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }
}
