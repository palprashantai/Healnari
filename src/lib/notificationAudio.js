/**
 * HealNari Healthcare Notification Sound Engine.
 * 
 * Implements a calm, reassuring, privacy-safe audio experience tailored for a women's healthcare platform.
 * Follows Apple Human Interface Guidelines and clinical alert fatigue prevention principles:
 * - Short duration (0.6s - 1.3s)
 * - Soft attack and warm acoustic harmonics
 * - Never alarming, loud, or anxiety-inducing
 * - Never communicates specific medical conditions through sound (privacy-safe)
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a single harmonic note with soft attack, bell overtone, and smooth exponential decay.
 */
function playHarmonicNote(ctx, freq, startTime, duration, volume = 0.22) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();

  const gain = ctx.createGain();
  const overtoneGain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc3.type = 'sine';

  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 2; // Warm octave overtone
  osc3.frequency.value = freq * 3; // Subtle third harmonic

  overtoneGain.gain.value = 0.22;

  // Soft attack (prevents popping/clicking) and organic exponential release
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc2.connect(overtoneGain);
  osc3.connect(overtoneGain);
  overtoneGain.connect(gain);
  osc1.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(startTime);
  osc2.start(startTime);
  osc3.start(startTime);

  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);
  osc3.stop(startTime + duration);
}

/**
 * LEVEL 1 — GENTLE CHIME (0.6s)
 * Single soothing note (E5 @ 659Hz).
 * Use for: Daily wellness check-in, tracking reminders, educational tips.
 */
export function playGentleChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return playAudioFallback('/audio/healnari-gentle.wav');
    const now = ctx.currentTime;
    playHarmonicNote(ctx, 659.25, now, 0.6, 0.2);
  } catch {
    playAudioFallback('/audio/healnari-gentle.wav');
  }
}

/**
 * LEVEL 2 — STANDARD SIGNATURE CHIME (1.1s)
 * Signature 2-note glass chime (G#5 -> B5).
 * Use for: Appointment confirmations, reminders, messages, prescriptions, records.
 */
export function playStandardNotification() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return playAudioFallback('/audio/healnari-standard.wav');
    const now = ctx.currentTime;
    playHarmonicNote(ctx, 830.61, now, 0.45, 0.22); // G#5
    playHarmonicNote(ctx, 987.77, now + 0.2, 0.75, 0.24); // B5
  } catch {
    playAudioFallback('/audio/healnari-standard.wav');
  }
}

/**
 * LEVEL 3 — IMPORTANT CONSULTATION CHIME (1.3s)
 * 3-note harmonic triad (E5 -> G#5 -> B5).
 * Reserved strictly for time-sensitive consultation events (e.g. Doctor calling / starting soon).
 */
export function playImportantNotification() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return playAudioFallback('/audio/healnari-important.wav');
    const now = ctx.currentTime;
    playHarmonicNote(ctx, 659.25, now, 0.35, 0.2);  // E5
    playHarmonicNote(ctx, 830.61, now + 0.18, 0.38, 0.22); // G#5
    playHarmonicNote(ctx, 987.77, now + 0.38, 0.8, 0.26);  // B5
  } catch {
    playAudioFallback('/audio/healnari-important.wav');
  }
}

function playAudioFallback(src) {
  try {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio(src);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

/**
 * Maps incoming notification types to their recommended sound level.
 */
export function getNotificationSoundLevel(type) {
  switch (type) {
    // Level 3 - Important (Time-sensitive only)
    case 'appointment_called':
    case 'appointment_delayed':
    case 'urgent_lab_result':
      return 'important';

    // Level 2 - Standard (Default HealNari Sound)
    case 'appointment_reminder':
    case 'appointment_requested':
    case 'appointment_approved':
    case 'appointment_cancelled':
    case 'doctor_daily_agenda':
    case 'doctor_message':
    case 'prescription_issued':
    case 'prescription_refill_due':
    case 'refill_requested':
    case 'lab_report_requested':
    case 'lab_report_uploaded':
    case 'lab_report_reviewed':
    case 'payment_success':
    case 'payment_received':
    case 'payment_refund_processed':
    case 'care_plan_renewal_due':
      return 'standard';

    // Level 1 - Gentle
    case 'period_prediction':
    case 'fertility_window':
    case 'cycle_reminder':
    case 'lifestyle_daily_reminder':
    case 'follow_up_recommended':
      return 'gentle';

    // Silent by default
    case 'broadcast':
    case 'marketing':
    case 'admin_daily_revenue_summary':
    case 'admin_kyc_escalation':
      return 'silent';

    default:
      return 'standard';
  }
}

/**
 * Plays the appropriate sound for a notification if user sound preferences and quiet hours allow.
 */
export function playNotificationSoundForType(type, preferences = {}) {
  if (preferences.sound_enabled === false) return;

  const level = getNotificationSoundLevel(type);
  if (level === 'silent') return;

  // Check category-specific sound preferences if provided
  if (level === 'gentle' && preferences.health_sound === false && preferences.cycle_sound === false) return;
  if (level === 'standard') {
    if (type.startsWith('appointment') && preferences.appointment_sound === false) return;
    if (type.startsWith('prescription') && preferences.medication_sound === false) return;
  }

  if (level === 'gentle') {
    playGentleChime();
  } else if (level === 'important') {
    playImportantNotification();
  } else {
    playStandardNotification();
  }
}
