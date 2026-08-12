import React, { useState, useEffect, useRef } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { Modal } from './Modal.jsx';
import { apiFetch } from '../lib/apiClient.js';
import { formatCurrency } from '../lib/currency.js';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';

// Cashfree.js recommends loading the SDK once and reusing the instance
// rather than re-fetching it on every checkout attempt.
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

/** Shared real-payment flow — creates a Cashfree order for the appointment,
 * opens Cashfree's own hosted Drop-in checkout (UPI/Card/NetBanking/Wallet,
 * all real), then asks OUR backend to re-verify the order status directly
 * with Cashfree before ever showing "Payment Successful". Used anywhere a
 * patient can pay for an appointment (Billing, Appointments) so there is
 * exactly one real payment path instead of a per-page fake one. */
export function PaymentModal({ isOpen, onClose, appointmentId, amount, description, onPaid }) {
  // idle -> creating-order -> checkout -> verifying -> paid | failed
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [settledAmount, setSettledAmount] = useState(amount);
  const [currency, setCurrency] = useState('INR');
  const startedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setError(null);
      setSettledAmount(amount);
      setCurrency('INR');
      startedRef.current = false;
    }
  }, [isOpen, amount]);

  const startCheckout = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setPhase('creating-order');
    try {
      const order = await apiFetch('/billing/pay/order', { method: 'POST', body: { appointmentId } });

      if (order.alreadyPaid) {
        setSettledAmount(Number(order.payment.amount));
        setCurrency(order.payment.currency || 'INR');
        setPhase('paid');
        onPaid?.(order.payment);
        return;
      }

      setSettledAmount(order.amount);
      setCurrency(order.currency || 'INR');
      setPhase('checkout');

      const cashfree = await getCashfree();
      if (!cashfree) throw new Error('Could not load the payment gateway. Check your connection and try again.');

      await cashfree.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: '_modal' });

      // The SDK promise resolving only means the checkout UI closed — it does
      // NOT mean the payment succeeded (user may have cancelled, or the bank
      // step failed after Cashfree's UI moved on). Always re-verify with our
      // backend, which itself re-checks directly with Cashfree.
      setPhase('verifying');
      const result = await apiFetch(`/billing/pay/status/${order.orderId}`);
      if (result.status === 'Paid') {
        setSettledAmount(Number(result.amount));
        setCurrency(result.currency || 'INR');
        setPhase('paid');
        onPaid?.(result);
      } else {
        setError(result.status === 'Failed' ? 'The payment did not go through.' : 'Payment not completed. You can try again.');
        setPhase('failed');
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setPhase('failed');
    } finally {
      startedRef.current = false;
    }
  };

  const retry = () => {
    setPhase('idle');
    setError(null);
  };

  const done = () => {
    onClose();
    setPhase('idle');
    setError(null);
  };

  const busy = phase === 'creating-order' || phase === 'checkout' || phase === 'verifying';
  const BUSY_COPY = {
    'creating-order': 'Setting up your payment…',
    checkout: 'Complete your payment in the window…',
    verifying: 'Confirming your payment…',
  };

  return (
    <Modal isOpen={isOpen} onClose={phase === 'paid' ? done : onClose} title={phase === 'paid' ? undefined : 'Make Payment'} size="sm">
      {(phase === 'idle' || phase === 'creating-order' || phase === 'checkout' || phase === 'verifying') && (
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">{description}</p>
            <p className="text-3xl font-black text-aubergine-800">{formatCurrency(settledAmount ?? amount, currency)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <i className="fas fa-shield-halved text-emerald-500"></i> Secured by Cashfree Payments — UPI, Card, Net Banking & Wallets
          </div>
          <button onClick={startCheckout} disabled={busy}
            className="w-full bg-emerald-600 disabled:opacity-60 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            {busy ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {BUSY_COPY[phase] || 'Processing…'}</> : <><i className="fas fa-lock"></i> Pay Securely</>}
          </button>
        </div>
      )}
      {phase === 'failed' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-center">
            <i className="fas fa-circle-exclamation text-2xl mb-2"></i>
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
            <button onClick={retry} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Try Again</button>
          </div>
        </div>
      )}
      {phase === 'paid' && (
        <div className="text-center space-y-5 py-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 text-4xl flex items-center justify-center mx-auto border-4 border-emerald-200">
            <i className="fas fa-circle-check"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xl">Payment Successful!</h3>
            <p className="text-sm text-slate-500 mt-1">{formatCurrency(settledAmount ?? amount, currency)} paid via Cashfree</p>
            <p className="text-xs text-slate-500 mt-0.5">Receipt available in your billing history</p>
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
