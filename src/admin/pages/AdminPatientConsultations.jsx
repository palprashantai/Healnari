import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

function AdminPatientConsultations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/users/${id}`)
      .then(d => {
        setConsultations(d.consultations || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Consultations...</div>;
  if (error) return <div className="p-10 text-center text-rose-500 font-bold">Failed to load consultations.</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Patient Consultations</h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Complete History</p>
        </div>
        <Link to={`/admin-dashboard/users/${id}`} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-aubergine-600 transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:shadow-md">
          <i className="fas fa-arrow-left"></i> Back to Patient
        </Link>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {consultations.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-medium">No consultations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-widest text-slate-400 font-black">
                <tr>
                  <th className="px-6 py-4">Doctor & Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {consultations.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/admin-dashboard/users/${id}/consultations/${c.id}`)} className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 ${c.type === 'Video' ? 'bg-indigo-600' : 'bg-pink-600'}`}>
                          <i className={`fas ${c.type === 'Video' ? 'fa-video' : 'fa-hospital'}`}></i>
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 group-hover:text-aubergine-700 transition-colors">{c.doctor}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.date} • {c.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{c.type} Consult</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        c.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        c.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        c.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-black text-slate-800 text-lg">₹{c.cost?.toLocaleString()}</p>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(c); setActiveModal('invoice'); }} className="text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center gap-1 transition-colors">
                          <i className="fas fa-file-invoice"></i> Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={activeModal === 'invoice'} onClose={() => setActiveModal(null)} title={`Invoice ${selectedInvoice?.id?.slice(0, 8) || ''}`} size="lg">
        <style>{`
          @media print {
            @page { margin: 0; }
            body { margin: 1.6cm; }
          }
        `}</style>
        <div id="printable-invoice" className="bg-white p-8 rounded-none border border-slate-200 relative overflow-hidden" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          {/* Top Banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#6B46C1]"></div>

          {/* Header */}
          <div className="flex justify-between items-start pt-6 pb-8 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold text-[#6B46C1] font-serif tracking-tight">Heal<span className="text-pink-500">Nari</span></span>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-2">Digital Health Clinic</p>
              <p className="text-xs text-slate-500">123 Wellness Avenue, Health City</p>
              <p className="text-xs text-slate-500">support@healnari.app | +1 (800) 000-0000</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-4">TAX INVOICE</h2>
              <div className="flex justify-end gap-4 text-sm mb-1">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-bold text-slate-800 font-mono w-32 text-right">HEAL-{(selectedInvoice?.id?.slice(0, 5) || '00000').toUpperCase()}</span>
              </div>
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-slate-500">Date of Issue:</span>
                <span className="font-bold text-slate-800 w-32 text-right">{selectedInvoice?.date}</span>
              </div>
            </div>
          </div>

          {/* Watermark */}
          {selectedInvoice?.status === 'Completed' || selectedInvoice?.status === 'Done' ? (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03]">
              <span className="text-[120px] font-black text-emerald-500">PAID</span>
            </div>
          ) : selectedInvoice?.status === 'Cancelled' ? (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03]">
              <span className="text-[100px] font-black text-rose-500">CANCELLED</span>
            </div>
          ) : null}

          {/* Billing Grid */}
          <div className="grid grid-cols-2 gap-8 my-8 relative z-10">
            <div className="border border-slate-200 rounded p-4 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To (Patient)</p>
              <p className="font-bold text-slate-800 text-lg">Patient ID: {id?.slice(0, 8)}</p>
              <p className="text-sm text-slate-500 mt-1">Telehealth Member</p>
            </div>
            <div className="border border-slate-200 rounded p-4 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Treating Doctor</p>
              <p className="font-bold text-slate-800 text-lg">{selectedInvoice?.doctor?.startsWith('Dr.') ? selectedInvoice.doctor : `Dr. ${selectedInvoice?.doctor}`}</p>
              <p className="text-sm text-slate-500 mt-1">HealNari Telehealth</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left mb-8 relative z-10 border-collapse">
            <thead>
              <tr className="bg-[#6B46C1] text-white">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest rounded-tl">Description / Service</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest">Payment Mode</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest">Status</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-right rounded-tr">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-slate-200 bg-white">
                <td className="py-4 px-4 font-medium text-slate-700">{selectedInvoice?.type} Consultation</td>
                <td className="py-4 px-4 text-slate-600">Online</td>
                <td className={`py-4 px-4 font-bold ${selectedInvoice?.status === 'Completed' || selectedInvoice?.status === 'Done' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {(selectedInvoice?.status || 'PENDING').toUpperCase()}
                </td>
                <td className="py-4 px-4 text-right font-medium text-slate-800">₹{selectedInvoice?.cost?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-16 relative z-10">
            <div className="w-80 border border-slate-200 bg-slate-50 rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 text-sm">Subtotal</span>
                <span className="font-medium text-slate-800">₹{selectedInvoice?.cost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Taxes (0%)</span>
                <span className="font-medium text-slate-800">₹0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Total Amount</span>
                <span className="text-2xl font-black text-[#6B46C1]">₹{selectedInvoice?.cost?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 mt-auto">
            <p className="font-bold text-slate-700 text-sm mb-2">Terms & Conditions</p>
            <p className="text-xs text-slate-500 mb-1">1. This is a system-generated invoice. No physical signature is required.</p>
            <p className="text-xs text-slate-500">2. For any discrepancies or queries, please contact support@healnari.app within 7 days.</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <button onClick={() => setActiveModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
          <button onClick={() => { 
            const printContent = document.getElementById('printable-invoice').outerHTML;
            const originalContent = document.body.innerHTML;
            document.body.innerHTML = printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); 
          }} className="px-5 py-2.5 rounded-xl font-bold text-white bg-aubergine-600 hover:bg-aubergine-700 transition-colors shadow-sm">
            <i className="fas fa-print mr-2"></i> Print / Download
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminPatientConsultations;
