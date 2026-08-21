/**
 * Unified Analytics & Event Measurement Layer for HealNari
 * Dispatches structured events to window.dataLayer (GTM, GA4, Meta Pixel, Google Ads)
 * and custom DOM event observers for real-time tracking.
 */

export function trackEvent(eventName, payload = {}) {
  try {
    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      ...payload,
    };

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(eventData);
      
      // Also broadcast as a custom DOM event for any embedded observers
      window.dispatchEvent(new CustomEvent('healnari:analytics', { detail: eventData }));
    }
  } catch (err) {
    console.warn('[Analytics] Failed to track event:', eventName, err);
  }
}

// Complete Digital Health Marketplace Event Taxonomy
export const AnalyticsEvents = {
  // Patient Discovery & Intake Funnel
  LANDING_VIEWED: 'patient_landing_viewed',
  SPECIALIST_SEARCH_STARTED: 'specialist_search_started',
  SPECIALIST_PROFILE_VIEWED: 'specialist_profile_viewed',
  SYMPTOM_CHECKER_OPENED: 'symptom_checker_opened',
  SYMPTOM_CHECKER_COMPLETED: 'symptom_checker_completed',
  
  // Booking & Transaction Funnel
  BOOKING_MODAL_OPENED: 'booking_modal_opened',
  BOOKING_DOCTOR_SELECTED: 'booking_doctor_selected',
  BOOKING_STEP_COMPLETED: 'booking_step_completed',
  BOOKING_SUBMITTED: 'booking_submitted',
  BOOKING_SUCCESS: 'booking_success',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Clinical Consultation & Retention
  CONSULTATION_JOINED: 'consultation_joined',
  CONSULTATION_COMPLETED: 'consultation_completed',
  PRESCRIPTION_DOWNLOADED: 'prescription_downloaded',
  FOLLOW_UP_SCHEDULED: 'follow_up_scheduled',
  CARE_PASS_VIEWED: 'care_pass_viewed',
  CARE_PASS_DOWNLOADED: 'care_pass_downloaded',
  CYCLE_LOGGED: 'cycle_logged',
  
  // Provider / Doctor Funnel
  DOCTOR_LANDING_VIEWED: 'doctor_landing_viewed',
  PROVIDER_APPLY_OPENED: 'provider_apply_opened',
  PROVIDER_APPLY_STEP_COMPLETED: 'provider_apply_step_completed',
  PROVIDER_APPLY_SUCCESS: 'provider_apply_success',
  PROVIDER_CALCULATOR_INTERACTED: 'provider_calculator_interacted',
  DOCTOR_SHARE_OPENED: 'doctor_share_opened',
  DOCTOR_QR_PRINTED: 'doctor_qr_printed',
  DOCTOR_LINK_COPIED: 'doctor_link_copied',
  
  // Lead Capture & Navigation
  EXIT_INTENT_SHOWN: 'exit_intent_shown',
  EXIT_INTENT_LEAD_CAPTURED: 'exit_intent_lead_captured',
  AUTH_MODAL_OPENED: 'auth_modal_opened',
  AUTH_SUCCESS: 'auth_success',
  ARTICLE_VIEWED: 'article_viewed',
  CONDITION_PAGE_VIEWED: 'condition_page_viewed',
  INSTAGRAM_CLICKED: 'instagram_community_clicked',
};

export default {
  trackEvent,
  AnalyticsEvents,
};
