import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { apiFetch } from '../lib/apiClient.js';
import NotificationPermissionModal from './NotificationPermissionModal.jsx';
import {
  playGentleChime,
  playStandardNotification,
  playImportantNotification,
} from '../lib/notificationAudio.js';

const TIMEZONES = [
  { label: 'India Standard Time (IST, GMT+5:30)', value: 'Asia/Kolkata' },
  { label: 'Gulf Standard Time (GST, Dubai, GMT+4)', value: 'Asia/Dubai' },
  { label: 'Greenwich Mean Time (GMT/BST, London)', value: 'Europe/London' },
  { label: 'Central European Time (CET, Paris/Berlin)', value: 'Europe/Paris' },
  { label: 'Eastern Time (US & Canada, GMT-5)', value: 'America/New_York' },
  { label: 'Pacific Time (US & Canada, GMT-8)', value: 'America/Los_Angeles' },
  { label: 'Singapore / Malaysia (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Australian Eastern Time (Sydney, GMT+10)', value: 'Australia/Sydney' },
];

export function NotificationSettingsTab() {
  const {
    user,
    subscribePush,
    unsubscribePush,
    pushPermissionState,
    isPushSubscribed,
    isPushSupported,
    pushLoading,
  } = useAuth();

  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrePrompt, setShowPrePrompt] = useState(false);

  const [prefs, setPrefs] = useState({
    appointment_reminders: true,
    doctor_messages: true,
    consultation_updates: true,
    health_reminders: true,
    medication_reminders: true,
    cycle_reminders: true,
    marketing_notifications: false,
    sound_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    timezone: 'Asia/Kolkata',
  });

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/notifications/preferences');
      if (res) {
        setPrefs((prev) => ({
          ...prev,
          ...res,
        }));
      }
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPrefs();
  }, [user, fetchPrefs]);

  const handleSavePrefs = async (updated) => {
    const nextPrefs = updated || prefs;
    setSaving(true);
    try {
      await apiFetch('/notifications/preferences', {
        method: 'PUT',
        body: nextPrefs,
      });
      toast('Notification preferences saved.', 'success');
    } catch {
      toast('Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    handleSavePrefs(updated);
  };

  const handlePushToggle = async () => {
    if (isPushSubscribed) {
      const ok = await unsubscribePush();
      if (ok) {
        toast('Push notifications disabled on this device.', 'info');
      } else {
        toast('Failed to unsubscribe push.', 'error');
      }
    } else {
      if (pushPermissionState === 'default') {
        setShowPrePrompt(true);
      } else if (pushPermissionState === 'denied') {
        toast('Notifications are blocked by your browser. Please update permissions in browser settings.', 'warning');
      } else {
        const res = await subscribePush();
        if (res?.success) {
          toast('Push notifications enabled for this device!', 'success');
        } else {
          toast('Could not enable push notifications.', 'error');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <i className="fas fa-spinner fa-spin text-xl mr-2"></i> Loading notification settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <NotificationPermissionModal
        isOpen={showPrePrompt}
        onClose={() => setShowPrePrompt(false)}
        onPermissionHandled={(granted) => {
          if (granted) setShowPrePrompt(false);
        }}
      />

      {/* Device Push Registration Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-aubergine-50 text-aubergine-600 flex items-center justify-center text-lg flex-shrink-0">
              <i className="fas fa-mobile-screen"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Device Push Notifications</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Receive instant alerts for ringing consultations and urgent health notices even when your tab is closed.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isPushSubscribed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : pushPermissionState === 'denied'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPushSubscribed
                        ? 'bg-emerald-500'
                        : pushPermissionState === 'denied'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  ></span>
                  {isPushSubscribed
                    ? 'Subscribed on this device'
                    : pushPermissionState === 'denied'
                    ? 'Blocked by browser settings'
                    : 'Not subscribed'}
                </span>
                {!isPushSupported && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                    Web Push unsupported in this browser
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handlePushToggle}
            disabled={pushLoading || !isPushSupported}
            className={`w-12 h-6 rounded-full relative transition-all border flex-shrink-0 disabled:opacity-40 ${
              isPushSubscribed
                ? 'bg-aubergine-600 border-aubergine-600'
                : 'bg-slate-200 border-slate-300'
            }`}
            title={isPushSubscribed ? 'Click to disable' : 'Click to enable'}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                isPushSubscribed ? 'right-1' : 'left-1'
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Healthcare Notification Sound Strategy */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-volume-high text-aubergine-600"></i>
              Calm Notification Sounds
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Specially designed soft, harmonic acoustic chimes. Non-alarming, privacy-safe, and alert-fatigue resistant.
            </p>
          </div>

          <button
            onClick={() => toggleCategory('sound_enabled')}
            className={`w-11 h-6 rounded-full relative transition-all border flex-shrink-0 ml-3 ${
              prefs.sound_enabled
                ? 'bg-aubergine-600 border-aubergine-600'
                : 'bg-slate-200 border-slate-300'
            }`}
            title={prefs.sound_enabled ? 'Sounds Enabled' : 'Sounds Muted'}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                prefs.sound_enabled ? 'right-1' : 'left-1'
              }`}
            ></div>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {/* Level 1: Gentle */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Level 1 • Gentle</span>
                <span className="text-[10px] text-slate-400">~0.6s</span>
              </div>
              <p className="text-xs font-bold text-slate-700">Soft Wellness Chime</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Used for cycle tracking, wellness check-in, and health reminders.</p>
            </div>
            <button
              onClick={() => playGentleChime()}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <i className="fas fa-play text-[10px] text-aubergine-600"></i> Preview Chime
            </button>
          </div>

          {/* Level 2: Standard */}
          <div className="p-3.5 rounded-xl border border-aubergine-200/80 bg-aubergine-50/30 flex flex-col justify-between space-y-3 relative">
            <span className="absolute -top-2 right-3 bg-aubergine-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Signature
            </span>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-aubergine-700">Level 2 • Standard</span>
                <span className="text-[10px] text-aubergine-400">~1.1s</span>
              </div>
              <p className="text-xs font-bold text-slate-800">HealNari Signature Chime</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Two-note glass marimba. Used for appointments, doctor messages, & prescriptions.</p>
            </div>
            <button
              onClick={() => playStandardNotification()}
              className="px-3 py-1.5 rounded-lg bg-aubergine-600 text-white hover:bg-aubergine-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-aubergine-600/20"
            >
              <i className="fas fa-play text-[10px]"></i> Preview Sound
            </button>
          </div>

          {/* Level 3: Important */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Level 3 • Important</span>
                <span className="text-[10px] text-slate-400">~1.3s</span>
              </div>
              <p className="text-xs font-bold text-slate-700">Consultation Call Alert</p>
              <p className="text-[11px] text-slate-500 mt-0.5">3-note harmonic chime. Reserved strictly for upcoming video calls and queue turns.</p>
            </div>
            <button
              onClick={() => playImportantNotification()}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <i className="fas fa-play text-[10px] text-aubergine-600"></i> Preview Chime
            </button>
          </div>
        </div>
      </div>

      {/* Healthcare Notification Categories */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-800">Notification Categories</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose which types of alerts you wish to receive. Healthcare privacy safeguards apply across all categories.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'appointment_reminders',
              title: 'Appointment Reminders & Queue Updates',
              desc: 'Alerts before upcoming consultations, doctor queue delays, and booking confirmations.',
              icon: 'fa-calendar-check',
            },
            {
              key: 'consultation_updates',
              title: 'Consultation & Doctor Calls',
              desc: 'Live video call rings, telemedicine room invitations, and doctor notes.',
              icon: 'fa-video',
            },
            {
              key: 'medication_reminders',
              title: 'Prescription & Medication Refills',
              desc: 'Timely reminders when ongoing prescriptions near completion or require doctor review.',
              icon: 'fa-pills',
            },
            {
              key: 'cycle_reminders',
              title: 'Menstrual Cycle & Fertility Tracker',
              desc: 'Predictions for upcoming cycles, fertile windows, and symptom log reminders.',
              icon: 'fa-heart-pulse',
            },
            {
              key: 'health_reminders',
              title: 'Lab Reports & Clinical Follow-ups',
              desc: 'Notifications when requested diagnostic lab reports are uploaded or reviewed by your doctor.',
              icon: 'fa-file-medical',
            },
            {
              key: 'marketing_notifications',
              title: 'Health Tips & Educational Articles (Silent by default)',
              desc: 'Curated wellness insights, women health guides, and platform feature updates.',
              icon: 'fa-book-open',
            },
          ].map((cat) => (
            <div
              key={cat.key}
              className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-sm mt-0.5">
                  <i className={`fas ${cat.icon}`}></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{cat.title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{cat.desc}</p>
                </div>
              </div>

              <button
                onClick={() => toggleCategory(cat.key)}
                className={`w-11 h-6 rounded-full relative transition-all border flex-shrink-0 ml-3 ${
                  prefs[cat.key]
                    ? 'bg-aubergine-600 border-aubergine-600'
                    : 'bg-slate-200 border-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                    prefs[cat.key] ? 'right-1' : 'left-1'
                  }`}
                ></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours & Timezone */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-800">Quiet Hours & Timezone Scheduling</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Mute non-urgent notifications during your sleep hours. Urgent incoming calls will always reach you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Your Preferred Timezone</label>
            <select
              value={prefs.timezone || 'Asia/Kolkata'}
              onChange={(e) => {
                const updated = { ...prefs, timezone: e.target.value };
                setPrefs(updated);
                handleSavePrefs(updated);
              }}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white focus:ring-2 focus:ring-aubergine-300 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-700">Enable Quiet Hours</p>
              <p className="text-[11px] text-slate-500">Mute non-urgent alerts during sleep</p>
            </div>
            <button
              onClick={() => toggleCategory('quiet_hours_enabled')}
              className={`w-11 h-6 rounded-full relative transition-all border flex-shrink-0 ${
                prefs.quiet_hours_enabled
                  ? 'bg-aubergine-600 border-aubergine-600'
                  : 'bg-slate-200 border-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                  prefs.quiet_hours_enabled ? 'right-1' : 'left-1'
                }`}
              ></div>
            </button>
          </div>
        </div>

        {prefs.quiet_hours_enabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Quiet Hours Start</label>
              <input
                type="time"
                value={prefs.quiet_hours_start || '22:00'}
                onChange={(e) => {
                  const updated = { ...prefs, quiet_hours_start: e.target.value };
                  setPrefs(updated);
                  handleSavePrefs(updated);
                }}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white focus:ring-2 focus:ring-aubergine-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Quiet Hours End</label>
              <input
                type="time"
                value={prefs.quiet_hours_end || '07:00'}
                onChange={(e) => {
                  const updated = { ...prefs, quiet_hours_end: e.target.value };
                  setPrefs(updated);
                  handleSavePrefs(updated);
                }}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-white focus:ring-2 focus:ring-aubergine-300 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>Preferences update automatically across all your synced devices.</span>
        {saving && <span className="text-aubergine-600 font-semibold flex items-center gap-1.5"><i className="fas fa-spinner fa-spin"></i> Saving...</span>}
      </div>
    </div>
  );
}

export default NotificationSettingsTab;
