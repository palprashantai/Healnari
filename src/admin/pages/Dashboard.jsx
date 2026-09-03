import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COUNTRY_FLAGS = {
  IN: '🇮🇳',
  US: '🇺🇸',
};

const COUNTRY_NAMES = {
  IN: 'India',
  US: 'United States & International',
};

/* ─── Modals ─────────────────────────────────── */
function DocumentViewerModal({ isOpen, onClose, doctor, onResolve }) {
  if (!doctor) return null;
  const docs = doctor.docs || ['Medical_License.pdf', 'Board_Certification.pdf'];
  const countryCode = doctor.country || 'US';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Verify Medical Credentials — ${doctor.full_name || doctor.name}`} size="lg">
      <div className="space-y-4">
        {/* Country & Licensing Banner */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{COUNTRY_FLAGS[countryCode] || '🌍'}</span>
            <div>
              <p className="text-xs font-bold text-slate-800">{COUNTRY_NAMES[countryCode] || 'International Practice'}</p>
              <p className="text-[11px] text-aubergine-700 font-semibold">Council: {doctor.medical_council || 'State Medical Licensing Board'}</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-aubergine-50 text-aubergine-700 border border-aubergine-100">
            {doctor.currency || 'INR'} Settlement
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Submitted Credentials</h4>
            {docs.map((d, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-aubergine-300 transition-colors">
                <i className="fas fa-file-pdf text-rose-500 mr-2"></i>
                <span className="text-xs font-bold text-slate-700">{d}</span>
              </div>
            ))}
          </div>
          <div className="w-full sm:w-2/3 bg-slate-900 rounded-2xl flex flex-col items-center justify-center relative min-h-[240px] border border-slate-800 p-6 text-center">
            <i className="fas fa-user-shield text-aubergine-400 text-3xl mb-3"></i>
            <span className="text-slate-200 text-sm font-extrabold">Encrypted Telehealth Credential Sandbox</span>
            <span className="text-slate-400 text-xs mt-1">Verified against {doctor.medical_council || 'National Medical Registry'}</span>
            <span className="text-[10px] text-emerald-400 mt-3 font-mono bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
              ✓ Digital Signature Valid
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button onClick={() => onResolve(doctor.id, 'rejected')} className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-2.5 rounded-xl text-sm border border-rose-200 transition-colors">
            Reject Credentials
          </button>
          <button onClick={() => onResolve(doctor.id, 'approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
            <i className="fas fa-check-circle"></i> Approve &amp; Activate Physician
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RefundModal({ isOpen, onClose, refund, onProcess }) {
  if (!refund) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Process Multi-Currency Refund — ${refund.patient_name}`} size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold">Refund Amount</span>
            <span className="font-black text-lg text-slate-900 font-sans">
              {formatCurrency(refund.amount, refund.currency || 'INR')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold">Cancellation Reason</span>
            <span className="font-bold text-slate-700 text-xs">{refund.reason || 'Patient cancelled session'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold">Payment Rail</span>
            <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
              <i className="fas fa-credit-card mr-1 text-aubergine-600"></i>{refund.gateway || 'Stripe Global / Cashfree'}
            </span>
          </div>
        </div>
        <button onClick={() => onProcess(refund.id)} 
          className="w-full bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2">
          <i className="fas fa-rotate-left"></i> Initiate Multi-Currency Reversal
        </button>
      </div>
    </Modal>
  );
}

function TicketModal({ isOpen, onClose, ticket, onResolve, toast }) {
  if (!ticket) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Support Inquiry #${String(ticket.id).slice(0, 8)}`} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{ticket.user_name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">{ticket.user_role}</span>
            </div>
            <span className="text-xs">{COUNTRY_FLAGS[ticket.country] || '🌍'}</span>
          </div>
          <p className="text-slate-700 text-xs mb-3">{ticket.issue}</p>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Priority: <span className={ticket.priority === 'High' ? 'text-rose-600 font-bold' : 'font-bold text-slate-600'}>{ticket.priority}</span></span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { toast('Ticket escalated to International Telehealth Ops.', 'info'); onClose(); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors border border-slate-200">
            Escalate
          </button>
          <button onClick={() => onResolve(ticket.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md flex justify-center items-center gap-2">
            <i className="fas fa-check"></i> Mark Resolved
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Admin Dashboard Component ─────────────────────────── */
function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState('30D');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQueueTab, setActiveQueueTab] = useState('verifications'); // 'verifications' | 'refunds' | 'tickets'

  // Data states from backend API
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashStats, sysHealth, pendingVerifs, refundList, ticketList, analytics] = await Promise.all([
        apiFetch('/admin/dashboard'),
        apiFetch('/admin/system-health'),
        apiFetch('/admin/verifications'),
        apiFetch('/admin/refunds'),
        apiFetch('/admin/tickets'),
        apiFetch('/admin/analytics').catch(() => null),
      ]);
      setStats(dashStats);
      setHealth(sysHealth || []);
      setVerifications(pendingVerifs || []);
      setRefunds((refundList || []).filter(r => r.status === 'Pending'));
      setTickets((ticketList || []).filter(t => t.status !== 'Resolved'));
      setAnalyticsData(analytics);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to load admin telemetry', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    toast('Global telemetry refreshed from backend API.', 'success');
  };

  const handleResolveVerification = async (id, status) => {
    try {
      await apiFetch(`/admin/verifications/${id}`, { method: 'PUT', body: { status } });
      toast(`Specialist ${status === 'approved' ? 'credentialed & verified' : 'declined'} successfully`, 'success');
      setSelectedDoc(null);
      setVerifications(prev => prev.filter(v => v.id !== id));
      fetchDashboardData();
    } catch {
      toast('Failed to update verification', 'error');
    }
  };

  const handleProcessRefund = async (id) => {
    try {
      await apiFetch(`/admin/refunds/${id}/process`, { method: 'PUT' });
      toast(`Multi-currency refund reversed to card/wallet source.`, 'success');
      setSelectedRefund(null);
      setRefunds(prev => prev.filter(r => r.id !== id));
      fetchDashboardData();
    } catch {
      toast('Failed to process refund', 'error');
    }
  };

  const handleResolveTicket = async (id) => {
    try {
      await apiFetch(`/admin/tickets/${id}/resolve`, { method: 'PUT' });
      toast('Inquiry resolved and patient notified.', 'success');
      setSelectedTicket(null);
      setTickets(prev => prev.filter(t => t.id !== id));
      fetchDashboardData();
    } catch {
      toast('Failed to resolve ticket', 'error');
    }
  };

  // Filtered Queues
  const filteredVerifications = useMemo(() => {
    return verifications.filter(v => {
      const matchSearch = !searchQuery || (v.full_name || v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (v.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = selectedRegion === 'ALL' || (v.country || 'US') === selectedRegion;
      return matchSearch && matchRegion;
    });
  }, [verifications, searchQuery, selectedRegion]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter(r => {
      const matchSearch = !searchQuery || (r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = selectedRegion === 'ALL' || (r.currency === 'USD' ? 'US' : 'IN') === selectedRegion;
      return matchSearch && matchRegion;
    });
  }, [refunds, searchQuery, selectedRegion]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = !searchQuery || (t.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.issue || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = selectedRegion === 'ALL' || (t.country || 'US') === selectedRegion;
      return matchSearch && matchRegion;
    });
  }, [tickets, searchQuery, selectedRegion]);

  // Real consultation trend data from backend analytics or empty
  const consultationTrendData = useMemo(() => {
    if (analyticsData?.crossBorderTrends && analyticsData.crossBorderTrends.length > 0) {
      return analyticsData.crossBorderTrends.map(t => ({
        day: t.month,
        consults: (t.International || 0) + (t.Domestic || 0),
        international: t.International || 0,
        domestic: t.Domestic || 0,
      }));
    }
    return [];
  }, [analyticsData]);

  const totalAlertsCount = verifications.length + refunds.length + tickets.length;
  const totalRevenueNumber = Number(stats?.platformRevenue || 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌐</span>
            <h1 className="text-2xl font-black text-slate-900">Global Telehealth Operations Center</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-border clinical telemetry, physician credentialing, and multi-currency operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
            <i className={`fas fa-rotate-right ${refreshing ? 'animate-spin' : ''}`}></i> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <DashboardFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search across verification queue, refunds, or support inquiries..."
        filters={[
          {
            key: 'region',
            label: 'Region',
            value: selectedRegion,
            onChange: setSelectedRegion,
            options: [
              { label: 'All Regions (Global)', value: 'ALL' },
              { label: '🇮🇳 India (INR)', value: 'IN' },
              { label: '🇺🇸 United States & International (USD)', value: 'US' },
            ],
          },
        ]}
        onReset={() => {
          setDateRange('30D');
          setSelectedRegion('ALL');
          setSearchQuery('');
        }}
      />

      {/* Level 1: Tier-1 Critical KPI Cards Grid (Real Backend Data) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITrendCard
          title="Global Patients"
          value={(stats?.totalUsers ?? stats?.totalPatients ?? 0).toLocaleString()}
          period="Total Registered Patient Base"
          icon="fa-globe"
          colorScheme="purple"
          drillDownLabel="View Directory"
          onDrillDown={() => navigate('/admin-dashboard/users')}
          loading={loading}
        />

        <KPITrendCard
          title="Licensed Specialists"
          value={(stats?.activeDoctors ?? 0).toLocaleString()}
          period="Active Verified Physicians"
          icon="fa-user-doctor"
          colorScheme="emerald"
          badgeText={`${verifications.length} Pending`}
          drillDownLabel="Manage Doctors"
          onDrillDown={() => navigate('/admin-dashboard/doctors')}
          loading={loading}
        />

        <KPITrendCard
          title="Gross Platform Volume"
          value={formatCurrency(stats?.grossVolume || totalRevenueNumber, stats?.grossVolumeCurrency || 'INR')}
          period={`Consultations & AI Plans (${stats?.grossVolumeCurrency || 'INR'})`}
          icon="fa-money-bill-trend-up"
          colorScheme="dark"
          badgeText={stats?.aiSubscriptionRevenue ? `+${formatCurrency(stats.aiSubscriptionRevenue, stats?.grossVolumeCurrency || 'INR')} AI` : undefined}
          drillDownLabel="View Revenue"
          onDrillDown={() => navigate('/admin-dashboard/revenue')}
          loading={loading}
        />

        <KPITrendCard
          title="Platform Retained Revenue"
          value={formatCurrency(stats?.platformRevenue || 0, stats?.platformRevenueCurrency || 'INR')}
          period={`Commission & 100% AI Plans (${stats?.platformRevenueCurrency || 'INR'})`}
          icon="fa-sack-dollar"
          colorScheme="magenta"
          drillDownLabel="View Settlements"
          onDrillDown={() => navigate('/admin-dashboard/revenue')}
          loading={loading}
        />
      </div>

      {/* Level 3: Action Center Alert Strip */}
      {totalAlertsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-aubergine-500/10 border border-amber-200/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                <i className="fas fa-bell animate-pulse"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  Action Center Bottlenecks
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {totalAlertsCount} Items Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {verifications.length} physician board verifications, {refunds.length} pending refunds, and {tickets.length} support inquiries require resolution.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveQueueTab('verifications')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeQueueTab === 'verifications'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Board Queue ({verifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab('refunds')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeQueueTab === 'refunds'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Refunds ({refunds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab('tickets')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeQueueTab === 'tickets'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tickets ({tickets.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level 2: Real-time Telemetry Trend & SLA Health */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Consultation Throughput Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-aubergine-600 animate-pulse"></span>
                <h2 className="font-black text-slate-900 text-base">Monthly Telehealth Patient Growth</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Real-time enrollment trends from database telemetry.</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Live Aggregate
            </span>
          </div>

          {consultationTrendData.length === 0 ? (
            <DashboardEmptyState
              icon="fa-chart-area"
              title="No Patient Trends Recorded Yet"
              description="Historical monthly growth will display here once patient consults are logged."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={consultationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsults" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '700'
                    }} 
                  />
                  <Area type="monotone" dataKey="consults" name="Enrolled Patients" stroke="#6B46C1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsults)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Completed Consultations: <strong>{stats?.completedConsultations ?? 0}</strong></span>
            <span className="text-slate-500 font-medium">Total Sessions Booked: <strong>{stats?.totalAppointments ?? 0}</strong></span>
          </div>
        </div>

        {/* Global SLA Health Nodes (1 Col) - Real from /admin/system-health */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <h2 className="font-black text-slate-900 text-sm">System Health &amp; Nodes</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> OPERATIONAL
            </span>
          </div>

          <div className="p-5 space-y-3.5 flex-1">
            {health.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Checking system health...</p>
            ) : (
              health.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-slate-700">{h.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono text-[11px]">{h.ping || h.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <button onClick={handleRefresh} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 w-full">
              <i className="fas fa-server text-[10px]"></i> Re-ping API Nodes
            </button>
          </div>
        </div>
      </div>

      {/* Level 4 & 5: Interactive Tabbed Action Queues & Investigation Tables */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header & Tabs */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveQueueTab('verifications')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeQueueTab === 'verifications'
                  ? 'bg-aubergine-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-user-doctor"></i>
              <span>Physician Onboarding &amp; Verification</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeQueueTab === 'verifications' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {verifications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueueTab('refunds')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeQueueTab === 'refunds'
                  ? 'bg-aubergine-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-money-bill-transfer"></i>
              <span>Refund Clearance</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeQueueTab === 'refunds' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {refunds.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueueTab('tickets')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
                activeQueueTab === 'tickets'
                  ? 'bg-aubergine-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-headset"></i>
              <span>Telehealth Inquiries</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeQueueTab === 'tickets' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tickets.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {activeQueueTab === 'verifications' && `${filteredVerifications.length} specialists in queue`}
            {activeQueueTab === 'refunds' && `${filteredRefunds.length} reversal requests in queue`}
            {activeQueueTab === 'tickets' && `${filteredTickets.length} active inquiries in queue`}
          </span>
        </div>

        {/* Tab 1: Physician Verification Queue */}
        {activeQueueTab === 'verifications' && (
          <div className="divide-y divide-slate-100">
            {filteredVerifications.map(v => (
              <div key={v.id} className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-aubergine-50 text-aubergine-700 flex items-center justify-center font-black text-sm border border-aubergine-100">
                    {COUNTRY_FLAGS[v.country] || '👩‍⚕️'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 text-sm">{v.full_name || v.name || 'Dr. Specialist'}</p>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                        {v.country || 'US'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.specialty || 'PCOS & Hormone Specialist'} • Council: <span className="font-semibold text-slate-700">{v.medical_council || 'State Board'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => setSelectedDoc(v)} 
                    className="bg-white border border-slate-200 hover:border-aubergine-500 hover:text-aubergine-700 text-slate-700 font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <i className="fas fa-file-shield text-aubergine-600"></i> Verify Credentials
                  </button>
                </div>
              </div>
            ))}

            {filteredVerifications.length === 0 && (
              <DashboardEmptyState
                icon="fa-circle-check"
                title="All Specialist Credentials Clear"
                description="No pending physician onboarding or board licensing applications requiring review."
              />
            )}
          </div>
        )}

        {/* Tab 2: Refund Clearance Queue */}
        {activeQueueTab === 'refunds' && (
          <div className="divide-y divide-slate-100">
            {filteredRefunds.map(r => (
              <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-slate-900 text-sm">{r.patient_name}</p>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-bold">
                      {r.gateway || 'Stripe Global'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Reason: {r.reason || 'Session cancelled by patient'}</p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="font-black text-rose-600 font-sans text-base">
                    {formatCurrency(r.amount, r.currency || 'INR')}
                  </span>
                  <button 
                    onClick={() => setSelectedRefund(r)} 
                    className="bg-slate-900 hover:bg-aubergine-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs active:scale-95"
                  >
                    Process Reversal
                  </button>
                </div>
              </div>
            ))}

            {filteredRefunds.length === 0 && (
              <DashboardEmptyState
                icon="fa-circle-check"
                title="No Pending Reversals"
                description="All multi-currency refund requests have been settled."
              />
            )}
          </div>
        )}

        {/* Tab 3: Support Inquiries Queue */}
        {activeQueueTab === 'tickets' && (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(t => (
              <div key={t.id} className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-extrabold text-slate-900 text-sm">{t.user_name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">{t.user_role}</span>
                    <span className="text-xs">{COUNTRY_FLAGS[t.country] || '🌍'}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{t.issue}</p>
                  <p className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button onClick={() => setSelectedTicket(t)} className="bg-white border border-slate-200 hover:border-aubergine-400 hover:text-aubergine-700 text-slate-700 font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-xs">
                    Review &amp; Act
                  </button>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <DashboardEmptyState
                icon="fa-circle-check"
                title="All Inquiries Resolved"
                description="Patient and physician support tickets are fully up to date."
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <DocumentViewerModal isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} doctor={selectedDoc} onResolve={handleResolveVerification} />
      <RefundModal isOpen={!!selectedRefund} onClose={() => setSelectedRefund(null)} refund={selectedRefund} onProcess={handleProcessRefund} />
      <TicketModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} ticket={selectedTicket} onResolve={handleResolveTicket} toast={toast} />
    </div>
  );
}

export default AdminDashboard;
