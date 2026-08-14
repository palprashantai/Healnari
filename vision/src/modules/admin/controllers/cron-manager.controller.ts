import { Body, Controller, ForbiddenException, Get, Param, Post, Put } from '@nestjs/common';
import { CronManagerService } from '@/modules/admin/services/cron-manager.service';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { ResponseHelper } from '@/core/helpers/response.helper';

@Controller('api/admin/crons')
export class CronManagerController {
  constructor(private readonly cronManager: CronManagerService) {}

  private checkAdmin(user: AuthUser) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }
  }

  @Get()
  listAllCrons(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = this.cronManager.listAllCrons();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('logs')
  async getRecentLogs(
    @CurrentUser() user: AuthUser,
  ) {
    this.checkAdmin(user);
    const data = await this.cronManager.getExecutionLogs(undefined, 100);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get(':name/logs')
  async getJobLogs(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
  ) {
    this.checkAdmin(user);
    const data = await this.cronManager.getExecutionLogs(name, 50);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post(':name/toggle')
  async toggleCron(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Body('running') running?: boolean,
  ) {
    this.checkAdmin(user);
    const data = await this.cronManager.toggleCron(name, running);
    return ResponseHelper.success(data, data.message);
  }

  @Post(':name/run')
  async runCronNow(@CurrentUser() user: AuthUser, @Param('name') name: string) {
    this.checkAdmin(user);
    const data = await this.cronManager.runCronNow(name);
    return ResponseHelper.success(data, data.message);
  }

  @Put(':name/schedule')
  async updateSchedule(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Body('expression') expression: string,
  ) {
    this.checkAdmin(user);
    const data = await this.cronManager.updateCronSchedule(name, expression);
    return ResponseHelper.success(data, data.message);
  }
}
