import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  /** Book a new appointment */
  async book(data: { patientId: number; doctorId: number; appointmentDate: string; type: string; notes?: string }) {
    try {
      const appointmentDate = new Date(data.appointmentDate);
      if (appointmentDate < new Date()) {
        throw new BadRequestException(ERROR_MESSAGES.APPOINTMENT_PAST_DATE);
      }

      // Check for conflicting appointment
      const conflict = await this.appointmentRepository.findOne({
        where: {
          doctor_id: data.doctorId,
          appointment_date: appointmentDate,
          status: AppointmentStatus.SCHEDULED,
        },
      });
      if (conflict) {
        throw new BadRequestException(ERROR_MESSAGES.APPOINTMENT_CONFLICT);
      }

      const appointment = this.appointmentRepository.create({
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        appointment_date: appointmentDate,
        status: AppointmentStatus.SCHEDULED,
        notes: data.notes || undefined,
      });
      return await this.appointmentRepository.save(appointment);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Cancel an appointment */
  async cancel(appointmentId: number) {
    try {
      const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException(ERROR_MESSAGES.APPOINTMENT_ALREADY_CANCELLED);
      }

      appointment.status = AppointmentStatus.CANCELLED;
      return await this.appointmentRepository.save(appointment);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Reschedule an appointment */
  async reschedule(appointmentId: number, newDate: string) {
    try {
      const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

      appointment.appointment_date = new Date(newDate);
      return await this.appointmentRepository.save(appointment);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Update status (complete, no_show) */
  async updateStatus(appointmentId: number, status: string) {
    try {
      const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

      appointment.status = status as AppointmentStatus;
      return await this.appointmentRepository.save(appointment);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Get appointment by ID */
  async getById(appointmentId: number) {
    try {
      const appointment = await this.appointmentRepository.findOne({
        where: { id: appointmentId },
        relations: { patient: { user: true }, doctor: { user: true } },
      });
      if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
      return appointment;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
