import { Controller, Get, Param, Put, Query, Post, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class ScheduleDayDto {
  @ApiProperty() dayOfWeek: number;
  @ApiProperty() startTime: string | null;
  @ApiProperty() endTime: string | null;
}

export class UpdateScheduleDto {
  @ApiProperty({ type: [ScheduleDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  schedule: ScheduleDayDto[];
}

export class CreateExceptionDto {
  @ApiProperty() @IsDateString() exceptionDate: string;
  @ApiProperty() @IsBoolean() isAvailable: boolean;
  @ApiProperty() @IsOptional() @IsString() reason?: string;
}

@ApiTags('Doctors')
@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Public()
  @ApiOperation({ summary: 'Search verified doctors (public directory)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'specialty', required: false })
  @Get('search')
  async search(@Query('q') q?: string, @Query('specialty') specialty?: string) {
    const data = await this.doctorsService.search(q, specialty);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Submit / mark the caller\'s own KYC as verified (doctor only)' })
  @Put('me/kyc')
  async submitKyc(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.verifyKyc(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.KYC_SUBMITTED);
  }

  @ApiOperation({ summary: "Doctor's practice analytics — revenue, consultations, patient demographics (doctor only)" })
  @Get('me/analytics')
  async analytics(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.getAnalytics(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Doctor's own system access logs (what they accessed)" })
  @Get('me/audit-logs')
  async getMyAuditLogs(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.getMyAuditLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Fetch doctor's weekly schedule and upcoming exceptions" })
  @Get('me/schedule')
  async getMySchedule(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.getMySchedule(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Update doctor's weekly schedule" })
  @Put('me/schedule')
  async updateMySchedule(@CurrentUser() user: AuthUser, @Body() body: UpdateScheduleDto) {
    const data = await this.doctorsService.updateMySchedule(user, body);
    return ResponseHelper.success(data, 'Schedule updated successfully');
  }

  @ApiOperation({ summary: "Add a time-off exception" })
  @Post('me/exceptions')
  async addException(@CurrentUser() user: AuthUser, @Body() body: CreateExceptionDto) {
    const data = await this.doctorsService.addException(user, body);
    return ResponseHelper.success(data, 'Exception added successfully');
  }

  @ApiOperation({ summary: "Remove a time-off exception" })
  @Delete('me/exceptions/:id')
  async removeException(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.doctorsService.removeException(user, id);
    return ResponseHelper.success(data, 'Exception removed successfully');
  }

  @Public()
  @ApiOperation({ summary: 'Get available time slots for a doctor on a date (static placeholder)' })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'date', required: true })
  @Get(':doctorId/slots')
  async getAvailableSlots(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    const data = await this.doctorsService.getAvailableSlots(doctorId, date);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
