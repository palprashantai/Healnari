/** Centralized success messages — no hardcoding allowed in controllers/services */
export const SUCCESS_MESSAGES = {
  // Auth
  USER_REGISTERED: 'User successfully registered.',
  LOGIN_SUCCESS: 'Successfully logged in.',

  // Onboarding
  ONBOARDING_COMPLETE: 'Onboarding completed successfully.',

  // Profile
  PROFILE_UPDATED: 'Profile successfully updated.',

  // Appointments
  APPOINTMENT_BOOKED: 'Consultation successfully booked.',
  APPOINTMENT_UPDATED: 'Appointment status successfully updated.',
  APPOINTMENT_CANCELLED: 'Appointment cancelled successfully.',
  APPOINTMENT_RESCHEDULED: 'Appointment rescheduled successfully.',

  // Prescriptions & Records
  PRESCRIPTION_ADDED: 'Prescription added successfully.',
  PRESCRIPTION_REFILL_APPROVED: 'Prescription refill approved.',
  PRESCRIPTION_REFILL_DENIED: 'Prescription refill denied.',
  LAB_RESULT_ADDED: 'Lab result added successfully.',
  SYMPTOM_REPORT_SUBMITTED: 'Symptom report submitted successfully.',

  // Doctor
  KYC_SUBMITTED: 'KYC documents successfully submitted for review.',
  PATIENT_CONTACTED: 'Patient contacted via emergency channel.',
  QUEUE_TOKEN_UPDATED: 'Queue token status updated.',

  // Admin
  VERIFICATION_APPROVED: 'Doctor verification approved.',
  VERIFICATION_REJECTED: 'Doctor verification rejected.',
  REFUND_INITIATED: 'Refund initiated to source.',
  TICKET_RESOLVED: 'Support ticket resolved.',
  TICKET_UPDATED: 'Support ticket status updated.',

  // Generic
  DATA_RETRIEVED: 'Data retrieved successfully.',
  HEALTH_METRICS_UPDATED: 'Health metrics updated successfully.',
  GOAL_LOGGED: 'Goal progress logged for today.',
};
