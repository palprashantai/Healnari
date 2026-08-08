import React, { useState, useEffect } from 'react';
import { todayLocalStr } from '../lib/dateUtils.js';

function CycleTracker() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [data, setData] = useState({
    lastPeriodDate: '',
    cycleLength: 28,
    periodDuration: 5,
    flow: 'Medium',
    spotting: 'No',
    symptoms: [],
    weight: '',
    sleep: 7,
    exercise: '1-2 days/week',
    stress: 'Moderate',
    conditions: []
  });

  const [result, setResult] = useState(null);

  const symptomOptions = ['Cramps', 'Bloating', 'Headache', 'Breast tenderness', 'Acne', 'Mood changes', 'Fatigue', 'Hair fall'];
  const conditionOptions = ['PCOS / PCOD', 'Thyroid issues', 'Diabetes', 'Endometriosis'];

  const handleToggle = (field, item) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].includes(item) 
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const analyze = () => {
    setIsAnalyzing(true);
    setStep(4);
    
    setTimeout(() => {
      if (!data.lastPeriodDate) return;

      const today = new Date();
      const last = new Date(data.lastPeriodDate);
      const daysSinceLast = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      const nextPeriod = new Date(last);
      nextPeriod.setDate(nextPeriod.getDate() + data.cycleLength);

      const ovulationDay = new Date(last);
      ovulationDay.setDate(ovulationDay.getDate() + data.cycleLength - 14);

      const fertileStart = new Date(ovulationDay);
      fertileStart.setDate(fertileStart.getDate() - 5);
      const fertileEnd = new Date(ovulationDay);
      fertileEnd.setDate(fertileEnd.getDate() + 1);

      const daysToNext = Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24));
      const currentPhaseDay = ((daysSinceLast % data.cycleLength) + data.cycleLength) % data.cycleLength + 1;

      // AI Risk Alerts Logic
      const alerts = [];
      if (data.cycleLength > 35) alerts.push({ type: 'warning', msg: 'Cycle > 35 days. This irregularity may require evaluation.' });
      if (data.conditions.includes('PCOS / PCOD') || (data.symptoms.includes('Hair fall') && data.symptoms.includes('Acne') && data.cycleLength > 35)) {
        alerts.push({ type: 'danger', msg: 'Possible PCOS pattern detected. High priority for doctor consultation.' });
      }
      if (data.flow === 'Heavy' && data.periodDuration > 7) {
        alerts.push({ type: 'danger', msg: 'Heavy/prolonged bleeding detected. Risk of anemia.' });
      }
      if (alerts.length === 0) {
        alerts.push({ type: 'success', msg: 'Cycle parameters look generally normal, but symptoms will be monitored.' });
      }

      setResult({
        daysSinceLast,
        daysToNext: Math.max(daysToNext, 0),
        currentPhaseDay,
        nextPeriod: nextPeriod.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        ovulation: ovulationDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        fertileWindow: `${fertileStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${fertileEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        alerts,
        progressPercent: Math.min((currentPhaseDay / data.cycleLength) * 100, 100),
      });
      setIsAnalyzing(false);
      setStep(5);
    }, 1500);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {[1, 2, 3].map(num => (
        <React.Fragment key={num}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === num ? 'bg-brand-600 text-white shadow-md' 
            : step > num ? 'bg-emerald-500 text-white' 
            : 'bg-slate-100 text-slate-400'
          }`}>
            {step > num ? <i className="fas fa-check"></i> : num}
          </div>
          {num < 3 && <div className={`w-8 h-1 rounded-full ${step > num ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <section id="cycle-tracker" className="max-w-4xl mx-auto px-4 md:px-8 py-16 scroll-mt-20">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-5 md:p-10">
        
        {/* Title */}
        {step < 5 && (
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-display">
              Comprehensive Cycle Analysis
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Built by gynecologists to track what actually matters.
            </p>
          </div>
        )}

        {step < 4 && renderStepIndicator()}

        {/* STEP 1: Basic Cycle Data */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg border-b pb-2">Basic Cycle Data</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">First day of last period *</label>
                <input
                  type="date"
                  value={data.lastPeriodDate}
                  max={todayLocalStr()}
                  onChange={(e) => setData({...data, lastPeriodDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Flow Intensity</label>
                <div className="flex gap-2">
                  {['Light', 'Medium', 'Heavy'].map(f => (
                    <button key={f} onClick={() => setData({...data, flow: f})}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${data.flow === f ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Average cycle length ({data.cycleLength} days)</label>
                <input type="range" min="20" max="45" value={data.cycleLength} onChange={(e) => setData({...data, cycleLength: Number(e.target.value)})} className="w-full accent-brand-600" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Period duration ({data.periodDuration} days)</label>
                <input type="range" min="1" max="10" value={data.periodDuration} onChange={(e) => setData({...data, periodDuration: Number(e.target.value)})} className="w-full accent-brand-600" />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!data.lastPeriodDate} className="w-full mt-6 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition-all">
              Next: Symptoms & Lifestyle
            </button>
          </div>
        )}

        {/* STEP 2: Symptoms & Lifestyle */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg border-b pb-2">Symptoms & Lifestyle</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-3">Experienced Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {symptomOptions.map(sym => (
                  <button key={sym} onClick={() => handleToggle('symptoms', sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${data.symptoms.includes(sym) ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Sleep Hours</label>
                <input type="range" min="4" max="10" step="0.5" value={data.sleep} onChange={(e) => setData({...data, sleep: Number(e.target.value)})} className="w-full accent-brand-600" />
                <span className="text-xs font-bold text-brand-700">{data.sleep} hours</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Stress Level</label>
                <select value={data.stress} onChange={(e) => setData({...data, stress: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option>Low</option><option>Moderate</option><option>High</option><option>Severe</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="w-1/3 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">Back</button>
              <button onClick={() => setStep(3)} className="w-2/3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-md transition-all">Next: Medical History</button>
            </div>
          </div>
        )}

        {/* STEP 3: Medical History */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg border-b pb-2">Medical History</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-3">Known Conditions</label>
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map(cond => (
                  <button key={cond} onClick={() => handleToggle('conditions', cond)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${data.conditions.includes(cond) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">Current Weight (kg) - Optional</label>
              <input type="number" placeholder="e.g. 65" value={data.weight} onChange={(e) => setData({...data, weight: e.target.value})} className="w-full md:w-1/2 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(2)} className="w-1/3 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">Back</button>
              <button onClick={analyze} className="w-2/3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                <i className="fas fa-stethoscope"></i> Generate Analysis
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Analyzing */}
        {step === 4 && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="font-bold text-slate-600 animate-pulse">Our AI is analyzing your cycle data...</p>
          </div>
        )}

        {/* STEP 5: Results Dashboard */}
        {step === 5 && result && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Your Clinical Dashboard</h2>
                <p className="text-sm text-slate-500">Based on data from your last cycle</p>
              </div>
              <button onClick={() => {setStep(1); setResult(null);}} className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
                <i className="fas fa-rotate-right mr-1"></i> Retake
              </button>
            </div>

            {/* AI Risk Alerts */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">AI Risk Alerts</h3>
              {result.alerts.map((alert, i) => (
                <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${
                  alert.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <i className={`fas mt-0.5 ${alert.type === 'danger' ? 'fa-triangle-exclamation' : alert.type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                  <p className="text-sm font-semibold">{alert.msg}</p>
                </div>
              ))}
              <div className="text-[10px] text-slate-400 italic font-semibold pt-1">
                * Note: AI Risk Alerts are automated flags based on cycle patterns, not a clinical medical diagnosis.
              </div>
            </div>

            {/* Medical Calculations */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Medical Calculations</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Next Period</p>
                  <p className="font-extrabold text-slate-800 text-lg mt-1">{result.nextPeriod}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ovulation</p>
                  <p className="font-extrabold text-slate-800 text-lg mt-1">{result.ovulation}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Fertile Window</p>
                  <p className="font-extrabold text-slate-800 text-lg mt-1 text-brand-600">{result.fertileWindow}</p>
                </div>
              </div>
            </div>

            {/* Doctor View Mockup */}
            <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-800">
                  <i className="fas fa-user-doctor"></i>
                  <span className="font-bold text-sm">Doctor's View</span>
                </div>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Pro Feature</span>
              </div>
              <div className="p-5 md:p-6 bg-white space-y-5">
                <p className="text-xs text-slate-500 font-medium">This is what your assigned doctor sees on their dashboard to monitor your progress.</p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Cycle Regularity</p>
                    <div className="mt-2 flex items-end gap-1 h-10">
                      {[28, 29, 35, data.cycleLength].map((len, i) => (
                        <div key={i} className={`w-full rounded-t-sm ${len > 35 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{height: `${(len/45)*100}%`}}></div>
                      ))}
                    </div>
                    <p className="text-[10px] text-center mt-1 text-slate-400">Last 4 cycles</p>
                  </div>
                  
                  <div className="border rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Symptom Trends</p>
                    <div className="mt-2 space-y-1.5">
                      {data.symptoms.slice(0,3).map(sym => (
                        <div key={sym} className="flex justify-between items-center text-xs">
                          <span className="truncate">{sym}</span>
                          <div className="flex gap-0.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          </div>
                        </div>
                      ))}
                      {data.symptoms.length === 0 && <p className="text-xs text-slate-400">No symptoms reported</p>}
                    </div>
                  </div>

                  <div className="border rounded-xl p-3 flex flex-col justify-center items-center gap-2 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer border-dashed">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <i className="fas fa-file-medical"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Upload Reports</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">USG, Thyroid, Hormones</p>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                  <i className="fas fa-video"></i> Discuss these results with a Doctor
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}

export default CycleTracker;
