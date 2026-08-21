import { Body, Controller, Delete, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/services/push-subscriptions.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class PushSubscriptionKeysDto {
  @ApiProperty() @IsString() p256dh: string;
  @ApiProperty() @IsString() auth: string;
}

export class SubscribeDto {
  @ApiProperty() @IsString() endpoint: string;
  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
  @ApiProperty({ required: false }) platform?: string;
  @ApiProperty({ required: false }) userAgent?: string;
}

@ApiTags('Push Subscriptions')
@Controller('api/push-subscriptions')
export class PushSubscriptionsController {
  constructor(private readonly pushSubscriptionsService: PushSubscriptionsService) {}

  @ApiOperation({ summary: "Register (or refresh) the caller's browser push subscription" })
  @Post()
  async subscribe(@CurrentUser() user: AuthUser, @Body() body: SubscribeDto) {
    const data = await this.pushSubscriptionsService.subscribe(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PUSH_SUBSCRIBED);
  }

  @ApiOperation({ summary: "Remove one of the caller's push subscriptions (e.g. on logout)" })
  @ApiQuery({ name: 'endpoint', required: true })
  @Delete()
  async unsubscribe(@CurrentUser() user: AuthUser, @Query('endpoint') endpoint: string) {
    await this.pushSubscriptionsService.unsubscribe(user, endpoint);
    return ResponseHelper.success(null, SUCCESS_MESSAGES.PUSH_UNSUBSCRIBED);
  }
}
