import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { apiFetch } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../Toast.jsx';
import { Modal } from '../Modal.jsx';
import { InvoiceModal } from './InvoiceModal.jsx';
import { AIUsageUpgradeModal } from './AIUsageUpgradeModal.jsx';
import { formatMoney, getStoredCurrency, setStoredCurrency } from '../../lib/currency.js';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

export function AiHub({ role = 'doctor' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast?.() || { toast: (m) => alert(m) };

  // Parse active tab from URL query params (e.g. ?tab=features) or default to 'overview'
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`?tab=${tabKey}`, { replace: true });
  };

  // State
  const [statusData, setStatusData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [pricingQuotes, setPricingQuotes] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [usageTimeframe, setUsageTimeframe] = useState('month');
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState(() => getStoredCurrency());

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Sync external currency changes
  useEffect(() => {
    const handleCurrencyChange = (e) => {
      const code = e?.detail || 'INR';
      setSelectedCurrency(code);
      loadPricing(code);
    };
    window.addEventListener('healnari_currency_changed', handleCurrencyChange);
    return () => window.removeEventListener('healnari_currency_changed', handleCurrencyChange);
  }, []);

  const handleCurrencyToggle = (curr) => {
    setStoredCurrency(curr);
    setSelectedCurrency(curr);
    loadPricing(curr);
  };

  // Fetch Core Status
  const loadStatus = async () => {
    try {
      const res = await apiFetch('/ai/subscription/status');
      setStatusData(res);
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    }
  };

  // Fetch Features Catalog
  const loadCatalog = async () => {
    try {
      const res = await apiFetch('/ai/features/catalog');
      setCatalog(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load AI catalog:', err);
    }
  };

  // Fetch Pricing Plans
  const loadPricing = async (curr = selectedCurrency) => {
    try {
      const res = await apiFetch(`/ai/pricing?currency=${curr}`);
      setPricingQuotes(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  };

  // Fetch Usage History
  const loadUsage = async (timeframe = usageTimeframe) => {
    try {
      const res = await apiFetch(`/ai/usage-history?timeframe=${timeframe}`);
      setUsageLogs(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load AI usage:', err);
    }
  };

  // Fetch Billing History
  const loadBilling = async () => {
    try {
      const res = await apiFetch('/ai/billing-history');
      setBillingHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load billing history:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([loadStatus(), loadCatalog(), loadPricing(), loadUsage(usageTimeframe), loadBilling()])
      .finally(() => setLoading(false));
  }, []);

  // When timeframe changes in usage tab
  useEffect(() => {
    if (activeTab === 'usage') {
      loadUsage(usageTimeframe);
    }
  }, [usageTimeframe]);

  // Derived Values & Canonical Plans (Strictly 3 Doctor / 3 Patient Plans)
  const isDoctor = role === 'doctor';
  const sub = statusData?.subscription || {};
  const currentPlanId = sub?.plan_id || (isDoctor ? 'doctor_plan_1' : 'patient_plan_1');

  const currentPlanName = useMemo(() => {
    const found = pricingQuotes.find((q) => q.planId === currentPlanId);
    if (found?.planName) return found.planName;
    if (sub?.plan_name) return sub.plan_name;
    return isDoctor ? 'Doctor Starter' : 'Patient Basic';
  }, [pricingQuotes, currentPlanId, sub?.plan_name, isDoctor]);

  const isCancelled = sub?.cancel_at_period_end || sub?.status === 'cancelled';
  const isActive = sub?.status === 'active' || sub?.status === 'trialing';
  const isPremium = isActive && (currentPlanId.includes('2') || currentPlanId.includes('3') || currentPlanId.includes('pro') || currentPlanId.includes('premium'));
  const creditsRemaining = statusData?.creditsRemaining ?? (isDoctor ? 25 : 15);
  const tokensRemaining = creditsRemaining;
  const totalCredits = statusData?.totalCredits ?? sub?.monthly_ai_credits ?? (isDoctor ? (currentPlanId === 'doctor_plan_3' ? 300 : currentPlanId === 'doctor_plan_2' ? 100 : 25) : (currentPlanId === 'patient_plan_3' ? 150 : currentPlanId === 'patient_plan_2' ? 60 : 15));
  const usedCredits = statusData?.creditsUsed ?? sub?.credits_used ?? 0;
  const percentRemaining = Math.max(0, Math.min(100, Math.round((creditsRemaining / Math.max(1, totalCredits)) * 100)));
  const isLowCredits = creditsRemaining > 0 && percentRemaining <= 20;
  const isExhausted = creditsRemaining <= 0;

  // Format renewal date
  const renewalDateFormatted = useMemo(() => {
    if (!sub.current_period_end) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      return nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [sub.current_period_end]);

  // Derive Plans dynamically from database pricingQuotes
  const canonicalPlans = useMemo(() => {
    const rolePlans = pricingQuotes.filter((q) => {
      if (q.billing_cycle === 'credit_pack' || q.billingCycle === 'credit_pack') return false;
      if (q.planId?.startsWith('pack_')) return false;
      if (!q.product_id) return true;
      return isDoctor ? q.product_id.includes('doctor') : q.product_id.includes('patient');
    });

    if (rolePlans.length > 0) {
      const sorted = [...rolePlans].sort((a, b) => {
        const pa = a.price_inr ?? a.baseAmount ?? 0;
        const pb = b.price_inr ?? b.baseAmount ?? 0;
        return pa - pb;
      });

      return sorted.map((q, idx) => {
        const uses = q.includedCredits || q.included_monthly_credits || (isDoctor ? (idx === 0 ? 25 : idx === 1 ? 100 : 300) : (idx === 0 ? 15 : idx === 1 ? 60 : 150));
        const priceInr = q.price_inr ?? (q.currency === 'INR' ? q.baseAmount : 0) ?? 0;
        const priceUsd = q.price_usd ?? (q.currency === 'USD' ? q.baseAmount : (priceInr === 0 ? 0 : 19));
        const isFree = priceInr === 0 && priceUsd === 0;
        const isPopular = idx === 1 || q.planId.includes('2') || q.planName.toLowerCase().includes('pro');

        const featureNames = Array.isArray(q.features) && q.features.length > 0
          ? q.features.map((fk) => {
              const feat = catalog.find((c) => c.id === fk);
              return feat?.name || fk.replace(/^(DOCTOR_|PATIENT_)/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
            })
          : [];

        const whatYouGet = [
          `${uses} AI uses included every month`,
          ...(featureNames.length > 0
            ? featureNames
            : isDoctor
            ? ['Smart prescription auto-complete', 'Drug-food interaction safety checks', 'Clinical documentation support']
            : ['AI Health Companion', 'Cycle & wellness guidance', 'Emergency red-flag support']),
        ];

        return {
          id: q.planId,
          tier: idx + 1,
          name: q.planName,
          badge: isFree ? 'Free Tier' : isPopular ? (isDoctor ? 'Most Popular' : 'Recommended') : 'Premium Tier',
          priceInr,
          priceUsd,
          monthlyUses: uses,
          tagline: q.description || (isDoctor ? 'Clinical AI automation for your practice.' : 'Personalized health and wellness companion.'),
          whatYouGet,
          features: q.features || [],
          highlight: isPopular,
        };
      });
    }

    // Resilient fallback only if network request fails
    return isDoctor
      ? [
          {
            id: 'doctor_plan_1',
            tier: 1,
            name: 'Doctor Starter',
            badge: 'Free Tier',
            priceInr: 0,
            priceUsd: 0,
            monthlyUses: 25,
            tagline: 'Essential clinical tools for individual practitioners.',
            whatYouGet: ['25 AI uses included every month', 'Prescription auto-complete', 'Drug safety checks'],
            highlight: false,
          },
          {
            id: 'doctor_plan_2',
            tier: 2,
            name: 'Doctor Pro',
            badge: 'Most Popular',
            priceInr: 1499,
            priceUsd: 19,
            monthlyUses: 100,
            tagline: 'High-volume clinical workflow automation.',
            whatYouGet: ['100 AI uses included every month', 'Pre-Consult Patient Briefs', 'Post-Consult Summaries'],
            highlight: true,
          },
          {
            id: 'doctor_plan_3',
            tier: 3,
            name: 'Doctor Premium',
            badge: 'Full Suite',
            priceInr: 2999,
            priceUsd: 39,
            monthlyUses: 300,
            tagline: 'Complete clinical intelligence for busy clinics.',
            whatYouGet: ['300 AI uses included every month', 'AI Clinical SOAP Notes Generator', 'VIP clinical support'],
            highlight: false,
          },
        ]
      : [
          {
            id: 'patient_plan_1',
            tier: 1,
            name: 'Patient Basic',
            badge: 'Free Companion',
            priceInr: 0,
            priceUsd: 0,
            monthlyUses: 15,
            tagline: 'Free menstrual cycle guide and women wellness companion.',
            whatYouGet: ['15 AI health queries included every month', 'AI Health Companion', 'Lifestyle & wellness tips'],
            highlight: false,
          },
          {
            id: 'patient_plan_2',
            tier: 2,
            name: 'Patient Pro',
            badge: 'Recommended',
            priceInr: 499,
            priceUsd: 7,
            monthlyUses: 60,
            tagline: 'Lab report decoding & consultation preparation.',
            whatYouGet: ['60 AI uses included every month', 'AI Lab Report Decoder', 'Doctor Visit Prep Briefs'],
            highlight: true,
          },
          {
            id: 'patient_plan_3',
            tier: 3,
            name: 'Patient Premium',
            badge: 'VIP Care',
            priceInr: 999,
            priceUsd: 14,
            monthlyUses: 150,
            tagline: 'Continuous VIP care with in-depth symptom analysis.',
            whatYouGet: ['150 AI uses included every month', 'Full access to all Patient AI capabilities', 'Hormonal tracking insights'],
            highlight: false,
          },
        ];
  }, [pricingQuotes, catalog, isDoctor]);

  // 5-10 Second Comparison Table Rows derived dynamically from catalog and plans
  const comparisonRows = useMemo(() => {
    const p1 = canonicalPlans[0];
    const p2 = canonicalPlans[1];
    const p3 = canonicalPlans[2];

    const rows = [
      {
        feature: 'Monthly AI Uses Included',
        plan1: `${p1?.monthlyUses || 0} uses`,
        plan2: `${p2?.monthlyUses || 0} uses`,
        plan3: `${p3?.monthlyUses || 0} uses`,
      },
    ];

    if (catalog.length > 0) {
      catalog.forEach((f) => {
        const inP1 = Array.isArray(p1?.features) && p1.features.includes(f.id);
        const inP2 = Array.isArray(p2?.features) && p2.features.includes(f.id);
        const inP3 = Array.isArray(p3?.features) && p3.features.includes(f.id);

        rows.push({
          feature: f.name,
          plan1: inP1 ? '✓ Included' : '—',
          plan2: inP2 ? '✓ Included' : '—',
          plan3: inP3 ? '✓ Included' : '—',
        });
      });
    }

    return rows;
  }, [canonicalPlans, catalog]);

  // Subscription Actions
  const handleUpgrade = async (planId) => {
    setSubmittingAction(true);
    try {
      const order = await apiFetch('/ai/subscription/upgrade', {
        method: 'POST',
        body: {
          planId,
          billingCycle,
        },
      });

      if (!order.paymentSessionId || order.finalAmount <= 0) {
        await apiFetch(`/ai/subscription/verify/${order.orderId}`);
        toast('Successfully activated plan! Your AI tokens have been updated.', 'success');
        await Promise.all([loadStatus(), loadBilling(), loadUsage()]);
        setActiveTab('overview');
        return;
      }

      const cashfree = await getCashfree();
      if (!cashfree) throw new Error('Could not load payment gateway. Please check connection and try again.');

      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal',
        appearance: {
          theme: 'light',
          color: '#6B46C1',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      });

      const verified = await apiFetch(`/ai/subscription/verify/${order.orderId}`);
      if (verified && verified.status === 'active') {
        toast('Successfully activated plan! Your AI tokens have been updated.', 'success');
        await Promise.all([loadStatus(), loadBilling(), loadUsage()]);
        setActiveTab('overview');
      } else {
        toast('Payment was not completed. You can try again anytime.', 'info');
      }
    } catch (err) {
      toast(err?.message || 'Upgrade failed', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    setSubmittingAction(true);
    try {
      await apiFetch('/ai/subscription/cancel', { method: 'POST' });
      toast('Plan marked to expire on ' + renewalDateFormatted, 'info');
      setShowCancelModal(false);
      await loadStatus();
    } catch (err) {
      toast(err?.message || 'Failed to update subscription', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResumeSubscription = async () => {
    setSubmittingAction(true);
    try {
      await apiFetch('/ai/subscription/resume', { method: 'POST' });
      toast('Plan active! Access valid until ' + renewalDateFormatted, 'success');
      await loadStatus();
    } catch (err) {
      toast(err?.message || 'Failed to update subscription', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBuyTokenPack = async (packId) => {
    setSubmittingAction(true);
    try {
      const order = await apiFetch('/ai/credits/order', {
        method: 'POST',
        body: { packId },
      });

      if (!order.paymentSessionId) {
        toast('Could not initiate checkout session. Please try again.', 'error');
        return;
      }

      const cashfree = await getCashfree();
      if (!cashfree) throw new Error('Could not load payment gateway.');

      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal',
        appearance: {
          theme: 'light',
          color: '#6B46C1',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      });

      await apiFetch(`/ai/subscription/verify/${order.orderId}`);
      toast(`Added ${order.tokens} tokens to your balance!`, 'success');
      setShowTopupModal(false);
      await Promise.all([loadStatus(), loadBilling()]);
    } catch (err) {
      toast(err?.message || 'Failed to purchase tokens', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Subscription currency lock check
  const activeSubCurrency = sub?.currency || (isPremium ? 'INR' : null);
  const isCurrencyMismatched = isPremium && activeSubCurrency && activeSubCurrency !== selectedCurrency;

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 text-xl font-black shrink-0 shadow-xs">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {isDoctor ? 'Clinical AI Hub' : 'AI Health Companion'}
              </h1>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isPremium
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {isPremium ? (isDoctor ? 'Doctor AI Pro' : 'AI Premium') : 'Free Plan'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDoctor
                ? 'Empowering consultations, clinical notes, and prescription intelligence.'
                : 'Personalized biomarker insights, visit preparation, and cycle support.'}
            </p>
          </div>
        </div>

        {/* Quick actions in header */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Two-Currency Selector Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold shrink-0">
            <button
              onClick={() => handleCurrencyToggle('INR')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                selectedCurrency === 'INR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🇮🇳</span>
              <span>₹ INR</span>
            </button>
            <button
              onClick={() => handleCurrencyToggle('USD')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                selectedCurrency === 'USD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🇺🇸</span>
              <span>$ USD</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Uses Left</span>
            <span className="text-sm font-black text-slate-800 font-mono">
              {tokensRemaining.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">uses</span>
            </span>
          </div>
          <button
            onClick={() => handleTabChange('plan')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-1.5 shrink-0"
          >
            <i className="fas fa-credit-card text-[11px]"></i> Manage Plan
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 rounded-2xl max-w-max border border-slate-200 overflow-x-auto text-xs font-bold">
        {[
          { key: 'overview', label: 'AI Overview', icon: 'fa-gauge' },
          { key: 'features', label: 'AI Features', icon: 'fa-wand-magic-sparkles' },
          { key: 'plan',     label: 'My AI Plan',  icon: 'fa-crown' },
          { key: 'usage',    label: 'AI Usage',    icon: 'fa-chart-simple' },
          { key: 'billing',  label: 'Billing History', icon: 'fa-receipt' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className={`fas ${tab.icon} text-[11px] ${activeTab === tab.key ? 'text-purple-600' : 'text-slate-400'}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: AI OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Low Usage Warning */}
          {isLowCredits && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <i className="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold">You're running low on monthly AI uses</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Only <strong>{creditsRemaining} uses</strong> remaining this month. Upgrade to continue using AI features.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Exhausted Usage State */}
          {isExhausted && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <i className="fas fa-ban"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold">You have reached your monthly AI limit</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Your allowance resets on <strong>{renewalDateFormatted}</strong>. Upgrade your plan to unlock more monthly uses right away.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Main Usage Meter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Allowance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {creditsRemaining.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">AI uses remaining</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Used {usedCredits.toLocaleString()} of {totalCredits.toLocaleString()} included uses
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-bolt text-[11px] text-amber-500"></i> Top-Up Credits
                </button>
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <i className="fas fa-crown text-[11px]"></i> View All Plans
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-6 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Monthly AI Usage</span>
                <span className="font-mono">{percentRemaining}% remaining</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentRemaining <= 10
                      ? 'bg-rose-500'
                      : percentRemaining <= 25
                      ? 'bg-amber-500'
                      : 'bg-purple-600'
                  }`}
                  style={{ width: `${Math.max(3, percentRemaining)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Valid until: <strong>{renewalDateFormatted}</strong></span>
                <span>Plan: <strong>{isPremium ? (isDoctor ? 'Doctor AI Pro' : 'AI Premium') : 'Free Plan'}</strong></span>
              </div>
            </div>
          </div>

          {/* Featured Tools Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Your AI Capabilities</h3>
              <button
                onClick={() => handleTabChange('features')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
              >
                View all features →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.slice(0, 6).map((feat) => (
                <div
                  key={feat.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
                        <i className={`fas ${feat.icon || 'fa-wand-magic-sparkles'}`}></i>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                        {feat.credit_cost || feat.tokenCost || 1} use
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {feat.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {feat.tagline || feat.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{feat.category}</span>
                    <button
                      onClick={() => {
                        if (feat.route === '#chat') {
                          document.querySelector('.hn-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        } else if (feat.route) {
                          navigate(feat.route);
                        }
                      }}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                    >
                      {feat.actionLabel || 'Try AI →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Usage Activity Strip */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Recent AI Activity</h3>
              <button
                onClick={() => handleTabChange('usage')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
              >
                View full history →
              </button>
            </div>

            {usageLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">No AI activity recorded yet this month.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {usageLogs.slice(0, 3).map((log, idx) => (
                  <div key={log.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <i className="fas fa-bolt text-[10px]"></i>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          {log.feature ? log.feature.replace(/_/g, ' ') : 'AI Inquiry'}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(log.created_at || Date.now()).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-600">
                        -{log.credits_deducted || 1} tokens
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI FEATURES MARKETPLACE */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800">AI Features & Capabilities</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tools designed to speed up clinical workflows, summarize records, and guide patients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalog.map((feat) => (
              <div
                key={feat.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shrink-0">
                        <i className={`fas ${feat.icon || 'fa-wand-magic-sparkles'}`}></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{feat.name}</h3>
                        <span className="text-[11px] text-purple-600 font-medium">{feat.tagline}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0 font-mono">
                      {feat.tokenCost} token{feat.tokenCost > 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                      {feat.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      feat.isIncluded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {feat.badge}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (feat.route === '#chat') {
                        document.querySelector('.hn-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                      } else if (feat.route) {
                        navigate(feat.route);
                      }
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs"
                  >
                    {feat.actionLabel || 'Try AI →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MY AI PLAN & PRICING */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Subscription Currency Lock Notice */}
          {isCurrencyMismatched && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <i className="fas fa-circle-info text-blue-600 mt-0.5 text-sm shrink-0"></i>
              <div className="text-xs leading-relaxed">
                <span className="font-bold">Subscription Billed in {activeSubCurrency}: </span>
                Your active subscription is locked and billed in {activeSubCurrency} ({activeSubCurrency === 'INR' ? '₹' : '$'}). Changing your display currency to {selectedCurrency} affects display only and does not alter your active subscription billing.
              </div>
            </div>
          )}

          {/* Current Active Plan Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current AI Plan</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {currentPlanName}
                  </h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isPremium
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isPremium ? 'Active (Prepaid 30 Days)' : 'Free Tier'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {totalTokens} monthly AI uses included · Valid until {renewalDateFormatted}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isPremium ? (
                  <button
                    onClick={() => handleUpgrade(currentPlanId)}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <i className="fas fa-rotate text-[11px]"></i> Renew Plan
                  </button>
                ) : null}
              </div>
            </div>

            {/* Current balance & renewal info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Plan Validity
                </span>
                <p className="text-base font-bold text-slate-800">{renewalDateFormatted}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {isPremium ? 'Valid for 30 days from payment' : 'Standard free starter tier'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Monthly Cost</span>
                <p className="text-base font-bold text-slate-800">
                  {selectedCurrency === 'USD'
                    ? (currentPlanId.includes('3') ? (isDoctor ? '$39' : '$14') : currentPlanId.includes('2') ? (isDoctor ? '$19' : '$7') : '$0')
                    : (currentPlanId.includes('3') ? (isDoctor ? '₹2,999' : '₹999') : currentPlanId.includes('2') ? (isDoctor ? '₹1,499' : '₹499') : '₹0')}
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Billed in {selectedCurrency} monthly
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">AI Uses Remaining</span>
                <p className="text-base font-bold text-slate-800 font-mono">{tokensRemaining.toLocaleString()} uses</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {percentRemaining}% of monthly quota available
                </p>
              </div>
            </div>
          </div>

          {/* 3-Plan Cards Deck: "Is plan mein mujhe kya milega?" */}
          <div id="plans-grid" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {isDoctor ? 'Doctor AI Plans' : 'Patient AI Plans'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the plan that fits your clinical workflow. Simple monthly pricing with zero surprise charges.
                </p>
              </div>

              {/* Currency Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold">
                <button
                  onClick={() => handleCurrencyToggle('INR')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    selectedCurrency === 'INR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🇮🇳 ₹ INR
                </button>
                <button
                  onClick={() => handleCurrencyToggle('USD')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    selectedCurrency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🇺🇸 $ USD
                </button>
              </div>
            </div>

            {/* Exactly 3 Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {canonicalPlans.map((plan) => {
                const isCurrent = currentPlanId === plan.id || (plan.tier === 1 && !isPremium);
                const price = selectedCurrency === 'USD' ? `$${plan.priceUsd}` : `₹${plan.priceInr.toLocaleString('en-IN')}`;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                      plan.highlight
                        ? 'bg-gradient-to-b from-purple-50/70 to-white border-2 border-purple-600 shadow-md ring-4 ring-purple-100'
                        : isCurrent
                        ? 'bg-white border-2 border-emerald-500 shadow-sm'
                        : 'bg-white border border-slate-200 shadow-xs hover:border-purple-300'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 right-6 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">
                            Plan {plan.tier}
                          </span>
                          <h4 className="font-black text-xl text-slate-900 mt-0.5">{plan.name}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isCurrent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isCurrent ? 'Current Plan' : `${plan.monthlyUses} uses/mo`}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-2 min-h-[32px]">{plan.tagline}</p>

                      {/* Price Tag */}
                      <div className="my-5 pb-4 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">{price}</span>
                          <span className="text-xs text-slate-400 font-medium">/ month</span>
                        </div>
                        <p className="text-xs text-purple-700 font-bold mt-1">
                          {plan.monthlyUses} AI uses included every month
                        </p>
                      </div>

                      {/* "Is plan mein mujhe kya milega?" Benefits Box */}
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
                          Is plan mein aapko milega:
                        </span>
                        <ul className="space-y-2.5 text-xs text-slate-700">
                          {plan.whatYouGet.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <i className="fas fa-circle-check text-emerald-500 text-xs shrink-0 mt-0.5"></i>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrent || submittingAction}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                            : plan.highlight
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isCurrent
                          ? 'Current Active Plan'
                          : submittingAction
                          ? 'Processing...'
                          : `Choose ${plan.name} →`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5-10 Second Plan Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h4 className="text-base font-black text-slate-900">5-Second Plan Comparison</h4>
                <p className="text-xs text-slate-500 mt-0.5">Quickly compare what is included in each plan at a glance.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Feature / Clinical Tool</th>
                      <th className="py-3 px-4 text-center">{canonicalPlans[0]?.name || 'Starter'}</th>
                      <th className="py-3 px-4 text-center bg-purple-50/50 text-purple-900">{canonicalPlans[1]?.name || 'Pro'}</th>
                      <th className="py-3 px-4 text-center">{canonicalPlans[2]?.name || 'Premium'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {comparisonRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{row.feature}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-600">{row.plan1}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-purple-900 bg-purple-50/30">{row.plan2}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">{row.plan3}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AI USAGE HISTORY */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">AI Usage History</h2>
              <p className="text-xs text-slate-500 mt-0.5">Auditable trace of all AI inquiries and token deductions.</p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {['today', 'week', 'month', 'all'].map((t) => (
                <button
                  key={t}
                  onClick={() => setUsageTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    usageTimeframe === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : t}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            {usageLogs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <i className="fas fa-clock-rotate-left text-3xl text-slate-300 mb-3"></i>
                <h4 className="text-sm font-bold text-slate-700">No usage recorded</h4>
                <p className="text-xs text-slate-400 mt-1">No AI queries match the selected timeframe.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-5">Date & Time</th>
                      <th className="py-3 px-5">AI Capability</th>
                      <th className="py-3 px-5">Assistant</th>
                      <th className="py-3 px-5 text-center">AI Uses</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {usageLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-slate-500">
                          {new Date(log.created_at || Date.now()).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {log.feature ? log.feature.replace(/_/g, ' ') : 'AI Action'}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-500 text-[11px]">
                          {isDoctor ? 'Clinical AI' : 'Health Companion'}
                        </td>
                        <td className="py-3.5 px-5 text-center font-bold text-slate-800 font-mono">
                          -{log.credits_deducted || 1}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.response_status === 'success' || !log.response_status
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {log.response_status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BILLING HISTORY */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800">Billing & Payment History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review past payments, subscription renewals, token pack purchases, and download receipts.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            {billingHistory.length === 0 ? (
              <div className="text-center py-16 px-4">
                <i className="fas fa-receipt text-3xl text-slate-300 mb-3"></i>
                <h4 className="text-sm font-bold text-slate-700">No payment records yet</h4>
                <p className="text-xs text-slate-400 mt-1">Paid invoices will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Description</th>
                      <th className="py-3 px-5">Transaction Ref</th>
                      <th className="py-3 px-5">Amount</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {billingHistory.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at || Date.now()).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {item.plan_id ? item.plan_id.replace(/_/g, ' ').toUpperCase() : 'AI Plan Subscription'}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">
                          {item.gateway_txn_id || item.id || '—'}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {formatMoney(item.final_amount || item.base_amount || 0, item.original_currency || 'INR')}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {(item.status || 'Paid').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => setSelectedInvoice(item)}
                            className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors inline-flex items-center gap-1"
                          >
                            <i className="fas fa-file-invoice text-[10px]"></i> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          transaction={selectedInvoice}
          user={user}
        />
      )}



      {/* Unified AI Usage & Plan Upgrade Modal */}
      <AIUsageUpgradeModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        role={role}
        currentPlanId={currentPlanId}
        tokensRemaining={tokensRemaining}
        renewalDate={renewalDateFormatted}
        onUpgraded={() => {
          loadStatus();
          loadUsage();
        }}
      />
    </div>
  );
}

export default AiHub;
