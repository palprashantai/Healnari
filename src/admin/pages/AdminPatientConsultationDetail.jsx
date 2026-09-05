import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

function AdminPatientConsultationDetail() {
  const { id, consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    // Use the existing user endpoint and find the specific consultation
    apiFetch(`/admin/users/${id}`)
      .then(d => {
        const found = (d.consultations || []).find(c => c.id === consultationId);
        if (found) setConsultation(found);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, consultationId]);

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Consultation Details...</div>;
  if (error || !consultation) return <div className="p-10 text-center text-rose-500 font-bold">Failed to load consultation details or not found.</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in">
      <Link to={`/admin-dashboard/users/${id}/consultations`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-aubergine-600 transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:shadow-md mb-8">
        <i className="fas fa-arrow-left"></i> Back to Consultations
      </Link>
      
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8 space-y-8">
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Consultation Details</h1>
            <p className="text-sm font-bold text-slate-400 mt-1 font-mono uppercase tracking-widest">ID: {consultation.id}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border ${
            consultation.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            consultation.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            consultation.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            {consultation.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Doctor Information</p>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-aubergine-100 text-aubergine-600 flex items-center justify-center font-semibold">
                  {consultation.doctor?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{consultation.doctor}</p>
                  <p className="text-sm text-slate-500 font-medium">{consultation.specialty}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Consultation Date & Time</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                <i className="fas fa-calendar-check text-slate-400 text-lg"></i>
                <p className="font-bold text-slate-700 text-lg">{consultation.date}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Type & Cost</p>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                  <span className="text-sm font-bold text-slate-500">Consultation Type</span>
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <i className={`fas ${consultation.type === 'Video' ? 'fa-video text-indigo-500' : 'fa-hospital text-pink-500'}`}></i>
                    {consultation.type} Consult
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Total Amount</span>
                  <div className="text-right">
                    <span className="text-3xl font-semibold text-slate-900 block">₹{consultation.cost?.toLocaleString()}</span>
                    <button onClick={() => setActiveModal('invoice')} className="mt-1 text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center justify-end gap-1 transition-colors w-full">
                      <i className="fas fa-file-invoice"></i> Download Invoice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={activeModal === 'invoice'} onClose={() => setActiveModal(null)} title={`Invoice ${consultation?.id?.slice(0, 8) || ''}`} size="lg">
        <style>{`
          @media print {
            @page { margin: 0; }
            body { margin: 1.6cm; }
          }
        `}</style>
        <div id="printable-invoice-detail" className="bg-white p-8 rounded-none border border-slate-200 relative overflow-hidden" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
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
              <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mb-4">TAX INVOICE</h2>
              <div className="flex justify-end gap-4 text-sm mb-1">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-bold text-slate-800 font-mono w-32 text-right">HEAL-{(consultation?.id?.slice(0, 5) || '00000').toUpperCase()}</span>
              </div>
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-slate-500">Date of Issue:</span>
                <span className="font-bold text-slate-800 w-32 text-right">{consultation?.date}</span>
              </div>
            </div>
          </div>

          {/* Watermark */}
          {consultation?.status === 'Completed' || consultation?.status === 'Done' ? (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03]">
              <span className="text-[120px] font-semibold text-emerald-500">PAID</span>
            </div>
          ) : consultation?.status === 'Cancelled' ? (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03]">
              <span className="text-[100px] font-semibold text-rose-500">CANCELLED</span>
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
              <p className="font-bold text-slate-800 text-lg">{consultation?.doctor?.startsWith('Dr.') ? consultation.doctor : `Dr. ${consultation?.doctor}`}</p>
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
                <td className="py-4 px-4 font-medium text-slate-700">{consultation?.type} Consultation</td>
                <td className="py-4 px-4 text-slate-600">Online</td>
                <td className={`py-4 px-4 font-bold ${consultation?.status === 'Completed' || consultation?.status === 'Done' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {(consultation?.status || 'PENDING').toUpperCase()}
                </td>
                <td className="py-4 px-4 text-right font-medium text-slate-800">₹{consultation?.cost?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-16 relative z-10">
            <div className="w-80 border border-slate-200 bg-slate-50 rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 text-sm">Subtotal</span>
                <span className="font-medium text-slate-800">₹{consultation?.cost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Taxes (0%)</span>
                <span className="font-medium text-slate-800">₹0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Total Amount</span>
                <span className="text-2xl font-semibold text-[#6B46C1]">₹{consultation?.cost?.toLocaleString()}</span>
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
            const printContent = document.getElementById('printable-invoice-detail').outerHTML;
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

export default AdminPatientConsultationDetail;
