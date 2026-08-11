import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { Appointment, AppointmentStatus, AppointmentType } from '@/shared/interfaces/appointment.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateAppointmentDto } from '@/modules/appointments/controllers/appointments.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  private appointmentWhen(a: Appointment) {
    return `${a.scheduled_date} at ${a.scheduled_time}`;
  }

  /** Shared "ring the patient" notify, used by every path that puts a video
   * appointment into `In Progress` under the doctor's action: direct Join
   * Call and instant calls (queue advance in callNext() has its own,
   * differently-worded "It's Your Turn" notification). */
  private async notifyIncomingCall(patientId: string, doctorName: string, appointmentId: string) {
    await this.notifications.create(patientId, {
      type: 'appointment_called',
      title: 'Incoming Video Call',
      message: `Dr. ${doctorName} is calling you now.`,
      data: { appointmentId },
    });
  }

  private typeLabel(type: AppointmentType | string) {
    return type === AppointmentType.VIDEO ? 'video consultation' : 'clinic visit';
  }

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
    // DOCTOR_NOT_FOUND doubles as the message here rather than leaking which
    // doctor IDs exist but aren't verified yet.
    if (!doctor || !doctor.kyc_verified) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

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

    const [withNames] = await this.withNames([saved]);

    await this.notifications.create(body.doctorId, {
      type: 'appointment_requested',
      title: 'New Appointment Request',
      message: `${withNames.patientName} requested a ${this.typeLabel(withNames.type)} on ${this.appointmentWhen(withNames)}.`,
      data: { appointmentId: withNames.id },
    });

    return withNames;
  }

  async updateStatus(user: AuthUser, id: string, status: AppointmentStatus) {
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const { data: saved } = await this.supabase.admin.from('appointments').update({ status }).eq('id', id).select().single();
    const [withNames] = await this.withNames([saved]);

    await this.notifyStatusChange(user, withNames, appointment.status);

    return withNames;
  }

  private async notifyStatusChange(
    actor: AuthUser,
    appointment: Appointment & { patientName: string; doctorName: string },
    previousStatus: AppointmentStatus,
  ) {
    const isDoctorActing = actor.id === appointment.doctor_id;
    const when = this.appointmentWhen(appointment);
    const label = this.typeLabel(appointment.type);

    if (isDoctorActing && appointment.status === AppointmentStatus.UPCOMING) {
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_approved',
        title: 'Appointment Confirmed',
        message: `Dr. ${appointment.doctorName} confirmed your ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });
    } else if (isDoctorActing && appointment.status === AppointmentStatus.CANCELLED) {
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Dr. ${appointment.doctorName} cancelled your ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });
    } else if (!isDoctorActing && appointment.status === AppointmentStatus.CANCELLED) {
      await this.notifications.create(appointment.doctor_id, {
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `${appointment.patientName} cancelled their ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });
    } else if (isDoctorActing && appointment.status === AppointmentStatus.IN_PROGRESS && appointment.type === AppointmentType.VIDEO) {
      // Doctor started a video consult directly (Telemedicine "Join Call"),
      // as opposed to callNext()'s queue-advance path below — both funnel
      // through this same 'appointment_called' type so the frontend rings
      // either way.
      await this.notifyIncomingCall(appointment.patient_id, appointment.doctorName, appointment.id);
    } else if (
      isDoctorActing &&
      previousStatus === AppointmentStatus.IN_PROGRESS &&
      appointment.type === AppointmentType.VIDEO &&
      (appointment.status === AppointmentStatus.DONE || appointment.status === AppointmentStatus.CANCELLED)
    ) {
      // Doctor ended/cancelled a call that was ringing or in progress — let
      // the patient's ring screen (if still showing) dismiss itself.
      await this.notifications.create(appointment.patient_id, {
        type: 'call_cancelled',
        title: 'Call Ended',
        message: 'The doctor ended the call.',
        data: { appointmentId: appointment.id },
      });
    }
  }

  /** Doctor starts an ad-hoc video call with one of their patients right
   * now — no pre-booked slot. Creates the appointment already `In Progress`
   * and rings the patient exactly like a direct "Join Call" would. */
  async startInstantCall(user: AuthUser, patientId: string) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', patientId)
      .eq('role', ProfileRole.PATIENT)
      .single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const now = new Date();
    const { data: saved } = await this.supabase.admin.from('appointments').insert({
      patient_id: patientId,
      doctor_id: user.id,
      specialty: user.profile.specialty,
      type: AppointmentType.VIDEO,
      scheduled_date: now.toISOString().slice(0, 10),
      scheduled_time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      reason: 'Instant video consultation',
      status: AppointmentStatus.IN_PROGRESS,
    }).select().single();

    const [withNames] = await this.withNames([saved]);
    await this.notifyIncomingCall(patientId, withNames.doctorName, withNames.id);

    return withNames;
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
      if (inProgress.type === AppointmentType.VIDEO) {
        // Advancing the queue while the previous patient's ring/call was
        // still active — let their ring screen dismiss itself.
        await this.notifications.create(inProgress.patient_id, {
          type: 'call_cancelled',
          title: 'Call Ended',
          message: 'The doctor ended the call.',
          data: { appointmentId: inProgress.id },
        });
      }
    }

    const waiting = todays.find(a => a.status === AppointmentStatus.WAITING);
    if (waiting) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.IN_PROGRESS }).eq('id', waiting.id);
      await this.notifications.create(waiting.patient_id, {
        type: 'appointment_called',
        title: "It's Your Turn",
        message: `Dr. ${user.profile.full_name} is ready to see you now.`,
        data: { appointmentId: waiting.id },
      });
    }

    const nextUpcoming = todays.find(a => a.status === AppointmentStatus.UPCOMING);
    if (nextUpcoming) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.WAITING }).eq('id', nextUpcoming.id);
    }

    return this.list(user);
  }
}
