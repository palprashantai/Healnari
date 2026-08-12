import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch, API_URL, getTokens } from '../../lib/apiClient.js';

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
function PayoutModal({ isOpen, onClose, onRequest, available, toast }) {
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
            <p className="text-xs text-slate-500">Available Balance</p>
            <p className="text-3xl font-black text-aubergine-800">₹{Number(available || 0).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Payout Amount</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" max={available || 0}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
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
          <button onClick={submit} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
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
        <button onClick={() => downloadInvoicePdf(txn, toast)} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
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

  const load = () => {
    Promise.all([apiFetch('/billing/transactions'), apiFetch('/billing/summary')])
      .then(([txns, sum]) => { setTransactions(txns); setSummary(sum); })
      .catch(err => toast(err.message || 'Failed to load billing data', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const rows = transactions.map(t => ({
    id: t.id,
    txn_ref: t.txn_ref,
    patient: t.patientName,
    date: new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    type: t.service,
    amount: Number(t.amount),
    status: PAYMENT_STATUS_TO_DISPLAY[t.status] || 'pending',
    method: t.method || '—',
  }));

  const EARNINGS = [
    { label: 'This Month', value: `₹${summary.thisMonth.toLocaleString()}`, sub: `${summary.thisMonthCount} consultations`, trend: null, up: null },
    { label: 'Last Month', value: `₹${summary.lastMonth.toLocaleString()}`, sub: `${summary.lastMonthCount} consultations`, trend: 'Baseline', up: null },
    { label: 'Pending', value: `₹${summary.pending.toLocaleString()}`, sub: `${summary.pendingCount} consultations`, trend: null, up: null },
    { label: 'Total YTD', value: `₹${summary.totalYtd.toLocaleString()}`, sub: 'Since Jan', trend: null, up: null },
  ];

  const filtered = rows.filter(t => {
    const ms = !search || t.patient.toLowerCase().includes(search.toLowerCase()) || (t.txn_ref || '').toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === 'all' || t.status === filterStatus;
    return ms && mf;
  });

  const total = filtered.reduce((s, t) => s + (t.status === 'settled' ? t.amount : 0), 0);

  const exportEarnings = () => {
    if (filtered.length === 0) { toast('No transactions to export.', 'error'); return; }
    const header = ['ID', 'Patient', 'Date', 'Type', 'Method', 'Amount', 'Status'];
    const csvRows = filtered.map(t => [t.txn_ref || t.id, t.patient, t.date, t.type, t.method, t.amount, t.status]);
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
      await apiFetch('/billing/payouts', { method: 'POST', body: { method, amount } });
      toast(`Payout of ₹${amount} via ${method} initiated. Processing in 1–2 business days.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to request payout', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading billing data...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Earnings & Billing</h1>
          <p className="text-sm text-slate-500">Track consultation revenue and request payouts.</p>
        </div>
        <button onClick={() => setShowPayout(true)}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors">
          <i className="fas fa-indian-rupee-sign"></i> Request Payout
        </button>
      </div>

      {/* Earnings Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EARNINGS.map(e => (
          <div key={e.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-semibold text-slate-500 mb-1">{e.label}</div>
            <div className="text-2xl font-black text-slate-800 mb-1">{e.value}</div>
            <div className="text-xs text-slate-500">{e.sub}</div>
            {e.up !== null && (
              <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${e.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                <i className={`fas fa-arrow-${e.up ? 'up' : 'down'} text-[10px]`}></i> {e.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or ID..."
                className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300 w-44" />
            </div>
            <div className="flex gap-1.5">
              {[['all', 'All'], ['settled', 'Settled'], ['pending', 'Pending'], ['refunded', 'Refunded']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${filterStatus === v ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Showing: <strong className="text-emerald-700">₹{total.toLocaleString()}</strong> settled</span>
            <button onClick={exportEarnings} className="text-xs font-bold text-aubergine-600 hover:text-aubergine-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors">
              <i className="fas fa-download"></i> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3 font-semibold">ID</th>
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.txn_ref || t.id}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">{t.patient}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{t.date}</td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{t.type}</span></td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{t.method}</td>
                  <td className="px-5 py-4 font-black text-slate-800">₹{t.amount}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setInvoiceTxn(t)} className="text-aubergine-600 hover:text-aubergine-800 text-xs font-bold flex items-center gap-1.5 ml-auto hover:underline">
                      <i className="fas fa-file-invoice"></i> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">No transactions match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PayoutModal isOpen={showPayout} onClose={() => setShowPayout(false)} toast={toast} available={summary.available} onRequest={requestPayout} />
      <InvoiceModal txn={invoiceTxn} isOpen={!!invoiceTxn} onClose={() => setInvoiceTxn(null)} doctorName={user?.name} toast={toast} />
    </div>
  );
}

export default DoctorBilling;
