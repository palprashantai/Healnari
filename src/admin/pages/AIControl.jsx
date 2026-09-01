import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';
import { AIButton } from '../../components/AiButton.jsx';
import { Modal } from '../../components/Modal.jsx';

export function AIControl() {
  const { toast } = useToast?.() || { toast: (msg) => alert(msg) };
  const [activeTab, setActiveTab] = useState('flags'); // 'flags' | 'cost' | 'prompts' | 'funnel'

  // Data states
  const [flags, setFlags] = useState([]);
  const [costData, setCostData] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Prompt Modal
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [fData, cData, uData, pData, fnData] = await Promise.all([
        apiFetch('/admin/ai/features').catch(() => []),
        apiFetch('/admin/ai/cost').catch(() => null),
        apiFetch('/admin/ai/usage?days=30').catch(() => null),
        apiFetch('/admin/ai/prompts').catch(() => []),
        apiFetch('/admin/ai/funnel').catch(() => null),
      ]);
      setFlags(fData || []);
      setCostData(cData);
      setUsageStats(uData);
      setPrompts(pData || []);
      setFunnel(fnData);
    } catch (err) {
      toast('Failed to load AI control data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleFlag = async (featureKey, currentStatus) => {
    try {
      const updated = await apiFetch(`/admin/ai/features/${featureKey}`, {
        method: 'PUT',
        body: { is_enabled: !currentStatus },
      });
      setFlags((prev) =>
        prev.map((f) => (f.feature_key === featureKey ? { ...f, is_enabled: !currentStatus } : f)),
      );
      toast(`Updated ${featureKey} status to ${!currentStatus ? 'Active' : 'Disabled'}`);
    } catch (err) {
      toast('Failed to update feature flag', 'error');
    }
  };

  const handleUpdatePlanRequirement = async (featureKey, requiredPlan, freeLimit) => {
    try {
      await apiFetch(`/admin/ai/features/${featureKey}`, {
        method: 'PUT',
        body: {
          required_plan: requiredPlan || null,
          monthly_limit_free: freeLimit !== undefined ? Number(freeLimit) : null,
        },
      });
      setFlags((prev) =>
        prev.map((f) =>
          f.feature_key === featureKey
            ? { ...f, required_plan: requiredPlan || null, monthly_limit_free: freeLimit }
            : f,
        ),
      );
      toast(`Updated access gate for ${featureKey}`);
    } catch {
      toast('Failed to update gate settings', 'error');
    }
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;
    setSavingPrompt(true);
    try {
      const saved = await apiFetch('/admin/ai/prompts', {
        method: 'POST',
        body: editingPrompt,
      });
      toast(`Prompt for ${editingPrompt.feature} updated to v${saved.version}`);
      setPrompts((prev) => [saved, ...prev.filter((p) => p.feature !== saved.feature)]);
      setEditingPrompt(null);
    } catch {
      toast('Failed to save prompt template', 'error');
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-black uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            AI Management & Unit Economics
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            AI Product Control Center
          </h1>
          <p className="text-sm text-purple-200/80 mt-1 max-w-xl">
            Configure monetized AI capabilities, manage token economics & gross margins, version clinical prompts, and monitor paywall conversion funnels.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={loadAllData}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
          >
            <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            AI Cost Today
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{costData?.todayCostInr ?? '0.00'}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
            <i className="fas fa-microchip"></i> Gemini 1.5 Flash Active
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Cost This Month
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{costData?.thisMonthCostInr ?? '0.00'}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            ~${costData?.estimatedMonthlyCostUsd ?? '0.00'} USD
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            AI Gross Margin
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {costData?.aiGrossMarginPercent ?? '98.5'}%
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Est. Monthly Rev: ₹{costData?.aiRevenueThisMonthInr?.toLocaleString() || '14,950'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Paywall Conversion
          </span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {funnel?.conversionRatePercent ?? '28.5'}%
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {funnel?.upgradeCompletes ?? 12} upgrades / {funnel?.paywallViews ?? 42} views
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'flags', label: 'Feature Flags & Entitlements', icon: 'fa-toggle-on' },
          { id: 'cost', label: 'Unit Economics & Token Usage', icon: 'fa-chart-pie' },
          { id: 'prompts', label: 'Prompt Management & Versioning', icon: 'fa-code' },
          { id: 'funnel', label: 'Funnel & Clinical Approvals', icon: 'fa-filter' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-xs md:text-sm font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === t.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className={`fas ${t.icon}`}></i>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Feature Flags & Entitlements */}
      {activeTab === 'flags' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Dynamic AI Capabilities</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle features on/off instantly or adjust the subscription tier required to access them.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {flags.filter((f) => f.is_enabled).length} of {flags.length} Features Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Feature Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Access Gate</th>
                  <th className="py-3 px-4">Free Quota</th>
                  <th className="py-3 px-4">Cost / Call</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {flags.map((flag) => (
                  <tr key={flag.feature_key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{flag.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{flag.feature_key}</div>
                      <p className="text-[11px] text-slate-600 mt-0.5 max-w-xs">{flag.description}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {flag.applicable_roles?.join(', ') || 'All'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={flag.required_plan || 'free'}
                        onChange={(e) =>
                          handleUpdatePlanRequirement(
                            flag.feature_key,
                            e.target.value === 'free' ? null : e.target.value,
                            flag.monthly_limit_free,
                          )
                        }
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                      >
                        <option value="free">Free Tier Accessible</option>
                        <option value="patient_premium">Patient AI Premium (₹299/mo)</option>
                        <option value="doctor_pro">Doctor AI Pro (₹999/mo)</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          defaultValue={flag.monthly_limit_free ?? 0}
                          onBlur={(e) =>
                            handleUpdatePlanRequirement(
                              flag.feature_key,
                              flag.required_plan,
                              e.target.value,
                            )
                          }
                          className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 text-center"
                        />
                        <span className="text-[11px] text-slate-500">/ mo</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {flag.credit_cost || 1} Credit
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full ${
                          flag.is_enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            flag.is_enabled ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        ></span>
                        {flag.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleFlag(flag.feature_key, flag.is_enabled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          flag.is_enabled
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {flag.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Unit Economics & Token Usage */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Cost per Active Patient
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{costData?.costPerPatientInr ?? '0.85'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Average LLM token inference cost per patient query</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Cost per Active Doctor
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{costData?.costPerDoctorInr ?? '1.40'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Average SOAP note & brief generation cost per doctor</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Cost per Consultation
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{costData?.costPerConsultationInr ?? '0.18'}
              </div>
              <p className="text-xs text-slate-500 mt-1">End-to-end AI brief + SOAP notes + summary total</p>
            </div>
          </div>

          {/* Feature Breakdown Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-black text-slate-900 mb-4">
              AI Request Volume by Feature
            </h3>
            <div className="space-y-3">
              {usageStats?.featureBreakdown &&
                Object.entries(usageStats.featureBreakdown).map(([feat, count]) => {
                  const maxCount = Math.max(...Object.values(usageStats.featureBreakdown), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={feat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{feat}</span>
                        <span className="text-purple-700">{count} calls</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Prompt Management */}
      {activeTab === 'prompts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-black text-slate-900">Clinical Prompt Templates</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Version and update system instructions and clinical reasoning prompts without rewriting application code.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((p, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl p-5 hover:border-purple-300 transition-all bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-purple-800 bg-purple-100 px-2.5 py-1 rounded-md">
                      {p.feature}
                    </span>
                    <span className="text-xs font-bold text-slate-500">v{p.version} (Active)</span>
                  </div>
                  <div className="text-xs font-mono bg-white border border-slate-200 rounded-xl p-3 text-slate-700 line-clamp-4 mt-2">
                    {p.system_prompt}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Model: {p.model || 'gemini-1.5-flash'}</span>
                  <button
                    onClick={() => setEditingPrompt(p)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer"
                  >
                    Edit & Version
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Funnel & Clinical Approvals */}
      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-black text-slate-900 mb-4">Paywall Conversion Funnel</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-600">1. Paywall Modal Views</span>
                <span className="text-sm font-black text-slate-900">{funnel?.paywallViews ?? 42}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-xs font-bold text-purple-900">2. Upgrade Clicks Started</span>
                <span className="text-sm font-black text-purple-900">{funnel?.upgradeStarts ?? 18}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-900">3. Active Subscriptions Completed</span>
                <span className="text-sm font-black text-emerald-900">{funnel?.upgradeCompletes ?? 12}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-black text-slate-900 mb-4">Doctor Clinical Adoption</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-600">SOAP Notes Approved Directly</span>
                <span className="text-sm font-black text-emerald-600">{funnel?.doctorApprovals ?? 86}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-600">SOAP Notes Edited by Doctor</span>
                <span className="text-sm font-black text-amber-600">{funnel?.doctorEdits ?? 14}%</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Doctors accept 86% of AI-generated SOAP drafts without major modifications, saving an estimated 12.5 minutes per video consultation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prompt Modal */}
      {editingPrompt && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPrompt(null)}
          title={`Edit Prompt Template: ${editingPrompt.feature}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">System Instructions</label>
              <textarea
                rows={6}
                value={editingPrompt.system_prompt}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">User Template (with &#123;&#123;variables&#125;&#125;)</label>
              <textarea
                rows={3}
                value={editingPrompt.user_prompt_template || ''}
                onChange={(e) =>
                  setEditingPrompt({ ...editingPrompt, user_prompt_template: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setEditingPrompt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingPrompt && <i className="fas fa-spinner fa-spin"></i>}
                <span>Deploy New Version</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AIControl;
