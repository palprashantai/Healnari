import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getTokens } from '../../lib/apiClient.js';
import { AIMessageBubble } from './AIMessageBubble.jsx';
import { AIApprovalChip } from './AIApprovalChip.jsx';
import { useToast } from '../Toast.jsx';
import { triggerHaptic } from '../../lib/haptics.js';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

/**
 * Context-aware quick actions for each doctor dashboard section.
 * Each action has a prompt that pre-fills the AI input so the doctor gets
 * a targeted response rather than starting from a blank slate.
 */
const CONTEXTUAL_ACTIONS = {
  '/doctor-dashboard/patients': [
    { label: 'Summarize Chart',       icon: 'fa-file-lines',         prompt: 'Summarize the active patient\'s chart including chief complaint, history, recent labs, and current medications.' },
    { label: 'Draft Clinical Note',   icon: 'fa-file-medical',       prompt: 'Draft a SOAP-format clinical note for today\'s consultation with the active patient.', highImpact: true },
    { label: 'Drug Interactions',     icon: 'fa-pills',              prompt: 'Check for any significant drug-drug or drug-allergy interactions in the active patient\'s current medication list.' },
    { label: 'DDx Suggestions',       icon: 'fa-diagram-project',    prompt: 'Based on the active patient\'s symptoms and history, suggest a differential diagnosis with probability ranking.' },
  ],
  '/doctor-dashboard/prescriptions': [
    { label: 'Contraindications',     icon: 'fa-hand-dots',          prompt: 'Check the active patient\'s prescription list for contraindications with their allergy profile and existing conditions.' },
    { label: 'Dosage Review',         icon: 'fa-scale-balanced',     prompt: 'Review the dosages in the active patient\'s prescriptions against standard clinical guidelines and patient demographics.' },
    { label: 'Generic Alternatives',  icon: 'fa-tags',               prompt: 'Suggest generic or biosimilar alternatives to the branded drugs in the active patient\'s prescription list.' },
    { label: 'Adherence Tips',        icon: 'fa-clock-rotate-left',  prompt: 'Draft patient-friendly adherence instructions for the active patient\'s medications.' },
  ],
  '/doctor-dashboard/reports': [
    { label: 'Interpret Results',     icon: 'fa-flask',              prompt: 'Interpret the active patient\'s latest lab results and flag any values outside the normal reference range with clinical significance.' },
    { label: 'Trend Analysis',        icon: 'fa-chart-line',         prompt: 'Analyze trends in the active patient\'s lab values over time and identify any clinically meaningful changes.' },
    { label: 'Flag Critical Values',  icon: 'fa-triangle-exclamation',prompt: 'Identify any critical or panic-level values in the active patient\'s recent lab reports.' },
    { label: 'Next Steps',            icon: 'fa-list-check',         prompt: 'Based on the lab results, suggest appropriate next diagnostic steps or specialist referrals for the active patient.' },
  ],
  '/doctor-dashboard/appointments': [
    { label: 'Pre-Consult Brief',     icon: 'fa-clipboard-list',     prompt: 'Prepare a concise pre-consultation brief for the next appointment based on the patient\'s history and reason for visit.' },
    { label: 'Follow-Up Interval',    icon: 'fa-calendar-check',     prompt: 'Suggest an appropriate follow-up interval and milestones for the active patient based on their condition and treatment plan.' },
    { label: 'Referral Letter',       icon: 'fa-envelope-open-text', prompt: 'Draft a referral letter for the active patient to a relevant specialist.', highImpact: true },
  ],
  '/doctor-dashboard': [
    { label: 'Today\'s Queue Brief',  icon: 'fa-list-ol',            prompt: 'Give me a brief summary of today\'s appointment queue: total patients, any urgent flags, and any telemedicine sessions.' },
    { label: 'Pending Actions',       icon: 'fa-clipboard-check',    prompt: 'List all pending clinical actions: lab reviews, refill requests, and unread patient messages.' },
    { label: 'Clinical Guideline',    icon: 'fa-book-medical',       prompt: 'What are the current clinical guidelines for ' },
  ],
};

function getContextActions(pathname) {
  const match = Object.keys(CONTEXTUAL_ACTIONS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]; // most-specific match
  return match ? CONTEXTUAL_ACTIONS[match] : CONTEXTUAL_ACTIONS['/doctor-dashboard'];
}

function getPageLabel(pathname) {
  if (pathname.includes('/patients'))      return { icon: 'fa-users',               label: 'Patients & EMR' };
  if (pathname.includes('/prescriptions')) return { icon: 'fa-file-prescription',   label: 'Prescriptions' };
  if (pathname.includes('/reports'))       return { icon: 'fa-flask',               label: 'Lab & Reports' };
  if (pathname.includes('/appointments'))  return { icon: 'fa-calendar-check',      label: 'Appointments' };
  if (pathname.includes('/telemedicine'))  return { icon: 'fa-video',               label: 'Telemedicine' };
  if (pathname.includes('/analytics'))     return { icon: 'fa-chart-line',          label: 'Analytics' };
  if (pathname.includes('/billing'))       return { icon: 'fa-file-invoice-dollar', label: 'Earnings' };
  return { icon: 'fa-chart-pie', label: 'Dashboard' };
}

export function DoctorCopilotPanel({ isOpen, onClose, activePatient }) {
  const location = useLocation();
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showActions, setShowActions] = useState(true);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const pageCtx = getPageLabel(location.pathname);
  const actions = getContextActions(location.pathname);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Restore session from sessionStorage
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      try {
        const saved = sessionStorage.getItem('hn-copilot-messages');
        if (saved) setMessages(JSON.parse(saved));
      } catch (_) {}
    }
  }, [isOpen]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try { sessionStorage.setItem('hn-copilot-messages', JSON.stringify(messages.slice(-40))); } catch (_) {}
    }
  }, [messages]);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const { accessToken } = getTokens();
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 3,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('chat_token', ({ token }) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: (last.content || '') + token }];
        }
        return [...prev, { role: 'assistant', content: token, id: Date.now() }];
      });
    });

    socket.on('chat_done', () => {
      setIsStreaming(false);
    });

    socket.on('chat_error', (err) => {
      setIsStreaming(false);
      const msg = err?.message || 'AI encountered an error. Please try again.';
      if (msg.includes('credit') || msg.includes('quota')) {
        toast('AI credit limit reached. Please top up or upgrade your plan.', 'warning');
      } else {
        toast(msg, 'error');
      }
    });

    socketRef.current = socket;
  }, [toast]);

  const sendMessage = useCallback((text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isStreaming) return;

    connectSocket();
    triggerHaptic?.('light');

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setShowActions(false);

    // Build context from active patient if available
    const patientContext = activePatient?.name && activePatient.name !== 'No Patient Selected'
      ? `Active patient context: ${activePatient.name} | MRN: ${activePatient.mrn} | DOB: ${activePatient.dob} | Blood: ${activePatient.bloodGroup} | Allergies: ${activePatient.allergies?.join(', ')}. `
      : '';

    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    setTimeout(() => {
      if (!socketRef.current?.connected) {
        setIsStreaming(false);
        toast('Could not connect to AI. Please check your connection.', 'error');
        return;
      }
      socketRef.current.emit('chat', {
        message: patientContext + trimmed,
        history,
        context: 'doctor',
      });
    }, 100);
  }, [input, isStreaming, messages, activePatient, connectSocket, toast]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowActions(true);
    sessionStorage.removeItem('hn-copilot-messages');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] xl:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="ai-copilot-panel fixed right-0 top-0 bottom-0 w-[400px] max-w-[95vw] bg-white border-l border-slate-200 shadow-2xl z-[60] flex flex-col">

        {/* ── Header ── */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-aubergine-900 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Animated copilot indicator */}
            <div className="relative w-7 h-7 rounded-full bg-purple-600/20 border border-purple-400/30 flex items-center justify-center">
              <i className="fas fa-wand-magic-sparkles text-purple-300 text-[11px] animate-ai-star" />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </div>
            <div>
              <p className="text-white text-xs font-black tracking-tight">AI Copilot</p>
              <p className="text-slate-400 text-[10px]">Clinical Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Clear chat"
              >
                <i className="fas fa-rotate-right text-[11px]" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <i className="fas fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* ── Page Context Strip ── */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <i className={`fas ${pageCtx.icon} text-purple-500 text-[10px]`} />
            <span className="font-bold text-slate-600">{pageCtx.label}</span>
          </div>
          {activePatient?.name && activePatient.name !== 'No Patient Selected' && (
            <>
              <span className="text-slate-300">·</span>
              <div className="flex items-center gap-1 text-[11px]">
                <i className="fas fa-user-circle text-emerald-500 text-[10px]" />
                <span className="font-bold text-slate-700 truncate max-w-[120px]">{activePatient.name}</span>
                <span className="text-slate-400 font-mono">[{activePatient.mrn}]</span>
              </div>
            </>
          )}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Greeting (shown when no messages) */}
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-900/30">
                <i className="fas fa-stethoscope text-white text-lg" />
              </div>
              <p className="text-sm font-black text-slate-800">Clinical Copilot</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                AI-assisted clinical intelligence. Patient context is automatically included.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <AIMessageBubble
              key={msg.id || i}
              message={msg}
              variant="doctor"
              actions={
                msg.role === 'assistant' && !isStreaming
                  ? [
                      {
                        label: 'Save to Note',
                        icon: 'fa-file-medical',
                        highImpact: true,
                        onClick: () => toast('Saved to clinical notes', 'success'),
                      },
                      {
                        label: 'Copy',
                        icon: 'fa-copy',
                        onClick: () => { navigator.clipboard?.writeText(msg.content); toast('Copied', 'info'); },
                      },
                    ]
                  : []
              }
              approvalRequired
            />
          ))}

          {/* Typing indicator */}
          {isStreaming && (
            <AIMessageBubble
              message={{ role: 'assistant', content: '' }}
              variant="doctor"
              isTyping
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Actions ── */}
        {showActions && messages.length === 0 && (
          <div className="px-4 pb-3 shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              Quick Actions for {pageCtx.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.prompt)}
                  style={{ animationDelay: `${i * 55}ms` }}
                  className="ai-intent-card text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/60 transition-all active:scale-95 group"
                >
                  <i className={`fas ${action.icon} text-purple-500 text-xs mb-1 block group-hover:text-purple-700`} />
                  <p className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 leading-tight">{action.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/80 shrink-0">
          {/* AI safety disclaimer */}
          <p className="text-[10px] text-slate-400 text-center mb-2 font-medium">
            <i className="fas fa-shield-halved text-purple-400 mr-1" />
            AI suggestions require clinical verification before applying to records
          </p>

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this patient, guidelines, drug info…"
                rows={2}
                className="w-full resize-none text-xs rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none px-3.5 py-2.5 bg-white transition-all leading-relaxed placeholder:text-slate-400"
                disabled={isStreaming}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-900/25 hover:shadow-purple-700/40 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
            >
              <i className={`fas ${isStreaming ? 'fa-circle-notch fa-spin' : 'fa-arrow-up'} text-[13px]`} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DoctorCopilotPanel;
