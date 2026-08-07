import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';

function AdminLandingManager() {
  const toast = useToast();
  
  // Mock State for Landing Page configurations
  const [heroTitle, setHeroTitle] = useState('Your Premier Partner in Women\'s Health');
  const [heroSubtitle, setHeroSubtitle] = useState('Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.');
  
  const [toggles, setToggles] = useState({
    showEmergencyBanner: false,
    showFeaturedDoctors: true,
    showTestimonials: true,
    showPricing: false,
    showNewsletter: true
  });

  const [promoText, setPromoText] = useState('Use code HEALTH20 for 20% off your first consultation!');

  const handleToggle = (key) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      toast(`${key.replace('show', '')} section is now ${next[key] ? 'VISIBLE' : 'HIDDEN'}.`, 'info');
      return next;
    });
  };

  const handleSave = () => {
    toast('Landing page settings saved successfully! Changes are live.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Landing Page Manager</h1>
          <p className="text-sm text-slate-500">Dynamically control the content and visibility of your public website.</p>
        </div>
        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-save"></i> Publish Changes
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Content Editor */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800"><i className="fas fa-pen-nib text-aubergine-500 mr-2"></i>Content Editor</h2>
          </div>
          <div className="p-5 space-y-5">
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
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Top Promotional Banner Text</label>
              <input value={promoText} onChange={e => setPromoText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-amber-700 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
          </div>
        </div>

        {/* Section Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800"><i className="fas fa-toggle-on text-sky-500 mr-2"></i>Section Visibility</h2>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4 divide-y divide-slate-50">
              {Object.entries(toggles).map(([key, value]) => (
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
            </div>
            <div className="mt-8 bg-sky-50 p-4 rounded-xl border border-sky-100 flex gap-3">
              <i className="fas fa-lightbulb text-sky-500 mt-0.5"></i>
              <p className="text-xs text-sky-800 font-medium">Hiding a section removes it from the navigation bar automatically. Your SEO metadata updates instantly upon saving.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLandingManager;
