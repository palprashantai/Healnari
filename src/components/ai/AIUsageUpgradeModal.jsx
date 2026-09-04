import React, { useState, useEffect, useMemo } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { Modal } from '../Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { detectUserCountry } from '../../lib/countries.js';
import { useToast } from '../Toast.jsx';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

export function AIUsageUpgradeModal({
  isOpen,
  onClose,
  role = 'patient',
  currentPlanId = null,
  tokensRemaining = 0,
  renewalDate = null,
  onUpgraded = () => {},
}) {
  const { user } = useAuth();
  const toastFn = useToast();
  const toast = typeof toastFn === 'function' ? toastFn : (toastFn?.toast || ((m) => alert(m)));
  const userCountry = detectUserCountry(user);
  const isIndian = userCountry === 'IN';
  const selectedCurrency = isIndian ? 'INR' : 'USD';
  const [pricingQuotes, setPricingQuotes] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [submittingTopUpId, setSubmittingTopUpId] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('topup');

  const isDoctor = role === 'doctor' || (currentPlanId && currentPlanId.startsWith('doctor'));

  // Fetch Quotes on Open
  useEffect(() => {
    if (isOpen) {
      apiFetch(`/ai/pricing?currency=${selectedCurrency}&country=${isIndian ? "IN" : "US"}`)
        .then((quotes) => setPricingQuotes(quotes || []))
        .catch(() => {});
    }
  }, [isOpen, selectedCurrency]);

  // Derive Plans dynamically from database pricingQuotes
  const availablePlans = useMemo(() => {
    const paidRoleQuotes = pricingQuotes.filter((q) => {
      if (q.billing_cycle === 'credit_pack' || q.billingCycle === 'credit_pack') return false;
      if (q.planId?.startsWith('pack_')) return false;
      const price = isIndian ? (q.price_inr ?? q.baseAmount ?? 0) : (q.price_usd ?? q.baseAmount ?? 0);
      const isPaid = price > 0;
      const matchesRole = isDoctor ? q.product_id?.includes('doctor') : q.product_id?.includes('patient');
      return isPaid && matchesRole;
    });

    if (paidRoleQuotes.length > 0) {
      const sorted = [...paidRoleQuotes].sort((a, b) => {
        const pa = isIndian ? (a.price_inr ?? a.baseAmount ?? 0) : (a.price_usd ?? a.baseAmount ?? 0);
        const pb = isIndian ? (b.price_inr ?? b.baseAmount ?? 0) : (b.price_usd ?? b.baseAmount ?? 0);
        return pa - pb;
      });

      return sorted.map((q, idx) => {
        const uses = q.includedCredits || q.included_monthly_credits || (isDoctor ? (idx === 0 ? 100 : 300) : (idx === 0 ? 60 : 150));
        const priceInr = q.price_inr ?? (q.currency === 'INR' ? q.baseAmount : 999);
        const priceUsd = q.price_usd ?? (q.currency === 'USD' ? q.baseAmount : 19);
        const isPopular = idx === 0;

        const featureNames = Array.isArray(q.features) && q.features.length > 0
          ? q.features.map((fk) => fk.replace(/^(DOCTOR_|PATIENT_)/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()))
          : [];

        return {
          id: q.planId,
          tier: idx + 2,
          name: q.planName,
          badge: isPopular ? (isDoctor ? 'Most Popular' : 'Recommended') : 'VIP Tier',
          monthlyUses: uses,
          priceInr,
          priceUsd,
          tagline: q.description || (isDoctor ? 'High-volume clinical workflow automation.' : 'Lab report decoder & consultation preparation.'),
          whatYouGet: [
            `${uses} AI uses included every month`,
            ...(featureNames.length > 0
              ? featureNames
              : isDoctor
              ? ['Pre-Consultation Patient Briefs', 'Post-Consultation Action Plans', 'Full prescription autocomplete']
              : ['AI Lab Report Decoder', 'Doctor Visit Preparation Briefs', 'Priority guidance response speed']),
          ],
          highlight: isPopular,
        };
      });
    }

    // Resilient fallback only if network request fails
    return isDoctor
      ? [
          {
            id: 'doctor_plan_2',
            tier: 2,
            name: 'Doctor Pro',
            badge: 'Most Popular',
            monthlyUses: 100,
            priceInr: 1499,
            priceUsd: 19,
            tagline: 'High-volume clinical workflow automation for growing practices.',
            whatYouGet: [
              '100 AI uses included every month',
              'Pre-Consultation Patient Briefs before every appointment',
              'Post-Consultation Summaries & Patient Action Plans',
              'Full prescription autocomplete & drug-food safety shield',
              'Priority clinical response speed',
            ],
            highlight: true,
          },
          {
            id: 'doctor_plan_3',
            tier: 3,
            name: 'Doctor Premium',
            badge: 'Full Clinical Suite',
            monthlyUses: 300,
            priceInr: 2999,
            priceUsd: 39,
            tagline: 'Comprehensive clinical documentation & intelligence for busy clinics.',
            whatYouGet: [
              '300 AI uses included every month',
              'AI Clinical SOAP Notes Generator (Subjective, Objective, Assessment, Plan)',
              'Automated Pre-Consult Briefs & Post-Consult Summaries',
              'Full prescription autocomplete & drug safety shield',
              'Top priority processing & dedicated clinical support',
            ],
            highlight: false,
          },
        ]
      : [
          {
            id: 'patient_plan_2',
            tier: 2,
            name: 'Patient Pro',
            badge: 'Recommended',
            monthlyUses: 60,
            priceInr: 499,
            priceUsd: 7,
            tagline: 'Lab report decoder & consultation preparation for clear answers.',
            whatYouGet: [
              '60 AI health queries included every month',
              'AI Lab Report Decoder with plain-English biomarker breakdown',
              'Doctor Visit Preparation Briefs with tailored questions to ask',
              'AI Health Companion with cycle-phase calibration',
              'Priority guidance response speed',
            ],
            highlight: true,
          },
          {
            id: 'patient_plan_3',
            tier: 3,
            name: 'Patient Premium',
            badge: 'VIP Care',
            monthlyUses: 150,
            priceInr: 999,
            priceUsd: 14,
            tagline: 'Continuous VIP care, hormonal tracking & in-depth health insights.',
            whatYouGet: [
              '150 AI health queries included every month',
              'Full access to all Patient AI capabilities',
              'In-depth symptom trend & hormonal tracking insights',
              'AI Lab Report Decoder & Doctor Visit Prep Briefs',
              'VIP priority response & dedicated care support',
            ],
            highlight: false,
          },
        ];
  }, [pricingQuotes, isDoctor, isIndian]);

  // Coupon Validation
  const handleApplyCoupon = async (targetPlanId) => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await apiFetch('/ai/coupons/validate', {
        method: 'POST',
        body: {
          code: couponCode.trim(),
          planId: targetPlanId,
          currencyCode: selectedCurrency,
        },
      });
      setAppliedCoupon(res);
      toast(`Coupon applied! ${res.code}`, 'success');
    } catch (err) {
      toast(err?.message || 'Invalid or expired coupon code', 'error');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Checkout Upgrade Handler
  const handleSelectPlan = async (plan) => {
    setSubmittingPlanId(plan.id);
    try {
      const order = await apiFetch('/ai/subscription/upgrade', {
        method: 'POST',
        body: {
          planId: plan.id,
          billingCycle: 'monthly',
          currencyCode: selectedCurrency,
          countryCode: isIndian ? 'IN' : 'US',
          couponCode: appliedCoupon?.code || undefined,
        },
      });

      const paymentSessionId = order?.paymentSessionId || order?.payment_session_id;
      const orderId = order?.orderId || order?.order_id;

      if (!paymentSessionId && !orderId) {
        throw new Error('Could not initiate payment session.');
      }

      if (paymentSessionId) {
        const cashfree = await getCashfree();
        const checkoutResult = await cashfree.checkout({
          paymentSessionId,
          redirectTarget: '_modal',
        });

        if (checkoutResult?.error) {
          toast(checkoutResult.error.message || 'Payment cancelled', 'info');
          return;
        }
      }

      if (orderId) {
        const verifyRes = await apiFetch(`/ai/subscription/verify/${orderId}`);
        if (verifyRes?.status === 'paid' || verifyRes?.status === 'active' || verifyRes?.id) {
          toast(`Successfully upgraded to ${plan.name}! Your monthly AI uses have been refreshed.`, 'success');
          onUpgraded(plan);
          onClose();
        } else {
          toast('Payment was not completed. You can try again anytime.', 'info');
        }
      }
    } catch (err) {
      toast(err?.message || 'Could not complete upgrade. Please try again.', 'error');
    } finally {
      setSubmittingPlanId(null);
    }
  };

  const topUpPacks = useMemo(() => {
    return isIndian
      ? [
          { id: 'pack_100', credits: 100, price: '₹200', name: '100 AI Credits', popular: true, tagline: 'Perfect for quick consults and reports' },
          { id: 'pack_250', credits: 250, price: '₹450', name: '250 AI Credits', tagline: 'Extra bandwidth for the busy week' },
          { id: 'pack_500', credits: 500, price: '₹800', name: '500 AI Credits', tagline: 'Heavy clinical & diagnostic workload' },
          { id: 'pack_1000', credits: 1000, price: '₹1,500', name: '1,000 AI Credits', tagline: 'Best bulk value for full team use' },
        ]
      : [
          { id: 'pack_100', credits: 100, price: '$3', name: '100 AI Credits', popular: true, tagline: 'Perfect for quick consults and reports' },
          { id: 'pack_250', credits: 250, price: '$6', name: '250 AI Credits', tagline: 'Extra bandwidth for the busy week' },
          { id: 'pack_500', credits: 500, price: '$10', name: '500 AI Credits', tagline: 'Heavy clinical & diagnostic workload' },
          { id: 'pack_1000', credits: 1000, price: '$18', name: '1,000 AI Credits', tagline: 'Best bulk value for full team use' },
        ];
  }, [isIndian]);

  const handleTopUpCheckout = async (pack) => {
    setSubmittingTopUpId(pack.id);
    try {
      const order = await apiFetch('/ai/credits/topup', {
        method: 'POST',
        body: {
          packId: pack.id,
          currency: selectedCurrency,
        },
      });

      if (!order?.orderId) {
        throw new Error('Could not initiate top-up checkout session.');
      }

      if (order.paymentSessionId) {
        const cashfree = await getCashfree();
        const result = await cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          redirectTarget: '_modal',
        });

        if (result?.error) {
          toast(result.error.message || 'Payment cancelled', 'info');
          return;
        }

        await apiFetch('/ai/credits/topup/activate', {
          method: 'POST',
          body: { orderId: order.orderId },
        });
      } else {
        await apiFetch('/ai/credits/topup/activate', {
          method: 'POST',
          body: { orderId: order.orderId },
        });
      }

      toast(`Success! ${pack.credits} AI credits added to your balance.`, 'success');
      onUpgraded?.();
      onClose();
    } catch (err) {
      toast(err?.message || 'Top-up checkout failed.', 'error');
    } finally {
      setSubmittingTopUpId(null);
    }
  };

  if (!isOpen) return null;

  const currentPlanTitle = isDoctor
    ? (currentPlanId === 'doctor_plan_3' ? 'Doctor Premium' : currentPlanId === 'doctor_plan_2' ? 'Doctor Pro' : 'Doctor Starter')
    : (currentPlanId === 'patient_plan_3' ? 'Patient Premium' : currentPlanId === 'patient_plan_2' ? 'Patient Pro' : 'Patient Basic');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="">
      <div className="relative -mt-4 pb-2 space-y-5">
        {/* Header Hero */}
        <div className="text-center pt-2 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-magenta-500 text-white shadow-md shadow-purple-500/20 mb-2.5">
            <i className={`fas ${isDoctor ? 'fa-user-md' : 'fa-wand-magic-sparkles'} text-lg`}></i>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {tokensRemaining <= 0 ? 'Monthly AI Allowance Reached' : 'Add AI Credits or Upgrade Plan'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {tokensRemaining <= 0
              ? `You have used your queries for this cycle. Top up 100 credits for ${isIndian ? '₹200' : '$3'} or upgrade your monthly plan.`
              : `Top up instant credits or upgrade to higher monthly clinical tiers.`}
          </p>

          {/* Current Status Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-slate-600">
                Current Plan: <strong className="text-slate-900">{currentPlanTitle}</strong> · <strong>{tokensRemaining} uses</strong> left
                {renewalDate ? ` (Resets ${renewalDate})` : ''}
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
              {isIndian ? '🇮🇳 Indian Rupee (₹ INR)' : '🇺🇸 US Dollar ($ USD)'}
            </div>
          </div>
        </div>

        {/* Tab Switcher: Instant Top-Up vs Monthly Plan Upgrade */}
        <div className="flex items-center justify-center gap-1 p-1 bg-slate-100 rounded-2xl max-w-sm mx-auto border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveModalTab('topup')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeModalTab === 'topup'
                ? 'bg-white text-purple-950 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-bolt text-amber-500"></i>
            <span>Instant Top-Up</span>
            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
              {selectedCurrency === 'USD' ? '$3' : '₹200'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('upgrade')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeModalTab === 'upgrade'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-crown text-purple-600"></i>
            <span>Upgrade Monthly Plan</span>
          </button>
        </div>

        {/* VIEW 1: Instant Top-Up Packs Grid */}
        {activeModalTab === 'topup' && (
          <div className="space-y-3 px-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topUpPacks.map((pack) => {
                const isSubmitting = submittingTopUpId === pack.id;
                return (
                  <div
                    key={pack.id}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between relative ${
                      pack.popular
                        ? 'bg-gradient-to-b from-purple-50/70 to-white border-purple-400 ring-2 ring-purple-100 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-200'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 right-4 text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                        Most Popular
                      </span>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-slate-900 font-mono">
                          {pack.credits} Credits
                        </span>
                        <span className="text-base font-black text-purple-950 font-mono">
                          {pack.price}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {pack.tagline}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleTopUpCheckout(pack)}
                        disabled={Boolean(submittingTopUpId)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          pack.popular
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin text-xs"></i>
                            <span>Processing…</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-bolt text-amber-300 text-[11px]"></i>
                            <span>Add {pack.credits} Credits for {pack.price}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: Monthly Plan Upgrade Cards */}
        {activeModalTab === 'upgrade' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
          {availablePlans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const price = selectedCurrency === 'USD' ? `$${plan.priceUsd}` : `₹${plan.priceInr.toLocaleString('en-IN')}`;
            const isSubmitting = submittingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-5 flex flex-col justify-between transition-all relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-purple-50/60 to-white border-2 border-purple-600 shadow-md ring-2 ring-purple-100'
                    : 'bg-white border-2 border-slate-200 shadow-xs hover:border-purple-300'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 right-5 bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                        Plan {plan.tier}
                      </span>
                      <h3 className="font-black text-lg text-slate-900 leading-tight mt-0.5">{plan.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {plan.monthlyUses} uses/mo
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-500 mt-1.5 min-h-[32px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Price Strip */}
                  <div className="my-3 pb-3 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{price}</span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>
                    <p className="text-[11px] text-purple-700 font-bold mt-0.5">
                      Includes {plan.monthlyUses} AI uses every month
                    </p>
                  </div>

                  {/* Benefits: "What's included in this plan" */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                      What's included in this plan:
                    </span>
                    <ul className="space-y-2 text-[11.5px] text-slate-700">
                      {plan.whatYouGet.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <i className="fas fa-circle-check text-emerald-500 text-xs shrink-0 mt-0.5"></i>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Upgrade Action Button */}
                <div className="pt-5 mt-5 border-t border-slate-100">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || isSubmitting || Boolean(submittingPlanId)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                        : plan.highlight
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isCurrent
                      ? 'Current Active Plan'
                      : isSubmitting
                      ? 'Opening Checkout…'
                      : `Upgrade to ${plan.name} →`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Security / Guarantee Footer */}
        <div className="pt-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-400 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <i className="fas fa-shield-check text-emerald-500"></i>
            Encrypted Cashfree payment • Cancel anytime with 1 click
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AIUsageUpgradeModal;
