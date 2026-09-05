import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { GlobalCommissionModal } from '../components/GlobalCommissionModal.jsx';

function AdminDoctorManager() {
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [templates, setTemplates] = useState([]);
  const [dbSpecialties, setDbSpecialties] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [commissionInfo, setCommissionInfo] = useState({ currentRate: 10, history: [] });
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  const fetchDoctors = useCallback(() => {
    setLoading(true);
    apiFetch('/admin/clinics')
      .then(d => setDoctors(d || []))
      .catch(() => toast('Failed to load doctors', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const fetchCommission = useCallback(() => {
    apiFetch('/admin/commission')
      .then(d => { if (d) setCommissionInfo(d); })
      .catch(() => setCommissionInfo({ currentRate: 10, history: [] }));
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchCommission();
    apiFetch('/admin/communications/templates')
      .then(d => setTemplates(d || []))
      .catch(console.error);
    apiFetch('/admin/specialties')
      .then(d => setDbSpecialties(d || []))
      .catch(console.error);
  }, [fetchDoctors, fetchCommission]);

  const handleUpdateCommission = async (newRate, reason) => {
    await apiFetch('/admin/commission', {
      method: 'PUT',
      body: { commissionRate: newRate, reason },
    });
    setCommissionInfo(prev => ({
      ...prev,
      currentRate: newRate,
      history: [
        {
          id: `h-${Date.now()}`,
          previous_rate: prev.currentRate,
          new_rate: newRate,
          effective_from: new Date().toISOString(),
          change_reason: reason,
        },
        ...(prev.history || []),
      ],
    }));
    fetchDoctors();
  };

  const specialties = ['All', ...dbSpecialties.map(s => s.name)];

  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (d.name || '').toLowerCase().includes(q) ||
        (d.id || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.specialty || '').toLowerCase().includes(q);
      const matchSpecialty = filterSpecialty === 'All' || d.specialty === filterSpecialty;
      const matchStatus = filterStatus === 'All' || (d.status || '').toLowerCase() === filterStatus.toLowerCase();
      return matchSearch && matchSpecialty && matchStatus;
    });
  }, [doctors, search, filterSpecialty, filterStatus]);

  // Aggregate Metrics for Top Cards
  const totalClinicians = doctors.length;
  const activeClinicians = doctors.filter(d => (d.status || '').toLowerCase() === 'active').length;
  const verifiedClinicians = doctors.filter(d => Boolean(d.verified ?? d.kyc_verified)).length;
  const totalNetworkConsults = doctors.reduce((acc, d) => acc + Number(d.totalConsults ?? d.totalAppointments ?? 0), 0);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? filteredDoctors.map(d => d.id) : []);
  };

  const handleSelectOne = (e, id) => {
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const openMessageModal = (type) => {
    if (selectedIds.length === 0) {
      toast('Please select at least one doctor first.', 'error');
      return;
    }
    setMessageType(type);
    setIsActionsDropdownOpen(false);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    try {
      const res = await apiFetch('/admin/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: messageText.slice(0, 60),
          audience: `${selectedIds.length} selected doctors`,
          body: messageText,
          userIds: selectedIds,
          channels: [messageType === 'push' ? 'Push' : 'Email'],
        },
      });
      if (messageType === 'push') {
        toast(`Push notification delivered to ${res.recipient_count ?? 0} doctor(s).`, 'success');
      } else {
        toast('Broadcast recorded successfully.', 'success');
      }
    } catch {
      toast('Send failed', 'error');
    }
    setIsMessageModalOpen(false);
    setSelectedIds([]);
    setMessageText('');
    setSelectedTemplate('');
  };

  const handleExport = () => {
    if (filteredDoctors.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Specialty', 'Status', 'Verified', 'Consultations', 'Platform Earnings', 'Total Gross Revenue'];
    const rows = filteredDoctors.map(d => {
      const totalGross = Number(d.totalGross ?? d.totalRevenue ?? 0);
      const platformEarnings = Number(d.totalPlatformFee ?? 0);
      const isVerified = Boolean(d.verified ?? d.kyc_verified);
      const totalConsults = d.totalConsults ?? d.totalAppointments ?? 0;
      return [
        d.id,
        `"${d.name || ''}"`,
        `"${d.email || ''}"`,
        `"${d.specialty || ''}"`,
        d.status || 'Active',
        isVerified ? 'Yes' : 'No',
        totalConsults,
        Math.round(platformEarnings),
        Math.round(totalGross)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `healnari_doctor_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Doctor directory exported successfully', 'success');
  };

  const clearFilters = () => {
    setSearch('');
    setFilterSpecialty('All');
    setFilterStatus('All');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-aubergine-50 border border-aubergine-100 flex items-center justify-center text-aubergine-700 text-lg shadow-xs">
              <i className="fas fa-user-doctor"></i>
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Network Directory</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage credentialed healthcare providers, consultation metrics, and AI EMR tiers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setIsCommissionModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs hover:border-slate-300"
          >
            <i className="fas fa-sliders text-aubergine-600"></i> Global Commission Settings
          </button>

          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)} 
              className="bg-slate-900 hover:bg-aubergine-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
            >
              <i className="fas fa-paper-plane text-aubergine-300 text-[10px]"></i>
              <span>Broadcast ({selectedIds.length})</span>
              <i className="fas fa-chevron-down text-[10px] opacity-70"></i>
            </button>
            {isActionsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 animate-fade-in">
                <p className="px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Messaging</p>
                <button 
                  type="button"
                  onClick={() => openMessageModal('email')} 
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <i className="fas fa-envelope text-aubergine-600 w-4"></i> Send Email
                </button>
                <button 
                  type="button"
                  onClick={() => openMessageModal('push')} 
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <i className="fas fa-bell text-amber-500 w-4"></i> Send Push Notification
                </button>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleExport}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-file-csv text-emerald-600"></i> Export
          </button>
        </div>
      </div>

      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-aubergine-50 border border-aubergine-100 flex items-center justify-center text-aubergine-700 text-lg shrink-0">
            <i className="fas fa-users-medical"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Physicians</p>
            <p className="text-xl font-black text-slate-900 font-sans mt-0.5">{totalClinicians}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg shrink-0">
            <i className="fas fa-user-check"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Doctors</p>
            <p className="text-xl font-black text-emerald-700 font-sans mt-0.5">{activeClinicians}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg shrink-0">
            <i className="fas fa-badge-check"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KYC Verified</p>
            <p className="text-xl font-black text-slate-900 font-sans mt-0.5">{verifiedClinicians}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg shrink-0">
            <i className="fas fa-video"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultations</p>
            <p className="text-xl font-black text-slate-900 font-sans mt-0.5">{totalNetworkConsults.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Unified Search & Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative flex-1 max-w-md">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by doctor name, specialty, or email..."
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-100 transition-all shadow-2xs" 
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select 
                value={filterSpecialty} 
                onChange={e => setFilterSpecialty(e.target.value)} 
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-100 appearance-none pr-8 cursor-pointer shadow-2xs"
              >
                {specialties.map(s => <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>)}
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>

            <div className="relative">
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-100 appearance-none pr-8 cursor-pointer shadow-2xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>

            <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs ml-auto sm:ml-0 whitespace-nowrap">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'physician' : 'physicians'}
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 accent-aubergine-600 cursor-pointer" 
                    onChange={handleSelectAll} 
                    checked={filteredDoctors.length > 0 && selectedIds.length === filteredDoctors.length} 
                  />
                </th>
                <th className="px-5 py-3.5 font-bold">Doctor Info</th>
                <th className="px-5 py-3.5 font-bold">AI Clinical Plan</th>
                <th className="px-5 py-3.5 font-bold">Status &amp; Verification</th>
                <th className="px-5 py-3.5 font-bold text-center">Consultations</th>
                <th className="px-5 py-3.5 font-bold text-right">Practice Revenue</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="7" className="px-5 py-4">
                      <div className="animate-pulse h-12 bg-slate-100 rounded-xl"></div>
                    </td>
                  </tr>
                ))
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-lg mx-auto">
                        <i className="fas fa-user-slash"></i>
                      </div>
                      <p className="text-sm font-bold text-slate-700">No doctors match your filters</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or status filter.</p>
                      <button 
                        type="button" 
                        onClick={clearFilters}
                        className="text-xs font-bold text-aubergine-600 hover:text-aubergine-700 bg-aubergine-50 px-3 py-1.5 rounded-lg transition-colors inline-block mt-1"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map(d => {
                  const totalGross = Number(d.totalGross ?? d.totalRevenue ?? 0);
                  const platformEarnings = Number(d.totalPlatformFee ?? 0);
                  const isVerified = Boolean(d.verified ?? d.kyc_verified);
                  const totalConsults = d.totalConsults ?? d.totalAppointments ?? 0;
                  const initials = (d.name || 'Dr')
                    .replace(/^Dr\.?\s*/i, '')
                    .split(' ')
                    .map(n => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'DR';

                  return (
                    <tr 
                      key={d.id} 
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        selectedIds.includes(d.id) ? 'bg-aubergine-50/40' : ''
                      }`}
                    >
                      <td className="px-5 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 accent-aubergine-600 cursor-pointer" 
                          checked={selectedIds.includes(d.id)} 
                          onChange={(e) => handleSelectOne(e, d.id)} 
                        />
                      </td>

                      {/* Doctor Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aubergine-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-slate-900 text-sm truncate">{d.name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-aubergine-700 bg-aubergine-50 border border-aubergine-100 px-1.5 py-0.5 rounded">
                                {d.specialty || 'General Practitioner'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {d.id.slice(0, 8)}…
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* AI Plan */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            d.aiPlan?.id === 'doctor_plan_3'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : d.aiPlan?.id === 'doctor_plan_2'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {d.aiPlan?.name || 'Doctor Starter'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium pl-1">
                            {d.aiPlan?.creditsUsed || 0}/{d.aiPlan?.monthlyCredits || 25} credits used
                          </span>
                        </div>
                      </td>

                      {/* Status / Verification */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                            d.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            {d.status || 'Active'}
                          </span>
                          {isVerified ? (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pl-1">
                              <i className="fas fa-certificate text-[9px]"></i> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 pl-1">
                              <i className="fas fa-clock text-[9px]"></i> Pending KYC
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Consultations */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-black text-slate-800 text-base block font-sans">
                          {totalConsults}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">consults</span>
                      </td>

                      {/* Practice Revenue */}
                      <td className="px-5 py-4 text-right">
                        <p className="font-black text-slate-900 font-sans text-sm">
                          {formatCurrency(totalGross, 'INR')}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Platform Share: <strong className="text-aubergine-700 font-bold">{formatCurrency(platformEarnings, 'INR')}</strong>
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Link 
                          to={`/admin-dashboard/doctors/${d.id}`} 
                          className="bg-slate-900 hover:bg-aubergine-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <span>View Dashboard</span>
                          <i className="fas fa-chevron-right text-[9px] opacity-70"></i>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center bg-slate-50/50">
          <span>Showing {filteredDoctors.length} of {doctors.length} doctors</span>
          <span className="text-[11px] text-slate-400">All financial disbursements auto-reconcile with Stripe &amp; Razorpay ledgers.</span>
        </div>
      </div>

      {/* Bulk Message Modal */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title={`Bulk ${messageType === 'push' ? 'Push Notification' : 'Email'} Broadcast`} size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Broadcasting to <strong className="text-slate-800">{selectedIds.length}</strong> selected physician(s).
          </p>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Select Template</label>
            <select 
              value={selectedTemplate} 
              onChange={e => { 
                setSelectedTemplate(e.target.value); 
                const t = templates.find(t => t.id === e.target.value); 
                if (t) setMessageText(t.content); 
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-200"
            >
              <option value="">-- Custom Message --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Message Body</label>
            <textarea 
              value={messageText} 
              onChange={e => setMessageText(e.target.value)} 
              rows="5"
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-aubergine-200 outline-none"
              placeholder="Type announcement or notification content here..." 
            />
          </div>
          <button 
            type="button"
            onClick={handleSendMessage} 
            className="w-full bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <i className="fas fa-paper-plane text-xs"></i> Send {messageType === 'push' ? 'Push Notification' : 'Email'}
          </button>
        </div>
      </Modal>

      {/* Global Commission Modal */}
      <GlobalCommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        currentRate={commissionInfo.currentRate}
        history={commissionInfo.history}
        onUpdate={handleUpdateCommission}
      />
    </div>
  );
}

export default AdminDoctorManager;
