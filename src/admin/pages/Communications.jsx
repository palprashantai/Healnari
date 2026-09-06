import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AIButton } from '../../components/AiButton.jsx';

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
  const [sendPush, setSendPush] = useState(true);
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
    const channels = [sendEmail && 'Email', sendPush && 'Push'].filter(Boolean);
    if (channels.length === 0) {
      toast('Select at least one delivery channel.', 'error');
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
          channels,
          scheduleAt: scheduleType === 'scheduled' ? scheduleDate : undefined,
        },
      });
      setBroadcastHistory(prev => [{ ...res, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...prev]);
      if (scheduleType === 'scheduled') {
        toast('Broadcast scheduled successfully!', 'success');
      } else {
        toast(`Broadcast dispatched to ${res.recipient_count ?? 0} recipient(s) via ${channels.join(' & ')}!`, 'success');
      }
      setMessageSubject(''); setMessageBody(''); setSelectedTemplate('');
    } catch {
      toast('Failed to send broadcast', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const CAMPAIGN_PRESETS = [
    {
      topic: '🌸 PCOS Awareness & Lifestyle',
      subject: 'Take Control of Your Hormones: Free PCOS Health Checklist Inside',
      body: 'Dear [Name], struggling with irregular cycles, sudden breakouts, or fatigue? You are not alone. Our specialist gynecologists have put together a doctor-reviewed PCOS nutrition and cycle tracking guide. Tap here to view your personalized care plan.'
    },
    {
      topic: '✨ Fertility & Ovulation Guidance',
      subject: 'Understanding Your Fertile Window: Expert Tips from HealNari',
      body: 'Hi [Name], tracking your ovulation doesn\'t have to be confusing. Discover your peak 48-hour conception window with our digital fertility estimator. Book a 1-on-1 video consult with our fertility specialist today.'
    },
    {
      topic: '🛡️ Annual Cervical & Pelvic Health',
      subject: 'Important Reminder: Your Preventive Health Checkup is Due',
      body: 'Dear [Name], preventive health is the highest form of self-care. It\'s time for your annual pelvic health review and routine ultrasound check. Schedule your preferred slot in seconds through your patient portal.'
    },
    {
      topic: '💊 Medication Refill Reminder',
      subject: 'Keep Your Treatment on Track: Quick Refill Available',
      body: 'Hello [Name], consistent medication timing is essential for hormonal balance. If your prescription is running low, tap here to request an instant digital refill.'
    }
  ];

  const handleApplyCampaignPreset = (preset) => {
    setAiGenerating(true);
    setTimeout(() => {
      setMessageSubject(preset.subject);
      setMessageBody(preset.body);
      setAiGenerating(false);
      setAiGeneratorOpen(false);
      toast(`✨ Applied "${preset.topic}" campaign template!`, 'success');
    }, 500);
  };

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('palprashant90.ai@gmail.com');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const runEmailTest = async (overrideRecipient) => {
    const target = (overrideRecipient || testEmailAddress || '').trim();
    if (!target || !target.includes('@')) {
      toast('Please enter a valid recipient email address.', 'error');
      return;
    }
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/admin/email/test', {
        method: 'POST',
        body: { recipient: target },
      });
      const data = res?.data || res;
      setTestResult(data);
      if (data?.success) {
        toast(`✅ Delivered test email to ${target} via ${data.provider?.toUpperCase()}!`, 'success');
      } else {
        toast(`❌ Delivery failed: ${data?.error || 'Provider rejected request'}`, 'error');
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message, diagnostics: 'Could not connect to backend test endpoint.' });
      toast(`❌ Test failed: ${err.message}`, 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const audienceOptions = ['All Patients', 'All Doctors', 'New Patients', 'Unverified Doctors', 'All Users'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Communications</h1>
          <p className="text-sm text-slate-500">Broadcast messages to patients and doctors across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsTestModalOpen(true); setTestResult(null); }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-purple-700 shadow-sm transition-all"
            title="Open Email System Diagnostics & Test Delivery"
          >
            <i className="fas fa-envelope-circle-check text-purple-600"></i>
            Test Email Delivery
          </button>
          <AIButton
            onClick={() => setAiGeneratorOpen(true)}
            variant="gradient"
            icon="fa-wand-magic-sparkles"
            size="sm"
          >
            AI Campaign Generator
          </AIButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">New Broadcast</h2>

          {/* Audience */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-200">
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
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-200">
                <option value="">-- Custom Message --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Subject</label>
            <input value={messageSubject} onChange={e => setMessageSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
              placeholder="Enter broadcast subject..." />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Message Body</label>
            <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows="6"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-aubergine-200 outline-none resize-none"
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${ch.state ? 'bg-aubergine-50 border-aubergine-300 text-aubergine-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <i className={`fas ${ch.icon}`}></i> {ch.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              <i className="fas fa-circle-check text-emerald-500 mr-1"></i>
              Both Web Push notifications and branded HTML Emails are dispatched live to all target recipients.
            </p>
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
                className="mt-3 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200" />
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
                  {(b.channels?.length > 0) && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {b.channels.includes('Push') && (
                        <span className="text-[10px] font-bold text-aubergine-700 bg-aubergine-50 border border-aubergine-100 px-2 py-0.5 rounded"><i className="fas fa-bell mr-1"></i>{b.recipient_count ?? 0} notified</span>
                      )}
                      {b.channels.includes('Email') && (
                        <span className="text-[10px] font-bold text-aubergine-700 bg-aubergine-50 border border-aubergine-100 px-2 py-0.5 rounded"><i className="fas fa-envelope mr-1"></i>Email sent</span>
                      )}
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

      {/* AI Campaign Generator Modal */}
      {aiGeneratorOpen && (
        <Modal
          isOpen={aiGeneratorOpen}
          onClose={() => setAiGeneratorOpen(false)}
          title="AI Women's Health Campaign Drafter"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select an evidence-based clinical campaign theme to generate high-converting, empathetic copy.
            </p>

            <div className="space-y-2.5">
              {CAMPAIGN_PRESETS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyCampaignPreset(p)}
                  className="bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl p-4 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 group-hover:text-purple-700">{p.topic}</h4>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">Use Template</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600">Subject: "{p.subject}"</p>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAiGeneratorOpen(false)}
                className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email System Diagnostics & Live Test Modal */}
      {isTestModalOpen && (
        <Modal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          title="Email System Diagnostics & Live Test"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Trigger a live end-to-end delivery test to inspect connected email dispatchers (Resend HTTPS, Brevo HTTPS, or SMTP).
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">
                Test Recipient Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter recipient email..."
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button
                  onClick={() => runEmailTest()}
                  disabled={testingEmail}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <i className={`fas ${testingEmail ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                  {testingEmail ? 'Testing...' : 'Send Test'}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Quick fill:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTestEmailAddress('palprashant90.ai@gmail.com');
                    runEmailTest('palprashant90.ai@gmail.com');
                  }}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 transition-colors"
                >
                  palprashant90.ai@gmail.com (Resend Owner)
                </button>
              </div>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <i
                    className={`fas ${
                      testResult.success
                        ? 'fa-circle-check text-emerald-600'
                        : 'fa-triangle-exclamation text-rose-600'
                    }`}
                  ></i>
                  <span>
                    {testResult.success
                      ? 'Live Email Delivered Successfully!'
                      : 'Delivery Test Failed'}
                  </span>
                </div>

                {testResult.success ? (
                  <div className="space-y-1 text-xs text-emerald-800">
                    <p>
                      <strong>Active Dispatcher:</strong>{' '}
                      <span className="uppercase font-mono bg-emerald-100 px-1.5 py-0.5 rounded">
                        {testResult.provider || 'configured provider'}
                      </span>
                    </p>
                    {testResult.messageId && (
                      <p className="font-mono text-[11px] break-all">
                        <strong>Message ID:</strong> {testResult.messageId}
                      </p>
                    )}
                    <p className="text-[11px] text-emerald-700 mt-2">
                      Please check the inbox and spam folder of <strong>{testEmailAddress}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-rose-800">
                    <p>
                      <strong>Error:</strong> {testResult.error || 'Connection rejected'}
                    </p>
                    {testResult.diagnostics && (
                      <div className="bg-white/80 border border-rose-200 p-2.5 rounded-lg text-[11px] leading-relaxed">
                        <p className="font-bold text-rose-900 mb-1">
                          <i className="fas fa-info-circle mr-1"></i> Root Cause Diagnostics:
                        </p>
                        <p>{testResult.diagnostics}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Provider Configuration Guide Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-700">
                <i className="fas fa-sliders mr-1 text-purple-600"></i> Supported Delivery Providers:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Brevo (Recommended for Render free tier):</strong> HTTPS Port 443, no domain setup needed, free 300 emails/day to any recipient. Add <code className="bg-slate-200 px-1 rounded">BREVO_API_KEY</code> in Render.
                </li>
                <li>
                  <strong>Resend:</strong> HTTPS Port 443. Free sandbox key works for <code className="bg-slate-200 px-1 rounded">palprashant90.ai@gmail.com</code>. Verify your domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-purple-600 underline">resend.com/domains</a> to send to all recipients.
                </li>
                <li>
                  <strong>Gmail SMTP:</strong> Direct SMTP on port 587. Works locally and on VPS/paid Render instances (free tier blocks port 587).
                </li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminCommunications;
