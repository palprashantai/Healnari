import React, { useState, useEffect, useRef } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { Modal } from './Modal.jsx';
import { apiFetch, API_URL } from '../lib/apiClient.js';
import { formatCurrency } from '../lib/currency.js';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';

// Cashfree.js recommends loading the SDK once and reusing the instance
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

/**
 * Shared real-payment flow — creates a Cashfree order for the appointment,
 * opens Cashfree Drop-in checkout (UPI, Cards, NetBanking, International Cards),
 * re-verifies order status server-side, and enables 1-click Invoice PDF download.
 */
export function PaymentModal({
  isOpen,
  onClose,
  appointmentId,
  amount,
  currency: initialCurrency = 'INR',
  description,
  onPaid,
  onSuccess,
  onViewAppointment,
}) {
  // idle -> creating-order -> checkout -> verifying -> paid | failed
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [settledAmount, setSettledAmount] = useState(amount);
  const [currency, setCurrency] = useState(initialCurrency);
  const [completedResult, setCompletedResult] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setError(null);
      setSettledAmount(amount);
      setCurrency(initialCurrency);
      setCompletedResult(null);
      setDownloadingInvoice(false);
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
      const order = await apiFetch('/billing/pay/order', {
        method: 'POST',
        body: { appointmentId },
      });

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
      if (!cashfree) {
        throw new Error(
          'Could not load the secure payment gateway. Please check your network connection and try again.',
        );
      }

      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal',
        appearance: {
          theme: 'light',
          color: '#6B46C1', // HealNari Purple
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      });

      // SDK promise resolves when checkout closes — authoritative verify on backend
      setPhase('verifying');
      const result = await apiFetch(`/billing/pay/status/${order.orderId}`);
      if (result.status === 'Paid') {
        setSettledAmount(Number(result.amount));
        setCurrency(result.currency || initialCurrency);
        setPhase('paid');
        handleSuccess(result);
      } else {
        setError(
          result.status === 'Failed'
            ? 'The payment was not approved by your bank or wallet provider.'
            : 'Payment was not completed. You can try again safely.',
        );
        setPhase('failed');
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setPhase('failed');
    } finally {
      startedRef.current = false;
    }
  };

  const handleDownloadInvoice = async () => {
    if (!completedResult?.id) return;
    setDownloadingInvoice(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/billing/transactions/${completedResult.id}/invoice`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error('Could not generate the official invoice PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HealNari-Invoice-${completedResult.txn_ref || String(completedResult.id).slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Invoice download failed.');
    } finally {
      setDownloadingInvoice(false);
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

  const busy =
    phase === 'creating-order' || phase === 'checkout' || phase === 'verifying';
  const BUSY_COPY = {
    'creating-order': 'Initializing secure checkout order…',
    checkout: 'Complete payment in the secure window…',
    verifying: 'Confirming your transaction with Cashfree…',
  };

  const displayAmount = settledAmount ?? amount ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={phase === 'paid' ? done : onClose}
      title={phase === 'paid' ? undefined : 'Secure Checkout'}
      size="sm"
    >
      {(phase === 'idle' ||
        phase === 'creating-order' ||
        phase === 'checkout' ||
        phase === 'verifying') && (
        <div className="space-y-4">
          {/* Itemized summary */}
          <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/50 border border-purple-200/70 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-200">
                  {currency === 'INR' ? '🇮🇳 Domestic Consult' : '🌐 International Consult'}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                  {description || 'Clinical Consultation'}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {currency}
              </span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-purple-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Specialist Consultation Fee</span>
                <span className="font-semibold text-slate-800">{formatCurrency(displayAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Platform Governance &amp; Follow-up</span>
                <span className="font-bold text-emerald-600">Included Free</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-purple-200">
                <span>Total Payable Amount</span>
                <span className="text-base text-purple-900">{formatCurrency(displayAmount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment rails badge */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
            <i className="fas fa-shield-halved text-emerald-500 text-sm shrink-0" />
            <span className="leading-tight">
              {currency === 'INR'
                ? 'Secured by Cashfree Payments — UPI, Credit/Debit Cards, Net Banking & Wallets.'
                : 'Secured Multi-Currency Gateway — Visa, Mastercard, AMEX & International Cards.'}
            </span>
          </div>

          <button
            onClick={startCheckout}
            disabled={busy}
            className="crm-btn-primary w-full disabled:opacity-60 font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            {busy ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{BUSY_COPY[phase] || 'Processing…'}</span>
              </>
            ) : (
              <>
                <i className="fas fa-lock text-xs" />
                <span>Pay Securely {formatCurrency(displayAmount, currency)}</span>
              </>
            )}
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
                If your bank placed a temporary hold, it will automatically reverse in 24–48 hours. Your consultation slot remains reserved.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="crm-btn-secondary flex-1 font-semibold text-xs py-3">
              Cancel
            </button>
            <button onClick={retry} className="crm-btn-primary flex-1 font-bold text-xs py-3">
              Try Another Payment Method
            </button>
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
            <p className="text-sm font-bold text-emerald-700 mt-1">
              {formatCurrency(settledAmount ?? amount, currency)} paid securely
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your appointment is locked in. Digital prescription access and free 14-day follow-up chat are now active.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {completedResult?.id && (
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <i className={`fas ${downloadingInvoice ? 'fa-spinner fa-spin' : 'fa-file-invoice text-purple-600'}`} />
                <span>{downloadingInvoice ? 'Generating PDF…' : 'Download Official Invoice PDF'}</span>
              </button>
            )}

            <button
              onClick={done}
              className="crm-btn-primary w-full py-3 text-sm font-bold shadow-md"
            >
              View Appointment Details →
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PaymentModal;

