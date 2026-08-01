import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { HealthGoal } from './health-goal.entity';
import { CycleLog } from './cycle-log.entity';
import { SymptomLog } from './symptom-log.entity';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(LabResult)
    private readonly labResultRepository: Repository<LabResult>,
    @InjectRepository(HealthGoal)
    private readonly healthGoalRepository: Repository<HealthGoal>,
    @InjectRepository(CycleLog)
    private readonly cycleLogRepository: Repository<CycleLog>,
    @InjectRepository(SymptomLog)
    private readonly symptomLogRepository: Repository<SymptomLog>,
  ) {}

  async getProfile(userId: number) {
    try {
      const patient = await this.patientRepository.findOne({
        where: { user_id: userId },
        relations: { user: true },
      });
      if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);
      return patient;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getDashboardStats(userId: number) {
    try {
      const patient = await this.getProfile(userId);

      const upcomingAppointments = await this.appointmentRepository.count({
        where: { patient_id: patient.id, status: AppointmentStatus.SCHEDULED },
      });
      const activePrescriptions = await this.prescriptionRepository.count({
        where: { patient_id: patient.id },
      });
      const unreadReports = await this.labResultRepository.count({
        where: { patient_id: patient.id, is_reviewed: false },
      });

      const nextAppointment = await this.appointmentRepository.findOne({
        where: { patient_id: patient.id, status: AppointmentStatus.SCHEDULED },
        order: { appointment_date: 'ASC' },
      });
      const nextAppointmentInDays = nextAppointment
        ? Math.ceil((new Date(nextAppointment.appointment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const completedCount = await this.appointmentRepository.count({
        where: { patient_id: patient.id, status: AppointmentStatus.COMPLETED },
      });
      const healthScore = Math.min(100, 50 + completedCount * 5);

      return {
        nextAppointmentInDays,
        upcomingAppointments,
        activePrescriptions,
        healthScore,
        unreadReports,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getUpcomingVisits(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      return await this.appointmentRepository.find({
        where: { patient_id: patient.id, status: AppointmentStatus.SCHEDULED },
        relations: { doctor: { user: true } },
        order: { appointment_date: 'ASC' },
        take: 5,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async onboard(userId: number, data: any) {
    try {
      const patient = await this.getProfile(userId);
      if (data.phone) patient.phone = data.phone;
      if (data.city) patient.city = data.city;
      if (data.date_of_birth) patient.date_of_birth = new Date(data.date_of_birth);
      return await this.patientRepository.save(patient);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateHealthMetrics(userId: number, metrics: any) {
    try {
      const patient = await this.getProfile(userId);
      return { patientId: patient.id, loggedAt: new Date().toISOString(), ...metrics };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getAppointments(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      return await this.appointmentRepository.find({
        where: { patient_id: patient.id },
        relations: { doctor: { user: true } },
        order: { appointment_date: 'DESC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPrescriptions(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      return await this.prescriptionRepository.find({
        where: { patient_id: patient.id },
        relations: { doctor: { user: true } },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getBilling(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      const appointments = await this.appointmentRepository.find({
        where: { patient_id: patient.id, status: AppointmentStatus.COMPLETED },
        relations: { doctor: { user: true } },
        order: { appointment_date: 'DESC' },
      });
      return appointments.map((apt) => ({
        invoiceId: `INV-${1000 + apt.id}`,
        date: apt.appointment_date,
        doctorName: apt.doctor?.user?.name || 'Doctor',
        amount: apt.doctor?.consultation_fee || 0,
        status: 'Paid',
        paymentMethod: 'Razorpay',
      }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async submitSymptomReport(userId: number, data: { symptoms: string[]; severity: number }) {
    try {
      const patient = await this.getProfile(userId);
      const log = this.symptomLogRepository.create({
        patient_id: patient.id,
        symptoms: data.symptoms,
        severity: data.severity,
        review_status: 'pending_review',
      });
      return await this.symptomLogRepository.save(log);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getLabReports(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      const results = await this.labResultRepository.find({
        where: { patient_id: patient.id },
        order: { created_at: 'DESC' },
      });

      const panels = new Map<string, any>();
      for (const r of results) {
        if (!panels.has(r.panel_title)) {
          panels.set(r.panel_title, {
            title: r.panel_title,
            orderedBy: r.ordered_by,
            lab: r.lab_name,
            date: r.created_at,
            results: [],
          });
        }
        panels.get(r.panel_title).results.push({
          name: r.test_name,
          value: r.value,
          ref: r.reference_range,
          status: r.status,
        });
      }
      return { patientId: patient.id, panels: Array.from(panels.values()) };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getHealthGoals(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      return await this.healthGoalRepository.find({
        where: { patient_id: patient.id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async logGoalProgress(userId: number, goalId: number) {
    try {
      const patient = await this.getProfile(userId);
      const goal = await this.healthGoalRepository.findOne({
        where: { id: goalId, patient_id: patient.id },
      });
      if (!goal) throw new NotFoundException('Health goal not found.');
      goal.progress_pct = Math.min(100, goal.progress_pct + 5);
      return await this.healthGoalRepository.save(goal);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCycleData(userId: number) {
    try {
      const patient = await this.getProfile(userId);
      const log = await this.cycleLogRepository.findOne({
        where: { patient_id: patient.id },
        order: { created_at: 'DESC' },
      });

      if (!log) {
        return { currentPhase: null, cycleDay: null, cycleLength: null, message: 'No cycle data logged yet.' };
      }

      return {
        currentPhase: log.current_phase,
        cycleDay: log.current_day,
        cycleLength: log.cycle_length,
        cycleStartDate: log.cycle_start_date,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getFamilyMembers(userId: number) {
    try {
      await this.getProfile(userId);
      return [];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
