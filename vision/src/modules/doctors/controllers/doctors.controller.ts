import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Post,
  Body,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class ScheduleDayDto {
  @ApiProperty({ example: 1, description: '0 = Sunday, 1 = Monday, ... 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ required: false, example: '09:00' })
  @IsOptional()
  @IsString()
  startTime: string | null;

  @ApiProperty({ required: false, example: '17:00' })
  @IsOptional()
  @IsString()
  endTime: string | null;

  @ApiProperty({ required: false, example: '13:00' })
  @IsOptional()
  @IsString()
  lunchStart?: string | null;

  @ApiProperty({ required: false, example: '14:00' })
  @IsOptional()
  @IsString()
  lunchEnd?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxBookingsPerDay?: number | null;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMinutes?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferMinutes?: number;
}

export class UpdateScheduleDto {
  @ApiProperty({ type: [ScheduleDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  schedule: ScheduleDayDto[];
}

export class CreateExceptionDto {
  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  exceptionDate: string;

  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
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

  @ApiOperation({
    summary: "Submit / mark the caller's own KYC as verified (doctor only)",
  })
  @Put('me/kyc')
  async submitKyc(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.verifyKyc(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.KYC_SUBMITTED);
  }

  @ApiOperation({
    summary:
      "Doctor's practice analytics — revenue, consultations, patient demographics (doctor only)",
  })
  @Get('me/analytics')
  @ApiQuery({ name: 'range', required: false, description: 'Time range: 7d, 30d, 6m, ytd, all' })
  async analytics(@CurrentUser() user: AuthUser, @Query('range') range?: string) {
    const data = await this.doctorsService.getAnalytics(user, range);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: "Doctor's own system access logs (what they accessed)",
  })
  @Get('me/audit-logs')
  async getMyAuditLogs(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.getMyAuditLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: "Fetch doctor's weekly schedule and upcoming exceptions",
  })
  @Get('me/schedule')
  async getMySchedule(@CurrentUser() user: AuthUser) {
    const data = await this.doctorsService.getMySchedule(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Update doctor's weekly schedule" })
  @Put('me/schedule')
  async updateMySchedule(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateScheduleDto,
  ) {
    const data = await this.doctorsService.updateMySchedule(user, body);
    return ResponseHelper.success(data, 'Schedule updated successfully');
  }

  @ApiOperation({ summary: 'Add a time-off exception' })
  @Post('me/exceptions')
  async addException(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateExceptionDto,
  ) {
    const data = await this.doctorsService.addException(user, body);
    return ResponseHelper.success(data, 'Exception added successfully');
  }

  @ApiOperation({ summary: 'Remove a time-off exception' })
  @Delete('me/exceptions/:id')
  async removeException(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.doctorsService.removeException(user, id);
    return ResponseHelper.success(data, 'Exception removed successfully');
  }

  @Public()
  @ApiOperation({
    summary:
      'Get available time slots for a doctor on a date (static placeholder)',
  })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'date', required: true })
  @Get(':doctorId/slots')
  async getAvailableSlots(
    @Param('doctorId', new ParseUUIDPipe()) doctorId: string,
    @Query('date') date: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date parameter must be in YYYY-MM-DD format');
    }
    const data = await this.doctorsService.getAvailableSlots(doctorId, date);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
