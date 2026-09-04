import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateBroadcastDto } from '@/modules/communications/controllers/communications.controller';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { EmailService } from '@/core/email/email.service';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  async list(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin
      .from('broadcasts')
      .select()
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false });
    return data || [];
  }

  /** Resolves Communications.jsx's audience-segment dropdown into real
   * patient ids scoped to this doctor's own appointments — used when the
   * caller doesn't already hand over an explicit `patientIds` selection. */
  private async resolveDoctorAudience(
    doctorId: string,
    audience: string,
  ): Promise<string[]> {
    let query = this.supabase.admin
      .from('appointments')
      .select('patient_id')
      .is('deleted_at', null)
      .eq('doctor_id', doctorId);

    if (audience === 'upcoming') {
      query = query.in('status', ['Upcoming', 'Waiting']);
    } else if (audience === 'recent') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      query = query.eq('status', 'Done').gte('scheduled_date', thirtyDaysAgo);
    }
    // 'all-patients' (and any other/unknown value) falls through to every
    // patient who has ever had an appointment with this doctor.

    const { data } = await query;
    return [...new Set((data || []).map((a) => a.patient_id))];
  }

  async create(user: AuthUser, body: CreateBroadcastDto) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const scheduled = body.scheduleType === 'scheduled';
    const { data } = await this.supabase.admin
      .from('broadcasts')
      .insert({
        doctor_id: user.id,
        subject: body.subject,
        body: body.body,
        audience: body.audience,
        channels: body.channels,
        status: scheduled ? 'Scheduled' : 'Sent',
        scheduled_for: scheduled ? body.scheduledFor : null,
      })
      .select()
      .maybeSingle();

    // Fan out messages depending on requested channels.
    // Push notifications create in-app and socket alerts, and Email sends a branded email message.
    if (
      !scheduled &&
      (body.channels.includes('Push Notification') ||
        body.channels.includes('Email'))
    ) {
      const recipientIds = await (body.patientIds?.length
        ? (() => {
            // BUG-009 fix: resolved IDs are always filtered by care relationship
            // (appointment exists between this doctor and the patient). If caller
            // passes IDs outside that set, they are silently dropped — but we now
            // log the discrepancy so probe attempts are visible in audit logs.
            return this.supabase.admin
              .from('appointments')
              .select('patient_id')
              .eq('doctor_id', user.id)
              .in('patient_id', body.patientIds)
              .then(({ data }) => {
                const resolved = [...new Set(data?.map((a) => a.patient_id) || [])];
                const requestedCount = new Set(body.patientIds).size;
                const droppedCount = requestedCount - resolved.length;
                if (droppedCount > 0) {
                  this.logger.warn(
                    `[Broadcast] Doctor ${user.id} requested broadcast to ${requestedCount} patient(s); ` +
                    `${droppedCount} ID(s) dropped (no care relationship). Resolved: ${resolved.length}.`,
                  );
                }
                return resolved;
              });
          })()
        : this.resolveDoctorAudience(user.id, body.audience));

      if (recipientIds.length > 0) {
        const promises: Promise<any>[] = [];

        if (body.channels.includes('Push Notification')) {
          const { data: profiles } = await this.supabase.admin
            .from('profiles')
            .select('id, full_name')
            .in('id', recipientIds);
            
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Patient']));

          promises.push(
            ...recipientIds.map((patientId) => {
              const patientName = profileMap.get(patientId) || 'Patient';
              let personalizedBody = body.body.replace(/\[Name\]/gi, patientName);
              const doctorName = user.profile.full_name || 'Doctor';
              const doctorTitleName = doctorName.toLowerCase().startsWith('dr.') ? doctorName : `Dr. ${doctorName}`;
              personalizedBody = personalizedBody.replace(/Dr\. Sarah/gi, doctorTitleName);
              
              return this.notifications.create(patientId, {
                type: 'broadcast',
                title: body.subject,
                message: personalizedBody,
                data: { broadcastId: data.id },
              });
            }),
          );
        }

        if (body.channels.includes('Email')) {
          const { data: profiles } = await this.supabase.admin
            .from('profiles')
            .select('email, full_name')
            .in('id', recipientIds)
            .not('email', 'is', null);

          // We map over profiles directly so we have access to full_name
          if (profiles && profiles.length > 0) {
            promises.push(
              ...profiles.map((p) => {
                const patientName = p.full_name || 'Patient';
                let personalizedBody = body.body.replace(/\[Name\]/gi, patientName);
                const doctorName = user.profile.full_name || 'Doctor';
                const doctorTitleName = doctorName.toLowerCase().startsWith('dr.') ? doctorName : `Dr. ${doctorName}`;
                personalizedBody = personalizedBody.replace(/Dr\. Sarah/gi, doctorTitleName);

                return this.email
                  .sendMail({
                    to: p.email,
                    subject: body.subject,
                    text: personalizedBody,
                    html: `<p>${personalizedBody.replace(/\n/g, '<br>')}</p>`,
                  })
                  .catch((err) =>
                    console.error(
                      'Failed to send broadcast email to',
                      p.email,
                      err,
                    ),
                  );
              }),
            );
          }
        }

        await Promise.all(promises);
      }
    }

    return data;
  }
}
