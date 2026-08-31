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
export function PaymentModal({ isOpen, onClose, appointmentId, amount, currency: initialCurrency = 'INR', description, onPaid, onSuccess, onViewAppointment }) {
  // idle -> creating-order -> checkout -> verifying -> paid | failed
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [settledAmount, setSettledAmount] = useState(amount);
  const [currency, setCurrency] = useState(initialCurrency);
  const [completedResult, setCompletedResult] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setError(null);
      setSettledAmount(amount);
      setCurrency(initialCurrency);
      setCompletedResult(null);
      startedRef.current = false;
    }
  }, [isOpen, amount, initialCurrency]);

  const handleSuccess = (result) => {
    setCompletedResult(result);
    onPaid?.(result);
    onSuccess?.(result);
  };

  const startCheckout = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setPhase('creating-order');
    try {
      const order = await apiFetch('/billing/pay/order', { method: 'POST', body: { appointmentId } });

      if (order.alreadyPaid) {
        setSettledAmount(Number(order.payment.amount));
        setCurrency(order.payment.currency || initialCurrency);
        setPhase('paid');
        handleSuccess(order.payment);
        return;
      }

      setSettledAmount(order.amount);
      setCurrency(order.currency || initialCurrency);
      setPhase('checkout');

      const cashfree = await getCashfree();
      if (!cashfree) throw new Error('Could not load the payment gateway. Check your connection and try again.');

      await cashfree.checkout({ 
        paymentSessionId: order.paymentSessionId, 
        redirectTarget: '_modal',
        appearance: {
          theme: 'light',
          color: '#6B46C1', // HealNari Purple
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      });

      // The SDK promise resolving only means the checkout UI closed — it does
      // NOT mean the payment succeeded (user may have cancelled, or the bank
      // step failed after Cashfree's UI moved on). Always re-verify with our
      // backend, which itself re-checks directly with Cashfree.
      setPhase('verifying');
      const result = await apiFetch(`/billing/pay/status/${order.orderId}`);
      if (result.status === 'Paid') {
        setSettledAmount(Number(result.amount));
        setCurrency(result.currency || initialCurrency);
        setPhase('paid');
        handleSuccess(result);
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
    if (onViewAppointment) {
      onViewAppointment(completedResult);
    }
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
            <i className="fas fa-shield-halved text-emerald-500"></i> {currency === 'INR' ? 'Secured by Cashfree / Razorpay — UPI, Card, Net Banking & Wallets' : 'Secured by Stripe Global Checkout — Apple Pay, Google Pay, Visa & Mastercard'}
          </div>
          <button onClick={startCheckout} disabled={busy}
            className="crm-btn-primary w-full disabled:opacity-60 font-bold">
            {busy ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> {BUSY_COPY[phase] || 'Processing…'}</> : <><i className="fas fa-lock mr-2"></i> Pay Securely {formatCurrency(settledAmount ?? amount, currency)}</>}
          </button>
        </div>
      )}
      {phase === 'failed' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-lg">
              <i className="fas fa-circle-exclamation"></i>
            </div>
            <h4 className="font-bold text-sm text-slate-800">Payment Could Not Be Completed</h4>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">{error}</p>
            <div className="bg-white/80 rounded-xl p-2.5 border border-rose-150 text-[11px] text-slate-600 text-left space-y-1">
              <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <i className="fas fa-shield-check"></i> <strong>No amount was charged.</strong>
              </p>
              <p className="text-slate-500">
                If your bank placed a temporary hold, it will be automatically reversed in 24–48 hours. Your slot remains held for 5 minutes.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="crm-btn-secondary flex-1 font-semibold text-xs py-3">Cancel</button>
            <button onClick={retry} className="crm-btn-primary flex-1 font-bold text-xs py-3">Try Another Method</button>
          </div>
        </div>
      )}
      {phase === 'paid' && (
        <div className="text-center space-y-4 py-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto border-4 border-emerald-200 shadow-sm animate-bounce-subtle">
            <i className="fas fa-circle-check"></i>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-xl font-display">Consultation Confirmed!</h3>
            <p className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(settledAmount ?? amount, currency)} paid securely</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your appointment is locked in. Digital prescription access and free 14-day follow-up chat are now active.
            </p>
          </div>
          <button onClick={done} className="crm-btn-primary w-full py-3 text-sm font-bold">
            View My Appointment Details →
          </button>
        </div>
      )}
    </Modal>
  );
}

export default PaymentModal;
