import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { PatientsService } from '@/modules/patients/services/patients.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class CreatePatientDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bloodGroup?: string;
}

export class UpdatePatientDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dob?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bloodGroup?: string;
  @ApiProperty({ required: false }) @IsOptional() heightCm?: number;
  @ApiProperty({ required: false }) @IsOptional() weightKg?: number;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() allergies?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() chronicConditions?: string[];
}

export class LogCycleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() phase?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() flow?: string;
  @ApiProperty({ required: false }) @IsOptional() cramps?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() mood?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() symptoms?: string[];
}

@ApiTags('Patients')
@Controller('api/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

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

  @ApiOperation({ summary: "Update the caller's own patient record" })
  @Put('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: UpdatePatientDto) {
    const data = await this.patientsService.update(user, user.id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }

  @ApiOperation({ summary: "Get the caller's own cycle log entries" })
  @Get('me/cycle-logs')
  async getCycleLogs(@CurrentUser() user: AuthUser) {
    const data = await this.patientsService.getCycleLogs(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Upsert a cycle log entry for a given date (YYYY-MM-DD)' })
  @ApiParam({ name: 'date' })
  @Put('me/cycle-logs/:date')
  async logCycle(@CurrentUser() user: AuthUser, @Param('date') date: string, @Body() body: LogCycleDto) {
    const data = await this.patientsService.logCycle(user, date, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor updates a patient record by id' })
  @ApiParam({ name: 'id' })
  @Put(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdatePatientDto) {
    const data = await this.patientsService.update(user, id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PROFILE_UPDATED);
  }
}
