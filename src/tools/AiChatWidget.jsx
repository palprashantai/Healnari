import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, ArrowUp, ChevronDown, Lock } from 'lucide-react';
import { getTokens } from '../lib/apiClient.js';
import { triggerHaptic } from '../lib/haptics.js';
import { AIPaywallModal } from '../components/ai/AIPaywallModal.jsx';

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
    primary: '#6B46C1',
    primaryDeep: '#2A1647',
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
    label: 'HealNari Care Assistant',
  },
  patient: {
    primary: '#6B46C1',
    primaryDeep: '#2A1647',
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
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

function parseMessageStatus(rawText) {
  if (!rawText || typeof rawText !== 'string') return { status: null, cleanText: '' };

  if (rawText.includes('[STATUS: GENERAL_WELLNESS]')) {
    return {
      status: {
        type: 'wellness',
        label: 'General wellness information',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: 'fa-leaf',
      },
      cleanText: rawText.replace(/\[STATUS:\s*GENERAL_WELLNESS\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: DISCUSS_WITH_DOCTOR]')) {
    return {
      status: {
        type: 'discuss',
        label: 'Possible topic to discuss with a doctor',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        icon: 'fa-user-doctor',
      },
      cleanText: rawText.replace(/\[STATUS:\s*DISCUSS_WITH_DOCTOR\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: MEDICAL_ASSESSMENT_REQUIRED]')) {
    return {
      status: {
        type: 'urgent',
        label: 'Professional medical assessment recommended',
        color: 'bg-rose-50 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        icon: 'fa-triangle-exclamation',
      },
      cleanText: rawText.replace(/\[STATUS:\s*MEDICAL_ASSESSMENT_REQUIRED\]/g, '').trim(),
    };
  }

  return { status: null, cleanText: rawText };
}

export default function AiChatWidget({ context = 'landing' }) {
  const theme = THEMES[context] || THEMES.landing;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [activeToolActivity, setActiveToolActivity] = useState(null);
  const [paywallModalOpen, setPaywallModalOpen] = useState(false);
  const [paywallData, setPaywallData] = useState(null);
  const socketRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: theme.greeting || "Hello! I'm your HealNari AI Care Companion. Ask me about PCOS symptoms, lab reports, hormonal nutrition, or cycle tracking.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeToolActivity]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getTokens()?.accessToken || null },
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on('tool_activity', (data) => {
      if (data?.status === 'executing') {
        setActiveToolActivity(data.label || `Consulting ${data.toolName}...`);
      } else if (data?.status === 'completed') {
        setActiveToolActivity(null);
      }
    });

    socket.on('chat_reply', (data) => {
      setIsLoading(false);
      setActiveToolActivity(null);

      if (data?.status === 'paywall') {
        setPaywallData(data.paywallData || {
          title: 'Unlock HealNari AI Assistant',
          description: 'You have reached your free monthly AI allowance. Upgrade to continue your personalized health companion.',
          planName: context === 'doctor' ? 'Doctor AI Pro' : 'HealNari AI Premium',
          features: [
            'Unlimited AI Health Companion questions',
            'Full clinical tool integrations',
            'Priority response processing',
          ],
        });
        setPaywallModalOpen(true);
        return;
      }

      const replyText = typeof data === 'string' ? data : (data?.reply || data?.message || data?.text || 'I understand. Please consult your HealNari doctor for tailored guidance.');
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          toolsUsed: data?.toolsUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    socket.on('error', (err) => {
      setIsLoading(false);
      setActiveToolActivity(null);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Temporary network disconnect. Our encrypted clinical AI engine will reconnect automatically.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    return () => socket.disconnect();
  }, [context]);

  useEffect(() => {
    if (isOpen && socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [isOpen]);

  const sendQuery = (text) => {
    if (!text.trim() || isLoading) return;
    const userMessage = text.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    socketRef.current?.emit('chat_message', { message: userMessage, context });
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const isDashboardRoute = typeof window !== 'undefined' && window.location.pathname.includes('-dashboard');

  useEffect(() => {
    if (!isDashboardRoute) {
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            setIsScrolled(window.scrollY > 400);
            ticking = false;
          });
          ticking = true;
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isDashboardRoute]);

  const bottomClass = isDashboardRoute
    ? 'bottom-24 md:bottom-8'
    : (isScrolled ? 'bottom-24 md:bottom-8' : 'bottom-5 md:bottom-8');

  return (
    <div
      className={`fixed ${bottomClass} right-3 sm:right-5 md:right-6 z-[60] flex flex-col items-end pointer-events-none transition-all duration-300`}
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
        className={`transition-all duration-300 origin-bottom-right ${
          isOpen ? 'pointer-events-auto mb-4 opacity-100' : 'pointer-events-none opacity-0 absolute bottom-0 right-0 scale-95'
        }`}
      >
        <div
          className={`w-[calc(100vw-2rem)] sm:w-[410px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_25px_60px_rgba(42,22,71,0.25)] flex flex-col overflow-hidden border border-aubergine-100/80 ${
            isOpen ? 'hn-panel-open' : ''
          }`}
          style={{ height: 600, maxHeight: 'calc(100dvh - 120px)' }}
        >
          {/* Header */}
          <div className="hn-header relative px-5 pt-4 pb-5 shrink-0 overflow-hidden shadow-md">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md">
                    <Activity size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="hn-display font-bold text-white text-[15px] tracking-tight leading-none">
                      HealNari AI
                    </h3>
                    <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/20">
                      Clinical AI Companion
                    </span>
                  </div>
                  <p className="hn-body text-[11px] font-semibold text-white/80 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {theme.label} • Active
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 2 && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setMessages([messages[0]]);
                    }}
                    title="Clear Conversation"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <i className="fas fa-rotate-right text-xs"></i>
                  </button>
                )}
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                  }}
                  aria-label="Minimize chat"
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/90 hover:bg-white/20 transition-colors focus:outline-none"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>
            <PulseLine color="#ffffff" opacity={0.25} />
          </div>

          {/* Clinical Governance Banner */}
          <div className="px-4 py-2 bg-aubergine-50/80 border-b border-aubergine-100 shrink-0 flex items-center gap-2">
            <i className="fas fa-shield-heart text-aubergine-600 text-xs flex-shrink-0"></i>
            <p className="hn-body text-[10.5px] font-medium text-aubergine-900 leading-snug">
              Encrypted educational care assistant. Aligned with clinical guidelines. Not a substitute for direct medical diagnosis or emergency care.
            </p>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-50/50 via-white to-aubergine-50/30">
            {messages.map((msg) => {
              const { status, cleanText } = msg.role === 'assistant' ? parseMessageStatus(msg.text) : { status: null, cleanText: msg.text };
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs transition-all ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-aubergine-600 to-magenta-600 text-white rounded-br-xs font-medium shadow-md shadow-aubergine-500/10'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs font-normal'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="space-y-1.5 mb-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-aubergine-700 uppercase tracking-wider">
                          <i className="fas fa-stethoscope text-aubergine-500"></i> HealNari Care Intelligence
                        </div>

                        {status && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`}></span>
                            <span>{status.label}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-line text-inherit leading-relaxed">{cleanText}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1 font-medium">{msg.timestamp}</span>
                </div>
              );
            })}

            {/* Active Tool Execution Pill */}
            {activeToolActivity && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-3 shadow-sm flex items-center gap-2.5 text-xs text-purple-950 font-bold">
                  <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] animate-spin">
                    <i className="fas fa-gear"></i>
                  </div>
                  <span>{activeToolActivity}</span>
                </div>
              </div>
            )}

            {isLoading && !activeToolActivity && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="bg-white border border-aubergine-100 rounded-2xl rounded-bl-xs p-3.5 shadow-md flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-aubergine-50 flex items-center justify-center text-aubergine-600 text-xs animate-spin">
                    <i className="fas fa-circle-notch"></i>
                  </div>
                  <div>
                    <span className="text-xs text-slate-700 font-bold block">Synthesizing clinical response...</span>
                    <span className="text-[10px] text-slate-400">Referencing PCOS & hormone protocols</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Care Prompts Tray */}
          {messages.length <= 2 && (
            <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Ask:</span>
              {[
                '🌸 Manage PCOS fatigue',
                '🩸 Period delay causes',
                '💧 Insulin resistance diet',
                '🧪 Diagnostic lab panels'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    triggerHaptic('light');
                    sendQuery(prompt);
                  }}
                  className="bg-white hover:bg-aubergine-50 border border-slate-200/80 text-slate-700 hover:text-aubergine-700 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors shadow-2xs active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Console */}
          <div className="p-3.5 bg-white border-t border-slate-100 shrink-0 mt-auto">
            <form
              onSubmit={handleSend}
              className="hn-input-wrap flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-white focus-within:bg-white shadow-xs transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about PCOS, symptoms, reports..."
                className="hn-body flex-1 bg-transparent border-none text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="hn-send w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-sm"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </form>
            <div className="flex items-center justify-between px-2 mt-2">
              <span className="hn-body text-[9.5px] font-medium text-slate-400 flex items-center gap-1">
                <Lock size={10} className="text-emerald-500" /> Private &amp; encrypted
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">Press Enter ↵</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOGGLE BUTTON */}
      <div
        className={`pointer-events-auto transition-all duration-300 relative ${
          isOpen ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'
        }`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <span className="hn-ring-pulse absolute inset-0 rounded-full pointer-events-none" />
        <button
          onClick={() => {
            triggerHaptic('medium');
            setIsOpen(true);
          }}
          aria-label="Open chat assistant"
          className="hn-toggle relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-[0_10px_25px_rgba(42,22,71,0.3)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
        >
          <Activity
            size={20}
            strokeWidth={2.25}
            className={`sm:w-6 sm:h-6 transition-transform duration-200 ${isHovering ? 'scale-110' : 'scale-100'}`}
          />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
        </button>
      </div>

      <AIPaywallModal
        isOpen={paywallModalOpen}
        onClose={() => setPaywallModalOpen(false)}
        paywallData={paywallData}
        onUpgraded={() => {
          setPaywallModalOpen(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              text: '🎉 Your AI Premium membership is now active! All health companion and clinical features are unlocked.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }}
      />
    </div>
  );
}