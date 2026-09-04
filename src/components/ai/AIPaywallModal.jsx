import { useAuth } from '../../context/AuthContext.jsx';
import { isIndianUser } from '../../lib/countries.js';
import React, { useState, useEffect } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { Modal } from '../Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../Toast.jsx';
import { triggerHaptic } from '../../lib/haptics.js';
import { formatCurrency, getCurrencySymbol, ISO_CURRENCIES, getStoredCurrency } from '../../lib/currency.js';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

export function AIPaywallModal({
  isOpen,
  onClose,
  paywallData,
  onUpgraded,
}) {
  const { toast } = useToast?.() || { toast: (msg) => alert(msg) };
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricingQuotes, setPricingQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { user } = useAuth();
  const isIndian = isIndianUser(user);
  const userCurrency = isIndian ? "INR" : "USD";
  const isDoctor = paywallData?.planName?.toLowerCase().includes('doctor') || paywallData?.planId?.startsWith('doctor');
  const basePlanId = paywallData?.planId || (isDoctor ? 'doctor_plan_2' : 'patient_plan_2');
  const effectivePlanId = basePlanId;

  useEffect(() => {
    if (isOpen) {
      apiFetch(`/ai/pricing?currency=${userCurrency}&country=${isIndian ? "IN" : "US"}`)
        .then((quotes) => setPricingQuotes(quotes || []))
        .catch(() => {});
    }
  }, [isOpen, userCurrency]);

  if (!isOpen) return null;

  // Resolve matching quote or fallback to canonical plan benchmarks
  const currentQuote = pricingQuotes.find((q) => q.planId === effectivePlanId) || {
    baseAmount: isDoctor
      ? (userCurrency === 'USD' ? (effectivePlanId === 'doctor_plan_3' ? 39 : 19) : (effectivePlanId === 'doctor_plan_3' ? 2999 : 1499))
      : (userCurrency === 'USD' ? (effectivePlanId === 'patient_plan_3' ? 14 : 7) : (effectivePlanId === 'patient_plan_3' ? 999 : 499)),
    finalAmount: isDoctor
      ? (userCurrency === 'USD' ? (effectivePlanId === 'doctor_plan_3' ? 39 : 19) : (effectivePlanId === 'doctor_plan_3' ? 2999 : 1499))
      : (userCurrency === 'USD' ? (effectivePlanId === 'patient_plan_3' ? 14 : 7) : (effectivePlanId === 'patient_plan_3' ? 999 : 499)),
    currency: userCurrency,
    currencySymbol: userCurrency === 'USD' ? '$' : '₹',
    countryName: userCurrency === 'USD' ? 'International' : 'India',
    countryCode: userCurrency === 'USD' ? 'US' : 'IN',
    taxName: userCurrency === 'USD' ? 'Sales Tax' : 'GST',
    taxRate: userCurrency === 'USD' ? 0 : 18,
    taxType: userCurrency === 'USD' ? 'exclusive' : 'inclusive',
    includedCredits: isDoctor ? (effectivePlanId === 'doctor_plan_3' ? 300 : 100) : (effectivePlanId === 'patient_plan_3' ? 150 : 60),
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await apiFetch('/ai/coupons/validate', {
        method: 'POST',
        body: {
          code: couponCode.trim(),
          planId: effectivePlanId,
          countryCode: currentQuote.countryCode,
          currencyCode: currentQuote.currency,
        },
      });
      setAppliedCoupon(res);
      toast(`Coupon applied! Saved ${formatCurrency(res.discountedQuote?.discountAmount, currentQuote.currency)}`, 'success');
    } catch (err) {
      toast(err?.message || 'Invalid or expired coupon code', 'error');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const finalAmount = appliedCoupon?.discountedQuote?.finalAmount ?? currentQuote.finalAmount;

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
        '500 AI Health Companion inquiries / month',
        'Biomarker trend analysis & hormone health guidance',
        'Priority AI response processing & clinical safety verification',
      ];

  const features = paywallData?.features?.length ? paywallData.features : defaultFeatures;

  const handleUpgrade = async () => {
    setLoading(true);
    triggerHaptic?.();
    try {
      // 1. Authoritative checkout order initiation
      const order = await apiFetch('/ai/subscription/upgrade', {
        method: 'POST',
        body: {
          planId: basePlanId,
          billingCycle,
          currencyCode: userCurrency,
          countryCode: isIndian ? 'IN' : 'US',
          couponCode: appliedCoupon?.coupon?.code,
        },
      });

      // Handle complimentary / zero-amount tier
      if (!order.paymentSessionId || order.finalAmount <= 0) {
        const verified = await apiFetch(`/ai/subscription/verify/${order.orderId}`);
        toast(`🎉 Successfully activated ${order.planName}!`, 'success');
        onUpgraded?.(verified);
        onClose();
        return;
      }

      // 2. Open Cashfree Hosted Drop-in SDK
      const cashfree = await getCashfree();
      if (!cashfree) {
        throw new Error('Could not load payment gateway. Please check connection and try again.');
      }

      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal',
        appearance: {
          theme: 'light',
          color: '#6B46C1',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      });

      // 3. Reconcile with authoritative backend server-to-server check
      const verified = await apiFetch(`/ai/subscription/verify/${order.orderId}`);
      if (verified && verified.status === 'active') {
        toast(`🎉 Successfully upgraded to ${order.planName || 'Premium'}!`, 'success');
        onUpgraded?.(verified);
        onClose();
      } else {
        toast('Payment was not completed. You can try again anytime.', 'info');
      }
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
        <div className="text-center pt-2 pb-5 px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-magenta-500 text-white shadow-lg shadow-purple-500/30 mb-3 animate-bounce-short">
            <i className={`fas ${isDoctor ? 'fa-user-md' : 'fa-wand-magic-sparkles'} text-xl`}></i>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100/80 border border-purple-200 text-purple-800 text-[11px] font-black uppercase tracking-wider mb-2">
            <span>{ISO_CURRENCIES[currentQuote.currency]?.flag || '🌍'}</span>
            <span>{currentQuote.countryName} Market Edition</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {paywallData?.title || (isDoctor ? 'Accelerate Clinical Documentation' : 'Unlock Intelligent Health Insights')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
            {paywallData?.description || (isDoctor
              ? 'Save hours each week with automated SOAP notes, pre-consult patient briefs, and clinical summaries.'
              : 'Understand your blood reports in plain English, prepare tailored questions for your doctor, and take control of your health journey.')}
          </p>


        </div>

        {/* Pricing Card */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-pink-50 border border-purple-200/80 rounded-2xl p-5 mx-4 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wider block">
                {paywallData?.planName || (isDoctor ? 'Doctor Pro Plan' : 'Patient Pro Plan')}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Includes {currentQuote.includedCredits} monthly AI uses • Clinical Grade Intelligence
              </span>
            </div>

            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                {appliedCoupon && (
                  <span className="text-sm font-bold text-slate-400 line-through mr-1">
                    {formatCurrency(currentQuote.baseAmount, currentQuote.currency)}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatCurrency(finalAmount, currentQuote.currency)}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {billingCycle === 'monthly' ? '/ mo' : '/ yr'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">
                {currentQuote.taxName} {currentQuote.taxType === 'inclusive' ? 'included' : '+ applicable local tax'}
              </span>
            </div>
          </div>

          {/* Coupon Input Strip */}
          <div className="mt-4 pt-3 border-t border-purple-200/60 flex items-center gap-2">
            <input
              type="text"
              placeholder="Promo / Coupon Code (e.g. HEALNARI20)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={validatingCoupon || !couponCode.trim()}
              className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {validatingCoupon ? 'Checking...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Feature List */}
        <div className="px-5 mt-4 space-y-2">
          <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">What's Included:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-700">
                <i className="fas fa-check-circle text-emerald-600 mt-0.5 shrink-0"></i>
                <span className="leading-snug">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Upgrade Button */}
        <div className="px-4 mt-5">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 hover:from-purple-950 hover:to-indigo-950 text-white font-black py-3.5 rounded-2xl text-sm shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                <span>Setting up your subscription...</span>
              </>
            ) : (
              <>
                <i className="fas fa-bolt-lightning text-amber-300"></i>
                <span>
                  Activate Subscription — {formatCurrency(finalAmount, currentQuote.currency)}
                </span>
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            🔒 Bank-grade encrypted multi-currency billing • Cancel anytime with 1-click
          </p>
        </div>
      </div>
    </Modal>
  );
}
