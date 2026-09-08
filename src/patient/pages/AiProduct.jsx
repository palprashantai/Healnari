import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getTokens } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AIMessageBubble } from '../../components/ai/AIMessageBubble.jsx';
import { useToast } from '../../components/Toast.jsx';
import { triggerHaptic } from '../../lib/haptics.js';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

const INTENT_CARDS = [
  {
    id: 'diagnosis',
    icon: 'fa-stethoscope',
    emoji: '🩺',
    label: 'Understand my diagnosis',
    description: 'Get clear, jargon-free explanations of your condition',
    color: 'from-rose-400 to-pink-500',
    bgColor: 'bg-rose-50 border-rose-200 hover:border-rose-400 hover:bg-rose-100/80',
    prompt: 'Help me understand my diagnosis, what it means, and what to expect.',
  },
  {
    id: 'medications',
    icon: 'fa-pills',
    emoji: '💊',
    label: 'My medications',
    description: 'Understand what you\'re taking and why',
    color: 'from-violet-400 to-purple-500',
    bgColor: 'bg-violet-50 border-violet-200 hover:border-violet-400 hover:bg-violet-100/80',
    prompt: 'Help me understand my current medications: what each one does, how to take it, and what side effects to watch for.',
  },
  {
    id: 'appointments',
    icon: 'fa-calendar-heart',
    emoji: '📅',
    label: 'My appointments',
    description: 'Prepare questions and know what to expect',
    color: 'from-sky-400 to-indigo-500',
    bgColor: 'bg-sky-50 border-sky-200 hover:border-sky-400 hover:bg-sky-100/80',
    prompt: 'Help me prepare for my upcoming doctor appointment. What questions should I ask? What information should I bring?',
  },
  {
    id: 'tracking',
    icon: 'fa-chart-line',
    emoji: '📊',
    label: 'Track my health',
    description: 'Lifestyle tips, cycle tracking, and wellness goals',
    color: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/80',
    prompt: 'Help me set up a health tracking routine: what should I monitor, and what lifestyle changes would benefit my condition?',
  },
];

function GreetingHeader({ user }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.name?.split(' ')[0] || 'there';

  const tips = [
    '💧 Staying hydrated can significantly reduce fatigue.',
    '🧘 10 minutes of mindful breathing can lower cortisol levels.',
    '🌙 Quality sleep of 7-9 hours supports hormonal balance.',
    '🥦 Including cruciferous vegetables may support hormonal health.',
    '🚶 A 20-min walk after meals improves insulin sensitivity.',
    '📵 Limiting screen time before bed improves sleep quality.',
  ];

  const tip = tips[new Date().getDay() % tips.length];

  return (
    <div className="px-5 pt-6 pb-5">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-md shadow-purple-900/20">
          <i className="fas fa-heart-pulse text-white text-sm" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-800 leading-tight">
            {greeting}, {name} 👋
          </h1>
          <p className="text-xs text-slate-500">Your personal health companion</p>
        </div>
      </div>

      {/* Health tip of the day */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-rose-50 border border-purple-100">
        <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">Today's Wellness Tip</p>
        <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

export default function PatientAICompanion() {
  const { user } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeIntent, setActiveIntent] = useState(null);
  const [phase, setPhase] = useState('intent'); // 'intent' | 'chat'

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (phase === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [phase]);

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

    socket.on('chat_done', () => setIsStreaming(false));

    socket.on('chat_error', (err) => {
      setIsStreaming(false);
      const msg = err?.message || 'Something went wrong. Please try again.';
      if (msg.includes('credit') || msg.includes('quota')) {
        toast('AI credit limit reached. Please check your subscription.', 'warning');
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
    setPhase('chat');

    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    setTimeout(() => {
      if (!socketRef.current?.connected) {
        setIsStreaming(false);
        toast('Could not connect. Please check your connection.', 'error');
        return;
      }
      socketRef.current.emit('chat', { message: trimmed, history, context: 'patient' });
    }, 100);
  }, [input, isStreaming, messages, connectSocket, toast]);

  const handleIntentSelect = (intent) => {
    setActiveIntent(intent);
    triggerHaptic?.('light');
    sendMessage(intent.prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetToIntents = () => {
    setMessages([]);
    setPhase('intent');
    setActiveIntent(null);
    setIsStreaming(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Greeting */}
      <GreetingHeader user={user} />

      {/* ── Intent Selection Phase ── */}
      {phase === 'intent' && (
        <div className="px-5 pb-6">
          <p className="text-sm font-black text-slate-700 mb-4">What would you like help with today?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTENT_CARDS.map((card, i) => (
              <button
                key={card.id}
                onClick={() => handleIntentSelect(card)}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`ai-intent-card text-left p-4 rounded-2xl border-2 transition-all active:scale-97 group ${card.bgColor}`}
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-md shadow-black/10 group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${card.icon} text-white text-sm`} />
                </div>
                <p className="text-sm font-black text-slate-800 leading-tight mb-1">{card.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
              </button>
            ))}
          </div>

          {/* Or ask anything */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or ask anything</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your health question here…"
                  rows={2}
                  className="w-full resize-none text-sm rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none px-4 py-3 bg-white transition-all leading-relaxed placeholder:text-slate-400"
                  disabled={isStreaming}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/25 hover:shadow-purple-700/40 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
              >
                <i className={`fas ${isStreaming ? 'fa-circle-notch fa-spin' : 'fa-arrow-up'} text-sm`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Phase ── */}
      {phase === 'chat' && (
        <div className="px-5 pb-6">
          {/* Active intent chip */}
          {activeIntent && (
            <div className="flex items-center gap-2 mb-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${activeIntent.color} text-white text-xs font-black shadow-sm`}>
                <i className={`fas ${activeIntent.icon} text-[11px]`} />
                {activeIntent.label}
              </div>
              <button
                onClick={resetToIntents}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <i className="fas fa-arrow-left text-[10px]" />
                Change topic
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4 mb-5">
            {messages.map((msg, i) => (
              <AIMessageBubble
                key={msg.id || i}
                message={msg}
                variant="patient"
                actions={
                  msg.role === 'assistant' && !isStreaming
                    ? [
                        { label: 'Ask follow-up', icon: 'fa-reply', onClick: () => inputRef.current?.focus() },
                        { label: 'Copy', icon: 'fa-copy', onClick: () => { navigator.clipboard?.writeText(msg.content); toast('Copied', 'info'); } },
                      ]
                    : []
                }
              />
            ))}

            {isStreaming && (
              <AIMessageBubble
                message={{ role: 'assistant', content: '' }}
                variant="patient"
                isTyping
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question…"
                rows={2}
                className="w-full resize-none text-sm rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none px-4 py-3 bg-white transition-all leading-relaxed placeholder:text-slate-400"
                disabled={isStreaming}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/25 hover:shadow-purple-700/40 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
            >
              <i className={`fas ${isStreaming ? 'fa-circle-notch fa-spin' : 'fa-arrow-up'} text-sm`} />
            </button>
          </div>
        </div>
      )}

      {/* ── Safety Footer ── */}
      <div className="mx-5 mb-6 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
        <div className="flex items-start gap-2">
          <i className="fas fa-shield-halved text-amber-500 text-sm mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-black text-amber-800">Health information, not medical advice</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              Your HealNari companion provides general health information only. Always consult your doctor before making changes to your treatment or medications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
