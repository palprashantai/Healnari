import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';

const RING_TIMEOUT_MS = 45000; // auto-decline if nobody answers, like a real phone

/** Synthesizes a simple two-tone ring pattern via the Web Audio API — avoids
 * shipping/licensing an audio asset for something this small. */
function useRingtone(active) {
  useEffect(() => {
    if (!active) return undefined;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const ctx = new AudioContextClass();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.02);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const ringOnce = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      playTone(1000, now, 0.4);
      playTone(1000, now + 0.5, 0.4);
    };

    ringOnce();
    const interval = setInterval(ringOnce, 2000);

    return () => {
      clearInterval(interval);
      ctx.close().catch(() => {});
    };
  }, [active]);
}

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useNotifications() || {};
  const navigate = useNavigate();
  useRingtone(!!incomingCall);

  useEffect(() => {
    if (!incomingCall) return undefined;
    const timeout = setTimeout(() => declineCall(), RING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [incomingCall, declineCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    acceptCall(incomingCall.appointmentId);
    navigate(`/patient-dashboard/appointments?joinCall=${incomingCall.appointmentId}`);
  };

  return (
    <Modal isOpen={!!incomingCall} onClose={declineCall} size="sm" hideClose ariaLabel="Incoming video call">
      <div className="text-center space-y-5 py-2">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping"></div>
          <div className="relative w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center text-4xl text-emerald-600">
            <i className="fas fa-video"></i>
          </div>
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-xl">{incomingCall.title}</h3>
          <p className="text-sm text-slate-500 mt-1">{incomingCall.message}</p>
        </div>
        <div className="flex items-center justify-center gap-6 pt-2">
          <button
            onClick={declineCall}
            aria-label="Decline call"
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-2xl shadow-lg transition-colors"
          >
            <i className="fas fa-phone-slash"></i>
          </button>
          <button
            onClick={handleAccept}
            aria-label="Accept call"
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-2xl shadow-lg transition-colors"
          >
            <i className="fas fa-phone"></i>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default IncomingCallModal;
