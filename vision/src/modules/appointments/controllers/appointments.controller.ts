import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import {
  AppointmentStatus,
  AppointmentType,
} from '@/shared/interfaces/appointment.interface';

export class CreateAppointmentDto {
  @ApiProperty() @IsUUID() doctorId: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialty?: string;
  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type: AppointmentType;
  @ApiProperty({ example: '2026-08-20' }) @IsString() scheduledDate: string;
  @ApiProperty({ example: '10:30 AM' }) @IsString() scheduledTime: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() currency?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}

export class InstantCallDto {
  @ApiProperty() @IsUUID() patientId: string;
}

@ApiTags('Appointments')
@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({
    summary:
      "List the caller's appointments (patient: own; doctor: assigned to them)",
  })
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.appointmentsService.list(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Book a new consultation (patient only)' })
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAppointmentDto,
  ) {
    const data = await this.appointmentsService.create(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_BOOKED);
  }

  @ApiOperation({
    summary: "Advance the caller (doctor)'s today queue by one step",
  })
  @Post('call-next')
  async callNext(@CurrentUser() user: AuthUser) {
    const data = await this.appointmentsService.callNext(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.QUEUE_TOKEN_UPDATED);
  }

  @ApiOperation({
    summary:
      'Doctor starts an ad-hoc video call with one of their patients, right now, with no pre-booked appointment',
  })
  @Post('instant-call')
  async instantCall(
    @CurrentUser() user: AuthUser,
    @Body() body: InstantCallDto,
  ) {
    const data = await this.appointmentsService.startInstantCall(
      user,
      body.patientId,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_UPDATED);
  }

  @ApiOperation({
    summary: 'Update an appointment status (owner patient or doctor only)',
  })
  @ApiParam({ name: 'id' })
  @Put(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
  ) {
    const data = await this.appointmentsService.updateStatus(
      user,
      id,
      body.status,
      (body as any).cancellationReason,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_UPDATED);
  }

  @ApiOperation({ summary: 'Reschedule an appointment to a new date/time' })
  @ApiParam({ name: 'id' })
  @Post(':id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { newDate: string; newTime: string; reason?: string },
  ) {
    const data = await this.appointmentsService.reschedule(user, id, body);
    return ResponseHelper.success(
      data,
      SUCCESS_MESSAGES.APPOINTMENT_RESCHEDULED,
    );
  }

  @ApiOperation({
    summary:
      "Decline an incoming call — ends it on the caller's side too, like a real phone call",
  })
  @ApiParam({ name: 'id' })
  @Post(':id/decline-call')
  async declineCall(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.appointmentsService.declineCall(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_UPDATED);
  }

  @ApiOperation({
    summary:
      "Real queue position + estimated wait for one of the caller's own appointments, computed from today's actual queue order (not the booked slot time)",
  })
  @ApiParam({ name: 'id' })
  @Get(':id/queue-status')
  async getQueueStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.appointmentsService.getQueueStatus(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Pre-consultation brief: reason for visit, chronic conditions, allergies, current medications, recent lab reports, and an optional AI-written plain-language summary of exactly those facts',
  })
  @ApiParam({ name: 'id' })
  @Get(':id/consult-brief')
  async getConsultBrief(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.appointmentsService.getConsultBrief(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
