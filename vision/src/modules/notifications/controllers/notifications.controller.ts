import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() appointment_reminders?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() doctor_messages?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() consultation_updates?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() health_reminders?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() medication_reminders?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() cycle_reminders?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() marketing_notifications?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() sound_enabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() quiet_hours_enabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() quiet_hours_start?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() quiet_hours_end?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() timezone?: string;
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: "List the caller's notifications, most recent first" })
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const data = await this.notificationsService.list(user, pageNum, limitNum);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Get the caller's notification preferences" })
  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthUser) {
    const data = await this.notificationsService.getPreferences(user.id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Update the caller's notification preferences" })
  @Put('preferences')
  async updatePreferences(@CurrentUser() user: AuthUser, @Body() body: UpdateNotificationPreferencesDto) {
    const data = await this.notificationsService.updatePreferences(user, body);
    return ResponseHelper.success(data, 'Notification preferences updated.');
  }

  @ApiOperation({ summary: 'Mark a single notification as read (owner only)' })
  @ApiParam({ name: 'id' })
  @Put(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.notificationsService.markRead(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.NOTIFICATION_READ);
  }

  @ApiOperation({ summary: "Mark all of the caller's notifications as read" })
  @Put('read-all')
  async markAllRead(@CurrentUser() user: AuthUser) {
    const data = await this.notificationsService.markAllRead(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.NOTIFICATION_READ);
  }
}
