import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { PaymentModal } from '../../components/PaymentModal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch, API_URL, getTokens } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { AISubscriptionCard } from '../../components/ai/AISubscriptionCard.jsx';

const STATUS_STYLE = {
  paid:            'bg-emerald-50 text-emerald-700 border-emerald-100',
  refunded:        'bg-rose-50 text-rose-700 border-rose-100',
  pending:         'bg-amber-50 text-amber-700 border-amber-100',
  insurance:       'bg-aubergine-50 text-aubergine-700 border-aubergine-100',
  'refund pending': 'bg-amber-50 text-amber-700 border-amber-100',
  failed:          'bg-rose-50 text-rose-700 border-rose-100',
};

// 'Insurance Claimed' is NOT out-of-pocket spend — kept as its own status so
// it's excluded from the "Total Spent" sum below instead of inflating it.
const PAYMENT_STATUS_TO_DISPLAY = { Paid: 'paid', Pending: 'pending', Refunded: 'refunded', 'Insurance Claimed': 'insurance', 'Refund Pending': 'refund pending', Failed: 'failed' };

const METHOD_ICON = { UPI: 'fa-mobile-screen-button', Card: 'fa-credit-card', 'Net Banking': 'fa-building-columns', Wallet: 'fa-wallet' };

/* ─── Main Component ─────────────────────────── */
function PatientBilling() {
  const { user } = useAuth();
  const toast = useToast();
  // transactions is shared via ClinicDataContext (not fetched locally) so a
  // payment made from the Appointments page shows up here immediately, and
  // vice versa, instead of each page tracking its own stale copy.
  const { appointments, transactions: rawTransactions, syncPayment, updateAppointmentStatus } = useClinicData();
  const [doctors, setDoctors] = useState([]);
  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFor, setPayFor] = useState(() => ({
    amount: 0,
    currency: localStorage.getItem('healnari_currency') || 'INR',
    description: '',
  }));

  useEffect(() => { apiFetch('/doctors/search').then(setDoctors).catch(() => setDoctors([])); }, []);

  // Most Cashfree payment methods complete inside the Drop-in modal, but a
  // few (some bank UPI/net-banking flows) redirect the whole page to their
  // own app/bank UI and back — landing here on Cashfree's order_meta.return_url
  // with ?cf_order_id=... instead of resolving inside PaymentModal. Catch
  // that case and reconcile it the same way PaymentModal does.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfOrderId = params.get('cf_order_id');
    if (!cfOrderId) return;
    window.history.replaceState({}, '', window.location.pathname);
    apiFetch(`/billing/pay/status/${cfOrderId}`)
      .then((result) => {
        syncPayment(result);
        if (result.status === 'Paid') toast(`Payment of ${formatCurrency(result.amount, result.currency || 'INR')} successful!`, 'success');
        else if (result.status === 'Failed') toast('Payment did not go through.', 'error');
      })
      .catch(() => {});
  }, []);

  const transactions = useMemo(() => rawTransactions.map(t => ({
    id: t.id,
    txn_ref: t.txn_ref,
    date: new Date(t.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    doctor: t.doctorName ? `Dr. ${t.doctorName}` : '—',
    type: t.service,
    amount: Number(t.amount),
    currency: t.currency || 'INR',
    status: PAYMENT_STATUS_TO_DISPLAY[t.status] || 'pending',
    method: t.method || '—',
  })), [rawTransactions]);

  const doctorById = useMemo(() => new Map(doctors.map(d => [d.id, d])), [doctors]);

  // Without excluding paid appointments here, "Pay Now" would stay clickable
  // after a successful payment and open a fresh Cashfree order on a second click.
  const paidAppointmentIds = useMemo(
    () => new Set(rawTransactions.filter(t => t.status === 'Paid').map(t => t.appointment_id)),
    [rawTransactions]
  );

  const upcomingPayment = useMemo(() => {
    const next = appointments
      .filter(a => !['Done', 'Cancelled', 'No Show', 'Requested'].includes(a.status) && !paidAppointmentIds.has(a.id))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
    if (!next) return null;
    const doc = doctorById.get(next.doctorId);
    return {
      appointmentId: next.id,
      doctor: `Dr. ${next.doctorName}`,
      date: next.date,
      amount: doc?.consultation_fee ?? 29,
      currency: doc?.currency || next.currency || 'INR',
    };
  }, [appointments, doctorById, paidAppointmentIds]);

  const totalPaidInr = transactions.filter(t => t.status === 'paid' && t.currency === 'INR').reduce((s, t) => s + t.amount, 0);
  const totalPaidUsd = transactions.filter(t => t.status === 'paid' && t.currency === 'USD').reduce((s, t) => s + t.amount, 0);

  const openPay = (amount, description, appointmentId, currency = 'INR') => {
    setPayFor({ amount, description, currency });
    setPayTarget(appointmentId);
    setShowPayModal(true);
  };

  const handlePaid = async (payment) => {
    syncPayment(payment);
    if (payTarget) {
      try {
        await updateAppointmentStatus(payTarget, 'Upcoming');
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }
    toast(`Payment of ${formatCurrency(payFor.amount, payFor.currency)} successful!`, 'success');
    apiFetch('/communications/broadcasts', {
      method: 'POST',
      body: {
        subject: `Payment Confirmed — ${formatCurrency(payFor.amount, payFor.currency)}`,
        body: `Thank you for your payment of ${formatCurrency(payFor.amount, payFor.currency)}.\n\nYou can download your invoice from your portal:\nhttps://app.healnari.com/patient-dashboard/billing`,
        channels: ['Push Notification', 'Email'],
        scheduleType: 'immediate',
        patientIds: [user.id],
      },
    }).catch(() => {});
  };

  // Real client-side CSV built from the already-loaded transaction list — no
  // backend export endpoint exists, but this doesn't need a fake success toast
  // since it's an actual file built from actual data.
  const handleExport = () => {
    if (!transactions.length) { toast('No transactions to export yet.', 'info'); return; }
    const header = ['Date', 'Doctor', 'Type', 'Method', 'Amount', 'Currency', 'Status', 'Reference'];
    const rows = transactions.map(t => [t.date, t.doctor, t.type, t.method, t.amount, t.currency, t.status, t.txn_ref || t.id]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healnari-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadReceipt = async (txn) => {
    try {
      const token = getTokens()?.accessToken;
      const res = await fetch(`${API_URL}/billing/transactions/${txn.id}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HealNari-Invoice-${txn.txn_ref || txn.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast('Receipt downloaded successfully', 'success');
    } catch (err) {
      toast(err.message || 'Could not download receipt', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 font-display">Billing & Payments</h1>
        <p className="text-sm text-slate-500">View payment history, invoices, and manage your consultations in {defaultCurrency}.</p>
      </div>

      {/* AI Subscription Status Card */}
      <AISubscriptionCard userRole="patient" />

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Total Spent */}
        <div className="bg-gradient-to-br from-[#2A1647] via-[#3A1C78] to-[#2A1647] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-10"><i className="fas fa-wallet"></i></div>
          <div className="text-sm text-aubergine-200 font-medium mb-1">Total Spent</div>
          <div className="space-y-0.5">
            {totalPaidInr > 0 && <div className="text-2xl font-black">{formatCurrency(totalPaidInr, 'INR')}</div>}
            {totalPaidUsd > 0 && <div className="text-2xl font-black">{formatCurrency(totalPaidUsd, 'USD')}</div>}
            {totalPaidInr === 0 && totalPaidUsd === 0 && <div className="text-2xl font-black">{formatCurrency(0, 'INR')}</div>}
          </div>
          <div className="text-xs text-aubergine-300 mt-2">{transactions.filter(t => t.status === 'paid').length} transactions</div>
        </div>

        {/* Upcoming Due */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-sm text-slate-500 font-medium mb-1">Next Consultation</div>
          {upcomingPayment ? (
            <>
              <div className="text-2xl font-black text-slate-800">{formatCurrency(upcomingPayment.amount, upcomingPayment.currency)}</div>
              <div className="text-xs text-slate-500 mt-1">{upcomingPayment.doctor} • {upcomingPayment.date}</div>
              <button onClick={() => openPay(upcomingPayment.amount, `Consultation — ${upcomingPayment.doctor}`, upcomingPayment.appointmentId, upcomingPayment.currency)}
                className="mt-3 w-full btn-brand !h-9 !text-xs">
                Pay Now
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500 mt-2">No payment due right now.</div>
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

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Transaction History</h2>
          <button onClick={handleExport} className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5">
            <i className="fas fa-download"></i> Export All
          </button>
        </div>
        <div className="crm-table-container border-0 rounded-none">
          <table className="crm-table">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Date</th>
                <th className="whitespace-nowrap">Doctor</th>
                <th className="whitespace-nowrap">Type</th>
                <th className="whitespace-nowrap">Method</th>
                <th className="whitespace-nowrap">Amount</th>
                <th className="whitespace-nowrap">Status</th>
                <th className="text-right whitespace-nowrap">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="text-slate-500">{txn.date}</td>
                  <td>
                    <div className="font-bold text-slate-800 text-sm">{txn.doctor}</div>
                    <div className="text-xs text-slate-500 font-mono">{txn.txn_ref || txn.id}</div>
                  </td>
                  <td className="text-slate-600">{txn.type}</td>
                  <td>
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <i className={`fas ${METHOD_ICON[txn.method] || 'fa-money-bill'}`}></i> {txn.method}
                    </span>
                  </td>
                  <td className="font-black text-slate-800">{formatCurrency(txn.amount, txn.currency)}</td>
                  <td>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[txn.status]}`}>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-right">
                    <button onClick={() => downloadReceipt(txn)}
                      className="text-aubergine-600 hover:text-aubergine-800 text-xs font-bold inline-flex items-center gap-1 hover:underline">
                      <i className="fas fa-file-invoice"></i> Download
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        appointmentId={payTarget}
        amount={payFor.amount}
        currency={payFor.currency}
        description={payFor.description}
        onSuccess={handlePaid}
      />
    </div>
  );
}

export default PatientBilling;
