import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { EmailService } from '@/core/email/email.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AppointmentStatus, AppointmentType } from '@/shared/interfaces/appointment.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ConsultationRequestDto } from '@/modules/leads/controllers/leads.controller';

@Injectable()
export class LeadsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) { }

  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  async subscribeNewsletter(email: string) {
    try {
      // Idempotent — resubscribing (or a duplicate double-click) shouldn't error.
      const { data } = await this.supabase.admin
        .from('newsletter_subscribers')
        .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
        .select()
        .maybeSingle();
      return data || { email };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  private async findExistingPatient(email?: string, mobile?: string) {
    if (!email && !mobile) return null;

    let query = this.supabase.admin.from('profiles').select().eq('role', ProfileRole.PATIENT);

    const conditions: string[] = [];
    if (email) conditions.push(`email.eq.${email}`);
    if (mobile) conditions.push(`phone.eq.${mobile}`);

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data } = await query;
    return data && data.length > 0 ? data[0] : null;
  }

  async checkExistingUser(email?: string, mobile?: string) {
    const existing = await this.findExistingPatient(email, mobile);
    if (existing) {
      return {
        name: existing.full_name,
        age: existing.age,
      };
    }
    return null;
  }

  async createConsultationRequest(body: ConsultationRequestDto) {
    try {
      const existingProfile = await this.findExistingPatient(body.email, body.mobile);

      let patientId: string;
      let generatedPassword: string | null = null;

      if (existingProfile) {
        patientId = existingProfile.id;
      } else {
        generatedPassword = randomBytes(9).toString('base64url') + 'A1!';
        const { data: created, error } = await this.supabase.admin.auth.admin.createUser({
          email: body.email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { role: ProfileRole.PATIENT, full_name: body.name },
        });
        if (error || !created?.user) throw new ForbiddenException(error?.message || 'Failed to create patient account');
        patientId = created.user.id;
        const profileUpdates: any = {};
        if (body.mobile) profileUpdates.phone = body.mobile;
        if (body.age) profileUpdates.age = body.age;
        if (body.country) profileUpdates.country = body.country;
        if (body.currency) profileUpdates.currency = body.currency;
        if (Object.keys(profileUpdates).length > 0) {
          await this.supabase.admin.from('profiles').update(profileUpdates).eq('id', patientId);
        }
      }

      const { data: doctor } = await this.supabase.admin.from('profiles').select('full_name, specialty, currency').eq('id', body.doctorId).maybeSingle();
      const scheduledDate = body.preferredDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const scheduledTime = body.preferredTime || '10:00 AM';

      // Create appointment with HOLD status and 10 minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: appointment, error: appointmentError } = await this.supabase.admin.from('appointments').insert({
        patient_id: patientId,
        doctor_id: body.doctorId,
        specialty: doctor?.specialty || body.specialtyRecommendation,
        type: AppointmentType.VIDEO,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reason: body.concern || 'Consultation request',
        status: AppointmentStatus.HOLD,
        hold_expires_at: expiresAt,
        country: body.country || 'US',
        currency: body.currency || doctor?.currency || 'USD',
      }).select().maybeSingle();

      if (appointmentError) {
        // Handle double booking constraint error
        if (appointmentError.code === '23505') {
          throw new ForbiddenException('This slot is already booked or held. Please choose another slot.');
        }
        throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      }

      // Also create the legacy consultation request for tracking purposes, but mark it converted
      const { data: requestRow } = await this.supabase.admin
        .from('consultation_requests')
        .insert({
          name: body.name,
          email: body.email,
          age: body.age,
          mobile: body.mobile,
          concern: body.concern,
          specialty_recommendation: body.specialtyRecommendation,
          doctor_id: body.doctorId,
          preferred_date: body.preferredDate || null,
          preferred_time: body.preferredTime,
          notes: body.notes,
          country: body.country || 'US',
          currency: body.currency || 'USD',
          fee: body.fee || null,
          patient_id: patientId,
          status: 'Converted'
        })
        .select()
        .maybeSingle();

      if (generatedPassword) {
        const { data: linkData } = await this.supabase.admin.auth.admin.generateLink({
          type: 'recovery',
          email: body.email,
        });
        const setupLink = linkData?.properties?.action_link || 'https://app.healnari.com/reset-password';

        await this.email.sendMail({
          to: body.email,
          subject: 'Welcome to HealNari - Complete your booking',
          html: `
            <p>Hi ${body.name},</p>
            <p>Your consultation slot with Dr. ${doctor?.full_name || ''} is held for 10 minutes.</p>
            <p>We've created your HealNari account. <strong>Email:</strong> ${body.email}</p>
            <p>Please <a href="${setupLink}">click here to set your password</a>.</p>
            <p>Complete your payment to confirm your booking for <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>
          `,
          text: `Hi ${body.name}, your slot with Dr. ${doctor?.full_name || ''} is held for 10 mins. Set password here: ${setupLink}. Complete payment to confirm booking for ${scheduledDate} at ${scheduledTime}.`,
        });
      }

      return { ...appointment, isDirectAppointment: true };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getMyConsultationRequests(user: AuthUser) {
    this.requireVerifiedDoctor(user);
    try {
      const { data } = await this.supabase.admin
        .from('consultation_requests')
        .select()
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** The one place a public consultation request turns into a real account.
   * Reuses an existing patient profile if that email is already registered
   * (never re-issues a password for an existing account); otherwise creates
   * a real Supabase auth user with a generated password and emails it —
   * the same account-creation shape PatientsService.create() uses for a
   * doctor manually adding a patient, just triggered from a public lead
   * instead of the doctor's own form. */
  async approveConsultationRequest(user: AuthUser, id: string) {
    this.requireVerifiedDoctor(user);
    try {
      const { data: request } = await this.supabase.admin.from('consultation_requests').select().eq('id', id).maybeSingle();
      if (!request) throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      if (request.status === 'Converted') return request; // idempotent — already approved
      if (request.status !== 'New') throw new ForbiddenException('This request has already been closed.');

      const existingProfile = await this.findExistingPatient(request.email, request.mobile);

      let patientId: string;
      let generatedPassword: string | null = null;

      if (existingProfile) {
        patientId = existingProfile.id;
      } else {
        generatedPassword = randomBytes(9).toString('base64url') + 'A1!';
        const { data: created, error } = await this.supabase.admin.auth.admin.createUser({
          email: request.email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { role: ProfileRole.PATIENT, full_name: request.name },
        });
        if (error || !created?.user) throw new ForbiddenException(error?.message || 'Failed to create patient account');
        patientId = created.user.id;
        const profileUpdates: any = {};
        if (request.mobile) profileUpdates.phone = request.mobile;
        if (request.country) profileUpdates.country = request.country;
        if (request.currency) profileUpdates.currency = request.currency;
        if (Object.keys(profileUpdates).length > 0) {
          await this.supabase.admin.from('profiles').update(profileUpdates).eq('id', patientId);
        }
      }

      const { data: doctor } = await this.supabase.admin.from('profiles').select('full_name, specialty, currency').eq('id', user.id).maybeSingle();

      const scheduledDate = request.preferred_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const scheduledTime = request.preferred_time || '10:00 AM';

      const { data: appointment } = await this.supabase.admin.from('appointments').insert({
        patient_id: patientId,
        doctor_id: user.id,
        specialty: doctor?.specialty || request.specialty_recommendation,
        type: AppointmentType.VIDEO,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reason: request.concern || 'Consultation request',
        status: AppointmentStatus.APPROVED,
        country: request.country || 'US',
        currency: request.currency || doctor?.currency || 'USD',
      }).select().maybeSingle();

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted', patient_id: patientId })
        .eq('id', id)
        .select()
        .maybeSingle();

      const appointmentLine = `<p>Your appointment with Dr. ${doctor?.full_name || ''} is confirmed for <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>`;

      if (generatedPassword) {
        const { data: linkData } = await this.supabase.admin.auth.admin.generateLink({
          type: 'recovery',
          email: request.email,
        });
        const setupLink = linkData?.properties?.action_link || 'https://app.healnari.com/reset-password';

        await this.email.sendMail({
          to: request.email,
          subject: 'Your HealNari account is ready - Action Required',
          html: `
            <p>Hi ${request.name},</p>
            <p>Dr. ${doctor?.full_name || ''} has approved your consultation request.</p>
            <p>We've created your HealNari account. <strong>Email:</strong> ${request.email}</p>
            <p>Please <a href="${setupLink}">click here to set your password</a> and log in.</p>
            <p><strong>Next Step:</strong> Once logged in, please complete the payment to confirm your booking for <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>
          `,
          text: `Hi ${request.name}, Dr. ${doctor?.full_name || ''} has approved your consultation request. Please set your password using this link: ${setupLink}. Once logged in, complete the payment to confirm your booking for ${scheduledDate} at ${scheduledTime}.`,
        });
      } else {
        await this.email.sendMail({
          to: request.email,
          subject: 'Your consultation request was approved - Action Required',
          html: `
            <p>Hi ${request.name},</p>
            <p>Dr. ${doctor?.full_name || ''} has approved your consultation request.</p>
            <p><strong>Next Step:</strong> Please log in to your HealNari account and complete the payment to confirm your booking for <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>
          `,
          text: `Hi ${request.name}, Dr. ${doctor?.full_name || ''} has approved your consultation request. Please log in to your HealNari account and complete the payment to confirm your booking for ${scheduledDate} at ${scheduledTime}.`,
        });
      }

      return { ...updated, appointment, emailSent: this.email.isConfigured };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async declineConsultationRequest(user: AuthUser, id: string) {
    this.requireVerifiedDoctor(user);
    try {
      const { data: request } = await this.supabase.admin.from('consultation_requests').select().eq('id', id).maybeSingle();
      if (!request) throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Closed' })
        .eq('id', id)
        .select()
        .maybeSingle();
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
