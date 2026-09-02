import React from 'react';
import { Modal } from '../Modal.jsx';
import { formatMoney } from '../../lib/currency.js';

export function InvoiceModal({ isOpen, onClose, transaction, user }) {
  if (!transaction) return null;

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice — ${transaction.id || 'Receipt'}</title>
<style>
  *{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:48px;color:#1e293b;max-width:720px;margin:auto;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand{font-size:22px;font-weight:900;color:#6B46C1;letter-spacing:-0.5px}
  .receipt-title{font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px}
  hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:13px;margin-bottom:32px}
  .meta-label{color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .meta-val{font-weight:600;color:#1e293b}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
  th{text-align:left;padding:10px 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase}
  td{padding:12px 0;border-bottom:1px solid #f1f5f9}
  .total-row td{font-weight:800;font-size:15px;color:#1e293b;border-top:2px solid #1e293b;border-bottom:none;padding-top:16px}
  .status{display:inline-block;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;text-transform:uppercase;background:#ecfdf5;color:#047857}
  .footer{font-size:11px;color:#94a3b8;text-align:center;margin-top:48px;border-top:1px solid #f1f5f9;padding-top:20px}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div>
    <div class="brand">HealNari</div>
    <p style="color:#64748b;font-size:12px;margin:2px 0 0">Women’s Health & Clinical AI Platform</p>
  </div>
  <div style="text-align:right">
    <div class="receipt-title">Payment Receipt</div>
    <div style="font-family:monospace;font-size:12px;color:#64748b;margin-top:4px">#${transaction.id || transaction.gateway_txn_id || 'TXN'}</div>
  </div>
</div>
<hr>
<div class="meta-grid">
  <div>
    <div class="meta-label">Billed To</div>
    <div class="meta-val">${user?.profile?.full_name || user?.email || 'Valued Subscriber'}</div>
    <div style="color:#64748b;font-size:12px">${user?.email || ''}</div>
  </div>
  <div style="text-align:right">
    <div class="meta-label">Payment Details</div>
    <div class="meta-val">Date: ${new Date(transaction.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    <div style="margin-top:4px"><span class="status">${transaction.status || 'PAID'}</span></div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:center">Plan / Code</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>${transaction.plan_id ? transaction.plan_id.replace(/_/g, ' ').toUpperCase() : 'AI Subscription'}</strong><br><span style="color:#64748b;font-size:11px">AI Token credits & priority LLM intelligence</span></td>
      <td style="text-align:center;color:#64748b;font-mono">${transaction.plan_id || '—'}</td>
      <td style="text-align:right">${formatMoney(transaction.base_amount || transaction.final_amount || 0, currency)}</td>
    </tr>
    ${transaction.discount_amount ? `<tr><td colspan="2" style="color:#10b981">Discount Applied (${transaction.coupon_code || 'Promo'})</td><td style="text-align:right;color:#10b981">-${formatMoney(transaction.discount_amount, currency)}</td></tr>` : ''}
    ${transaction.tax_amount ? `<tr><td colspan="2" style="color:#64748b">Tax / GST (${transaction.tax_rate || 18}%)</td><td style="text-align:right;color:#64748b">${formatMoney(transaction.tax_amount, currency)}</td></tr>` : ''}
    <tr class="total-row">
      <td colspan="2">Total Paid</td>
      <td style="text-align:right">${formatMoney(transaction.final_amount || transaction.base_amount || 0, currency)}</td>
    </tr>
  </tbody>
</table>
<div class="footer">
  Thank you for powering your care workflow with HealNari AI. For billing inquiries, contact billing@healnari.com.
</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const currency = transaction.original_currency || 'INR';
  const total = Number(transaction.final_amount || transaction.base_amount || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice & Payment Receipt" size="md">
      <div className="space-y-5 text-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice ID</span>
            <p className="font-mono text-xs font-semibold text-slate-700">{transaction.id || transaction.gateway_txn_id}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {(transaction.status || 'Paid').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subscriber</span>
            <p className="font-semibold text-slate-800">{user?.profile?.full_name || user?.email || 'Current Subscriber'}</p>
            <p className="text-slate-500 text-[11px]">{user?.email}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</span>
            <p className="font-semibold text-slate-800">
              {new Date(transaction.created_at || Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
            <p className="text-slate-400 text-[11px]">Payment: {transaction.gateway || 'Card / Gateway'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between font-semibold text-slate-800">
            <span>{transaction.plan_id ? transaction.plan_id.replace(/_/g, ' ').toUpperCase() : 'AI Plan Subscription'}</span>
            <span>{formatMoney(transaction.base_amount || total, currency)}</span>
          </div>
          {transaction.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Coupon Discount ({transaction.coupon_code || 'Promo'})</span>
              <span>-{formatMoney(transaction.discount_amount, currency)}</span>
            </div>
          )}
          {transaction.tax_amount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax / GST ({transaction.tax_rate || 18}%)</span>
              <span>+{formatMoney(transaction.tax_amount, currency)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
            <span>Total Paid</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-print text-xs"></i> Print / Save PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default InvoiceModal;
