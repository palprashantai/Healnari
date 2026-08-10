import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
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

export class ReviewLabReportDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() interpretation?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() doctorAction?: string;
}

export class CreateLabReportDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ example: 'Serum AMH' }) @IsString() testName: string;
  @ApiProperty({ required: false, example: 'Hormonal' }) @IsOptional() @IsString() testCategory?: string;
  @ApiProperty({ required: false, example: 'Dr. Lal PathLabs' }) @IsOptional() @IsString() labName?: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() urgent?: boolean;
}

export class CreateClinicalNoteDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsString() note: string;
}

export class AddDocumentDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsString() fileName: string;
  @ApiProperty({ required: false, default: 'pdf' }) @IsOptional() @IsString() fileType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() labName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() fileUrl?: string;
}

export class AddVaccinationDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() doses?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() completed?: boolean;
}

export class AddEmergencyContactDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() relation: string;
  @ApiProperty() @IsString() phone: string;
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

  @ApiOperation({ summary: "List lab reports (patient: own; doctor: ones they ordered)" })
  @Get('lab-reports')
  async getLabReports(@CurrentUser() user: AuthUser) {
    const data = await this.recordsService.getLabReports(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Order a lab test for a patient (doctor only)' })
  @Post('lab-reports')
  async createLabReport(@CurrentUser() user: AuthUser, @Body() body: CreateLabReportDto) {
    const data = await this.recordsService.createLabReport(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_TEST_ORDERED);
  }

  @ApiOperation({ summary: 'Doctor records interpretation/action and marks a lab report Completed' })
  @ApiParam({ name: 'id' })
  @Put('lab-reports/:id/review')
  async reviewLabReport(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ReviewLabReportDto) {
    const data = await this.recordsService.reviewLabReport(user, id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_REVIEWED);
  }

  @ApiOperation({ summary: "Add a general clinical/chart note for a patient (doctor only, not tied to a specific appointment)" })
  @Post('notes')
  async addClinicalNote(@CurrentUser() user: AuthUser, @Body() body: CreateClinicalNoteDto) {
    const data = await this.recordsService.addClinicalNote(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.NOTE_SAVED);
  }

  @ApiOperation({ summary: "List a patient's records-vault documents (patient: own; doctor: any)" })
  @Get('documents/:patientId')
  async getDocuments(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    const data = await this.recordsService.getDocuments(user, patientId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Add a document to a patient\'s records vault (metadata only — no file storage yet)' })
  @Post('documents')
  async addDocument(@CurrentUser() user: AuthUser, @Body() body: AddDocumentDto) {
    const data = await this.recordsService.addDocument(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DOCUMENT_UPLOADED);
  }

  @ApiOperation({ summary: 'Remove a document from the records vault' })
  @ApiParam({ name: 'id' })
  @Delete('documents/:id')
  async deleteDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.deleteDocument(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DOCUMENT_DELETED);
  }

  @ApiOperation({ summary: "List a patient's vaccinations (patient: own; doctor: any)" })
  @Get('vaccinations/:patientId')
  async getVaccinations(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    const data = await this.recordsService.getVaccinations(user, patientId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Add a vaccination record' })
  @Post('vaccinations')
  async addVaccination(@CurrentUser() user: AuthUser, @Body() body: AddVaccinationDto) {
    const data = await this.recordsService.addVaccination(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.VACCINATION_ADDED);
  }

  @ApiOperation({ summary: "List a patient's emergency contacts (patient: own; doctor: any)" })
  @Get('emergency-contacts/:patientId')
  async getEmergencyContacts(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    const data = await this.recordsService.getEmergencyContacts(user, patientId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Add an emergency contact' })
  @Post('emergency-contacts')
  async addEmergencyContact(@CurrentUser() user: AuthUser, @Body() body: AddEmergencyContactDto) {
    const data = await this.recordsService.addEmergencyContact(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.CONTACT_ADDED);
  }

  @ApiOperation({ summary: 'Remove an emergency contact' })
  @ApiParam({ name: 'id' })
  @Delete('emergency-contacts/:id')
  async deleteEmergencyContact(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.deleteEmergencyContact(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.CONTACT_DELETED);
  }
}
