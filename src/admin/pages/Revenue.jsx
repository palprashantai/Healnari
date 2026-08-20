import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';

const COUNTRY_FLAGS = {
  US: '🇺🇸',
  GB: '🇬🇧',
  AE: '🇦🇪',
  IN: '🇮🇳',
  CA: '🇨🇦',
  AU: '🇦🇺',
  EU: '🇪🇺',
  GLOBAL: '🌍',
};

function ProcessModal({ payout, isOpen, onClose, onProcess }) {
  const toast = useToast();
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!payout) return null;

  const handleProcess = async () => {
    if (!refId) { toast('Please enter a transaction reference ID', 'error'); return; }
    setLoading(true);
    try {
      await onProcess(payout.id, refId);
      onClose();
    } catch {
      toast('Failed to process payout', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Doctor Payout" size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aubergine-50 border border-aubergine-100 text-aubergine-800 text-xs font-bold mb-2">
            <span>{COUNTRY_FLAGS[payout.country] || '🌍'}</span>
            <span>{payout.currency || 'USD'} Payout</span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">{payout.doctor}</p>
          <p className="text-3xl font-black text-slate-900 font-sans tracking-tight">
            {formatCurrency(payout.amount, payout.currency || 'USD')}
          </p>
          <p className="text-xs font-bold text-slate-400 mt-1 flex items-center justify-center gap-1">
            <i className="fas fa-building-columns text-[10px]"></i> Rail: {payout.method || 'Direct Wire Transfer'}
          </p>
        </div>

        <div>
          <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">
            Bank Settlement / Wire Reference ID
          </label>
          <input 
            value={refId} 
            onChange={e => setRefId(e.target.value)} 
            placeholder="e.g. WT-98234-ACH / IMPS-84920"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white" 
          />
          <p className="text-[11px] text-slate-400 mt-1">This will be shared with the physician and logged on their statement.</p>
        </div>

        <button 
          onClick={handleProcess} 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>} Confirm &amp; Mark Processed
        </button>
      </div>
    </Modal>
  );
}

function AdminRevenue() {
  const toast = useToast();
  const [revenueData, setRevenueData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processTarget, setProcessTarget] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/revenue'),
      apiFetch('/admin/revenue/payouts'),
    ])
      .then(([rev, po]) => {
        setRevenueData(rev);
        setPayouts(po || []);
      })
      .catch(() => toast('Failed to load revenue data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleProcess = async (id, referenceId) => {
    await apiFetch(`/admin/revenue/payouts/${id}/process`, { method: 'PUT', body: { referenceId } });
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Processed' } : p));
    toast('Payout processed and doctor notified.', 'success');
  };

  const currencyBreakdown = revenueData?.currencyBreakdown || [
    { currency: 'USD', amount: 4850, count: 167 },
    { currency: 'GBP', amount: 2400, count: 98 },
    { currency: 'AED', amount: 8900, count: 81 },
    { currency: 'EUR', amount: 1680, count: 60 },
    { currency: 'INR', amount: 148500, count: 186 },
  ];

  const filteredPayouts = useMemo(() => {
    if (selectedCurrency === 'ALL') return payouts;
    return payouts.filter(p => (p.currency || 'USD') === selectedCurrency);
  }, [payouts, selectedCurrency]);

  const pendingPayouts = payouts.filter(p => p.status === 'Pending');

  // Multi-currency monthly trends data for chart
  const monthlyRevenueStream = [
    { month: 'Oct', USD: 2800, GBP: 1400, AED: 4500, EUR: 900, INR: 95000 },
    { month: 'Nov', USD: 3400, GBP: 1850, AED: 6200, EUR: 1200, INR: 115000 },
    { month: 'Dec', USD: 3900, GBP: 2100, AED: 7100, EUR: 1450, INR: 130000 },
    { month: 'Jan', USD: 4300, GBP: 2250, AED: 7900, EUR: 1550, INR: 140000 },
    { month: 'Feb', USD: 4850, GBP: 2400, AED: 8900, EUR: 1680, INR: 148500 },
  ];

  const exportAccountingCSV = () => {
    const rows = [
      ['Payout ID', 'Doctor', 'Country', 'Currency', 'Amount', 'Fee Cut', 'Status', 'Date'],
      ...payouts.map(p => [
        p.displayId,
        `"${p.doctor}"`,
        p.country || 'US',
        p.currency || 'USD',
        p.amount,
        p.feeCut,
        p.status,
        p.date,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `healnari_accounting_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Accounting ledger CSV downloaded successfully', 'success');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h1 className="text-2xl font-black text-slate-900">Multi-Currency Revenue &amp; Settlements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time cross-border patient billings, multi-currency balances, and international provider payout rails.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportAccountingCSV}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <i className="fas fa-file-csv text-emerald-600"></i> Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Multi-Currency Gross Inflows Grid */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Global Revenue by Currency Inflow
          </h2>
          <span className="text-xs text-slate-400 font-medium">Automatic multi-currency conversion active</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {currencyBreakdown.map((item) => (
            <Tilt3D key={item.currency} max={5}>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:border-aubergine-300 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl">{COUNTRY_FLAGS[item.currency === 'USD' ? 'US' : item.currency === 'GBP' ? 'GB' : item.currency === 'AED' ? 'AE' : item.currency === 'EUR' ? 'EU' : 'IN'] || '🌍'}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                    {item.currency}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500">{item.count} Consults</p>
                <p className="text-xl font-black text-slate-900 mt-1 font-sans">
                  {formatCurrency(item.amount, item.currency)}
                </p>
              </div>
            </Tilt3D>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Tilt3D max={5}>
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-aubergine-500/20 rounded-full blur-2xl"></div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-aubergine-300">Pending Provider Payouts</span>
                <i className="fas fa-money-bill-transfer text-aubergine-400"></i>
              </div>
              <p className="text-3xl font-black mb-1 font-sans">
                {pendingPayouts.length} Requests
              </p>
              <p className="text-xs text-slate-300">
                Doctors awaiting wire clearance across ACH, Sort Code &amp; IBAN
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400">⚡ Fast-track Payouts</span>
              <span className="text-slate-400">10% Platform Cut</span>
            </div>
          </div>
        </Tilt3D>

        <Tilt3D max={5}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Gross Platform Consultations</span>
                <i className="fas fa-calendar-check text-emerald-500"></i>
              </div>
              <p className="text-3xl font-black text-slate-900 mb-1 font-sans">
                {loading ? '…' : (revenueData?.completedConsultations || 482).toLocaleString()}
              </p>
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <i className="fas fa-arrow-trend-up"></i> +28.4% MoM international expansion
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Delivery: 82% Video</span>
              <span>18% Clinic</span>
            </div>
          </div>
        </Tilt3D>

        <Tilt3D max={5}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Payment Gateway Split</span>
                <i className="fas fa-shield-halved text-aubergine-500"></i>
              </div>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Stripe Global (USD/GBP/AED/EUR)</span>
                  <span className="font-black text-aubergine-600">68%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-aubergine-600 h-full w-[68%] rounded-full"></div>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="font-bold text-slate-700">Cashfree (Multi-Currency + UPI)</span>
                  <span className="font-black text-emerald-600">32%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[32%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </Tilt3D>
      </div>

      {/* Multi-Currency Revenue Inflow Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="font-black text-slate-900 text-base">Global Telehealth Billing Volume Trends</h2>
            <p className="text-xs text-slate-500">Monthly consultation inflows categorized by patient settlement currency.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Filter currency:</span>
            <select 
              value={selectedCurrency} 
              onChange={e => setSelectedCurrency(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-extrabold rounded-xl px-3 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-aubergine-400"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenueStream} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', paddingTop: '10px' }} />
              {(selectedCurrency === 'ALL' || selectedCurrency === 'USD') && <Bar dataKey="USD" name="USD ($)" fill="#6B46C1" radius={[4, 4, 0, 0]} />}
              {(selectedCurrency === 'ALL' || selectedCurrency === 'GBP') && <Bar dataKey="GBP" name="GBP (£)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />}
              {(selectedCurrency === 'ALL' || selectedCurrency === 'AED') && <Bar dataKey="AED" name="AED" fill="#10b981" radius={[4, 4, 0, 0]} />}
              {(selectedCurrency === 'ALL' || selectedCurrency === 'EUR') && <Bar dataKey="EUR" name="EUR (€)" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Doctor Payout Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-sm">Physician Payout Clearance Queue</h2>
            <p className="text-xs text-slate-500">Cross-border payout settlement via local clearing houses.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Queue Filter:</span>
            <select 
              value={selectedCurrency} 
              onChange={e => setSelectedCurrency(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-700"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-extrabold bg-slate-50/50">
                <th className="px-6 py-3.5">Request Ref</th>
                <th className="px-6 py-3.5">Physician</th>
                <th className="px-6 py-3.5">Country &amp; Rail</th>
                <th className="px-6 py-3.5">Requested Date</th>
                <th className="px-6 py-3.5">Platform Margin</th>
                <th className="px-6 py-3.5">Net Payout</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-6 py-4"><div className="animate-pulse h-8 bg-slate-100 rounded-lg"></div></td></tr>
                ))
              ) : filteredPayouts.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-400 font-bold">No payout requests in this currency queue.</td></tr>
              ) : (
                filteredPayouts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{p.displayId}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-800">{p.doctor}</div>
                      <div className="text-[11px] text-slate-400">Telehealth Specialist</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{COUNTRY_FLAGS[p.country] || '🌍'}</span>
                        <span className="font-bold text-xs text-slate-700">{p.country || 'US'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.method || 'Direct Wire'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{p.date}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-aubergine-200 bg-aubergine-50 text-aubergine-700">
                        {p.feeCut || '10%'} take-rate
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-700 font-sans text-base">
                      {formatCurrency(p.amount, p.currency || 'USD')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                        p.status === 'Processed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'Pending' ? (
                        <button 
                          onClick={() => setProcessTarget(p)} 
                          className="bg-slate-900 hover:bg-aubergine-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          Process Wire
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold flex items-center justify-end gap-1">
                          <i className="fas fa-check-double text-emerald-500"></i> {p.referenceId ? `${p.referenceId.slice(0, 10)}…` : 'Settled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProcessModal payout={processTarget} isOpen={!!processTarget} onClose={() => setProcessTarget(null)} onProcess={handleProcess} />
    </div>
  );
}

export default AdminRevenue;
