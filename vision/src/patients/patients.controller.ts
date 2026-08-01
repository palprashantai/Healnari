import { Controller, Get, Put, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiHeader } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { SUCCESS_MESSAGES } from '../common/constants/messages.constant';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

export class OnboardDto {
  @ApiProperty({ example: '28' }) age: string;
  @ApiProperty({ example: '165' }) height: string;
  @ApiProperty({ example: '62' }) weight: string;
  @ApiProperty({ example: 'B+' }) bloodGroup: string;
  @ApiProperty({ example: ['PCOS / PCOD', 'Thyroid Issues'], type: [String] }) conditions: string[];
  @ApiProperty({ example: '123-456-7890', required: false }) phone?: string;
  @ApiProperty({ example: 'Mumbai', required: false }) city?: string;
  @ApiProperty({ example: '1998-03-15', required: false }) date_of_birth?: string;
}

export class HealthMetricsDto {
  @ApiProperty({ example: '120/80', required: false }) bloodPressure?: string;
  @ApiProperty({ example: '65', required: false }) weight?: string;
  @ApiProperty({ example: 'Moderate', required: false }) exerciseLevel?: string;
  @ApiProperty({ example: 7.5, required: false }) sleepHours?: number;
}

export class SymptomReportDto {
  @ApiProperty({ example: ['Cramps', 'Bloating', 'Fatigue'], type: [String] }) symptoms: string[];
  @ApiProperty({ example: 6, minimum: 1, maximum: 10 }) severity: number;
}

export class LogGoalDto {
  @ApiProperty({ example: 1 }) goalId: number;
}

@ApiTags('Patients')
@Controller('api/patients')
@ApiHeader({ name: 'Authorization', description: 'Bearer <user_id>', required: true })
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  private extractUserId(headers: any): number {
    const auth = headers['authorization'];
    if (!auth) throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    const userId = parseInt(auth.split(' ')[1], 10);
    if (isNaN(userId)) throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    return userId;
  }

  @ApiOperation({ summary: 'Dashboard stats (stat strip cards)' })
  @ApiResponse({ status: 200 })
  @Get('me/dashboard')
  async getDashboard(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getDashboardStats(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Patient profile (header welcome)' })
  @ApiResponse({ status: 200 })
  @Get('me')
  async getProfile(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getProfile(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Complete onboarding (age, bloodGroup, conditions)' })
  @ApiResponse({ status: 200 })
  @Put('me/onboard')
  async onboard(@Headers() headers: any, @Body() body: OnboardDto) {
    try {
      const data = await this.patientsService.onboard(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.ONBOARDING_COMPLETE);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Update daily health metrics' })
  @ApiResponse({ status: 200 })
  @Put('me/health-metrics')
  async updateHealthMetrics(@Headers() headers: any, @Body() body: HealthMetricsDto) {
    try {
      const data = await this.patientsService.updateHealthMetrics(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.HEALTH_METRICS_UPDATED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Upcoming sidebar visits (dashboard sidebar)' })
  @ApiResponse({ status: 200 })
  @Get('me/upcoming-visits')
  async getUpcomingVisits(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getUpcomingVisits(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get menstrual cycle tracking data' })
  @ApiResponse({ status: 200 })
  @Get('me/cycle')
  async getCycleData(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getCycleData(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Submit symptom report to care team' })
  @ApiResponse({ status: 201 })
  @Post('me/symptoms')
  async submitSymptomReport(@Headers() headers: any, @Body() body: SymptomReportDto) {
    try {
      const data = await this.patientsService.submitSymptomReport(this.extractUserId(headers), body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.SYMPTOM_REPORT_SUBMITTED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get health goals and progress' })
  @ApiResponse({ status: 200 })
  @Get('me/goals')
  async getHealthGoals(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getHealthGoals(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Log daily goal progress' })
  @ApiResponse({ status: 200 })
  @Post('me/goals/log')
  async logGoalProgress(@Headers() headers: any, @Body() body: LogGoalDto) {
    try {
      const data = await this.patientsService.logGoalProgress(this.extractUserId(headers), body.goalId);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.GOAL_LOGGED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Full appointment history (upcoming + past)' })
  @ApiResponse({ status: 200 })
  @Get('me/appointments')
  async getAppointments(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getAppointments(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Digital prescriptions list' })
  @ApiResponse({ status: 200 })
  @Get('me/prescriptions')
  async getPrescriptions(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getPrescriptions(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Get lab reports and hormonal panels' })
  @ApiResponse({ status: 200 })
  @Get('me/lab-reports')
  async getLabReports(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getLabReports(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Billing invoices & payment history' })
  @ApiResponse({ status: 200 })
  @Get('me/billing')
  async getBilling(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getBilling(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Linked family member accounts' })
  @ApiResponse({ status: 200 })
  @Get('me/family')
  async getFamilyMembers(@Headers() headers: any) {
    try {
      const data = await this.patientsService.getFamilyMembers(this.extractUserId(headers));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }
}
