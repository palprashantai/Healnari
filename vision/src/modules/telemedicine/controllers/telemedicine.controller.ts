import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { TelemedicineService } from '@/modules/telemedicine/services/telemedicine.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class AddNoteDto {
  @ApiProperty() @IsString() note: string;
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
    @Param('appointmentId') appointmentId: string,
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
    @Param('appointmentId') appointmentId: string,
    @Body() body: AddNoteDto,
  ) {
    const data = await this.telemedicineService.addNote(
      user,
      appointmentId,
      body.note,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.NOTE_SAVED);
  }
}
