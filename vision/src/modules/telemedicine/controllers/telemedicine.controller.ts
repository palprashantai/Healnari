import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { TelemedicineService } from '@/modules/telemedicine/services/telemedicine.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class AddNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  note: string;
}

@ApiTags('Telemedicine')
@Controller('api/telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @ApiOperation({
    summary:
      "Doctor's video-consult queue (today + upcoming, video appointments only)",
  })
  @Get('queue')
  async queue(@CurrentUser() user: AuthUser) {
    const data = await this.telemedicineService.getQueue(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      "Doctor's telemedicine history (completed/past video consultations)",
  })
  @Get('history')
  async history(@CurrentUser() user: AuthUser) {
    const data = await this.telemedicineService.getHistory(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'STUN/TURN ICE server list for establishing a WebRTC video call (either participant)',
  })
  @Get('ice-servers')
  async iceServers() {
    const data = await this.telemedicineService.getIceServers();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      "List a session's clinical notes (owner doctor or the patient on the appointment)",
  })
  @ApiParam({ name: 'appointmentId' })
  @Get(':appointmentId/notes')
  async getNotes(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
  ) {
    const data = await this.telemedicineService.getNotes(user, appointmentId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: 'Save a clinical note during/after a video session (doctor only)',
  })
  @ApiParam({ name: 'appointmentId' })
  @Post(':appointmentId/notes')
  async addNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body() body: AddNoteDto,
  ) {
    const data = await this.telemedicineService.addNote(
      user,
      appointmentId,
      body.note,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.NOTE_SAVED);
  }

  @ApiOperation({
    summary: 'Get active prescription/notes draft for a consultation session',
  })
  @ApiParam({ name: 'appointmentId' })
  @Get(':appointmentId/draft')
  async getDraft(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
  ) {
    const data = await this.telemedicineService.getDraft(user, appointmentId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: 'Save debounced clinical notes/prescription draft (doctor only)',
  })
  @ApiParam({ name: 'appointmentId' })
  @Post(':appointmentId/draft')
  async saveDraft(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body() body: any,
  ) {
    const data = await this.telemedicineService.saveDraft(
      user,
      appointmentId,
      body,
    );
    return ResponseHelper.success(data, 'Draft saved');
  }

  @ApiOperation({
    summary: 'Get authoritative consultation session status, duration and start timestamp',
  })
  @ApiParam({ name: 'appointmentId' })
  @Get(':appointmentId/session')
  async getSessionStatus(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
  ) {
    const data = await this.telemedicineService.getSessionStatus(
      user,
      appointmentId,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: 'Periodic heartbeat from active WebRTC call for authoritative duration tracking',
  })
  @ApiParam({ name: 'appointmentId' })
  @Post(':appointmentId/session/heartbeat')
  async recordHeartbeat(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId', new ParseUUIDPipe()) appointmentId: string,
    @Body() body: { elapsedSeconds?: number; quality?: string; isAudioOnly?: boolean },
  ) {
    const data = await this.telemedicineService.recordHeartbeat(
      user,
      appointmentId,
      body,
    );
    return ResponseHelper.success(data, 'Heartbeat recorded');
  }
}

