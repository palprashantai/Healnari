import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';

export default function PatientLifestyle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('diet'); // 'diet', 'yoga', 'habits'
  const [waterGlasses, setWaterGlasses] = useState(4);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  // Load patient prescriptions with holistic lifestyle protocols
  useEffect(() => {
    apiFetch('/records/prescriptions?limit=50')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);

        // Group rows by group_id — each group is one prescription
        const byGroup = new Map();
        for (const rx of list) {
          const gid = rx.group_id || rx.id;
          if (!byGroup.has(gid)) byGroup.set(gid, []);
          byGroup.get(gid).push(rx);
        }

        const holistic = [];
        const seenGroups = new Set();

        for (const [groupId, rows] of byGroup.entries()) {
          if (seenGroups.has(groupId)) continue;
          for (const rx of rows) {
            try {
              const rawInstr = (rx.instructions || '').replace(/<!--[\s\S]*?-->/g, '').trim();
              if (!rawInstr.startsWith('{')) continue;
              const parsed = JSON.parse(rawInstr);
              if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
                seenGroups.add(groupId);
                holistic.push({
                  ...parsed,
                  rxId: groupId,
                  date: rx.prescribed_at
                    ? new Date(rx.prescribed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (rx.prescribedOn || 'Recent'),
                  doctor: rx.doctor_name || rx.doctor || rx.prescribedBy || 'Your Doctor',
                });
                break;
              }
            } catch (e) {}
          }
        }

        setPlans(holistic.sort((a, b) => new Date(b.date) - new Date(a.date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Interactive Breathwork Timer (4-4-4 Pranayama Pacer)
  useEffect(() => {
    if (!breathingActive) return;
    const interval = setInterval(() => {
      setBreathSeconds(prev => {
        if (prev > 1) return prev - 1;
        setBreathPhase(curr => {
          if (curr === 'Inhale') return 'Hold';
          if (curr === 'Hold') return 'Exhale';
          return 'Inhale';
        });
        return 4;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breathingActive]);

  const activePlan = plans[0] || null;

  const handleDownloadA4Pdf = (planToPrint = activePlan) => {
    if (!planToPrint) return;
    openLifestylePlanPrintWindow({
      rxId: `HN-${String(planToPrint.rxId).slice(0, 8).toUpperCase() || 'LIFESTYLE'}`,
      date: planToPrint.date,
      doctor: { name: planToPrint.doctor },
      patient: { name: user?.name, gender: user?.gender || user?.profile?.gender || '—' },
      dietPlan: planToPrint.dietPlan,
      exercisePlan: planToPrint.exercisePlan,
    });
  };

  // Check if macro targets have any data worth showing
  const hasMacros = activePlan?.macroTargets &&
    Object.values(activePlan.macroTargets).some(v => v && String(v).trim() !== '');

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-6xl mx-auto">
      {/* Top Banner & Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <i className="fas fa-seedling"></i> Personalized Lifestyle Medicine
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              My Diet &amp; Mindful Movement Plan
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
              Tailored nutritional therapy, hormone-balancing meal timing, and cycle-aligned yoga routines prescribed by your care team.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {activePlan && (
              <button
                onClick={() => handleDownloadA4Pdf(activePlan)}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <i className="fas fa-file-pdf text-sm"></i> Download Official A4 Plan (PDF)
              </button>
            )}
            <button
              onClick={() => navigate('/patient-dashboard/appointments?book=followup')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-4 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <i className="fas fa-calendar-check text-emerald-400"></i> Book Follow-Up
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <i className="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3 block"></i>
          <p className="text-slate-600 font-bold text-sm">Loading your personalized regimen…</p>
        </div>
      ) : !activePlan ? (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 p-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl mx-auto border border-emerald-100 shadow-inner">
            🥗
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800">No Prescribed Lifestyle Plan Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your gynecologist, clinical nutritionist, or yoga expert will formulate your custom dietary plate, macro targets, and yoga routine during your consultation.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/patient-dashboard/appointments')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <i className="fas fa-calendar-plus"></i> Schedule Holistic Consultation
            </button>
          </div>
        </div>
      ) : (
        /* Active Protocol Details */
        <div className="space-y-5">
          {/* Clinician Stamp & Follow-Up Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-lg font-black shrink-0">
                <i className="fas fa-user-doctor"></i>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Active Lifestyle Protocol</span>
                <p className="font-bold text-slate-900 text-sm">Prescribed by {activePlan.doctor}</p>
                <p className="text-[11px] text-slate-500">Date: {activePlan.date}
                  {activePlan.dietType && <span className="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{activePlan.dietType}</span>}
                </p>
              </div>
            </div>

            {activePlan.followUpAdvice && (
              <div className="bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2.5 rounded-xl text-xs flex items-center gap-3">
                <i className="fas fa-calendar-check text-purple-600 text-base"></i>
                <div>
                  <span className="font-bold block text-[11px]">Recommended Follow-Up:</span>
                  <span className="text-purple-800 font-medium">{activePlan.followUpAdvice}</span>
                </div>
              </div>
            )}
          </div>

          {/* Macro Targets Bar (only if doctor set them) */}
          {hasMacros && (
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 md:p-5 shadow-xs">
              <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fas fa-chart-bar text-emerald-600"></i> Daily Macro Targets
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: 'calories', label: 'Calories', unit: '', icon: '🔥', color: 'bg-orange-50 border-orange-200 text-orange-800' },
                  { key: 'protein', label: 'Protein', unit: '', icon: '🥩', color: 'bg-red-50 border-red-200 text-red-800' },
                  { key: 'carbs', label: 'Carbs', unit: '', icon: '🌾', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                  { key: 'fats', label: 'Healthy Fats', unit: '', icon: '🥑', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                  { key: 'fiber', label: 'Fiber', unit: '', icon: '🥦', color: 'bg-teal-50 border-teal-200 text-teal-800' },
                ].map(m => {
                  const val = activePlan.macroTargets?.[m.key];
                  if (!val) return null;
                  return (
                    <div key={m.key} className={`rounded-2xl border p-3 text-center space-y-1 ${m.color}`}>
                      <span className="text-xl block">{m.icon}</span>
                      <p className="text-xs font-black">{val}</p>
                      <p className="text-[10px] font-semibold opacity-70">{m.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Core Navigation Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold max-w-md">
            {[
              { key: 'diet', label: 'Diet & Nutrition', icon: 'fa-seedling' },
              { key: 'yoga', label: 'Yoga & Movement', icon: 'fa-om' },
              { key: 'habits', label: 'Hydration & Habits', icon: 'fa-droplet' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i> {tab.label}
              </button>
            ))}
          </div>

          {/* ══════ TAB 1: DIET & NUTRITION ══════ */}
          {activeTab === 'diet' && (
            <div className="space-y-5">
              {/* Meal-by-Meal Timetable */}
              {activePlan.dietSchedule && activePlan.dietSchedule.length > 0 ? (
                <div className="bg-white rounded-3xl border-2 border-emerald-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <h3 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                      <i className="fas fa-clock text-emerald-600"></i> Doctor-Prescribed Meal Timetable
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                      {activePlan.dietSchedule.length} Meals Scheduled
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {activePlan.dietSchedule.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-4 px-5 py-4 hover:bg-emerald-50/40 transition-colors">
                        {/* Time Badge */}
                        <div className="shrink-0 text-center min-w-[72px]">
                          <span className="inline-block bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-xl">
                            {m.time || `Meal ${idx + 1}`}
                          </span>
                        </div>
                        {/* Meal Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-black text-slate-900 text-sm">{m.meal}</h5>
                          <p className="text-xs text-slate-600 leading-relaxed">{m.foods}</p>
                          {m.portion && (
                            <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                              Portion: {m.portion}
                            </span>
                          )}
                          {m.notes && (
                            <p className="text-[11px] text-teal-700 font-semibold italic flex items-start gap-1">
                              <span>💡</span> {m.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Plain text diet plan fallback */
                <div className="bg-white rounded-3xl border-2 border-emerald-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-4">
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                      <i className="fas fa-seedling text-emerald-600 text-base"></i> Doctor's Prescribed Dietary Regimen
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                      Clinical Nutrition
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/80">
                    <p className="text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
                      {activePlan.dietPlan || 'Follow healthy whole food principles with adequate hydration and balanced fiber.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Foods to Include & Avoid */}
              {((activePlan.dos && activePlan.dos.length > 0) || (activePlan.donts && activePlan.donts.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePlan.dos && activePlan.dos.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-xs space-y-3">
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-circle-check text-emerald-600 text-base"></i> Foods to Prioritize & Include
                      </h4>
                      <ul className="space-y-2">
                        {activePlan.dos.map((d, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                            <span className="text-slate-700 font-medium">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activePlan.donts && activePlan.donts.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-rose-100 p-5 shadow-xs space-y-3">
                      <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-circle-xmark text-rose-600 text-base"></i> Foods to Strictly Avoid
                      </h4>
                      <ul className="space-y-2">
                        {activePlan.donts.map((d, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-black shrink-0">✗</span>
                            <span className="text-slate-700 font-medium">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Nutrition Pillars Grid (always shown as education) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-amber-500"></i> Evidence-Based Nutrition Pillars
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { title: 'Low-GI Complex Carbs', desc: 'Prevents insulin spikes & mood dips. Opt for millets, oats, quinoa.', icon: '🌾' },
                    { title: 'Lean Protein Balance', desc: '20-30g per meal. Essential for hormone synthesis & satiety.', icon: '🍳' },
                    { title: 'Fiber & Prebiotics', desc: '30g+ daily to support gut estrogen clearance & regular digestion.', icon: '🥗' },
                    { title: 'Anti-Inflammatory Fats', desc: 'Omega-3s from flaxseeds, chia, walnuts, and cold-pressed oils.', icon: '🥑' },
                  ].map(pillar => (
                    <div key={pillar.title} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                      <span className="text-xl block mb-1">{pillar.icon}</span>
                      <h4 className="text-xs font-black text-slate-900">{pillar.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{pillar.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════ TAB 2: YOGA & MOVEMENT ══════ */}
          {activeTab === 'yoga' && (
            <div className="space-y-5">
              {/* Program Header (Phase + Frequency) */}
              {(activePlan.yogaPhase || activePlan.yogaFrequency) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 flex flex-wrap gap-4 items-center">
                  {activePlan.yogaPhase && (
                    <div className="flex items-center gap-2">
                      <i className="fas fa-om text-amber-600 text-base"></i>
                      <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Yoga Program</p>
                        <p className="font-bold text-amber-900 text-sm">{activePlan.yogaPhase}</p>
                      </div>
                    </div>
                  )}
                  {activePlan.yogaPhase && activePlan.yogaFrequency && <div className="w-px h-10 bg-amber-200 hidden sm:block"></div>}
                  {activePlan.yogaFrequency && (
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calendar-days text-amber-600 text-base"></i>
                      <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Frequency</p>
                        <p className="font-bold text-amber-900 text-sm">{activePlan.yogaFrequency}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Prescribed Asana Cards */}
              <div className="bg-white rounded-3xl border-2 border-amber-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
                  <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                    <i className="fas fa-om text-amber-600"></i>
                    {activePlan.yogaAsanas && activePlan.yogaAsanas.length > 0 ? 'Doctor-Prescribed Therapeutic Asanas' : 'Recommended Hormonal Asanas'}
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                    {(activePlan.yogaAsanas?.length || 4)} Asanas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                  {(activePlan.yogaAsanas && activePlan.yogaAsanas.length > 0 ? activePlan.yogaAsanas : [
                    { name: 'Baddha Konasana (Butterfly)', benefit: 'Stimulates pelvic blood flow and eases menstrual tension.', duration: '3–5 Mins', cues: 'Soles together, flutter gently.' },
                    { name: 'Supta Baddha Konasana', benefit: 'Relaxes sympathetic nervous system and down-regulates cortisol.', duration: '5–8 Mins', cues: 'Use bolster along spine.' },
                    { name: 'Malasana (Garland Pose)', benefit: 'Lengthens pelvic floor and strengthens hips and lower back.', duration: '2–3 Mins', cues: 'Heels flat or on blanket.' },
                    { name: 'Viparita Karani (Legs Up Wall)', benefit: 'Promotes lymphatic drainage and restful restorative sleep.', duration: '8–10 Mins', cues: 'Hips snug against wall.' },
                  ]).map((asana, aIdx) => (
                    <div key={asana.name || aIdx} className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-black text-sm text-amber-900 leading-snug">{asana.name}</h5>
                        <span className="text-[10px] font-bold bg-amber-200/60 text-amber-800 px-2.5 py-1 rounded-full shrink-0 border border-amber-300/50">{asana.duration}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{asana.benefit}</p>
                      {asana.cues && (
                        <div className="bg-white/70 rounded-xl p-2 border border-amber-100">
                          <p className="text-[11px] text-amber-800 font-semibold italic flex items-start gap-1.5">
                            <i className="fas fa-hand-sparkles text-[9px] mt-0.5 shrink-0"></i>
                            {asana.cues}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pranayama Section (from telemedicine structured builder) */}
              {activePlan.pranayama && activePlan.pranayama.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <h3 className="text-sm font-black text-purple-900 flex items-center gap-2">
                      <i className="fas fa-wind text-purple-600"></i> Prescribed Pranayama & Breathwork
                    </h3>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                      {activePlan.pranayama.length} Techniques
                    </span>
                  </div>
                  <div className="divide-y divide-purple-50">
                    {activePlan.pranayama.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-4 px-5 py-4 hover:bg-purple-50/30 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h5 className="font-black text-sm text-purple-900">{p.name}</h5>
                            {p.duration && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">{p.duration}</span>
                            )}
                          </div>
                          {p.benefit && <p className="text-xs text-slate-600 leading-relaxed">{p.benefit}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cardio & Precautions */}
              {(activePlan.cardio || activePlan.precautions) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePlan.cardio && (
                    <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-2">
                      <h4 className="text-xs font-black text-blue-800 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-person-running text-blue-600"></i> Daily Cardio & Step Goals
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">{activePlan.cardio}</p>
                    </div>
                  )}
                  {activePlan.precautions && (
                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs space-y-2">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-triangle-exclamation text-amber-600"></i> Clinical Precautions
                      </h4>
                      <p className="text-sm text-amber-900 leading-relaxed font-medium whitespace-pre-line">{activePlan.precautions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Plain-text yoga fallback if no structured data */}
              {(!activePlan.yogaAsanas || activePlan.yogaAsanas.length === 0) && activePlan.exercisePlan && (
                <div className="bg-white rounded-3xl border-2 border-amber-100 p-6 md:p-8 shadow-sm">
                  <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100/80">
                    <p className="text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
                      {activePlan.exercisePlan}
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Pranayama Breathwork Pacer */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 text-center space-y-4">
                <div>
                  <h4 className="font-black text-purple-900 text-sm">Interactive Pranayama Breathing Pacer</h4>
                  <p className="text-xs text-purple-700 mt-0.5">Activate parasympathetic relaxation with diaphragmatic breathing (4s Inhale – 4s Hold – 4s Exhale)</p>
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                  <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
                    breathingActive
                      ? breathPhase === 'Inhale'
                        ? 'border-emerald-400 bg-emerald-100/50 scale-110'
                        : breathPhase === 'Hold'
                        ? 'border-amber-400 bg-amber-100/50 scale-105'
                        : 'border-purple-400 bg-purple-100/50 scale-95'
                      : 'border-slate-300 bg-white'
                  }`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900">{breathPhase}</span>
                    <span className="text-3xl font-black text-purple-950 font-mono mt-1">{breathSeconds}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBreathingActive(!breathingActive)}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                  >
                    <i className={`fas ${breathingActive ? 'fa-pause' : 'fa-play'} mr-1.5`}></i>
                    {breathingActive ? 'Pause Breathwork' : 'Start 4-4-4 Breathwork'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════ TAB 3: HYDRATION & HABITS ══════ */}
          {activeTab === 'habits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Water Tracker */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <i className="fas fa-droplet text-blue-500"></i> Daily Hydration Tracker
                  </h3>
                  <span className="text-xs font-bold text-blue-600">{waterGlasses * 250} ml / 2,000 ml</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Adequate water intake prevents water retention, supports hepatic clearance of estrogens, and reduces brain fog.
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(glass => (
                    <button
                      key={glass}
                      type="button"
                      onClick={() => setWaterGlasses(glass)}
                      className={`h-14 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                        glass <= waterGlasses
                          ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-blue-50 hover:text-blue-500'
                      }`}
                    >
                      <i className="fas fa-glass-water text-base"></i>
                      <span className="text-[9px] font-bold mt-1">{glass * 250}ml</span>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 rounded-2xl p-3.5 text-xs text-blue-900 flex items-center justify-between">
                  <span>Target: 8 glasses (2 Litres) daily</span>
                  <button
                    type="button"
                    onClick={() => setWaterGlasses(0)}
                    className="text-[10px] font-bold text-blue-700 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Circadian Sleep & Routine */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <i className="fas fa-moon text-indigo-500"></i> Circadian Rhythm &amp; Sleep
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Melatonin and cortisol regulate sex hormones (LH/FSH). Deep non-REM sleep is essential for ovarian repair.
                </p>

                <div className="space-y-3">
                  {[
                    { title: '12-Hour Overnight Fasting Window', time: '8:00 PM – 8:00 AM', desc: 'Allows gut microbiome repair and reduces nocturnal insulin resistance.', icon: '🌙' },
                    { title: 'Morning Sunlight Exposure', time: 'Within 30 mins of waking', desc: 'Resets circadian clock & spikes natural morning cortisol appropriately.', icon: '☀️' },
                    { title: 'Digital Sunset (No blue light)', time: '60 mins before bedtime', desc: 'Prevents melatonin suppression and improves deep sleep stages.', icon: '📱' },
                  ].map(habit => (
                    <div key={habit.title} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{habit.icon}</span> {habit.title}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{habit.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{habit.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Previous Protocol History */}
          {plans.length > 1 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Lifestyle Protocol History ({plans.length})
              </h3>
              <div className="space-y-2">
                {plans.slice(1).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Prescription from {p.date}</p>
                      <p className="text-[11px] text-slate-500">By {p.doctor}
                        {p.dietType && <span className="ml-2 text-emerald-600 font-semibold">{p.dietType}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadA4Pdf(p)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                    >
                      <i className="fas fa-download mr-1"></i> Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
