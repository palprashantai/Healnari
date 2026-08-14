-- ============================================================================
-- Migration 0032: Database-Managed Message & Email Templates System
-- ============================================================================
-- Extends public.message_templates to support slug-based system email templates
-- with subject lines, variable placeholders, and admin management.
-- ============================================================================

alter table public.message_templates
  add column if not exists slug text unique,
  add column if not exists subject text,
  add column if not exists description text,
  add column if not exists is_system boolean not null default false,
  add column if not exists variables_hint jsonb default '[]'::jsonb;

create index if not exists idx_message_templates_slug on public.message_templates (slug);

-- Seed / Upsert Core System Transactional Email Templates
insert into public.message_templates (slug, name, type, audience, subject, description, is_system, variables_hint, content)
values
(
  'appointment_confirmed',
  'Patient Appointment Confirmation',
  'email',
  'Patient',
  '✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}',
  'Sent to the patient when a doctor or clinic approves/confirms their booking.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#10b981;margin-top:0;">✅ Appointment Confirmed</h2>
    <p>Hello {{patientName}},</p>
    <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been confirmed.</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Consultation Date & Time:</p>
      <h3 style="margin:4px 0;color:#0f172a;">{{when}}</h3>
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Type: <strong>{{label}}</strong></p>
    </div>
    <div style="margin:20px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Appointment Details</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;">Please log in 5 minutes early to test your camera and audio.</p>
  </div>'
),
(
  'appointment_cancelled',
  'Appointment Cancellation Notice',
  'email',
  'Patient',
  'Cancelled: Consultation on {{when}}',
  'Sent when a booking is cancelled by a doctor or clinic.',
  true,
  '["patientName", "doctorName", "when", "label", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">Appointment Cancelled</h2>
    <p>Hello {{patientName}},</p>
    <p>Your {{label}} scheduled for <strong>{{when}}</strong> with Dr. {{doctorName}} has been cancelled.</p>
    <p style="font-size:13px;color:#475569;">If you had already paid for this session, a refund has been initiated to your original payment method.</p>
    <div style="margin:20px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Book Another Slot</a>
    </div>
  </div>'
),
(
  'doctor_kyc_approved',
  'Doctor KYC Verification Approved',
  'email',
  'Doctor',
  '🎉 Your HealNari Doctor Account is Verified!',
  'Sent to a doctor once admin verifies their medical registration & license.',
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#10b981;margin-top:0;">🎉 Welcome to HealNari Practice Network</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>We are delighted to inform you that your medical license and practice credentials have been <strong>verified and approved</strong>.</p>
    <p>You can now log in to your provider dashboard, set your consultation hours, and start receiving patient appointments.</p>
    <div style="margin:24px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Go to Doctor Dashboard</a>
    </div>
    <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Clinical Governance Team</p>
  </div>'
),
(
  'doctor_kyc_rejected',
  'Doctor KYC Clarification Request',
  'email',
  'Doctor',
  'Update regarding your HealNari KYC Verification',
  'Sent to a doctor if KYC documents require correction or re-upload.',
  true,
  '["doctorName", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">HealNari KYC Verification Update</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>Thank you for submitting your verification details. Our medical compliance team has reviewed your documents and identified items requiring clarification.</p>
    <p>Please log in to your dashboard to review the feedback and re-upload your medical registration certificate.</p>
    <div style="margin:24px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review KYC Submission</a>
    </div>
    <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Verification Desk</p>
  </div>'
),
(
  'doctor_payout_settlement',
  'Doctor Payout Settlement Advice',
  'email',
  'Doctor',
  'HealNari Payout Settlement Confirmed ({{amount}})',
  'Sent to a doctor when their net consultation earnings are transferred to their bank account.',
  true,
  '["doctorName", "amount", "referenceId", "settlementDate"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">Payment Settlement Advice</h2>
    <p>Dear Dr. {{doctorName}},</p>
    <p>Your net earnings payout has been successfully processed and transferred to your registered bank account.</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Payout Amount:</p>
      <h3 style="margin:4px 0;color:#10b981;font-size:22px;">{{amount}}</h3>
      <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Bank Reference (UTR): <strong>{{referenceId}}</strong></p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">Settlement Date: <strong>{{settlementDate}}</strong></p>
    </div>
    <p style="color:#64748b;font-size:12px;">For any billing queries, please contact finance@healnari.com.</p>
  </div>'
),
(
  'doctor_daily_agenda',
  'Doctor Morning Agenda Digest',
  'email',
  'Doctor',
  'Daily Patient Agenda ({{totalPatients}} appointments) - Dr. {{doctorName}}',
  'Sent daily at 7:45 AM to active doctors with their consultation schedule.',
  true,
  '["doctorName", "formattedDate", "totalPatients", "videoCount", "firstTime", "appointmentsTable", "dashboardUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">🌅 Good morning, Dr. {{doctorName}}</h2>
    <p style="color:#475569;font-size:14px;margin-bottom:16px;">Here is your scheduled consultation agenda for <strong>{{formattedDate}}</strong>:</p>
    
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;flex:1;">
        <span style="font-size:11px;color:#64748b;display:block;">Total Patients</span>
        <strong style="font-size:18px;color:#0f172a;">{{totalPatients}}</strong>
      </div>
      <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;border:1px solid #bbf7d0;flex:1;">
        <span style="font-size:11px;color:#166534;display:block;">Video Consults</span>
        <strong style="font-size:18px;color:#15803d;">{{videoCount}}</strong>
      </div>
      <div style="background:#faf5ff;padding:12px 16px;border-radius:8px;border:1px solid #f3e8ff;flex:1;">
        <span style="font-size:11px;color:#7e22ce;display:block;">First Appointment</span>
        <strong style="font-size:18px;color:#6b21a8;">{{firstTime}}</strong>
      </div>
    </div>

    <table style="width:100%;text-align:left;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;">
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Time</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Type</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Status</th>
        </tr>
      </thead>
      <tbody>
        {{appointmentsTable}}
      </tbody>
    </table>

    <div style="margin:24px 0 12px 0;">
      <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Open Doctor Dashboard</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Practice Management • Auto-generated daily at 7:45 AM</p>
  </div>'
),
(
  'prescription_refill_reminder',
  'Prescription Refill Warning',
  'email',
  'Patient',
  'Refill Reminder: {{medName}} expiring soon',
  'Sent to patients 5 days before active prescription completion.',
  true,
  '["patientName", "medName", "duration", "recordsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#7e22ce;margin-top:0;">💊 Prescription Refill Reminder</h2>
    <p>Hello {{patientName}},</p>
    <p>This is a friendly reminder that your current course of <strong>{{medName}}</strong> ({{duration}}) is nearing completion within the next 5 days.</p>
    <p>To avoid any disruption in your care plan, please re-order your medication or schedule a brief review with your doctor.</p>
    <div style="margin:20px 0;">
      <a href="{{recordsUrl}}" style="background:#7e22ce;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Prescriptions & Refill</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;">HealNari Patient Care Team</p>
  </div>'
),
(
  'admin_daily_revenue_reconciliation',
  'Daily Revenue Settlement Report (Admin)',
  'email',
  'General',
  'HealNari Daily Settlement Report ({{date}})',
  'Sent to administrators at midnight with the 24-hour financial reconciliation breakdown.',
  true,
  '["adminName", "date", "totalGross", "platformCommission", "doctorNetPayouts", "paidCount", "analyticsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#0f172a;margin-top:0;">📊 HealNari 24h Revenue Settlement Report</h2>
    <p>Hello {{adminName}},</p>
    <p>Here is the 24-hour financial reconciliation summary for <strong>{{date}}</strong>:</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Gross Consultation Volume: <strong style="color:#0f172a;">{{totalGross}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Platform Net Commission (15%): <strong style="color:#10b981;">{{platformCommission}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Doctor Payout Liabilities: <strong style="color:#0284c7;">{{doctorNetPayouts}}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b;">Total Paid Consultations: <strong style="color:#0f172a;">{{paidCount}}</strong></p>
    </div>
    <div style="margin-top:20px;">
      <a href="{{analyticsUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Revenue Analytics</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin-top:20px;">HealNari Financial Operations • Automated Midnight Reconciliation</p>
  </div>'
),
(
  'admin_doctor_kyc_escalation',
  'Doctor KYC Escalation (>48h Overdue)',
  'email',
  'General',
  '⚠️ [Escalation] {{pendingCount}} Doctor KYC Verifications Overdue (>48h)',
  'Sent to admins when doctor licenses are pending review for over 48 hours.',
  true,
  '["adminName", "pendingCount", "doctorListHtml", "verificationsUrl"]'::jsonb,
  '<div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="color:#e11d48;margin-top:0;">⚠️ Action Required: Doctor KYC Review Escalation</h2>
    <p>Hello {{adminName}},</p>
    <p>There are <strong>{{pendingCount}} doctor verification(s)</strong> that have been pending review for over 48 hours:</p>
    <ul style="color:#334155;font-size:13px;line-height:1.6;">
      {{doctorListHtml}}
    </ul>
    <div style="margin-top:20px;">
      <a href="{{verificationsUrl}}" style="background:#e11d48;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review Pending Doctor KYCs</a>
    </div>
  </div>'
)
on conflict (slug) do update set
  subject = excluded.subject,
  description = excluded.description,
  is_system = excluded.is_system,
  variables_hint = excluded.variables_hint,
  content = excluded.content;
