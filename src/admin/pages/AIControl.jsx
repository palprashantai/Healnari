import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { formatCurrency, SUPPORTED_REPORTING_CURRENCIES } from '../../lib/currency.js';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function AIControl() {
  const toastApi = useToast();
  const notify = (msg, type = 'success') => {
    try {
      if (typeof toastApi === 'function') {
        toastApi(msg, type);
      } else if (typeof toastApi?.success === 'function' && type === 'success') {
        toastApi.success(msg);
      } else if (typeof toastApi?.error === 'function' && type === 'error') {
        toastApi.error(msg);
      } else if (typeof toastApi?.toast === 'function') {
        toastApi.toast(msg, type);
      } else {
        console.log(`[Toast ${type}]: ${msg}`);
      }
    } catch {}
  };
  const [activeTab, setActiveTab] = useState('features'); // 'features' | 'plans' | 'audit' | 'advanced'

  // Data State
  const [flags, setFlags] = useState([]);
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Plan in Plan Management tab
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Feature Modals
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [featureForm, setFeatureForm] = useState({
    name: '',
    feature_key: '',
    description: '',
    usage_type: 'messages',
    unit: 'messages',
    applicable_roles: ['patient'],
    credit_cost: 1,
    is_enabled: true,
  });

  // Archive Modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [featureToArchive, setFeatureToArchive] = useState(null);
  const [impactedPlans, setImpactedPlans] = useState([]);
  const [archiving, setArchiving] = useState(false);

  // Create Plan Modal
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    description: '',
    product_id: 'prod_patient_ai',
    billing_cycle: 'monthly',
    included_monthly_credits: 500,
    bonus_credits: 0,
    rollover_unused_credits: false,
    price_inr: 999,
    price_usd: 19,
    is_active: true,
    is_public: true,
  });

  // Credit Top-Up Packs State (Database Managed)
  const [creditPacks, setCreditPacks] = useState([]);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [packForm, setPackForm] = useState({
    id: '',
    name: '',
    description: '',
    credits: 100,
    price_inr: 200,
    price_usd: 3.0,
    is_active: true,
  });
  const [savingPack, setSavingPack] = useState(false);

  // Advanced / Treasury State
  const [reportingCurrency, setReportingCurrency] = useState('USD');
  const [profitability, setProfitability] = useState(null);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [simInput, setSimInput] = useState({
    countryCode: 'IN',
    currency: 'INR',
    basePrice: 999,
    monthlyCredits: 500,
    expectedAvgQueriesPerUser: 45,
    model: 'gemini-1.5-flash',
    taxRatePercent: 18,
    gatewayFeePercent: 2.0,
    expectedUsers: 500,
  });
  const [simResult, setSimResult] = useState(null);

  // Search & Filter
  const [featureSearch, setFeatureSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, plData, alData, cpData] = await Promise.all([
        apiFetch('/admin/ai/features').catch(() => []),
        apiFetch('/admin/ai/plans?includeInactive=true').catch(() => []),
        apiFetch('/admin/ai/audit-logs').catch(() => []),
        apiFetch('/admin/ai/credit-packs').catch(() => []),
      ]);

      const featuresList = Array.isArray(fData) ? fData : [];
      const plansList = Array.isArray(plData) ? plData : [];

      setFlags(featuresList);
      setPlans(plansList);
      setAuditLogs(Array.isArray(alData) ? alData : []);
      setCreditPacks(Array.isArray(cpData) ? cpData : []);

      const subPlans = plansList.filter((p) => p.billingCycle !== 'credit_pack' && p.billing_cycle !== 'credit_pack' && !p.planId?.startsWith('pack_') && !p.id?.startsWith('pack_'));
      if (subPlans.length > 0 && !selectedPlanId) {
        selectPlan(subPlans[0]);
      } else if (selectedPlanId) {
        const current = plansList.find((p) => p.planId === selectedPlanId);
        if (current) selectPlan(current);
      }
    } catch {
      notify('Failed to load AI control data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAdvancedData = async () => {
    try {
      const [pData, cData, currData] = await Promise.all([
        apiFetch(`/admin/ai/profitability?currency=${reportingCurrency}`).catch(() => null),
        apiFetch('/admin/ai/countries').catch(() => []),
        apiFetch('/admin/ai/currencies').catch(() => []),
      ]);
      setProfitability(pData);
      setCountries(cData || []);
      setCurrencies(currData || []);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'advanced') {
      loadAdvancedData();
    }
  }, [activeTab, reportingCurrency]);

  const selectPlan = (plan) => {
    setSelectedPlanId(plan.planId);
    setPlanForm({
      id: plan.planId,
      name: plan.planName || plan.name || plan.id,
      description: plan.description || '',
      billing_cycle: plan.billing_cycle || plan.billingCycle || 'monthly',
      product_id: plan.product_id || 'prod_patient_ai',
      is_active: plan.is_active ?? true,
      is_public: plan.is_public ?? true,
      included_monthly_credits: plan.included_monthly_credits !== undefined 
        ? plan.included_monthly_credits 
        : (plan.includedCredits ?? 0),
      bonus_credits: plan.bonus_credits ?? 0,
      rollover_unused_credits: plan.rollover_unused_credits ?? false,
      price_inr: plan.price_inr !== undefined ? plan.price_inr : (plan.baseAmount ?? 0),
      price_usd: plan.price_usd !== undefined ? plan.price_usd : (plan.planId?.includes('free') ? 0 : 19),
      features: [...(plan.features || [])],
      feature_limits: { ...(plan.feature_limits || {}) },
    });
  };

  // Run Simulator
  useEffect(() => {
    if (activeTab === 'advanced') {
      apiFetch('/admin/ai/simulate-pricing', {
        method: 'POST',
        body: simInput,
      })
        .then(setSimResult)
        .catch(() => {});
    }
  }, [simInput, activeTab]);

  // --- Feature Handlers ---
  const handleOpenAddFeature = () => {
    setEditingFeature(null);
    setFeatureForm({
      name: '',
      feature_key: '',
      description: '',
      usage_type: 'messages',
      unit: 'messages',
      applicable_roles: ['patient'],
      credit_cost: 1,
      is_enabled: true,
    });
    setFeatureModalOpen(true);
  };

  const handleOpenEditFeature = (f) => {
    setEditingFeature(f);
    setFeatureForm({
      name: f.name || '',
      feature_key: f.feature_key || '',
      description: f.description || '',
      usage_type: f.usage_type || 'messages',
      unit: f.unit || 'messages',
      applicable_roles: f.applicable_roles || ['patient'],
      credit_cost: f.credit_cost ?? 1,
      is_enabled: f.is_enabled ?? true,
    });
    setFeatureModalOpen(true);
  };

  const handleSaveFeature = async (e) => {
    e?.preventDefault();
    if (!featureForm.name.trim()) {
      notify('Please enter a feature name', 'error');
      return;
    }

    try {
      if (editingFeature) {
        await apiFetch(`/admin/ai/features/${editingFeature.feature_key}`, {
          method: 'PUT',
          body: featureForm,
        });
        notify(`Feature "${featureForm.name}" updated successfully`);
      } else {
        await apiFetch('/admin/ai/features', {
          method: 'POST',
          body: featureForm,
        });
        notify(`Feature "${featureForm.name}" created successfully`);
      }
      setFeatureModalOpen(false);
      loadData();
    } catch (err) {
      notify(err?.message || 'Failed to save feature', 'error');
    }
  };

  const handleToggleFeatureStatus = async (featureKey, currentStatus) => {
    try {
      await apiFetch(`/admin/ai/features/${featureKey}`, {
        method: 'PUT',
        body: { is_enabled: !currentStatus },
      });
      notify(`Feature status set to ${!currentStatus ? 'Active' : 'Disabled'}`);
      loadData();
    } catch {
      notify('Failed to toggle feature status', 'error');
    }
  };

  const handleOpenArchiveModal = async (f) => {
    setFeatureToArchive(f);
    try {
      const res = await apiFetch(`/admin/ai/features/${f.feature_key}/impact`);
      setImpactedPlans(res?.impactedPlans || []);
    } catch {
      setImpactedPlans([]);
    }
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!featureToArchive) return;
    setArchiving(true);
    try {
      const res = await apiFetch(`/admin/ai/features/${featureToArchive.feature_key}?force=true`, {
        method: 'DELETE',
      });
      notify(res?.message || 'Feature archived successfully');
      setArchiveModalOpen(false);
      loadData();
    } catch (err) {
      notify(err?.message || 'Failed to archive feature', 'error');
    } finally {
      setArchiving(false);
    }
  };

  // --- Plan Handlers ---
  const handleToggleFeatureInPlan = (featureKey) => {
    if (!planForm) return;
    const exists = planForm.features.includes(featureKey);
    let newFeatures;
    const newLimits = { ...planForm.feature_limits };

    if (exists) {
      newFeatures = planForm.features.filter((k) => k !== featureKey);
      delete newLimits[featureKey];
    } else {
      newFeatures = [...planForm.features, featureKey];
      // Default to unlimited or standard limit
      const featureMeta = flags.find((f) => f.feature_key === featureKey);
      newLimits[featureKey] = {
        limit: null,
        is_unlimited: true,
        unit: featureMeta?.unit || 'uses',
      };
    }

    setPlanForm({
      ...planForm,
      features: newFeatures,
      feature_limits: newLimits,
    });
  };

  const handleSetFeatureLimitType = (featureKey, isUnlimited) => {
    if (!planForm) return;
    const featureMeta = flags.find((f) => f.feature_key === featureKey);
    const current = planForm.feature_limits[featureKey] || {};

    setPlanForm({
      ...planForm,
      feature_limits: {
        ...planForm.feature_limits,
        [featureKey]: {
          ...current,
          is_unlimited: isUnlimited,
          limit: isUnlimited ? null : current.limit || 50,
          unit: featureMeta?.unit || current.unit || 'uses',
        },
      },
    });
  };

  const handleSetFeatureNumericLimit = (featureKey, num) => {
    if (!planForm) return;
    const current = planForm.feature_limits[featureKey] || {};
    setPlanForm({
      ...planForm,
      feature_limits: {
        ...planForm.feature_limits,
        [featureKey]: {
          ...current,
          limit: num === '' ? '' : Math.max(0, parseInt(num, 10) || 0),
        },
      },
    });
  };

  const handleSavePlan = async () => {
    if (!planForm) return;
    setSavingPlan(true);
    try {
      const priceInr = planForm.price_inr === '' ? 0 : Number(planForm.price_inr);
      const priceUsd = planForm.price_usd === '' ? 0 : Number(planForm.price_usd);
      const credits = planForm.included_monthly_credits === '' ? 0 : Number(planForm.included_monthly_credits);
      const bonus = planForm.bonus_credits === '' ? 0 : Number(planForm.bonus_credits);

      // Sanitize feature limits
      const sanitizedLimits = {};
      Object.entries(planForm.feature_limits || {}).forEach(([k, v]) => {
        sanitizedLimits[k] = {
          ...v,
          limit: v.is_unlimited ? null : (v.limit === '' ? 50 : Number(v.limit || 0)),
        };
      });

      // 1. Update plan details, features, limits, and prices
      await apiFetch(`/admin/ai/plans/${planForm.id}`, {
        method: 'PUT',
        body: {
          name: planForm.name,
          description: planForm.description,
          billing_cycle: planForm.billing_cycle,
          product_id: planForm.product_id,
          is_active: planForm.is_active,
          is_public: planForm.is_public,
          included_monthly_credits: credits,
          bonus_credits: bonus,
          rollover_unused_credits: planForm.rollover_unused_credits,
          price_inr: priceInr,
          price_usd: priceUsd,
          features: planForm.features,
          feature_limits: sanitizedLimits,
        },
      });

      // 2. Publish regional prices for India (INR) and International (USD)
      const pricePromises = [
        apiFetch('/admin/ai/prices', {
          method: 'POST',
          body: {
            plan_id: planForm.id,
            country_code: 'IN',
            currency: 'INR',
            base_amount: priceInr,
          },
        }).catch(() => null),
        apiFetch('/admin/ai/prices', {
          method: 'POST',
          body: {
            plan_id: planForm.id,
            country_code: 'US',
            currency: 'USD',
            base_amount: priceUsd,
          },
        }).catch(() => null),
      ];

      await Promise.all(pricePromises);

      notify(`Plan "${planForm.name}" configuration and pricing saved successfully`);
      await loadData();
    } catch (err) {
      notify(err?.message || 'Failed to save plan configuration', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e?.preventDefault();
    if (!newPlanForm.name.trim()) {
      notify('Please enter a plan name', 'error');
      return;
    }

    try {
      const created = await apiFetch('/admin/ai/plans', {
        method: 'POST',
        body: {
          ...newPlanForm,
          included_monthly_credits: Number(newPlanForm.included_monthly_credits || 0),
          bonus_credits: Number(newPlanForm.bonus_credits || 0),
          price_inr: Number(newPlanForm.price_inr || 0),
          price_usd: Number(newPlanForm.price_usd || 0),
        },
      });
      notify(`Plan "${newPlanForm.name}" created successfully`);
      setCreatePlanModalOpen(false);
      setNewPlanForm({
        name: '',
        description: '',
        product_id: 'prod_patient_ai',
        billing_cycle: 'monthly',
        included_monthly_credits: 500,
        bonus_credits: 0,
        rollover_unused_credits: false,
        price_inr: 999,
        price_usd: 19,
        is_active: true,
        is_public: true,
      });
      await loadData();
      if (created?.id) setSelectedPlanId(created.id);
    } catch (err) {
      notify(err?.message || 'Failed to create plan', 'error');
    }
  };

  // Credit Top-Up Pack Handlers
  const handleOpenPackModal = (pack = null) => {
    if (pack) {
      setEditingPack(pack);
      setPackForm({
        id: pack.id,
        name: pack.name,
        description: pack.description || '',
        credits: pack.credits || pack.included_monthly_credits || 100,
        price_inr: pack.price_inr ?? 200,
        price_usd: pack.price_usd ?? 3,
        is_active: pack.is_active !== false,
      });
    } else {
      setEditingPack(null);
      setPackForm({
        id: `pack_${Date.now().toString().slice(-4)}`,
        name: '',
        description: '',
        credits: 100,
        price_inr: 200,
        price_usd: 3.0,
        is_active: true,
      });
    }
    setPackModalOpen(true);
  };

  const handleSavePack = async (e) => {
    e?.preventDefault();
    if (!packForm.name.trim()) {
      notify('Please enter a pack name', 'error');
      return;
    }
    if (!packForm.credits || Number(packForm.credits) <= 0) {
      notify('Credits must be greater than 0', 'error');
      return;
    }

    setSavingPack(true);
    try {
      await apiFetch('/admin/ai/credit-packs', {
        method: 'POST',
        body: {
          id: packForm.id,
          name: packForm.name,
          description: packForm.description,
          credits: Number(packForm.credits),
          price_inr: Number(packForm.price_inr),
          price_usd: Number(packForm.price_usd),
          is_active: packForm.is_active,
        },
      });
      notify(`Credit pack "${packForm.name}" saved in database`);
      setPackModalOpen(false);
      await loadData();
    } catch (err) {
      notify(err?.message || 'Failed to save credit pack', 'error');
    } finally {
      setSavingPack(false);
    }
  };

  const handleTogglePack = async (packId) => {
    try {
      await apiFetch(`/admin/ai/credit-packs/${packId}`, { method: 'DELETE' });
      notify('Top-up pack status updated in database');
      await loadData();
    } catch (err) {
      notify(err?.message || 'Failed to update pack status', 'error');
    }
  };

  // Filtered Features
  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      if (f.status === 'archived') return false;
      const matchesSearch =
        f.name?.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.feature_key?.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.description?.toLowerCase().includes(featureSearch.toLowerCase());
      const matchesRole =
        roleFilter === 'all' ||
        (Array.isArray(f.applicable_roles) && f.applicable_roles.includes(roleFilter));
      return matchesSearch && matchesRole;
    });
  }, [flags, featureSearch, roleFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold mb-2">
            <i className="fas fa-sliders text-purple-300"></i>
            <span>AI Product Control &amp; Entitlements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AI Product Control</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Control which AI features are available in your product, which subscription plans include them, and set usage limits (Limited vs Unlimited).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl border border-white/15 transition-all"
            title="Refresh AI Configuration"
          >
            <i className={`fas fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAddFeature}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all shadow-purple-900/30"
          >
            <i className="fas fa-plus"></i>
            <span>Add AI Feature</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto hide-scrollbar">
        {[
          { id: 'features', label: 'AI Features Catalog', icon: 'fa-wand-magic-sparkles', badge: flags.filter((f) => f.status !== 'archived').length },
          { id: 'plans', label: 'AI Plans & Usage Limits', icon: 'fa-layer-group', badge: plans.filter((p) => p.billingCycle !== 'credit_pack' && !p.planId?.startsWith('pack_')).length },
          { id: 'credit_packs', label: 'Credit Top-Up Packs', icon: 'fa-bolt', badge: creditPacks.length },
          { id: 'audit', label: 'Audit Trail', icon: 'fa-clock-rotate-left', badge: auditLogs.length },
          { id: 'advanced', label: 'Advanced & Unit Economics', icon: 'fa-chart-pie' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-purple-900 text-white shadow-md shadow-purple-950/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-purple-300' : 'text-slate-400'}`}></i>
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-purple-800 text-purple-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI FEATURES CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                placeholder="Search AI features or keys..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Audience:</span>
              {['all', 'patient', 'doctor'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    roleFilter === role
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {role === 'all' ? 'All Roles' : role + 's'}
                </button>
              ))}
            </div>
          </div>

          {/* Features Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Active AI Capabilities
                </h2>
                <p className="text-xs text-slate-400">
                  Global catalog of AI capabilities. Activate, configure usage units, or assign to subscription plans.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">AI Feature</th>
                    <th className="p-3.5">Feature Key</th>
                    <th className="p-3.5">Usage Type / Unit</th>
                    <th className="p-3.5">Included in Plans</th>
                    <th className="p-3.5">Audience</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFlags.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <i className="fas fa-wand-magic-sparkles text-2xl mb-2 block"></i>
                        No AI features found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredFlags.map((f) => (
                      <tr key={f.feature_key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 text-sm">{f.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                            {f.description || 'No description provided'}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                            {f.feature_key}
                          </span>
                          {f.is_system && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                              Core
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-bold text-slate-700 capitalize">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span>{f.usage_type || 'Messages'}</span>
                            <span className="text-slate-400 text-[10px]">({f.unit || 'units'})</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              (f.plan_count || 0) > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {f.plan_count || 0} Plan(s)
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex gap-1">
                            {f.applicable_roles?.map((r) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              f.is_enabled
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${f.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
                            ></span>
                            <span>{f.is_enabled ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleFeatureStatus(f.feature_key, f.is_enabled)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                f.is_enabled
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                              title={f.is_enabled ? 'Deactivate feature' : 'Activate feature'}
                            >
                              {f.is_enabled ? 'Disable' : 'Enable'}
                            </button>

                            <button
                              onClick={() => handleOpenEditFeature(f)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-all"
                            >
                              Edit
                            </button>

                            {!f.is_system && (
                              <button
                                onClick={() => handleOpenArchiveModal(f)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                                title="Archive Feature"
                              >
                                <i className="fas fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI PLANS & USAGE LIMITS */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Selector Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Select Subscription Plan
              </h2>
              <button
                onClick={() => setCreatePlanModalOpen(true)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <i className="fas fa-plus"></i>
                <span>Add Plan</span>
              </button>
            </div>

            <div className="space-y-2">
              {plans
                .filter((p) => p.billingCycle !== 'credit_pack' && p.billing_cycle !== 'credit_pack' && !p.planId?.startsWith('pack_') && !p.id?.startsWith('pack_'))
                .map((p) => {
                const isSelected = selectedPlanId === p.planId;
                return (
                  <div
                    key={p.planId}
                    onClick={() => selectPlan(p)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-900 text-white border-purple-950 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">{p.planName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isSelected
                            ? 'bg-purple-800 text-purple-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {p.billingCycle}
                      </span>
                    </div>
                    <div
                      className={`text-xs mt-1 line-clamp-1 ${
                        isSelected ? 'text-purple-200' : 'text-slate-400'
                      }`}
                    >
                      {p.description || 'No description provided'}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className={isSelected ? 'text-purple-300' : 'text-slate-500'}>
                        {p.features?.length || 0} Features Included
                      </span>
                      <span className="font-black">
                        {p.currencySymbol || '₹'}
                        {p.price_inr !== undefined ? p.price_inr : (p.baseAmount ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Limit Editor */}
          {planForm && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{planForm.name}</h2>
                    <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {planForm.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{planForm.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.is_active}
                      onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Active Plan</span>
                  </label>

                  <button
                    onClick={handleSavePlan}
                    disabled={savingPlan}
                    className="flex items-center gap-1.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <i className={`fas ${savingPlan ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                    <span>{savingPlan ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>

              {/* Plan Pricing & Commercial Settings */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Plan Identity &amp; Pricing
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configure plan display names, market prices, billing intervals, and credit allowances. Changes apply immediately.
                    </p>
                  </div>
                </div>

                {/* Identity: Display Name & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="e.g. HealNari AI Premium"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      Plan Description
                    </label>
                    <input
                      type="text"
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      placeholder="Brief customer-facing summary..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Plan Attributes: Cycle, Product, Visibility, Rollover */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={planForm.billing_cycle || 'monthly'}
                      onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600"
                    >
                      <option value="monthly">Monthly Subscription</option>
                      <option value="yearly">Yearly Subscription</option>
                      <option value="lifetime">Lifetime Access</option>
                      <option value="pay_per_use">Pay-As-You-Go</option>
                      <option value="credit_pack">Credit Pack</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">
                      Target Audience / Suite
                    </label>
                    <select
                      value={planForm.product_id || 'prod_patient_ai'}
                      onChange={(e) => setPlanForm({ ...planForm, product_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600"
                    >
                      <option value="prod_patient_ai">Patient AI Suite</option>
                      <option value="prod_doctor_ai">Doctor Clinical AI</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Catalog Visibility
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={planForm.is_public ?? true}
                        onChange={(e) => setPlanForm({ ...planForm, is_public: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Publicly Listed</span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Credit Rollover
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={planForm.rollover_unused_credits ?? false}
                        onChange={(e) => setPlanForm({ ...planForm, rollover_unused_credits: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Rollover Unused</span>
                    </label>
                  </div>
                </div>

                {/* Pricing & AI Quotas Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  {/* Price INR */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        Price in India (₹ INR)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Cashfree / UPI
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                      <span className="text-sm font-black text-slate-600">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={planForm.price_inr === '' ? '' : (planForm.price_inr ?? 0)}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            price_inr: e.target.value,
                          })
                        }
                        className="w-full text-sm font-black text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Local Indian checkout
                    </span>
                  </div>

                  {/* Price USD */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        International ($ USD)
                      </label>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        Stripe Global
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                      <span className="text-sm font-black text-slate-600">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={planForm.price_usd === '' ? '' : (planForm.price_usd ?? 0)}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            price_usd: e.target.value,
                          })
                        }
                        className="w-full text-sm font-black text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Global checkout
                    </span>
                  </div>

                  {/* Monthly AI Credit Pool */}
                  <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-purple-900">
                        Monthly Base Credits
                      </label>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                        Per Cycle
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-purple-300 rounded-xl px-2.5 py-1.5 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={planForm.included_monthly_credits === '' ? '' : (planForm.included_monthly_credits ?? 0)}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            included_monthly_credits: e.target.value,
                          })
                        }
                        className="w-full text-sm font-black text-purple-950 bg-transparent focus:outline-none"
                      />
                      <span className="text-[11px] font-bold text-purple-700 shrink-0">Credits</span>
                    </div>
                    <span className="text-[10px] text-purple-600 block">
                      Monthly credits quota
                    </span>
                  </div>

                  {/* Bonus Credits */}
                  <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-900">
                        Bonus Credits
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        One-Time
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={planForm.bonus_credits === '' ? '' : (planForm.bonus_credits ?? 0)}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            bonus_credits: e.target.value,
                          })
                        }
                        className="w-full text-sm font-black text-amber-950 bg-transparent focus:outline-none"
                      />
                      <span className="text-[11px] font-bold text-amber-700 shrink-0">Bonus</span>
                    </div>
                    <span className="text-[10px] text-amber-600 block">
                      Granted on subscription
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Matrix & Limits Control (Subscription Plans Only - Excluded for Top-Up Packs) */}
              {planForm.billing_cycle === 'credit_pack' || planForm.id?.startsWith('pack_') ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fas fa-bolt text-base"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">Top-Up Credit Pack — Universal Credit Recharge</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Top-Up packs provide universal AI credits that directly recharge the user's balance. These credits can be spent on any feature currently unlocked by the user's active subscription tier. Specific feature inclusions do not apply to top-up packs.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Feature Inclusions (Unified Credit Pool)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select which AI features are included in this plan. Every included feature consumes from the plan's Monthly Base Credits.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {flags
                      .filter((f) => {
                        if (f.status === 'archived') return false;
                        const targetRole = (planForm.product_id === 'prod_doctor_ai' || planForm.id?.startsWith('doctor')) ? 'doctor' : 'patient';
                        return !f.applicable_roles?.length || f.applicable_roles.includes(targetRole);
                      })
                      .map((f) => {
                        const isIncluded = planForm.features.includes(f.feature_key);
                        const limitConfig = planForm.feature_limits[f.feature_key] || {
                          limit: null,
                          is_unlimited: true,
                          unit: f.unit || 'uses',
                        };
                        const isUnlimited = limitConfig.is_unlimited !== false;

                        return (
                          <div
                            key={f.feature_key}
                            className={`p-4 rounded-2xl border transition-all ${
                              isIncluded
                                ? 'bg-white border-purple-200 shadow-xs'
                                : 'bg-slate-50/60 border-slate-200/70 opacity-60'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {/* Feature Checkbox & Title */}
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => handleToggleFeatureInPlan(f.feature_key)}
                                  className="mt-1 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">{f.name}</span>
                                    <span className="text-[10px] font-mono text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded">
                                      {f.feature_key}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{f.description}</p>
                                </div>
                              </div>

                              {/* Simple Included / Excluded Status & Toggle */}
                              <div className="flex items-center gap-2.5 shrink-0">
                                {isIncluded ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                    <i className="fas fa-check-circle text-emerald-600"></i>
                                    <span>Included</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200">
                                    <span>Not Included</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeatureInPlan(f.feature_key)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isIncluded
                                      ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
                                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                                  }`}
                                >
                                  {isIncluded ? 'Remove' : 'Include'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2B: CREDIT TOP-UP PACKS (DATABASE MANAGED) */}
      {/* ========================================================================= */}
      {activeTab === 'credit_packs' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-sm">
                  <i className="fas fa-bolt"></i>
                </span>
                <h2 className="text-base font-black text-slate-900">
                  AI Credit Top-Up Packs
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Database-managed instant recharge packs. When users or doctors exhaust their monthly plan credits, they can purchase these packs directly to keep generating AI insights without altering their subscription.
              </p>
            </div>

            <button
              onClick={() => handleOpenPackModal(null)}
              className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow-md flex items-center gap-2 shrink-0"
            >
              <i className="fas fa-plus"></i>
              <span>Create Top-Up Pack</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                <i className="fas fa-box-open text-4xl mb-3 text-slate-300"></i>
                <p className="text-sm font-bold text-slate-600">No Credit Packs found</p>
                <p className="text-xs text-slate-400 mt-1">Click "Create Top-Up Pack" to add a new pack to the database.</p>
              </div>
            ) : (
              creditPacks.map((pack) => (
                <div
                  key={pack.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all ${
                    pack.is_active ? 'border-slate-200 hover:border-purple-300' : 'border-slate-200 bg-slate-50/60 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                        {pack.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pack.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {pack.is_active ? 'Active in DB' : 'Inactive'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900">{pack.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {pack.description || 'Instant AI credit booster pack.'}
                      </p>
                    </div>

                    <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100">
                      <div className="text-xs text-purple-700 font-bold uppercase tracking-wider text-[10px]">
                        Included AI Credits
                      </div>
                      <div className="text-2xl font-black text-purple-950 mt-0.5 flex items-baseline gap-1">
                        <span>{pack.credits}</span>
                        <span className="text-xs font-semibold text-purple-600">credits</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">India (INR)</div>
                        <div className="text-sm font-black text-slate-800 mt-0.5">₹{pack.price_inr}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Global (USD)</div>
                        <div className="text-sm font-black text-slate-800 mt-0.5">${pack.price_usd}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenPackModal(pack)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <i className="fas fa-edit"></i>
                      <span>Edit Pack</span>
                    </button>
                    <button
                      onClick={() => handleTogglePack(pack.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        pack.is_active
                          ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                      title={pack.is_active ? 'Deactivate Pack' : 'Activate Pack'}
                    >
                      {pack.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Immutable AI Control Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                Chronological record of all changes to AI features, plan assignments, quotas, and pricing.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Change Summary / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <i className="fas fa-user-shield text-purple-600"></i>
                        <span>{log.admin_name || 'System Admin'}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-purple-900 font-bold">
                        {log.entity_id || log.entity_type}
                      </td>
                      <td className="p-3 text-slate-700">
                        {log.reason || (
                          <span className="text-slate-400 italic">Configuration updated</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADVANCED & UNIT ECONOMICS (PRESERVED) */}
      {/* ========================================================================= */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Top KPI Metrics Grid */}
          {profitability && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Global AI Revenue
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {formatCurrency(profitability.metrics?.totalRevenue || 0, reportingCurrency)}
                </div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  {profitability.metrics?.totalActiveSubscribers || 0} Paid Subscribers
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total AI Token Cost
                </span>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  {formatCurrency(profitability.metrics?.totalAiCost || 0, reportingCurrency)}
                </div>
                <div className="text-[11px] text-slate-500 font-bold mt-1">
                  {profitability.metrics?.totalAiRequests?.toLocaleString() || 0} Requests
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Gross Margin
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {profitability.metrics?.grossMarginPercent || 0}%
                </div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  High-Margin Unit Economics
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  Reporting Currency
                </span>
                <select
                  value={reportingCurrency}
                  onChange={(e) => setReportingCurrency(e.target.value)}
                  className="mt-2 bg-purple-800 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 border border-purple-400/40 focus:outline-none w-full"
                >
                  {SUPPORTED_REPORTING_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Pricing Simulator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              AI Unit Profitability Simulator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Base Price</label>
                <input
                  type="number"
                  value={simInput.basePrice}
                  onChange={(e) => setSimInput({ ...simInput, basePrice: Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Monthly Credits</label>
                <input
                  type="number"
                  value={simInput.monthlyCredits}
                  onChange={(e) => setSimInput({ ...simInput, monthlyCredits: Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Expected Avg Queries/User</label>
                <input
                  type="number"
                  value={simInput.expectedAvgQueriesPerUser}
                  onChange={(e) =>
                    setSimInput({ ...simInput, expectedAvgQueriesPerUser: Number(e.target.value) })
                  }
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Expected Users</label>
                <input
                  type="number"
                  value={simInput.expectedUsers}
                  onChange={(e) => setSimInput({ ...simInput, expectedUsers: Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
            </div>

            {simResult && (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs flex flex-wrap gap-6 font-bold text-purple-950">
                <div>Revenue: ₹{simResult.monthlyRevenue?.toLocaleString()}</div>
                <div>Token Cost: ₹{simResult.tokenCostTotal?.toLocaleString()}</div>
                <div className="text-emerald-700">Gross Margin: {simResult.grossMarginPercent}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT FEATURE */}
      {/* ========================================================================= */}
      {featureModalOpen && (
        <Modal
          isOpen={featureModalOpen}
          onClose={() => setFeatureModalOpen(false)}
          title={editingFeature ? 'Edit AI Feature' : 'Add AI Feature to Catalog'}
        >
          <form onSubmit={handleSaveFeature} className="space-y-4 text-xs">
            {/* Developer vs Config Notice */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] leading-relaxed">
              <i className="fas fa-circle-info mr-1 text-purple-700"></i>
              <strong>Feature Configuration vs Development:</strong> Adding a feature registers it in
              the catalog and plan matrix. Backend LLM logic and prompts execute via the AI gateway.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Feature Name *</label>
              <input
                type="text"
                required
                value={featureForm.name}
                onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
                placeholder="e.g. AI Document Analysis"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Technical Identifier / Key</label>
              <input
                type="text"
                disabled={!!editingFeature}
                value={featureForm.feature_key}
                onChange={(e) =>
                  setFeatureForm({
                    ...featureForm,
                    feature_key: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                  })
                }
                placeholder="Auto-generated from name if left empty"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono disabled:bg-slate-100"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {editingFeature
                  ? 'Technical key cannot be altered once created to preserve system stability.'
                  : 'Leave blank to automatically slugify from feature name.'}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                placeholder="Plain-language summary for non-technical users..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Usage Metric</label>
                <select
                  value={featureForm.usage_type}
                  onChange={(e) => setFeatureForm({ ...featureForm, usage_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                >
                  <option value="messages">Messages (Chat)</option>
                  <option value="documents">Documents (PDFs/Labs)</option>
                  <option value="generations">Generations (Notes/Summaries)</option>
                  <option value="calls">API Calls / Checks</option>
                  <option value="credits">AI Credits</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Unit</label>
                <input
                  type="text"
                  value={featureForm.unit}
                  onChange={(e) => setFeatureForm({ ...featureForm, unit: e.target.value })}
                  placeholder="e.g. messages, documents, checks"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Roles</label>
              <div className="flex gap-4 mt-1">
                {['patient', 'doctor'].map((role) => (
                  <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featureForm.applicable_roles.includes(role)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...featureForm.applicable_roles, role]
                          : featureForm.applicable_roles.filter((r) => r !== role);
                        setFeatureForm({ ...featureForm, applicable_roles: next });
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="capitalize font-medium">{role}s</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFeatureModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold shadow-md"
              >
                {editingFeature ? 'Save Changes' : 'Create Feature'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARCHIVE FEATURE IMPACT WARNING */}
      {/* ========================================================================= */}
      {archiveModalOpen && featureToArchive && (
        <Modal
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          title="Archive AI Feature"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
              <i className="fas fa-triangle-exclamation mr-1.5 text-amber-700"></i>
              Are you sure you want to archive <strong>{featureToArchive.name}</strong>?
            </div>

            {impactedPlans.length > 0 ? (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">
                  Impact on Active Subscription Plans:
                </span>
                <p className="text-slate-500 text-[11px]">
                  This feature is currently included in the following plans. Archiving will disable access for users on these plans:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {impactedPlans.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">
                No active plans currently include this feature. Historical usage and billing records will remain safely preserved.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={archiving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PLAN */}
      {/* ========================================================================= */}
      {createPlanModalOpen && (
        <Modal
          isOpen={createPlanModalOpen}
          onClose={() => setCreatePlanModalOpen(false)}
          title="Create New AI Subscription Plan"
        >
          <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={newPlanForm.name}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                placeholder="e.g. Care Plus AI Tier"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={newPlanForm.description}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
                placeholder="Plan description for customers..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Product</label>
                <select
                  value={newPlanForm.product_id}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-semibold"
                >
                  <option value="prod_patient_ai">Patient AI Suite</option>
                  <option value="prod_doctor_ai">Doctor Clinical AI</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Billing Cycle</label>
                <select
                  value={newPlanForm.billing_cycle}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, billing_cycle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-semibold"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="pay_per_use">Pay-As-You-Go</option>
                  <option value="credit_pack">Credit Pack</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Price India (₹ INR)</label>
                <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-purple-600">
                  <span className="font-black text-slate-600">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="999"
                    value={newPlanForm.price_inr}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, price_inr: e.target.value })}
                    className="w-full bg-transparent font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">International ($ USD)</label>
                <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-purple-600">
                  <span className="font-black text-slate-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="19"
                    value={newPlanForm.price_usd}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, price_usd: e.target.value })}
                    className="w-full bg-transparent font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Monthly Base Credits</label>
                <input
                  type="number"
                  min="0"
                  value={newPlanForm.included_monthly_credits}
                  onChange={(e) =>
                    setNewPlanForm({
                      ...newPlanForm,
                      included_monthly_credits: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 text-right font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bonus Credits</label>
                <input
                  type="number"
                  min="0"
                  value={newPlanForm.bonus_credits}
                  onChange={(e) =>
                    setNewPlanForm({
                      ...newPlanForm,
                      bonus_credits: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 text-right font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreatePlanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold shadow-md"
              >
                Create Plan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT CREDIT PACK */}
      {/* ========================================================================= */}
      {packModalOpen && (
        <Modal
          isOpen={packModalOpen}
          onClose={() => setPackModalOpen(false)}
          title={editingPack ? 'Edit Credit Top-Up Pack' : 'Create New Credit Top-Up Pack'}
        >
          <form onSubmit={handleSavePack} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pack ID *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingPack)}
                  value={packForm.id}
                  onChange={(e) => setPackForm({ ...packForm, id: e.target.value })}
                  placeholder="e.g. pack_100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono text-xs disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Credits Granted *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packForm.credits}
                  onChange={(e) => setPackForm({ ...packForm, credits: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-black text-purple-950 text-right"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pack Name *</label>
              <input
                type="text"
                required
                value={packForm.name}
                onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                placeholder="e.g. 100 AI Credits Top-Up"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Instant boost of AI credits for extra inquiries..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Price India (₹ INR) *</label>
                <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-purple-600">
                  <span className="font-black text-slate-600">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="200"
                    value={packForm.price_inr}
                    onChange={(e) => setPackForm({ ...packForm, price_inr: e.target.value })}
                    className="w-full bg-transparent font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">International ($ USD) *</label>
                <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:border-purple-600">
                  <span className="font-black text-slate-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="3.00"
                    value={packForm.price_usd}
                    onChange={(e) => setPackForm({ ...packForm, price_usd: e.target.value })}
                    className="w-full bg-transparent font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pack_active"
                checked={packForm.is_active}
                onChange={(e) => setPackForm({ ...packForm, is_active: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="pack_active" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                Active & available for purchase by users
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPackModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPack}
                className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold shadow-md disabled:opacity-50"
              >
                {savingPack ? 'Saving...' : editingPack ? 'Update Pack' : 'Create Pack'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AIControl;
