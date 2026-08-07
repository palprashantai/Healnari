import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

const TEMPLATES = [
  { id: 'T1', name: 'System Maintenance Notice', content: 'Dear [Name],\n\nWe will be performing scheduled maintenance on [Date]. The platform will be unavailable for approximately 2 hours.\n\nThank you,\nAdmin Team' },
  { id: 'T2', name: 'New Feature Announcement', content: 'Hi [Name]!\n\nWe are excited to announce a new feature that will improve your experience on our platform. Check it out today!\n\nBest,\nThe Healnari Team' },
  { id: 'T3', name: 'Policy Update (Doctors)', content: 'Dear Dr. [Name],\n\nPlease note that our payout commission policy has been updated. Please review the new terms in your dashboard.\n\nRegards,\nAdmin Team' },
  { id: 'T4', name: 'Health Camp Invite (Patients)', content: 'Hello [Name],\n\nJoin our upcoming free health camp this weekend! Click here to register and get your free checkup pass.\n\nStay Healthy,\nHealnari' },
];

function AdminCommunications() {
  const toast = useToast();
  
  const [audience, setAudience] = useState('all-patients');
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

  const [broadcastHistory] = useState([
    { id: 'BC-901', subject: 'System Maintenance Notice', audience: 'All Patients', date: '01 Aug 2026', status: 'Sent', opens: '68%', clicks: '12%' },
    { id: 'BC-902', subject: 'New Feature: Video Consults', audience: 'All Doctors', date: '25 Jul 2026', status: 'Sent', opens: '82%', clicks: '45%' },
    { id: 'BC-903', subject: 'Weekend Health Camp', audience: 'New Patients', date: '10 Aug 2026', status: 'Scheduled', opens: '-', clicks: '-' },
  ]);

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

  const handleSend = () => {
    if (!messageSubject || !messageBody) {
      toast('Please provide a subject and message body.', 'error');
      return;
    }
    if (!sendEmail && !sendPush && !sendWhatsapp) {
      toast('Select at least one delivery channel.', 'error');
      return;
    }
    
    setIsSending(true);
    toast('Preparing broadcast...', 'info');
    
    setTimeout(() => {
      setIsSending(false);
      toast(`Message successfully broadcasted to ${audience.replace('-', ' ')}!`, 'success');
      setMessageSubject('');
      setMessageBody('');
      setSelectedTemplate('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Communication Center</h1>
        <p className="text-sm text-slate-500">Send bulk emails, push notifications, and WhatsApp messages to your users.</p>
      </div>

      {/* KPI Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-sky-600 mb-1">Emails Sent This Month</p>
            <p className="text-2xl font-black text-sky-700">14.2K</p>
          </div>
          <i className="fas fa-paper-plane text-4xl text-sky-200"></i>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Average Open Rate</p>
            <p className="text-2xl font-black text-emerald-700">68%</p>
          </div>
          <i className="fas fa-envelope-open-text text-4xl text-emerald-200"></i>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Push Notifications</p>
            <p className="text-2xl font-black text-amber-700">8.4K</p>
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
              <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-100 transition-all">
                <optgroup label="Patients">
                  <option value="all-patients">All Active Patients</option>
                  <option value="new-patients">New Patients (Last 30 Days)</option>
                  <option value="premium-patients">Premium Package Subscribers</option>
                </optgroup>
                <optgroup label="Doctors">
                  <option value="all-doctors">All Verified Doctors</option>
                  <option value="pending-doctors">Pending Verification Doctors</option>
                  <option value="suspended-doctors">Suspended Doctors</option>
                </optgroup>
                <optgroup label="Custom">
                  <option value="custom">Manual Selection (CSV Upload)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">2. Load Template (Optional)</label>
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-100 transition-all">
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
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendEmail ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-sky-400'}`}>
                    {sendEmail && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendEmail} onChange={() => setSendEmail(!sendEmail)} />
                  <span className="text-sm font-bold text-slate-700">Send Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendPush ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-sky-400'}`}>
                    {sendPush && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendPush} onChange={() => setSendPush(!sendPush)} />
                  <span className="text-sm font-bold text-slate-700">Send Push Notification</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sendWhatsapp ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-50 border-slate-300 group-hover:border-sky-400'}`}>
                    {sendWhatsapp && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={sendWhatsapp} onChange={() => setSendWhatsapp(!sendWhatsapp)} />
                  <span className="text-sm font-bold text-slate-700">Send WhatsApp Message</span>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-wider">4. Scheduling</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'immediate' ? 'border-sky-600' : 'border-slate-300 group-hover:border-sky-400'}`}>
                    {scheduleType === 'immediate' && <div className="w-2 h-2 rounded-full bg-sky-600"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={scheduleType === 'immediate'} onChange={() => setScheduleType('immediate')} />
                  <span className="text-sm font-bold text-slate-700">Send Immediately</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'scheduled' ? 'border-sky-600' : 'border-slate-300 group-hover:border-sky-400'}`}>
                    {scheduleType === 'scheduled' && <div className="w-2 h-2 rounded-full bg-sky-600"></div>}
                  </div>
                  <input type="radio" className="hidden" checked={scheduleType === 'scheduled'} onChange={() => setScheduleType('scheduled')} />
                  <span className="text-sm font-bold text-slate-700">Schedule for Later</span>
                </label>
                {scheduleType === 'scheduled' && (
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full mt-2 bg-white border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-sky-100 transition-all" />
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
              <span className="text-xs text-slate-400 font-mono">Use [Name] for dynamic tagging</span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Subject Line</label>
                <input 
                  type="text" 
                  value={messageSubject} 
                  onChange={e => setMessageSubject(e.target.value)} 
                  placeholder="e.g., Important Account Update"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Body</label>
                <textarea 
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full flex-1 min-h-[250px] border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all resize-y"
                ></textarea>
              </div>
              <div className="pt-2">
                <button onClick={() => toast('File dialog opened.', 'info')} className="text-sm font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors border border-sky-100 flex items-center gap-2 w-max">
                  <i className="fas fa-paperclip"></i> Attach File
                </button>
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
                {isSending ? 'Sending Broadcast...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Recent Broadcasts</h2>
          <button className="text-xs font-bold text-aubergine-600 hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Subject</th>
                <th className="px-6 py-3 font-semibold">Audience</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Performance (Open / Click)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {broadcastHistory.map(bc => (
                <tr key={bc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm">{bc.subject}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{bc.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{bc.audience}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-600">{bc.date}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${bc.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {bc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-bold text-slate-700">{bc.opens}</span>
                    <span className="text-slate-300 mx-2">|</span>
                    <span className="text-xs font-bold text-slate-500">{bc.clicks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Message Preview" size="lg">
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
            <p className="font-bold text-slate-800">{messageSubject || 'No Subject'}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed shadow-inner min-h-[200px]">
            {messageBody ? messageBody.replace(/\[Name\]/g, 'John Doe') : <span className="text-slate-400 italic">No message content.</span>}
          </div>
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-info-circle text-sky-500 text-xl"></i>
              <div>
                <p className="text-xs font-bold text-sky-800">Dynamic Tags Resolved</p>
                <p className="text-[10px] text-sky-600">[Name] will be replaced with the recipient's first name.</p>
              </div>
            </div>
          </div>
          <button onClick={() => setIsPreviewOpen(false)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors">
            Close Preview
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default AdminCommunications;
