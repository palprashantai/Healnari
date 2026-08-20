/**
 * Unified Analytics & Event Measurement Layer for HealNari
 * Dispatches structured events to window.dataLayer (GTM, GA4, Meta Pixel, Google Ads)
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

// Standard Event Names
export const AnalyticsEvents = {
  // Patient Funnel
  LANDING_VIEWED: 'patient_landing_viewed',
  SYMPTOM_CHECKER_OPENED: 'symptom_checker_opened',
  SYMPTOM_CHECKER_COMPLETED: 'symptom_checker_completed',
  BOOKING_MODAL_OPENED: 'booking_modal_opened',
  BOOKING_DOCTOR_SELECTED: 'booking_doctor_selected',
  BOOKING_STEP_COMPLETED: 'booking_step_completed',
  BOOKING_SUBMITTED: 'booking_submitted',
  BOOKING_SUCCESS: 'booking_success',
  
  // Provider / Doctor Funnel
  DOCTOR_LANDING_VIEWED: 'doctor_landing_viewed',
  PROVIDER_APPLY_OPENED: 'provider_apply_opened',
  PROVIDER_APPLY_STEP_COMPLETED: 'provider_apply_step_completed',
  PROVIDER_APPLY_SUCCESS: 'provider_apply_success',
  PROVIDER_CALCULATOR_INTERACTED: 'provider_calculator_interacted',
  
  // Lead Capture & Navigation
  EXIT_INTENT_SHOWN: 'exit_intent_shown',
  EXIT_INTENT_LEAD_CAPTURED: 'exit_intent_lead_captured',
  AUTH_MODAL_OPENED: 'auth_modal_opened',
  ARTICLE_VIEWED: 'article_viewed',
  CONDITION_PAGE_VIEWED: 'condition_page_viewed',
};
