import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency, formatCompactCurrency, ISO_CURRENCIES, SUPPORTED_REPORTING_CURRENCIES } from '../../lib/currency.js';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { standardCartesianGrid, standardXAxis, standardYAxis } from '../../components/charts/chartTheme.js';
import { GlobalCommissionModal } from '../components/GlobalCommissionModal.jsx';

function ProcessPayoutModal({ payout, isOpen, onClose, onProcess }) {
  const toast = useToast();
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!payout) return null;

  const handleProcess = async () => {
    if (!refId) { toast('Please enter a bank wire / transaction reference ID', 'error'); return; }
    setLoading(true);
    try {
      await onProcess(payout.id, refId);
      onClose();
    } catch {
      toast('Failed to process payout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const payoutCurr = payout.currency || payout.original_currency || 'INR';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Doctor Payout Disbursement" size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aubergine-50 border border-aubergine-100 text-aubergine-800 text-xs font-bold mb-2">
            <span>{ISO_CURRENCIES[payoutCurr]?.flag || '🌍'}</span>
            <span>{payoutCurr} Provider Payout</span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">{payout.doctor}</p>
          <p className="text-3xl font-black text-slate-900 font-sans tracking-tight">
            {formatCurrency(payout.amount || payout.original_amount, payoutCurr)}
          </p>
          <p className="text-xs font-bold text-slate-400 mt-1 flex items-center justify-center gap-1">
            <i className="fas fa-building-columns text-[10px]"></i> Rail: {payout.method || 'Direct Wire Transfer'}
          </p>
        </div>

        <div>
          <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">
            Bank Settlement / Wire Reference ID
          </label>
          <input 
            value={refId} 
            onChange={e => setRefId(e.target.value)} 
            placeholder="e.g. WT-98234-ACH / IMPS-84920"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white" 
          />
          <p className="text-[11px] text-slate-400 mt-1">This will be shared with the physician and logged on their statement.</p>
        </div>

        <button 
          onClick={handleProcess} 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>} Confirm &amp; Mark Processed
        </button>
      </div>
    </Modal>
  );
}

function AdminRevenue() {
  const toast = useToast();
  
  // Reporting currency state (Controls normalization across entire dashboard)
  const [reportingCurrency, setReportingCurrency] = useState('INR');
  
  const [revenueData, setRevenueData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [reconciliationData, setReconciliationData] = useState(null);
  const [commissionInfo, setCommissionInfo] = useState({ currentRate: 10, history: [] });
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processTarget, setProcessTarget] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState('30D');
  const [selectedOriginalCurrency, setSelectedOriginalCurrency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'

  const fetchRevenueData = useCallback(async (curr) => {
    setLoading(true);
    try {
      const [rev, po, comm, recon] = await Promise.all([
        apiFetch(`/admin/revenue?reportingCurrency=${curr}`),
        apiFetch('/admin/revenue/payouts'),
        apiFetch('/admin/commission').catch(() => ({ currentRate: 10, history: [] })),
        apiFetch(`/admin/analytics/reconciliation?reportingCurrency=${curr}`).catch(() => null),
      ]);
      setRevenueData(rev);
      setPayouts(po || []);
      if (comm) setCommissionInfo(comm);
      if (recon) setReconciliationData(recon);
    } catch {
      toast('Failed to load multi-currency revenue data from backend API', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRevenueData(reportingCurrency);
  }, [fetchRevenueData, reportingCurrency]);

  const handleReportingCurrencyChange = (newCurr) => {
    setReportingCurrency(newCurr);
    toast(`Switched reporting currency to ${newCurr}. Normalizing all metrics.`, 'info');
  };

  const handleProcessPayout = async (id, referenceId) => {
    await apiFetch(`/admin/revenue/payouts/${id}/process`, { method: 'PUT', body: { referenceId } });
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Processed', referenceId } : p));
    toast('Payout processed and physician notified.', 'success');
  };

  const handleUpdateGlobalCommission = async (newRate, reason) => {
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
    fetchRevenueData(reportingCurrency);
  };

  // Normalized Metrics in Reporting Currency
  const normalized = revenueData?.normalizedTotals || {
    grossGMV: 0,
    platformRevenue: 0,
    providerPayouts: 0,
    refundsTotal: 0,
    netPlatformRevenue: 0,
    totalTransactions: 0,
    reportingCurrency,
  };

  // Original Currency Distribution (Immutable collections)
  const currencyBreakdown = revenueData?.currencyBreakdown || [];

  // Filtered Payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      const pCurr = (p.currency || p.original_currency || 'INR').toUpperCase();
      const matchCurrency = selectedOriginalCurrency === 'ALL' || pCurr === selectedOriginalCurrency;
      const matchStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      const matchSearch = !searchQuery || 
        (p.doctor || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.displayId || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCurrency && matchStatus && matchSearch;
    });
  }, [payouts, selectedOriginalCurrency, selectedStatus, searchQuery]);

  const filteredTransactions = useMemo(() => {
    const list = revenueData?.transactions || [];
    return list.filter(t => {
      const matchCurrency = selectedOriginalCurrency === 'ALL' || (t.originalCurrency || '').toUpperCase() === selectedOriginalCurrency;
      const matchStatus = selectedStatus === 'ALL' || (t.status || '').toLowerCase() === selectedStatus.toLowerCase();
      const matchSearch = !searchQuery ||
        (t.txnRef || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.service || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.method || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCurrency && matchStatus && matchSearch;
    });
  }, [revenueData?.transactions, selectedOriginalCurrency, selectedStatus, searchQuery]);

  const pendingPayouts = payouts.filter(p => p.status === 'Pending');

  // Multi-currency monthly trends data from real backend response
  const monthlyRevenueStream = useMemo(() => {
    return revenueData?.monthlyRevenueStream || [];
  }, [revenueData]);

  // Specialty breakdown in reporting currency
  const specialtyRevenueData = useMemo(() => {
    if (!revenueData?.revenueBySpecialty || revenueData.revenueBySpecialty.length === 0) {
      return [];
    }

    const palette = ['#6B46C1', '#E23E8C', '#10B981', '#F59E0B', '#8B5CF6', '#334155'];
    return revenueData.revenueBySpecialty.map((s, idx) => ({
      specialty: s.specialty || 'General Practice',
      revenue: Number(s.revenue) || 0,
      color: palette[idx % palette.length],
    }));
  }, [revenueData]);

  const totalSpecialtyRevenue = useMemo(() => {
    return specialtyRevenueData.reduce((acc, curr) => acc + curr.revenue, 0) || 1;
  }, [specialtyRevenueData]);

  // Export Full Multi-Currency Accounting Ledger CSV
  const exportAccountingCSV = () => {
    const transactions = revenueData?.transactions || [];
    if (transactions.length === 0 && payouts.length === 0) {
      toast('No accounting records to export.', 'info');
      return;
    }

    const headers = [
      'Transaction_ID',
      'Date',
      'Service_Category',
      'Original_Amount',
      'Original_Currency',
      'Reporting_Amount',
      'Reporting_Currency',
      'FX_Rate',
      'FX_Source',
      'Platform_Fee_Retained',
      'Provider_Payout_Owed',
      'Status',
    ];

    const rows = transactions.map(t => [
      t.txnRef,
      `"${t.date}"`,
      `"${t.service}"`,
      t.originalAmount,
      t.originalCurrency,
      t.reportingAmount,
      t.reportingCurrency,
      t.fxRate,
      t.fxRateSource,
      t.platformFeeAmount,
      t.providerPayoutAmount,
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `healnari_multicurrency_ledger_${reportingCurrency}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Multi-currency ledger (${reportingCurrency}) downloaded successfully`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Global Reporting Currency Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌐</span>
            <h1 className="text-2xl font-black text-slate-900">Multi-Currency Revenue &amp; Treasury</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bank-grade multi-currency accounting with immutable original collections and transaction-date FX normalization.
          </p>
        </div>

        {/* Global Reporting Currency Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-slate-500">Reporting Currency:</span>
            <div className="flex gap-1">
              {SUPPORTED_REPORTING_CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleReportingCurrencyChange(curr.code)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                    reportingCurrency === curr.code
                      ? 'bg-aubergine-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{curr.flag}</span>
                  <span>{curr.code}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={exportAccountingCSV}
            className="bg-slate-900 hover:bg-aubergine-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <i className="fas fa-file-csv text-emerald-400"></i> Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Global Platform Commission Banner */}
      <div className="bg-gradient-to-r from-aubergine-900 to-slate-900 text-white p-5 rounded-2xl border border-aubergine-800 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-aubergine-700/60 border border-aubergine-500/30 flex items-center justify-center text-lg">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-aubergine-300 uppercase tracking-wider">Universal Single Source of Truth</span>
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <p className="text-sm font-black text-white mt-0.5">
              Global Platform Take Rate: <span className="text-amber-300 text-base">{commissionInfo.currentRate}%</span> <span className="text-slate-400 font-normal text-xs">(Physicians retain {100 - commissionInfo.currentRate}%)</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsCommissionModalOpen(true)}
          className="bg-white hover:bg-aubergine-50 text-slate-900 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
        >
          <i className="fas fa-sliders text-aubergine-700"></i> Adjust Take Rate &amp; Audit Log
        </button>
      </div>

      {/* Automated Revenue Reconciliation & Financial Invariant Audit */}
      {reconciliationData && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚖️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Automated Ledger Reconciliation</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    reconciliationData.reconciliationStatus === 'BALANCED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {reconciliationData.reconciliationStatus === 'BALANCED' ? '✓ BALANCED LEDGER' : '⚠ DISCREPANCY DETECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mathematical Invariant: Gross Revenue ({formatCurrency(reconciliationData.financialEquation.grossRevenue, reportingCurrency)}) == Doctor Earnings ({formatCurrency(reconciliationData.financialEquation.doctorEarnings, reportingCurrency)}) + Platform Commission ({formatCurrency(reconciliationData.financialEquation.platformCommission, reportingCurrency)}) + Refunds ({formatCurrency(reconciliationData.financialEquation.refunds, reportingCurrency)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">Ledger Variance: </span>
              <span className="text-xs font-mono font-black text-slate-900">{formatCurrency(reconciliationData.financialEquation.variance, reportingCurrency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block">Gross Revenue</span>
              <span className="font-mono font-black text-slate-900 text-sm">{formatCurrency(reconciliationData.financialEquation.grossRevenue, reportingCurrency)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block">Doctor Earned</span>
              <span className="font-mono font-black text-emerald-700 text-sm">{formatCurrency(reconciliationData.payoutLedger.totalDoctorEarned, reportingCurrency)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block">Payouts Settled</span>
              <span className="font-mono font-black text-slate-900 text-sm">{formatCurrency(reconciliationData.payoutLedger.totalSettled, reportingCurrency)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block">Outstanding Doctor Payable</span>
              <span className="font-mono font-black text-amber-600 text-sm">{formatCurrency(reconciliationData.payoutLedger.outstandingPayable, reportingCurrency)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Filter Bar */}
      <DashboardFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search payout reference ID, doctor name..."
        filters={[
          {
            key: 'origCurrency',
            label: 'Original Currency',
            value: selectedOriginalCurrency,
            onChange: setSelectedOriginalCurrency,
            options: [
              { label: 'All Original Currencies', value: 'ALL' },
              { label: '🇮🇳 INR (Indian Rupee)', value: 'INR' },
              { label: '🇺🇸 USD (US Dollar)', value: 'USD' },
            ],
          },
          {
            key: 'status',
            label: 'Settlement Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Pending Action', value: 'Pending' },
              { label: 'Processed / Settled', value: 'Processed' },
            ],
          },
        ]}
        onReset={() => {
          setDateRange('30D');
          setSelectedOriginalCurrency('ALL');
          setSelectedStatus('ALL');
          setSearchQuery('');
        }}
      />

      {/* Level 1: Tier-1 KPI Cards Normalized in Reporting Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPITrendCard
          title="Gross Volume (GMV)"
          value={formatCurrency(normalized.grossGMV, reportingCurrency)}
          period={`Consults & AI (${reportingCurrency})`}
          icon="fa-money-bill-trend-up"
          colorScheme="dark"
          badgeText="Total GMV"
          loading={loading}
        />

        <KPITrendCard
          title="Platform Retained Revenue"
          value={formatCurrency(normalized.platformRevenue, reportingCurrency)}
          period={`Commission + 100% AI`}
          icon="fa-sack-dollar"
          colorScheme="purple"
          badgeText="Fee + AI"
          loading={loading}
        />

        <KPITrendCard
          title="Physician Share (Earned)"
          value={formatCurrency(normalized.providerPayouts, reportingCurrency)}
          period={`Doctor Telehealth Share`}
          icon="fa-user-doctor"
          colorScheme="emerald"
          badgeText="Doctor Cut"
          loading={loading}
        />

        <KPITrendCard
          title="Processed Refunds"
          value={formatCurrency(-normalized.refundsTotal, reportingCurrency)}
          period={`Returned Customer Funds`}
          icon="fa-rotate-left"
          colorScheme="magenta"
          loading={loading}
        />

        <KPITrendCard
          title="Net Platform Retention"
          value={formatCurrency(normalized.netPlatformRevenue, reportingCurrency)}
          period={`Fee Minus Refund Losses`}
          icon="fa-scale-balanced"
          colorScheme="emerald"
          badgeText="Net Earned"
          loading={loading}
        />

        <KPITrendCard
          title="Settled Transactions"
          value={(normalized.totalTransactions || 0).toLocaleString()}
          period="Consults &amp; AI Plans"
          icon="fa-calendar-check"
          colorScheme="dark"
          loading={loading}
        />
      </div>

      {/* Level 2: Original Currency Breakdown (Immutable Actual Collections) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <i className="fas fa-coins text-aubergine-600"></i> Revenue by Original Transaction Currency (Immutable Ledger)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact customer funds collected in their respective native payment currencies before FX normalization.
            </p>
          </div>
          <span className="text-xs font-bold text-aubergine-700 bg-aubergine-50 px-2.5 py-1 rounded-full border border-aubergine-100">
            {currencyBreakdown.length} Active Currencies
          </span>
        </div>

        {currencyBreakdown.length === 0 ? (
          <DashboardEmptyState
            icon="fa-money-bill-wave"
            title="No Original Currency Records Yet"
            description="Collections across INR and USD will disaggregate here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {currencyBreakdown.map((item) => (
              <Tilt3D key={item.currency} max={5}>
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 hover:shadow-md transition-all hover:border-aubergine-300 relative overflow-hidden flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl">{ISO_CURRENCIES[item.currency]?.flag || '🌍'}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono">
                        {item.currency}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">{item.count} Transactions</p>
                    <p className="text-xl font-black text-slate-900 mt-1 font-sans">
                      {formatCurrency(item.grossAmount, item.currency)}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Platform Fee:</span>
                      <span className="font-bold text-aubergine-700">{formatCurrency(item.platformFeeAmount, item.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Provider Share:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(item.providerPayoutAmount, item.currency)}</span>
                    </div>
                    {item.refundAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Refunds:</span>
                        <span className="font-bold text-rose-600">{formatCurrency(-item.refundAmount, item.currency)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Tilt3D>
            ))}
          </div>
        )}
      </div>

      {/* Level 3: Normalized Charts & Visualizations */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Normalized Inflow Trend in Reporting Currency */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-aubergine-600 animate-pulse"></span>
                <h2 className="font-black text-slate-900 text-base">
                  Normalized Revenue Trajectory ({reportingCurrency})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly gross transaction volume normalized to {reportingCurrency} using transaction-date FX rates.
              </p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  chartType === 'area'
                    ? 'bg-white text-aubergine-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-chart-area"></i> Area
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  chartType === 'bar'
                    ? 'bg-white text-aubergine-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-chart-column"></i> Bar
              </button>
            </div>
          </div>

          {monthlyRevenueStream.length === 0 ? (
            <DashboardEmptyState
              icon="fa-chart-area"
              title="No Monthly Revenue History"
              description="Monthly payment trends will render here as patient sessions are finalized."
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={monthlyRevenueStream} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGrossReporting" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPlatformReporting" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...standardCartesianGrid} />
                    <XAxis dataKey="month" {...standardXAxis} />
                    <YAxis {...standardYAxis} tickFormatter={(val) => formatCompactCurrency(val, reportingCurrency)} />
                    <Tooltip content={<ChartTooltip currency={reportingCurrency} />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="grossReporting" name={`Gross GMV (${reportingCurrency})`} stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorGrossReporting)" activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="platformReporting" name={`Platform Take (${reportingCurrency})`} stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPlatformReporting)" activeDot={{ r: 5 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyRevenueStream} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid {...standardCartesianGrid} />
                    <XAxis dataKey="month" {...standardXAxis} />
                    <YAxis {...standardYAxis} tickFormatter={(val) => formatCompactCurrency(val, reportingCurrency)} />
                    <Tooltip content={<ChartTooltip currency={reportingCurrency} />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', paddingTop: '10px' }} />
                    <Bar dataKey="grossReporting" name={`Gross GMV (${reportingCurrency})`} fill="#6B46C1" radius={[4, 4, 0, 0]} maxBarSize={38} />
                    <Bar dataKey="platformReporting" name={`Platform Take (${reportingCurrency})`} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Specialty Revenue Share in Reporting Currency */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-slate-900 text-base">Specialty Revenue Share</h2>
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-aubergine-50 text-aubergine-700">
                {reportingCurrency}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5">Department revenues converted to {reportingCurrency}.</p>

            {specialtyRevenueData.length === 0 ? (
              <DashboardEmptyState
                icon="fa-stethoscope"
                title="No Department Breakdown"
                description="Completed consultation revenues will categorize by medical vertical."
              />
            ) : (
              <div className="space-y-4">
                {specialtyRevenueData.map((item) => {
                  const percentage = Math.round((item.revenue / totalSpecialtyRevenue) * 100) || 0;
                  return (
                    <div key={item.specialty} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700 truncate pr-2">{item.specialty}</span>
                        <span className="text-slate-900 font-mono font-black">{formatCurrency(item.revenue, reportingCurrency)} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Fulfilled Appointments:</span>
            <span className="font-extrabold text-aubergine-700">{revenueData?.completedConsultations || 0}</span>
          </div>
        </div>
      </div>

      {/* Level 3.5: AI Subscription Revenue Stream Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-aubergine-50 border border-aubergine-200 flex items-center justify-center text-aubergine-700 text-lg shadow-xs">
              <i className="fas fa-robot"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">AI Subscription Revenue Stream</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                  100% PLATFORM MARGIN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Automated recurring earnings from Doctor Clinical Plans &amp; Patient Care Plans</p>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1 rounded-full">
            {(revenueData?.aiSubscriptionRevenue?.count || 0)} Plan Purchases Logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-900 to-aubergine-950 text-white rounded-xl p-4 border border-slate-800 relative overflow-hidden shadow-xs">
            <p className="text-[10px] uppercase font-black tracking-wider text-aubergine-300 mb-1">Total AI Subscription Earnings</p>
            <p className="text-2xl font-black text-white font-sans">
              {formatCurrency(revenueData?.aiSubscriptionRevenue?.total || 0, reportingCurrency)}
            </p>
            <p className="text-[11px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <i className="fas fa-check-circle text-[10px]"></i> 100% Platform Revenue (Zero Provider Deductions)
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Doctor AI Plans (Pro &amp; Premium)</p>
            <p className="text-2xl font-black text-aubergine-900 font-sans">
              {formatCurrency(revenueData?.aiSubscriptionRevenue?.doctorPlansRevenue || 0, reportingCurrency)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Clinical Tools, SOAP Notes &amp; Rx Autocomplete</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Patient AI Plans (Pro &amp; Premium)</p>
            <p className="text-2xl font-black text-magenta-700 font-sans">
              {formatCurrency(revenueData?.aiSubscriptionRevenue?.patientPlansRevenue || 0, reportingCurrency)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Health Companion, Visit Prep &amp; Lab Report Decoder</p>
          </div>
        </div>
      </div>

      {/* Master Revenue & AI Plan Transactions Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-sm">Platform Collections &amp; AI Transactions Ledger</h2>
            <p className="text-xs text-slate-500">Live feed of consultation billings and AI plan subscription sales</p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredTransactions.length} of {(revenueData?.transactions || []).length} transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-50/50">
                <th className="px-6 py-3.5">Reference ID</th>
                <th className="px-6 py-3.5">Service / Plan</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Rail</th>
                <th className="px-6 py-3.5 text-right">Original Paid</th>
                <th className="px-6 py-3.5 text-right">Platform Fee Retained</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-medium text-xs">
                    No transactions matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{t.txnRef}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-xs">{t.service}</div>
                      <div className="text-[10px] text-slate-400">
                        {t.isAiSubscription ? (
                          <span className="text-aubergine-700 font-bold">AI Subscription Plan</span>
                        ) : (
                          <span>Telehealth Clinical Visit</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{t.date}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">{t.method}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-800 font-sans text-xs">
                      {formatCurrency(t.originalAmount, t.originalCurrency)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 font-sans text-xs">
                      {formatCurrency(t.platformFeeAmount, reportingCurrency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        t.status === 'Paid' || t.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Level 4: Physician Payout Clearance Queue */}
      <div id="payout-queue" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-sm">Physician Payout Clearance Queue</h2>
            <p className="text-xs text-slate-500">Cross-border payout settlement via local clearing rails (ACH / SWIFT / IMPS).</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              Showing {filteredPayouts.length} of {payouts.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-50/50">
                <th className="px-6 py-3.5">Request Ref</th>
                <th className="px-6 py-3.5">Physician</th>
                <th className="px-6 py-3.5">Settlement Currency &amp; Rail</th>
                <th className="px-6 py-3.5">Requested Date</th>
                <th className="px-6 py-3.5">Platform Take</th>
                <th className="px-6 py-3.5">Net Payout Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-6 py-4"><div className="animate-pulse h-8 bg-slate-100 rounded-lg"></div></td></tr>
                ))
              ) : filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-4">
                    <DashboardEmptyState
                      icon="fa-receipt"
                      title="No Payouts Matching Filters"
                      description="No provider withdrawal requests found matching your filter selection."
                    />
                  </td>
                </tr>
              ) : (
                filteredPayouts.map(p => {
                  const pCurr = (p.currency || p.original_currency || 'INR').toUpperCase();
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{p.displayId}</td>
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-800">{p.doctor}</div>
                        <div className="text-[11px] text-slate-400">Telehealth Specialist</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{ISO_CURRENCIES[pCurr]?.flag || '🌍'}</span>
                          <span className="font-bold text-xs text-slate-700">{pCurr}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{p.method || 'Direct Wire'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-medium">{p.date}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-aubergine-200 bg-aubergine-50 text-aubergine-700 w-fit">
                          {p.feeCut ? `${p.feeCut} take-rate` : 'Platform fee'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-700 font-sans text-base">
                        {formatCurrency(p.amount, pCurr)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                          p.status === 'Processed' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.status === 'Pending' ? (
                          <button 
                            onClick={() => setProcessTarget(p)} 
                            className="bg-slate-900 hover:bg-aubergine-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
                          >
                            Process Wire
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold flex items-center justify-end gap-1">
                            <i className="fas fa-check-double text-emerald-500"></i> {p.referenceId ? `${p.referenceId.slice(0, 10)}…` : 'Settled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProcessPayoutModal payout={processTarget} isOpen={!!processTarget} onClose={() => setProcessTarget(null)} onProcess={handleProcessPayout} />
      <GlobalCommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        currentRate={commissionInfo.currentRate}
        history={commissionInfo.history}
        onUpdate={handleUpdateGlobalCommission}
      />
    </div>
  );
}

export default AdminRevenue;

