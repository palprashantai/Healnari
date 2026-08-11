/** Centralized error messages — no hardcoding allowed in controllers/services */
export const ERROR_MESSAGES = {
  // Auth
  USER_NOT_FOUND: 'User not found.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_ALREADY_EXISTS: 'User with this email already exists.',
  UNAUTHORIZED: 'Unauthorized access.',
  FORBIDDEN: 'You do not have permission to perform this action.',

  // Patients
  PATIENT_NOT_FOUND: 'Patient profile not found.',
  ONBOARDING_INCOMPLETE: 'Please complete onboarding before accessing this feature.',

  // Family / Care Circle
  CONNECTION_NOT_FOUND: 'Care circle connection not found.',
  CONNECTION_ALREADY_INVITED: 'This person has already been invited to your care circle.',

  // Discovery / Waitlist
  FAVORITE_ALREADY_EXISTS: 'This doctor is already in your favourites.',
  FAVORITE_NOT_FOUND: 'Favourite not found.',
  WAITLIST_ENTRY_NOT_FOUND: 'Waitlist entry not found.',

  // Doctors
  DOCTOR_NOT_FOUND: 'Doctor not found or not verified.',
  KYC_ALREADY_SUBMITTED: 'KYC documents have already been submitted.',
  DOCTOR_NOT_VERIFIED: 'Your account is pending admin verification. You will get access to patient data once approved.',

  // Appointments
  APPOINTMENT_NOT_FOUND: 'Appointment not found.',
  APPOINTMENT_CONFLICT: 'The selected time slot is already booked.',
  APPOINTMENT_PAST_DATE: 'Cannot book an appointment in the past.',
  APPOINTMENT_ALREADY_CANCELLED: 'This appointment is already cancelled.',

  // Records
  PRESCRIPTION_NOT_FOUND: 'Prescription not found.',
  LAB_RESULT_NOT_FOUND: 'Lab result not found.',
  REFILL_NOT_FOUND: 'Refill request not found.',

  // Admin
  VERIFICATION_NOT_FOUND: 'Verification request not found.',
  REFUND_NOT_FOUND: 'Refund request not found.',
  TICKET_NOT_FOUND: 'Support ticket not found.',

  // Records vault
  DOCUMENT_NOT_FOUND: 'Document not found.',
  CONTACT_NOT_FOUND: 'Emergency contact not found.',

  // Billing
  PAYMENT_NOT_FOUND: 'Payment not found.',

  // Staff
  STAFF_NOT_FOUND: 'Staff member not found.',
  LEAVE_NOT_FOUND: 'Leave request not found.',

  // Notifications
  NOTIFICATION_NOT_FOUND: 'Notification not found.',

  // Generic
  BAD_REQUEST: 'Bad request. Please check your parameters.',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred.',
};
