export interface FallbackTemplate {
  subject: string;
  preheader?: string;
  content: string;
}

export const FALLBACK_EMAIL_TEMPLATES: Record<string, FallbackTemplate> = {
  consultation_request_doctor: {
    subject: 'New Consultation Request: {{patientName}} ({{scheduledDate}})',
    preheader: 'A new patient has requested a consultation with your practice.',
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
    `.trim(),
  },

  consultation_request_received: {
    subject: 'Consultation Request Received — Dr. {{doctorName}}',
    preheader: 'We have received your appointment request and forwarded it to the specialist.',
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
    `.trim(),
  },

  patient_welcome: {
    subject: 'Welcome to HealNari — Your Patient Portal Credentials',
    preheader: 'Your secure HealNari patient portal account is ready.',
    content: `
      <div style="margin-bottom: 20px;">
        <h2 style="color: #2A1647; font-size: 21px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;">Welcome to HealNari</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{patientName}}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Your secure HealNari patient account has been created. You can now access your confidential medical records, join video consultations, and track your wellness journey.</p>
        
        <div style="background-color: #FAF5FF; border: 1px solid #E9D8FD; border-radius: 12px; padding: 20px; margin: 22px 0;">
          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #6B46C1; text-transform: uppercase; letter-spacing: 0.5px;">Your Temporary Login Credentials</p>
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
    `.trim(),
  },

  consultation_request_accepted: {
    subject: 'Action Required: Dr. {{doctorName}} accepted your consultation request',
    preheader: 'Complete payment to confirm your scheduled consultation.',
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
    `.trim(),
  },

  consultation_request_rejected: {
    subject: 'Update regarding your consultation request with Dr. {{doctorName}}',
    preheader: 'Information regarding your consultation request.',
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
    `.trim(),
  },
};
