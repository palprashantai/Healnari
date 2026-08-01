import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { RefillRequest } from './refill-request.entity';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(LabResult)
    private readonly labResultRepository: Repository<LabResult>,
    @InjectRepository(RefillRequest)
    private readonly refillRequestRepository: Repository<RefillRequest>,
  ) {}

  async getProfile(userId: number) {
    try {
      const doctor = await this.doctorRepository.findOne({
        where: { user_id: userId },
        relations: { user: true },
      });
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
      return doctor;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getDashboardStats(userId: number) {
    try {
      const doctor = await this.getProfile(userId);

      const totalAppointments = await this.appointmentRepository.count({ where: { doctor_id: doctor.id } });
      const completedAppointments = await this.appointmentRepository.count({
        where: { doctor_id: doctor.id, status: AppointmentStatus.COMPLETED },
      });

      const uniquePatients = await this.appointmentRepository
        .createQueryBuilder('appointment')
        .select('COUNT(DISTINCT appointment.patient_id)', 'count')
        .where('appointment.doctor_id = :doctorId', { doctorId: doctor.id })
        .getRawOne();

      const pendingLabReviews = await this.labResultRepository.count({
        where: { is_reviewed: false },
      });

      const pendingRefills = await this.refillRequestRepository.count({
        where: { doctor_id: doctor.id, status: 'pending' },
      });

      return {
        todayQueue: await this.appointmentRepository.count({
          where: { doctor_id: doctor.id, status: AppointmentStatus.SCHEDULED },
        }),
        totalPatients: parseInt(uniquePatients?.count || '0', 10),
        weekRevenue: completedAppointments * Number(doctor.consultation_fee),
        avgRating: doctor.rating,
        totalConsults: totalAppointments,
        completedConsults: completedAppointments,
        pendingLabReviews,
        pendingRefills,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getTodayQueue(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      const appointments = await this.appointmentRepository.find({
        where: { doctor_id: doctor.id, status: AppointmentStatus.SCHEDULED },
        relations: { patient: { user: true } },
        order: { appointment_date: 'ASC' },
        take: 10,
      });

      return appointments.map((apt, i) => ({
        id: apt.id,
        token: `T-${String(i + 1).padStart(2, '0')}`,
        name: apt.patient?.user?.name || 'Patient',
        patientId: apt.patient_id,
        type: apt.notes || 'General Consultation',
        time: apt.appointment_date,
        status: apt.status,
      }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateQueueStatus(userId: number, appointmentId: number, status: string) {
    try {
      const doctor = await this.getProfile(userId);
      const appointment = await this.appointmentRepository.findOne({
        where: { id: appointmentId, doctor_id: doctor.id },
      });
      if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

      if (status === 'Done' || status === 'completed') {
        appointment.status = AppointmentStatus.COMPLETED;
      } else if (status === 'No Show') {
        appointment.status = AppointmentStatus.NO_SHOW;
      } else if (status === 'cancelled') {
        appointment.status = AppointmentStatus.CANCELLED;
      }
      return await this.appointmentRepository.save(appointment);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPendingLabs(userId: number) {
    try {
      await this.getProfile(userId);
      return await this.labResultRepository.find({
        where: { is_reviewed: false },
        relations: { patient: { user: true } },
        order: { created_at: 'DESC' },
        take: 10,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRefillRequests(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      return await this.refillRequestRepository.find({
        where: { doctor_id: doctor.id, status: 'pending' },
        relations: { patient: { user: true } },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async handleRefill(userId: number, refillId: number, action: string) {
    try {
      const doctor = await this.getProfile(userId);
      const refill = await this.refillRequestRepository.findOne({
        where: { id: refillId, doctor_id: doctor.id },
      });
      if (!refill) throw new NotFoundException(ERROR_MESSAGES.REFILL_NOT_FOUND);
      refill.status = action;
      return await this.refillRequestRepository.save(refill);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPatients(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      const appointments = await this.appointmentRepository.find({
        where: { doctor_id: doctor.id },
        relations: { patient: { user: true } },
      });

      const patientMap = new Map();
      for (const appt of appointments) {
        if (appt.patient && !patientMap.has(appt.patient_id)) {
          patientMap.set(appt.patient_id, {
            id: appt.patient.id,
            name: appt.patient.user?.name || 'Patient',
            phone: appt.patient.phone,
            city: appt.patient.city,
            lastVisit: appt.appointment_date,
          });
        }
      }
      return Array.from(patientMap.values());
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getAppointments(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      return await this.appointmentRepository.find({
        where: { doctor_id: doctor.id },
        relations: { patient: { user: true } },
        order: { appointment_date: 'DESC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPrescriptions(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      return await this.prescriptionRepository.find({
        where: { doctor_id: doctor.id },
        relations: { patient: { user: true } },
        order: { id: 'DESC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async writePrescription(userId: number, data: any) {
    try {
      const doctor = await this.getProfile(userId);
      const prescription = this.prescriptionRepository.create({
        doctor_id: doctor.id,
        patient_id: data.patientId,
        appointment_id: data.appointmentId || undefined,
        medications: data.medications,
        instructions: data.instructions || undefined,
      });
      return await this.prescriptionRepository.save(prescription);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(userId: number, data: any) {
    try {
      const doctor = await this.getProfile(userId);
      if (data.specialization) doctor.specialization = data.specialization;
      if (data.consultation_fee) doctor.consultation_fee = data.consultation_fee;
      return await this.doctorRepository.save(doctor);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async submitKyc(userId: number, data: any) {
    try {
      const doctor = await this.getProfile(userId);
      return {
        doctorId: doctor.id,
        qualifications: data.qualifications,
        licenseNumber: data.licenseNumber,
        submittedAt: new Date().toISOString(),
        status: 'pending_review',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async searchDoctors(query?: string, specialty?: string) {
    try {
      const qb = this.doctorRepository.createQueryBuilder('doctor')
        .leftJoinAndSelect('doctor.user', 'user');
      if (specialty) qb.andWhere('doctor.specialization = :specialty', { specialty });
      if (query) qb.andWhere('user.name LIKE :query', { query: `%${query}%` });
      return await qb.orderBy('doctor.rating', 'DESC').getMany();
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getAvailableSlots(doctorId: number, date: string) {
    try {
      const doctor = await this.doctorRepository.findOne({ where: { id: doctorId } });
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      const allSlots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];
      return { doctorId, date, availableSlots: allSlots, fee: doctor.consultation_fee };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getStaff(userId: number) {
    try {
      await this.getProfile(userId);
      return [];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getReports(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      const totalConsults = await this.appointmentRepository.count({ where: { doctor_id: doctor.id } });
      const completed = await this.appointmentRepository.count({
        where: { doctor_id: doctor.id, status: AppointmentStatus.COMPLETED },
      });
      const cancelled = await this.appointmentRepository.count({
        where: { doctor_id: doctor.id, status: AppointmentStatus.CANCELLED },
      });

      return {
        totalConsultations: totalConsults,
        completed,
        cancelled,
        noShow: totalConsults - completed - cancelled,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getBillingData(userId: number) {
    try {
      const doctor = await this.getProfile(userId);
      const completedCount = await this.appointmentRepository.count({
        where: { doctor_id: doctor.id, status: AppointmentStatus.COMPLETED },
      });
      const totalEarnings = completedCount * Number(doctor.consultation_fee);

      return {
        totalEarnings,
        pendingPayout: totalEarnings * 0.15,
        platformCommission: '15%',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
