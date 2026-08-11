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

  /** Shared "ring the other party" notify — works in both directions
   * (doctor calling patient, or patient calling doctor), used by every path
   * that puts a video appointment into `In Progress`: direct Join Call
   * (either side), instant calls, and callNext()'s queue advance (which
   * has its own, differently-worded "It's Your Turn" message but still
   * routes through this for the `calleeRole` tagging). `calleeRole` rides
   * along in `data` so a background push notification's click handler
   * (which has no app state to check) knows which dashboard to deep-link
   * into; `callerAvatarUrl` lets the ring screen (and the OS push
   * notification icon) show the actual caller instead of just initials. */
  private async notifyIncomingCall(
    calleeId: string,
    calleeRole: ProfileRole,
    callerLabel: string,
    appointmentId: string,
    callerAvatarUrl: string | null,
  ) {
    await this.notifications.create(calleeId, {
      type: 'appointment_called',
      title: 'Incoming Video Call',
      message: `${callerLabel} is calling you now.`,
      data: { appointmentId, calleeRole, callerAvatarUrl: callerAvatarUrl || undefined },
    });
  }

  private typeLabel(type: AppointmentType | string) {
    return type === AppointmentType.VIDEO ? 'video consultation' : 'clinic visit';
  }

  private async withNames(appointments: Appointment[]) {
    if (!appointments.length) return [];

    const ids = [...new Set(appointments.flatMap(a => [a.patient_id, a.doctor_id]))];
    const { data: profiles } = await this.supabase.admin.from('profiles').select('id, full_name, avatar_url').in('id', ids);
    const profileById = new Map((profiles || []).map(p => [p.id, p]));

    return appointments.map(a => ({
      ...a,
      patientName: profileById.get(a.patient_id)?.full_name || 'Patient',
      doctorName: profileById.get(a.doctor_id)?.full_name || 'Doctor',
      patientAvatarUrl: profileById.get(a.patient_id)?.avatar_url || null,
      doctorAvatarUrl: profileById.get(a.doctor_id)?.avatar_url || null,
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

  /** Declining an incoming call must end it on the caller's side too — like
   * hanging up a real phone call, not leaving them staring at a "ringing"
   * screen that never resolves. Reverts an In-Progress call back to Waiting
   * (not Cancelled/Done — declining one call attempt isn't the same as
   * cancelling the whole appointment) and notifies whoever was calling. */
  async declineCall(user: AuthUser, id: string) {
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const isDoctorDeclining = user.id === appointment.doctor_id;
    const callerId = isDoctorDeclining ? appointment.patient_id : appointment.doctor_id;
    const callerRole = isDoctorDeclining ? ProfileRole.PATIENT : ProfileRole.DOCTOR;

    if (appointment.status === AppointmentStatus.IN_PROGRESS) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.WAITING }).eq('id', id);
    }

    await this.notifications.create(callerId, {
      type: 'call_cancelled',
      title: 'Call Declined',
      message: `${isDoctorDeclining ? 'The doctor' : 'The patient'} declined the call.`,
      data: { appointmentId: id, calleeRole: callerRole },
    });

    const { data: saved } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    const [withNames] = await this.withNames([saved]);
    return withNames;
  }

  private async notifyStatusChange(
    actor: AuthUser,
    appointment: Appointment & { patientName: string; doctorName: string; patientAvatarUrl: string | null; doctorAvatarUrl: string | null },
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
    } else if (
      appointment.status === AppointmentStatus.IN_PROGRESS &&
      previousStatus !== AppointmentStatus.IN_PROGRESS &&
      appointment.type === AppointmentType.VIDEO
    ) {
      // A video consult just started (direct "Join Call" from either side,
      // or an instant call) — ring whichever party didn't start it.
      // Guarded on the actual transition (not just "status happens to be
      // In Progress") so joining a call the other side already started
      // doesn't re-ring them a second time.
      if (isDoctorActing) {
        await this.notifyIncomingCall(appointment.patient_id, ProfileRole.PATIENT, `Dr. ${appointment.doctorName}`, appointment.id, appointment.doctorAvatarUrl);
      } else {
        await this.notifyIncomingCall(appointment.doctor_id, ProfileRole.DOCTOR, appointment.patientName, appointment.id, appointment.patientAvatarUrl);
      }
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
        data: { appointmentId: appointment.id, calleeRole: ProfileRole.PATIENT },
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
    await this.notifyIncomingCall(patientId, ProfileRole.PATIENT, `Dr. ${withNames.doctorName}`, withNames.id, user.profile.avatar_url);

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
          data: { appointmentId: inProgress.id, calleeRole: ProfileRole.PATIENT },
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
        data: { appointmentId: waiting.id, calleeRole: ProfileRole.PATIENT, callerAvatarUrl: user.profile.avatar_url || undefined },
      });
    }

    const nextUpcoming = todays.find(a => a.status === AppointmentStatus.UPCOMING);
    if (nextUpcoming) {
      await this.supabase.admin.from('appointments').update({ status: AppointmentStatus.WAITING }).eq('id', nextUpcoming.id);
    }

    return this.list(user);
  }
}
