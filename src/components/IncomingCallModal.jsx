import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext.jsx';

const RING_TIMEOUT_MS = 45000; // auto-decline if nobody answers, like a real phone

/** Synthesizes a two-tone chime via the Web Audio API — a musical fourth
 * (B5 -> E6) rather than a flat single-frequency beep, with an exponential
 * envelope so each note fades naturally instead of clicking on/off. Avoids
 * shipping/licensing an audio asset for something this small. */
function useRingtone(active) {
  useEffect(() => {
    if (!active) return undefined;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const ctx = new AudioContextClass();

    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      overtone.type = 'sine';
      osc.frequency.value = freq;
      overtone.frequency.value = freq * 2; // one octave up, adds a bell-like warmth
      const overtoneGain = ctx.createGain();
      overtoneGain.gain.value = 0.18;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      overtone.connect(overtoneGain).connect(gain);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
      overtone.start(startTime);
      overtone.stop(startTime + duration);
    };

    const ringOnce = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      playNote(987.77, now, 0.38); // B5
      playNote(1318.51, now + 0.42, 0.5); // E6
    };

    ringOnce();
    const interval = setInterval(ringOnce, 2400);

    return () => {
      clearInterval(interval);
      ctx.close().catch(() => {});
    };
  }, [active]);
}

/** mm:ss elapsed since the call started ringing — a small, familiar detail
 * from real call screens that reassures the patient this is a live event. */
function useElapsedTime(active) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) { setElapsed(0); return undefined; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useNotifications() || {};
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const isOpen = !!incomingCall;
  useRingtone(isOpen);
  const elapsed = useElapsedTime(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = setTimeout(() => declineCall(), RING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isOpen, declineCall]);

  useEffect(() => {
    if (!isOpen) return undefined;
    dialogRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') declineCall(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, declineCall]);

  if (!isOpen) return null;

  const handleAccept = () => {
    acceptCall(incomingCall.appointmentId);
    navigate(`/patient-dashboard/appointments?joinCall=${incomingCall.appointmentId}`);
  };

  // Doctor's display name lives inside `message` from the backend — matches
  // both "Dr. X is calling you now." (direct join / instant call) and
  // "Dr. X is ready to see you now." (queue callNext) — pull just the name
  // back out for the avatar initials.
  const callerName = incomingCall.message?.match(/Dr\.\s*(.+?)\s+is\s/)?.[1]?.trim();
  const initials = callerName ? callerName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'HN';

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Incoming video call"
      tabIndex={-1}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-aubergine-900 via-aubergine-800 to-magenta-700 outline-none animate-fade-in"
    >
      {/* Decorative ambient glow — matches the brand gradient blobs used elsewhere in the app */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-magenta-500/20 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-aubergine-400/20 blur-3xl"></div>

      {/* Header */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 pt-6 text-white/70">
        <span className="text-xs font-bold tracking-widest uppercase">HealNari Telemedicine</span>
        <span className="text-xs font-mono font-semibold tabular-nums">{elapsed}</span>
      </div>

      {/* Caller identity */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-white/15 animate-ping-slow"></div>
          <div className="relative w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
            {initials}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Incoming Video Call
          </p>
          <h2 className="text-white font-black text-2xl leading-tight">{incomingCall.title}</h2>
          <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed">{incomingCall.message}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 w-full flex items-center justify-center gap-14 pb-12 pt-6">
        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={declineCall}
            aria-label="Decline call"
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-2xl shadow-xl shadow-rose-900/40 transition-all hover:scale-105 active:scale-95"
          >
            <i className="fas fa-phone-slash"></i>
          </button>
          <span className="text-white/60 text-[11px] font-bold uppercase tracking-wide">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={handleAccept}
            aria-label="Accept call"
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-2xl shadow-xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
          >
            <i className="fas fa-video"></i>
          </button>
          <span className="text-white/60 text-[11px] font-bold uppercase tracking-wide">Accept</span>
        </div>
      </div>

      <style>{`
        @keyframes pingSlow { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
        .animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping-slow, .animate-pulse-subtle { animation: none !important; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

export default IncomingCallModal;
