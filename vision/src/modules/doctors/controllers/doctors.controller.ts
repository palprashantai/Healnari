import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

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
