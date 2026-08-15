import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiParam, ApiProperty, ApiConsumes } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordsService } from '@/modules/records/services/records.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class MedicineLineDto {
  @ApiProperty({ example: 'Metformin 500mg' }) @IsString() medName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dosage?: string;
  @ApiProperty({ required: false, example: '1-0-1' }) @IsOptional() @IsString() schedule?: string;
  @ApiProperty({ required: false, example: '30 Days' }) @IsOptional() @IsString() duration?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ required: false, example: 'PCOS — IR Subtype' }) @IsOptional() @IsString() diagnosis?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() instructions?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() idempotencyKey?: string;
  @ApiProperty({ required: false, description: 'Base64 image or URL of handwritten/scanned prescription canvas' })
  @IsOptional() @IsString() handwrittenImage?: string;
  @ApiProperty({
    type: [MedicineLineDto],
    description: 'Every medicine written in this visit — all saved as one prescription (shared group_id), not as separate unrelated prescriptions.',
  })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => MedicineLineDto)
  medicines: MedicineLineDto[];
}

export class HandleRefillDto {
  @ApiProperty({ enum: ['approve', 'reject'] }) @IsIn(['approve', 'reject']) action: 'approve' | 'reject';
}

export class ReviewLabReportDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() interpretation?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() doctorAction?: string;
}

export class UploadLabReportDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ required: false, example: 'Serum AMH' }) @IsOptional() @IsString() testName?: string;
  @ApiProperty({ required: false, example: 'Hormonal' }) @IsOptional() @IsString() testCategory?: string;
  @ApiProperty({ required: false, example: 'Dr. Lal PathLabs' }) @IsOptional() @IsString() labName?: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() urgent?: boolean;
  @ApiProperty({ required: false, description: 'Date the test was actually taken (YYYY-MM-DD)' }) @IsOptional() @IsString() reportDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, description: 'Fulfills a pending lab_report_requests row' }) @IsOptional() @IsUUID() requestId?: string;
}

export class RequestLabReportDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ example: 'CBC, TSH' }) @IsString() requestedTests: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dueDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
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

export class CreateCatalogItemDto {
  @ApiProperty({ enum: ['medicine', 'lab_test'] }) @IsIn(['medicine', 'lab_test']) type: 'medicine' | 'lab_test';
  @ApiProperty({ example: 'Metformin ER' }) @IsString() name: string;
  @ApiProperty({ required: false, example: 'Metabolic' }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false, example: '500mg' }) @IsOptional() @IsString() defaultDose?: string;
  @ApiProperty({ required: false, example: '1-0-1' }) @IsOptional() @IsString() defaultFreq?: string;
  @ApiProperty({ required: false, example: 'After Food' }) @IsOptional() @IsString() defaultTiming?: string;
  @ApiProperty({ required: false, example: '90 Days' }) @IsOptional() @IsString() defaultDuration?: string;
  @ApiProperty({ required: false, example: '🌸 PCOS' }) @IsOptional() @IsString() badge?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() instructions?: string;
  @ApiProperty({ required: false, description: 'Admin-only: true to make item global' }) @IsOptional() @IsBoolean() isGlobal?: boolean;
}

export class ProtocolMedDto {
  @ApiProperty({ example: 'Metformin ER 500mg' }) @IsString() name: string;
  @ApiProperty({ required: false, example: '1-0-1' }) @IsOptional() @IsString() schedule?: string;
  @ApiProperty({ required: false, example: '30 Days' }) @IsOptional() @IsString() duration?: string;
  @ApiProperty({ required: false, example: 'After Food' }) @IsOptional() @IsString() timing?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() instructions?: string;
}

export class CreateProtocolDto {
  @ApiProperty({ example: '🌸 PCOS Protocol' }) @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() shortName?: string;
  @ApiProperty({ required: false, example: 'PCOS' }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() badge?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() diagnosis?: string;
  @ApiProperty({ required: false, type: [ProtocolMedDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProtocolMedDto) meds?: ProtocolMedDto[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) labs?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() clinicalNotes?: string;
  @ApiProperty({ required: false, description: 'Admin only: make protocol global' }) @IsOptional() @IsBoolean() isGlobal?: boolean;
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

  @ApiOperation({ summary: "List lab reports (patient: own; doctor: must pass ?patientId=)" })
  @Get('lab-reports')
  async getLabReports(@CurrentUser() user: AuthUser, @Query('patientId') patientId?: string) {
    const data = await this.recordsService.getLabReports(user, patientId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Upload a lab report file (patient uploads their own; doctor may upload on a patient\'s behalf)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  @Post('lab-reports/upload')
  async uploadLabReport(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File, @Body() body: UploadLabReportDto) {
    if (!file) throw new BadRequestException(ERROR_MESSAGES.FILE_REQUIRED);
    const data = await this.recordsService.uploadLabReport(user, file, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_UPLOADED);
  }

  @ApiOperation({ summary: 'Get a short-lived signed URL to view/download a lab report file' })
  @ApiParam({ name: 'id' })
  @Get('lab-reports/:id/url')
  async getLabReportUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.getSignedUrl(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor records review notes and marks a lab report Reviewed' })
  @ApiParam({ name: 'id' })
  @Put('lab-reports/:id/review')
  async reviewLabReport(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ReviewLabReportDto) {
    const data = await this.recordsService.reviewLabReport(user, id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_REVIEWED);
  }

  @ApiOperation({ summary: 'Patient deletes their own report before it has been reviewed' })
  @ApiParam({ name: 'id' })
  @Delete('lab-reports/:id')
  async deleteLabReport(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.deleteLabReport(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_DELETED);
  }

  @ApiOperation({ summary: 'Doctor requests a specific report from a patient' })
  @Post('lab-report-requests')
  async requestLabReport(@CurrentUser() user: AuthUser, @Body() body: RequestLabReportDto) {
    const data = await this.recordsService.requestLabReport(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_REQUESTED);
  }

  @ApiOperation({ summary: "List lab report requests (patient: own; doctor: ones they made, optionally ?patientId=)" })
  @Get('lab-report-requests')
  async listLabReportRequests(@CurrentUser() user: AuthUser, @Query('patientId') patientId?: string) {
    const data = await this.recordsService.listLabReportRequests(user, patientId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor cancels a report request they made' })
  @ApiParam({ name: 'id' })
  @Put('lab-report-requests/:id/cancel')
  async cancelLabReportRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.cancelLabReportRequest(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LAB_REPORT_REQUEST_CANCELLED);
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

  @ApiOperation({ summary: 'Get medicine or lab test catalog items (returns global + doctor custom items)' })
  @Get('catalog')
  async getCatalog(@CurrentUser() user: AuthUser, @Query('type') type?: 'medicine' | 'lab_test') {
    const data = await this.recordsService.getCatalog(user, type);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Add a new medicine or lab test to catalog (doctor custom or admin global)' })
  @Post('catalog')
  async createCatalogItem(@CurrentUser() user: AuthUser, @Body() body: CreateCatalogItemDto) {
    const data = await this.recordsService.createCatalogItem(user, body);
    return ResponseHelper.success(data, 'Catalog item created successfully');
  }

  @ApiOperation({ summary: 'Delete a catalog item' })
  @ApiParam({ name: 'id' })
  @Delete('catalog/:id')
  async deleteCatalogItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recordsService.deleteCatalogItem(user, id);
    return ResponseHelper.success(data, 'Catalog item removed successfully');
  }

  // ── Clinical Protocol Bundles ──

  @ApiOperation({ summary: 'Get clinical protocol bundles (global + doctor-custom)' })
  @Get('protocols')
  async getProtocols(@CurrentUser() user: AuthUser) {
    const data = await this.recordsService.getProtocols(user);
    return ResponseHelper.success(data);
  }

  @ApiOperation({ summary: 'Create a custom clinical protocol bundle' })
  @Post('protocols')
  async createProtocol(@CurrentUser() user: AuthUser, @Body() body: CreateProtocolDto) {
    const data = await this.recordsService.createProtocol(user, body);
    return ResponseHelper.success(data, 'Protocol created successfully');
  }
}

