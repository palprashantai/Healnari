import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { AIUsageUpgradeModal } from './AIUsageUpgradeModal.jsx';
import { AIButton } from '../AiButton.jsx';

export function AISubscriptionCard({ userRole = 'patient', onRefresh }) {
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/ai/subscription/status');
      setSubData(res);
    } catch (err) {
      console.error('Failed to load AI subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-slate-100 rounded w-2/3"></div>
      </div>
    );
  }

  const isDoctor = userRole === 'doctor';
  const sub = subData?.subscription || {};
  const currentPlanId = sub?.plan_id || (isDoctor ? 'doctor_plan_1' : 'patient_plan_1');
  const planNames = {
    doctor_plan_1: 'Doctor Starter',
    doctor_free: 'Doctor Starter',
    doctor_plan_2: 'Doctor Pro',
    doctor_pro: 'Doctor Pro',
    doctor_plan_3: 'Doctor Premium',
    patient_plan_1: 'Patient Basic',
    patient_free: 'Patient Basic',
    patient_plan_2: 'Patient Pro',
    patient_premium: 'Patient Pro',
    patient_plan_3: 'Patient Premium',
  };
  const currentPlanName = sub?.plan_name || planNames[currentPlanId] || (isDoctor ? 'Doctor Starter' : 'Patient Basic');
  const isActive = currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing';
  const isPremium = isActive && (currentPlanId.includes('2') || currentPlanId.includes('3') || currentPlanId.includes('pro') || currentPlanId.includes('premium'));
  const isHighestPlan = currentPlanId === 'doctor_plan_3' || currentPlanId === 'patient_plan_3';
  const creditsRemaining = subData?.creditsRemaining ?? (isDoctor ? 25 : 15);
  const totalCredits = sub?.monthly_ai_credits || subData?.totalCredits || (isDoctor ? 25 : 15);
  const usedCredits = subData?.creditsUsed ?? sub?.credits_used ?? 0;
  const percentUsed = Math.min(100, Math.round((usedCredits / Math.max(1, totalCredits)) * 100));

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all ${
        isPremium
          ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white border-purple-500/30'
          : 'bg-white text-slate-800 border-slate-200'
      }`}>
        {/* Ambient Top Glow for Premium */}
        {isPremium && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isPremium
                ? 'bg-gradient-to-tr from-purple-500 to-magenta-500 text-white'
                : 'bg-purple-50 text-purple-600 border border-purple-100'
            }`}>
              <i className={`fas ${isPremium ? 'fa-crown' : 'fa-wand-magic-sparkles'} text-xl`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-base tracking-tight ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                  {currentPlanName}
                </h3>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                  isPremium
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {currentPlanId.includes('3') ? 'Premium Tier' : currentPlanId.includes('2') || isPremium ? 'Pro Tier' : 'Starter Tier'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isPremium ? 'text-purple-200/80' : 'text-slate-500'}`}>
                {isPremium
                  ? `Clinical-grade AI intelligence enabled`
                  : `${creditsRemaining} AI uses remaining this month`}
              </p>
            </div>
          </div>

          {!isHighestPlan && (
            <AIButton
              size="sm"
              variant="gradient"
              onClick={() => setShowPaywall(true)}
              icon="fa-bolt"
            >
              Upgrade
            </AIButton>
          )}
        </div>

        {/* Usage Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className={isPremium ? 'text-purple-200' : 'text-slate-500'}>
              Monthly AI Uses
            </span>
            <span className={isPremium ? 'text-purple-300' : 'text-slate-700 font-mono'}>
              {creditsRemaining} / {totalCredits} uses left
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPremium
                  ? 'bg-gradient-to-r from-purple-400 via-indigo-400 to-magenta-400'
                  : 'bg-aubergine-600'
              }`}
              style={{ width: `${Math.max(5, 100 - percentUsed)}%` }}
            ></div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-3 flex flex-wrap gap-2 pt-2 text-[11px] font-medium">
          {isPremium ? (
            <>
              <span className="inline-flex items-center gap-1 text-purple-200">
                <i className="fas fa-check-circle text-emerald-400"></i>
                {isDoctor ? 'SOAP Notes Enabled' : 'Lab Report AI Explainer'}
              </span>
              <span className="inline-flex items-center gap-1 text-purple-200">
                <i className="fas fa-check-circle text-emerald-400"></i>
                {isDoctor ? 'Pre-Consult Briefs' : 'Consult Preparation Briefs'}
              </span>
              <span className="inline-flex items-center gap-1 text-purple-200">
                <i className="fas fa-check-circle text-emerald-400"></i>
                Priority Processing
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <i className="fas fa-lock text-amber-500"></i>
                {isDoctor ? 'SOAP Notes (Pro)' : 'Lab Report Explainer (Premium)'}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <i className="fas fa-lock text-amber-500"></i>
                {isDoctor ? 'Consult Summaries (Pro)' : 'Visit Prep (Premium)'}
              </span>
            </>
          )}
        </div>
      </div>

      <AIUsageUpgradeModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        role={userRole}
        currentPlanId={currentPlanId}
        tokensRemaining={creditsRemaining}
        onUpgraded={() => {
          fetchStatus();
          onRefresh?.();
        }}
      />
    </>
  );
}

export default AISubscriptionCard;
