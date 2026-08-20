import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

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
