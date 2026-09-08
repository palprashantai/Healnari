import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);
  private cachedIceServers:
    { urls: string; username?: string; credential?: string }[] | null = null;
  private iceServersExpiresAt = 0;

  constructor(private readonly supabase: SupabaseService) {}

  async getQueue(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const today = new Date().toISOString().slice(0, 10);
    const { data: sessions } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('doctor_id', user.id)
      .eq('type', 'video')
      .gte('scheduled_date', today)
      .in('status', ['Upcoming', 'Waiting', 'In Progress'])
      .not('payment_id', 'is', null)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (!sessions || !sessions.length) return [];

    const patientIds = [...new Set(sessions.map((s) => s.patient_id))];
    const [{ data: profiles }, { data: records }] = await Promise.all([
      this.supabase.admin
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', patientIds),
      this.supabase.admin
        .from('patient_records')
        .select('patient_id, dob')
        .is('deleted_at', null)
        .in('patient_id', patientIds),
    ]);
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const dobById = new Map((records || []).map((r) => [r.patient_id, r.dob]));

    return sessions.map((s) => {
      const dob = dobById.get(s.patient_id);
      const age = dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
        : null;
      return {
        ...s,
        patientName: profileById.get(s.patient_id)?.full_name || 'Patient',
        patientPhone: profileById.get(s.patient_id)?.phone || null,
        patientAge: age,
      };
    });
  }

  async getHistory(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const today = new Date().toISOString().slice(0, 10);
    const { data: sessions } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('doctor_id', user.id)
      .eq('type', 'video')
      .or(`status.in.(Done,Completed,Finished),scheduled_date.lt.${today}`)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    if (!sessions || !sessions.length) return [];

    const patientIds = [...new Set(sessions.map((s) => s.patient_id))];
    const [{ data: profiles }, { data: records }] = await Promise.all([
      this.supabase.admin
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', patientIds),
      this.supabase.admin
        .from('patient_records')
        .select('patient_id, dob')
        .is('deleted_at', null)
        .in('patient_id', patientIds),
    ]);
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const dobById = new Map((records || []).map((r) => [r.patient_id, r.dob]));

    return sessions.map((s) => {
      const dob = dobById.get(s.patient_id);
      const age = dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
        : null;
      return {
        ...s,
        patientName: profileById.get(s.patient_id)?.full_name || 'Patient',
        patientPhone: profileById.get(s.patient_id)?.phone || null,
        patientAge: age,
      };
    });
  }

  private async guardAppointmentAccess(user: AuthUser, appointmentId: string) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select()
      .is('deleted_at', null)
      .eq('id', appointmentId)
      .maybeSingle();
    if (!appointment)
      throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return appointment;
  }

  async getNotes(user: AuthUser, appointmentId: string) {
    const appointment = await this.guardAppointmentAccess(user, appointmentId);
    const { data } = await this.supabase.admin
      .from('clinical_notes')
      .select()
      .eq('patient_id', appointment.patient_id)
      .eq('doctor_id', appointment.doctor_id)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async addNote(user: AuthUser, appointmentId: string, note: string) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const appointment = await this.guardAppointmentAccess(user, appointmentId);

    const { data } = await this.supabase.admin
      .from('clinical_notes')
      .insert({
        patient_id: appointment.patient_id,
        doctor_id: user.id,
        note,
      })
      .select()
      .maybeSingle();
    return data;
  }

  /** ICE server list for the WebRTC video call — always includes public STUN,
   * and adds a short-lived TURN credential from Metered if configured. TURN
   * is only a fallback for peers on restrictive/symmetric NATs, so a missing
   * key just means calls rely on STUN alone rather than failing outright. */
  async getIceServers() {
    const stunServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const domain = process.env.METERED_TURN_DOMAIN;
    const apiKey = process.env.METERED_TURN_API_KEY;
    if (!domain || !apiKey) {
      this.logger.warn(
        'No METERED_TURN_DOMAIN/METERED_TURN_API_KEY configured — calls will rely on STUN alone, which cannot punch through symmetric NATs or routers without NAT hairpinning (a common cause of same-network call failures).',
      );
      return stunServers;
    }

    // Every call join was hitting Metered's API fresh — a full external
    // round trip on the call-start hot path. TURN REST API credentials are
    // time-limited but not single-use, so reuse them until shortly before
    // they actually expire instead of refetching on every join.
    if (this.cachedIceServers && Date.now() < this.iceServersExpiresAt) {
      return this.cachedIceServers;
    }

    try {
      const res = await fetch(
        `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
      );
      if (!res.ok) {
        // Swallowed as a fallback-to-STUN by design, but silently — this is
        // exactly the failure mode that let an expired/invalid TURN API key
        // go unnoticed while calls quietly ran STUN-only. Always log it.
        const body = await res.text().catch(() => '');
        this.logger.error(
          `TURN credential fetch failed (${res.status}): ${body || res.statusText} — falling back to STUN-only. Calls between peers whose routers don't support NAT hairpinning (e.g. often the same-WiFi case) or who are behind symmetric NATs will likely fail to connect until this is fixed.`,
        );
        return stunServers;
      }
      const turnServers = await res.json();
      const combined = [...stunServers, ...turnServers];

      // TURN REST API usernames conventionally embed their expiry as the
      // leading "<unix-seconds>:" segment — refresh a minute before that so
      // a join right at the boundary never gets a stale credential. Falls
      // back to a conservative 30-minute cache if that convention isn't
      // followed (or the field is missing).
      const sampleUsername = Array.isArray(turnServers)
        ? turnServers.find((s: any) => s?.username)?.username
        : undefined;
      const expiryUnixSeconds =
        typeof sampleUsername === 'string'
          ? parseInt(sampleUsername.split(':')[0], 10)
          : NaN;
      const ttlMs =
        Number.isFinite(expiryUnixSeconds) && expiryUnixSeconds > 0
          ? Math.max(0, expiryUnixSeconds * 1000 - Date.now() - 60_000)
          : 30 * 60 * 1000;

      this.cachedIceServers = combined;
      this.iceServersExpiresAt = Date.now() + ttlMs;

      this.logger.log(
        `TURN credentials fetched OK (${Array.isArray(turnServers) ? turnServers.length : 0} server(s)), cached for ${Math.round(ttlMs / 1000)}s`,
      );
      return combined;
    } catch (err) {
      this.logger.error(
        `TURN credential fetch threw: ${err.message} — falling back to STUN-only.`,
      );
      return stunServers;
    }
  }

  /**
   * Save debounced clinical notes/prescription draft to server-side session.
   * Ensures clinical work is preserved even if the browser crashes or doctor changes devices.
   */
  async saveDraft(user: AuthUser, appointmentId: string, draftData: any) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const appointment = await this.guardAppointmentAccess(user, appointmentId);

    // Upsert session row if table exists
    const now = new Date().toISOString();
    try {
      const { data: session } = await this.supabase.admin
        .from('consultation_sessions')
        .upsert(
          {
            appointment_id: appointmentId,
            doctor_id: appointment.doctor_id,
            patient_id: appointment.patient_id,
            draft_notes: draftData,
            updated_at: now,
          },
          { onConflict: 'appointment_id' },
        )
        .select()
        .maybeSingle();

      await this.recordSessionEvent(
        appointmentId,
        'DRAFT_SAVED',
        user.id,
        { hasMeds: !!draftData?.draftMeds?.length, hasNotes: !!draftData?.clinicalNotes },
      );

      return session || { draft_notes: draftData, updated_at: now };
    } catch (err) {
      this.logger.warn(`Could not save draft to consultation_sessions: ${err.message}`);
      return { draft_notes: draftData, updated_at: now };
    }
  }

  /**
   * Retrieve active draft for an appointment
   */
  async getDraft(user: AuthUser, appointmentId: string) {
    const appointment = await this.guardAppointmentAccess(user, appointmentId);
    try {
      const { data } = await this.supabase.admin
        .from('consultation_sessions')
        .select('draft_notes, updated_at')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      return data?.draft_notes || null;
    } catch {
      return null;
    }
  }

  /**
   * Record periodic heartbeat from active WebRTC session to ensure authoritative duration
   */
  async recordHeartbeat(
    user: AuthUser,
    appointmentId: string,
    stats?: { elapsedSeconds?: number; quality?: string; isAudioOnly?: boolean },
  ) {
    const appointment = await this.guardAppointmentAccess(user, appointmentId);
    const now = new Date().toISOString();
    const elapsed = Math.max(0, Number(stats?.elapsedSeconds) || 0);

    try {
      // Update consultation_sessions
      await this.supabase.admin
        .from('consultation_sessions')
        .upsert(
          {
            appointment_id: appointmentId,
            doctor_id: appointment.doctor_id,
            patient_id: appointment.patient_id,
            status: 'connected',
            last_connected_at: now,
            total_connected_seconds: elapsed,
            media_mode: stats?.isAudioOnly ? 'audio_only' : 'video',
            updated_at: now,
          },
          { onConflict: 'appointment_id' },
        );

      // Update appointment table summary column
      if (elapsed > 0) {
        await this.supabase.admin
          .from('appointments')
          .update({
            consultation_duration_seconds: elapsed,
            started_at: appointment.started_at || now,
          })
          .eq('id', appointmentId);
      }
    } catch (err) {
      this.logger.warn(`Heartbeat update skipped: ${err.message}`);
    }

    return { ok: true, serverTime: now, recordedSeconds: elapsed };
  }

  /**
   * Get authoritative session state and duration
   */
  async getSessionStatus(user: AuthUser, appointmentId: string) {
    const appointment = await this.guardAppointmentAccess(user, appointmentId);
    const now = new Date().toISOString();

    try {
      const { data: session } = await this.supabase.admin
        .from('consultation_sessions')
        .select()
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      return {
        appointmentId,
        appointmentStatus: appointment.status,
        sessionStatus: session?.status || 'waiting',
        startedAt: session?.started_at || appointment.started_at || null,
        totalConnectedSeconds: session?.total_connected_seconds || appointment.consultation_duration_seconds || 0,
        doctorJoinedAt: session?.doctor_joined_at || null,
        patientJoinedAt: session?.patient_joined_at || null,
        lastConnectedAt: session?.last_connected_at || null,
        serverNow: now,
      };
    } catch {
      return {
        appointmentId,
        appointmentStatus: appointment.status,
        sessionStatus: 'waiting',
        startedAt: appointment.started_at || null,
        totalConnectedSeconds: appointment.consultation_duration_seconds || 0,
        serverNow: now,
      };
    }
  }

  /**
   * Log an immutable clinical/call event for auditability
   */
  async recordSessionEvent(
    appointmentId: string,
    eventType: string,
    triggeredBy?: string,
    payload?: any,
  ) {
    try {
      await this.supabase.admin.from('consultation_events').insert({
        appointment_id: appointmentId,
        event_type: eventType,
        triggered_by: triggeredBy || null,
        payload: payload || {},
      });
    } catch (err) {
      this.logger.debug(`Could not write to consultation_events: ${err.message}`);
    }
  }
}
