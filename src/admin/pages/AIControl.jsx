import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';
import { AIButton } from '../../components/AiButton.jsx';
import { Modal } from '../../components/Modal.jsx';
import { formatCurrency, getCurrencySymbol, ISO_CURRENCIES, SUPPORTED_REPORTING_CURRENCIES } from '../../lib/currency.js';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function AIControl() {
  const { toast } = useToast?.() || { toast: (msg) => alert(msg) };
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'plans' | 'pricing' | 'simulator' | 'countries' | 'features' | 'models' | 'coupons'

  // Global State
  const [reportingCurrency, setReportingCurrency] = useState('USD');
  const [profitability, setProfitability] = useState(null);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [flags, setFlags] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal States
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingCountry, setEditingCountry] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [newCouponModal, setNewCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    allowed_country: '',
    allowed_currency: '',
    max_uses: 500,
  });

  // Simulator State
  const [simInput, setSimInput] = useState({
    countryCode: 'IN',
    currency: 'INR',
    basePrice: 299,
    monthlyCredits: 200,
    expectedAvgQueriesPerUser: 45,
    model: 'gemini-1.5-flash',
    taxRatePercent: 18,
    gatewayFeePercent: 2.0,
    expectedUsers: 500,
  });
  const [simResult, setSimResult] = useState(null);

  const loadDashboardData = async (curr = reportingCurrency) => {
    setLoading(true);
    try {
      const [pData, cData, currData, plData, fData, prData, cpData, alData] = await Promise.all([
        apiFetch(`/admin/ai/profitability?currency=${curr}`).catch(() => null),
        apiFetch('/admin/ai/countries').catch(() => []),
        apiFetch('/admin/ai/currencies').catch(() => []),
        apiFetch(`/admin/ai/plans?country=IN&currency=INR`).catch(() => []),
        apiFetch('/admin/ai/features').catch(() => []),
        apiFetch('/admin/ai/prompts').catch(() => []),
        apiFetch('/admin/ai/coupons').catch(() => []),
        apiFetch('/admin/ai/audit-logs').catch(() => []),
      ]);
      setProfitability(pData);
      setCountries(cData || []);
      setCurrencies(currData || []);
      setPlans(plData || []);
      setFlags(fData || []);
      setPrompts(prData || []);
      setCoupons(cpData || []);
      setAuditLogs(alData || []);
    } catch {
      toast('Failed to load global AI monetization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(reportingCurrency);
  }, [reportingCurrency]);

  // Run Simulator whenever input changes
  useEffect(() => {
    const runSim = async () => {
      try {
        const res = await apiFetch('/admin/ai/simulate-pricing', {
          method: 'POST',
          body: simInput,
        });
        setSimResult(res);
      } catch {}
    };
    runSim();
  }, [simInput]);

  const handleSavePrice = async () => {
    if (!editingPrice) return;
    try {
      await apiFetch('/admin/ai/prices', {
        method: 'POST',
        body: editingPrice,
      });
      toast(`Published new price version for ${editingPrice.plan_id} in ${editingPrice.country_code} (${editingPrice.currency})`);
      setEditingPrice(null);
      loadDashboardData();
    } catch {
      toast('Failed to save regional price', 'error');
    }
  };

  const handleSaveCountry = async () => {
    if (!editingCountry) return;
    try {
      await apiFetch(`/admin/ai/countries/${editingCountry.code}`, {
        method: 'PUT',
        body: editingCountry,
      });
      toast(`Updated country settings for ${editingCountry.name} (${editingCountry.code})`);
      setEditingCountry(null);
      loadDashboardData();
    } catch {
      toast('Failed to update country settings', 'error');
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code) {
      toast('Please enter coupon code', 'error');
      return;
    }
    try {
      await apiFetch('/admin/ai/coupons', {
        method: 'POST',
        body: newCoupon,
      });
      toast(`Coupon ${newCoupon.code.toUpperCase()} created successfully`);
      setNewCouponModal(false);
      loadDashboardData();
    } catch {
      toast('Failed to create coupon', 'error');
    }
  };

  const handleToggleFeature = async (featureKey, currentStatus) => {
    try {
      await apiFetch(`/admin/ai/features/${featureKey}`, {
        method: 'PUT',
        body: { is_enabled: !currentStatus },
      });
      setFlags((prev) =>
        prev.map((f) => (f.feature_key === featureKey ? { ...f, is_enabled: !currentStatus } : f)),
      );
      toast(`Updated ${featureKey} status to ${!currentStatus ? 'Active' : 'Disabled'}`);
    } catch {
      toast('Failed to update feature flag', 'error');
    }
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;
    try {
      await apiFetch('/admin/ai/prompts', {
        method: 'POST',
        body: editingPrompt,
      });
      toast(`Prompt for ${editingPrompt.feature} updated & versioned.`);
      setEditingPrompt(null);
      loadDashboardData();
    } catch {
      toast('Failed to save prompt', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span>Global AI Monetization &amp; Multi-Currency Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AI Product &amp; Treasury Command</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Manage global plans, explicit market pricing, multi-currency checkout, token economics, and unit profitability.
          </p>
        </div>

        {/* Global Reporting Currency Selector */}
        <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15">
          <span className="text-xs text-slate-300 font-bold">Reporting:</span>
          <select
            value={reportingCurrency}
            onChange={(e) => setReportingCurrency(e.target.value)}
            className="bg-purple-900/80 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 border border-purple-400/40 focus:outline-none"
          >
            {SUPPORTED_REPORTING_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadDashboardData(reportingCurrency)}
            className="w-7 h-7 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white flex items-center justify-center transition-colors text-xs"
            title="Refresh Data"
          >
            <i className={`fas fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 hide-scrollbar">
        {[
          { id: 'overview', label: 'Profitability & KPIs', icon: 'fa-chart-pie' },
          { id: 'plans', label: 'Products & Plans', icon: 'fa-layer-group' },
          { id: 'pricing', label: 'Regional Pricing & Taxes', icon: 'fa-tags' },
          { id: 'simulator', label: 'Pricing Simulator', icon: 'fa-calculator' },
          { id: 'countries', label: 'Countries & Gateways', icon: 'fa-globe' },
          { id: 'features', label: 'Features Matrix', icon: 'fa-toggle-on' },
          { id: 'models', label: 'Model Costs & Prompts', icon: 'fa-microchip' },
          { id: 'coupons', label: 'Coupons & Audit', icon: 'fa-ticket' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-purple-900 text-white shadow-md shadow-purple-950/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-purple-300' : 'text-slate-400'}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & GLOBAL PROFITABILITY */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && profitability && (
        <div className="space-y-6">
          {/* Top KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Global AI Revenue</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(profitability.metrics.totalRevenue, reportingCurrency)}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                <i className="fas fa-arrow-trend-up mr-1"></i> {profitability.metrics.totalActiveSubscribers} Paid Subscribers
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total AI Token Cost</span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(profitability.metrics.totalAiCost, reportingCurrency)}
              </div>
              <div className="text-[11px] text-slate-500 font-bold mt-1">
                {profitability.metrics.totalAiRequests?.toLocaleString()} Requests Served
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Contribution Profit</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(profitability.metrics.grossProfit, reportingCurrency)}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                Net After Token &amp; Payment Fees
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">Gross Profit Margin</span>
              <div className="text-3xl font-black mt-1">
                {profitability.metrics.grossMarginPercent}%
              </div>
              <div className="text-[11px] text-purple-200 mt-1 flex items-center gap-1">
                <i className="fas fa-shield-check text-emerald-400"></i> High-Margin Unit Economics
              </div>
            </div>
          </div>

          {/* Breakdown By Country Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Market-by-Market Profitability</span>
              <span className="text-xs text-slate-400 font-normal">Normalized in {reportingCurrency}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Country</th>
                    <th className="p-3">Local Revenue</th>
                    <th className="p-3">Reporting Revenue</th>
                    <th className="p-3">Token Infra Cost</th>
                    <th className="p-3">Net Profit</th>
                    <th className="p-3">Margin</th>
                    <th className="p-3">Subscribers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {profitability.byCountry?.map((c) => (
                    <tr key={c.countryCode} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span>{c.countryName} ({c.countryCode})</span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {formatCurrency(c.localRevenue, c.localCurrency)}
                      </td>
                      <td className="p-3 font-black text-slate-900">
                        {formatCurrency(c.reportingRevenue, reportingCurrency)}
                      </td>
                      <td className="p-3 text-rose-600 font-bold">
                        {formatCurrency(c.reportingCost, reportingCurrency)}
                      </td>
                      <td className="p-3 text-emerald-700 font-black">
                        {formatCurrency(c.reportingProfit, reportingCurrency)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-[11px] border border-emerald-200">
                          {c.marginPercent}%
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">{c.subscribersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model & Feature Cost Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Model */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">
                LLM Token Infrastructure by Model
              </h2>
              <div className="space-y-3">
                {profitability.byModel?.map((m) => (
                  <div key={m.model} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{m.model}</span>
                      <span className="text-[11px] text-slate-400">{m.provider} • {m.requests.toLocaleString()} calls</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-600 text-xs block">
                        {formatCurrency(m.reportingCost, reportingCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {((m.inputTokens + m.outputTokens) / 1000000).toFixed(2)}M Tokens
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Feature */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">
                Cost &amp; Credit Usage by Feature
              </h2>
              <div className="space-y-3">
                {profitability.byFeature?.map((f) => (
                  <div key={f.featureKey} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{f.featureName}</span>
                      <span className="text-[11px] text-purple-700 font-bold">{f.creditsUsed.toLocaleString()} Credits Consumed</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-xs block">
                        {formatCurrency(f.reportingCost, reportingCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-400">{f.requests.toLocaleString()} Invocations</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCTS & PLANS */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Global Logical AI Plans</h2>
              <p className="text-xs text-slate-400">Plans represent the single global logical product identity with included credits and features.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div key={p.planId} className="border border-purple-100 rounded-2xl p-4 bg-gradient-to-br from-white to-purple-50/40 shadow-xs relative">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase">
                      {p.billingCycle}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-2">{p.planName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Plan ID: <code className="text-purple-700 font-mono">{p.planId}</code></p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-purple-950 block">
                      {p.currencySymbol}{p.baseAmount}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.includedCredits} Credits / mo</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-purple-100/80">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Included Features:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.features?.map((f) => (
                      <span key={f} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGIONAL PRICING & TAXES */}
      {/* ========================================================================= */}
      {activeTab === 'pricing' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Explicit Market Pricing &amp; Tax Rules</h2>
              <p className="text-xs text-slate-400">Explicit prices per country and currency. Existing subscribers are grandfathered until migrated.</p>
            </div>
            <button
              onClick={() =>
                setEditingPrice({
                  plan_id: 'patient_premium',
                  country_code: 'IN',
                  currency: 'INR',
                  base_amount: 999,
                  isNew: true,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-plus"></i> Add Country Price
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Market</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Explicit Base Price</th>
                  <th className="p-3">Tax Rule</th>
                  <th className="p-3">Customer Pays</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {[
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'IN', countryName: 'India', flag: '🇮🇳', currency: 'INR', amount: 999, tax: '18% GST (Incl.)', pays: '₹999' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'US', countryName: 'United States', flag: '🇺🇸', currency: 'USD', amount: 35.00, tax: '0% Sales Tax (Excl.)', pays: '$35.00' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'AE', countryName: 'UAE', flag: '🇦🇪', currency: 'AED', amount: 129.00, tax: '5% VAT (Incl.)', pays: '129 AED' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'SA', countryName: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', amount: 129.00, tax: '15% VAT (Incl.)', pays: '129 SAR' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'DE', countryName: 'Germany', flag: '🇩🇪', currency: 'EUR', amount: 35.00, tax: '19% MwSt (Incl.)', pays: '€35.00' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'GB', countryName: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', amount: 30.00, tax: '20% VAT (Incl.)', pays: '£30.00' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'CA', countryName: 'Canada', flag: '🇨🇦', currency: 'CAD', amount: 45.00, tax: '13% HST (Incl.)', pays: 'CA$45.00' },
                  { plan_id: 'patient_premium', name: 'HealNari AI Premium', country: 'AU', countryName: 'Australia', flag: '🇦🇺', currency: 'AUD', amount: 49.00, tax: '10% GST (Incl.)', pays: 'A$49.00' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'IN', countryName: 'India', flag: '🇮🇳', currency: 'INR', amount: 1999, tax: '18% GST (Incl.)', pays: '₹1,999' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'US', countryName: 'United States', flag: '🇺🇸', currency: 'USD', amount: 60.00, tax: '0% Sales Tax (Excl.)', pays: '$60.00' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'AE', countryName: 'UAE', flag: '🇦🇪', currency: 'AED', amount: 220.00, tax: '5% VAT (Incl.)', pays: '220 AED' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'SA', countryName: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', amount: 220.00, tax: '15% VAT (Incl.)', pays: '220 SAR' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'DE', countryName: 'Germany', flag: '🇩🇪', currency: 'EUR', amount: 60.00, tax: '19% MwSt (Incl.)', pays: '€60.00' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'GB', countryName: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', amount: 50.00, tax: '20% VAT (Incl.)', pays: '£50.00' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'CA', countryName: 'Canada', flag: '🇨🇦', currency: 'CAD', amount: 79.00, tax: '13% HST (Incl.)', pays: 'CA$79.00' },
                  { plan_id: 'doctor_pro', name: 'Doctor AI Pro', country: 'AU', countryName: 'Australia', flag: '🇦🇺', currency: 'AUD', amount: 89.00, tax: '10% GST (Incl.)', pays: 'A$89.00' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{row.name}</td>
                    <td className="p-3 font-bold text-slate-700 flex items-center gap-1.5">
                      <span>{row.flag}</span>
                      <span>{row.countryName}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-purple-700">{row.currency}</td>
                    <td className="p-3 font-black text-slate-900 text-sm">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="p-3 text-slate-500 font-bold">{row.tax}</td>
                    <td className="p-3 font-black text-emerald-700">{row.pays}</td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          setEditingPrice({
                            plan_id: row.plan_id,
                            country_code: row.country,
                            currency: row.currency,
                            base_amount: row.amount,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-colors border border-purple-200"
                      >
                        <i className="fas fa-edit mr-1"></i> Edit Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PRICING SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-sliders text-purple-600"></i> Plan Profitability Simulator
            </h2>
            <p className="text-xs text-slate-400">Simulate unit economics before publishing prices to prevent loss-making plans.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Country</label>
                <select
                  value={simInput.countryCode}
                  onChange={(e) => {
                    const c = countries.find((x) => x.code === e.target.value) || { default_currency: 'USD', tax_rate: 0 };
                    setSimInput((prev) => ({
                      ...prev,
                      countryCode: e.target.value,
                      currency: c.default_currency,
                      taxRatePercent: Number(c.tax_rate || 0),
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Billing Currency</label>
                <input
                  type="text"
                  value={simInput.currency}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Proposed Base Price:</span>
                <span className="text-purple-700 font-black">{simInput.currency} {simInput.basePrice}</span>
              </div>
              <input
                type="range"
                min={simInput.currency === 'INR' ? 49 : 1}
                max={simInput.currency === 'INR' ? 4999 : 99}
                step={simInput.currency === 'INR' ? 10 : 0.5}
                value={simInput.basePrice}
                onChange={(e) => setSimInput((prev) => ({ ...prev, basePrice: Number(e.target.value) }))}
                className="w-full accent-purple-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Expected Queries per User / Month:</span>
                <span className="text-purple-700 font-black">{simInput.expectedAvgQueriesPerUser} Queries</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={simInput.expectedAvgQueriesPerUser}
                onChange={(e) => setSimInput((prev) => ({ ...prev, expectedAvgQueriesPerUser: Number(e.target.value) }))}
                className="w-full accent-purple-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Primary LLM Model</label>
                <select
                  value={simInput.model}
                  onChange={(e) => setSimInput((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Low Cost)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Heavy Clinical)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Expected Subscribers</label>
                <input
                  type="number"
                  value={simInput.expectedUsers}
                  onChange={(e) => setSimInput((prev) => ({ ...prev, expectedUsers: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            {simResult ? (
              <>
                <div>
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">Live Unit Contribution Preview</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl sm:text-4xl font-black">
                      {simResult.currency} {simResult.grossContributionPerUserLocal}
                    </span>
                    <span className="text-xs text-slate-300">/ user / mo</span>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <i className="fas fa-chart-line"></i> {simResult.grossMarginPercent}% Contribution Margin
                  </div>
                </div>

                <div className="space-y-2 py-4 border-y border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Price per User:</span>
                    <span className="font-bold">{simResult.currency} {simResult.grossRevenuePerUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax deduction ({simInput.taxRatePercent}%):</span>
                    <span className="text-rose-300 font-bold">-{simResult.currency} {simResult.taxAmountPerUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Token Infrastructure Cost:</span>
                    <span className="text-rose-300 font-bold">
                      -{simResult.currency} {simResult.estimatedAiCostPerUserLocal} (${simResult.estimatedAiCostPerUserUsd} USD)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Gateway Fee (2%):</span>
                    <span className="text-rose-300 font-bold">-{simResult.currency} {simResult.gatewayFeePerUserLocal}</span>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-300 block">Total Monthly Fleet Profit:</span>
                    <span className="text-lg font-black text-emerald-400">
                      {simResult.currency} {simResult.totalMonthlyProfitLocal?.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-300 block">Normalized in USD:</span>
                    <span className="font-black text-white text-sm">
                      ${(simResult.grossContributionPerUserReporting * (simInput.expectedUsers || 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs">Calculating simulation...</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COUNTRIES & CURRENCIES */}
      {/* ========================================================================= */}
      {activeTab === 'countries' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Global Countries &amp; Payment Gateway Routing</h2>
              <p className="text-xs text-slate-400">Enable/disable countries, select tax types, and route local checkout rails.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Country</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Default Currency</th>
                  <th className="p-3">Tax Name &amp; Rate</th>
                  <th className="p-3">Payment Gateway</th>
                  <th className="p-3">AI Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {countries.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-base">{ISO_CURRENCIES[c.default_currency]?.flag || '🌍'}</span>
                      <span>{c.name} ({c.code})</span>
                    </td>
                    <td className="p-3 text-slate-600">{c.region}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">{c.default_currency}</td>
                    <td className="p-3 text-slate-700 font-bold">
                      {c.tax_name} ({c.tax_rate}% {c.tax_type})
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {c.payment_gateway}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.is_ai_enabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                        {c.is_ai_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setEditingCountry(c)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                      >
                        <i className="fas fa-gear mr-1"></i> Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FEATURES & COUNTRY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">AI Capabilities &amp; Entitlement Gates</h2>
              <p className="text-xs text-slate-400">Configure global switches, credit costs, and role accessibility per AI tool.</p>
            </div>
          </div>

          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.feature_key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{f.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-100 text-purple-800 font-bold">
                      {f.feature_key}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{f.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600 font-medium">
                    <span>💳 Credit Cost: <strong className="text-purple-800">{f.credit_cost} Credit(s)</strong></span>
                    <span>🔒 Required Plan: <strong className="text-slate-800">{f.required_plan || 'Free Tier'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleFeature(f.feature_key, f.is_enabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      f.is_enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {f.is_enabled ? '✓ Enabled' : '✕ Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: MODEL COSTS & PROMPTS */}
      {/* ========================================================================= */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Versioned Prompt Templates */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Versioned System Prompts</h2>
            <div className="space-y-3">
              {prompts.map((p) => (
                <div key={p.id || p.feature} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{p.feature}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        v{p.version}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.model}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono line-clamp-2">{p.system_prompt}</p>
                  </div>
                  <button
                    onClick={() => setEditingPrompt(p)}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-colors shrink-0"
                  >
                    <i className="fas fa-pen-to-square mr-1"></i> Edit Prompt
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: COUPONS & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coupons Table */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Discount Coupons</h2>
              <button
                onClick={() => setNewCouponModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs"
              >
                + New Coupon
              </button>
            </div>

            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.code} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-black text-purple-900 text-sm block">{c.code}</span>
                    <span className="text-slate-500 text-[11px]">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `${c.allowed_currency || ''} ${c.discount_value} OFF`}
                      {c.allowed_country ? ` • ${c.allowed_country} only` : ' • Global'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-bold">{c.current_uses || 0} Uses</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Immutable Admin Audit Logs</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 block">{log.action}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{log.entity_id} • {log.reason || 'Admin Update'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Regional Price Modal */}
      {editingPrice && (
        <Modal isOpen={true} onClose={() => setEditingPrice(null)} title={editingPrice.isNew ? "Add Market-Based Regional Price" : "Publish Regional Price Version"} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target AI Plan</label>
              <select
                value={editingPrice.plan_id}
                disabled={!editingPrice.isNew}
                onChange={(e) => setEditingPrice((prev) => ({ ...prev, plan_id: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
              >
                <option value="patient_premium">HealNari AI Premium (Patient)</option>
                <option value="doctor_pro">Doctor AI Pro (Clinical)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Country / Market</label>
                <select
                  value={editingPrice.country_code}
                  disabled={!editingPrice.isNew}
                  onChange={(e) => {
                    const cCode = e.target.value;
                    const cObj = countries.find((x) => x.code === cCode);
                    setEditingPrice((prev) => ({
                      ...prev,
                      country_code: cCode,
                      currency: cObj?.default_currency || prev.currency,
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Billing Currency</label>
                <select
                  value={editingPrice.currency}
                  disabled={!editingPrice.isNew}
                  onChange={(e) => setEditingPrice((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                >
                  <option value="INR">🇮🇳 INR (₹) — Indian Rupee</option>
                  <option value="USD">🇺🇸 USD ($) — US Dollar</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Explicit Base Price Amount</label>
              <input
                type="number"
                value={editingPrice.base_amount}
                onChange={(e) => setEditingPrice((prev) => ({ ...prev, base_amount: Number(e.target.value) }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Existing subscribers will continue paying their contracted price (Grandfathering protection).</p>
            </div>
            <button
              onClick={handleSavePrice}
              className="w-full bg-purple-900 hover:bg-purple-950 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-sm"
            >
              Publish Price Version
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Country Modal */}
      {editingCountry && (
        <Modal isOpen={true} onClose={() => setEditingCountry(null)} title={`Configure ${editingCountry.name}`} size="sm">
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={editingCountry.tax_rate}
                onChange={(e) => setEditingCountry((prev) => ({ ...prev, tax_rate: Number(e.target.value) }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tax Rule</label>
              <select
                value={editingCountry.tax_type}
                onChange={(e) => setEditingCountry((prev) => ({ ...prev, tax_type: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="inclusive">Inclusive (Embedded in Price)</option>
                <option value="exclusive">Exclusive (Added on Checkout)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Gateway</label>
              <select
                value={editingCountry.payment_gateway}
                onChange={(e) => setEditingCountry((prev) => ({ ...prev, payment_gateway: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="cashfree">Cashfree (India UPI / Cards)</option>
                <option value="stripe">Stripe (Global / Apple Pay)</option>
                <option value="manual">Manual Wire</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="countryAiToggle"
                checked={editingCountry.is_ai_enabled}
                onChange={(e) => setEditingCountry((prev) => ({ ...prev, is_ai_enabled: e.target.checked }))}
                className="accent-purple-700 w-4 h-4"
              />
              <label htmlFor="countryAiToggle" className="font-bold text-slate-800">Enable AI Subscriptions in this country</label>
            </div>
            <button
              onClick={handleSaveCountry}
              className="w-full bg-purple-900 hover:bg-purple-950 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </Modal>
      )}

      {/* New Coupon Modal */}
      {newCouponModal && (
        <Modal isOpen={true} onClose={() => setNewCouponModal(false)} title="Create Discount Coupon" size="sm">
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. SUMMER30"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono font-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon((prev) => ({ ...prev, discount_type: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Discount Value</label>
                <input
                  type="number"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon((prev) => ({ ...prev, discount_value: Number(e.target.value) }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>
            </div>
            <button
              onClick={handleCreateCoupon}
              className="w-full bg-purple-900 hover:bg-purple-950 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Create Coupon
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Prompt Modal */}
      {editingPrompt && (
        <Modal isOpen={true} onClose={() => setEditingPrompt(null)} title={`Edit Prompt: ${editingPrompt.feature}`} size="lg">
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">System Prompt</label>
              <textarea
                rows={10}
                value={editingPrompt.system_prompt}
                onChange={(e) => setEditingPrompt((prev) => ({ ...prev, system_prompt: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleSavePrompt}
              className="w-full bg-purple-900 hover:bg-purple-950 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Publish New Prompt Version
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AIControl;
