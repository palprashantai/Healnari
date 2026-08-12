import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { Appointment, AppointmentStatus, AppointmentType } from '@/shared/interfaces/appointment.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateAppointmentDto } from '@/modules/appointments/controllers/appointments.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { AiService } from '@/modules/ai/services/ai.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
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
  private async initiateRefundIfPaid(appointment: Appointment & { patientName: string }) {
    const { data: payment } = await this.supabase.admin
      .from('payments')
      .select()
      .eq('appointment_id', appointment.id)
      .eq('status', 'Paid')
      .maybeSingle();

    if (!payment) return;

    await this.supabase.admin.from('payments').update({ status: 'Refund Pending' }).eq('id', payment.id);
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

    // The unique index (appointments_no_double_booking, migration 0020) is
    // what actually prevents two patients booking the same doctor/date/time
    // under concurrency — the available-slots endpoint filtering is only a
    // UI nicety, not a guarantee, since two requests can race between
    // "fetch available slots" and "book". Postgres error 23505 is that
    // constraint firing; translate it into the clean conflict message
    // instead of letting a raw DB error reach the client.
    const { data: saved, error: insertError } = await this.supabase.admin.from('appointments').insert({
      patient_id: user.id,
      doctor_id: body.doctorId,
      specialty: body.specialty || doctor.specialty,
      type: body.type,
      scheduled_date: body.scheduledDate,
      scheduled_time: body.scheduledTime,
      reason: body.reason,
      status: AppointmentStatus.REQUESTED,
    }).select().single();

    if (insertError) {
      if (insertError.code === '23505') throw new ConflictException(ERROR_MESSAGES.APPOINTMENT_CONFLICT);
      throw insertError;
    }

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
      await this.initiateRefundIfPaid(appointment);
    } else if (!isDoctorActing && appointment.status === AppointmentStatus.CANCELLED) {
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

  /** No real historical call-duration data exists anywhere in this schema
   * (no call start/end timestamps are recorded) — this is a stated
   * per-consult estimate, not a measured average. Deliberately conservative
   * so the ETA under-promises rather than over-promises. */
  private static readonly AVG_CONSULT_MINUTES: Record<AppointmentType, number> = {
    [AppointmentType.VIDEO]: 15,
    [AppointmentType.CLINIC]: 20,
  };

  /** Real position in today's actual queue (the same order callNext()
   * advances through), not the originally booked slot time — a doctor
   * running behind shifts everyone's position and ETA live instead of the
   * patient just watching their booked 4:00 PM come and go. */
  async getQueueStatus(user: AuthUser, id: string) {
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    if (appointment.status === AppointmentStatus.DONE) {
      return { status: appointment.status, position: null, totalInQueue: 0, peopleAhead: 0, estimatedWaitMinutes: 0 };
    }
    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.NO_SHOW) {
      return { status: appointment.status, position: null, totalInQueue: 0, peopleAhead: 0, estimatedWaitMinutes: 0 };
    }

    const { data: todays } = await this.supabase.admin
      .from('appointments')
      .select('id, status, scheduled_time, type')
      .eq('doctor_id', appointment.doctor_id)
      .eq('scheduled_date', appointment.scheduled_date)
      .in('status', [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS])
      .order('scheduled_time', { ascending: true });

    const activeQueue = todays || [];
    const index = activeQueue.findIndex((a) => a.id === id);
    if (index === -1) {
      return { status: appointment.status, position: null, totalInQueue: activeQueue.length, peopleAhead: 0, estimatedWaitMinutes: 0 };
    }

    const peopleAhead = index;
    const avgMinutes = AppointmentsService.AVG_CONSULT_MINUTES[appointment.type as AppointmentType] ?? 15;

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
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const [{ data: profile }, { data: record }, { data: meds }, { data: labs }] = await Promise.all([
      this.supabase.admin.from('profiles').select('full_name').eq('id', appointment.patient_id).single(),
      this.supabase.admin.from('patient_records').select('chronic_conditions, allergies').eq('patient_id', appointment.patient_id).maybeSingle(),
      this.supabase.admin.from('prescriptions').select('med_name').eq('patient_id', appointment.patient_id).eq('status', 'Active'),
      this.supabase.admin.from('lab_reports').select('test_name, status').eq('patient_id', appointment.patient_id).order('created_at', { ascending: false }).limit(5),
    ]);

    const facts = {
      patientName: profile?.full_name || 'Patient',
      reason: appointment.reason || null,
      chronicConditions: record?.chronic_conditions || [],
      allergies: record?.allergies || [],
      currentMedications: [...new Set((meds || []).map((m) => m.med_name))],
      recentLabReports: (labs || []).map((l) => ({ name: l.test_name, status: l.status })),
    };

    const aiSummary = await this.ai.summarizeForConsult(facts);

    return { ...facts, aiSummary, aiConfigured: aiSummary !== null };
  }

  /** Runs every 5 minutes, pushes a reminder to any patient whose upcoming
   * appointment starts in the next ~30 minutes and hasn't been reminded yet
   * (reminder_sent_at is the idempotency guard — without it every run would
   * re-notify the same patient). Reminders only, no attendance prediction —
   * there's no historical no-show dataset in this schema to train on. */
  @Cron(CronExpression.EVERY_5_MINUTES)
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
      .in('id', due.map((a) => a.id))
      .is('reminder_sent_at', null)
      .select('id, patient_id, doctor_id, scheduled_time, type');

    if (claimError || !claimed?.length) return;

    const doctorIds = [...new Set(claimed.map((a) => a.doctor_id))];
    const { data: doctors } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', doctorIds);
    const doctorNameById = new Map((doctors || []).map((d) => [d.id, d.full_name]));

    for (const apt of claimed) {
      await this.notifications.create(apt.patient_id, {
        type: 'appointment_reminder',
        title: 'Upcoming appointment',
        message: `Your ${apt.type === AppointmentType.VIDEO ? 'video consultation' : 'clinic visit'} with Dr. ${doctorNameById.get(apt.doctor_id) || ''} is at ${apt.scheduled_time} today. Please be ready a few minutes early.`,
        data: { appointmentId: apt.id },
      }).catch(() => {});
    }

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
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDelayNotifications() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: todaysActive, error } = await this.supabase.admin
      .from('appointments')
      .select('id, doctor_id, patient_id, scheduled_time, scheduled_at, status, type, delay_notified_at')
      .eq('scheduled_date', today)
      .in('status', [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS])
      .order('scheduled_time', { ascending: true });

    if (error || !todaysActive?.length) return;

    const byDoctor = new Map<string, typeof todaysActive>();
    for (const apt of todaysActive) {
      if (!byDoctor.has(apt.doctor_id)) byDoctor.set(apt.doctor_id, []);
      byDoctor.get(apt.doctor_id)!.push(apt);
    }

    const doctorIds = [...byDoctor.keys()];
    const { data: doctors } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', doctorIds);
    const doctorNameById = new Map((doctors || []).map((d) => [d.id, d.full_name]));

    const now = Date.now();
    const toMark: string[] = [];
    const candidates = new Map<string, { patientId: string; doctorId: string; scheduledTime: string; delayMinutes: number }>();

    for (const [doctorId, queue] of byDoctor) {
      queue.forEach((apt, index) => {
        if (apt.status === AppointmentStatus.IN_PROGRESS || apt.delay_notified_at) return;

        const avgMinutes = AppointmentsService.AVG_CONSULT_MINUTES[apt.type as AppointmentType] ?? 15;
        const projectedStartMs = now + index * avgMinutes * 60 * 1000;
        const delayMinutes = (projectedStartMs - new Date(apt.scheduled_at).getTime()) / 60000;

        if (delayMinutes > 15) {
          toMark.push(apt.id);
          candidates.set(apt.id, { patientId: apt.patient_id, doctorId, scheduledTime: apt.scheduled_time, delayMinutes });
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
      this.notifications.create(c.patientId, {
        type: 'appointment_delayed',
        title: 'Running behind schedule',
        message: `Dr. ${doctorNameById.get(c.doctorId) || ''} is running about ${Math.round(c.delayMinutes)} minutes behind for your ${c.scheduledTime} appointment. We'll let you know when it's your turn.`,
        data: { appointmentId: row.id },
      }).catch(() => {});
    }

    if (claimed?.length) this.logger.log(`Sent ${claimed.length} delay notification(s).`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseUnpaidSlots() {
    // Free any slot where the payment wasn't completed within 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: expired, error } = await this.supabase.admin
      .from('appointments')
      .update({ status: AppointmentStatus.CANCELLED })
      .eq('status', AppointmentStatus.REQUESTED)
      .lt('created_at', fiveMinsAgo)
      .select('id');

    if (error) {
      this.logger.error('Failed to release unpaid slots:', error);
      return;
    }

    if (expired?.length) {
      this.logger.log(`Released ${expired.length} unpaid slots due to payment timeout.`);
    }
  }
}
