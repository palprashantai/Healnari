import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const STATS = [
  { label: 'Total Users',       value: '24,592', trend: '+12% this month', up: true,  icon: 'fa-users',         color: 'text-sky-600',       bg: 'bg-sky-50' },
  { label: 'Active Doctors',    value: '342',    trend: '15 onboarded this week',    up: true,  icon: 'fa-user-doctor',   color: 'text-emerald-600',   bg: 'bg-emerald-50' },
  { label: 'Platform Revenue',  value: '₹12.4L', trend: '+18% this month', up: true,  icon: 'fa-indian-rupee-sign', color: 'text-aubergine-600', bg: 'bg-aubergine-50' },
  { label: 'Pending Verifications',value:'14',   trend: 'Requires action', up: null,  icon: 'fa-user-check',    color: 'text-amber-600',     bg: 'bg-amber-50' },
];

const SYSTEM_HEALTH = [
  { name: 'API Services', status: 'Operational', ping: '24ms', color: 'bg-emerald-500' },
  { name: 'Database Load', status: 'Normal', ping: '12%', color: 'bg-emerald-500' },
  { name: 'SMS Gateway', status: 'Warning', ping: 'Quota 90%', color: 'bg-amber-500' },
  { name: 'Video Servers', status: 'Operational', ping: '45ms', color: 'bg-emerald-500' },
];

const DOCTOR_VERIFICATIONS = [
  { id: 1, name: 'Dr. Ramesh Kumar', spec: 'Gynaecology', docs: ['License.pdf', 'Aadhar.jpg'], status: 'Pending' },
  { id: 2, name: 'Dr. Sarah Mitchell', spec: 'Endocrinology', docs: ['Registration.pdf', 'Passport.jpg'], status: 'Pending' },
];

const REFUND_REQUESTS = [
  { id: 1, patient: 'Priya Sharma', amount: '₹299', reason: 'Doctor Cancelled', status: 'Pending', gateway: 'Razorpay' },
];

const SUPPORT_TICKETS = [
  { id: 1, user: 'Priya Sharma', role: 'Patient', issue: 'Doctor did not join video call', status: 'Open', priority: 'High', time: '10 mins ago' },
  { id: 2, user: 'Dr. Anita Desai', role: 'Doctor', issue: 'Payout delayed for last week', status: 'Investigating', priority: 'Medium', time: '2 hrs ago' },
];

/* ─── Modals ─────────────────────────────────── */
function DocumentViewerModal({ isOpen, onClose, doctor, toast, onResolve }) {
  if (!doctor) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Verify Documents — ${doctor.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Uploaded Files</h4>
            {doctor.docs.map((d, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-aubergine-300 transition-colors">
                <i className="fas fa-file-pdf text-rose-500 mr-2"></i>
                <span className="text-sm font-bold text-slate-700">{d}</span>
              </div>
            ))}
          </div>
          <div className="w-full sm:w-2/3 bg-slate-900 rounded-xl flex flex-col items-center justify-center relative min-h-[300px] border border-slate-700">
            <i className="fas fa-lock text-slate-700 text-4xl mb-4"></i>
            <span className="text-slate-500 text-xs font-bold">Secure Document Viewer Mock</span>
            <span className="text-slate-600 text-[10px] mt-1">(Watermarked view of {doctor.docs[0]})</span>
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button onClick={() => { toast('Verification Rejected', 'info'); onClose(); onResolve(doctor.id, 'Rejected'); }} className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-2.5 rounded-xl text-sm border border-rose-200 transition-colors">Reject</button>
          <button onClick={() => { toast('Doctor Verified successfully', 'success'); onClose(); onResolve(doctor.id, 'Approved'); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-check-circle"></i> Approve KYC
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RefundModal({ isOpen, onClose, refund, toast, onProcess }) {
  if (!refund) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Process Refund — ${refund.patient}`} size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
          <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Amount</span><span className="font-black text-lg text-slate-800">{refund.amount}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Reason</span><span className="font-bold text-slate-700">{refund.reason}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Gateway</span><span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]"><i className="fas fa-credit-card mr-1 text-sky-600"></i>{refund.gateway}</span></div>
        </div>
        <button onClick={() => { toast(`Refund of ${refund.amount} initiated via Razorpay.`, 'success'); onProcess(refund.id); onClose(); }} 
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md">
          Initiate Refund to Source
        </button>
      </div>
    </Modal>
  );
}

function TicketModal({ isOpen, onClose, ticket, toast, onResolve }) {
  if (!ticket) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Support Ticket #${ticket.id}`} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-slate-800">{ticket.user}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">{ticket.role}</span>
          </div>
          <p className="text-slate-600 mb-3">{ticket.issue}</p>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Priority: <span className={ticket.priority === 'High' ? 'text-rose-600 font-bold' : 'font-bold'}>{ticket.priority}</span></span>
            <span>{ticket.time}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { toast('Ticket escalated to engineering.', 'info'); onClose(); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors border border-slate-200">
            Escalate
          </button>
          <button onClick={() => { toast('Ticket resolved and user notified.', 'success'); onResolve(ticket.id); onClose(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md flex justify-center items-center gap-2">
            <i className="fas fa-check"></i> Resolve
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function AdminDashboard() {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [verifications, setVerifications] = useState(DOCTOR_VERIFICATIONS);
  const [refunds, setRefunds] = useState(REFUND_REQUESTS);
  const [tickets, setTickets] = useState(SUPPORT_TICKETS);
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast('System metrics refreshed.', 'success');
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">System Dashboard</h1>
          <p className="text-sm text-slate-500">Platform overview, verifications, and financial operations.</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
          <i className={`fas fa-rotate-right ${refreshing ? 'animate-spin' : ''}`}></i> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {STATS.map(s => (
          <Tilt3D key={s.label} max={5}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between card-premium">
            <div className="flex justify-between items-start mb-2">
              <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center text-lg`}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              {s.up !== null && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <i className={`fas fa-arrow-${s.up ? 'up' : 'down'} mr-1`}></i>{s.trend.split(' ')[0]}
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
            </div>
          </div>
          </Tilt3D>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Queues */}
        <div className="lg:col-span-2 space-y-6 stagger-children">
          {/* Verification Queue */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm"><i className="fas fa-user-doctor text-aubergine-500 mr-2"></i>Doctor KYC Verifications</h2>
              <span className="text-xs font-bold text-aubergine-600 bg-aubergine-50 px-2.5 py-1 rounded-full">{verifications.length} Pending</span>
            </div>
            <div className="divide-y divide-slate-50 stagger-children">
              {verifications.map(v => (
                <div key={v.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black">
                      {v.name.split(' ')[1]?.[0]}{v.name.split(' ')[2]?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.spec} • {v.docs.length} documents uploaded</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDoc(v)} className="bg-white border border-slate-200 hover:border-aubergine-300 hover:text-aubergine-700 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm">
                    Review KYC
                  </button>
                </div>
              ))}
              {verifications.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-sm font-bold text-slate-600">All doctors verified!</p>
                </div>
              )}
            </div>
          </div>

          {/* Refund Queue */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm"><i className="fas fa-receipt text-amber-500 mr-2"></i>Pending Refunds</h2>
            </div>
            <div className="divide-y divide-slate-50 stagger-children">
              {refunds.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{r.patient}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Reason: {r.reason}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-rose-600">{r.amount}</span>
                    <button onClick={() => setSelectedRefund(r)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm">
                      Process
                    </button>
                  </div>
                </div>
              ))}
              {refunds.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-sm font-bold text-slate-600">No pending refunds.</p>
                </div>
              )}
            </div>
          </div>

          {/* Support Tickets Queue */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm"><i className="fas fa-headset text-sky-500 mr-2"></i>Support & Disputes</h2>
              {tickets.length > 0 && <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">{tickets.length} Action Needed</span>}
            </div>
            <div className="divide-y divide-slate-50 stagger-children">
              {tickets.map(t => (
                <div key={t.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800 text-sm">{t.user}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{t.role}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{t.issue}</p>
                    <p className="text-[10px] text-slate-400">{t.time}</p>
                  </div>
                  <button onClick={() => setSelectedTicket(t)} className="bg-white border border-slate-200 hover:border-sky-300 hover:text-sky-700 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm">
                    Review
                  </button>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-sm font-bold text-slate-600">All tickets resolved.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: System Health */}
        <div className="space-y-6 stagger-children">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">System Health</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> ACTIVE
              </span>
            </div>
            <div className="p-5 space-y-4">
              {SYSTEM_HEALTH.map(h => (
                <div key={h.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${h.color}`}></div>
                    <span className="text-sm font-semibold text-slate-700">{h.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{h.status}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{h.ping}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center mt-auto">
              <button onClick={() => toast('Triggering manual server check...', 'info')} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 w-full">
                <i className="fas fa-server text-[10px]"></i> Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentViewerModal isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} doctor={selectedDoc} toast={toast} onResolve={(id, status) => setVerifications(prev => prev.filter(v => v.id !== id))} />
      <RefundModal isOpen={!!selectedRefund} onClose={() => setSelectedRefund(null)} refund={selectedRefund} toast={toast} onProcess={(id) => setRefunds(prev => prev.filter(r => r.id !== id))} />
      <TicketModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} ticket={selectedTicket} toast={toast} onResolve={(id) => setTickets(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}

export default AdminDashboard;
