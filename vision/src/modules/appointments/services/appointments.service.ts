import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
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
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';
import { CreateAppointmentDto } from '@/modules/appointments/controllers/appointments.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { AiService } from '@/modules/ai/services/ai.service';
import { EmailService } from '@/core/email/email.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import {
  resolveCountryCurrency,
  embedPricingLock,
  extractPricingLock,
  stripPricingLockFromNotes,
  AppointmentPricingLock,
} from '@/core/utils/currency-resolver.util';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
    private readonly email: EmailService,
    private readonly fxRateService: FXRateService,
  ) { }

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

    // Idempotency check: don't create duplicate refund request if one already exists
    const { data: existingRequest } = await this.supabase.admin
      .from('refund_requests')
      .select('id')
      .eq('payment_id', payment.id)
      .maybeSingle();

    if (existingRequest) return;

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

      const pricingLock = extractPricingLock(a);
      const cleanNotes = stripPricingLockFromNotes(a.notes || a.reason);

      const out = {
        ...a,
        notes: cleanNotes,
        reason: cleanNotes || a.reason,
        pricingLock,
        base_fee_amount: pricingLock?.base_fee_amount ?? a.base_fee_amount ?? a.fee ?? null,
        base_fee_currency: pricingLock?.base_fee_currency ?? a.base_fee_currency ?? a.currency ?? 'INR',
        patient_payable_amount: pricingLock?.patient_payable_amount ?? a.patient_payable_amount ?? a.fee ?? null,
        patient_payable_currency: pricingLock?.patient_payable_currency ?? a.patient_payable_currency ?? a.currency ?? 'INR',
        exchange_rate: pricingLock?.exchange_rate ?? a.exchange_rate ?? 1.0,
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
      .is('deleted_at', null)
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
      .select('specialty, kyc_verified, timezone, email, full_name, currency, country, consultation_fee')
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

    // Prevent patient from double-booking themselves across doctors or tabs at the same time
    const { data: patientConflict } = await this.supabase.admin
      .from('appointments')
      .select('id')
      .eq('patient_id', user.id)
      .eq('scheduled_date', body.scheduledDate)
      .eq('scheduled_time', body.scheduledTime)
      .not('status', 'in', '("Cancelled","No Show")')
      .is('deleted_at', null)
      .maybeSingle();

    if (patientConflict) {
      throw new ConflictException(
        'You already have an appointment scheduled for this date and time.',
      );
    }

    // The unique index (appointments_no_double_booking, migration 0020) is
    // what actually prevents two patients booking the same doctor/date/time
    // under concurrency — the available-slots endpoint filtering is only a
    // UI nicety, not a guarantee, since two requests can race between
    // "fetch available slots" and "book". Postgres error 23505 is that

    // ── 1. Doctor's Base Service Fee & Operating Currency ─────────────
    const doctorCountry = (doctor.country || 'IN').toUpperCase().trim();
    const doctorResolved = resolveCountryCurrency(doctor.currency || doctorCountry);
    const doctorCurrency = doctorResolved.currency;
    let doctorBaseFee = Number(doctor.consultation_fee || 0);
    if (doctorBaseFee <= 0) {
      doctorBaseFee = doctorCurrency === 'INR' ? 799 : 29;
    }

    // ── 2. Patient's Payment Currency (Primary rule: India -> INR, others -> USD) ──
    const patientCountry = (body.country || user.profile?.country || 'IN').toUpperCase().trim();
    const patientResolved = resolveCountryCurrency(patientCountry);
    const patientCurrency = patientResolved.currency;

    // ── 3. Transaction-Level FX Conversion & Rounding ─────────────
    let exchangeRate = 1.0;
    let rateSource = 'healnari_treasury_matrix_v1';
    let rateTimestamp = new Date().toISOString();
    let patientPayableAmount = doctorBaseFee;

    if (doctorCurrency !== patientCurrency) {
      const quote = this.fxRateService.getExchangeRate(doctorCurrency, patientCurrency);
      exchangeRate = quote.rate;
      rateSource = quote.source;
      rateTimestamp = quote.timestamp;
      patientPayableAmount = this.fxRateService.roundAmount(doctorBaseFee * exchangeRate, patientCurrency);
    } else {
      patientPayableAmount = this.fxRateService.roundAmount(doctorBaseFee, patientCurrency);
    }

    const pricingLock: AppointmentPricingLock = {
      base_fee_amount: doctorBaseFee,
      base_fee_currency: doctorCurrency,
      patient_payable_amount: patientPayableAmount,
      patient_payable_currency: patientCurrency,
      exchange_rate: exchangeRate,
      exchange_rate_source: rateSource,
      exchange_rate_timestamp: rateTimestamp,
    };

    const notesWithLock = embedPricingLock(body.reason, pricingLock);

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
        notes: notesWithLock,
        status: AppointmentStatus.REQUESTED,
        country: patientResolved.country,
        currency: patientCurrency,
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

    if (!saved) {
      throw new InternalServerErrorException('Failed to save appointment record');
    }

    const [withNames] = await this.withNames([saved]);

    await this.notifications.create(body.doctorId, {
      type: 'appointment_requested',
      title: 'New Consultation Request',
      message: `${withNames.patientName} has requested a ${this.typeLabel(withNames.type)} for ${this.appointmentWhen(withNames)}. Please review the request and respond.`,
      data: { appointmentId: withNames.id, path: '/doctor-dashboard/appointments' },
    });

    // Notify doctor via email
    if (doctor?.email) {
      this.email
        .sendTemplateEmail({
          templateKey: 'appointment_requested',
          to: doctor.email,
          variables: {
            patientName: withNames.patientName,
            doctorName: doctor.full_name || 'Doctor',
            when: this.appointmentWhen(withNames),
            label: this.typeLabel(withNames.type),
            reason: withNames.reason || 'None provided',
            dashboardUrl: this.email.getUrl('/doctor-dashboard/appointments'),
          },
          entityType: 'appointment',
          entityId: withNames.id,
          event: 'appointment_requested',
        })
        .catch(() => { });
    }

    const { data: patientProfile } = await this.supabase.admin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    if (patientProfile?.email) {
      this.email
        .sendTemplateEmail({
          templateKey: 'appointment_requested_patient',
          to: patientProfile.email,
          variables: {
            patientName: withNames.patientName,
            doctorName: withNames.doctorName,
            when: this.appointmentWhen(withNames),
            dashboardUrl: this.email.getUrl('/patient-dashboard/appointments'),
          },
          entityType: 'appointment',
          entityId: withNames.id,
          event: 'appointment_requested_patient',
        })
        .catch(() => { });
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
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url, email), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url, email)',
      )
      .maybeSingle();

    if (updateError) {
      if (updateError.code === '23505') {
        throw new ConflictException({
          message: ERROR_MESSAGES.APPOINTMENT_CONFLICT,
          errorCode: ERROR_CODES.APPOINTMENT_SLOT_UNAVAILABLE,
        });
      }
      this.logger.error(
        `Database error during appointment reschedule (${id}): ${updateError.message}`,
        updateError,
      );
      throw new InternalServerErrorException({
        message: 'Unable to reschedule appointment. Please try again later.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }

    const isDoctorActing = user.id === appointment.doctor_id;
    const recipientEmail = isDoctorActing
      ? updated.patient?.email
      : updated.doctor?.email;

    const [withNames] = await this.withNames([updated]);
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
      title: 'Consultation Rescheduled',
      message: `${actorLabel} has rescheduled the ${this.typeLabel(withNames.type)} from ${oldWhen} to ${newWhen}.`,
      data: {
        appointmentId: withNames.id,
        path: isDoctorActing
          ? '/patient-dashboard/appointments'
          : '/doctor-dashboard/appointments',
      },
    });

    // Send database-driven reschedule email
    if (recipientEmail) {
      this.email
        .sendTemplateEmail({
          templateKey: 'appointment_rescheduled',
          to: recipientEmail,
          variables: {
            patientName: withNames.patientName,
            doctorName: withNames.doctorName,
            oldWhen,
            newWhen,
            label: this.typeLabel(withNames.type),
            dashboardUrl: isDoctorActing
              ? this.email.getUrl('/patient-dashboard/appointments')
              : this.email.getUrl('/doctor-dashboard/appointments'),
          },
          entityType: 'appointment',
          entityId: withNames.id,
          event: 'appointment_rescheduled',
        })
        .catch(() => { });
    }

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
      throw new BadRequestException({
        message: `Cannot change status of an appointment that is already ${appointment.status.toLowerCase()}.`,
        errorCode:
          appointment.status === AppointmentStatus.DONE
            ? ERROR_CODES.APPOINTMENT_ALREADY_COMPLETED
            : ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED,
      });
    }

    const isDoctor = user.id === appointment.doctor_id || user.profile.role === ProfileRole.DOCTOR;
    const isPatient = user.id === appointment.patient_id && !isDoctor;

    // ── Strict Role-Based State Machine Validation ───────────────────
    if (isPatient) {
      if (status === AppointmentStatus.APPROVED) {
        throw new ForbiddenException('Patients cannot approve appointment requests.');
      }
      if (status === AppointmentStatus.DONE || status === AppointmentStatus.NO_SHOW) {
        throw new ForbiddenException('Only doctors can complete or mark appointments as no-show.');
      }
      if (status === AppointmentStatus.IN_PROGRESS) {
        throw new ForbiddenException('Only doctors can initiate a live consultation.');
      }
      if (status === AppointmentStatus.UPCOMING) {
        throw new ForbiddenException('Appointments can only be confirmed via verified payment settlement.');
      }
      if (status === AppointmentStatus.WAITING) {
        if (appointment.status !== AppointmentStatus.UPCOMING) {
          throw new BadRequestException('Cannot enter waiting room for an appointment that is not confirmed.');
        }
      }
      if (status === AppointmentStatus.CANCELLED) {
        if (appointment.status === AppointmentStatus.IN_PROGRESS) {
          throw new BadRequestException('Cannot cancel a consultation that has already started.');
        }
        // 8-hour cutoff validation for patients canceling
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
    }

    if (isDoctor) {
      if (status === AppointmentStatus.APPROVED) {
        if (
          appointment.status !== AppointmentStatus.REQUESTED &&
          appointment.status !== AppointmentStatus.HOLD
        ) {
          throw new BadRequestException(
            `Cannot approve an appointment that is already ${appointment.status.toLowerCase()}.`,
          );
        }
      }
      if (status === AppointmentStatus.UPCOMING) {
        const { data: payment } = await this.supabase.admin
          .from('payments')
          .select('id')
          .eq('appointment_id', id)
          .eq('status', 'Paid')
          .maybeSingle();

        if (!payment) {
          throw new BadRequestException(
            'Appointment cannot be confirmed without a successful payment.',
          );
        }
      }
      if (status === AppointmentStatus.IN_PROGRESS) {
        if (
          appointment.status !== AppointmentStatus.UPCOMING &&
          appointment.status !== AppointmentStatus.WAITING &&
          appointment.status !== AppointmentStatus.IN_PROGRESS
        ) {
          throw new BadRequestException(
            'Cannot start a call for an appointment that is not confirmed or waiting.',
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

    const { data: saved, error: updateError } = await this.supabase.admin
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(
        '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
      )
      .is('deleted_at', null)
      .maybeSingle();

    if (updateError) {
      this.logger.error(`Status update DB error (${id}): ${updateError.message}`, updateError);
      throw new InternalServerErrorException('Failed to update appointment status. Please try again.');
    }
    if (!saved) {
      // Row was concurrently deleted or soft-deleted between our initial select
      // and the update — treat as not-found rather than crashing withNames([null]).
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    }
    const [withNames] = await this.withNames([saved]);

    // Synchronize consultation_requests table if one exists for this patient and doctor
    if (status === AppointmentStatus.APPROVED) {
      await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted', patient_id: appointment.patient_id })
        .eq('doctor_id', appointment.doctor_id)
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'New');
    } else if (status === AppointmentStatus.CANCELLED) {
      await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Closed' })
        .eq('doctor_id', appointment.doctor_id)
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'New');
    }

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
        .in('status', [
          AppointmentStatus.REQUESTED,
          AppointmentStatus.APPROVED,
          'HOLD',
        ])
        .eq('id', id)
        .select(
          '*, patient:profiles!appointments_patient_id_fkey(full_name, avatar_url, email), doctor:profiles!appointments_doctor_id_fkey(full_name, avatar_url)',
        )
        .maybeSingle();

      if (!updated) return null;

      const [withNames] = await this.withNames([updated]);

      // Notify the doctor that a paid appointment was confirmed
      await this.notifications.create(appointment.doctor_id, {
        type: 'appointment_confirmed',
        title: 'Consultation Confirmed',
        message: `${withNames.patientName} has confirmed and paid for their ${this.typeLabel(withNames.type)} on ${this.appointmentWhen(withNames)}.`,
        data: { appointmentId: withNames.id, path: '/doctor-dashboard/appointments' },
      });

      // Notify patient
      if (updated.patient?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_confirmed',
            to: updated.patient.email,
            variables: {
              patientName: withNames.patientName,
              doctorName: withNames.doctorName,
              when: this.appointmentWhen(withNames),
              label: this.typeLabel(withNames.type),
              dashboardUrl: this.email.getUrl('/patient-dashboard/appointments'),
            },
            entityType: 'appointment',
            entityId: withNames.id,
            event: 'appointment_confirmed',
          })
          .catch(() => { });
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
      title: 'Consultation Call Declined',
      message: `${isDoctorDeclining ? 'The doctor' : 'The patient'} is unavailable to connect right now. You can retry in a moment.`,
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
        title: 'Payment Required to Confirm',
        message: `Dr. ${appointment.doctorName} has accepted your ${label} for ${when}. Please complete payment to confirm your booking.`,
        data: {
          appointmentId: appointment.id,
          path: '/patient-dashboard/appointments?tab=action_required',
        },
      });

      // Send approval/payment request email to patient
      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();
      if (patientProfile?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_approved',
            to: patientProfile.email,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              dashboardUrl: this.email.getUrl('/patient-dashboard/appointments?tab=action_required'),
              paymentUrl: this.email.getUrl('/patient-dashboard/appointments?tab=action_required'),
            },
            entityType: 'appointment',
            entityId: appointment.id,
            event: 'appointment_approved',
          })
          .catch(() => { });
      }
    } else if (
      isDoctorActing &&
      appointment.status === AppointmentStatus.UPCOMING
    ) {
      // Manual confirmation by doctor (without payment webhook)
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_confirmed',
        title: 'Consultation Confirmed',
        message: `Your ${label} with Dr. ${appointment.doctorName} is confirmed for ${when}.`,
        data: {
          appointmentId: appointment.id,
          path: '/patient-dashboard/appointments?tab=upcoming',
        },
      });

      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();

      if (patientProfile?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_confirmed',
            to: patientProfile.email,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              dashboardUrl: this.email.getUrl('/patient-dashboard/appointments?tab=upcoming'),
            },
            entityType: 'appointment',
            entityId: appointment.id,
            event: 'appointment_confirmed',
          })
          .catch(() => { });
      }
    } else if (
      isDoctorActing &&
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      await this.notifications.create(appointment.patient_id, {
        type: 'appointment_cancelled',
        title: 'Consultation Cancelled',
        message: `Your ${label} with Dr. ${appointment.doctorName} scheduled for ${when} was cancelled by the doctor. Any advance payment will be refunded to your original payment method.`,
        data: {
          appointmentId: appointment.id,
          path: '/patient-dashboard/appointments?tab=past',
        },
      });
      await this.initiateRefundIfPaid(appointment);

      const { data: patientProfile } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();
      if (patientProfile?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_cancelled',
            to: patientProfile.email,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              cancellationReason: 'Cancelled by specialist due to schedule adjustment.',
              dashboardUrl: this.email.getUrl('/patient-dashboard/appointments?tab=past'),
            },
            entityType: 'appointment',
            entityId: appointment.id,
            event: 'appointment_cancelled',
          })
          .catch(() => { });
      }
    } else if (
      !isDoctorActing &&
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      await this.notifications.create(appointment.doctor_id, {
        type: 'appointment_cancelled',
        title: 'Consultation Cancelled',
        message: `${appointment.patientName} cancelled their ${label} scheduled for ${when}.`,
        data: {
          appointmentId: appointment.id,
          path: '/doctor-dashboard/appointments',
        },
      });
      await this.initiateRefundIfPaid(appointment);

      const [{ data: patientProfile }, { data: doctorProfile }] =
        await Promise.all([
          this.supabase.admin
            .from('profiles')
            .select('email, full_name')
            .eq('id', appointment.patient_id)
            .maybeSingle(),
          this.supabase.admin
            .from('profiles')
            .select('email, full_name')
            .eq('id', appointment.doctor_id)
            .maybeSingle(),
        ]);

      if (patientProfile?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_cancelled',
            to: patientProfile.email,
            variables: {
              patientName: patientProfile.full_name || 'Patient',
              doctorName: appointment.doctorName,
              when,
              label,
              cancellationReason: 'Cancelled by patient.',
              dashboardUrl: this.email.getUrl('/patient-dashboard/appointments?tab=past'),
            },
            entityType: 'appointment',
            entityId: appointment.id,
            event: 'appointment_cancelled',
          })
          .catch(() => { });
      }

      if (doctorProfile?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'appointment_cancelled',
            to: doctorProfile.email,
            variables: {
              patientName: appointment.patientName,
              doctorName: doctorProfile.full_name || 'Doctor',
              when,
              label,
              cancellationReason: 'Cancelled by patient.',
              dashboardUrl: this.email.getUrl('/doctor-dashboard/appointments'),
            },
            entityType: 'appointment',
            entityId: appointment.id,
            event: 'appointment_cancelled_doctor',
          })
          .catch(() => { });
      }
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
        title: 'Consultation Concluded',
        message: 'The consultation call with your doctor has ended.',
        data: {
          appointmentId: appointment.id,
          calleeRole: ProfileRole.PATIENT,
          path: '/patient-dashboard/appointments',
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

    // BUG-008 fix: instant calls must only be initiated for patients the doctor
    // already has a care relationship with (any past/present appointment).
    // Without this, instant calls bypass the entire booking/payment flow and
    // can be placed to arbitrary patients by any verified doctor.
    const { count: relCount } = await this.supabase.admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', user.id)
      .eq('patient_id', patientId)
      .is('deleted_at', null);
    if ((relCount || 0) === 0) {
      throw new ForbiddenException(
        'Instant calls can only be initiated for patients you have previously consulted.',
      );
    }

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
   * next Waiting -> In Progress, next Upcoming (by time) -> Waiting.
   * BUG-012 fix: re-reads the live queue from the DB inside an atomic update
   * to prevent rapid double-calls from advancing the queue twice. */
  async callNext(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Atomically close the current In Progress appointment. We use an
    // UPDATE ... WHERE status = IN_PROGRESS so if a concurrent call already
    // transitioned it, we get 0 rows back and skip double-notification.
    const { data: closedRows } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.DONE })
      .eq('doctor_id', user.id)
      .eq('scheduled_date', today)
      .eq('status', AppointmentStatus.IN_PROGRESS)
      .select('id, patient_id, type');

    if (closedRows?.length) {
      const closed = closedRows[0];
      if (closed.type === AppointmentType.VIDEO) {
        await this.notifications.create(closed.patient_id, {
          type: 'call_cancelled',
          title: 'Consultation Concluded',
          message: 'The consultation call with your doctor has ended.',
          data: {
            appointmentId: closed.id,
            calleeRole: ProfileRole.PATIENT,
            path: '/patient-dashboard/appointments',
          },
        });
      }
    }

    // Atomically advance the first Waiting appointment to In Progress.
    // The subquery approach isn't available in Supabase client, so we
    // read the candidate then update it; the status condition in the
    // update acts as the final atomic guard.
    const { data: waitingList } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id')
      .eq('doctor_id', user.id)
      .eq('scheduled_date', today)
      .eq('status', AppointmentStatus.WAITING)
      .order('scheduled_time', { ascending: true })
      .limit(1);

    const waitingId = waitingList?.[0]?.id;
    const waitingPatientId = waitingList?.[0]?.patient_id;
    if (waitingId) {
      const { data: advanced } = await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.IN_PROGRESS })
        .eq('id', waitingId)
        .eq('status', AppointmentStatus.WAITING) // atomic guard
        .select('id');
      if (advanced?.length) {
        await this.notifications.create(waitingPatientId, {
          type: 'appointment_called',
          title: 'Consultation Starting Now',
          message: `Dr. ${user.profile.full_name} is ready for your consultation. Tap to join your room.`,
          data: {
            appointmentId: waitingId,
            calleeRole: ProfileRole.PATIENT,
            callerAvatarUrl: user.profile.avatar_url || undefined,
            path: '/patient-dashboard/appointments',
          },
        });
      }
    }

    // Advance the next Upcoming appointment to Waiting.
    const { data: upcomingList } = await this.supabase.admin
      .from('appointments')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('scheduled_date', today)
      .eq('status', AppointmentStatus.UPCOMING)
      .order('scheduled_time', { ascending: true })
      .limit(1);

    const upcomingId = upcomingList?.[0]?.id;
    if (upcomingId) {
      await this.supabase.admin
        .from('appointments')
        .update({ status: AppointmentStatus.WAITING })
        .eq('id', upcomingId)
        .eq('status', AppointmentStatus.UPCOMING); // atomic guard
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

    // BUG-011: Uses atomic claim-then-notify pattern (same as sendUpcomingReminders):
    // 1) SELECT candidates with reminder_24h_sent_at IS NULL (identifies due rows)
    // 2) UPDATE ... IS NULL to atomically claim them before sending (prevents duplicate reminders
    //    if two NestJS instances or cron invocations fire at the same moment).
    if (error) {
      this.logger.warn(`24h reminder sweep query failed: ${error.message}`);
      return;
    }
    if (!due?.length) return;

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
        .catch(() => { });
    }
  }

  @Cron('0,30 * * * *', { name: 'appointments_no_show_processor' }) // Every 30 minutes
  async processNoShows() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    // BUG-010 fix: explicitly exclude rows with null scheduled_at (pre-migration
    // appointments) so the intent is clear and the log count is accurate.
    const { data: noShows, error } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .in('status', [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING])
      .not('scheduled_at', 'is', null)
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

  @Cron('0,30 * * * *', { name: 'appointments_unpaid_cancellation_sweep' })
  async processUnpaidApprovals() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // BUG-006 fix: fetch candidate IDs first, then exclude any that have a
    // Pending or Paid payment row — an in-flight gateway payment must not be
    // cancelled by the sweep firing between payment creation and webhook receipt.
    const { data: candidates, error } = await this.supabase.admin
      .from('appointments')
      .select('id')
      .eq('status', AppointmentStatus.APPROVED)
      .lte('updated_at', cutoff.toISOString());

    if (error || !candidates?.length) return;

    const candidateIds = candidates.map((a) => a.id);

    // Exclude any appointment that already has an active payment attempt
    const { data: activePayments } = await this.supabase.admin
      .from('payments')
      .select('appointment_id')
      .in('appointment_id', candidateIds)
      .in('status', ['Pending', 'Paid']);

    const blockedIds = new Set((activePayments || []).map((p) => p.appointment_id));
    const safeToCancel = candidateIds.filter((id) => !blockedIds.has(id));

    if (!safeToCancel.length) return;

    const { data: unpaid, error: fetchError } = await this.supabase.admin
      .from('appointments')
      .select(
        'id, patient_id, doctor_id, scheduled_date, scheduled_time, patient:profiles!appointments_patient_id_fkey(full_name, email), doctor:profiles!appointments_doctor_id_fkey(full_name)',
      )
      .in('id', safeToCancel);

    if (fetchError || !unpaid?.length) return;

    const ids = unpaid.map((a) => a.id);
    const { error: updateError } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.CANCELLED })
      .in('id', ids);

    if (updateError) {
      this.logger.error(
        `Failed to cancel unpaid appointments: ${updateError.message}`,
      );
    } else {
      this.logger.log(
        `Cancelled ${ids.length} unpaid approved appointment(s) (${blockedIds.size} skipped — active payment in flight).`,
      );

      await Promise.all(
        unpaid.map(async (a: any) => {
          this.notifications.create(a.patient_id, {
            type: 'appointment_cancelled',
            title: 'Consultation Request Expired',
            message: `Your consultation request with Dr. ${a.doctor?.full_name || 'your doctor'} has expired because payment was not completed within the time window. You can rebook whenever you are ready.`,
            data: { appointmentId: a.id, path: '/doctors' },
          });

          if (this.email.isConfigured && a.patient?.email) {
            const when = a.scheduled_date ? `${a.scheduled_date} at ${a.scheduled_time}` : 'your requested time';
            await this.email
              .sendTemplateEmail({
                templateKey: 'appointment_unpaid_cancelled',
                to: a.patient.email,
                variables: {
                  patientName: a.patient.full_name || 'Patient',
                  doctorName: a.doctor?.full_name || 'Specialist',
                  when,
                  dashboardUrl: this.email.getUrl('/doctors'),
                },
                entityType: 'appointment',
                entityId: a.id,
                event: 'appointment_unpaid_cancelled',
              })
              .catch((e) =>
                this.logger.error(
                  `Failed to send unpaid cancellation email to ${a.patient.email}`,
                  e.stack,
                ),
              );
          }
        }),
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

    // AUDIT_REPORT.md OPS-4 — claim first, notify second.
    const { data: claimed, error: claimError } = await this.supabase.admin
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .in(
        'id',
        due.map((a) => a.id),
      )
      .is('reminder_sent_at', null)
      .select('id, patient_id, doctor_id, scheduled_time, type, patient:profiles!appointments_patient_id_fkey(full_name, email)');

    if (claimError || !claimed?.length) return;

    const doctorIds = [...new Set(claimed.map((a) => a.doctor_id))];
    const { data: doctors } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds);
    const doctorNameById = new Map(
      (doctors || []).map((d) => [d.id, d.full_name]),
    );

    await Promise.all(
      claimed.map(async (apt: any) => {
        await this.notifications
          .create(apt.patient_id, {
            type: 'appointment_reminder',
            title: 'Upcoming Consultation',
            message: `Your ${apt.type === AppointmentType.VIDEO ? 'video consultation' : 'clinic visit'} with Dr. ${doctorNameById.get(apt.doctor_id) || 'your doctor'} starts at ${apt.scheduled_time} today. Tap to prepare and view your consultation details.`,
            idempotencyKey: `apt_reminder_${apt.id}_${now.toISOString().slice(0, 10)}`,
            data: {
              appointmentId: apt.id,
              path: '/patient-dashboard/appointments',
            },
          })
          .catch(() => { });

        if (apt.patient?.email) {
          this.email
            .sendTemplateEmail({
              templateKey: 'appointment_reminder_upcoming',
              to: apt.patient.email,
              variables: {
                patientName: apt.patient.full_name || 'Patient',
                doctorName: doctorNameById.get(apt.doctor_id) || 'Doctor',
                when: `${apt.scheduled_time} today`,
                label: apt.type === AppointmentType.VIDEO ? 'Video Consultation' : 'Clinic Visit',
                timeRemaining: '30 minutes',
                dashboardUrl: this.email.getUrl('/patient-dashboard/appointments'),
              },
              entityType: 'appointment',
              entityId: apt.id,
              event: 'appointment_reminder_upcoming',
            })
            .catch(() => { });
        }
      }),
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
          title: 'Consultation Schedule Update',
          message: `Dr. ${doctorNameById.get(c.doctorId) || 'Your doctor'} is running approximately ${Math.round(c.delayMinutes)} minutes behind schedule for your ${c.scheduledTime} appointment. Thank you for your patience; we will notify you when your consultation begins.`,
          idempotencyKey: `apt_delay_${row.id}_${today}`,
          data: {
            appointmentId: row.id,
            path: '/patient-dashboard/appointments',
          },
        })
        .catch(() => { });
    }

    if (claimed?.length)
      this.logger.log(`Sent ${claimed.length} delay notification(s).`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'appointments_unpaid_release' })
  async releaseUnpaidSlots() {
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
