import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommunicationsService } from '@/modules/communications/services/communications.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class CreateBroadcastDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty() @IsString() audience: string;
  @ApiProperty({ type: [String] }) @IsArray() channels: string[];
  @ApiProperty({ required: false, enum: ['immediate', 'scheduled'] }) @IsOptional() @IsIn(['immediate', 'scheduled']) scheduleType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() scheduledFor?: string;
  @ApiProperty({ required: false, type: [String], description: 'Specific patient ids to target (e.g. a selection from the Appointments page). When channels includes "push", each gets a real in-app/socket notification.' })
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) patientIds?: string[];
  
  @ApiProperty({ required: false, type: [String], description: 'File names to attach (mock implementation for now)' })
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];
}

@ApiTags('Communications')
@Controller('api/communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @ApiOperation({ summary: "List the caller (doctor)'s broadcast history" })
  @Get('broadcasts')
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.communicationsService.list(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Send or schedule a broadcast message to a patient audience' })
  @Post('broadcasts')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateBroadcastDto) {
    const data = await this.communicationsService.create(user, body);
    const msg = body.scheduleType === 'scheduled' ? SUCCESS_MESSAGES.BROADCAST_SCHEDULED : SUCCESS_MESSAGES.BROADCAST_SENT;
    return ResponseHelper.success(data, msg);
  }
}
