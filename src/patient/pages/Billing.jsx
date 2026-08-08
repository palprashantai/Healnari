import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ─────────────────────────────── */
const TRANSACTIONS = [
  { id: 'TXN-9821', date: '25 Jun 2026', doctor: 'Dr. Sarah Mitchell', type: 'Consultation', amount: 799, status: 'paid', method: 'UPI' },
  { id: 'TXN-9654', date: '18 Jun 2026', doctor: 'Dr. Ananya Pillai', type: 'Follow-up', amount: 399, status: 'paid', method: 'Card' },
  { id: 'TXN-9210', date: '10 Jun 2026', doctor: 'Dr. Sarah Mitchell', type: 'Lab Package', amount: 1499, status: 'paid', method: 'Net Banking' },
  { id: 'TXN-8987', date: '28 May 2026', doctor: 'Dr. Vivek Nair', type: 'Consultation', amount: 599, status: 'refunded', method: 'UPI' },
  { id: 'TXN-8654', date: '14 May 2026', doctor: 'Dr. Sarah Mitchell', type: 'Consultation', amount: 799, status: 'paid', method: 'Wallet' },
];

const STATUS_STYLE = {
  paid:     'bg-emerald-50 text-emerald-700 border-emerald-100',
  refunded: 'bg-rose-50 text-rose-700 border-rose-100',
  pending:  'bg-amber-50 text-amber-700 border-amber-100',
};

const METHOD_ICON = { UPI: 'fa-mobile-screen-button', Card: 'fa-credit-card', 'Net Banking': 'fa-building-columns', Wallet: 'fa-wallet' };

const UPCOMING_PAYMENT = { doctor: 'Dr. Sarah Mitchell', date: 'Mon, 10 Aug 2026', amount: 799, id: 'APT-101' };

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

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep(3);
    }, 2000);
  };

  const done = () => {
    onSuccess(method);
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
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');
  const [transactions, setTransactions] = useState(TRANSACTIONS);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFor, setPayFor] = useState({ amount: 0, description: '' });
  const [labsData, setLabsData] = useState(() => {
    const raw = localStorage.getItem('prescribed_labs');
    return raw ? JSON.parse(raw) : null;
  });

  const totalPaid = transactions.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'HEALNARI10') {
      setCouponApplied(true);
      setCouponMsg('10% off applied on your next booking!');
      toast('Coupon HEALNARI10 applied — 10% off!', 'success');
    } else {
      setCouponApplied(false);
      setCouponMsg('Invalid coupon code. Try HEALNARI10!');
      toast('Invalid coupon code.', 'error');
    }
  };

  const openPay = (amount, description) => {
    setPayFor({ amount: couponApplied ? Math.round(amount * 0.9) : amount, description });
    setShowPayModal(true);
  };

  const handlePaySuccess = (method) => {
    const newTxn = {
      id: `TXN-${Math.floor(Math.random() * 9000) + 1000}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: UPCOMING_PAYMENT.doctor,
      type: 'Consultation',
      amount: payFor.amount,
      status: 'paid',
      method,
    };
    setTransactions(prev => [newTxn, ...prev]);
    toast(`Payment of ₹${payFor.amount} successful!`, 'success');
  };

  const handleExport = () => {
    toast('Exporting transaction history as CSV...', 'info');
    setTimeout(() => toast('CSV downloaded to your device!', 'success'), 1500);
  };

  const handleBookCollection = () => {
    const updated = { ...labsData, status: 'booked' };
    localStorage.setItem('prescribed_labs', JSON.stringify(updated));
    setLabsData(updated);
    toast('Home blood collection booked for tomorrow 7:00 AM!', 'success');
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
          <div className="text-2xl font-black text-slate-800">₹{couponApplied ? Math.round(UPCOMING_PAYMENT.amount * 0.9) : UPCOMING_PAYMENT.amount}</div>
          {couponApplied && <div className="text-xs text-slate-500 font-bold line-through">₹799 <span className="no-underline text-emerald-600">(10% off applied!)</span></div>}
          <div className="text-xs text-slate-500 mt-1">Due: {UPCOMING_PAYMENT.date}</div>
          <button onClick={() => openPay(UPCOMING_PAYMENT.amount, `Consultation — ${UPCOMING_PAYMENT.doctor}`)}
            className="mt-3 w-full text-center bg-aubergine-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-aubergine-700 transition-colors">
            Pay Now
          </button>
        </div>

        {/* Coupon */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-sm text-slate-500 font-medium mb-1">Promo / Coupon</div>
          {couponApplied ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-tag text-emerald-500"></i>
                <span className="text-sm font-bold text-emerald-700">HEALNARI10 Applied!</span>
              </div>
              <button onClick={() => { setCouponApplied(false); setCoupon(''); setCouponMsg(''); toast('Coupon removed.', 'info'); }}
                className="text-xs text-rose-500 hover:underline font-semibold">Remove coupon</button>
            </div>
          ) : (
            <div className="flex gap-2 mt-2">
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code"
                onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
              <button onClick={applyCoupon} className="bg-aubergine-600 text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-aubergine-700 transition-colors shrink-0">Apply</button>
            </div>
          )}
          {couponMsg && !couponApplied && (
            <p className="text-xs mt-2 font-medium text-rose-500">{couponMsg}</p>
          )}
          <p className="text-[10px] text-slate-500 mt-3 italic">Hint: Try HEALNARI10</p>
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
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2">
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
                    <div className="text-xs text-slate-500 font-mono">{txn.id}</div>
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
                    <button onClick={() => toast(`Downloading invoice ${txn.id}...`, 'info')}
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
