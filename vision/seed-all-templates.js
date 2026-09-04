require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

const templates = [
  // 1. Patient Welcome & Account Credentials
  {
    slug: 'patient_welcome',
    name: 'Patient Account Login Credentials',
    type: 'email',
    audience: 'Patient',
    category: 'auth',
    subject: 'Welcome to HealNari — Your Patient Portal Credentials',
    preheader: 'Your secure HealNari patient portal account is ready.',
    description: 'Sent to new patients when their consultation request is approved and an account is created.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'email', 'password', 'loginUrl'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 2. Consultation Request Received (Patient Receipt)
  {
    slug: 'consultation_request_received',
    name: 'Public Consultation Request Received (Patient)',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Consultation Request Received — Dr. {{doctorName}}',
    preheader: 'We have received your appointment request and forwarded it to the specialist.',
    description: 'Sent to patient immediately after submitting the public booking request form.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'scheduledDate', 'scheduledTime', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 3. Consultation Request to Doctor
  {
    slug: 'consultation_request_doctor',
    name: 'New Consultation Request (Doctor Notification)',
    type: 'email',
    audience: 'Doctor',
    category: 'booking',
    subject: 'New Consultation Request: {{patientName}} ({{scheduledDate}})',
    preheader: 'A new patient has requested a consultation with your practice.',
    description: 'Notification sent to doctor when a new public lead requests an appointment.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'patientName', 'scheduledDate', 'scheduledTime', 'concern', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 4. Consultation Request Accepted (Patient)
  {
    slug: 'consultation_request_accepted',
    name: 'Consultation Request Approved (Pay to Confirm)',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Action Required: Dr. {{doctorName}} accepted your consultation request',
    preheader: 'Complete payment to confirm your scheduled consultation.',
    description: 'Sent to patient when a doctor approves their booking request, prompting payment confirmation.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'scheduledDate', 'scheduledTime', 'paymentUrl', 'amount'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 5. Consultation Request Rejected (Patient)
  {
    slug: 'consultation_request_rejected',
    name: 'Consultation Request Declined Notice',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Update regarding your consultation request with Dr. {{doctorName}}',
    preheader: 'Information regarding your consultation request.',
    description: 'Sent to patient if a doctor is unable to take their booking request.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'preferredDate', 'findDoctorUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Consultation Slot Unavailable</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We regret to inform you that <strong>Dr. {{doctorName}}</strong> is unavailable for the requested slot on {{preferredDate}} due to scheduling constraints.</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Our clinical directory features other top specialists in women's health who are ready to support your care.</p>
        
        <div style="text-align: center; margin: 26px 0;">
          <a href="{{findDoctorUrl}}" style="background-color: #6B46C1; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Browse Other Specialists &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 6. Appointment Requested (Direct booking)
  {
    slug: 'appointment_requested',
    name: 'Appointment Requested (Doctor)',
    type: 'email',
    audience: 'Doctor',
    category: 'booking',
    subject: 'New Appointment Request from {{patientName}}',
    preheader: 'A patient has requested a consultation slot.',
    description: 'Sent to doctor when an existing patient requests a direct consultation.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'patientName', 'when', 'label', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#6B46C1;margin-top:0;">New Appointment Request</h2>
        <p>Hello Dr. {{doctorName}},</p>
        <p><strong>{{patientName}}</strong> has requested a {{label}}.</p>
        <div style="background:#FAF5FF;padding:16px;border-radius:8px;border:1px solid #E9D8FD;margin:16px 0;">
          <p style="margin:4px 0;font-size:13px;color:#6B46C1;">Requested Date & Time:</p>
          <h3 style="margin:4px 0;color:#2A1647;">{{when}}</h3>
        </div>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#6B46C1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">Review Request &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 7. Appointment Requested (Patient receipt)
  {
    slug: 'appointment_requested_patient',
    name: 'Appointment Requested Confirmation (Patient)',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Appointment Request Submitted — Dr. {{doctorName}}',
    preheader: 'Your appointment request has been submitted.',
    description: 'Sent to patient upon requesting a session.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'when', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">Appointment Request Submitted</h2>
        <p>Hello {{patientName}},</p>
        <p>Your request for a session with <strong>Dr. {{doctorName}}</strong> on <strong>{{when}}</strong> has been submitted. The doctor will review and approve the slot.</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#0F172A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">View Appointment Status</a>
        </div>
      </div>
    `.trim()
  },

  // 8. Appointment Approved (Patient)
  {
    slug: 'appointment_approved',
    name: 'Appointment Approved — Payment Required',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Action Required: Pay to Confirm your Consultation with Dr. {{doctorName}}',
    preheader: 'Your consultation request was approved. Complete payment to secure your time slot.',
    description: 'Sent to patient when a doctor approves an appointment, prompting payment.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'when', 'label', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 14px;">Action Required</div>
        <h2 style="color:#2A1647;margin-top:0;">Appointment Approved!</h2>
        <p>Hello {{patientName}},</p>
        <p>Your {{label}} request with <strong>Dr. {{doctorName}}</strong> has been approved.</p>
        <div style="background:#FFFBEB;padding:16px;border-radius:8px;border:1px solid #FDE68A;margin:16px 0;">
          <p style="margin:4px 0;font-size:13px;color:#92400E;">Approved Date & Time:</p>
          <h3 style="margin:4px 0;color:#92400E;">{{when}}</h3>
        </div>
        <p style="font-size: 14px;">Your appointment slot is reserved. Complete the consultation fee payment to finalize your session.</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#D97706;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block;">Pay Now to Confirm &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 9. Appointment Confirmed (Canonical)
  {
    slug: 'appointment_confirmed',
    name: 'Appointment Confirmed (Universal)',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: '✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}',
    preheader: 'Your consultation is locked in and confirmed.',
    description: 'Confirmation sent upon successful payment/confirmation.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'when', 'label', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 14px;">Confirmed</div>
        <h2 style="color:#065F46;margin-top:0;">Appointment Confirmed</h2>
        <p>Hello {{patientName}},</p>
        <p>Your {{label}} with <strong>Dr. {{doctorName}}</strong> has been confirmed.</p>
        <div style="background:#F8FAFC;padding:16px;border-radius:8px;border:1px solid #E2E8F0;margin:16px 0;">
          <p style="margin:4px 0;font-size:13px;color:#64748B;">Date & Time:</p>
          <h3 style="margin:4px 0;color:#0F172A;">{{when}}</h3>
        </div>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#0F172A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">View Appointment & Telemedicine Room</a>
        </div>
      </div>
    `.trim()
  },

  // 10. Appointment Confirmed (Patient alias)
  {
    slug: 'appointment_confirmed_patient',
    name: 'Appointment Confirmed (Patient)',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Confirmed: Consultation with Dr. {{doctorName}} on {{scheduledDate}}',
    preheader: 'Your consultation has been confirmed.',
    description: 'Sent to patient upon payment confirmation.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'scheduledDate', 'scheduledTime', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">Appointment Confirmed!</h2>
        <p>Hello {{patientName}},</p>
        <p>Your session with <strong>Dr. {{doctorName}}</strong> is locked in for <strong>{{scheduledDate}} at {{scheduledTime}}</strong>.</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#6B46C1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Join Telemedicine Call</a>
        </div>
      </div>
    `.trim()
  },

  // 11. Appointment Cancelled (Canonical)
  {
    slug: 'appointment_cancelled',
    name: 'Appointment Cancelled',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Cancelled: Consultation on {{when}}',
    preheader: 'Your consultation has been cancelled.',
    description: 'Sent to patient when an appointment is cancelled.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'when', 'label', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#E11D48;margin-top:0;">Appointment Cancelled</h2>
        <p>Hello {{patientName}},</p>
        <p>Your {{label}} scheduled for <strong>{{when}}</strong> with Dr. {{doctorName}} has been cancelled.</p>
        <p style="font-size:13px;color:#475569;">If you had already paid for this session, a refund has been initiated to your original payment method.</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{dashboardUrl}}" style="background:#0F172A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">Book Another Slot &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 12. Appointment Unpaid Cancelled
  {
    slug: 'appointment_unpaid_cancelled',
    name: 'Unpaid Booking Slot Released',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: 'Notice: Appointment Slot Released (Unpaid)',
    preheader: 'Your unconfirmed booking slot has been released.',
    description: 'Sent when an approved slot expires without payment.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'scheduledDate', 'rebookUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#64748B;margin-top:0;">Booking Window Expired</h2>
        <p>Hello {{patientName}},</p>
        <p>The reservation window for your consultation with Dr. {{doctorName}} on {{scheduledDate}} has expired because payment was not completed.</p>
        <p>You may request a new slot at any time.</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{rebookUrl}}" style="background:#6B46C1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Find a Specialist &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 13. Appointment Reminder Upcoming
  {
    slug: 'appointment_reminder_upcoming',
    name: 'Upcoming Appointment Reminder',
    type: 'email',
    audience: 'Patient',
    category: 'booking',
    subject: '⏰ Reminder: Consultation with Dr. {{doctorName}} in 30 minutes',
    preheader: 'Your consultation is starting soon. Test your camera and microphone.',
    description: 'Sent 30-60 minutes before scheduled start time.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'scheduledTime', 'callUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">Your Consultation Starts Soon</h2>
        <p>Hello {{patientName}},</p>
        <p>This is a gentle reminder that your appointment with <strong>Dr. {{doctorName}}</strong> is scheduled for today at <strong>{{scheduledTime}}</strong>.</p>
        <div style="margin:24px 0;text-align:center;">
          <a href="{{callUrl}}" style="background:#6B46C1;color:#fff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Enter Consultation Room &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 14. Doctor KYC Approved
  {
    slug: 'doctor_kyc_approved',
    name: 'Doctor Credentials Verification Approved',
    type: 'email',
    audience: 'Doctor',
    category: 'compliance',
    subject: '🎉 Credentials Verified — Welcome to HealNari Practice Network',
    preheader: 'Your medical provider credentials have been verified.',
    description: 'Sent to doctor once administrator verifies medical license and credentials.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">✓ Verified Provider</div>
        <h2 style="color: #065F46; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Welcome to HealNari Practice Network</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Dear Dr. <strong>{{doctorName}}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We are delighted to confirm that your medical registration, degree certificates, and clinical credentials have been <strong>verified and approved</strong> by our medical governance board.</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your public specialist profile is now active. You can now set your consultation availability slots, receive patient bookings, and issue digital prescriptions.</p>
        <div style="text-align: center; margin: 26px 0;">
          <a href="{{dashboardUrl}}" style="background-color: #059669; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Go to Doctor Portal &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 15. Doctor Welcome Credentials
  {
    slug: 'doctor_welcome_credentials',
    name: 'Doctor Provider Account Welcome Credentials',
    type: 'email',
    audience: 'Doctor',
    category: 'onboarding',
    subject: '🩺 Welcome Dr. {{doctorName}} — Your HealNari Provider Credentials & Login Details',
    preheader: 'Your doctor provider account has been approved and created.',
    description: 'Sent to doctor when administrator approves pre-registration application, generating account login credentials.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'email', 'password', 'loginUrl'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 16. Doctor KYC Rejected / Clarification
  {
    slug: 'doctor_kyc_rejected',
    name: 'Doctor KYC Verification Clarification Request',
    type: 'email',
    audience: 'Doctor',
    category: 'compliance',
    subject: 'KYC Verification Update — Document Clarification Required',
    preheader: 'Clarification required for medical credentials.',
    description: 'Sent to doctor if KYC documents require correction or re-upload.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'reason', 'dashboardUrl'],
    content: `
      <div style="margin-bottom: 20px;">
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
      </div>
    `.trim()
  },

  // 17. Payment Receipt / Success
  {
    slug: 'payment_receipt',
    name: 'Consultation Payment Receipt',
    type: 'email',
    audience: 'Patient',
    category: 'billing',
    subject: 'Receipt: Payment confirmed for consultation with Dr. {{doctorName}}',
    preheader: 'Your payment was processed successfully.',
    description: 'Sent upon successful transaction processing.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'amount', 'transactionId', 'receiptUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#065F46;margin-top:0;">Payment Confirmed</h2>
        <p>Hello {{patientName}},</p>
        <p>We received your payment of <strong>{{amount}}</strong> for your consultation with Dr. {{doctorName}}.</p>
        <div style="background:#F8FAFC;padding:16px;border-radius:8px;border:1px solid #E2E8F0;margin:16px 0;">
          <p style="margin:4px 0;font-size:12px;color:#64748B;">Transaction ID: {{transactionId}}</p>
        </div>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{receiptUrl}}" style="background:#0F172A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Download Invoice PDF</a>
        </div>
      </div>
    `.trim()
  },

  // 18. Prescription Issued
  {
    slug: 'prescription_issued',
    name: 'Digital Prescription Issued',
    type: 'email',
    audience: 'Patient',
    category: 'clinical',
    subject: 'New Digital Prescription from Dr. {{doctorName}}',
    preheader: 'Your e-prescription has been issued and is available.',
    description: 'Sent after doctor writes and signs digital prescription.',
    is_system: true,
    is_active: true,
    variables_hint: ['patientName', 'doctorName', 'prescriptionUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">Your Prescription is Ready</h2>
        <p>Hello {{patientName}},</p>
        <p><strong>Dr. {{doctorName}}</strong> has issued a digital prescription following your consultation.</p>
        <div style="margin:24px 0;text-align:center;">
          <a href="{{prescriptionUrl}}" style="background:#6B46C1;color:#fff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">View & Download Prescription PDF</a>
        </div>
      </div>
    `.trim()
  },

  // 19. Admin Provider Application Alert
  {
    slug: 'admin_provider_application',
    name: 'New Provider Application (Admin Alert)',
    type: 'email',
    audience: 'General',
    category: 'onboarding',
    subject: 'New Doctor Application: Dr. {{doctorName}} ({{specialty}})',
    preheader: 'A new doctor application is awaiting review.',
    description: 'Sent to platform admins when a specialist applies to join.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'specialty', 'email', 'reviewUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">New Provider Application</h2>
        <p>A new doctor application has been submitted:</p>
        <ul style="color:#334155;line-height:1.8;">
          <li><strong>Name:</strong> Dr. {{doctorName}}</li>
          <li><strong>Specialty:</strong> {{specialty}}</li>
          <li><strong>Email:</strong> {{email}}</li>
        </ul>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{reviewUrl}}" style="background:#6B46C1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Review Provider Application &rarr;</a>
        </div>
      </div>
    `.trim()
  },

  // 20. Doctor Daily Agenda
  {
    slug: 'doctor_daily_agenda',
    name: 'Doctor Daily Agenda Digest',
    type: 'email',
    audience: 'Doctor',
    category: 'clinical',
    subject: '📋 Your Consultation Schedule for Today — {{todayDate}}',
    preheader: 'Summary of scheduled consultations for today.',
    description: 'Morning automated digest for practicing doctors.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'todayDate', 'appointmentCount', 'scheduleListHtml', 'portalUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#2A1647;margin-top:0;">Good morning, Dr. {{doctorName}}</h2>
        <p>You have <strong>{{appointmentCount}} consultation(s)</strong> scheduled for today ({{todayDate}}):</p>
        <div style="background:#FAF5FF;padding:16px;border-radius:8px;border:1px solid #E9D8FD;margin:16px 0;">
          {{scheduleListHtml}}
        </div>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{portalUrl}}" style="background:#6B46C1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Open Provider Portal</a>
        </div>
      </div>
    `.trim()
  },

  // 21. Doctor Payout Settlement
  {
    slug: 'doctor_payout_settlement',
    name: 'Doctor Earnings Payout Processed',
    type: 'email',
    audience: 'Doctor',
    category: 'billing',
    subject: '💸 Payout Processed: {{amount}} credited to your bank account',
    preheader: 'Your weekly consultation earnings payout has been settled.',
    description: 'Sent when finance sweep processes weekly payouts.',
    is_system: true,
    is_active: true,
    variables_hint: ['doctorName', 'amount', 'referenceId', 'statementUrl'],
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color:#065F46;margin-top:0;">Payout Settled</h2>
        <p>Dear Dr. {{doctorName}},</p>
        <p>Your weekly consultation payout of <strong>{{amount}}</strong> has been transferred to your registered bank account (Ref: {{referenceId}}).</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="{{statementUrl}}" style="background:#0F172A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Financial Statement</a>
        </div>
      </div>
    `.trim()
  }
];

async function seedAll() {
  console.log(`Starting insertion of ${templates.length} email templates into public.message_templates...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const t of templates) {
    const { error } = await supabase
      .from('message_templates')
      .upsert({
        slug: t.slug,
        name: t.name,
        type: t.type || 'email',
        audience: t.audience || 'General',
        category: t.category || 'general',
        subject: t.subject,
        preheader: t.preheader || '',
        description: t.description || '',
        is_system: t.is_system !== undefined ? t.is_system : true,
        is_active: t.is_active !== undefined ? t.is_active : true,
        variables_hint: t.variables_hint || [],
        content: t.content,
        version: 1
      }, { onConflict: 'slug' });

    if (error) {
      console.error(`❌ Failed [${t.slug}]:`, error.message);
      failCount++;
    } else {
      console.log(`✅ Upserted [${t.slug}] - "${t.name}"`);
      successCount++;
    }
  }

  console.log(`\nDone! Successfully seeded: ${successCount} | Failed: ${failCount}`);
}

seedAll().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
