import { Controller, Get, Put, Post, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiHeader, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { SUCCESS_MESSAGES } from '../common/constants/messages.constant';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Gynecology', required: false }) specialization?: string;
  @ApiProperty({ example: 799, required: false }) consultation_fee?: number;
}

export class KycSubmissionDto {
  @ApiProperty({ example: 'MD, FACOG' }) qualifications: string;
  @ApiProperty({ example: '123456789' }) licenseNumber: string;
}

export class WritePrescriptionDto {
  @ApiProperty({ example: 1 }) patientId: number;
  @ApiProperty({ example: 101, required: false }) appointmentId?: number;
  @ApiProperty({ example: 'Metformin 500mg BD\nMyo-Inositol 2g OD' }) medications: string;
  @ApiProperty({ example: 'Take after meals. Review in 4 weeks.', required: false }) instructions?: string;
}

export class UpdateQueueStatusDto {
  @ApiProperty({ enum: ['In Progress', 'Waiting', 'Done', 'No Show'] }) status: string;
}

export class HandleRefillDto {
  @ApiProperty({ enum: ['approved', 'denied'] }) action: string;
}

@ApiTags('Doctors')
@Controller('api/doctors')
@ApiHeader({ name: 'Authorization', description: 'Bearer <user_id>', required: true })
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  private extractUserId(headers: any): number {
    const auth = headers['authorization'];
    if (!auth) throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    const userId = parseInt(auth.split(' ')[1], 10);
    if (isNaN(userId)) throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    return userId;
  }

  @ApiOperation({ summary: 'Dashboard stats (6 stat cards)' })
  @ApiResponse({ status: 200 })
  @Get('me/dashboard')
  async getDashboard(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getDashboardStats(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: "Today's patient queue with tokens" })
  @ApiResponse({ status: 200 })
  @Get('me/queue')
  async getTodayQueue(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getTodayQueue(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Update queue token status (e.g. Waiting → In Progress → Done)' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'appointmentId' })
  @Put('me/queue/:appointmentId')
  async updateQueueStatus(
    @Headers() headers: any,
    @Param('appointmentId') appointmentId: string,
    @Body() body: UpdateQueueStatusDto,
  ) {
    try {
      const data = await this.doctorsService.updateQueueStatus(this.extractUserId(headers), Number(appointmentId), body.status);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.QUEUE_TOKEN_UPDATED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Pending lab results awaiting review' })
  @ApiResponse({ status: 200 })
  @Get('me/pending-labs')
  async getPendingLabs(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getPendingLabs(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Prescription refill requests' })
  @ApiResponse({ status: 200 })
  @Get('me/refill-requests')
  async getRefillRequests(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getRefillRequests(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Approve or deny a refill request' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'refillId' })
  @Put('me/refill-requests/:refillId')
  async handleRefill(@Headers() headers: any, @Param('refillId') refillId: string, @Body() body: HandleRefillDto) {
    try {
      const data = await this.doctorsService.handleRefill(this.extractUserId(headers), Number(refillId), body.action);
      const msg = body.action === 'approved' ? SUCCESS_MESSAGES.PRESCRIPTION_REFILL_APPROVED : SUCCESS_MESSAGES.PRESCRIPTION_REFILL_DENIED;
      return ResponseHelper.success(data, msg);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get doctor profile' })
  @ApiResponse({ status: 200 })
  @Get('me')
  async getProfile(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getProfile(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Update doctor profile (specialization, fee)' })
  @ApiResponse({ status: 200 })
  @Put('me/profile')
  async updateProfile(@Headers() headers: any, @Body() body: UpdateProfileDto) {
    try {
      const data = await this.doctorsService.updateProfile(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.PROFILE_UPDATED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Submit KYC documents for verification' })
  @ApiResponse({ status: 201 })
  @Post('me/kyc')
  async submitKyc(@Headers() headers: any, @Body() body: KycSubmissionDto) {
    try {
      const data = await this.doctorsService.submitKyc(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.KYC_SUBMITTED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'List all patients who have consulted with this doctor' })
  @ApiResponse({ status: 200 })
  @Get('me/patients')
  async getPatients(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getPatients(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Doctor appointment history' })
  @ApiResponse({ status: 200 })
  @Get('me/appointments')
  async getAppointments(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getAppointments(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'List prescriptions written by this doctor' })
  @ApiResponse({ status: 200 })
  @Get('me/prescriptions')
  async getPrescriptions(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getPrescriptions(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Write a new digital prescription' })
  @ApiResponse({ status: 201 })
  @Post('me/prescriptions')
  async writePrescription(@Headers() headers: any, @Body() body: WritePrescriptionDto) {
    try {
      const data = await this.doctorsService.writePrescription(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.PRESCRIPTION_ADDED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Analytics and consultation reports' })
  @ApiResponse({ status: 200 })
  @Get('me/reports')
  async getReports(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getReports(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Doctor earnings and payout data' })
  @ApiResponse({ status: 200 })
  @Get('me/billing')
  async getBillingData(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getBillingData(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Manage clinic staff' })
  @ApiResponse({ status: 200 })
  @Get('me/staff')
  async getStaff(@Headers() headers: any) {
    try {
      const data = await this.doctorsService.getStaff(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Search verified doctors (public)' })
  @ApiResponse({ status: 200 })
  @ApiQuery({ name: 'q', required: false, description: 'Name search query' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty' })
  @Get('search')
  async searchDoctors(@Query('q') q?: string, @Query('specialty') specialty?: string) {
    try {
      const data = await this.doctorsService.searchDoctors(q, specialty);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get available time slots for a doctor on a date' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @Get(':doctorId/slots')
  async getAvailableSlots(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    try {
      const data = await this.doctorsService.getAvailableSlots(Number(doctorId), date);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }
}
