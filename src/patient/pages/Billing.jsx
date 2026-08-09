import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const STATUS_STYLE = {
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  refunded:  'bg-rose-50 text-rose-700 border-rose-100',
  pending:   'bg-amber-50 text-amber-700 border-amber-100',
  insurance: 'bg-sky-50 text-sky-700 border-sky-100',
};

// 'Insurance Claimed' is NOT out-of-pocket spend — kept as its own status so
// it's excluded from the "Total Spent" sum below instead of inflating it.
const PAYMENT_STATUS_TO_DISPLAY = { Paid: 'paid', Pending: 'pending', Refunded: 'refunded', 'Insurance Claimed': 'insurance' };

const METHOD_ICON = { UPI: 'fa-mobile-screen-button', Card: 'fa-credit-card', 'Net Banking': 'fa-building-columns', Wallet: 'fa-wallet' };

/* ─── Payment Modal ──────────────────────────── */
function PaymentModal({ isOpen, onClose, amount, description, onSuccess }) {
  const [method, setMethod] = useState('UPI');
  const [step, setStep] = useState(1);
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);

  const METHODS = [
    { id: 'UPI', label: 'UPI / GPay', icon: 'fa-mobile-screen-button', color: 'text-aubergine-600' },
    { id: 'Card', label: 'Credit / Debit Card', icon: 'fa-credit-card', color: 'text-sky-600' },
    { id: 'Net Banking', label: 'Net Banking', icon: 'fa-building-columns', color: 'text-indigo-600' },
    { id: 'Wallet', label: 'HealNari Wallet (₹450 balance)', icon: 'fa-wallet', color: 'text-emerald-600' },
  ];

  const pay = async () => {
    setProcessing(true);
    try {
      await onSuccess(method);
      setStep(3);
    } catch {
      // onSuccess already toasts the error — stay on step 2 so they can retry.
    } finally {
      setProcessing(false);
    }
  };

  const done = () => {
    onClose();
    setStep(1); setUpiId(''); setProcessing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={step < 3 ? onClose : undefined} title={step < 3 ? 'Make Payment' : undefined} size="sm">
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">{description}</p>
            <p className="text-3xl font-black text-aubergine-800">₹{amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Choose Payment Method</p>
            <div className="space-y-2">
              {METHODS.map(m => (
                <label key={m.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${method === m.id ? 'border-aubergine-400 bg-aubergine-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-aubergine-600" />
                  <i className={`fas ${m.icon} ${m.color} w-4 text-center`}></i>
                  <span className="text-sm font-semibold text-slate-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(2)} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Continue →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-black text-slate-800">₹{amount}</span></div>
            <div className="flex justify-between mt-1"><span className="text-slate-500">Method</span><span className="font-bold text-slate-700">{method}</span></div>
          </div>
          {method === 'UPI' && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">UPI ID</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
            </div>
          )}
          {method === 'Card' && (
            <div className="space-y-3">
              <input placeholder="Card Number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
              <div className="flex gap-2">
                <input placeholder="MM/YY" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                <input placeholder="CVV" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">← Back</button>
            <button onClick={pay} disabled={processing}
              className="flex-1 bg-emerald-600 disabled:opacity-60 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {processing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing...</> : <><i className="fas fa-lock"></i> Pay Securely</>}
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="text-center space-y-5 py-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 text-4xl flex items-center justify-center mx-auto border-4 border-emerald-200">
            <i className="fas fa-circle-check"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xl">Payment Successful!</h3>
            <p className="text-sm text-slate-500 mt-1">₹{amount} paid via {method}</p>
            <p className="text-xs text-slate-500 mt-0.5">Receipt sent to your registered email</p>
          </div>
          <button onClick={done} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientBilling() {
  const toast = useToast();
  const { appointments } = useClinicData();
  const [rawTransactions, setRawTransactions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFor, setPayFor] = useState({ amount: 0, description: '' });
  const [labsData, setLabsData] = useState(() => {
    const raw = localStorage.getItem('prescribed_labs');
    return raw ? JSON.parse(raw) : null;
  });

  const loadTransactions = () => apiFetch('/billing/transactions').then(setRawTransactions).catch(err => toast(err.message || 'Failed to load transactions', 'error'));
  useEffect(() => { loadTransactions(); }, []);
  useEffect(() => { apiFetch('/doctors/search').then(setDoctors).catch(() => setDoctors([])); }, []);

  const transactions = useMemo(() => rawTransactions.map(t => ({
    id: t.id,
    txn_ref: t.txn_ref,
    date: new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    doctor: t.doctorName ? `Dr. ${t.doctorName}` : '—',
    type: t.service,
    amount: Number(t.amount),
    status: PAYMENT_STATUS_TO_DISPLAY[t.status] || 'pending',
    method: t.method || '—',
  })), [rawTransactions]);

  const doctorById = useMemo(() => new Map(doctors.map(d => [d.id, d])), [doctors]);

  const upcomingPayment = useMemo(() => {
    const next = appointments
      .filter(a => !['Done', 'Cancelled', 'No Show', 'Requested'].includes(a.status))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
    if (!next) return null;
    const doc = doctorById.get(next.doctorId);
    return {
      appointmentId: next.id,
      doctor: `Dr. ${next.doctorName}`,
      date: next.date,
      amount: doc?.consultation_fee ?? 799,
    };
  }, [appointments, doctorById]);

  const totalPaid = transactions.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);

  const openPay = (amount, description, appointmentId) => {
    setPayFor({ amount, description });
    setPayTarget(appointmentId);
    setShowPayModal(true);
  };

  const handlePaySuccess = async (method) => {
    try {
      await apiFetch('/billing/pay', { method: 'POST', body: { appointmentId: payTarget, method } });
      await loadTransactions();
      toast(`Payment of ₹${payFor.amount} successful!`, 'success');
    } catch (err) {
      toast(err.message || 'Payment failed', 'error');
      throw err;
    }
  };

  // Real client-side CSV built from the already-loaded transaction list — no
  // backend export endpoint exists, but this doesn't need a fake success toast
  // since it's an actual file built from actual data.
  const handleExport = () => {
    if (!transactions.length) { toast('No transactions to export yet.', 'info'); return; }
    const header = ['Date', 'Doctor', 'Type', 'Method', 'Amount', 'Status', 'Reference'];
    const rows = transactions.map(t => [t.date, t.doctor, t.type, t.method, t.amount, t.status, t.txn_ref || t.id]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healnari-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded to your device!', 'success');
  };

  // No backend invoice/PDF endpoint exists — build a plain-text receipt from
  // the transaction row's already-loaded (real) data instead of faking a download.
  const downloadReceipt = (txn) => {
    const lines = [
      'HealNari — Payment Receipt', '',
      `Reference: ${txn.txn_ref || txn.id}`,
      `Date: ${txn.date}`,
      `Doctor: ${txn.doctor}`,
      `Service: ${txn.type}`,
      `Amount: ₹${txn.amount}`,
      `Method: ${txn.method}`,
      `Status: ${txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${txn.txn_ref || txn.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // No home-collection booking endpoint exists yet — be upfront about that
  // instead of "booking" it purely in localStorage.
  const handleBookCollection = () => {
    toast('Online booking for home collection is coming soon. Please call the clinic to schedule.', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Billing & Payments</h1>
        <p className="text-sm text-slate-500">View payment history, invoices, and manage your wallet.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Total Spent */}
        <div className="bg-gradient-to-br from-aubergine-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-10"><i className="fas fa-indian-rupee-sign"></i></div>
          <div className="text-sm text-indigo-200 font-medium mb-1">Total Spent</div>
          <div className="text-3xl font-black">₹{totalPaid.toLocaleString()}</div>
          <div className="text-xs text-indigo-300 mt-2">{transactions.filter(t => t.status === 'paid').length} transactions</div>
        </div>

        {/* Upcoming Due */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-sm text-slate-500 font-medium mb-1">Next Consultation</div>
          {upcomingPayment ? (
            <>
              <div className="text-2xl font-black text-slate-800">₹{upcomingPayment.amount}</div>
              <div className="text-xs text-slate-500 mt-1">{upcomingPayment.doctor} • {upcomingPayment.date}</div>
              <button onClick={() => openPay(upcomingPayment.amount, `Consultation — ${upcomingPayment.doctor}`, upcomingPayment.appointmentId)}
                className="mt-3 w-full text-center bg-aubergine-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-aubergine-700 transition-colors">
                Pay Now
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500 mt-2">No upcoming consultation due.</div>
          )}
        </div>

        {/* Coupon — not wired to a real discount on the backend yet */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-sm text-slate-500 font-medium mb-1">Promo / Coupon</div>
          <div className="flex gap-2 mt-2">
            <input disabled placeholder="Coming soon"
              className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-100 text-slate-400 cursor-not-allowed" />
            <button disabled className="bg-slate-200 text-slate-400 font-bold px-3 py-2 rounded-xl text-xs shrink-0 cursor-not-allowed">Apply</button>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 italic">Promo codes aren't available yet — check back soon.</p>
        </div>
      </div>

      {/* Prescribed Labs */}
      {labsData && (
        <div className="bg-indigo-50 border border-aubergine-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div className="space-y-1">
            <span className="bg-aubergine-100 text-aubergine-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-aubergine-200">
              Prescribed Diagnostic Lab Panel
            </span>
            <h3 className="font-extrabold text-slate-800 text-base pt-1">
              Required blood work ordered by {labsData.prescribedBy} ({labsData.date})
            </h3>
            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4 pt-1 font-semibold">
              {labsData.labs.map(lab => <li key={lab}>{lab}</li>)}
            </ul>
          </div>
          <div className="flex flex-col items-end shrink-0 gap-2 w-full md:w-auto">
            {labsData.status === 'booked' ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <i className="fas fa-circle-check"></i> Collection Booked: Tomorrow (7:00 AM)
              </div>
            ) : (
              <>
                <span className="text-xs text-slate-500 font-bold">Estimated Cost: ₹1,499 (Zero-Fee Pick-up)</span>
                <button onClick={handleBookCollection}
                  className="bg-aubergine-100 text-aubergine-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 hover:bg-aubergine-200">
                  <i className="fas fa-truck-droplet"></i> Book Home Blood Collection
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Transaction History</h2>
          <button onClick={handleExport} className="text-xs font-bold text-aubergine-600 hover:text-aubergine-700 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-aubergine-50 transition-colors">
            <i className="fas fa-download"></i> Export All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Doctor</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{txn.date}</td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800 text-sm">{txn.doctor}</div>
                    <div className="text-xs text-slate-500 font-mono">{txn.txn_ref || txn.id}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{txn.type}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <i className={`fas ${METHOD_ICON[txn.method] || 'fa-money-bill'}`}></i> {txn.method}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-black text-slate-800">₹{txn.amount}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[txn.status]}`}>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => downloadReceipt(txn)}
                      className="text-aubergine-600 hover:text-aubergine-800 text-xs font-bold flex items-center gap-1 ml-auto hover:underline">
                      <i className="fas fa-file-invoice"></i> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        amount={payFor.amount}
        description={payFor.description}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}

export default PatientBilling;
