import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);

  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async getQueue(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const today = new Date().toISOString().slice(0, 10);
    const { data: sessions } = await this.supabase.admin
      .from('appointments')
      .select()
      .eq('doctor_id', user.id)
      .eq('type', 'video')
      .gte('scheduled_date', today)
      .in('status', ['Requested', 'Upcoming', 'Waiting', 'In Progress'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (!sessions || !sessions.length) return [];

    const patientIds = [...new Set(sessions.map(s => s.patient_id))];
    const [{ data: profiles }, { data: records }] = await Promise.all([
      this.supabase.admin.from('profiles').select('id, full_name, phone').in('id', patientIds),
      this.supabase.admin.from('patient_records').select('patient_id, dob').in('patient_id', patientIds),
    ]);
    const profileById = new Map((profiles || []).map(p => [p.id, p]));
    const dobById = new Map((records || []).map(r => [r.patient_id, r.dob]));

    return sessions.map(s => {
      const dob = dobById.get(s.patient_id);
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null;
      return {
        ...s,
        patientName: profileById.get(s.patient_id)?.full_name || 'Patient',
        patientPhone: profileById.get(s.patient_id)?.phone || null,
        patientAge: age,
      };
    });
  }

  private async guardAppointmentAccess(user: AuthUser, appointmentId: string) {
    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', appointmentId).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
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
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const appointment = await this.guardAppointmentAccess(user, appointmentId);

    const { data } = await this.supabase.admin.from('clinical_notes').insert({
      patient_id: appointment.patient_id,
      doctor_id: user.id,
      note,
    }).select().single();
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
      this.logger.warn('No METERED_TURN_DOMAIN/METERED_TURN_API_KEY configured — calls will rely on STUN alone, which cannot punch through symmetric NATs or routers without NAT hairpinning (a common cause of same-network call failures).');
      return stunServers;
    }

    try {
      const res = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`);
      if (!res.ok) {
        // Swallowed as a fallback-to-STUN by design, but silently — this is
        // exactly the failure mode that let an expired/invalid TURN API key
        // go unnoticed while calls quietly ran STUN-only. Always log it.
        const body = await res.text().catch(() => '');
        this.logger.error(`TURN credential fetch failed (${res.status}): ${body || res.statusText} — falling back to STUN-only. Calls between peers whose routers don't support NAT hairpinning (e.g. often the same-WiFi case) or who are behind symmetric NATs will likely fail to connect until this is fixed.`);
        return stunServers;
      }
      const turnServers = await res.json();
      this.logger.log(`TURN credentials fetched OK (${Array.isArray(turnServers) ? turnServers.length : 0} server(s))`);
      return [...stunServers, ...turnServers];
    } catch (err) {
      this.logger.error(`TURN credential fetch threw: ${err.message} — falling back to STUN-only.`);
      return stunServers;
    }
  }
}
