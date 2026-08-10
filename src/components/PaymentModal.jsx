import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';

const METHODS = [
  { id: 'UPI', label: 'UPI / GPay', icon: 'fa-mobile-screen-button', color: 'text-aubergine-600' },
  { id: 'Card', label: 'Credit / Debit Card', icon: 'fa-credit-card', color: 'text-sky-600' },
  { id: 'Net Banking', label: 'Net Banking', icon: 'fa-building-columns', color: 'text-indigo-600' },
  { id: 'Wallet', label: 'HealNari Wallet (₹450 balance)', icon: 'fa-wallet', color: 'text-emerald-600' },
];

/** Shared payment flow — method selection, confirmation, then a success
 * screen. Used anywhere a patient can pay for an appointment (Billing,
 * Appointments) so the experience — and the actual method they picked —
 * is consistent instead of one page silently charging a hardcoded method. */
export function PaymentModal({ isOpen, onClose, amount, description, onSuccess }) {
  const [method, setMethod] = useState('UPI');
  const [step, setStep] = useState(1);
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);

  // This modal stays mounted across opens (only `isOpen` toggles) — without
  // this, abandoning a payment mid-flow (e.g. closing on step 2) and later
  // opening it again for a different appointment resumed on the stale step
  // with leftover method/UPI-ID data instead of starting clean.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMethod('UPI');
      setUpiId('');
      setProcessing(false);
    }
  }, [isOpen]);

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
    // Step 3 used to pass onClose={undefined} to block dismissal — but Modal's
    // overlay-click and Escape handlers call onClose() unconditionally, so
    // either one crashed with "onClose is not a function" on the success
    // screen. Routing through done() instead lets those still close the
    // modal, while also resetting local state the same way the Done button does.
    <Modal isOpen={isOpen} onClose={step < 3 ? onClose : done} title={step < 3 ? 'Make Payment' : undefined} size="sm">
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

export default PaymentModal;
