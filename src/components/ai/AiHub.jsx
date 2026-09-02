import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { apiFetch } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../Toast.jsx';
import { Modal } from '../Modal.jsx';
import { InvoiceModal } from './InvoiceModal.jsx';
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

  // Derived Values
  const isDoctor = role === 'doctor';
  const sub = statusData?.subscription || {};
  const isPremium = statusData?.isPremium || false;
  const isCancelled = sub?.cancel_at_period_end || sub?.status === 'cancelled';
  const tokensRemaining = statusData?.creditsRemaining ?? (isDoctor ? 10 : 5);
  const totalTokens = sub?.monthly_ai_credits || (isPremium ? (isDoctor ? 1000 : 500) : (isDoctor ? 20 : 10));
  const usedTokens = sub?.credits_used || 0;
  const percentRemaining = Math.max(0, Math.min(100, Math.round((tokensRemaining / Math.max(1, totalTokens)) * 100)));
  const isLowTokens = tokensRemaining > 0 && percentRemaining <= 20;
  const isExhausted = tokensRemaining <= 0;

  // Format renewal date
  const renewalDateFormatted = useMemo(() => {
    if (!sub.current_period_end) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      return nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [sub.current_period_end]);

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
      toast('Auto-renewal cancelled. You keep access until ' + renewalDateFormatted, 'info');
      setShowCancelModal(false);
      await loadStatus();
    } catch (err) {
      toast(err?.message || 'Failed to cancel subscription', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResumeSubscription = async () => {
    setSubmittingAction(true);
    try {
      await apiFetch('/ai/subscription/resume', { method: 'POST' });
      toast('Subscription resumed successfully! Auto-renewal is active.', 'success');
      await loadStatus();
    } catch (err) {
      toast(err?.message || 'Failed to resume subscription', 'error');
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
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Balance</span>
            <span className="text-sm font-black text-slate-800 font-mono">
              {tokensRemaining.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">tokens</span>
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
          {/* Low Tokens Warning */}
          {isLowTokens && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <i className="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold">You're running low on AI tokens</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Only <strong>{tokensRemaining} tokens</strong> left. Upgrade or top up now to keep using AI features uninterrupted.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold rounded-xl transition-colors"
                >
                  Buy More Tokens
                </button>
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Exhausted Tokens State */}
          {isExhausted && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <i className="fas fa-ban"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold">You've used all your AI tokens</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Your allowance renews on <strong>{renewalDateFormatted}</strong>. You can top up tokens right now to resume using AI tools immediately.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-900 text-xs font-bold rounded-xl transition-colors"
                >
                  Buy More Tokens
                </button>
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Main Token Usage Meter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current AI Balance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {tokensRemaining.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">tokens remaining</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Used {usedTokens.toLocaleString()} of {totalTokens.toLocaleString()} monthly allowance
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-purple-600 text-[10px]"></i> Buy More Tokens
                </button>
                <button
                  onClick={() => handleTabChange('plan')}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <i className="fas fa-arrow-up-right-from-square text-[10px]"></i> Manage Plan
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-6 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Monthly Token Consumption</span>
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
                <span>Allowance resets on <strong>{renewalDateFormatted}</strong></span>
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
                        {feat.tokenCost} token{feat.tokenCost > 1 ? 's' : ''}
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

          {/* Current Subscription Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current AI Plan</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {isPremium ? (isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium') : 'Standard Free Plan'}
                  </h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isCancelled
                      ? 'bg-amber-100 text-amber-800'
                      : isPremium
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isCancelled ? 'Cancels at Period End' : isPremium ? 'Active Subscription' : 'Free Tier'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isPremium
                    ? `${sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} recurring billing · ${totalTokens.toLocaleString()} tokens per month`
                    : 'Introductory free allowance · 10 tokens per month'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isCancelled ? (
                  <button
                    onClick={handleResumeSubscription}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                  >
                    Resume Subscription
                  </button>
                ) : isPremium ? (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    Cancel Renewal
                  </button>
                ) : (
                  <button
                    onClick={() => document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs"
                  >
                    Upgrade to Pro
                  </button>
                )}
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Buy Tokens Top-Up
                </button>
              </div>
            </div>

            {/* Next billing date details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  {isCancelled ? 'Active Until' : 'Next Renewal Date'}
                </span>
                <p className="text-base font-bold text-slate-800">{renewalDateFormatted}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {isCancelled ? 'Access remains fully unlocked until this date' : 'Allowance will reset to full quota'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Next Charge</span>
                <p className="text-base font-bold text-slate-800">
                  {isCancelled
                    ? formatMoney(0, activeSubCurrency || selectedCurrency)
                    : isPremium
                    ? (activeSubCurrency === 'USD'
                      ? (isDoctor ? (sub.billing_cycle === 'yearly' ? '$290' : '$29') : (sub.billing_cycle === 'yearly' ? '$190' : '$19'))
                      : (isDoctor ? (sub.billing_cycle === 'yearly' ? '₹19,999' : '₹1,999') : (sub.billing_cycle === 'yearly' ? '₹9,999' : '₹999')))
                    : formatMoney(0, selectedCurrency)}
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {isCancelled
                    ? 'No further charges will occur'
                    : `Billed in ${activeSubCurrency || selectedCurrency} on renewal`}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Current Balance</span>
                <p className="text-base font-bold text-slate-800 font-mono">{tokensRemaining.toLocaleString()} tokens</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {percentRemaining}% of monthly allowance available
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Plans Grid */}
          <div id="plans-grid" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Available AI Plans</h3>
                <p className="text-xs text-slate-500 mt-0.5">Simple, transparent pricing tailored to your clinical volume.</p>
              </div>

              {/* Monthly / Yearly Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Yearly
                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">Save 20%</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-slate-800">{isDoctor ? 'Doctor Standard' : 'Free Companion'}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Essential baseline tools</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Free</span>
                  </div>

                  <div className="my-6">
                    <span className="text-3xl font-black text-slate-900">₹0</span>
                    <span className="text-xs text-slate-400 ml-1">/ month</span>
                    <p className="text-xs text-slate-500 mt-1">10 AI tokens included every month</p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-500 text-[10px]"></i> Standard LLM processing</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-500 text-[10px]"></i> Basic prescription auto-complete</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-500 text-[10px]"></i> Drug interaction cross-checking</li>
                    <li className="flex items-center gap-2 text-slate-400"><i className="fas fa-times text-slate-300 text-[10px]"></i> SOAP Notes generator (Pro only)</li>
                    <li className="flex items-center gap-2 text-slate-400"><i className="fas fa-times text-slate-300 text-[10px]"></i> Patient brief summaries (Pro only)</li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    disabled={!isPremium}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    {!isPremium ? 'Current Plan' : 'Downgrade to Free'}
                  </button>
                </div>
              </div>

              {/* Pro Plan Card */}
              <div className="bg-gradient-to-b from-purple-50/50 to-white border-2 border-purple-600 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm relative">
                <span className="absolute -top-3 right-6 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </span>

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">{isDoctor ? 'Doctor AI Pro' : 'HealNari AI Premium'}</h4>
                      <p className="text-xs text-purple-700 font-medium mt-0.5">High volume clinical intelligence</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                      {isDoctor ? '1,000 Tokens/mo' : '500 Tokens/mo'}
                    </span>
                  </div>

                  <div className="my-6">
                    <span className="text-3xl font-black text-slate-900">
                      {isDoctor
                        ? (selectedCurrency === 'USD'
                          ? (billingCycle === 'yearly' ? '$24' : '$29')
                          : (billingCycle === 'yearly' ? '₹1,599' : '₹1,999'))
                        : (selectedCurrency === 'USD'
                          ? (billingCycle === 'yearly' ? '$15' : '$19')
                          : (billingCycle === 'yearly' ? '₹799' : '₹999'))}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ month</span>
                    {billingCycle === 'yearly' && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {isDoctor
                          ? (selectedCurrency === 'USD' ? 'Billed annually at $290/yr' : 'Billed annually at ₹19,999/yr')
                          : (selectedCurrency === 'USD' ? 'Billed annually at $190/yr' : 'Billed annually at ₹9,999/yr')}
                      </p>
                    )}
                    <p className="text-xs text-purple-700 mt-1 font-medium">
                      {isDoctor ? '1,000 AI tokens/month + priority LLM' : '500 AI tokens/month + lab decoder'}
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-[10px]"></i> AI Clinical SOAP Notes Generator</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-[10px]"></i> Patient Pre-Consultation Briefs</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-[10px]"></i> Post-consult summary & action plans</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-[10px]"></i> Priority low-latency inference</li>
                    <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-[10px]"></i> 24/7 dedicated support</li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-purple-100">
                  <button
                    onClick={() => handleUpgrade(isDoctor ? 'doctor_pro' : 'patient_premium')}
                    disabled={isPremium && !isCancelled || submittingAction}
                    className="w-full py-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    {submittingAction
                      ? 'Processing…'
                      : isPremium && !isCancelled
                      ? 'Current Active Plan'
                      : 'Upgrade to Pro →'}
                  </button>
                </div>
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
                      <th className="py-3 px-5">AI Feature</th>
                      <th className="py-3 px-5">Model</th>
                      <th className="py-3 px-5 text-center">Tokens Used</th>
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
                        <td className="py-3.5 px-5 font-mono text-slate-400 text-[11px]">
                          {log.model || 'gemini-1.5-flash'}
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

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Auto-Renewal?"
        size="sm"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Are you sure you want to cancel auto-renewal for your <strong>{isDoctor ? 'Doctor AI Pro' : 'AI Premium'}</strong> plan?
          </p>
          <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-xl">
            <p className="font-bold">✓ Full access retained until {renewalDateFormatted}</p>
            <p className="text-[11px] mt-0.5">Your features and tokens will remain completely active until the end of your billing cycle.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancelSubscription}
              disabled={submittingAction}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
            >
              {submittingAction ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Token Top-up Modal */}
      <Modal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        title="Buy More AI Tokens"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Top-up your token balance instantly without changing your subscription plan. Tokens never expire.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'pack_100',
                tokens: 100,
                price: formatMoney(selectedCurrency === 'USD' ? 5 : 199, selectedCurrency),
                badge: 'Starter',
              },
              {
                id: 'pack_500',
                tokens: 500,
                price: formatMoney(selectedCurrency === 'USD' ? 15 : 699, selectedCurrency),
                badge: 'Popular',
              },
              {
                id: 'pack_1000',
                tokens: 1000,
                price: formatMoney(selectedCurrency === 'USD' ? 25 : 1199, selectedCurrency),
                badge: 'Best Value',
              },
            ].map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mb-2">
                    {p.badge}
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono">{p.tokens.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">Tokens</div>
                  <div className="text-sm font-bold text-slate-800 mt-2">{p.price}</div>
                </div>

                <button
                  onClick={() => handleBuyTokenPack(p.id)}
                  disabled={submittingAction}
                  className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {submittingAction ? 'Adding…' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={() => setShowTopupModal(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AiHub;
