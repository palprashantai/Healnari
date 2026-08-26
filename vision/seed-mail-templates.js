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
