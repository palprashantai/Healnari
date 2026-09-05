import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAdminScope, GLOBAL_SCOPE } from '../../context/AdminScopeContext.jsx';
import { useToast } from '../../components/Toast.jsx';

export function FacilityScopeSelector() {
  const { scope, setScope, resetScope, clinics, specialties, regions, loadingClinics } = useAdminScope();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('clinics'); // 'clinics' | 'specialties' | 'regions'
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const toast = useToast();

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isGlobal = scope.type === 'global' || scope.id === 'ALL';

  const filteredClinics = useMemo(() => {
    if (!searchQuery) return clinics;
    const q = searchQuery.toLowerCase();
    return clinics.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.specialty || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clinics, searchQuery]);

  const filteredSpecialties = useMemo(() => {
    if (!searchQuery) return specialties;
    const q = searchQuery.toLowerCase();
    return specialties.filter(s =>
      s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [specialties, searchQuery]);

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return regions;
    const q = searchQuery.toLowerCase();
    return regions.filter(r => r.label.toLowerCase().includes(q));
  }, [regions, searchQuery]);

  const handleSelectScope = (newScope) => {
    setScope(newScope);
    setIsOpen(false);
    setSearchQuery('');
    toast(`Workspace scoped to: ${newScope.label}`, 'info');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    resetScope();
    setIsOpen(false);
    toast('Workspace reset to All Enterprise Facilities (Global)', 'info');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-xs ${
            !isGlobal
              ? 'bg-aubergine-50 border-aubergine-300 text-aubergine-900 ring-1 ring-aubergine-200'
              : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-200'
          }`}
          title={scope.label}
        >
          <i className={`fas ${scope.icon || 'fa-building-circle-check'} ${!isGlobal ? 'text-aubergine-700' : 'text-slate-500'}`}></i>
          <span className="hidden sm:inline-block max-w-[150px] md:max-w-[210px] truncate text-left">
            {scope.label}
          </span>
          <i className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180 text-slate-700' : 'text-slate-400'}`}></i>
        </button>

        {!isGlobal && (
          <button
            type="button"
            onClick={handleClear}
            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 flex items-center justify-center text-[10px] transition-colors"
            title="Clear scope and reset to Global"
          >
            <i className="fas fa-xmark"></i>
          </button>
        )}
      </div>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute -right-8 sm:right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-fade-in text-slate-800">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Facility Domain Scope
                </span>
              </div>
              <button
                onClick={handleClear}
                className="text-[11px] font-bold text-aubergine-700 hover:text-aubergine-900 transition-colors"
              >
                Reset to Global
              </button>
            </div>

            {/* Scope Search */}
            <div className="relative">
              <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clinics, specialties, regions..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-aubergine-500 focus:ring-1 focus:ring-aubergine-200 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <i className="fas fa-circle-xmark"></i>
                </button>
              )}
            </div>

            {/* Scope Sub-Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('clinics')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'clinics'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fas fa-stethoscope text-[10px]"></i> Clinics ({clinics.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specialties')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'specialties'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fas fa-layer-group text-[10px]"></i> Specialties
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('regions')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'regions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fas fa-earth-americas text-[10px]"></i> Regions
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs p-1">
            {/* Global Reset Option Always Available at Top */}
            <button
              onClick={() => handleSelectScope(GLOBAL_SCOPE)}
              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                isGlobal
                  ? 'bg-aubergine-50/80 font-extrabold text-aubergine-900'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs">
                  <i className="fas fa-building-circle-check"></i>
                </div>
                <div>
                  <p className="font-extrabold text-xs">All Enterprise Facilities (Global)</p>
                  <p className="text-[10px] text-slate-500 font-normal">Unrestricted platform-wide operational overview</p>
                </div>
              </div>
              {isGlobal && <i className="fas fa-check text-emerald-600 font-bold"></i>}
            </button>

            {/* TAB 1: Registered Clinics & Physicians */}
            {activeTab === 'clinics' && (
              <div className="pt-1 space-y-0.5">
                {loadingClinics && clinics.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs space-y-1">
                    <i className="fas fa-spinner fa-spin text-sm text-aubergine-600"></i>
                    <p>Loading registered facilities & clinics...</p>
                  </div>
                ) : filteredClinics.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No doctor practices match "{searchQuery}"
                  </div>
                ) : (
                  filteredClinics.map((doc) => {
                    const isSelected = scope.type === 'clinic' && scope.id === doc.id;
                    const initials = (doc.full_name || 'Dr')
                      .replace('Dr.', '')
                      .trim()
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <button
                        key={doc.id}
                        onClick={() =>
                          handleSelectScope({
                            type: 'clinic',
                            id: doc.id,
                            label: doc.full_name || 'Physician Practice',
                            sublabel: `${doc.specialty || 'General'} • ${doc.totalConsults || 0} Consults`,
                            icon: 'fa-user-doctor',
                            doctorId: doc.id,
                            specialty: doc.specialty,
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-aubergine-50/80 font-bold text-aubergine-950'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-aubergine-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-extrabold text-xs text-slate-900 truncate">
                              {doc.full_name || 'Dr. Specialist'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              <span className="uppercase font-semibold text-aubergine-700">{doc.specialty || 'Specialist'}</span>
                              {' • '}{doc.totalConsults ?? 0} consults
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {isSelected && <i className="fas fa-check text-emerald-600 text-xs"></i>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Specialties */}
            {activeTab === 'specialties' && (
              <div className="pt-1 space-y-0.5">
                {filteredSpecialties.map((spec) => {
                  const isSelected = scope.type === 'specialty' && scope.id === spec.id;
                  return (
                    <button
                      key={spec.id}
                      onClick={() =>
                        handleSelectScope({
                          type: 'specialty',
                          id: spec.id,
                          label: spec.label,
                          icon: spec.icon,
                          specialty: spec.id,
                        })
                      }
                      className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-aubergine-50/80 font-bold text-aubergine-950'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-aubergine-50 text-aubergine-700 border border-aubergine-100 flex items-center justify-center text-xs">
                          <i className={`fas ${spec.icon}`}></i>
                        </div>
                        <span className="font-bold text-xs text-slate-800">{spec.label}</span>
                      </div>
                      {isSelected && <i className="fas fa-check text-emerald-600 text-xs"></i>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 3: Regions */}
            {activeTab === 'regions' && (
              <div className="pt-1 space-y-0.5">
                {filteredRegions.map((reg) => {
                  const isSelected = scope.type === 'region' && scope.id === reg.id;
                  return (
                    <button
                      key={reg.id}
                      onClick={() =>
                        handleSelectScope({
                          type: 'region',
                          id: reg.id,
                          label: reg.label,
                          flag: reg.flag,
                          icon: reg.icon,
                          country: reg.id,
                          currency: reg.id === 'IN' ? 'INR' : 'USD',
                        })
                      }
                      className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-aubergine-50/80 font-bold text-aubergine-950'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{reg.flag}</span>
                        <span className="font-bold text-xs text-slate-800">{reg.label}</span>
                      </div>
                      {isSelected && <i className="fas fa-check text-emerald-600 text-xs"></i>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Scoped context applies across Telemetry &amp; Directory</span>
            <span className="font-extrabold text-aubergine-800 uppercase text-[9px] tracking-wider">
              {scope.type}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
