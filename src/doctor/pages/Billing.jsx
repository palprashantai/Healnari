import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch, API_URL, getTokens } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { getUserCurrency } from '../../lib/countries.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';
import { AISubscriptionCard } from '../../components/ai/AISubscriptionCard.jsx';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { standardCartesianGrid, standardXAxis, standardYAxis } from '../../components/charts/chartTheme.js';

const STATUS_STYLE = {
  settled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  refunded: 'bg-rose-50 text-rose-700 border-rose-200',
  'refund pending': 'bg-amber-50 text-amber-700 border-amber-200',
};

const PAYMENT_STATUS_TO_DISPLAY = {
  Paid: 'settled',
  Pending: 'pending',
  Refunded: 'refunded',
  'Insurance Claimed': 'settled',
  'Refund Pending': 'refund pending',
  Failed: 'refunded',
};

/* ─── Payout Modal ───────────────────────────── */
function PayoutModal({ isOpen, onClose, onRequest, available, currency = 'INR', toast }) {
  const [method, setMethod] = useState('Bank Account');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => { if (isOpen) setAmount(String(available || 0)); }, [isOpen, available]);

  const submit = async () => {
    setStep(2);
    try {
      await onRequest(method, amount);
    } finally {
      onClose();
      setStep(1);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Doctor Payout Disbursement" size="sm">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-2xl p-5 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">Available for Immediate Payout</p>
            <p className="text-3xl font-black text-aubergine-900 font-sans tracking-tight">
              {formatCurrency(available || 0, currency)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Direct wire settlement via ACH / SWIFT / IMPS</p>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Payout Amount ({currency})</label>
            <input 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              type="number" 
              min="0" 
              max={available || 0}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white" 
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Disbursement Rail</label>
            <div className="space-y-2">
              {[
                { id: 'Bank Account', label: 'Bank Account (IMPS / NEFT / Wire)', icon: 'fa-building-columns' },
                { id: 'UPI', label: 'UPI Direct Transfer (VPA / QR)', icon: 'fa-mobile-screen' },
                { id: 'Wallet', label: 'Digital Healthcare Wallet', icon: 'fa-wallet' },
              ].map(m => (
                <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${method === m.id ? 'border-aubergine-500 bg-aubergine-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="payout" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-aubergine-600" />
                  <i className={`fas ${m.icon} text-aubergine-700 text-xs w-4`}></i>
                  <span className="text-xs font-bold text-slate-800">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            onClick={submit} 
            className="w-full bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i className="fas fa-money-bill-transfer"></i> Submit Withdrawal Request
          </button>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <div className="w-10 h-10 border-4 border-aubergine-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-slate-800 text-sm">Processing wire transfer request...</p>
        </div>
      )}
    </Modal>
  );
}

/* ─── Invoice Modal ──────────────────────────── */
async function downloadInvoicePdf(txn, toast) {
  try {
    const tokens = getTokens();
    const res = await fetch(`${API_URL}/billing/transactions/${txn.id}/invoice`, {
      headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    });
    if (!res.ok) throw new Error('Could not generate the invoice.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${txn.txn_ref || txn.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast?.(err.message || 'Failed to download invoice.', 'error');
  }
}

function InvoiceModal({ txn, isOpen, onClose, doctorName, toast }) {
  if (!txn) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Consultation Billing Receipt" size="sm">
      <div className="border border-slate-200 rounded-2xl p-5 space-y-4 font-sans">
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">HealNari Telehealth</h3>
            <p className="text-xs text-slate-500">{doctorName ? `Dr. ${doctorName}` : 'Specialist'}</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <p className="font-bold text-slate-800">{txn.txn_ref || txn.id.slice(0, 8)}</p>
            <p>{txn.date}</p>
          </div>
        </div>
        <div className="text-xs space-y-2">
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Patient</span><span className="font-bold text-slate-800">{txn.patient}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Service Type</span><span className="font-bold text-slate-800">{txn.type}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Payment Rail</span><span className="font-bold text-slate-800">{txn.method}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
            <span className="font-bold text-slate-700">Gross Settlement</span>
            <span className="font-black text-slate-900 text-base">{formatCurrency(txn.grossAmount || txn.amount, txn.grossCurrency || txn.currency || 'INR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-emerald-700">Net Doctor Payout</span>
            <span className="font-black text-emerald-700 text-base">{formatCurrency(txn.amount, txn.currency || 'INR')}</span>
          </div>
        </div>
        <button onClick={() => downloadInvoicePdf(txn, toast)} className="w-full bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs">
          <i className="fas fa-download"></i> Download Invoice PDF
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorBilling() {
  const toast = useToast();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({ thisMonth: 0, thisMonthCount: 0, lastMonth: 0, lastMonthCount: 0, pending: 0, pendingCount: 0, totalYtd: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [showPayout, setShowPayout] = useState(false);
  const [invoiceTxn, setInvoiceTxn] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dateRange, setDateRange] = useState('30D');

  const load = () => {
    Promise.all([apiFetch('/billing/transactions'), apiFetch('/billing/summary'), apiFetch('/billing/payouts')])
      .then(([txns, sum, pyts]) => { setTransactions(txns || []); setSummary(sum || {}); setPayouts(pyts || []); })
      .catch(err => toast(err.message || 'Failed to load billing data', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const userCurrency = user?.profile?.currency || user?.currency || getUserCurrency(user);

  const rows = useMemo(() => {
    return transactions.map(t => {
      const payoutCurr = t.doctor_payout_currency || t.provider_payout_currency || userCurrency || 'INR';
      const grossCurr = t.paid_currency || t.currency || userCurrency || 'INR';
      const payoutAmt = Number(t.doctor_payout_amount ?? t.provider_payout_amount ?? (t.amount ? t.amount * 0.85 : 0));
      const grossAmt = Number(t.paid_amount ?? t.amount ?? t.base_amount ?? 0);
      return {
        id: t.id,
        txn_ref: t.txn_ref,
        patient: t.patientName || 'Patient',
        date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        rawDate: t.created_at ? new Date(t.created_at) : new Date(),
        type: t.service || 'Consultation',
        amount: payoutAmt,
        grossAmount: grossAmt,
        currency: payoutCurr,
        grossCurrency: grossCurr,
        status: PAYMENT_STATUS_TO_DISPLAY[t.status] || 'pending',
        method: t.method || '—',
      };
    });
  }, [transactions, userCurrency]);

  // Real 30-Day Earnings Chart calculated from real transaction dates and amounts
  const chartData = useMemo(() => {
    if (rows.length === 0) return [];
    
    // Group transactions by date
    const dateMap = new Map();
    rows.forEach(r => {
      if (r.status === 'settled' || r.status === 'Paid') {
        const key = r.date;
        const exist = dateMap.get(key) || { earnings: 0, gross: 0 };
        exist.earnings += r.amount;
        exist.gross += r.grossAmount;
        dateMap.set(key, exist);
      }
    });

    if (dateMap.size === 0) return [];

    return Array.from(dateMap.entries()).map(([date, vals]) => ({
      date,
      'Net Earnings': Number(vals.earnings.toFixed(2)),
      'Gross Billed': Number(vals.gross.toFixed(2)),
    }));
  }, [rows]);

  const filtered = rows.filter(t => {
    const ms = !search || t.patient.toLowerCase().includes(search.toLowerCase()) || (t.txn_ref || '').toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === 'ALL' || t.status === filterStatus;
    return ms && mf;
  });

  const totalSettled = filtered.reduce((s, t) => s + (t.status === 'settled' ? t.amount : 0), 0);

  // Compute live fallback summary directly from verified transaction ledger & payouts
  const effectiveSummary = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let computedThisMonth = 0;
    let computedThisMonthCount = 0;
    let computedTotalYtd = 0;
    let computedPending = 0;
    let computedPendingCount = 0;
    let computedTotalSettled = 0;

    rows.forEach(r => {
      const isSettled = r.status === 'settled' || r.status === 'Paid';
      const isPending = r.status === 'pending';
      const d = r.rawDate instanceof Date && !isNaN(r.rawDate) ? r.rawDate : new Date();

      if (isSettled) {
        computedTotalSettled += r.amount;
        if (d.getFullYear() === currentYear) {
          computedTotalYtd += r.amount;
          if (d.getMonth() === currentMonth) {
            computedThisMonth += r.amount;
            computedThisMonthCount++;
          }
        }
      } else if (isPending) {
        computedPending += r.amount;
        computedPendingCount++;
      }
    });

    const totalPaidOut = (payouts || []).reduce((sum, p) => {
      if (p.status !== 'rejected' && p.status !== 'failed') {
        return sum + Number(p.amount || 0);
      }
      return sum;
    }, 0);

    const computedAvailable = Math.max(0, computedTotalSettled - totalPaidOut);

    return {
      available: (summary?.available && summary.available > 0) ? summary.available : Number(computedAvailable.toFixed(2)),
      pending: (summary?.pending && summary.pending > 0) ? summary.pending : Number(computedPending.toFixed(2)),
      pendingCount: summary?.pendingCount || computedPendingCount,
      thisMonth: (summary?.thisMonth && summary.thisMonth > 0) ? summary.thisMonth : Number(computedThisMonth.toFixed(2)),
      thisMonthCount: summary?.thisMonthCount || computedThisMonthCount,
      totalYtd: (summary?.totalYtd && summary.totalYtd > 0) ? summary.totalYtd : Number(computedTotalYtd.toFixed(2)),
    };
  }, [summary, rows, payouts]);

  const exportEarnings = () => {
    if (filtered.length === 0) { toast('No transactions to export.', 'error'); return; }
    const header = ['ID', 'Patient', 'Date', 'Type', 'Method', 'Amount', 'Currency', 'Status'];
    const csvRows = filtered.map(t => [t.txn_ref || t.id, t.patient, t.date, t.type, t.method, t.amount, t.currency, t.status]);
    const csv = [header, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} transactions.`, 'success');
  };

  const requestPayout = async (method, amount) => {
    try {
      await apiFetch('/billing/payouts', { method: 'POST', body: { method, amount, currency: userCurrency } });
      toast(`Payout of ${formatCurrency(amount, userCurrency)} via ${method} initiated. Processing in 1–2 business days.`, 'success');
      load();
    } catch (err) {
      toast(err.message || 'Failed to request payout', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Doctor Earnings &amp; Settlements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track consultation revenue and manage available disbursements in {userCurrency}.</p>
        </div>
        <button 
          onClick={() => setShowPayout(true)}
          className="bg-slate-900 hover:bg-aubergine-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
        >
          <i className="fas fa-wallet"></i> Request Payout
        </button>
      </div>

      {/* Doctor AI Pro Subscription Management */}
      <AISubscriptionCard userRole="doctor" />

      {/* Filter Bar */}
      <DashboardFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient name, transaction ID..."
        filters={[
          {
            key: 'status',
            label: 'Settlement Status',
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { label: 'All Transactions', value: 'ALL' },
              { label: 'Settled', value: 'settled' },
              { label: 'Pending Clearing', value: 'pending' },
              { label: 'Refunded', value: 'refunded' },
            ],
          },
        ]}
        onReset={() => {
          setDateRange('30D');
          setFilterStatus('ALL');
          setSearch('');
        }}
      />

      {/* Level 1: Tier-1 KPI Cards (Real Data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITrendCard
          title="Available for Payout"
          value={formatCurrency(effectiveSummary.available || 0, userCurrency)}
          period="Ready for direct wire withdrawal"
          icon="fa-wallet"
          colorScheme="dark"
          badgeText="Live Balance"
          drillDownLabel="Withdraw Now"
          onDrillDown={() => setShowPayout(true)}
          loading={loading}
        />

        <KPITrendCard
          title="Pending Clearing"
          value={formatCurrency(effectiveSummary.pending || 0, userCurrency)}
          period={`${effectiveSummary.pendingCount || 0} consultations in clearing window`}
          icon="fa-clock"
          colorScheme="amber"
          loading={loading}
        />

        <KPITrendCard
          title="Earnings This Month"
          value={formatCurrency(effectiveSummary.thisMonth || 0, userCurrency)}
          period={`${effectiveSummary.thisMonthCount || 0} sessions this month`}
          icon="fa-chart-line"
          colorScheme="emerald"
          loading={loading}
        />

        <KPITrendCard
          title="Total Earnings (YTD)"
          value={formatCurrency(effectiveSummary.totalYtd || 0, userCurrency)}
          period="Cumulative earnings this calendar year"
          icon="fa-calendar-check"
          colorScheme="purple"
          loading={loading}
        />
      </div>

      {/* Level 2: Earnings Trend Chart (Real Data) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <i className="fas fa-chart-area text-aubergine-600"></i> Practice Net Earnings History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Daily consultation settlements after platform take-rate.</p>
          </div>
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Net Take-Home
          </span>
        </div>

        {chartData.length === 0 ? (
          <DashboardEmptyState
            icon="fa-chart-area"
            title="No Completed Settlement Transactions Yet"
            description="As patients complete consultations, daily revenue data points will display here."
          />
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarningsDoctor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" {...standardXAxis} minTickGap={20} />
                <YAxis {...standardYAxis} tickFormatter={(val) => formatCurrency(val, userCurrency)} />
                <CartesianGrid {...standardCartesianGrid} />
                <Tooltip content={<ChartTooltip currency={userCurrency} />} />
                <Area type="monotone" dataKey="Net Earnings" stroke="#6B46C1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarningsDoctor)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Level 3: Transaction Ledger Table (Real Data) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Consultation Transaction Ledger</h3>
            <p className="text-xs text-slate-500">Record of patient billing, payment rail, and fee breakdown.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              Showing: <strong className="text-emerald-700 font-black">{formatCurrency(totalSettled, userCurrency)}</strong> settled
            </div>
            <button onClick={exportEarnings} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5">
              <i className="fas fa-file-csv text-emerald-600"></i> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-50/50">
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Patient</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Service Type</th>
                <th className="px-6 py-3.5">Payment Method</th>
                <th className="px-6 py-3.5">Net Payout</th>
                <th className="px-6 py-3.5">Gross Billed</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{t.txn_ref || t.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-800">{t.patient}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">{t.date}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium">{t.method}</td>
                  <td className="px-6 py-4 font-black text-slate-900 font-sans">
                    {formatCurrency(t.amount, t.currency || userCurrency)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-semibold font-sans text-xs">
                    {formatCurrency(t.grossAmount, t.grossCurrency || userCurrency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLE[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setInvoiceTxn(t)} 
                      className="text-aubergine-700 hover:text-aubergine-900 text-xs font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <i className="fas fa-file-invoice"></i> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4">
                    <DashboardEmptyState
                      icon="fa-receipt"
                      title="No Transactions Found"
                      description="No billing or payment records found in database."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Level 4: Payout History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Payout &amp; Withdrawal History</h3>
            <p className="text-xs text-slate-500">Record of all requested disbursements to your bank or wallet.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-50/50">
                <th className="px-6 py-3.5">Date Requested</th>
                <th className="px-6 py-3.5">Disbursement Rail</th>
                <th className="px-6 py-3.5">Destination Details</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map(p => {
                const date = p.requested_at || p.created_at;
                const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">{formattedDate}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{p.method || 'Bank Account'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium truncate max-w-[200px]" title={JSON.stringify(p.destination_details)}>
                      {p.destination_details?.account_holder || '—'}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 font-sans">
                      {formatCurrency(p.amount, p.currency || userCurrency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${
                        p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status || 'Processing'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4">
                    <DashboardEmptyState
                      icon="fa-money-bill-transfer"
                      title="No Payouts Yet"
                      description="Your withdrawal history will appear here once you request a payout."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PayoutModal isOpen={showPayout} onClose={() => setShowPayout(false)} toast={toast} available={effectiveSummary.available} currency={userCurrency} onRequest={requestPayout} />
      <InvoiceModal txn={invoiceTxn} isOpen={!!invoiceTxn} onClose={() => setInvoiceTxn(null)} doctorName={user?.name} toast={toast} />
    </div>
  );
}

export default DoctorBilling;
