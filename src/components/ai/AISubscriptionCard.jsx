import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { AIPaywallModal } from './AIPaywallModal.jsx';
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
  const isPremium = subData?.isPremium || false;
  const creditsRemaining = subData?.creditsRemaining ?? 5;
  const totalCredits = sub?.monthly_ai_credits || (isPremium ? 200 : (isDoctor ? 10 : 5));
  const usedCredits = sub?.credits_used || 0;
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
                  {isPremium ? (isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium') : 'AI Health Assistant'}
                </h3>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                  isPremium
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isPremium ? 'Active Pro' : 'Free Tier'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isPremium ? 'text-purple-200/80' : 'text-slate-500'}`}>
                {isPremium
                  ? `Unlimited priority AI clinical intelligence`
                  : `${creditsRemaining} queries remaining this month`}
              </p>
            </div>
          </div>

          {!isPremium && (
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
              Monthly AI Allowance
            </span>
            <span className={isPremium ? 'text-purple-300' : 'text-slate-700'}>
              {creditsRemaining} / {totalCredits} credits left
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

      <AIPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        paywallData={{
          planName: isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium',
          features: isDoctor
            ? [
                'AI Patient Brief pre-summarized before consultations',
                'SOAP Note Generation with clinical vector RAG',
                'AI Post-Consultation Summaries & Action Plans',
                'Unlimited Rx autocomplete and drug-food safety checks',
              ]
            : [
                'Unlimited AI Lab Report Explanations with cycle-phase context',
                'AI Consultation Preparation and doctor questions',
                '200 AI Health Companion inquiries / month',
                'Hormone biomarker trend insights',
              ],
        }}
        onUpgraded={() => {
          fetchStatus();
          onRefresh?.();
        }}
      />
    </>
  );
}

export default AISubscriptionCard;
