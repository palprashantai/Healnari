-- Migration: Seed Doctor Welcome & KYC Verification Email Templates into message_templates

insert into public.message_templates (
  slug, name, type, audience, category, subject, preheader, description, is_system, variables_hint, content
) values
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
  '["doctorName", "reason", "dashboardUrl"]'::jsonb,
  '<div style="margin-bottom: 20px;">
    <div style="display: inline-block; background-color: #FFE4E6; border: 1px solid #FECDD3; color: #9F1239; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Action Required</div>
    <h2 style="color: #9F1239; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Verification Clarification Needed</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for submitting your verification details. Our medical governance board requested clarification regarding your uploaded document.</p>
    
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #9F1239; uppercase;">Review Notes:</p>
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
  variables_hint = excluded.variables_hint,
  content = excluded.content,
  updated_at = now();
