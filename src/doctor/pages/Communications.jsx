import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const TEMPLATES = [
  { id: 'T1', name: 'Appointment Reminder', content: 'Hi [Name],\n\nThis is a friendly reminder for your upcoming consultation on [Date] at [Time]. Please try to join 5 minutes early.\n\nThanks,\nDr. Sarah' },
  { id: 'T2', name: 'Follow-up Check-in', content: 'Hello [Name],\n\nIt has been a few days since your consultation. How are you feeling? Please reply here if you have any ongoing concerns.\n\nBest,\nDr. Sarah' },
  { id: 'T3', name: 'Clinic Closed Tomorrow', content: 'Dear [Name],\n\nPlease note that I will be unavailable tomorrow due to an emergency. If you had an appointment, my team will reach out to reschedule.\n\nRegards,\nDr. Sarah' },
  { id: 'T4', name: 'Diet Plan Attached', content: 'Hi [Name],\n\nPlease find your updated post-consultation diet and recovery plan attached. Let me know if you have any questions.\n\nStay Healthy,\nDr. Sarah' },
];

function DoctorCommunications() {
  const toast = useToast();
  
  const [audience, setAudience] = useState('upcoming');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  
  const [attachments, setAttachments] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [rawBroadcasts, setRawBroadcasts] = useState([]);
  const loadBroadcasts = () => apiFetch('/communications/broadcasts').then(setRawBroadcasts).catch(err => toast(err.message || 'Failed to load broadcast history', 'error'));
  useEffect(() => { loadBroadcasts(); }, []);

  const broadcastHistory = rawBroadcasts.map(b => ({
    id: b.id.slice(0, 8).toUpperCase(),
    subject: b.subject,
    audience: b.audience,
    date: new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: b.status,
    opens: '—',
    clicks: '—',
  }));

  // When template changes, auto-fill the editor
  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
      if (tmpl) {
        setMessageSubject(tmpl.name);
        setMessageBody(tmpl.content);
      }
    } else {
      setMessageSubject('');
      setMessageBody('');
    }
  }, [selectedTemplate]);

  const handleSend = async () => {
    if (!messageSubject || !messageBody) {
      toast('Please provide a subject and message body.', 'error');
      return;
    }
    const channels = [sendEmail && 'Email', sendPush && 'Push Notification', sendWhatsapp && 'WhatsApp'].filter(Boolean);
    if (channels.length === 0) {
      toast('Select at least one delivery channel.', 'error');
      return;
    }
    if (scheduleType === 'scheduled' && !scheduleDate) {
      toast('Pick a date/time to schedule for.', 'error');
      return;
    }

    setIsSending(true);
    toast('Preparing broadcast...', 'info');

    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: { 
          subject: messageSubject, 
          body: messageBody, 
          audience, 
          channels, 
          scheduleType, 
          scheduledFor: scheduleType === 'scheduled' ? scheduleDate : undefined,
          ...(attachments.length > 0 && { attachments: attachments.map(f => f.name) }) // Only send if not empty
        },
      });
      await loadBroadcasts();
      toast(scheduleType === 'scheduled' ? 'Message scheduled!' : 'Message successfully broadcasted to your patients!', 'success');
      setMessageSubject('');
      setMessageBody('');
      setSelectedTemplate('');
      setAttachments([]);
    } catch (err) {
      toast(err.message || 'Failed to send broadcast', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Communication Center</h1>
        <p className="text-sm text-slate-500">Send direct messages, reminders, and updates to your patients.</p>
      </div>

      {/* KPI Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-aubergine-600 mb-1">Messages Sent (Month)</p>
            <p className="text-2xl font-black text-aubergine-700">142</p>
          </div>
          <i className="fas fa-paper-plane text-4xl text-aubergine-200"></i>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Patient Open Rate</p>
            <p className="text-2xl font-black text-emerald-700">88%</p>
          </div>
          <i className="fas fa-envelope-open-text text-4xl text-emerald-200"></i>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">WhatsApp Delivered</p>
            <p className="text-2xl font-black text-amber-700">95</p>
          </div>
          <i className="fas fa-mobile-screen-button text-4xl text-amber-200"></i>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">1. Target Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value)} className="crm-input">
                <optgroup label="My Patients">
                  <option value="all-patients">All Active Patients</option>
                  <option value="upcoming">Patients with Upcoming Appointments</option>
                  <option value="recent">Recent Consultations (Last 30 Days)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">2. Load Template (Optional)</label>
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="crm-input">
                <option value="">-- Start from scratch --</option>
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-wider">3. Delivery Channels</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendEmail ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-aubergine-400'}`}>
                    {sendEmail && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendEmail} onChange={() => setSendEmail(!sendEmail)} />
                  <span className="text-sm font-bold text-slate-700">Send Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendPush ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-aubergine-400'}`}>
                    {sendPush && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendPush} onChange={() => setSendPush(!sendPush)} />
                  <span className="text-sm font-bold text-slate-700">Send App Notification</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendWhatsapp ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-aubergine-400'}`}>
                    {sendWhatsapp && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendWhatsapp} onChange={() => setSendWhatsapp(!sendWhatsapp)} />
                  <span className="text-sm font-bold text-slate-700">Send WhatsApp Message</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                <i className="fas fa-circle-info mr-1"></i>
                App Notification delivers a real push to patients. Email and WhatsApp are recorded on the broadcast but not actually sent — no provider is connected yet.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-wider">4. Scheduling</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'immediate' ? 'border-aubergine-600' : 'border-slate-300 group-hover:border-aubergine-400'}`}>
                    {scheduleType === 'immediate' && <div className="w-2 h-2 rounded-full bg-aubergine-600"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={scheduleType === 'immediate'} onChange={() => setScheduleType('immediate')} />
                  <span className="text-sm font-bold text-slate-700">Send Immediately</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'scheduled' ? 'border-aubergine-600' : 'border-slate-300 group-hover:border-aubergine-400'}`}>
                    {scheduleType === 'scheduled' && <div className="w-2 h-2 rounded-full bg-aubergine-600"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={scheduleType === 'scheduled'} onChange={() => setScheduleType('scheduled')} />
                  <span className="text-sm font-bold text-slate-700">Schedule for Later</span>
                </label>
                {scheduleType === 'scheduled' && (
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="crm-input mt-2" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Message Editor</h2>
              <span className="text-xs text-slate-500 font-mono">Use [Name] for dynamic tagging</span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Subject Line</label>
                <input 
                  type="text" 
                  value={messageSubject} 
                  onChange={e => setMessageSubject(e.target.value)} 
                  placeholder="e.g., Important Account Update"
                  className="crm-input"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Body</label>
                <textarea 
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full flex-1 min-h-[250px] border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-aubergine-500/15 focus:border-aubergine-600 transition-all resize-y bg-slate-50 focus:bg-white"
                ></textarea>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <label className="text-sm font-bold text-aubergine-600 bg-aubergine-50 hover:bg-aubergine-100 px-4 py-2 rounded-xl transition-colors border border-aubergine-100 flex items-center gap-2 w-max cursor-pointer">
                  <i className="fas fa-paperclip"></i> Attach File
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                        toast(`Attached ${e.target.files.length} file(s)`, 'success');
                      }
                      e.target.value = null; // reset
                    }}
                  />
                </label>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
                        <i className="fas fa-file text-slate-400"></i>
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 ml-1 transition-colors"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <button onClick={() => setIsPreviewOpen(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <i className="fas fa-eye mr-2"></i> Preview
              </button>
              <button 
                onClick={handleSend}
                disabled={isSending}
                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-70 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                {isSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                {isSending ? 'Sending Message...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Recent Messages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold whitespace-nowrap">ID</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Date</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Audience</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Subject</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Opens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {broadcastHistory.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{b.id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{b.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{b.audience}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{b.subject}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${
                      b.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{b.opens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Message Preview" size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 mb-1">To: <span className="font-normal text-slate-800">{audience}</span></p>
            <p className="text-xs font-bold text-slate-500">Subject: <span className="font-normal text-slate-800">{messageSubject || '(No Subject)'}</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 min-h-[200px] shadow-sm">
            <p className="whitespace-pre-wrap text-sm text-slate-700 font-medium leading-relaxed">
              {messageBody || '(Empty message body)'}
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setIsPreviewOpen(false)} className="bg-slate-800 text-white font-bold px-6 py-2 rounded-xl text-sm transition-all shadow-md">
              Close Preview
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default DoctorCommunications;
