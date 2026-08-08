/** Centralized success messages — no hardcoding allowed in controllers/services */
export const SUCCESS_MESSAGES = {
  // Auth
  USER_REGISTERED: 'User successfully registered.',
  LOGIN_SUCCESS: 'Successfully logged in.',

  // Onboarding
  ONBOARDING_COMPLETE: 'Onboarding completed successfully.',

  // Profile
  PROFILE_UPDATED: 'Profile successfully updated.',
  PASSWORD_UPDATED: 'Password successfully updated.',

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

  // Family / Care Circle
  CONNECTION_INVITED: 'Invitation sent successfully.',
  CONNECTION_PERMISSIONS_UPDATED: 'Sharing permissions updated.',
  CONNECTION_REMOVED: 'Connection removed from your care circle.',

  // Discovery / Waitlist
  FAVORITE_ADDED: 'Added to favourites.',
  FAVORITE_REMOVED: 'Removed from favourites.',
  WAITLIST_JOINED: 'Added to the waitlist.',
  WAITLIST_LEFT: 'Removed from the waitlist.',

  // Records vault
  LAB_REPORT_REVIEWED: 'Lab report reviewed.',
  DOCUMENT_UPLOADED: 'Document added to records vault.',
  DOCUMENT_DELETED: 'Document removed from records vault.',
  VACCINATION_ADDED: 'Vaccination record added.',
  CONTACT_ADDED: 'Emergency contact added.',
  CONTACT_DELETED: 'Emergency contact removed.',

  // Billing
  PAYMENT_RECORDED: 'Payment recorded successfully.',
  PAYOUT_REQUESTED: 'Payout requested successfully.',

  // Telemedicine
  NOTE_SAVED: 'Consultation note saved.',

  // Staff
  STAFF_ADDED: 'Staff member added.',
  STAFF_UPDATED: 'Staff member updated.',
  STAFF_REMOVED: 'Staff member removed.',
  LEAVE_UPDATED: 'Leave request updated.',

  // Communications
  BROADCAST_SENT: 'Broadcast sent successfully.',
  BROADCAST_SCHEDULED: 'Broadcast scheduled successfully.',
};
