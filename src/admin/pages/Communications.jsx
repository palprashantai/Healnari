import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function AdminCommunications() {
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [audience, setAudience] = useState('All Patients');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(false);
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    apiFetch('/admin/communications/templates')
      .then(d => setTemplates(d || []))
      .catch(() => toast('Failed to load templates', 'error'))
      .finally(() => setLoadingTemplates(false));
    apiFetch('/admin/communications/broadcasts')
      .then(d => setBroadcastHistory(d || []))
      .catch(() => toast('Failed to load broadcast history', 'error'))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = templates.find(t => t.id === selectedTemplate);
      if (tmpl) { setMessageSubject(tmpl.name); setMessageBody(tmpl.content); }
    } else {
      setMessageSubject(''); setMessageBody('');
    }
  }, [selectedTemplate, templates]);

  const handleSend = async () => {
    if (!messageSubject || !messageBody) {
      toast('Please fill in subject and message body.', 'error');
      return;
    }
    setIsSending(true);
    try {
      const res = await apiFetch('/admin/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: messageSubject,
          audience,
          body: messageBody,
          scheduleAt: scheduleType === 'scheduled' ? scheduleDate : undefined,
        },
      });
      setBroadcastHistory(prev => [{ ...res, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...prev]);
      toast(scheduleType === 'immediate' ? 'Broadcast sent successfully!' : 'Broadcast scheduled!', 'success');
      setMessageSubject(''); setMessageBody(''); setSelectedTemplate('');
    } catch {
      toast('Failed to send broadcast', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const audienceOptions = ['All Patients', 'All Doctors', 'New Patients', 'Unverified Doctors', 'All Users'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Communications</h1>
        <p className="text-sm text-slate-500">Broadcast messages to patients and doctors across the platform.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">New Broadcast</h2>

          {/* Audience */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-100">
              {audienceOptions.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Template */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Use Template</label>
            {loadingTemplates ? (
              <div className="animate-pulse h-10 bg-slate-100 rounded-xl" />
            ) : (
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-100">
                <option value="">-- Custom Message --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Subject</label>
            <input value={messageSubject} onChange={e => setMessageSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="Enter broadcast subject..." />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Message Body</label>
            <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows="6"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-100 outline-none resize-none"
              placeholder="Type your message... Use [Name] for personalization." />
          </div>

          {/* Channels */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Delivery Channels</label>
            <div className="flex gap-4">
              {[
                { label: 'Email', icon: 'fa-envelope', state: sendEmail, set: setSendEmail },
                { label: 'Push', icon: 'fa-bell', state: sendPush, set: setSendPush },
              ].map(ch => (
                <button key={ch.label} onClick={() => ch.set(!ch.state)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${ch.state ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <i className={`fas ${ch.icon}`}></i> {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Schedule</label>
            <div className="flex gap-3">
              {['immediate', 'scheduled'].map(t => (
                <button key={t} onClick={() => setScheduleType(t)}
                  className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors capitalize ${scheduleType === t ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {t === 'immediate' ? 'Send Now' : 'Schedule'}
                </button>
              ))}
            </div>
            {scheduleType === 'scheduled' && (
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="mt-3 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100" />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsPreviewOpen(true)}
              className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className="fas fa-eye"></i> Preview
            </button>
            <button onClick={handleSend} disabled={isSending}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {isSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              {isSending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Broadcast History</h2>
              {loadingHistory && <i className="fas fa-spinner fa-spin text-slate-400 text-xs"></i>}
            </div>
            <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
              {broadcastHistory.length === 0 && !loadingHistory && (
                <p className="text-center py-10 text-slate-400 text-sm">No broadcasts yet.</p>
              )}
              {broadcastHistory.map(b => (
                <div key={b.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{b.subject}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-2 shrink-0 ${b.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'Scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{b.audience} • {b.date}</p>
                  {b.opens !== '-' && (
                    <div className="flex gap-3 mt-2">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded"><i className="fas fa-envelope-open mr-1"></i>{b.opens} opens</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded"><i className="fas fa-arrow-pointer mr-1"></i>{b.clicks} clicks</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Broadcast Preview" size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold mb-1">TO</p>
            <p className="font-bold text-slate-800">{audience}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold mb-1">SUBJECT</p>
            <p className="font-bold text-slate-800">{messageSubject || '(No subject)'}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold mb-2">BODY</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{messageBody || '(No content)'}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminCommunications;
