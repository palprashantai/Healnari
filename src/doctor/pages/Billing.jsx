import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch, API_URL, getTokens } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_STYLE = {
  settled: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  refunded: 'bg-rose-50 text-rose-700 border-rose-100',
  'refund pending': 'bg-sky-50 text-sky-700 border-sky-100',
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
function PayoutModal({ isOpen, onClose, onRequest, available, currency = 'USD', toast }) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Request Payout" size="sm">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">Available for Payout</p>
            <p className="text-3xl font-black text-aubergine-800">{formatCurrency(available || 0, currency)}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Payout Amount</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" max={available || 0}
              className="crm-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Payout Method</label>
            <div className="space-y-2">
              {['Bank Account', 'UPI', 'Wallet'].map(m => (
                <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${method === m ? 'border-aubergine-400 bg-aubergine-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="payout" checked={method === m} onChange={() => setMethod(m)} className="accent-aubergine-600" />
                  <span className="text-sm font-semibold text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={submit} className="crm-btn-primary w-full">
            Request Payout
          </button>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 border-4 border-aubergine-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-slate-800">Processing payout...</p>
        </div>
      )}
    </Modal>
  );
}

/* ─── Invoice Modal ──────────────────────────── */
// Real server-generated PDF (same invoice.service.ts the patient-side
// download and the post-payment receipt email both use) — fetched directly
// since apiFetch JSON-parses every response body and this one is binary.
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
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice" size="sm">
      <div className="border border-slate-200 rounded-2xl p-5 space-y-4" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-lg">HealNari</h3>
            <p className="text-xs text-slate-500">{doctorName ? `Dr. ${doctorName}` : ''}</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <p className="font-bold text-slate-800">{txn.txn_ref || txn.id}</p>
            <p>{txn.date}</p>
          </div>
        </div>
        <div className="text-xs space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-bold text-slate-800">{txn.patient}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-bold text-slate-800">{txn.type}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="font-bold text-slate-800">{txn.method}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-bold text-slate-600">Total</span><span className="font-black text-slate-800 text-base">₹{txn.amount}</span></div>
        </div>
        <button onClick={() => downloadInvoicePdf(txn, toast)} className="crm-btn-primary w-full flex items-center justify-center gap-2">
          <i className="fas fa-download"></i> Download PDF
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
  const [summary, setSummary] = useState({ thisMonth: 0, thisMonthCount: 0, lastMonth: 0, lastMonthCount: 0, pending: 0, pendingCount: 0, totalYtd: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [showPayout, setShowPayout] = useState(false);
  const [invoiceTxn, setInvoiceTxn] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Generate some realistic looking mock chart data for the last 30 days
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const baseVal = isWeekend ? 1500 : 4500;
      data.push({
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        earnings: Math.floor(baseVal + Math.random() * 2000),
      });
    }
    return data;
  }, []);

  const load = () => {
    Promise.all([apiFetch('/billing/transactions'), apiFetch('/billing/summary')])
      .then(([txns, sum]) => { setTransactions(txns); setSummary(sum); })
      .catch(err => toast(err.message || 'Failed to load billing data', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const userCurrency = user?.profile?.currency || user?.currency || 'USD';

  const rows = transactions.map(t => ({
    id: t.id,
    txn_ref: t.txn_ref,
    patient: t.patientName,
    date: new Date(t.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    type: t.service,
    amount: Number(t.amount),
    currency: t.currency || userCurrency,
    status: PAYMENT_STATUS_TO_DISPLAY[t.status] || 'pending',
    method: t.method || '—',
  }));

  const EARNINGS = [
    { label: 'This Month', value: formatCurrency(summary.thisMonth, userCurrency), sub: `${summary.thisMonthCount} consultations`, trend: null, up: null },
    { label: 'Last Month', value: formatCurrency(summary.lastMonth, userCurrency), sub: `${summary.lastMonthCount} consultations`, trend: 'Baseline', up: null },
    { label: 'Pending', value: formatCurrency(summary.pending, userCurrency), sub: `${summary.pendingCount} consultations`, trend: null, up: null },
    { label: 'Total YTD', value: formatCurrency(summary.totalYtd, userCurrency), sub: 'Since Jan', trend: null, up: null },
  ];

  const filtered = rows.filter(t => {
    const ms = !search || t.patient.toLowerCase().includes(search.toLowerCase()) || (t.txn_ref || '').toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === 'all' || t.status === filterStatus;
    let md = true;
    if (dateRange.start || dateRange.end) {
      const originalTxn = transactions.find(tx => tx.id === t.id);
      if (originalTxn) {
        const txnDate = new Date(originalTxn.created_at);
        if (dateRange.start && txnDate < new Date(dateRange.start)) md = false;
        if (dateRange.end) {
          const endD = new Date(dateRange.end);
          endD.setHours(23, 59, 59, 999);
          if (txnDate > endD) md = false;
        }
      }
    }
    return ms && mf && md;
  });

  const total = filtered.reduce((s, t) => s + (t.status === 'settled' ? t.amount : 0), 0);

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
    } catch (err) {
      toast(err.message || 'Failed to request payout', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading billing data...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Earnings & Payouts</h1>
          <p className="text-sm text-slate-500">Track consultation revenue and manage your available balance in {userCurrency}.</p>
        </div>
        <button onClick={() => setShowPayout(true)}
          className="crm-btn-primary flex items-center gap-2 font-bold">
          <i className="fas fa-wallet"></i> Request Payout
        </button>
      </div>

      {/* Earnings Cards - Advanced Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Available Balance - Hero Card */}
        <div className="bg-gradient-to-br from-aubergine-700 to-aubergine-900 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-aubergine-500/30 rounded-full blur-2xl group-hover:scale-125 transition-all"></div>
          <div className="relative z-10">
            <div className="text-aubergine-200 text-sm font-semibold mb-1 flex items-center justify-between">
              Available for Payout
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm"><i className="fas fa-wallet text-white text-xs"></i></div>
            </div>
            <div className="text-3xl font-black mb-1 tabular-nums tracking-tight">{formatCurrency(summary.available, userCurrency)}</div>
            <div className="text-aubergine-200 text-xs font-medium">Ready to withdraw</div>
          </div>
          <button onClick={() => setShowPayout(true)} className="relative z-10 mt-5 w-full bg-white text-aubergine-800 hover:bg-aubergine-50 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
            <i className="fas fa-building-columns"></i> Withdraw Funds
          </button>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="text-slate-500 text-sm font-semibold mb-1 flex items-center justify-between">
              Pending Clearing
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-clock text-xs"></i></div>
            </div>
            <div className="text-2xl font-black text-slate-800 mb-1 tabular-nums tracking-tight">{formatCurrency(summary.pending, userCurrency)}</div>
            <div className="text-slate-500 text-xs font-medium">{summary.pendingCount} consultations processing</div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <i className="fas fa-bolt text-amber-400"></i> Usually clears in 24-48 hrs
          </div>
        </div>

        {/* This Month vs Last Month */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="text-slate-500 text-sm font-semibold mb-1 flex items-center justify-between">
              Earnings This Month
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-chart-line text-xs"></i></div>
            </div>
            <div className="text-2xl font-black text-slate-800 mb-1 tabular-nums tracking-tight">{formatCurrency(summary.thisMonth, userCurrency)}</div>
            <div className="text-slate-500 text-xs font-medium">{summary.thisMonthCount} consultations</div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            {summary.thisMonth >= summary.lastMonth ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100"><i className="fas fa-arrow-up text-[10px]"></i> Up from last month</span>
            ) : (
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100"><i className="fas fa-arrow-down text-[10px]"></i> Down from last month</span>
            )}
          </div>
        </div>

        {/* Total YTD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="text-slate-500 text-sm font-semibold mb-1 flex items-center justify-between">
              Total Earnings (YTD)
              <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-calendar-check text-xs"></i></div>
            </div>
            <div className="text-2xl font-black text-slate-800 mb-1 tabular-nums tracking-tight">{formatCurrency(summary.totalYtd, userCurrency)}</div>
            <div className="text-slate-500 text-xs font-medium">Since January</div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <i className="fas fa-award text-aubergine-400"></i> Keep up the great work!
          </div>
        </div>
      </div>

      {/* Recharts Data Visualization */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-chart-area text-aubergine-600"></i> Revenue Trend (Last 30 Days)</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={20} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value >= 1000 ? `${value / 1000}k` : value}`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#6B46C1', fontWeight: 'bold' }}
                formatter={(value) => [formatCurrency(value, userCurrency), 'Earnings']}
              />
              <Area type="monotone" dataKey="earnings" stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6B46C1' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or ID..."
                className="crm-input pl-9 min-w-[240px]" />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {[['all', 'All'], ['settled', 'Settled'], ['pending', 'Pending'], ['refunded', 'Refunded']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === v ? 'bg-white text-aubergine-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="crm-input h-[36px] w-[130px] text-xs" />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="crm-input h-[36px] w-[130px] text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              Showing: <strong className="text-emerald-700 font-black tracking-tight">{formatCurrency(total, userCurrency)}</strong> settled
            </div>
            <button onClick={exportEarnings} className="crm-btn-secondary h-[36px] bg-white">
              <i className="fas fa-download mr-1.5"></i> Export CSV
            </button>
          </div>
        </div>

        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="font-mono text-xs text-slate-500">{t.txn_ref || t.id}</td>
                  <td className="font-bold text-slate-800">{t.patient}</td>
                  <td className="text-slate-500 whitespace-nowrap">{t.date}</td>
                  <td><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-bold text-[10px]">{t.type}</span></td>
                  <td className="text-slate-500">{t.method}</td>
                  <td className="font-black text-slate-800">{formatCurrency(t.amount, t.currency || userCurrency)}</td>
                  <td>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="text-right">
                    <button onClick={() => setInvoiceTxn(t)} className="crm-btn-secondary border-none shadow-none text-aubergine-600 hover:text-aubergine-800 hover:bg-aubergine-50 h-8 text-[11px] px-3 ml-auto">
                      <i className="fas fa-file-invoice mr-1.5"></i> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                      <i className="fas fa-receipt text-2xl text-slate-300"></i>
                    </div>
                    <h3 className="text-base font-black text-slate-800 mb-1">No Transactions Found</h3>
                    <p className="text-sm text-slate-500">Try adjusting your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PayoutModal isOpen={showPayout} onClose={() => setShowPayout(false)} toast={toast} available={summary.available} currency={userCurrency} onRequest={requestPayout} />
      <InvoiceModal txn={invoiceTxn} isOpen={!!invoiceTxn} onClose={() => setInvoiceTxn(null)} doctorName={user?.name} toast={toast} />
    </div>
  );
}

export default DoctorBilling;
