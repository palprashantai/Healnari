-- ============================================================================
-- Migration 0054: Database-Driven Email Template System & Email Logs
-- ============================================================================
-- Extends public.message_templates to be the single source of truth for all
-- production email content, subjects, preheaders, and design tokens.
-- Adds public.email_logs for delivery tracking, idempotency, and auditability.
-- Seeds 23 responsive, healthcare-branded transactional templates.
-- ============================================================================

-- 1. Extend message_templates with production email architecture fields
alter table public.message_templates
  add column if not exists category text default 'general',
  add column if not exists preheader text,
  add column if not exists version integer default 1,
  add column if not exists is_active boolean default true;

-- 2. Create email_logs table for auditability and delivery tracking
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  recipient text not null,
  subject text not null,
  event text,
  entity_type text,
  entity_id text,
  status text not null default 'SENT', -- 'QUEUED', 'SENT', 'FAILED', 'RETRYING'
  provider_message_id text,
  error text,
  variables jsonb default '{}'::jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_email_logs_template_key on public.email_logs (template_key);
create index if not exists idx_email_logs_recipient on public.email_logs (recipient);
create index if not exists idx_email_logs_created_at on public.email_logs (created_at desc);
create index if not exists idx_email_logs_entity on public.email_logs (entity_type, entity_id);

alter table public.email_logs enable row level security;

create policy "admin_manage_email_logs" on public.email_logs
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

grant select, insert, update on public.email_logs to authenticated, service_role;

-- 3. Seed / Upsert Core Production Email Templates (23 Standardized Templates)
insert into public.message_templates (slug, name, type, audience, category, subject, preheader, description, is_system, variables_hint, content)
values

-- ============================================================================
-- 1. PATIENT WELCOME & LOGIN CREDENTIALS
-- ============================================================================
(
  'patient_welcome',
  'Patient Account Login Credentials',
  'email',
  'Patient',
  'auth',
  'Welcome to HealNari — Your Patient Portal Credentials',
  'Your secure HealNari patient portal account is ready.',
  'Sent to new patients when their consultation request is approved and an account is created.',
  true,
  '["patientName", "email", "password", "loginUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Welcome to HealNari</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Your Patient Portal Account is Ready</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your personalized patient portal account has been created so you can manage your appointments, join secure video consultations, view digital prescriptions, and connect with your care team.</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; color: #6B46C1; text-transform: uppercase; letter-spacing: 0.5px;">Your Secure Login Credentials</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748B; width: 90px;"><strong>Email:</strong></td>
          <td style="padding: 6px 0; font-size: 14px; color: #1E293B; font-weight: 600;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748B;"><strong>Password:</strong></td>
          <td style="padding: 6px 0; font-size: 14px; color: #1E293B; font-family: monospace; font-weight: 700; background: #FFFFFF; padding: 4px 8px; border-radius: 6px; border: 1px solid #CBD5E1; display: inline-block;">{{password}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{loginUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Login to Patient Portal &rarr;</a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">For your privacy and security, please update your temporary password in your Profile Settings after your first login.</p>
  </div>'
),

-- ============================================================================
-- 2. CONSULTATION REQUEST RECEIVED (PUBLIC LEAD RECEIPT)
-- ============================================================================
(
  'consultation_request_received',
  'Public Consultation Request Received (Patient)',
  'email',
  'Patient',
  'booking',
  'Consultation Request Received — Dr. {{doctorName}}',
  'We have received your appointment request and forwarded it to the specialist.',
  'Sent to patient immediately after submitting the public booking request form.',
  true,
  '["patientName", "doctorName", "scheduledDate", "scheduledTime", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Request Received</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Submitted</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We have received your consultation request with <strong>Dr. {{doctorName}}</strong>. The doctor has been notified and will review your schedule window shortly.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #6B46C1; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Requested Slot</p>
      <p style="margin: 0; font-size: 15px; color: #1E293B;">📅 <strong>Date:</strong> {{scheduledDate}}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; color: #1E293B;">⏰ <strong>Preferred Time:</strong> {{scheduledTime}}</p>
    </div>

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Once Dr. {{doctorName}} confirms the slot, you will receive an approval notification with a secure link to complete payment and lock in your session.</p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Request Status &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 3. CONSULTATION REQUEST TO DOCTOR (NEW LEAD)
-- ============================================================================
(
  'consultation_request_doctor',
  'New Consultation Request (Doctor Notification)',
  'email',
  'Doctor',
  'booking',
  'New Consultation Request: {{patientName}} ({{scheduledDate}})',
  'A new patient has requested a consultation with your practice.',
  'Notification sent to doctor when a new public lead requests an appointment.',
  true,
  '["doctorName", "patientName", "scheduledDate", "scheduledTime", "concern", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Action Required &bull; New Booking</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">New Patient Consultation Request</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;"><strong>{{patientName}}</strong> has requested a consultation slot with your practice on HealNari.</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-left: 4px solid #6B46C1; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #6B46C1; text-transform: uppercase; letter-spacing: 0.5px;">Consultation Request Summary</p>
      <p style="margin: 0; font-size: 14px; color: #1E293B;">👤 <strong>Patient:</strong> {{patientName}}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #1E293B;">📅 <strong>Requested Time:</strong> {{scheduledDate}} at {{scheduledTime}}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #475569;">🩺 <strong>Chief Concern:</strong> {{concern}}</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Review & Accept Request &rarr;</a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; margin: 20px 0 0 0;">Accepting the request reserves the slot on your calendar and prompts the patient for payment confirmation.</p>
  </div>'
),

-- ============================================================================
-- 4. CONSULTATION REQUEST ACCEPTED (PATIENT PAY TO CONFIRM)
-- ============================================================================
(
  'consultation_request_accepted',
  'Consultation Request Approved (Pay to Confirm)',
  'email',
  'Patient',
  'booking',
  'Action Required: Dr. {{doctorName}} accepted your consultation request',
  'Complete payment to confirm your scheduled consultation.',
  'Sent to patient when a doctor approves their booking request, prompting payment confirmation.',
  true,
  '["patientName", "doctorName", "scheduledDate", "scheduledTime", "paymentUrl", "amount"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Action Required &bull; Pay to Confirm</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Approved!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Great news! <strong>Dr. {{doctorName}}</strong> has reviewed and approved your consultation request.</p>
    
    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Approved Appointment Details</p>
      <p style="margin: 0; font-size: 15px; color: #1E293B;">📅 <strong>Date:</strong> {{scheduledDate}}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; color: #1E293B;">⏰ <strong>Time:</strong> {{scheduledTime}}</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350F;">💳 <strong>Consultation Fee:</strong> ₹{{amount}}</p>
    </div>

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">To lock in this slot and activate your digital consultation room, please complete your secure payment.</p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{paymentUrl}}" style="background-color: #F59E0B; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);">Pay Now to Confirm Booking &rarr;</a>
    </div>

    <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;"><strong>Important:</strong> Your requested slot is held for 24 hours. Unconfirmed slots are automatically released back to the specialist calendar.</p>
  </div>'
),

-- ============================================================================
-- 5. CONSULTATION REQUEST REJECTED / DECLINED
-- ============================================================================
(
  'consultation_request_rejected',
  'Consultation Request Declined Notice',
  'email',
  'Patient',
  'booking',
  'Update regarding your consultation request with Dr. {{doctorName}}',
  'Information regarding your consultation request.',
  'Sent to patient if a doctor is unable to take their booking request.',
  true,
  '["patientName", "doctorName", "preferredDate", "findDoctorUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Update</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for reaching out to HealNari. Due to high clinical volume or emergency schedule conflicts, <strong>Dr. {{doctorName}}</strong> is unable to take new consultations for your requested time window ({{preferredDate}}).</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">We have verified specialists in gynecology, PCOS management, fertility, and wellness available for prompt consultation.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{findDoctorUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Browse Available Specialists &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 6. APPOINTMENT REQUESTED (PATIENT RECEIPT - EXISTING PATIENT)
-- ============================================================================
(
  'appointment_requested_patient',
  'Appointment Request Received (Patient)',
  'email',
  'Patient',
  'booking',
  'Consultation Request Submitted — Dr. {{doctorName}}',
  'We have received your appointment request.',
  'Confirmation sent to an existing patient after submitting a consultation request from dashboard.',
  true,
  '["patientName", "doctorName", "when", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Request Submitted</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Submitted</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your consultation request with <strong>Dr. {{doctorName}}</strong> for <strong>{{when}}</strong> has been submitted to the specialist for review.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">You will receive an email and in-app alert as soon as the doctor accepts your request to complete payment confirmation.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Appointment Status &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 7. APPOINTMENT REQUESTED (DOCTOR NOTIFICATION)
-- ============================================================================
(
  'appointment_requested',
  'New Consultation Request (Doctor)',
  'email',
  'Doctor',
  'booking',
  'New Consultation Request from {{patientName}} ({{when}})',
  'A patient has requested a consultation with you.',
  'Notification sent to a doctor when a patient books a new consultation.',
  true,
  '["doctorName", "patientName", "when", "label", "reason", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">New Booking Request</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">New Patient Consultation Request</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;"><strong>{{patientName}}</strong> has requested a {{label}} with your practice.</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-left: 4px solid #6B46C1; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #6B46C1; text-transform: uppercase; letter-spacing: 0.5px;">Consultation Details</p>
      <p style="margin: 0; font-size: 14px; color: #1E293B;">📅 <strong>Requested Slot:</strong> {{when}}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #1E293B;">📋 <strong>Format:</strong> {{label}}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #475569;">🩺 <strong>Chief Concern:</strong> {{reason}}</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Review & Accept Request &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 8. APPOINTMENT APPROVED (EXISTING PATIENT PAY TO CONFIRM)
-- ============================================================================
(
  'appointment_approved',
  'Appointment Approved (Pay to Confirm)',
  'email',
  'Patient',
  'booking',
  'Action Required: Pay to confirm consultation with Dr. {{doctorName}}',
  'Your doctor accepted your request. Pay now to lock in the appointment.',
  'Sent to existing patient when doctor approves an appointment, requiring payment to confirm.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl", "paymentUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Action Required &bull; Pay to Confirm</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Appointment Request Approved!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your {{label}} request with <strong>Dr. {{doctorName}}</strong> has been accepted by the specialist.</p>
    
    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Approved Slot</p>
      <h3 style="margin: 0; color: #92400E; font-size: 17px; font-weight: 800;">{{when}}</h3>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #78350F;">Format: <strong>{{label}}</strong></p>
    </div>

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;"><strong>Please note:</strong> Your appointment slot is held for 24 hours. Complete payment to finalize and confirm your booking.</p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{paymentUrl}}" style="background-color: #F59E0B; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);">Pay Now to Confirm &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 9. APPOINTMENT CONFIRMED
-- ============================================================================
(
  'appointment_confirmed',
  'Appointment Confirmed Notice',
  'email',
  'Patient',
  'booking',
  'Confirmed: Consultation with Dr. {{doctorName}} on {{when}}',
  'Your appointment is locked in.',
  'Sent to patient once appointment payment is settled or confirmed by doctor.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Confirmed</div>
    <h2 style="color: #065F46; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Your Consultation is Confirmed!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your {{label}} with <strong>Dr. {{doctorName}}</strong> is fully confirmed and locked into the doctor''s schedule.</p>
    
    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #10B981; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Confirmed Appointment Details</p>
      <h3 style="margin: 0; color: #0F172A; font-size: 17px; font-weight: 800;">{{when}}</h3>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">Format: <strong>{{label}}</strong></p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Open Consultation Room &rarr;</a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 20px 0 0 0;">Please join your consultation room 5 minutes early to test your camera and audio.</p>
  </div>'
),

-- ============================================================================
-- 10. APPOINTMENT CANCELLED
-- ============================================================================
(
  'appointment_cancelled',
  'Appointment Cancellation Notice',
  'email',
  'Patient',
  'booking',
  'Cancelled: Consultation with Dr. {{doctorName}} on {{when}}',
  'Notice of appointment cancellation.',
  'Sent to patient and doctor when an appointment is cancelled.',
  true,
  '["patientName", "doctorName", "when", "label", "cancellationReason", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFF1F2; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Cancelled</div>
    <h2 style="color: #E11D48; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Appointment Cancelled</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your {{label}} scheduled for <strong>{{when}}</strong> with <strong>Dr. {{doctorName}}</strong> has been cancelled.</p>
    
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #9F1239; line-height: 1.5;">If payment was processed for this consultation, a full refund has been initiated to your original payment method (settles within 3-5 business days).</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Reschedule or Book Another Slot &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 11. APPOINTMENT UNPAID CANCELLED (24H TIMEOUT CRON)
-- ============================================================================
(
  'appointment_unpaid_cancelled',
  'Appointment Expired Due to Non-Payment',
  'email',
  'Patient',
  'booking',
  'Notice: Consultation request expired due to pending payment',
  'Your appointment slot hold has expired.',
  'Sent to patient when 24h payment window passes without payment completion.',
  true,
  '["patientName", "doctorName", "when", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFF1F2; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Slot Released</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Expired</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your tentative consultation request with <strong>Dr. {{doctorName}}</strong> for {{when}} has expired because payment was not completed within the 24-hour hold period.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">To consult with Dr. {{doctorName}} or explore other available women''s healthcare specialists, you can submit a new booking request anytime.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Find Available Specialists &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 12. APPOINTMENT RESCHEDULED
-- ============================================================================
(
  'appointment_rescheduled',
  'Appointment Rescheduled Notice',
  'email',
  'Patient',
  'booking',
  'Rescheduled: Consultation with Dr. {{doctorName}} is now on {{newWhen}}',
  'Your consultation has been rescheduled.',
  'Sent to patient and doctor when an appointment date or time is modified.',
  true,
  '["patientName", "doctorName", "oldWhen", "newWhen", "label", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Rescheduled</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Appointment Rescheduled</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been updated to a new time slot.</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-left: 4px solid #6B46C1; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #94A3B8; text-decoration: line-through;">Previous: {{oldWhen}}</p>
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #6B46C1; text-transform: uppercase; letter-spacing: 0.5px;">New Scheduled Time</p>
      <h3 style="margin: 0; color: #2A1647; font-size: 17px; font-weight: 800;">{{newWhen}}</h3>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">View Updated Schedule &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 13. APPOINTMENT REMINDER (UPCOMING)
-- ============================================================================
(
  'appointment_reminder_upcoming',
  'Upcoming Appointment Reminder (30m Before)',
  'email',
  'Patient',
  'booking',
  'Reminder: Your consultation with Dr. {{doctorName}} is in {{timeRemaining}}',
  'Your upcoming consultation starts shortly.',
  'Automated reminder sent prior to scheduled consultation start.',
  true,
  '["patientName", "doctorName", "when", "label", "timeRemaining", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Starting Soon &bull; {{timeRemaining}}</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Upcoming Consultation Reminder</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">This is a friendly reminder that your {{label}} with <strong>Dr. {{doctorName}}</strong> starts in approximately <strong>{{timeRemaining}}</strong>.</p>
    
    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #10B981; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Schedule</p>
      <h3 style="margin: 0; color: #0F172A; font-size: 17px; font-weight: 800;">{{when}}</h3>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);">Join Telemed Room &rarr;</a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; text-align: center;">Please ensure a stable internet connection and find a quiet, private space for your consultation.</p>
  </div>'
),

-- ============================================================================
-- 14. PAYMENT RECEIPT & INVOICE
-- ============================================================================
(
  'payment_receipt',
  'Payment Receipt & Tax Invoice',
  'email',
  'Patient',
  'billing',
  'HealNari Payment Receipt — {{amount}} ({{service}})',
  'Your payment receipt and invoice are ready.',
  'Sent to patient with PDF invoice attached upon successful payment completion.',
  true,
  '["patientName", "amount", "service", "doctorName", "doctorInfo", "invoiceUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Payment Successful</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Payment Receipt</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We have received your payment for <strong>{{service}}</strong>{{doctorInfo}}.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Amount Paid</p>
      <h3 style="margin: 0; color: #10B981; font-size: 24px; font-weight: 800;">{{amount}}</h3>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #475569;">Service: <strong>{{service}}</strong></p>
    </div>

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your official tax invoice is attached as a PDF to this email for your records and medical claims.</p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{invoiceUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Billing History &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 15. PRESCRIPTION ISSUED
-- ============================================================================
(
  'prescription_issued',
  'New Digital Prescription Issued',
  'email',
  'Patient',
  'records',
  'New Prescription Issued by Dr. {{doctorName}} — HealNari',
  'Your doctor has uploaded your digital prescription.',
  'Sent to patient as soon as doctor issues a digital prescription.',
  true,
  '["patientName", "doctorName", "diagnosis", "medicineCount", "recordsUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Digital Prescription</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">New Digital Prescription Available</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;"><strong>Dr. {{doctorName}}</strong> has issued a digital prescription and care plan following your consultation.</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-left: 4px solid #6B46C1; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1E293B;">🩺 <strong>Diagnosis / Care Plan:</strong> {{diagnosis}}</p>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #6B46C1; font-weight: 700;">💊 Medications Prescribed: {{medicineCount}} item(s)</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{recordsUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">View & Download Prescription &rarr;</a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; text-align: center;">For security and patient privacy, full dosage details are accessible in your encrypted patient portal.</p>
  </div>'
),

-- ============================================================================
-- 16. PRESCRIPTION REFILL REMINDER (CRON)
-- ============================================================================
(
  'prescription_refill_reminder',
  'Prescription Course Completion & Refill Reminder',
  'email',
  'Patient',
  'records',
  'Refill Reminder: {{medName}} course nearing completion',
  'Refill reminder for your ongoing medication.',
  'Automated reminder sent 5 days before active prescription course concludes.',
  true,
  '["patientName", "medName", "duration", "recordsUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Medication Refill Alert</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Prescription Course Ending Soon</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">This is a friendly reminder that your current course of <strong>{{medName}}</strong> ({{duration}}) is scheduled to complete in approximately 5 days.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">To maintain treatment continuity and titrate dosages as needed, please request a refill or schedule a follow-up review with your doctor.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{recordsUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Request Refill in Portal &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 17. PATIENT FOLLOW-UP REMINDER (CRON)
-- ============================================================================
(
  'patient_followup_reminder',
  'Recommended Follow-Up Consultation Reminder',
  'email',
  'Patient',
  'records',
  'Time for Your Follow-Up Review with Dr. {{doctorName}}',
  'Your doctor recommended a routine review around this time.',
  'Automated reminder sent 10-14 days after completed consultation.',
  true,
  '["patientName", "doctorName", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Follow-Up Review</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Time for Your Routine Follow-Up</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Following your recent consultation, <strong>Dr. {{doctorName}}</strong> recommended scheduling a follow-up review around this time to monitor your symptoms and evaluate treatment response.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">Regular follow-up appointments allow your specialist to fine-tune your prescription and ensure your care journey is on track.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Book Follow-Up Consultation &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 18. DOCTOR KYC VERIFICATION APPROVED
-- ============================================================================
(
  'doctor_kyc_approved',
  'Doctor Credentials Verification Approved',
  'email',
  'Doctor',
  'compliance',
  'Welcome to HealNari Practice Network — Credentials Verified!',
  'Your medical provider credentials have been verified.',
  'Sent to doctor once administrator verifies medical license and credentials.',
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Verified Provider</div>
    <h2 style="color: #065F46; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Welcome to HealNari Practice Network</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We are delighted to confirm that your medical registration, degree certificates, and clinical credentials have been <strong>verified and approved</strong> by our clinical governance board.</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your public specialist profile is now published on HealNari. You can now set your consultation availability slots and receive patients.</p>
    
    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Open Provider Dashboard &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 19. DOCTOR KYC VERIFICATION REJECTED / CLARIFICATION
-- ============================================================================
(
  'doctor_kyc_rejected',
  'Doctor KYC Verification Clarification Request',
  'email',
  'Doctor',
  'compliance',
  'Action Required: HealNari Medical Verification Update',
  'Clarification required for medical credentials.',
  'Sent to doctor if KYC documents require correction or re-upload.',
  true,
  '["doctorName", "dashboardUrl", "reason"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFF1F2; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Clarification Required</div>
    <h2 style="color: #E11D48; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Provider Verification Update</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for submitting your practice credentials. Our clinical governance team has reviewed your documents and identified items requiring clarification or re-upload:</p>
    
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #9F1239; line-height: 1.5;">{{reason}}</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Review & Resubmit Documents &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 20. DOCTOR PAYOUT SETTLEMENT ADVICE
-- ============================================================================
(
  'doctor_payout_settlement',
  'Doctor Payout Settlement Advice',
  'email',
  'Doctor',
  'billing',
  'HealNari Payout Settlement Confirmed — {{amount}}',
  'Your consultation earnings payout has been processed.',
  'Sent to doctor when consultation earnings are transferred to bank account.',
  true,
  '["doctorName", "amount", "referenceId", "settlementDate", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Payout Settled</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Payout Settlement Advice</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your consultation earnings payout has been settled and transferred to your registered bank account.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Settled Amount</p>
      <h3 style="margin: 0; color: #10B981; font-size: 24px; font-weight: 800;">{{amount}}</h3>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">Bank Reference (UTR): <strong>{{referenceId}}</strong></p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Settlement Date: <strong>{{settlementDate}}</strong></p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Financial Ledger &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 21. DOCTOR DAILY AGENDA (CRON)
-- ============================================================================
(
  'doctor_daily_agenda',
  'Doctor Morning Schedule Digest',
  'email',
  'Doctor',
  'booking',
  'Daily Patient Agenda ({{totalPatients}} consultations) — Dr. {{doctorName}}',
  'Your consultation schedule for today.',
  'Daily digest sent to active doctors at 7:45 AM.',
  true,
  '["doctorName", "formattedDate", "totalPatients", "videoCount", "firstTime", "appointmentsTable", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.3;">Good Morning, Dr. {{doctorName}}</h2>
    <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">Here is your scheduled consultation agenda for today (<strong>{{formattedDate}}</strong>):</p>
    
    <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <tr>
          <td style="padding: 6px;">
            <span style="font-size: 11px; color: #64748B; display: block; font-weight: bold; text-transform: uppercase;">Total Consults</span>
            <strong style="font-size: 20px; color: #2A1647;">{{totalPatients}}</strong>
          </td>
          <td style="padding: 6px; border-left: 1px solid #E9D8FD;">
            <span style="font-size: 11px; color: #166534; display: block; font-weight: bold; text-transform: uppercase;">Video Sessions</span>
            <strong style="font-size: 20px; color: #15803D;">{{videoCount}}</strong>
          </td>
          <td style="padding: 6px; border-left: 1px solid #E9D8FD;">
            <span style="font-size: 11px; color: #7E22CE; display: block; font-weight: bold; text-transform: uppercase;">First Appointment</span>
            <strong style="font-size: 18px; color: #6B21A8;">{{firstTime}}</strong>
          </td>
        </tr>
      </table>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
      <thead>
        <tr style="background-color: #F8FAFC; color: #64748B; font-size: 11px; text-transform: uppercase;">
          <th style="padding: 10px 12px; border-bottom: 2px solid #E2E8F0; text-align: left;">Time</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #E2E8F0; text-align: left;">Format</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #E2E8F0; text-align: left;">Status</th>
        </tr>
      </thead>
      <tbody>
        {{appointmentsTable}}
      </tbody>
    </table>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Open Doctor Telemed Suite &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 22. ADMIN DAILY REVENUE RECONCILIATION (CRON)
-- ============================================================================
(
  'admin_daily_revenue_reconciliation',
  'Daily Revenue Settlement Report (Admin)',
  'email',
  'General',
  'admin',
  'HealNari Daily Settlement Report ({{date}})',
  'Daily financial reconciliation report for administration.',
  'Sent to administrators at midnight with the 24-hour financial reconciliation breakdown.',
  true,
  '["adminName", "date", "totalGross", "platformCommission", "doctorNetPayouts", "paidCount", "analyticsUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">HealNari 24h Revenue Settlement Report</h2>
    <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">Hello <strong>{{adminName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">Here is the automated financial reconciliation summary for <strong>{{date}}</strong>:</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B;">Gross Volume: <strong style="color: #0F172A; font-size: 16px;">{{totalGross}}</strong></p>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B;">Platform Net Commission: <strong style="color: #10B981; font-size: 16px;">{{platformCommission}}</strong></p>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B;">Doctor Payout Liabilities: <strong style="color: #0284C7; font-size: 16px;">{{doctorNetPayouts}}</strong></p>
      <p style="margin: 0; font-size: 13px; color: #64748B;">Paid Consultations: <strong style="color: #0F172A;">{{paidCount}}</strong></p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{analyticsUrl}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">View Revenue Analytics &rarr;</a>
    </div>
  </div>'
),

-- ============================================================================
-- 23. ADMIN DOCTOR KYC ESCALATION (CRON)
-- ============================================================================
(
  'admin_doctor_kyc_escalation',
  'Doctor KYC Escalation (>48h Overdue)',
  'email',
  'General',
  'admin',
  '⚠️ [Escalation] {{pendingCount}} Doctor KYC Verifications Overdue (>48h)',
  'Action required: doctor verification pending review.',
  'Sent to admins when doctor licenses are pending review for over 48 hours.',
  true,
  '["adminName", "pendingCount", "doctorListHtml", "verificationsUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFF1F2; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">⚠️ Verification Escalation</div>
    <h2 style="color: #E11D48; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Action Required: Doctor KYC Review Escalation</h2>
    <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">Hello <strong>{{adminName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">There are <strong>{{pendingCount}} doctor verification(s)</strong> that have been pending review for over 48 hours:</p>
    
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <ul style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 20px;">
        {{doctorListHtml}}
      </ul>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{verificationsUrl}}" style="background-color: #E11D48; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Review Pending Provider KYCs &rarr;</a>
    </div>
  </div>'
)

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  audience = excluded.audience,
  category = excluded.category,
  subject = excluded.subject,
  preheader = excluded.preheader,
  description = excluded.description,
  is_system = excluded.is_system,
  variables_hint = excluded.variables_hint,
  content = excluded.content;
