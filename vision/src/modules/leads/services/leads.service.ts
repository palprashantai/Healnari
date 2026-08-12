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
  ) {}

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

  async createConsultationRequest(body: ConsultationRequestDto) {
    try {
      const { data } = await this.supabase.admin
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
        })
        .select()
        .single();

      if (body.doctorId) {
        this.notifications.create(body.doctorId, {
          type: 'consultation_request',
          title: 'New patient request',
          message: `${body.name} wants to book a consultation${body.concern ? ` for ${body.concern}` : ''}. Review and approve to create their account.`,
          data: { consultationRequestId: data.id },
        }).catch(() => {});
      }

      return data;
    } catch (error) {
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
      const { data: request } = await this.supabase.admin.from('consultation_requests').select().eq('id', id).single();
      if (!request) throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      if (request.status === 'Converted') return request; // idempotent — already approved
      if (request.status !== 'New') throw new ForbiddenException('This request has already been closed.');

      const { data: existingProfile } = await this.supabase.admin.from('profiles').select().eq('email', request.email).maybeSingle();

      let patientId: string;
      let generatedPassword: string | null = null;

      if (existingProfile) {
        if (existingProfile.role !== ProfileRole.PATIENT) {
          throw new ForbiddenException('This email already belongs to a non-patient account.');
        }
        patientId = existingProfile.id;
      } else {
        generatedPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
        const { data: created, error } = await this.supabase.admin.auth.admin.createUser({
          email: request.email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { role: ProfileRole.PATIENT, full_name: request.name },
        });
        if (error || !created?.user) throw new ForbiddenException(error?.message || 'Failed to create patient account');
        patientId = created.user.id;
        if (request.mobile) {
          await this.supabase.admin.from('profiles').update({ phone: request.mobile }).eq('id', patientId);
        }
      }

      const { data: doctor } = await this.supabase.admin.from('profiles').select('full_name, specialty').eq('id', user.id).single();

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
        status: AppointmentStatus.UPCOMING,
      }).select().single();

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted', patient_id: patientId })
        .eq('id', id)
        .select()
        .single();

      const appointmentLine = `<p>Your appointment with Dr. ${doctor?.full_name || ''} is confirmed for <strong>${scheduledDate} at ${scheduledTime}</strong>.</p>`;

      if (generatedPassword) {
        await this.email.sendMail({
          to: request.email,
          subject: 'Your HealNari account is ready',
          html: `
            <p>Hi ${request.name},</p>
            <p>Dr. ${doctor?.full_name || ''} has approved your consultation request. We've created your HealNari account so you can manage it:</p>
            <p><strong>Email:</strong> ${request.email}<br/><strong>Password:</strong> ${generatedPassword}</p>
            <p>Please log in and change your password from your profile settings.</p>
            ${appointmentLine}
          `,
          text: `Hi ${request.name}, your HealNari account has been created.\nEmail: ${request.email}\nPassword: ${generatedPassword}\nYour appointment with Dr. ${doctor?.full_name || ''} is confirmed for ${scheduledDate} at ${scheduledTime}.`,
        });
      } else {
        await this.email.sendMail({
          to: request.email,
          subject: 'Your consultation request was approved',
          html: `<p>Hi ${request.name},</p>${appointmentLine}<p>Log in to your existing HealNari account to view details.</p>`,
          text: `Hi ${request.name}, your appointment with Dr. ${doctor?.full_name || ''} is confirmed for ${scheduledDate} at ${scheduledTime}. Log in to your existing HealNari account to view details.`,
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
      const { data: request } = await this.supabase.admin.from('consultation_requests').select().eq('id', id).single();
      if (!request) throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Closed' })
        .eq('id', id)
        .select()
        .single();
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
