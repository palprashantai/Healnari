import React from 'react';
import { AiHub } from '../../components/ai/AiHub.jsx';
import { openAiChatWidget } from '../../tools/AiChatWidget.jsx';

/**
 * Patient AI Product page (/patient-dashboard/ai)
 *
 * This page is the AI subscription, usage, and billing hub for patients.
 * The conversational AI Care Companion is always accessible via the floating
 * widget at the bottom right.
 */
export default function PatientAiProduct() {
  const QUICK_TOPICS = [
    { label: '🩺 Understand diagnosis', prompt: 'Help me understand my diagnosis, what it means, and what to expect.' },
    { label: '💊 Medication guide', prompt: 'Help me understand my current medications: what each one does, how to take it, and what side effects to watch for.' },
    { label: '📅 Doctor visit prep', prompt: 'Help me prepare for my upcoming doctor appointment. What questions should I ask?' },
    { label: '📊 Cycle & hormonal tracking', prompt: 'Help me understand my cycle symptoms and what lifestyle habits support hormonal balance.' },
  ];

  return (
    <div className="space-y-6">
      {/* AI Care Companion Guidance & Widget Launcher Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm shadow-purple-900/20 text-white">
            <i className="fas fa-wand-magic-sparkles text-sm animate-ai-star" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-purple-950">
                Your AI Care Companion is available anytime
              </p>
              <span className="inline-flex items-center gap-1 bg-purple-700 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                <i className="fas fa-comments text-[9px]" /> Floating Widget
              </span>
            </div>
            <p className="text-xs text-purple-700/90 mt-1 max-w-2xl leading-relaxed">
              Ask about symptoms, lab reports, hormonal nutrition, or cycle tracking. The interactive chat opens exclusively in your floating assistant widget.
            </p>

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              <span className="text-[11px] font-bold text-purple-900/70 mr-1">Try asking:</span>
              {QUICK_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => openAiChatWidget(topic.prompt)}
                  className="text-xs bg-white/80 hover:bg-white text-purple-900 font-semibold px-2.5 py-1 rounded-lg border border-purple-200/80 shadow-2xs hover:shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Launcher Button */}
        <div className="shrink-0 w-full md:w-auto pt-2 md:pt-0">
          <button
            onClick={() => openAiChatWidget()}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <i className="fas fa-robot text-xs" />
            <span>Open Care Companion</span>
            <i className="fas fa-arrow-up-right-from-square text-[10px] opacity-80" />
          </button>
        </div>
      </div>

      {/* Unified AI Product, Plans, Usage & Billing Hub for Patients */}
      <AiHub role="patient" />
    </div>
  );
}
