import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PatientsService } from '@/modules/patients/services/patients.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class CreatePatientDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() email?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodGroup?: string;
}

export class UpdatePatientDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dob?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodGroup?: string;
  @ApiProperty({ required: false }) @IsOptional() heightCm?: number;
  @ApiProperty({ required: false }) @IsOptional() weightKg?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  allergies?: string[];
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  chronicConditions?: string[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lifeStageMode?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currencyPreference?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(16)
  lutealPhaseDays?: number;
}

export class LogCycleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() phase?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() flow?: string;
  @ApiProperty({ required: false }) @IsOptional() cramps?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() mood?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  symptoms?: string[];
  @ApiProperty({ required: false }) @IsOptional() bbt?: number;
  @ApiProperty({ required: false }) @IsOptional() lhRatio?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cervicalMucus?: string;
}

export class LogVitalDto {
  @ApiProperty() @IsString() value: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() unit?: string;
}

export class LogLifestyleDto {
  @ApiProperty({
    description: 'Map of habit key -> completed',
    example: { sleep: true, water: false },
  })
  @IsObject()
  items: Record<string, boolean>;
}

export class InviteConnectionDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() relation: string;
}

export class UpdateConnectionPermissionsDto {
  @ApiProperty({
    description: 'Map of permission key -> enabled',
    example: { cycleWindow: true, appointments: false, detailedRx: false },
  })
  @IsObject()
  permissions: Record<string, boolean>;
}

export class AddFavoriteDto {
  @ApiProperty() @IsUUID() doctorId: string;
}

export class JoinWaitlistDto {
  @ApiProperty() @IsUUID() doctorId: string;
  @ApiProperty({ example: 'Tomorrow, Morning Slot' })
  @IsString()
  preferredWindow: string;
}

export class QuickFertilityEstimateDto {
  @ApiProperty({
    example: '2026-08-01',
    description: 'First day of your last menstrual period',
  })
  @IsDateString()
  lastPeriodStart: string;
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(15)
  periodDurationDays: number;
  @ApiProperty({ example: 28 })
  @IsInt()
  @Min(15)
  @Max(90)
  cycleLengthDays: number;
  @ApiProperty({ required: false, example: 14 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(16)
  customLutealPhaseDays?: number;
}

@ApiTags('Patients')
@Controller('api/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @ApiOperation({ summary: 'Patient personalized health, appointment, and AI credit analytics' })
  @Get('me/analytics')
  async getMyAnalytics(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getMyAnalytics(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'List all patients (doctor roster view)' })
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.list(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor registers a walk-in patient' })
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreatePatientDto) {
    const data = await this.patientsService.create(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Get the caller's own patient record" })
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getOwn(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: "Get the caller's own PHI audit logs (who accessed their data)",
  })
  @Get('me/audit-logs')
  async getMyAuditLogs(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getOwnAuditLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Update the caller's own patient record" })
  @Put('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdatePatientDto,
  ) {
    const data = await this.patientsService.update(user, user.id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }

  @ApiOperation({ summary: "Get the caller's own cycle log entries" })
  @Get('me/cycle-logs')
  async getCycleLogs(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getCycleLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      "Get the caller's ovulation/fertile-window prediction, derived from cycle log history",
  })
  @Get('me/fertility-prediction')
  async getFertilityPrediction(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getFertilityPrediction(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'One-off calendar estimate from manually-entered last period date + period/cycle length, for patients without 2+ logged cycles yet',
  })
  @Post('me/fertility-prediction/quick-estimate')
  async quickFertilityEstimate(
    @CurrentUser() user: AuthUser,
    @Body() body: QuickFertilityEstimateDto,
  ) {
    const data = await this.patientsService.quickFertilityEstimate(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: 'Upsert a cycle log entry for a given date (YYYY-MM-DD)',
  })
  @ApiParam({ name: 'date' })
  @Put('me/cycle-logs/:date')
  async logCycle(
    @CurrentUser() user: AuthUser,
    @Param('date') date: string,
    @Body() body: LogCycleDto,
  ) {
    const data = await this.patientsService.logCycle(user, date, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: "Get the caller's own vitals (latest + previous reading per key)",
  })
  @Get('me/vitals')
  async getVitals(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getVitals(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Log a new vitals reading (weight, bp, sugar, sleep, or hirsutism)',
  })
  @ApiParam({
    name: 'key',
    enum: ['weight', 'bp', 'sugar', 'sleep', 'hirsutism'],
  })
  @Put('me/vitals/:key')
  async logVital(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() body: LogVitalDto,
  ) {
    const data = await this.patientsService.logVital(user, key, body);
    return ResponseHelper.success(
      data,
      SUCCESS_MESSAGES.HEALTH_METRICS_UPDATED,
    );
  }

  @ApiOperation({ summary: "Get the caller's own daily lifestyle logs" })
  @Get('me/lifestyle-logs')
  async getLifestyleLogs(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getLifestyleLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Upsert the daily lifestyle checklist for a given date (YYYY-MM-DD)',
  })
  @ApiParam({ name: 'date' })
  @Put('me/lifestyle-logs/:date')
  async logLifestyle(
    @CurrentUser() user: AuthUser,
    @Param('date') date: string,
    @Body() body: LogLifestyleDto,
  ) {
    const data = await this.patientsService.logLifestyle(user, date, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.GOAL_LOGGED);
  }

  @ApiOperation({ summary: "Get the caller's own care circle connections" })
  @Get('me/care-connections')
  async getCareConnections(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getCareConnections(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Invite a partner/caregiver into the care circle' })
  @Post('me/care-connections')
  async inviteConnection(
    @CurrentUser() user: AuthUser,
    @Body() body: InviteConnectionDto,
  ) {
    const data = await this.patientsService.inviteConnection(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.CONNECTION_INVITED);
  }

  @ApiOperation({
    summary: 'Update what a care circle connection is allowed to see',
  })
  @ApiParam({ name: 'id' })
  @Put('me/care-connections/:id/permissions')
  async updateConnectionPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateConnectionPermissionsDto,
  ) {
    const data = await this.patientsService.updateConnectionPermissions(
      user,
      id,
      body,
    );
    return ResponseHelper.success(
      data,
      SUCCESS_MESSAGES.CONNECTION_PERMISSIONS_UPDATED,
    );
  }

  @ApiOperation({ summary: 'Remove a care circle connection' })
  @ApiParam({ name: 'id' })
  @Delete('me/care-connections/:id')
  async removeConnection(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.patientsService.removeConnection(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.CONNECTION_REMOVED);
  }

  @ApiOperation({ summary: "Get the caller's favourited doctors" })
  @Get('me/favorites')
  async getFavorites(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getFavorites(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Favourite a doctor' })
  @Post('me/favorites')
  async addFavorite(
    @CurrentUser() user: AuthUser,
    @Body() body: AddFavoriteDto,
  ) {
    const data = await this.patientsService.addFavorite(user, body.doctorId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.FAVORITE_ADDED);
  }

  @ApiOperation({ summary: 'Unfavourite a doctor' })
  @ApiParam({ name: 'doctorId' })
  @Delete('me/favorites/:doctorId')
  async removeFavorite(
    @CurrentUser() user: AuthUser,
    @Param('doctorId') doctorId: string,
  ) {
    const data = await this.patientsService.removeFavorite(user, doctorId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.FAVORITE_REMOVED);
  }

  @ApiOperation({
    summary: "Get the caller's waitlist entries, with computed queue position",
  })
  @Get('me/waitlist')
  async getWaitlist(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getWaitlist(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: "Join a doctor's waitlist for a preferred window" })
  @Post('me/waitlist')
  async joinWaitlist(
    @CurrentUser() user: AuthUser,
    @Body() body: JoinWaitlistDto,
  ) {
    const data = await this.patientsService.joinWaitlist(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.WAITLIST_JOINED);
  }

  @ApiOperation({ summary: 'Leave a waitlist' })
  @ApiParam({ name: 'id' })
  @Delete('me/waitlist/:id')
  async leaveWaitlist(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.patientsService.leaveWaitlist(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.WAITLIST_LEFT);
  }

  @ApiOperation({ summary: 'Doctor updates a patient record by id' })
  @ApiParam({ name: 'id' })
  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdatePatientDto,
  ) {
    const data = await this.patientsService.update(user, id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }
}
