import React from 'react';
import { AiHub } from '../../components/ai/AiHub.jsx';

/**
 * Doctor AI Product page (/doctor-dashboard/ai)
 *
 * This page is the AI subscription, usage, and billing hub.
 * The live AI clinical assistant is always available via the ✨ Copilot
 * button in the top header bar — this page manages plans, credits & history.
 */
export default function DoctorAiProduct() {
  return (
    <div>
      {/* Copilot guidance banner */}
      <div className="mb-5 p-3.5 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm shadow-purple-900/20">
          <i className="fas fa-wand-magic-sparkles text-white text-xs animate-ai-star" />
        </div>
        <div>
          <p className="text-xs font-black text-purple-900">
            Your AI Copilot is always available — click&nbsp;
            <span className="inline-flex items-center gap-1 bg-purple-700 text-white px-2 py-0.5 rounded-lg text-[10px] font-black mx-0.5">
              <i className="fas fa-wand-magic-sparkles text-[9px]" /> Copilot
            </span>
            &nbsp;in the top bar on any page.
          </p>
          <p className="text-[11px] text-purple-600 mt-0.5">
            This page manages your AI subscription, credit balance, and billing history.
          </p>
        </div>
      </div>

      <AiHub role="doctor" />
    </div>
  );
}
