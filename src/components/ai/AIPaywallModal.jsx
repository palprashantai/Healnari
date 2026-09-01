import React, { useState } from 'react';
import { Modal } from '../Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../Toast.jsx';
import { triggerHaptic } from '../../lib/haptics.js';

export function AIPaywallModal({
  isOpen,
  onClose,
  paywallData,
  onUpgraded,
}) {
  const { toast } = useToast?.() || { toast: (msg) => alert(msg) };
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isDoctor = paywallData?.planName?.toLowerCase().includes('doctor');
  const planId = isDoctor ? 'doctor_pro' : 'patient_premium';

  const monthlyPrice = isDoctor ? 999 : 299;
  const yearlyPrice = isDoctor ? 8999 : 2499;
  const yearlySavings = isDoctor ? 'Save ₹2,989' : 'Save ₹1,089';

  const activePrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const activeCycleLabel = billingCycle === 'monthly' ? '/ month' : '/ year';

  const defaultFeatures = isDoctor
    ? [
        'AI Patient Brief pre-summarized before every consultation',
        'SOAP Clinical Note Generation with vector clinical protocols',
        'Plain-language Post-Consult Patient Action Plan & summaries',
        'Unlimited Prescription Autocomplete & Drug-Food safety checks',
        'Save 15+ minutes of documentation time per consultation',
      ]
    : [
        'Unlimited AI Lab Report Explanations with cycle-phase reference ranges',
        'AI Visit Preparation with smart questions to ask your doctor',
        '200 AI Health Companion inquiries / month',
        'Biomarker trend analysis & hormone health guidance',
        'Priority AI response processing & clinical safety verification',
      ];

  const features = paywallData?.features?.length ? paywallData.features : defaultFeatures;

  const handleUpgrade = async () => {
    setLoading(true);
    triggerHaptic?.();
    try {
      // Step 1: Initiate upgrade
      await apiFetch('/ai/subscription/upgrade', {
        method: 'POST',
        body: { planId, billingCycle },
      });

      // Step 2: In test/sandbox mode, automatically activate
      const activated = await apiFetch('/ai/subscription/activate', {
        method: 'POST',
        body: {
          planId,
          billingCycle,
          paymentReference: `PAY_AI_${Date.now()}`,
        },
      });

      toast(`🎉 Successfully upgraded to ${paywallData?.planName || (isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium')}!`, 'success');
      onUpgraded?.(activated);
      onClose();
    } catch (err) {
      toast(err?.message || 'Could not complete upgrade. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="">
      <div className="relative -mt-4 pb-2">
        {/* Header Hero Gradient */}
        <div className="text-center pt-2 pb-6 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-magenta-500 text-white shadow-lg shadow-purple-500/30 mb-4 animate-bounce-short">
            <i className={`fas ${isDoctor ? 'fa-user-md' : 'fa-wand-magic-sparkles'} text-2xl`}></i>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-black uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
            {isDoctor ? 'Doctor Pro Feature' : 'HealNari AI Premium'}
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {paywallData?.title || (isDoctor ? 'Accelerate Clinical Documentation' : 'Unlock Intelligent Health Insights')}
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            {paywallData?.description || (isDoctor
              ? 'Save hours each week with automated SOAP notes, pre-consult patient briefs, and clinical summaries.'
              : 'Understand your blood reports in plain English, prepare tailored questions for your doctor, and take control of your health journey.')}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl mt-5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Yearly</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {yearlySavings}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Card & Features */}
        <div className="bg-gradient-to-b from-purple-50/70 to-indigo-50/40 border border-purple-100 rounded-2xl p-5 mb-5">
          <div className="flex items-baseline justify-between border-b border-purple-100/80 pb-4 mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Plan Total</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                ₹{activePrice.toLocaleString('en-IN')}
                <span className="text-sm font-semibold text-slate-500 ml-1">{activeCycleLabel}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 block">Cancel anytime</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                <i className="fas fa-shield-check"></i> Instant Activation
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
              Everything included:
            </span>
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <i className="fas fa-check"></i>
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-magenta-600 hover:from-purple-700 hover:via-indigo-700 hover:to-magenta-700 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Activating {isDoctor ? 'Doctor AI Pro' : 'AI Premium'}...</span>
              </>
            ) : (
              <>
                <i className="fas fa-bolt"></i>
                <span>Unlock {paywallData?.planName || (isDoctor ? 'Doctor AI Pro' : 'AI Premium')} — ₹{activePrice.toLocaleString('en-IN')}{activeCycleLabel}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Clinical Disclaimer */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
            <i className="fas fa-info-circle mr-1 text-purple-600"></i>
            {isDoctor
              ? 'Doctor AI Pro aids in draft generation. The licensed physician remains solely responsible for all final clinical evaluations and prescriptions.'
              : 'HealNari AI explanations are for educational and preparation purposes. They do not replace professional medical diagnosis or consultation with your doctor.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default AIPaywallModal;
