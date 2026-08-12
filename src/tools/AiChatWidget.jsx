import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, ArrowUp, ChevronDown, Lock } from 'lucide-react';
import { getTokens } from '../lib/apiClient.js';

// The vision ChatGateway listens on the API's own origin (no /api suffix, no
// separate ws proxy) — see vision/src/modules/ai/gateways/chat.gateway.ts.
const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

/**
 * Design direction: "vitals monitor" — a single motif (the ECG/pulse line)
 * appears three times at different scales: the scanning header strip, the
 * idle ring on the launcher, and the typing indicator. Everything else is
 * quiet: solid clinical colors, no gradients, no stock chat-bubble clichés.
 */

const THEMES = {
  landing: {
    primary: '#0E7C7B',
    primaryDeep: '#0A5C5B',
    tint: '#E4F4F3',
    ring: 'rgba(14,124,123,0.28)',
    label: 'Care Assistant',
  },
  patient: {
    primary: '#E0604A',
    primaryDeep: '#C14A36',
    tint: '#FBEAE6',
    ring: 'rgba(224,96,74,0.28)',
    label: 'Your Care Companion',
  },
  doctor: {
    primary: '#6B46C1',
    primaryDeep: '#2A1647',
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
    label: 'Clinical Intelligence',
    greeting: "Hello, Doctor. I can pull patient trends, summarize charts, or check the latest guidelines.",
  },
};

const ECG_PATH =
  'M0,12 L28,12 L34,3 L40,21 L46,1 L52,12 L96,12 L102,3 L108,21 L114,1 L120,12 L168,12 L200,12 ' +
  'M200,12 L228,12 L234,3 L240,21 L246,1 L252,12 L296,12 L302,3 L308,21 L314,1 L320,12 L368,12 L400,12';

function PulseLine({ color, opacity = 0.32 }) {
  return (
    <div className="absolute left-0 right-0 bottom-0 h-6 overflow-hidden pointer-events-none" style={{ opacity }}>
      <svg className="hn-scan" width="400" height="24" viewBox="0 0 400 24">
        <path d={ECG_PATH} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function AiChatWidget({ context = 'landing' }) {
  const theme = THEMES[context] || THEMES.landing;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const socketRef = useRef(null);

  // Connects once for the life of the widget — see vision/src/modules/ai/gateways/chat.gateway.ts
  // for the 'chat_message' -> 'chat_reply' contract this mirrors. The access
  // token (if signed in) rides along in the handshake so the gateway can
  // resolve who's asking — needed for anything the assistant writes on the
  // patient's behalf, like logging a period day or calculating an estimate.
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getTokens()?.accessToken || null },
    });
    socketRef.current = socket;

    socket.on('chat_reply', () => {
      setIsLoading(false);
    });

    return () => socket.disconnect();
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    socketRef.current?.emit('chat_message', { message: userMessage, context });
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none"
      style={{
        '--primary': theme.primary,
        '--primary-deep': theme.primaryDeep,
        '--tint': theme.tint,
        '--ring-color': theme.ring,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .hn-display { font-family: 'Space Grotesk', sans-serif; }
        .hn-body { font-family: 'Inter', sans-serif; }

        @keyframes hn-scan-move { from { transform: translateX(0); } to { transform: translateX(-200px); } }
        .hn-scan { animation: hn-scan-move 3.4s linear infinite; }

        @keyframes hn-ring { 0% { transform: scale(0.85); opacity: 0.55; } 75% { transform: scale(1.55); opacity: 0; } 100% { opacity: 0; } }
        .hn-ring-pulse { animation: hn-ring 2.6s cubic-bezier(0.4,0,0.2,1) infinite; border: 1.5px solid var(--primary); }

        @keyframes hn-panel-in { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .hn-panel-open { animation: hn-panel-in 0.32s cubic-bezier(0.34,1.4,0.64,1) both; }

        .hn-toggle { background-color: var(--primary); }
        .hn-toggle:hover { background-color: var(--primary-deep); }
        .hn-header { background-color: var(--primary); }
        .hn-send { background-color: var(--primary); }
        .hn-send:hover:not(:disabled) { background-color: var(--primary-deep); }
        .hn-input-wrap:focus-within { box-shadow: 0 0 0 3px var(--ring-color); border-color: var(--primary); }

        @media (prefers-reduced-motion: reduce) {
          .hn-scan, .hn-ring-pulse, .hn-panel-open { animation: none !important; }
        }
      `}</style>

      {/* CHAT PANEL */}
      <div
        className={`transition-all duration-300 origin-bottom-right ${isOpen ? 'pointer-events-auto mb-4 opacity-100' : 'pointer-events-none opacity-0 absolute bottom-0 right-0 scale-95'
          }`}
      >
        <div
          className={`w-80 sm:w-96 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 ${isOpen ? 'hn-panel-open' : ''
            }`}
          style={{ height: 560, maxHeight: '75vh' }}
        >
          {/* Header */}
          <div className="hn-header relative px-5 pt-5 pb-6 shrink-0 overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <Activity size={18} className="text-white" strokeWidth={2.25} />
                </div>
                <div>
                  <h3 className="hn-display font-semibold text-white text-[15px] tracking-tight leading-none">
                    HealNari
                  </h3>
                  <p className="hn-body text-[11px] font-medium text-white/80 mt-1 uppercase tracking-wide">
                    {theme.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Minimize chat"
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/90 hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <PulseLine color="#ffffff" />
          </div>

          {/* AUDIT_REPORT.md FE-4 — AI, not a clinician; visible for the
              whole conversation. */}
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="hn-body text-[10.5px] text-amber-800 text-center leading-snug">
              AI assistant — not a substitute for medical advice. For emergencies, contact local emergency services.
            </p>
          </div>

          {/* Input */}
          <div className="px-4 py-3.5 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={handleSend}
              className="hn-input-wrap flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 transition-shadow"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="hn-body flex-1 bg-transparent border-none text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="hn-send w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
              >
                <ArrowUp size={15} strokeWidth={2.4} />
              </button>
            </form>
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              <Lock size={9} className="text-slate-400" />
              <span className="hn-body text-[9.5px] font-medium text-slate-400 tracking-wide">
                Private &amp; encrypted conversation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TOGGLE BUTTON */}
      <div
        className={`pointer-events-auto transition-all duration-300 relative ${isOpen ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'
          }`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <span className="hn-ring-pulse absolute inset-0 rounded-full pointer-events-none" />
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
          className="hn-toggle relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
        >
          <Activity
            size={22}
            strokeWidth={2.25}
            className={`transition-transform duration-200 ${isHovering ? 'scale-110' : 'scale-100'}`}
          />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
        </button>
      </div>
    </div>
  );
}