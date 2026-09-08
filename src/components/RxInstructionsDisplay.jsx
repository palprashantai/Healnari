import React from 'react';

/**
 * Safely parses prescription instructions, which may be a raw string or
 * a JSON string representing a holistic lifestyle + clinical instruction payload.
 */
export function parseRxInstructions(instructions) {
  if (!instructions) return null;
  if (typeof instructions === 'object') return instructions;
  if (typeof instructions === 'string' && instructions.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(instructions);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      // Not valid JSON, fallback to plain text
    }
  }
  return { clinicalNotes: String(instructions) };
}

/**
 * Renders prescription instructions with support for both legacy plain-text
 * notes and HealNari holistic lifestyle (diet, yoga, follow-up) payloads.
 */
export function RxInstructionsDisplay({ instructions, className = '' }) {
  if (!instructions) return null;

  const parsed = parseRxInstructions(instructions);
  const isHolistic = parsed && (
    parsed.type === 'healnari-holistic-v1' ||
    parsed.dietPlan ||
    parsed.exercisePlan ||
    (parsed.clinicalNotes && (parsed.dietPlan || parsed.exercisePlan || parsed.followUpAdvice))
  );

  if (isHolistic) {
    return (
      <div className={`bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs mb-4 space-y-2.5 ${className}`}>
        {parsed.clinicalNotes && (
          <div>
            <div className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
              <i className="fas fa-notes-medical text-amber-700"></i> Clinical Instructions:
            </div>
            <div className="whitespace-pre-line text-amber-900 pl-3 border-l-2 border-amber-400/80 font-medium leading-relaxed">
              {parsed.clinicalNotes}
            </div>
          </div>
        )}

        {parsed.dietPlan && (
          <div className="pt-2 border-t border-amber-200/60">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
              <i className="fas fa-leaf text-emerald-600"></i> Diet & Nutrition Plan:
            </div>
            <div className="text-emerald-950 pl-3 border-l-2 border-emerald-400/80 whitespace-pre-line font-medium leading-relaxed">
              {parsed.dietPlan}
            </div>
          </div>
        )}

        {parsed.exercisePlan && (
          <div className="pt-2 border-t border-amber-200/60">
            <div className="font-bold text-purple-900 flex items-center gap-1.5 mb-1">
              <i className="fas fa-person-walking text-purple-600"></i> Exercise & Yoga Plan:
            </div>
            <div className="text-purple-950 pl-3 border-l-2 border-purple-400/80 whitespace-pre-line font-medium leading-relaxed">
              {parsed.exercisePlan}
            </div>
          </div>
        )}

        {parsed.followUpAdvice && (
          <div className="pt-2 border-t border-amber-200/60 flex items-start gap-2">
            <i className="fas fa-calendar-check text-purple-600 mt-0.5"></i>
            <div>
              <span className="font-bold text-slate-800 mr-1.5">Follow-up:</span>
              <span className="text-slate-700 font-medium">{parsed.followUpAdvice}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Plain string or clinical notes only
  const displayText = parsed?.clinicalNotes || (typeof instructions === 'string' ? instructions : '');
  if (!displayText) return null;

  return (
    <div className={`bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 mb-4 ${className}`}>
      <strong className="text-amber-950">Instructions:</strong>{' '}
      <span className="whitespace-pre-line font-medium ml-1">{displayText}</span>
    </div>
  );
}

export default RxInstructionsDisplay;
