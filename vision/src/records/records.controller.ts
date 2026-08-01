import { Controller, Get, Post, Body, Param, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiParam } from '@nestjs/swagger';
import { RecordsService } from './records.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { SUCCESS_MESSAGES } from '../common/constants/messages.constant';

/* ─── DTOs ─────────────────────────────────────── */

export class CreatePrescriptionDto {
  @ApiProperty({ example: 1 }) patientId: number;
  @ApiProperty({ example: 2 }) doctorId: number;
  @ApiProperty({ example: 101, required: false }) appointmentId?: number;
  @ApiProperty({ example: 'Metformin 500mg BD\nMyo-Inositol 2g OD' }) medications: string;
  @ApiProperty({ example: 'Take after meals. Review in 4 weeks.', required: false }) instructions?: string;
}

/* ─── Controller ───────────────────────────────── */

@ApiTags('Medical Records')
@Controller('api/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @ApiOperation({ summary: 'Get all prescriptions' })
  @ApiResponse({ status: 200 })
  @Get('prescriptions')
  async getPrescriptions() {
    try {
      const data = await this.recordsService.getAllPrescriptions();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get prescription by ID' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id' })
  @Get('prescriptions/:id')
  async getPrescriptionById(@Param('id') id: string) {
    try {
      const data = await this.recordsService.getPrescriptionById(Number(id));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Create a new prescription' })
  @ApiResponse({ status: 201 })
  @Post('prescriptions')
  async createPrescription(@Body() body: CreatePrescriptionDto) {
    try {
      const data = await this.recordsService.createPrescription(body);
      return ResponseHelper.success(data, SUCCESS_MESSAGES.PRESCRIPTION_ADDED);
    } catch (error) {
      throw error;
    }
  }
}
