import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiParam } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { SUCCESS_MESSAGES } from '../common/constants/messages.constant';

export class BookAppointmentDto {
  @ApiProperty({ example: 1 }) patientId: number;
  @ApiProperty({ example: 2 }) doctorId: number;
  @ApiProperty({ example: '2026-07-20T10:00:00Z' }) appointmentDate: string;
  @ApiProperty({ example: 'Video Consult' }) type: string;
  @ApiProperty({ example: 'Follow-up on PCOS treatment', required: false }) notes?: string;
}

export class RescheduleDto {
  @ApiProperty({ example: '2026-07-25T14:00:00Z' }) newDate: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['completed', 'cancelled', 'no_show'] }) status: string;
}

@ApiTags('Appointments')
@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({ summary: 'Book a new consultation' })
  @ApiResponse({ status: 201 })
  @Post()
  async book(@Body() body: BookAppointmentDto) {
    try {
      const data = await this.appointmentsService.book(body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_BOOKED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get appointment details by ID' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      const data = await this.appointmentsService.getById(Number(id));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id' })
  @Put(':id/cancel')
  async cancel(@Param('id') id: string) {
    try {
      const data = await this.appointmentsService.cancel(Number(id));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_CANCELLED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Reschedule an appointment' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id' })
  @Put(':id/reschedule')
  async reschedule(@Param('id') id: string, @Body() body: RescheduleDto) {
    try {
      const data = await this.appointmentsService.reschedule(Number(id), body.newDate);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_RESCHEDULED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Update appointment status' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id' })
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    try {
      const data = await this.appointmentsService.updateStatus(Number(id), body.status);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.APPOINTMENT_UPDATED);
    } catch (error) { throw error; }
  }
}
