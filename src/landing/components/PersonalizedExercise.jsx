import React, { useState } from 'react';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { triggerHaptic } from '../../lib/haptics.js';

export function PersonalizedExercise({ 
  exercises = [], 
  isEmergency = false, 
  onConsultDoctor 
}) {
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [startedExercises, setStartedExercises] = useState({});

  if (isEmergency) {
    return (
      <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 text-left shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <i className="fas fa-triangle-exclamation text-xl" aria-hidden="true" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <i className="fas fa-circle-exclamation text-[10px]" /> Safety Notice
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 font-display">
              Clinical Evaluation Required Before Any Physical Movement
            </h3>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">
              Based on the potentially acute or emergency symptoms you reported, physical exercise or home routines are not advised. Please seek immediate in-person healthcare evaluation at an urgent care facility or hospital emergency department.
            </p>
            {onConsultDoctor && (
              <button
                type="button"
                onClick={onConsultDoctor}
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <i className="fas fa-user-doctor" />
                <span>Find an Emergency / Urgent Medical Provider</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return null;
  }

  const currentExercise = exercises[activeExerciseIndex] || exercises[0];

  const handleStartExercise = (ex) => {
    triggerHaptic('medium');
    setStartedExercises(prev => ({ ...prev, [ex.id]: !prev[ex.id] }));
    trackEvent(AnalyticsEvents.EXERCISE_STARTED, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      difficulty: ex.difficulty,
      duration: ex.duration
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-sand-200 shadow-sm overflow-hidden text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-sand-50 p-6 sm:p-8 border-b border-sand-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 mb-2">
              <i className="fas fa-person-walking text-emerald-600 text-xs" />
              <span>Wellness &amp; Movement</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Wellness &amp; Movement
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Supportive gentle practices including walking, yoga, mobility, strength, breathing, and stretching to encourage circulation, restful sleep, and nervous system ease.
            </p>
          </div>

          <div className="shrink-0 bg-white/90 backdrop-blur-sm border border-sand-200 px-3.5 py-2.5 rounded-2xl shadow-2xs text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Care Label</span>
            <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
              General wellness guidance — not a treatment or diagnosis
            </span>
          </div>
        </div>

        {/* Exercise Quick-Switch Tabs */}
        <div className="flex flex-wrap gap-2 mt-5">
          {exercises.map((ex, idx) => {
            const isActive = idx === activeExerciseIndex;
            const isDone = startedExercises[ex.id];
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveExerciseIndex(idx);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white/80 hover:bg-white text-slate-700 border border-sand-200 shadow-2xs'
                }`}
              >
                <i className={`fas ${ex.icon} ${isActive ? 'text-emerald-400' : 'text-slate-400'} text-xs`} />
                <span>{ex.name}</span>
                {isDone && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Exercise Detail Card */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Title and metadata row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-sand-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sand-100 text-slate-700">
                {currentExercise.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {currentExercise.difficulty}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-aubergine-50 text-aubergine-800 border border-aubergine-200">
                <i className="fas fa-clock text-[10px] mr-1" /> {currentExercise.duration}
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              {currentExercise.name}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => handleStartExercise(currentExercise)}
            className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-md ${
              startedExercises[currentExercise.id]
                ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                : 'bg-aubergine-600 hover:bg-aubergine-700 text-white shadow-aubergine-100 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <i className={`fas ${startedExercises[currentExercise.id] ? 'fa-check-circle' : 'fa-play'} text-xs`} />
            <span>
              {startedExercises[currentExercise.id] ? 'Completed Practice' : 'Start Practice'}
            </span>
          </button>
        </div>

        {/* Benefits Box */}
        <div className="bg-sand-50/70 rounded-2xl p-4 sm:p-5 border border-sand-200/80">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            General Wellness Support
          </span>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">
            {currentExercise.benefits}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <i className="fas fa-calendar-check text-emerald-600" />
            <span>Suggested Frequency: <strong>{currentExercise.frequency}</strong></span>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div>
          <h5 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="fas fa-list-check text-aubergine-600 text-xs" />
            <span>Guided Steps</span>
          </h5>
          <ol className="space-y-3">
            {currentExercise.instructions.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-aubergine-100 text-aubergine-800 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Safety Notes & Non-Curative Medical Disclaimer (Strict Compliance) */}
        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 sm:p-5 text-xs text-amber-950 flex items-start gap-3.5">
          <i className="fas fa-shield-halved text-amber-700 text-base mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900">
              Important Medical Safety &amp; Non-Curative Notice:
            </p>
            <p className="text-amber-900 leading-relaxed">
              {currentExercise.safetyNotes}
            </p>
            <p className="text-slate-700 leading-relaxed font-medium pt-1 border-t border-amber-200">
              <strong>Strict Clinical Label:</strong> General wellness guidance — not a treatment or diagnosis. Physical exercise and movement do not cure medical conditions such as PCOS, vaginal infections, endometriosis, thyroid disease, acne, or hair loss. They serve as supportive wellness practices for vitality, mobility, and stress relief alongside licensed medical care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalizedExercise;
