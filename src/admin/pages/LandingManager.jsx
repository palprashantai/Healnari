import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function AdminLandingManager() {
  const toast = useToast();
  
  // Mock State for Landing Page configurations
  const [heroTitle, setHeroTitle] = useState('Your Premier Partner in Women\'s Health');
  const [heroSubtitle, setHeroSubtitle] = useState('Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.');
  
  const [providerHeroTitle, setProviderHeroTitle] = useState('Empower Your Practice with HealNari');
  const [providerHeroSubtitle, setProviderHeroSubtitle] = useState('Join the leading digital platform for women\'s endocrinology and reproductive health. Focus on what you do best—delivering world-class clinical outcomes—while our AI EMR and automated patient acquisition handles the rest.');
  
  const [pricingAmount, setPricingAmount] = useState(799);
  const [platformCommissionRate, setPlatformCommissionRate] = useState(10);

  const [toggles, setToggles] = useState({
    showEmergencyBanner: false,
    showFeaturedDoctors: true,
    showTestimonials: true,
    showPricing: false,
    showNewsletter: true,
    showProviderTestimonials: true,
    showProviderCalculator: true,
    showProviderComparison: true
  });

  const [promoText, setPromoText] = useState('Use code HEALTH20 for 20% off your first consultation!');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' or 'provider'

  useEffect(() => {
    apiFetch('/admin/landing-settings')
      .then(d => {
        if (d) {
          setHeroTitle(d.heroTitle || '');
          setHeroSubtitle(d.heroSubtitle || '');
          setProviderHeroTitle(d.providerHeroTitle || '');
          setProviderHeroSubtitle(d.providerHeroSubtitle || '');
          if (d.pricingAmount !== undefined) setPricingAmount(d.pricingAmount);
          if (d.platformCommissionRate !== undefined) setPlatformCommissionRate(d.platformCommissionRate);
          setPromoText(d.promoText || '');
          setToggles(d.toggles || toggles);
        }
      })
      .catch(() => toast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      toast(`${key.replace('show', '')} section is now ${next[key] ? 'VISIBLE' : 'HIDDEN'}.`, 'info');
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await apiFetch('/admin/landing-settings', {
        method: 'PUT',
        body: { heroTitle, heroSubtitle, providerHeroTitle, providerHeroSubtitle, pricingAmount, platformCommissionRate, promoText, toggles }
      });
      toast('Platform & Landing settings saved successfully! Changes are live across the network.', 'success');
    } catch {
      toast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Landing Page Manager</h1>
          <p className="text-sm text-slate-500">Dynamically control the content and visibility of your public website.</p>
        </div>
        <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-save"></i> Publish Changes
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('patient')}
          className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'patient' ? 'border-aubergine-600 text-aubergine-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Patient Portal (/)
        </button>
        <button 
          onClick={() => setActiveTab('provider')}
          className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'provider' ? 'border-aubergine-600 text-aubergine-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Provider Portal (/for-doctors)
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        
        {/* Content Editor */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800"><i className="fas fa-pen-nib text-aubergine-500 mr-2"></i>Content Editor</h2>
          </div>
          <div className="p-5 space-y-5">
            {activeTab === 'patient' ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Hero Headline</label>
                  <input value={heroTitle} onChange={e => setHeroTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Hero Subtext</label>
                  <textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} rows="3"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-aubergine-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Pricing Amount (₹) [For CTA Section]</label>
                  <input type="number" value={pricingAmount} onChange={e => setPricingAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Top Promotional Banner Text</label>
                  <input value={promoText} onChange={e => setPromoText(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-amber-700 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Provider Hero Headline</label>
                  <input value={providerHeroTitle} onChange={e => setProviderHeroTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Provider Hero Subtext</label>
                  <textarea value={providerHeroSubtitle} onChange={e => setProviderHeroSubtitle(e.target.value)} rows="4"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-aubergine-100" />
                </div>
                <div className="bg-aubergine-50/60 border border-aubergine-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <i className="fas fa-globe text-aubergine-600"></i> Universal Platform Commission Rate
                    </label>
                    <span className="bg-aubergine-700 text-white font-black text-xs px-2.5 py-0.5 rounded-full">
                      {platformCommissionRate}% Flat
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Sets the universal platform take rate applied to all consultation bookings, doctor earnings, and disbursement calculations globally across HealNari. (Doctor retains {100 - Number(platformCommissionRate)}%).
                  </p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="5" 
                      max="30" 
                      step="1" 
                      value={platformCommissionRate} 
                      onChange={e => setPlatformCommissionRate(Number(e.target.value))} 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600" 
                    />
                    <span className="font-mono font-black text-slate-900 w-12 text-right">{platformCommissionRate}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Top Promotional Banner Text (Global)</label>
                  <input value={promoText} onChange={e => setPromoText(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-amber-700 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800"><i className="fas fa-toggle-on text-aubergine-600 mr-2"></i>Section Visibility</h2>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4 divide-y divide-slate-50">
              {Object.entries(toggles).filter(([key]) => activeTab === 'patient' ? !key.includes('Provider') && key !== 'showEmergencyBanner' : key.includes('Provider')).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between pt-3 first:pt-0">
                  <div>
                    <p className="font-bold text-slate-800">{key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{value ? 'Visible to public' : 'Hidden from public'}</p>
                  </div>
                  <button onClick={() => handleToggle(key)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${value ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
              {activeTab === 'patient' && (
                <div className="flex items-center justify-between pt-3 first:pt-0">
                  <div>
                    <p className="font-bold text-slate-800">Emergency Banner</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{toggles.showEmergencyBanner ? 'Visible to public' : 'Hidden from public'}</p>
                  </div>
                  <button onClick={() => handleToggle('showEmergencyBanner')}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${toggles.showEmergencyBanner ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${toggles.showEmergencyBanner ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              )}
            </div>
            <div className="mt-8 bg-aubergine-50/70 p-4 rounded-xl border border-aubergine-100 flex gap-3">
              <i className="fas fa-lightbulb text-aubergine-600 mt-0.5"></i>
              <p className="text-xs text-aubergine-800 font-medium">Hiding a section removes it from the navigation bar automatically. Your SEO metadata updates instantly upon saving.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLandingManager;
