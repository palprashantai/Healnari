import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { RecordsService } from '@/modules/records/services/records.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class CreatePrescriptionDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ example: 'Metformin 500mg' }) @IsString() medName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dosage?: string;
  @ApiProperty({ required: false, example: '1-0-1' }) @IsOptional() @IsString() schedule?: string;
  @ApiProperty({ required: false, example: '30 Days' }) @IsOptional() @IsString() duration?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() instructions?: string;
}

export class HandleRefillDto {
  @ApiProperty({ enum: ['approve', 'reject'] }) @IsIn(['approve', 'reject']) action: 'approve' | 'reject';
}

@ApiTags('Medical Records')
@Controller('api/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @ApiOperation({ summary: "List prescriptions (patient: own; doctor: written by them)" })
  @Get('prescriptions')
  async getPrescriptions(@CurrentUser() user: AuthUser) {
    const data = await this.recordsService.getPrescriptions(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Write a new prescription (doctor only)' })
  @Post('prescriptions')
  async createPrescription(@CurrentUser() user: AuthUser, @Body() body: CreatePrescriptionDto) {
    const data = await this.recordsService.createPrescription(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PRESCRIPTION_ADDED);
  }

  @ApiOperation({ summary: 'Patient requests a refill on their own prescription' })
  @ApiParam({ name: 'id' })
  @Put('prescriptions/:id/request-refill')
  async requestRefill(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.requestRefill(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor approves or rejects a pending refill request' })
  @ApiParam({ name: 'id' })
  @Put('prescriptions/:id/refill')
  async handleRefill(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: HandleRefillDto) {
    const data = await this.recordsService.handleRefill(user, id, body.action);
    const msg = body.action === 'approve' ? SUCCESS_MESSAGES.PRESCRIPTION_REFILL_APPROVED : SUCCESS_MESSAGES.PRESCRIPTION_REFILL_DENIED;
    return ResponseHelper.success(data, msg);
  }

  @ApiOperation({ summary: "List lab reports (patient: own; doctor: all patients')" })
  @Get('lab-reports')
  async getLabReports(@CurrentUser() user: AuthUser) {
    const data = await this.recordsService.getLabReports(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
