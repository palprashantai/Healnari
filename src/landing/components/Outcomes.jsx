import React, { useState } from 'react';

function Outcomes() {
  // slider values represent the health index (0 to 10)
  // Before is 2.1, After is 8.7
  const [healthIndex, setHealthIndex] = useState(8.7);

  const getStatusText = (val) => {
    if (val <= 4.0) {
      return {
        label: 'Before Treatment (Phase 1)',
        desc: 'Irregular cycles (once in 3-4 months), significant hair shedding, active facial acne, persistent weight gain.',
        severity: 'Severe Symptoms',
        color: 'bg-red-100 text-red-700 border-red-200',
        barColor: 'bg-red-400'
      };
    } else if (val <= 7.0) {
      return {
        label: 'Intermediate Progress (Phase 2 - Week 6)',
        desc: 'Menstrual cycles beginning to stabilize (45-50 days), hair fall reduced by 30%, active acne healing, energy levels recovering.',
        severity: 'Noticeable Improvement',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        barColor: 'bg-amber-400'
      };
    } else {
      return {
        label: 'After Treatment (Phase 3 - Week 12)',
        desc: 'Regular cycles (30-32 days), 60% reduction in hair fall, clear skin with minimal breakouts, 5 kg weight loss.',
        severity: 'Optimal Recovery',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500'
      };
    }
  };

  const status = getStatusText(healthIndex);

  return (
    <section id="results" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 scroll-mt-20">
      <div className="bg-white rounded-3xl p-5 sm:p-8 md:p-12 shadow-sm border border-slate-100/90">
        
        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">
            Illustrative Progress Journey
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
            Concerns into Measurable Improvement
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            This interactive example shows the kind of improvements our patients report at different stages of their personalised protocol. Individual journeys vary &mdash; your doctor will set realistic expectations during your consultation.
          </p>
        </div>

        {/* Interactive Comparison Sandbox */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Block: Case Study Details */}
          <div className="md:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 border flex items-center justify-center text-slate-400">
                <i className="fas fa-clipboard-user text-sm"></i>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Illustrative case example</p>
                <p className="text-xs font-bold text-slate-700">Composite profile, not an actual patient record | Age: 29 | Concern: PCOS + Hair fall</p>
              </div>
            </div>

            {/* Before vs After Static Comparison Widgets */}
            <div className="grid gap-3.5 pt-2">
              {/* Before Card */}
              <button 
                type="button"
                onClick={() => setHealthIndex(2.1)}
                className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md btn-interactive ${
                  healthIndex <= 4.0 
                    ? 'border-red-400 bg-red-50/10 shadow-md font-semibold ring-2 ring-red-400/20' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 text-slate-550'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Menstruation/Scalp Baseline (Week 0)</span>
                  <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">Index: 2.1</span>
                </div>
                <p className="text-sm mt-1.5 leading-relaxed font-medium text-slate-700">
                  Irregular cycles (once in 3-4 months), significant hair shedding, facial acne, weight gain.
                </p>
              </button>

              {/* After Card */}
              <button 
                type="button"
                onClick={() => setHealthIndex(8.7)}
                className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md btn-interactive ${
                  healthIndex > 7.0 
                    ? 'border-emerald-400 bg-emerald-50/10 shadow-md font-semibold ring-2 ring-emerald-400/20' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 text-slate-550'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Target Outcomes (Week 12)</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Index: 8.7</span>
                </div>
                <p className="text-sm mt-1.5 leading-relaxed font-medium text-slate-700">
                  Regular cycles (30-32 days), 60% reduction in hair shedding, clear skin, 5 kg weight loss.
                </p>
              </button>
            </div>
          </div>

          {/* Right Block: Dynamic Interactive Sandbox & Slider */}
          <div className="md:col-span-5 bg-slate-50/70 border border-slate-150/40 rounded-3xl p-6 space-y-6 transition-shadow duration-500 hover:shadow-card-hover">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hormonal Severity Index</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">0 = Severe | 10 = Optimal</span>
            </div>

            {/* Numeric display */}
            <div className="text-center space-y-1">
              <div className="text-5xl font-black text-slate-800 tracking-tighter">
                {healthIndex.toFixed(1)}
              </div>
              <div className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2.5 py-0.5 rounded-full ${status.color}`}>
                {status.severity}
              </div>
            </div>

            {/* Severity Meter Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Severe</span>
                <span>Optimal</span>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${status.barColor}`} 
                  style={{ width: `${healthIndex * 10}%` }}
                ></div>
              </div>
            </div>

            {/* Interactive Slider Input */}
            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Drag to simulate treatment phases
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.1"
                value={healthIndex} 
                onChange={(e) => setHealthIndex(parseFloat(e.target.value))}
                className="w-full accent-brand-600 bg-slate-200 cursor-pointer rounded-lg appearance-none h-1.5"
                aria-label="Hormonal Severity Index Simulator Slider"
              />
            </div>

            {/* Dynamic Status Explain Card */}
            <div className="p-3.5 bg-white border border-slate-100 rounded-2xl">
              <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wide">
                {status.label}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-semibold">
                {status.desc}
              </p>
            </div>

            <p className="text-[10px] text-center text-slate-400 font-semibold italic">
              * Based on self-reported symptom tracking from patients completing a 12-week protocol. Not a clinical guarantee — individual results vary.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Outcomes;
