import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { Appointment, AppointmentStatus } from '@/shared/interfaces/appointment.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateAppointmentDto } from '@/modules/appointments/controllers/appointments.controller';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  private async withNames(appointments: Appointment[]) {
    if (!appointments.length) return [];
    
    const ids = [...new Set(appointments.flatMap(a => [a.patient_id, a.doctor_id]))];
    const { data: profiles } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', ids);
    const nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));
    
    return appointments.map(a => ({
      ...a,
      patientName: nameById.get(a.patient_id) || 'Patient',
      doctorName: nameById.get(a.doctor_id) || 'Doctor',
    }));
  }

  async list(user: AuthUser) {
    const col = user.profile.role === ProfileRole.DOCTOR ? 'doctor_id' : 'patient_id';
    
    const { data: appointments } = await this.supabase.admin
      .from('appointments')
      .select()
      .eq(col, user.id)
      .order('scheduled_date', { ascending: false });

    return this.withNames(appointments || []);
  }

  async create(user: AuthUser, body: CreateAppointmentDto) {
    if (user.profile.role !== ProfileRole.PATIENT) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }
    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', body.doctorId).eq('role', ProfileRole.DOCTOR).single();
    if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    const { data: saved } = await this.supabase.admin.from('appointments').insert({
      patient_id: user.id,
      doctor_id: body.doctorId,
      specialty: body.specialty || doctor.specialty,
      type: body.type,
      scheduled_date: body.scheduledDate,
      scheduled_time: body.scheduledTime,
      reason: body.reason,
      status: AppointmentStatus.REQUESTED,
    }).select().single();

    return (await this.withNames([saved]))[0];
  }

  async updateStatus(user: AuthUser, id: string, status: AppointmentStatus) {
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const { data: saved } = await this.supabase.admin.from('appointments').update({ status }).eq('id', id).select().single();
    return (await this.withNames([saved]))[0];
  }

  /** Advances the calling doctor's today queue: current In Progress -> Done,
   * next Waiting -> In Progress, next Upcoming (by time) -> Waiting. */
  async callNext(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const today = new Date().toISOString().slice(0, 10);
    const { data: todays } = await this.supabase.admin
      .from('appointments')
      .select()
      .eq('doctor_id', user.id)
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true });

    if (!todays) return this.list(user);

    const inProgress = todays.find(a => a.status === AppointmentStatus.IN_PROGRESS);
    if (inProgress) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.DONE }).eq('id', inProgress.id);
    }

    const waiting = todays.find(a => a.status === AppointmentStatus.WAITING);
    if (waiting) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.IN_PROGRESS }).eq('id', waiting.id);
    }

    const nextUpcoming = todays.find(a => a.status === AppointmentStatus.UPCOMING);
    if (nextUpcoming) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.WAITING }).eq('id', nextUpcoming.id);
    }

    return this.list(user);
  }
}
