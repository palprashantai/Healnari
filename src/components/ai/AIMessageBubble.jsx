import React, { useState } from 'react';

/**
 * Safety status parsing — mirrors the logic in AiChatWidget but as a shared util.
 * The AI backend appends status tags like [STATUS: DISCUSS_WITH_DOCTOR] to messages.
 */
export function parseAIStatus(rawText) {
  if (!rawText || typeof rawText !== 'string') return { status: null, cleanText: '' };

  if (rawText.includes('[STATUS: GENERAL_WELLNESS]')) {
    return {
      status: {
        type: 'wellness', label: 'General wellness information',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', icon: 'fa-leaf',
      },
      cleanText: rawText.replace(/\[STATUS:\s*GENERAL_WELLNESS\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: DISCUSS_WITH_DOCTOR]')) {
    return {
      status: {
        type: 'discuss', label: 'Discuss with your doctor',
        color: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', icon: 'fa-stethoscope',
      },
      cleanText: rawText.replace(/\[STATUS:\s*DISCUSS_WITH_DOCTOR\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: SEEK_CARE_NOW]')) {
    return {
      status: {
        type: 'urgent', label: 'Seek medical care promptly',
        color: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', icon: 'fa-circle-exclamation',
      },
      cleanText: rawText.replace(/\[STATUS:\s*SEEK_CARE_NOW\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: CLINICAL_NOTE]')) {
    return {
      status: {
        type: 'clinical', label: 'AI-generated clinical note — requires doctor review',
        color: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500', icon: 'fa-file-medical',
      },
      cleanText: rawText.replace(/\[STATUS:\s*CLINICAL_NOTE\]/g, '').trim(),
    };
  }
  return { status: null, cleanText: rawText };
}

/**
 * Renders a single AI message in a contextual, healthcare-safe way.
 *
 * Props:
 *  - message: { role: 'user'|'assistant', content: string }
 *  - variant: 'doctor' | 'patient' | 'landing'
 *  - actions: Array<{ label, icon, onClick }> — optional action chips below the message
 *  - isTyping: boolean — show typing indicator instead of content
 *  - approvalRequired: boolean — show approval chip before any action
 */
export function AIMessageBubble({ message, variant = 'patient', actions = [], isTyping = false, approvalRequired = false }) {
  const isUser = message?.role === 'user';
  const { status, cleanText } = parseAIStatus(message?.content || '');

  const cardClass = variant === 'doctor' ? 'ai-response-card-doctor' : 'ai-response-card';

  if (isUser) {
    return (
      <div className="flex justify-end ai-bubble-in">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-purple-700 to-indigo-700 text-white text-sm shadow-md shadow-purple-900/20">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 ai-bubble-in">
      {/* AI Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
        <i className="fas fa-wand-magic-sparkles text-white text-[10px]" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Message Card */}
        <div className={`p-3.5 text-sm text-slate-700 leading-relaxed ${isTyping ? 'ai-response-card' : cardClass}`}>
          {isTyping ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-xs text-slate-400 font-medium mr-1">AI Thinking</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ai-typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ai-typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ai-typing-dot" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{cleanText}</div>
          )}
        </div>

        {/* Safety Classification Badge */}
        {status && !isTyping && (
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <i className={`fas ${status.icon} text-[10px]`} />
            {status.label}
          </div>
        )}

        {/* Action Chips */}
        {actions.length > 0 && !isTyping && (
          <div className="flex flex-wrap gap-1.5">
            {actions.map((action, i) => (
              <ActionChip key={i} action={action} approvalRequired={approvalRequired && action.highImpact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline action chip with optional confirmation gate for high-impact actions */
function ActionChip({ action, approvalRequired }) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (approvalRequired) {
      setConfirming(true);
    } else {
      action.onClick?.();
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 text-xs">
        <i className="fas fa-triangle-exclamation text-amber-600 text-[11px]" />
        <span className="font-semibold text-amber-800">Confirm?</span>
        <button
          onClick={() => { setConfirming(false); action.onClick?.(); }}
          className="font-black text-emerald-700 hover:text-emerald-900 ml-1"
        >
          Yes
        </button>
        <button onClick={() => setConfirming(false)} className="font-bold text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all active:scale-95 shadow-xs"
    >
      {action.icon && <i className={`fas ${action.icon} text-[10px]`} />}
      {action.label}
    </button>
  );
}

export default AIMessageBubble;
