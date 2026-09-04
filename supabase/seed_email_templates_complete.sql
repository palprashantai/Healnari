-- ============================================================================
-- Seed All Production Email Templates into public.message_templates
-- ============================================================================

insert into public.message_templates (
  slug, name, type, audience, category, subject, preheader, description, is_system, is_active, variables_hint, content
) values
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
  true,
  '["patientName", "doctorName", "scheduledDate", "scheduledTime", "paymentUrl", "amount"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Slot Approved</div>
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Request Accepted!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Good news! <strong>Dr. {{doctorName}}</strong> has reviewed and accepted your appointment request. Please finalize your booking by completing the consultation fee payment.</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #10B981; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1E293B;">📅 <strong>Confirmed Slot:</strong> {{scheduledDate}} at {{scheduledTime}}</p>
      <p style="margin: 8px 0 0 0; font-size: 15px; color: #0F172A;">💳 <strong>Consultation Fee:</strong> {{amount}}</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{paymentUrl}}" style="background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);">Pay & Confirm Appointment &rarr;</a>
    </div>
  </div>'
),
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
  true,
  '["patientName", "doctorName", "preferredDate", "findDoctorUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Slot Unavailable</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We regret to inform you that <strong>Dr. {{doctorName}}</strong> is unavailable for the requested slot on {{preferredDate}} due to scheduling constraints.</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Our clinical directory features other top specialists in women''s health who are ready to support your care.</p>
    
    <div style="text-align: center; margin: 26px 0;">
      <a href="{{findDoctorUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Browse Other Specialists &rarr;</a>
    </div>
  </div>'
),
(
  'doctor_kyc_approved',
  'Doctor Credentials Verification Approved',
  'email',
  'Doctor',
  'compliance',
  '🎉 Credentials Verified — Welcome to HealNari Practice Network',
  'Your medical provider credentials have been verified.',
  'Sent to doctor once administrator verifies medical license and credentials.',
  true,
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Verified Provider</div>
    <h2 style="color: #065F46; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Welcome to HealNari Practice Network</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We are delighted to confirm that your medical registration, degree certificates, and clinical credentials have been <strong>verified and approved</strong> by our medical governance board.</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your public specialist profile is now active. You can now set your consultation availability slots, receive patient bookings, and issue digital prescriptions.</p>
    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #059669; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Go to Doctor Portal &rarr;</a>
    </div>
  </div>'
),
(
  'doctor_welcome_credentials',
  'Doctor Provider Account Welcome Credentials',
  'email',
  'Doctor',
  'onboarding',
  '🩺 Welcome Dr. {{doctorName}} — Your HealNari Provider Credentials & Login Details',
  'Your doctor provider account has been approved and created.',
  'Sent to doctor when administrator approves pre-registration application, generating account login credentials.',
  true,
  true,
  '["doctorName", "email", "password", "loginUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #F3E8FF; border: 1px solid #DDD6FE; color: #6B46C1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Provider Access</div>
    <h2 style="color: #4C1D95; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Welcome to HealNari Provider Network</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Congratulations! Your specialist provider application has been approved. A doctor account has been set up for you with the following login credentials:</p>
    
    <div style="background-color: #F8F6FF; border: 1px solid #DDD6FE; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 13px; color: #4C1D95;"><strong>Login Email:</strong> <span style="font-family: monospace; color: #6B46C1; font-size: 14px; font-weight: bold;">{{email}}</span></p>
      <p style="margin: 8px 0 4px 0; font-size: 13px; color: #4C1D95;"><strong>Temporary Password:</strong> <span style="font-family: monospace; color: #6B46C1; font-size: 14px; font-weight: bold;">{{password}}</span></p>
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #6B21A8;">* Please change your password after logging into your dashboard for security.</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{loginUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(107, 70, 193, 0.25);">Log In to Provider Dashboard &rarr;</a>
    </div>
  </div>'
),
(
  'doctor_kyc_rejected',
  'Doctor KYC Verification Clarification Request',
  'email',
  'Doctor',
  'compliance',
  'KYC Verification Update — Document Clarification Required',
  'Clarification required for medical credentials.',
  'Sent to doctor if KYC documents require correction or re-upload.',
  true,
  true,
  '["doctorName", "reason", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFE4E6; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Action Required</div>
    <h2 style="color: #9F1239; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Verification Clarification Needed</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for submitting your verification details. Our medical governance board requested clarification regarding your uploaded document.</p>
    
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #9F1239;">Review Notes:</p>
      <p style="margin: 0; font-size: 13px; color: #BE123C; line-height: 1.5;">{{reason}}</p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{dashboardUrl}}" style="background-color: #E11D48; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Re-upload Documents &rarr;</a>
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
  is_active = excluded.is_active,
  variables_hint = excluded.variables_hint,
  content = excluded.content,
  updated_at = now();
