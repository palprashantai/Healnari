import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from '@/shared/interfaces/appointment.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateAppointmentDto } from '@/modules/appointments/controllers/appointments.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { AiService } from '@/modules/ai/services/ai.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
    private readonly email: EmailService,
  ) {}

  private appointmentWhen(a: Appointment) {
    return `${a.scheduled_date} at ${a.scheduled_time}`;
  }

  /** Cancelling a paid appointment must actually put the money back on the
   * radar — mark the payment `Refund Pending` (not `Refunded` outright: no
   * money has actually moved yet, only admin.processRefund() actually calls
   * Cashfree's refund API) and file a refund_requests row linked to the
   * payment so admin has what it needs to process a real refund instead of
   * just flipping a status. */
  public async initiateRefundIfPaid(
    appointment: Appointment & { patientName: string },
  ) {
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('appointment_id', appointment.id)
      .eq('status', 'Paid')
      .maybeSingle();

    if (!payment) return;

    await this.supabase.admin
      .from('payments')
      .update({ status: 'Refund Pending' })
      .eq('id', payment.id);
    await this.supabase.admin.from('refund_requests').insert({
      patient_id: appointment.patient_id,
      patient_name: appointment.patientName,
      payment_id: payment.id,
      amount: payment.amount,
      reason: `Appointment cancelled — ${this.appointmentWhen(appointment)}`,
    });
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
    const path =
      calleeRole === ProfileRole.DOCTOR
        ? `/doctor-dashboard/telemedicine?startCall=${appointmentId}`
        : `/patient-dashboard/appointments?joinCall=${appointmentId}`;

    await this.notifications.create(calleeId, {
      type: 'appointment_called',
      title: 'Incoming Video Call',
      message: `${callerLabel} is calling you now.`,
      idempotencyKey: `call_${appointmentId}_${Date.now()}`,
      data: {
        appointmentId,
        calleeRole,
        callerAvatarUrl: callerAvatarUrl || undefined,
        path,
      },
    });
  }

  private typeLabel(type: AppointmentType | string) {
    return type === AppointmentType.VIDEO
      ? 'video consultation'
      : 'clinic visit';
  }

  private async withNames(appointments: any[]) {
    if (!appointments.length) return [];
    return appointments.map((a) => {
      // If the join hasn't been applied (e.g. from an old cache or non-joined query), fallback gracefully
      const pName = a.patient?.full_name || 'Patient';
      const dName = a.doctor?.full_name || 'Doctor';
      const pAvatar = a.patient?.avatar_url || null;
      const dAvatar = a.doctor?.avatar_url || null;

      const out = {
        ...a,
        patientName: pName,
        doctorName: dName,
        patientAvatarUrl: pAvatar,
        doctorAvatarUrl: dAvatar,
      };
      delete out.patient;
      delete out.doctor;
      return out;
    });
  }

  async list(user: AuthUser) {
    const col =
      user.profile.role === ProfileRole.DOCTOR ? 'doctor_id' : 'patient_id';

    // No pagination here (queue/history tabs across both portals expect the
    // full list in memory) — this cap is just a safety bound against an
    // unbounded full scan for very long-tenured accounts.
    const { data: appointments } = await this.supabase.admin
      .from('appointments')
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .eq(col, user.id)
      .order('scheduled_date', { ascending: false })
      .limit(1000);

    return this.withNames(appointments || []);
  }

  async create(user: AuthUser, body: CreateAppointmentDto) {
    if (user.profile.role !== ProfileRole.PATIENT) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }
    const { data: doctor } = await this.supabase.admin
      .from('profiles')
      .select('specialty, kyc_verified, timezone, email, full_name')
      .eq('id', body.doctorId)
      .eq('role', ProfileRole.DOCTOR)
      .maybeSingle();
    // DOCTOR_NOT_FOUND doubles as the message here rather than leaking which
    // doctor IDs exist but aren't verified yet.
    if (!doctor || !doctor.kyc_verified)
      throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    // Prevent booking if the doctor is on an approved leave on this date
    const { data: leaves } = await this.supabase.admin
      .from('leave_requests')
      .select('id')
      .eq('doctor_id', body.doctorId)
      .eq('status', 'Approved')
      .lte('from_date', body.scheduledDate)
      .gte('to_date', body.scheduledDate);

    if (leaves && leaves.length > 0) {
      throw new ConflictException(
        'The doctor is on leave on the requested date.',
      );
    }

    // Prevent booking slots that have already expired in the doctor's timezone
    const isPM = body.scheduledTime.toLowerCase().includes('pm');
    const timeMatches = body.scheduledTime.match(/(\d+):(\d+)/);
    if (timeMatches) {
      let hour = parseInt(timeMatches[1], 10);
      const min = parseInt(timeMatches[2], 10);
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      const scheduledDateTime = new Date(
        `${body.scheduledDate}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`,
      );

      // Get the current time in the doctor's timezone, parsed back into a local Date object for direct comparison
      const doctorTz = doctor.timezone || 'Asia/Kolkata';
      const doctorNowStr = new Date().toLocaleString('en-US', {
        timeZone: doctorTz,
        hour12: false,
      });
      const doctorNow = new Date(doctorNowStr);

      // We allow a 15 minute grace period for ongoing bookings
      const fifteenMinsAgo = new Date(doctorNow.getTime() - 15 * 60000);

      if (scheduledDateTime < fifteenMinsAgo) {
        throw new BadRequestException(
          'Cannot book an appointment in the past.',
        );
      }
    }

    // The unique index (appointments_no_double_booking, migration 0020) is
    // what actually prevents two patients booking the same doctor/date/time
    // under concurrency — the available-slots endpoint filtering is only a
    // UI nicety, not a guarantee, since two requests can race between
    // "fetch available slots" and "book". Postgres error 23505 is that
    // constraint firing; translate it into the clean conflict message
    // instead of letting a raw DB error reach the client.
    const { data: saved, error: insertError } = await this.supabase.admin
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: body.doctorId,
        specialty: body.specialty || doctor.specialty,
        type: body.type,
        scheduled_date: body.scheduledDate,
        scheduled_time: body.scheduledTime,
        reason: body.reason,
        status: AppointmentStatus.REQUESTED,
      })
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505')
        throw new ConflictException(ERROR_MESSAGES.APPOINTMENT_CONFLICT);
      throw insertError;
    }

    const [withNames] = await this.withNames([saved]);

    await this.notifications.create(body.doctorId, {
      type: 'appointment_requested',
      title: 'New Appointment Request',
      message: `${withNames.patientName} requested a ${this.typeLabel(withNames.type)} on ${this.appointmentWhen(withNames)}.`,
      data: { appointmentId: withNames.id },
    });

    // Notify doctor via email
    if (doctor?.email) {
      this.email
        .sendTemplatedMail({
          to: doctor.email,
          slug: 'appointment_requested',
          defaultSubject: `New Appointment Request from ${withNames.patientName}`,
          defaultHtml: `
            <h2 style="color:#3b82f6;margin-top:0;">New Appointment Request</h2>
            <p>Hello Dr. ${doctor.full_name || 'Doctor'},</p>
            <p><strong>${withNames.patientName}</strong> has requested a ${this.typeLabel(withNames.type)}.</p>
            <div style="background:#eff6ff;padding:16px;border-radius:8px;border:1px solid #bfdbfe;margin:16px 0;">
              <p style="margin:4px 0;font-size:13px;color:#1e3a8a;">Requested Date & Time:</p>
              <h3 style="margin:4px 0;color:#1e40af;">${this.appointmentWhen(withNames)}</h3>
              <p style="margin:8px 0 0 0;font-size:12px;color:#1e3a8a;">Reason: <strong>${body.reason || 'Not provided'}</strong></p>
            </div>
            <div style="margin:20px 0;">
              <a href="https://healnari.vercel.app/doctor/telemedicine" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review Request</a>
            </div>
        `,
          variables: {
            doctorName: doctor.full_name || 'Doctor',
            patientName: withNames.patientName,
            when: this.appointmentWhen(withNames),
            label: this.typeLabel(withNames.type),
          },
        })
        .catch(() => {});
    }

    return withNames;
  }

  /** Atomically reschedules an appointment to a new date/time.
   * The DB unique index (appointments_no_double_booking) prevents two
   * appointments from landing on the same doctor/date/time — if the new
   * slot is already taken, Postgres returns 23505 and we translate that
   * to a clean conflict message, exactly like create() does. */
  async reschedule(
    user: AuthUser,
    id: string,
    body: { newDate: string; newTime: string; reason?: string },
  ) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();

    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    // Authorization: only the patient or doctor on this appointment
    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    // Only reschedulable statuses
    const reschedulableStatuses = [
      AppointmentStatus.REQUESTED,
      AppointmentStatus.APPROVED,
      AppointmentStatus.UPCOMING,
    ];
    if (!reschedulableStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot reschedule an appointment that is ${appointment.status.toLowerCase()}. Only pending, approved, or upcoming appointments can be rescheduled.`,
      );
    }

    // Validate the new date is not in the past
    const { data: doctor } = await this.supabase.admin
      .from('profiles')
      .select('timezone')
      .eq('id', appointment.doctor_id)
      .maybeSingle();
    const doctorTz = doctor?.timezone || 'Asia/Kolkata';
    const doctorNowStr = new Date().toLocaleString('en-US', {
      timeZone: doctorTz,
      hour12: false,
    });
    const doctorNow = new Date(doctorNowStr);

    const isPM = body.newTime.toLowerCase().includes('pm');
    const timeMatches = body.newTime.match(/(\d+):(\d+)/);
    if (timeMatches) {
      let hour = parseInt(timeMatches[1], 10);
      const min = parseInt(timeMatches[2], 10);
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      const newDateTime = new Date(
        `${body.newDate}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`,
      );
      if (newDateTime < doctorNow) {
        throw new BadRequestException(
          'Cannot reschedule to a time in the past.',
        );
      }
    }

    // 8-hour cutoff validation for patients
    if (user.id === appointment.patient_id) {
      const isOldPM = appointment.scheduled_time.toLowerCase().includes('pm');
      const oldTimeMatches = appointment.scheduled_time.match(/(\d+):(\d+)/);
      if (oldTimeMatches) {
        let oldHour = parseInt(oldTimeMatches[1], 10);
        const oldMin = parseInt(oldTimeMatches[2], 10);
        if (isOldPM && oldHour < 12) oldHour += 12;
        if (!isOldPM && oldHour === 12) oldHour = 0;
        const oldDateTime = new Date(
          `${appointment.scheduled_date}T${oldHour.toString().padStart(2, '0')}:${oldMin.toString().padStart(2, '0')}:00`,
        );

        const hoursUntilAppointment =
          (oldDateTime.getTime() - doctorNow.getTime()) / (1000 * 60 * 60);
        if (hoursUntilAppointment < 8) {
          throw new BadRequestException(
            'Appointments must be rescheduled at least 8 hours in advance.',
          );
        }
      }
    }

    // Check leave on new date
    const { data: leaves } = await this.supabase.admin
      .from('leave_requests')
      .select('id')
      .eq('doctor_id', appointment.doctor_id)
      .eq('status', 'Approved')
      .lte('from_date', body.newDate)
      .gte('to_date', body.newDate);

    if (leaves && leaves.length > 0) {
      throw new ConflictException(
        'The doctor is on leave on the requested date.',
      );
    }

    // Atomic update — old slot is released, new slot is claimed in one UPDATE.
    // The unique index prevents the new slot from conflicting.
    const { data: updated, error: updateError } = await this.supabase.admin
      .from('appointments')
      .update({
        scheduled_date: body.newDate,
        scheduled_time: body.newTime,
        rescheduled_from_date: appointment.scheduled_date,
        rescheduled_from_time: appointment.scheduled_time,
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: user.id,
        reschedule_reason: body.reason || null,
      })
      .eq('id', id)
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .maybeSingle();

    if (updateError) {
      if (updateError.code === '23505') {
        throw new ConflictException(
          'The new time slot is already booked. Please select a different time.',
        );
      }
      throw updateError;
    }

    const [withNames] = await this.withNames([updated]);
    const isDoctorActing = user.id === appointment.doctor_id;
    const oldWhen = `${appointment.scheduled_date} at ${appointment.scheduled_time}`;
    const newWhen = this.appointmentWhen(withNames);

    // Notify the other party
    const recipientId = isDoctorActing
      ? appointment.patient_id
      : appointment.doctor_id;
    const actorLabel = isDoctorActing
      ? `Dr. ${withNames.doctorName}`
      : withNames.patientName;
    await this.notifications.create(recipientId, {
      type: 'appointment_rescheduled',
      title: 'Appointment Rescheduled',
      message: `${actorLabel} rescheduled the ${this.typeLabel(withNames.type)} from ${oldWhen} to ${newWhen}.`,
      data: { appointmentId: withNames.id },
    });

    return withNames;
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    status: AppointmentStatus,
    cancellationReason?: string,
  ) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    if (appointment.status === status) {
      return (await this.withNames([appointment]))[0];
    }

    // Terminal states cannot be changed
    if (
      appointment.status === AppointmentStatus.DONE ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot change status of an appointment that is already ${appointment.status.toLowerCase()}.`,
      );
    }

    // Patients cannot mark appointments as Done or No Show
    if (
      (status === AppointmentStatus.DONE ||
        status === AppointmentStatus.NO_SHOW) &&
      user.profile.role !== ProfileRole.DOCTOR
    ) {
      throw new ForbiddenException(
        'Only doctors can complete or mark appointments as no-show.',
      );
    }

    // Patients cannot cancel an ongoing consultation
    if (
      status === AppointmentStatus.CANCELLED &&
      appointment.status === AppointmentStatus.IN_PROGRESS &&
      user.id === appointment.patient_id
    ) {
      throw new BadRequestException(
        'Cannot cancel a consultation that has already started.',
      );
    }

    // 8-hour cutoff validation for patients canceling
    if (
      status === AppointmentStatus.CANCELLED &&
      user.id === appointment.patient_id
    ) {
      const { data: doctor } = await this.supabase.admin
        .from('profiles')
        .select('timezone')
        .eq('id', appointment.doctor_id)
        .maybeSingle();
      const doctorTz = doctor?.timezone || 'Asia/Kolkata';
      const doctorNowStr = new Date().toLocaleString('en-US', {
        timeZone: doctorTz,
        hour12: false,
      });
      const doctorNow = new Date(doctorNowStr);

      const isOldPM = appointment.scheduled_time.toLowerCase().includes('pm');
      const oldTimeMatches = appointment.scheduled_time.match(/(\d+):(\d+)/);
      if (oldTimeMatches) {
        let oldHour = parseInt(oldTimeMatches[1], 10);
        const oldMin = parseInt(oldTimeMatches[2], 10);
        if (isOldPM && oldHour < 12) oldHour += 12;
        if (!isOldPM && oldHour === 12) oldHour = 0;
        const oldDateTime = new Date(
          `${appointment.scheduled_date}T${oldHour.toString().padStart(2, '0')}:${oldMin.toString().padStart(2, '0')}:00`,
        );

        const hoursUntilAppointment =
          (oldDateTime.getTime() - doctorNow.getTime()) / (1000 * 60 * 60);
        if (hoursUntilAppointment < 8) {
          throw new BadRequestException(
            'Appointments must be cancelled at least 8 hours in advance.',
          );
        }
      }
    }

    // Build the update payload — add cancellation tracking when relevant
    const updatePayload: Record<string, any> = { status };
    if (status === AppointmentStatus.CANCELLED) {
      updatePayload.cancelled_by = user.id;
      updatePayload.cancelled_at = new Date().toISOString();
      if (cancellationReason)
        updatePayload.cancellation_reason = cancellationReason;
    }

    const { data: saved } = await this.supabase.admin
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .is('deleted_at', null)
      .maybeSingle();
    const [withNames] = await this.withNames([saved]);

    await this.notifyStatusChange(user, withNames, appointment.status);

    return withNames;
  }

  /**
   * Idempotently confirms an appointment after a successful payment.
   * If the appointment is still in REQUESTED status, moves it to UPCOMING.
   */
  public async confirmPaidAppointment(id: string) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!appointment) return null;

    if (
      appointment.status === AppointmentStatus.REQUESTED ||
      appointment.status === AppointmentStatus.APPROVED ||
      appointment.status === 'HOLD'
    ) {
      const { data: updated } = await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.UPCOMING })
        .eq('id', id)
        .select(
          '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url, email), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
        )
        .maybeSingle();

      const [withNames] = await this.withNames([updated]);

      // Notify the doctor that a paid appointment was confirmed
      await this.notifications.create(appointment.doctor_id, {
        type: 'appointment_confirmed',
        title: 'New Appointment Booked',
        message: `${withNames.patientName} booked a ${this.typeLabel(withNames.type)} on ${this.appointmentWhen(withNames)}.`,
        data: { appointmentId: withNames.id },
      });

      // Notify patient
      if (updated.patient?.email) {
        this.email
          .sendTemplatedMail({
            to: updated.patient.email,
            slug: 'appointment_confirmed',
            defaultSubject: `✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}`,
            defaultHtml: `
              <h2 style="color:#10b981;margin-top:0;">✅ Appointment Confirmed</h2>
              <p>Hello {{patientName}},</p>
              <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been fully confirmed after successful payment.</p>
              <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
                <p style="margin:4px 0;font-size:13px;color:#64748b;">Consultation Date & Time:</p>
                <h3 style="margin:4px 0;color:#0f172a;">{{when}}</h3>
                <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Type: <strong>{{label}}</strong></p>
              </div>
              <div style="margin:20px 0;">
                <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Appointment Details</a>
              </div>
              <p style="color:#94a3b8;font-size:11px;">Please log in 5 minutes early to test your camera and audio.</p>
          `,
            variables: {
              patientName: withNames.patientName,
              doctorName: withNames.doctorName,
              when: this.appointmentWhen(withNames),
              label: this.typeLabel(withNames.type),
              dashboardUrl: 'https://app.healnari.com/patient/appointments',
            },
          })
          .catch(() => {});
      }

      return withNames;
    }

    return (await this.withNames([appointment]))[0];
  }

  /** Declining an incoming call must end it on the caller's side too — like
   * hanging up a real phone call, not leaving them staring at a "ringing"
   * screen that never resolves. Reverts an In-Progress call back to Waiting
   * (not Cancelled/Done — declining one call attempt isn't the same as
   * cancelling the whole appointment) and notifies whoever was calling. */
  async declineCall(user: AuthUser, id: string) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const isDoctorDeclining = user.id === appointment.doctor_id;
    const callerId = isDoctorDeclining
      ? appointment.patient_id
      : appointment.doctor_id;
    const callerRole = isDoctorDeclining
      ? ProfileRole.PATIENT
      : ProfileRole.DOCTOR;

    if (appointment.status === AppointmentStatus.IN_PROGRESS) {
      await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.WAITING })
        .eq('id', id);
    }

    await this.notifications.create(callerId, {
      type: 'call_cancelled',
      title: 'Call Declined',
      message: `${isDoctorDeclining ? 'The doctor' : 'The patient'} declined the call.`,
      data: { appointmentId: id, calleeRole: callerRole },
    });

    const { data: saved } = await this.supabase.admin
      .from('appointments')
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    const [withNames] = await this.withNames([saved]);
    return withNames;
  }

  private async notifyStatusChange(
    actor: AuthUser,
    appointment: Appointment & {
      patientName: string;
      doctorName: string;
      patientAvatarUrl: string | null;
      doctorAvatarUrl: string | null;
    },
    previousStatus: AppointmentStatus,
  ) {
    const isDoctorActing = actor.id === appointment.doctor_id;
    const when = this.appointmentWhen(appointment);
    const label = this.typeLabel(appointment.type);

    if (isDoctorActing && appointment.status === AppointmentStatus.APPROVED) {
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_approved',
        title: 'Action Required: Pay to Confirm',
        message: `Dr. ${appointment.doctorName} approved your ${label} request for ${when}. Please complete the payment to confirm.`,
        data: { appointmentId: appointment.id },
      });

      // Send approval/payment request email to patient
      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();
      if (patientProfile?.email) {
        this.email
          .sendTemplatedMail({
            to: patientProfile.email,
            slug: 'appointment_approved',
            defaultSubject: `Action Required: Pay to Confirm your Consultation with Dr. {{doctorName}}`,
            defaultHtml: `
              <h2 style="color:#f59e0b;margin-top:0;">Action Required</h2>
              <p>Hello {{patientName}},</p>
              <p>Your {{label}} request with <strong>Dr. {{doctorName}}</strong> has been approved.</p>
              <div style="background:#fffbeb;padding:16px;border-radius:8px;border:1px solid #fde68a;margin:16px 0;">
                <p style="margin:4px 0;font-size:13px;color:#92400e;">Approved Date & Time:</p>
                <h3 style="margin:4px 0;color:#92400e;">{{when}}</h3>
                <p style="margin:8px 0 0 0;font-size:12px;color:#92400e;">Type: <strong>{{label}}</strong></p>
              </div>
              <p style="font-size: 14px;"><strong>Your appointment is not yet confirmed.</strong> You must complete the payment to secure this time slot.</p>
              <div style="margin:20px 0;">
                <a href="{{dashboardUrl}}" style="background:#f59e0b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Pay Now to Confirm</a>
              </div>
          `,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              dashboardUrl: 'https://app.healnari.com/patient/appointments',
            },
          })
          .catch(() => {});
      }
    } else if (
      isDoctorActing &&
      appointment.status === AppointmentStatus.UPCOMING
    ) {
      // Manual confirmation by doctor (without payment webhook)
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `Dr. ${appointment.doctorName} confirmed your ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });

      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();

      if (patientProfile?.email) {
        this.email
          .sendTemplatedMail({
            to: patientProfile.email,
            slug: 'appointment_confirmed',
            defaultSubject: `✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}`,
            defaultHtml: `
              <h2 style="color:#10b981;margin-top:0;">✅ Appointment Confirmed</h2>
              <p>Hello {{patientName}},</p>
              <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been fully confirmed.</p>
              <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
                <p style="margin:4px 0;font-size:13px;color:#64748b;">Consultation Date & Time:</p>
                <h3 style="margin:4px 0;color:#0f172a;">{{when}}</h3>
                <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Type: <strong>{{label}}</strong></p>
              </div>
              <div style="margin:20px 0;">
                <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Appointment Details</a>
              </div>
              <p style="color:#94a3b8;font-size:11px;">Please log in 5 minutes early to test your camera and audio.</p>
          `,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              dashboardUrl: 'https://app.healnari.com/patient/appointments',
            },
          })
          .catch(() => {});
      }
    } else if (
      isDoctorActing &&
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Dr. ${appointment.doctorName} cancelled your ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });
      await this.initiateRefundIfPaid(appointment);

      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();
      if (patientProfile?.email) {
        this.email
          .sendTemplatedMail({
            to: patientProfile.email,
            slug: 'appointment_cancelled',
            defaultSubject: `Cancelled: Consultation on {{when}}`,
            defaultHtml: `
              <h2 style="color:#e11d48;margin-top:0;">Appointment Cancelled</h2>
              <p>Hello {{patientName}},</p>
              <p>Your {{label}} scheduled for <strong>{{when}}</strong> with Dr. {{doctorName}} has been cancelled.</p>
              <p style="font-size:13px;color:#475569;">If you had already paid for this session, a refund has been initiated to your original payment method.</p>
              <div style="margin:20px 0;">
                <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Book Another Slot</a>
              </div>
          `,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              dashboardUrl: 'https://healnari.vercel.app/patient/appointments',
            },
          })
          .catch(() => {});
      }
    } else if (
      !isDoctorActing &&
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      await this.notifications.create(appointment.doctor_id, {
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `${appointment.patientName} cancelled their ${label} on ${when}.`,
        data: { appointmentId: appointment.id },
      });
      await this.initiateRefundIfPaid(appointment);
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
        await this.notifyIncomingCall(
          appointment.patient_id,
          ProfileRole.PATIENT,
          `Dr. ${appointment.doctorName}`,
          appointment.id,
          appointment.doctorAvatarUrl,
        );
      } else {
        await this.notifyIncomingCall(
          appointment.doctor_id,
          ProfileRole.DOCTOR,
          appointment.patientName,
          appointment.id,
          appointment.patientAvatarUrl,
        );
      }
    } else if (
      isDoctorActing &&
      previousStatus === AppointmentStatus.IN_PROGRESS &&
      appointment.type === AppointmentType.VIDEO &&
      (appointment.status === AppointmentStatus.DONE ||
        appointment.status === AppointmentStatus.CANCELLED)
    ) {
      // Doctor ended/cancelled a call that was ringing or in progress — let
      // the patient's ring screen (if still showing) dismiss itself.
      await this.notifications.create(appointment.patient_id, {
        type: 'call_cancelled',
        title: 'Call Ended',
        message: 'The doctor ended the call.',
        data: {
          appointmentId: appointment.id,
          calleeRole: ProfileRole.PATIENT,
        },
      });
    }
  }

  /** Doctor starts an ad-hoc video call with one of their patients right
   * now — no pre-booked slot. Creates the appointment already `In Progress`
   * and rings the patient exactly like a direct "Join Call" would. */
  async startInstantCall(user: AuthUser, patientId: string) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', patientId)
      .eq('role', ProfileRole.PATIENT)
      .maybeSingle();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data: saved } = await this.supabase.admin
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: user.id,
        specialty: user.profile.specialty,
        type: AppointmentType.VIDEO,
        scheduled_date: localDate,
        scheduled_time: now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        reason: 'Instant video consultation',
        status: AppointmentStatus.IN_PROGRESS,
      })
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .maybeSingle();

    const [withNames] = await this.withNames([saved]);
    await this.notifyIncomingCall(
      patientId,
      ProfileRole.PATIENT,
      `Dr. ${withNames.doctorName}`,
      withNames.id,
      user.profile.avatar_url,
    );

    return withNames;
  }

  /** Advances the calling doctor's today queue: current In Progress -> Done,
   * next Waiting -> In Progress, next Upcoming (by time) -> Waiting. */
  async callNext(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data: todays } = await this.supabase.admin
      .from('appointments')
      .select()
      .eq('doctor_id', user.id)
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true });

    if (!todays) return this.list(user);

    const inProgress = todays.find(
      (a) => a.status === AppointmentStatus.IN_PROGRESS,
    );
    if (inProgress) {
      await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.DONE })
        .eq('id', inProgress.id);
      if (inProgress.type === AppointmentType.VIDEO) {
        // Advancing the queue while the previous patient's ring/call was
        // still active — let their ring screen dismiss itself.
        await this.notifications.create(inProgress.patient_id, {
          type: 'call_cancelled',
          title: 'Call Ended',
          message: 'The doctor ended the call.',
          data: {
            appointmentId: inProgress.id,
            calleeRole: ProfileRole.PATIENT,
          },
        });
      }
    }

    const waiting = todays.find((a) => a.status === AppointmentStatus.WAITING);
    if (waiting) {
      await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.IN_PROGRESS })
        .eq('id', waiting.id);
      await this.notifications.create(waiting.patient_id, {
        type: 'appointment_called',
        title: "It's Your Turn",
        message: `Dr. ${user.profile.full_name} is ready to see you now.`,
        data: {
          appointmentId: waiting.id,
          calleeRole: ProfileRole.PATIENT,
          callerAvatarUrl: user.profile.avatar_url || undefined,
        },
      });
    }

    const nextUpcoming = todays.find(
      (a) => a.status === AppointmentStatus.UPCOMING,
    );
    if (nextUpcoming) {
      await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.WAITING })
        .eq('id', nextUpcoming.id);
    }

    return this.list(user);
  }

  /** No real historical call-duration data exists anywhere in this schema
   * (no call start/end timestamps are recorded) — this is a stated
   * per-consult estimate, not a measured average. Deliberately conservative
   * so the ETA under-promises rather than over-promises. */
  private static readonly AVG_CONSULT_MINUTES: Record<AppointmentType, number> =
    {
      [AppointmentType.VIDEO]: 15,
      [AppointmentType.CLINIC]: 20,
    };

  /** Real position in today's actual queue (the same order callNext()
   * advances through), not the originally booked slot time — a doctor
   * running behind shifts everyone's position and ETA live instead of the
   * patient just watching their booked 4:00 PM come and go. */
  async getQueueStatus(user: AuthUser, id: string) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    if (appointment.status === AppointmentStatus.DONE) {
      return {
        status: appointment.status,
        position: null,
        totalInQueue: 0,
        peopleAhead: 0,
        estimatedWaitMinutes: 0,
      };
    }
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      return {
        status: appointment.status,
        position: null,
        totalInQueue: 0,
        peopleAhead: 0,
        estimatedWaitMinutes: 0,
      };
    }

    const { data: todays } = await this.supabase.admin
      .from('appointments')
      .select('id, status, scheduled_time, type')
      .eq('doctor_id', appointment.doctor_id)
      .eq('scheduled_date', appointment.scheduled_date)
      .in('status', [
        AppointmentStatus.UPCOMING,
        AppointmentStatus.WAITING,
        AppointmentStatus.IN_PROGRESS,
      ])
      .order('scheduled_time', { ascending: true });

    const activeQueue = todays || [];
    const index = activeQueue.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        status: appointment.status,
        position: null,
        totalInQueue: activeQueue.length,
        peopleAhead: 0,
        estimatedWaitMinutes: 0,
      };
    }

    const peopleAhead = index;
    const avgMinutes =
      AppointmentsService.AVG_CONSULT_MINUTES[
        appointment.type as AppointmentType
      ] ?? 15;

    return {
      status: appointment.status,
      position: index + 1,
      totalInQueue: activeQueue.length,
      peopleAhead,
      estimatedWaitMinutes: peopleAhead * avgMinutes,
    };
  }

  /** Structured facts (reason for visit, chronic conditions, allergies,
   * current medications, recent lab reports) plus an optional AI-written
   * plain-language summary of exactly those facts — so a doctor about to
   * start a consultation isn't spending the first few minutes asking
   * questions the patient has already answered elsewhere in the app. The
   * AI summary is best-effort (null when Gemini isn't configured); the
   * structured facts always come through regardless. */
  async getConsultBrief(user: AuthUser, id: string) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const [
      { data: profile },
      { data: record },
      { data: meds },
      { data: labs },
    ] = await Promise.all([
      this.supabase.admin
        .from('profiles')
        .select('full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle(),
      this.supabase.admin
        .from('patient_records')
        .select('chronic_conditions, allergies')
        .is('deleted_at', null)
        .eq('patient_id', appointment.patient_id)
        .maybeSingle(),
      this.supabase.admin
        .from('prescriptions')
        .select('med_name')
        .is('deleted_at', null)
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'Active'),
      this.supabase.admin
        .from('lab_reports')
        .select('test_name, status')
        .is('deleted_at', null)
        .eq('patient_id', appointment.patient_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const facts = {
      patientName: profile?.full_name || 'Patient',
      reason: appointment.reason || null,
      chronicConditions: record?.chronic_conditions || [],
      allergies: record?.allergies || [],
      currentMedications: [...new Set((meds || []).map((m) => m.med_name))],
      recentLabReports: (labs || []).map((l) => ({
        name: l.test_name,
        status: l.status,
      })),
    };

    const aiSummary = await this.ai.summarizeForConsult(facts);

    return { ...facts, aiSummary, aiConfigured: aiSummary !== null };
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'appointments_reminder_24h' })
  async send24HourReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h from now

    const { data: due, error } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id, doctor_id, scheduled_date, scheduled_time, type')
      .in('status', [AppointmentStatus.UPCOMING])
      .is('reminder_24h_sent_at', null)
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());

    if (error || !due?.length) return;

    const { data: claimed } = await this.supabase.admin
      .from('appointments')
      .update({ reminder_24h_sent_at: new Date().toISOString() })
      .in(
        'id',
        due.map((a) => a.id),
      )
      .is('reminder_24h_sent_at', null)
      .select('id, patient_id, doctor_id, scheduled_time, type');

    if (!claimed?.length) return;

    for (const apt of claimed) {
      this.notifications
        .create(apt.patient_id, {
          type: 'appointment_reminder',
          title: 'Upcoming Appointment (24h)',
          message: `You have a ${apt.type} appointment tomorrow at ${apt.scheduled_time}.`,
          data: { appointmentId: apt.id },
        })
        .catch(() => {});
    }
  }

  @Cron('0,30 * * * *', { name: 'appointments_no_show_processor' }) // Every 30 minutes
  async processNoShows() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const { data: noShows, error } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .in('status', [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING])
      .lte('scheduled_at', cutoff.toISOString());

    if (error || !noShows?.length) return;

    const ids = noShows.map((a) => a.id);
    const { error: updateError } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.NO_SHOW })
      .in('id', ids);

    if (updateError) {
      this.logger.error(
        `Failed to mark appointments as NO_SHOW: ${updateError.message}`,
      );
    } else {
      this.logger.log(
        `Marked ${ids.length} overdue appointment(s) as NO_SHOW.`,
      );
    }
  }

  /** Runs every 5 minutes, pushes a reminder to any patient whose upcoming
   * appointment starts in the next ~30 minutes and hasn't been reminded yet
   * (reminder_sent_at is the idempotency guard — without it every run would
   * re-notify the same patient). Reminders only, no attendance prediction —
   * there's no historical no-show dataset in this schema to train on. */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'appointments_reminder_30min' })
  async sendUpcomingReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: due, error } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id, doctor_id, scheduled_date, scheduled_time, type')
      .in('status', [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING])
      .is('reminder_sent_at', null)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());

    if (error) {
      this.logger.warn(`Reminder sweep query failed: ${error.message}`);
      return;
    }
    if (!due?.length) return;

    // AUDIT_REPORT.md OPS-4 — claim first, notify second. The previous
    // notify-then-mark order left a window where two backend instances (once
    // horizontally scaled) could both read the same "due" appointment before
    // either wrote reminder_sent_at, double-sending the reminder. This
    // single UPDATE...WHERE reminder_sent_at IS NULL is atomic per row — a
    // row already claimed by another instance simply won't be in the
    // returned set, so only genuinely-unclaimed rows get notified.
    const { data: claimed, error: claimError } = await this.supabase.admin
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .in(
        'id',
        due.map((a) => a.id),
      )
      .is('reminder_sent_at', null)
      .select('id, patient_id, doctor_id, scheduled_time, type');

    if (claimError || !claimed?.length) return;

    const doctorIds = [...new Set(claimed.map((a) => a.doctor_id))];
    const { data: doctors } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds);
    const doctorNameById = new Map(
      (doctors || []).map((d) => [d.id, d.full_name]),
    );

    // Each create() is independent and already swallows its own errors —
    // fire them concurrently instead of one insert+push round trip at a time.
    await Promise.all(
      claimed.map((apt) =>
        this.notifications
          .create(apt.patient_id, {
            type: 'appointment_reminder',
            title: 'Upcoming appointment',
            message: `Your ${apt.type === AppointmentType.VIDEO ? 'video consultation' : 'clinic visit'} with Dr. ${doctorNameById.get(apt.doctor_id) || ''} is at ${apt.scheduled_time} today. Please be ready a few minutes early.`,
            idempotencyKey: `apt_reminder_${apt.id}_${now.toISOString().slice(0, 10)}`,
            data: {
              appointmentId: apt.id,
              path: '/patient-dashboard/appointments',
            },
          })
          .catch(() => {}),
      ),
    );

    this.logger.log(`Sent ${claimed.length} appointment reminder(s).`);
  }

  /** Runs every 5 minutes alongside the reminder sweep. Projects each
   * waiting patient's real start time from today's actual queue (same
   * position/ETA math as getQueueStatus) and, the first time that drifts
   * more than 15 minutes past their originally booked slot, pushes a
   * "running behind" notice — instead of the patient only finding out by
   * checking the app themselves. delay_notified_at is a one-shot guard, not
   * a repeating alarm: it fires once per appointment, not every 5 minutes
   * for as long as the delay persists. */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'appointments_queue_delay' })
  async sendDelayNotifications() {
    const nowD = new Date();
    const today = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
    const { data: todaysActive, error } = await this.supabase.admin
      .from('appointments')
      .select(
        'id, doctor_id, patient_id, scheduled_time, scheduled_at, status, type, delay_notified_at',
      )
      .eq('scheduled_date', today)
      .in('status', [
        AppointmentStatus.UPCOMING,
        AppointmentStatus.WAITING,
        AppointmentStatus.IN_PROGRESS,
      ])
      .order('scheduled_time', { ascending: true });

    if (error || !todaysActive?.length) return;

    const byDoctor = new Map<string, typeof todaysActive>();
    for (const apt of todaysActive) {
      if (!byDoctor.has(apt.doctor_id)) byDoctor.set(apt.doctor_id, []);
      byDoctor.get(apt.doctor_id)!.push(apt);
    }

    const doctorIds = [...byDoctor.keys()];
    const { data: doctors } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds);
    const doctorNameById = new Map(
      (doctors || []).map((d) => [d.id, d.full_name]),
    );

    const now = Date.now();
    const toMark: string[] = [];
    const candidates = new Map<
      string,
      {
        patientId: string;
        doctorId: string;
        scheduledTime: string;
        delayMinutes: number;
      }
    >();

    for (const [doctorId, queue] of byDoctor) {
      queue.forEach((apt, index) => {
        if (
          apt.status === AppointmentStatus.IN_PROGRESS ||
          apt.delay_notified_at
        )
          return;

        const avgMinutes =
          AppointmentsService.AVG_CONSULT_MINUTES[
            apt.type as AppointmentType
          ] ?? 15;
        const projectedStartMs = now + index * avgMinutes * 60 * 1000;
        const delayMinutes =
          (projectedStartMs - new Date(apt.scheduled_at).getTime()) / 60000;

        if (delayMinutes > 15) {
          toMark.push(apt.id);
          candidates.set(apt.id, {
            patientId: apt.patient_id,
            doctorId,
            scheduledTime: apt.scheduled_time,
            delayMinutes,
          });
        }
      });
    }

    if (!toMark.length) return;

    // AUDIT_REPORT.md OPS-4 — claim first (one atomic batch UPDATE guarded
    // by delay_notified_at IS NULL), notify only what this instance actually
    // won. Same race as sendUpcomingReminders otherwise: two instances could
    // both compute the same candidate list and both notify before either
    // one's mark-as-sent UPDATE lands.
    const { data: claimed } = await this.supabase.admin
      .from('appointments')
      .update({ delay_notified_at: new Date().toISOString() })
      .in('id', toMark)
      .is('delay_notified_at', null)
      .select('id');

    for (const row of claimed || []) {
      const c = candidates.get(row.id);
      if (!c) continue;
      this.notifications
        .create(c.patientId, {
          type: 'appointment_delayed',
          title: 'Running behind schedule',
          message: `Dr. ${doctorNameById.get(c.doctorId) || ''} is running about ${Math.round(c.delayMinutes)} minutes behind for your ${c.scheduledTime} appointment. We'll let you know when it's your turn.`,
          idempotencyKey: `apt_delay_${row.id}_${today}`,
          data: {
            appointmentId: row.id,
            path: '/patient-dashboard/appointments',
          },
        })
        .catch(() => {});
    }

    if (claimed?.length)
      this.logger.log(`Sent ${claimed.length} delay notification(s).`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'appointments_unpaid_release' })
  async releaseUnpaidSlots() {
    // Free any slot where the payment wasn't completed within 5 minutes (legacy)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: expired, error } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.CANCELLED })
      .eq('status', AppointmentStatus.REQUESTED)
      .lt('created_at', fiveMinsAgo)
      .select('id');

    if (error) {
      this.logger.error('Failed to release unpaid requested slots:', error);
    } else if (expired?.length) {
      this.logger.log(
        `Released ${expired.length} unpaid slots due to payment timeout.`,
      );
    }

    // Free explicitly HELD slots that have expired (10 minutes)
    const nowStr = new Date().toISOString();
    const { data: expiredHolds, error: holdError } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.CANCELLED })
      .eq('status', 'HOLD')
      .lt('hold_expires_at', nowStr)
      .select('id');

    if (holdError) {
      this.logger.error('Failed to release expired hold slots:', holdError);
    } else if (expiredHolds?.length) {
      this.logger.log(`Released ${expiredHolds.length} expired hold slots.`);
    }
  }
}
