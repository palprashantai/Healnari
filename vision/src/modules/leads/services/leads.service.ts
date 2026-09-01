import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
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
    if (email) conditions.push(`email.eq."${email}"`);
    if (mobile) conditions.push(`phone.eq."${mobile}"`);

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;
    if (error) {
      console.error('findExistingPatient error:', error);
    }
    return data && data.length > 0 ? data[0] : null;
  }

  async checkExistingUser(email?: string, mobile?: string) {
    const existing = await this.findExistingPatient(email, mobile);
    if (existing) {
      return {
        name: existing.full_name,
        age: existing.age,
        mobile: existing.phone,
        email: existing.email,
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
        .select('full_name, email, specialty, currency')
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

      const patientId = patientProfile ? patientProfile.id : null;

      let appointmentRow = null;
      if (patientId) {
        const { data: apt, error } = await this.supabase.admin
          .from('appointments')
          .insert({
            patient_id: patientId,
            doctor_id: body.doctorId,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            status: 'Requested',
            type: 'video', // 'Consultation' violates check constraint ('video', 'clinic')
            reason: body.concern,
            country: body.country || 'US',
            currency: body.currency || 'USD',
            specialty: doctor?.specialty || 'General',
          })
          .select()
          .maybeSingle();
        
        if (error) {
          console.error('Failed to insert appointment:', error);
          throw new Error('Appointment insert failed: ' + error.message);
        }
        appointmentRow = apt;

        await this.notifications.create(body.doctorId, {
          type: 'appointment_requested',
          title: 'New Appointment Request',
          message: `${body.name} requested a new Consultation for ${new Date(scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${scheduledTime}.`,
          data: {
            entity_type: 'appointment',
            entity_id: apt?.id,
          },
        }).catch(err => console.error('Failed to send appointment notification:', err));
      }

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
          status: patientId ? 'Converted' : 'New', // Auto-convert if existing
        })
        .select()
        .maybeSingle();

      // Send database-driven notification emails to patient & doctor
      if (body.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'consultation_request_received',
            to: body.email,
            variables: {
              patientName: body.name,
              doctorName: doctor?.full_name || 'Specialist',
              scheduledDate,
              scheduledTime,
              dashboardUrl: this.email.getUrl('/?auth=login'),
            },
            entityType: 'consultation_request',
            entityId: requestRow?.id,
            event: 'consultation_request_submitted',
          })
          .catch(() => {});
      }

      if (doctor?.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'consultation_request_doctor',
            to: doctor.email,
            variables: {
              doctorName: doctor.full_name || 'Doctor',
              patientName: body.name,
              scheduledDate,
              scheduledTime,
              concern: body.concern || 'General Consultation Request',
              dashboardUrl: this.email.getUrl('/doctor-dashboard/appointments?tab=requests'),
            },
            entityType: 'consultation_request',
            entityId: requestRow?.id,
            event: 'consultation_request_received_doctor',
          })
          .catch(() => {});
      }

      return requestRow;
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
          .select('full_name, specialty, currency, consultation_fee')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      let patientId: string;
      let generatedPassword: string | null = null;

      if (existingProfile) {
        patientId = existingProfile.id;
        // We reuse the existing account without resetting their password.
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
      }

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

      let appointment: any = null;

      // Find the appointment created for this consultation request or an existing one
      const { data: existingAppt } = await this.supabase.admin
        .from('appointments')
        .select('id, status')
        .eq('patient_id', request.patient_id || patientId)
        .eq('doctor_id', user.id)
        .eq('scheduled_date', request.preferred_date || new Date().toISOString().slice(0, 10))
        .in('status', [AppointmentStatus.REQUESTED, AppointmentStatus.APPROVED, 'Upcoming', 'Hold'])
        .maybeSingle();

      if (existingAppt) {
        if (existingAppt.status === AppointmentStatus.REQUESTED) {
          appointment = await this.appointmentsService.updateStatus(
            user,
            existingAppt.id,
            AppointmentStatus.APPROVED,
          );
        } else {
          appointment = existingAppt; // Already approved or paid
        }
      } else {
        // Fallback: create as Approved if no matching active appointment exists
        const { data: createdAppt, error: insertError } = await this.supabase.admin
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
        
        if (insertError) {
          if (insertError.code === '23505')
            throw new ConflictException(
              'An appointment already exists for this time slot.',
            );
          throw insertError;
        }
        appointment = createdAppt;
      }

      const { data: updated } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted', patient_id: patientId })
        .eq('id', id)
        .select()
        .maybeSingle();

      const scheduledDate =
        request.preferred_date ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const scheduledTime = request.preferred_time || '10:00 AM';

      if (generatedPassword && request.email) {
        // Send credentials email via database-driven template
        await this.email
          .sendTemplateEmail({
            templateKey: 'patient_welcome',
            to: request.email,
            variables: {
              patientName: request.name,
              email: request.email,
              password: generatedPassword,
              loginUrl: this.email.getUrl('/?auth=login'),
            },
            entityType: 'consultation_request',
            entityId: id,
            event: 'patient_account_provisioned',
          })
          .catch((err) => console.error('Failed to send credentials email', err));
      }

      if (request.email) {
        // Send approval & payment request email via database-driven template
        await this.email
          .sendTemplateEmail({
            templateKey: 'consultation_request_accepted',
            to: request.email,
            variables: {
              patientName: request.name,
              doctorName: doctor?.full_name || 'Specialist',
              scheduledDate,
              scheduledTime,
              paymentUrl: this.email.getUrl('/patient-dashboard/appointments?tab=action_required'),
              amount: doctor?.consultation_fee || 799,
            },
            entityType: 'appointment',
            entityId: appointment?.id,
            event: 'consultation_approved',
          })
          .catch((err) => console.error('Failed to send approval email', err));
      }

      return { ...updated, appointment, emailSent: this.email.isConfigured };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
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

      // Dispatch polite rejection notification via DB template
      if (request.email) {
        this.email
          .sendTemplateEmail({
            templateKey: 'consultation_request_rejected',
            to: request.email,
            variables: {
              patientName: request.name,
              doctorName: user.profile.full_name || 'Specialist',
              preferredDate: request.preferred_date || 'your requested time',
              findDoctorUrl: this.email.getUrl('/doctors'),
            },
            entityType: 'consultation_request',
            entityId: id,
            event: 'consultation_declined',
          })
          .catch((err) => console.error('Failed to send decline email', err));
      }

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
