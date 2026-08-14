import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateBroadcastDto } from '@/modules/communications/controllers/communications.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin.from('broadcasts').select().eq('doctor_id', user.id).order('created_at', { ascending: false });
    return data || [];
  }

  /** Resolves Communications.jsx's audience-segment dropdown into real
   * patient ids scoped to this doctor's own appointments — used when the
   * caller doesn't already hand over an explicit `patientIds` selection. */
  private async resolveDoctorAudience(doctorId: string, audience: string): Promise<string[]> {
    let query = this.supabase.admin.from('appointments').select('patient_id').is('deleted_at', null).eq('doctor_id', doctorId);

    if (audience === 'upcoming') {
      query = query.in('status', ['Upcoming', 'Waiting']);
    } else if (audience === 'recent') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      query = query.eq('status', 'Done').gte('scheduled_date', thirtyDaysAgo);
    }
    // 'all-patients' (and any other/unknown value) falls through to every
    // patient who has ever had an appointment with this doctor.

    const { data } = await query;
    return [...new Set((data || []).map((a) => a.patient_id))];
  }

  async create(user: AuthUser, body: CreateBroadcastDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const scheduled = body.scheduleType === 'scheduled';
    const { data } = await this.supabase.admin.from('broadcasts').insert({
      doctor_id: user.id,
      subject: body.subject,
      body: body.body,
      audience: body.audience,
      channels: body.channels,
      status: scheduled ? 'Scheduled' : 'Sent',
      scheduled_for: scheduled ? body.scheduledFor : null,
    }).select().single();

    // "Push Notification" is the one channel we can actually deliver
    // ourselves (no email/SMS/WhatsApp provider is wired up) — fan it out
    // as a real in-app + socket notification, scoped to patients who
    // actually have an appointment with this doctor.
    if (!scheduled && body.channels.includes('Push Notification')) {
      const recipientIds = body.patientIds?.length
        ? [...new Set((await this.supabase.admin
            .from('appointments')
            .select('patient_id')
            .eq('doctor_id', user.id)
            .in('patient_id', body.patientIds)).data?.map((a) => a.patient_id) || [])]
        : await this.resolveDoctorAudience(user.id, body.audience);

      await Promise.all(recipientIds.map(patientId => this.notifications.create(patientId, {
        type: 'broadcast',
        title: body.subject,
        message: body.body,
        data: { broadcastId: data.id },
      })));
    }

    return data;
  }
}
