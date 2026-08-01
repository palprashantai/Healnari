import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription } from './prescription.entity';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
  ) {}

  /** Get all prescriptions (for admin or cross-module use) */
  async getAllPrescriptions() {
    try {
      return await this.prescriptionRepository.find({
        relations: { patient: { user: true }, doctor: { user: true } },
        order: { id: 'DESC' },
      });
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Get a single prescription by ID */
  async getPrescriptionById(id: number) {
    try {
      const rx = await this.prescriptionRepository.findOne({
        where: { id },
        relations: { patient: { user: true }, doctor: { user: true } },
      });
      if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
      return rx;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Create a prescription */
  async createPrescription(data: any) {
    try {
      const prescription = this.prescriptionRepository.create({
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        appointment_id: data.appointmentId || undefined,
        medications: data.medications,
        instructions: data.instructions || undefined,
      });
      return await this.prescriptionRepository.save(prescription);
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
