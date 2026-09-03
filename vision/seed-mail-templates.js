require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Node 20 requires ws for RealtimeClient which initializes with createClient
const WebSocket = require('ws');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

const templates = [
  {
    name: 'Appointment Requested',
    slug: 'appointment_requested',
    subject: 'New Appointment Request from {{patientName}}',
    content: `
      <h2 style="color:#3b82f6;margin-top:0;">New Appointment Request</h2>
      <p>Hello Dr. {{doctorName}},</p>
      <p><strong>{{patientName}}</strong> has requested a {{label}}.</p>
      <div style="background:#eff6ff;padding:16px;border-radius:8px;border:1px solid #bfdbfe;margin:16px 0;">
        <p style="margin:4px 0;font-size:13px;color:#1e3a8a;">Requested Date & Time:</p>
        <h3 style="margin:4px 0;color:#1e40af;">{{when}}</h3>
      </div>
      <div style="margin:20px 0;">
        <a href="https://healnari.vercel.app/doctor/telemedicine" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Review Request</a>
      </div>
    `.trim()
  },
  {
    name: 'Appointment Confirmed',
    slug: 'appointment_confirmed',
    subject: '✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}',
    content: `
      <h2 style="color:#10b981;margin-top:0;">✅ Appointment Confirmed</h2>
      <p>Hello {{patientName}},</p>
      <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been fully confirmed.</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
        <p style="margin:4px 0;font-size:13px;color:#64748b;">Consultation Date & Time:</p>
        <h3 style="margin:4px 0;color:#0f172a;">{{when}}</h3>
        <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Type: <strong>{{label}}</strong></p>
      </div>
      <div style="margin:20px 0;">
        <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">View Appointment Details</a>
      </div>
      <p style="color:#94a3b8;font-size:11px;">Please log in 5 minutes early to test your camera and audio.</p>
    `.trim()
  },
  {
    name: 'Appointment Approved',
    slug: 'appointment_approved',
    subject: 'Action Required: Pay to Confirm your Consultation with Dr. {{doctorName}}',
    content: `
      <h2 style="color:#f59e0b;margin-top:0;">Action Required</h2>
      <p>Hello {{patientName}},</p>
      <p>Your {{label}} request with <strong>Dr. {{doctorName}}</strong> has been approved.</p>
      <div style="background:#fffbeb;padding:16px;border-radius:8px;border:1px solid #fde68a;margin:16px 0;">
        <p style="margin:4px 0;font-size:13px;color:#92400e;">Approved Date & Time:</p>
        <h3 style="margin:4px 0;color:#92400e;">{{when}}</h3>
        <p style="margin:8px 0 0 0;font-size:12px;color:#92400e;">Type: <strong>{{label}}</strong></p>
      </div>
      <p style="font-size: 14px;"><strong>Your appointment is not yet confirmed.</strong> You must complete the payment to secure this time slot.</p>
      <div style="margin:20px 0;">
        <a href="{{dashboardUrl}}" style="background:#f59e0b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Pay Now to Confirm</a>
      </div>
    `.trim()
  },
  {
    name: 'Appointment Cancelled',
    slug: 'appointment_cancelled',
    subject: 'Cancelled: Consultation on {{when}}',
    content: `
      <h2 style="color:#e11d48;margin-top:0;">Appointment Cancelled</h2>
      <p>Hello {{patientName}},</p>
      <p>Your {{label}} scheduled for <strong>{{when}}</strong> with Dr. {{doctorName}} has been cancelled.</p>
      <p style="font-size:13px;color:#475569;">If you had already paid for this session, a refund has been initiated to your original payment method.</p>
      <div style="margin:20px 0;">
        <a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Book Another Slot</a>
      </div>
    `.trim()
  },
  {
    name: 'Doctor KYC Approved',
    slug: 'doctor_kyc_approved',
    subject: '🎉 Credentials Verified — Welcome to HealNari Practice Network',
    content: `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #065f46 0%, #059669 100%); padding: 32px 28px; text-align: center;">
    <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
      ✓ Verification Approved
    </div>
    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.5px;">
      Credentials Verified &amp; Approved
    </h1>
    <p style="color: #a7f3d0; font-size: 13px; margin: 8px 0 0 0; font-weight: 500;">
      You are now an active specialist practitioner
    </p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">
      Dear Dr. {{doctorName}},
    </p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
      We are delighted to confirm that your state medical council registration, degree certificates, and clinical credentials have been <strong>verified and approved</strong> by our clinical governance board.
    </p>
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; margin-bottom: 10px;">
        ✨ What You Can Do Now:
      </div>
      <ul style="margin: 0; padding-left: 20px; color: #047857; font-size: 13px; line-height: 1.8;">
        <li>Set up your weekly tele-consultation availability slots</li>
        <li>Receive patient bookings &amp; digital video appointments</li>
        <li>Access patient records &amp; issue e-Prescriptions</li>
        <li>Receive direct weekly payout settlements</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="{{dashboardUrl}}" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(5, 150, 105, 0.3);">
        Open Doctor Dashboard &rarr;
      </a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 28px; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      © 2026 HealNari Health Inc. • Clinical Governance &amp; Medical Compliance Board
    </p>
  </div>
</div>
    `.trim()
  },
  {
    name: 'Doctor Welcome Credentials',
    slug: 'doctor_welcome_credentials',
    subject: '🩺 Welcome Dr. {{doctorName}} — Your HealNari Provider Credentials & Login Details',
    content: `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #2A1647 0%, #6B46C1 100%); padding: 32px 28px; text-align: center;">
    <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
      Provider Onboarding • Verified
    </div>
    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.5px;">
      Welcome to HealNari Network
    </h1>
    <p style="color: #e9d8fd; font-size: 13px; margin: 8px 0 0 0; font-weight: 500;">
      Your specialist provider account is ready
    </p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">
      Dear Dr. {{doctorName}},
    </p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      Congratulations! Your specialist application and medical credentials have been successfully verified by our clinical board. Below are your secure login credentials to access the HealNari Provider Portal:
    </p>
    <div style="background: #f8f6ff; border: 1px solid #ddd6fe; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6b46c1; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #ede9fe; padding-bottom: 8px;">
        🔒 Access Credentials
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Login Portal:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">HealNari Provider Dashboard</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Account Email:</td>
          <td style="padding: 6px 0; color: #6b46c1; font-family: monospace; font-size: 15px; font-weight: 700;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temp Password:</td>
          <td style="padding: 6px 0;">
            <span style="background: #ffffff; border: 1px solid #c4b5fd; color: #4c1d95; font-family: monospace; font-size: 15px; font-weight: 800; padding: 4px 10px; border-radius: 6px; display: inline-block;">{{password}}</span>
          </td>
        </tr>
      </table>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #ddd6fe; font-size: 12px; color: #7c3aed; font-weight: 500;">
        ⚠️ For security reasons, please change your password after your first login.
      </div>
    </div>
    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="{{loginUrl}}" style="background: linear-gradient(135deg, #6b46c1 0%, #4c1d95 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(107, 70, 193, 0.3);">
        Log In to Provider Portal &rarr;
      </a>
    </div>
    <p style="color: #64748b; font-size: 12px; line-height: 1.5; text-align: center; margin: 0;">
      Need assistance? Contact our Credentialing Helpdesk at <a href="mailto:providers@healnari.com" style="color: #6b46c1; font-weight: 700; text-decoration: none;">providers@healnari.com</a>
    </p>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 28px; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      © 2026 HealNari Health Inc. • Confidential Medical Governance Notice
    </p>
  </div>
</div>
    `.trim()
  },
  {
    name: 'Doctor KYC Rejected',
    slug: 'doctor_kyc_rejected',
    subject: 'KYC Verification Update — Document Clarification Required',
    content: `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #9f1239 0%, #e11d48 100%); padding: 32px 28px; text-align: center;">
    <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
      Action Required • Clarification
    </div>
    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.5px;">
      Verification Update Needed
    </h1>
    <p style="color: #fecdd3; font-size: 13px; margin: 8px 0 0 0; font-weight: 500;">
      Please review your uploaded medical credentials
    </p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">
      Dear Dr. {{doctorName}},
    </p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
      Thank you for submitting your verification details. Our medical governance board requested clarification regarding your submitted documentation:
    </p>
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px; margin-bottom: 8px;">
        📋 Governance Board Notes:
      </div>
      <p style="color: #be123c; font-size: 14px; line-height: 1.6; margin: 0; font-weight: 600;">
        {{reason}}
      </p>
    </div>
    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="{{dashboardUrl}}" style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(225, 29, 72, 0.3);">
        Re-upload Documents &rarr;
      </a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 28px; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      © 2026 HealNari Health Inc. • Medical Credentialing Desk
    </p>
  </div>
</div>
    `.trim()
  }
];

async function seed() {
  for (const template of templates) {
    console.log(`Upserting template: ${template.slug}...`);
    const { error } = await supabase
      .from('message_templates')
      .upsert({ ...template }, { onConflict: 'slug' });
    
    if (error) {
      console.error(`Failed to upsert ${template.slug}:`, error);
    } else {
      console.log(`Successfully upserted ${template.slug}`);
    }
  }
  console.log('Finished seeding email templates.');
}

seed().catch(console.error);
