import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { EmailService } from '@/core/email/email.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import {
  AppointmentStatus,
  AppointmentType,
} from '@/shared/interfaces/appointment.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ConsultationRequestDto } from '@/modules/leads/controllers/leads.controller';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';

@Injectable()
export class LeadsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly doctorsService: DoctorsService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified)
      throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
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
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async findExistingPatient(email?: string, mobile?: string) {
    if (!email && !mobile) return null;

    let query = this.supabase.admin
      .from('profiles')
      .select()
      .eq('role', ProfileRole.PATIENT);

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
    if (!body.doctorId) {
      throw new BadRequestException(
        'A specific doctor must be selected to book a consultation.',
      );
    }

    try {
      const { data: doctor } = await this.supabase.admin
        .from('profiles')
        .select('full_name, specialty, currency')
        .eq('id', body.doctorId)
        .maybeSingle();

      const scheduledDate =
        body.preferredDate ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const scheduledTime = body.preferredTime || '10:00 AM';

      // Validate slot availability (just as a check, no hold is placed)
      const availability = await this.doctorsService.getAvailableSlots(
        body.doctorId,
        scheduledDate,
      );
      if (!availability.availableSlots.includes(scheduledTime)) {
        throw new ForbiddenException(
          'The selected time slot is no longer available. Please choose another slot.',
        );
      }

      let patientProfile = await this.findExistingPatient(
        body.email,
        body.mobile,
      );

      let patientId: string;
      if (patientProfile) {
        patientId = patientProfile.id;
      } else {
        const generatedPassword =
          randomBytes(9).toString('base64url') + 'A1!';
        const { data: created, error } =
          await this.supabase.admin.auth.admin.createUser({
            email: body.email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
              role: ProfileRole.PATIENT,
              full_name: body.name,
            },
          });
        if (error || !created?.user) {
          throw new ForbiddenException(
            error?.message || 'Failed to create patient account for booking',
          );
        }
        patientId = created.user.id;

        const profileUpdates: any = {};
        if (body.mobile) profileUpdates.phone = body.mobile;
        if (body.country) profileUpdates.country = body.country;
        if (body.currency) profileUpdates.currency = body.currency;
        if (Object.keys(profileUpdates).length > 0) {
          await this.supabase.admin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', patientId);
        }
      }

      const mockUser = {
        id: patientId,
        email: body.email,
        profile: { role: ProfileRole.PATIENT },
      } as AuthUser;

      const createdAppointment = await this.appointmentsService.create(
        mockUser,
        {
          doctorId: body.doctorId,
          specialty: body.specialtyRecommendation || doctor?.specialty,
          type: AppointmentType.VIDEO,
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          reason: body.concern || 'Consultation request',
          country: body.country,
          currency: body.currency,
        },
      );

      // Also record in consultation_requests for lead telemetry / doctor requests table
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
          patient_id: patientId,
          preferred_date: scheduledDate,
          preferred_time: scheduledTime,
          notes: body.notes,
          country: body.country || 'US',
          currency: body.currency || 'USD',
          fee: body.fee || null,
          status: 'New', // Pending doctor approval
        })
        .select()
        .maybeSingle();

      return {
        ...requestRow,
        appointmentId: createdAppointment.id,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
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
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
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
      const { data: request } = await this.supabase.admin
        .from('consultation_requests')
        .select()
        .eq('id', id)
        .maybeSingle();
      if (!request)
        throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id)
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      if (request.status === 'Converted') return request; // idempotent — already approved
      if (request.status !== 'New')
        throw new ForbiddenException('This request has already been closed.');

      const [existingProfile, { data: doctor }] = await Promise.all([
        this.findExistingPatient(request.email, request.mobile),
        this.supabase.admin
          .from('profiles')
          .select('full_name, specialty, currency')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      let patientId: string;
      let generatedPassword: string | null = null;

      if (existingProfile) {
        patientId = existingProfile.id;
      } else {
        generatedPassword = randomBytes(9).toString('base64url') + 'A1!';
        const { data: created, error } =
          await this.supabase.admin.auth.admin.createUser({
            email: request.email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
              role: ProfileRole.PATIENT,
              full_name: request.name,
            },
          });
        if (error || !created?.user)
          throw new ForbiddenException(
            error?.message || 'Failed to create patient account',
          );
        patientId = created.user.id;
        const profileUpdates: any = {};
        if (request.mobile) profileUpdates.phone = request.mobile;
        if (request.country) profileUpdates.country = request.country;
        if (request.currency) profileUpdates.currency = request.currency;
        if (Object.keys(profileUpdates).length > 0) {
          await this.supabase.admin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', patientId);
        }
      }

      let appointment: any = null;

      // Find the appointment created for this consultation request
      const { data: existingAppt } = await this.supabase.admin
        .from('appointments')
        .select('id, status')
        .eq('patient_id', request.patient_id || patientId)
        .eq('doctor_id', user.id)
        .eq('scheduled_date', request.preferred_date || new Date().toISOString().slice(0, 10))
        .eq('status', AppointmentStatus.REQUESTED)
        .maybeSingle();

      if (existingAppt) {
        appointment = await this.appointmentsService.updateStatus(
          user,
          existingAppt.id,
          AppointmentStatus.APPROVED,
        );
      } else {
        // Fallback: create as Approved if no matching requested appointment exists
        const { data: createdAppt } = await this.supabase.admin
          .from('appointments')
          .insert({
            patient_id: request.patient_id || patientId,
            doctor_id: user.id,
            specialty: doctor?.specialty || request.specialty_recommendation,
            type: AppointmentType.VIDEO,
            scheduled_date: request.preferred_date || new Date().toISOString().slice(0, 10),
            scheduled_time: request.preferred_time || '10:00 AM',
            reason: request.concern || 'Consultation request',
            status: AppointmentStatus.APPROVED,
            country: request.country || 'US',
            currency: request.currency || doctor?.currency || 'USD',
          })
          .select()
          .maybeSingle();
        appointment = createdAppt;
      }

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted' })
        .eq('id', id)
        .select()
        .maybeSingle();

      const scheduledDate =
        request.preferred_date ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const scheduledTime = request.preferred_time || '10:00 AM';
      if (generatedPassword) {
        await this.email
          .sendMail({
            to: request.email,
            subject: 'Your HealNari account is ready - Action Required',
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
              <h2 style="color: #0f172a; margin-top: 0;">Welcome to HealNari!</h2>
              <p style="font-size: 16px;">Hi <strong>${request.name}</strong>,</p>
              <p style="font-size: 16px;">Great news! <strong>Dr. ${doctor?.full_name || ''}</strong> has approved your consultation request.</p>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 16px; color: #0f172a;"><strong>Appointment Details</strong></p>
                <p style="margin: 8px 0 0 0;">📅 <strong>Date:</strong> ${scheduledDate}<br>⏰ <strong>Time:</strong> ${scheduledTime}</p>
              </div>
              
              <p style="font-size: 16px;">We have set up your secure HealNari account with the following login details:</p>
              <div style="background-color: #f8fafc; padding: 16px; margin: 16px 0; border: 1px dashed #cbd5e1; border-radius: 4px;">
                <p style="margin: 0; font-size: 16px;"><strong>Email:</strong> ${request.email}</p>
                <p style="margin: 8px 0 0 0; font-size: 16px;"><strong>Password:</strong> ${generatedPassword}</p>
              </div>
              
              <p style="font-size: 16px;">Please log in to your account and <strong>complete the payment</strong> to confirm your booking.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.healnari.com/patient-dashboard/billing" style="background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Pay Now & Confirm Booking</a>
              </div>

              <p style="font-size: 16px; margin-top: 32px;"><strong>Important:</strong> Your appointment is currently on hold and will only be confirmed once payment is received. Unpaid requests will be automatically cancelled after 24 hours.</p>
              <p style="font-size: 14px; color: #64748b; margin-top: 24px;">For security reasons, we recommend changing your password after your first login.</p>
            </div>
          `,
            text: `Hi ${request.name}, Dr. ${doctor?.full_name || ''} has approved your consultation request. Your HealNari account is ready. Email: ${request.email}, Password: ${generatedPassword}. Please log in at https://app.healnari.com/patient-dashboard/billing and complete the payment to confirm your booking for ${scheduledDate} at ${scheduledTime}. Unpaid requests will be automatically cancelled after 24 hours.`,
          })
          .catch((err) => console.error('Failed to send approval email', err));
      } else {
        await this.email
          .sendMail({
            to: request.email,
            subject: 'Payment Required: Consultation request approved',
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
              <h2 style="color: #0f172a; margin-top: 0;">Consultation Approved!</h2>
              <p style="font-size: 16px;">Hi <strong>${request.name}</strong>,</p>
              <p style="font-size: 16px;">Great news! <strong>Dr. ${doctor?.full_name || ''}</strong> has approved your consultation request.</p>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 16px; color: #0f172a;"><strong>Appointment Details</strong></p>
                <p style="margin: 8px 0 0 0;">📅 <strong>Date:</strong> ${scheduledDate}<br>⏰ <strong>Time:</strong> ${scheduledTime}</p>
              </div>
              
              <p style="font-size: 16px;"><strong>Next Step:</strong> Please log in to your HealNari account and <strong>complete the payment</strong> to confirm your booking.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.healnari.com/patient-dashboard/billing" style="background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Pay Now & Confirm Booking</a>
              </div>
              <p style="font-size: 16px; margin-top: 32px;"><strong>Important:</strong> Your appointment is currently on hold and will only be confirmed once payment is received. Unpaid requests will be automatically cancelled after 24 hours.</p>
            </div>
          `,
            text: `Hi ${request.name}, Dr. ${doctor?.full_name || ''} has approved your consultation request. Please log in at https://app.healnari.com/patient-dashboard/billing and complete the payment to confirm your booking for ${scheduledDate} at ${scheduledTime}. Unpaid requests will be automatically cancelled after 24 hours.`,
          })
          .catch((err) => console.error('Failed to send approval email', err));
      }

      return { ...updated, appointment, emailSent: this.email.isConfigured };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async declineConsultationRequest(user: AuthUser, id: string) {
    this.requireVerifiedDoctor(user);
    try {
      const { data: request } = await this.supabase.admin
        .from('consultation_requests')
        .select()
        .eq('id', id)
        .maybeSingle();
      if (!request)
        throw new NotFoundException('Consultation request not found');
      if (request.doctor_id !== user.id)
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

      if (request.status !== 'New') return request;

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Closed' })
        .eq('id', id)
        .eq('status', 'New')
        .select()
        .maybeSingle();

      if (!updated) return request;

      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
