import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { DoctorShareModal } from '../../components/DoctorShareModal.jsx';
import PhotoAdjustModal from '../../components/PhotoAdjustModal.jsx';
import { formatCurrency } from '../../lib/currency.js';
import { apiFetch } from '../../lib/apiClient.js';
import NotificationSettingsTab from '../../components/NotificationSettingsTab.jsx';

/* ─── Main Component ─────────────────────────── */
function DoctorProfile() {
  const { user, updateUser, updatePassword, uploadAvatar, removeAvatar, logout, subscribePush } = useAuth();
  const { kycVerified } = useClinicData();
  const toast = useToast();

  const [pushEnabled, setPushEnabled] = useState(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  const handlePushToggle = async () => {
    if (pushEnabled) {
      toast('Push notifications cannot be disabled from here. Please revoke permission in your browser settings.', 'info');
      return;
    }
    const success = await subscribePush?.();
    if (success) {
      setPushEnabled(true);
      toast('Push notifications enabled for this device.', 'success');
    } else {
      toast('Failed to enable push notifications. Ensure they are allowed in your browser settings.', 'error');
    }
  };
  const doc = user || {};

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    name: doc.name || doc.profile?.full_name,
    email: doc.email || doc.profile?.email,
    phone: doc.phone || doc.profile?.phone,
    specialty: doc.specialty || doc.profile?.specialty,
    qualification: doc.qualification || 'MBBS, MD (OBG)',
    regNo: doc.regNo || doc.profile?.registration_no,
    experience: doc.experience || '12 Years',
    clinicName: doc.clinicName || 'HealNari Women\'s Clinic — Bandra',
    clinicAddress: doc.clinicAddress || 'Shop 4, Mehta Plaza, Bandra West, Mumbai',
    bio: doc.bio || doc.profile?.bio || '',
    dob: doc.dob || '',
    age: doc.age || '',
    consultFee: String(doc.consultationFee || doc.consultFee || doc.profile?.consultation_fee || 799),
    videoFee: String(doc.consultationFee || doc.consultFee || doc.profile?.consultation_fee || 799),
    clinicFee: '999',
  });

  React.useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || user.profile?.full_name || prev.name,
        email: user.email || user.profile?.email || prev.email,
        phone: user.phone || user.profile?.phone || prev.phone,
        specialty: user.specialty || user.profile?.specialty || prev.specialty,
        regNo: user.regNo || user.profile?.registration_no || prev.regNo,
        bio: user.bio || user.profile?.bio || prev.bio,
        dob: user.dob || prev.dob,
        age: user.age || prev.age,
        consultFee: String(user.consultationFee || user.consultFee || user.profile?.consultation_fee || prev.consultFee || 799),
        videoFee: String(user.consultationFee || user.consultFee || user.profile?.consultation_fee || prev.videoFee || 799),
      }));
    }
  }, [user]);

  const [saved, setSaved] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showLogout, setShowLogout] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [twoFA, setTwoFA] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [availability, setAvailability] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
  });
  const [scheduleTimes, setScheduleTimes] = useState({
    startTime: '09:00',
    endTime: '17:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    slotDuration: '30',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingFees, setSavingFees] = useState(false);
  const [leaveMode, setLeaveMode] = useState(false);
  const [specialtyOptions, setSpecialtyOptions] = useState([]);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  const INDEX_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  React.useEffect(() => {
    apiFetch('/admin/public/specialties')
      .then(res => setSpecialtyOptions(res || []))
      .catch(console.error);

    apiFetch('/doctors/me/schedule')
      .then(res => {
        if (res?.schedule && Array.isArray(res.schedule)) {
          const avail = { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false };
          res.schedule.forEach(s => {
            const dayKey = INDEX_DAY[s.day_of_week];
            if (dayKey) avail[dayKey] = true;
          });
          setAvailability(avail);
          if (res.schedule.length > 0) {
            const first = res.schedule[0];
            setScheduleTimes({
              startTime: first.start_time ? first.start_time.slice(0, 5) : '09:00',
              endTime: first.end_time ? first.end_time.slice(0, 5) : '17:00',
              lunchStart: first.lunch_start ? first.lunch_start.slice(0, 5) : '13:00',
              lunchEnd: first.lunch_end ? first.lunch_end.slice(0, 5) : '14:00',
              slotDuration: String(first.slot_duration_minutes || 30),
            });
          }
        }
      })
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    if (tab === 'security') {
      setAuditLogsLoading(true);
      apiFetch('/doctors/me/audit-logs')
        .then(res => setAuditLogs(res || []))
        .catch(() => toast('Failed to load audit logs', 'error'))
        .finally(() => setAuditLogsLoading(false));
    }
  }, [tab]);

  const handleSave = async () => {
    try {
      await updateUser?.({
        name: form.name,
        fullName: form.name,
        phone: form.phone,
        specialty: form.specialty,
        regNo: form.regNo,
        registrationNo: form.regNo,
        qualification: form.qualification,
        experience: form.experience,
        clinicName: form.clinicName,
        clinicAddress: form.clinicAddress,
        bio: form.bio,
        dob: form.dob,
        consultationFee: Number(form.videoFee || form.consultFee || 799),
        consultFee: Number(form.videoFee || form.consultFee || 799),
        videoFee: Number(form.videoFee || form.consultFee || 799),
        emailNotifications: emailNotif,
        smsNotifications: smsNotif,
      });
      setSaved(true);
      toast('Profile updated successfully!', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const schedulePayload = [];
      INDEX_DAY.forEach((dayKey, idx) => {
        if (availability[dayKey]) {
          schedulePayload.push({
            dayOfWeek: idx,
            startTime: scheduleTimes.startTime || '09:00',
            endTime: scheduleTimes.endTime || '17:00',
            lunchStart: scheduleTimes.lunchStart || '13:00',
            lunchEnd: scheduleTimes.lunchEnd || '14:00',
            slotDurationMinutes: Number(scheduleTimes.slotDuration) || 30,
            bufferMinutes: 0,
          });
        }
      });
      await apiFetch('/doctors/me/schedule', {
        method: 'PUT',
        body: { schedule: schedulePayload },
      });
      toast('Weekly availability schedule saved and synced with booking slots!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update schedule', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveFees = async () => {
    setSavingFees(true);
    try {
      const fee = Number(form.videoFee || form.consultFee || 799);
      await updateUser?.({
        consultationFee: fee,
        consultFee: fee,
        videoFee: fee,
      });
      setForm(p => ({ ...p, consultFee: String(fee), videoFee: String(fee) }));
      toast('Fee structure saved and updated on your public profile!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update fee structure', 'error');
    } finally {
      setSavingFees(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!pwdForm.current) { toast('Enter current password.', 'error'); return; }
    if (pwdForm.newPwd.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast('Passwords do not match.', 'error'); return; }
    try {
      await updatePassword(pwdForm.current, pwdForm.newPwd);
      toast('Password updated!', 'success');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch (err) {
      toast(err.message || 'Failed to update password', 'error');
    }
  };



  const initials = form.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-slate-800">Doctor Profile</h1>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-aubergine-900 to-aubergine-800 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-3xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt={form.name} className="w-full h-full object-cover" /> : initials}
          </div>
          <button onClick={() => setShowPhotoModal(true)}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-aubergine-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <i className="fas fa-camera text-xs"></i>
          </button>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-black">{form.name}</h2>
          <p className="text-aubergine-200 text-sm mt-1">{form.specialty} • {form.qualification}</p>
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <span className="bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              <i className="fas fa-stethoscope mr-1"></i> {form.experience} Experience
            </span>
            <span className="bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full font-mono">{form.regNo}</span>
            {kycVerified ? (
              <span className="bg-emerald-500/80 border border-emerald-400/40 text-white text-xs font-bold px-3 py-1 rounded-full">
                <i className="fas fa-circle-check mr-1 text-[10px]"></i>Verified
              </span>
            ) : (
              <span className="bg-amber-500/80 border border-amber-400/40 text-white text-xs font-bold px-3 py-1 rounded-full">
                <i className="fas fa-clock mr-1 text-[10px]"></i>KYC Pending
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button onClick={() => setShowShareModal(true)}
            className="bg-aubergine-600 hover:bg-aubergine-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
            <i className="fas fa-share-nodes"></i> Share Booking Link
          </button>
          <button onClick={() => setShowPhotoModal(true)}
            className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-camera"></i> Change Photo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar">
          {[
            ['profile', 'Practice Info', 'fa-stethoscope'],
            ['share', 'Share & Booking Link', 'fa-share-nodes'],
            ['schedule', 'Availability', 'fa-calendar'],
            ['fees', 'Consultation Fees', (() => {
              const code = (doc?.profile?.currency || 'INR').toUpperCase();
              if (code === 'USD') return 'fa-dollar-sign';
              return 'fa-indian-rupee-sign';
            })()],
            ['notifications', 'Notifications & Alerts', 'fa-bell'],
            ['security', 'Security', 'fa-shield-halved'],
          ].map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* ── PRACTICE INFO ── */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name', key: 'name', icon: 'fa-user' },
                  { label: 'Email Address', key: 'email', icon: 'fa-envelope', type: 'email' },
                  { label: 'Phone Number', key: 'phone', icon: 'fa-phone' },
                  { label: 'Medical Registration No.', key: 'regNo', icon: 'fa-id-badge' },
                  { label: 'Specialty', key: 'specialty', icon: 'fa-stethoscope' },
                  { label: 'Date of Birth', key: 'dob', icon: 'fa-cake-candles', type: 'date' },
                  { label: 'Age', key: 'age', icon: 'fa-user-clock', readOnly: true },
                  { label: 'Qualification', key: 'qualification', icon: 'fa-graduation-cap' },
                  { label: 'Years of Experience', key: 'experience', icon: 'fa-clock-rotate-left' },
                  { label: 'Clinic Name', key: 'clinicName', icon: 'fa-hospital' },
                ].map(f => (
                  <div key={f.key}>
                    <label htmlFor={`doctor-profile-${f.key}`} className="text-xs font-bold text-slate-500 mb-1.5 block">
                      <i className={`fas ${f.icon} mr-1.5 text-aubergine-400`}></i>{f.label}
                      {f.readOnly && <span className="ml-1.5 font-normal text-slate-400 normal-case">(auto-calculated)</span>}
                    </label>
                    {f.key === 'specialty' ? (
                      <select
                        id={`doctor-profile-${f.key}`}
                        value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 outline-none"
                      >
                        <option value="">Select Specialty</option>
                        {specialtyOptions.map(opt => (
                          <option key={opt.id} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input id={`doctor-profile-${f.key}`} type={f.type || 'text'} value={form[f.key]} readOnly={f.readOnly} onChange={e => !f.readOnly && setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 ${f.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50'}`} />
                    )}
                  </div>
                ))}

              </div>
              <div>
                <label htmlFor="doctor-profile-clinicAddress" className="text-xs font-bold text-slate-500 mb-1.5 block"><i className="fas fa-location-dot mr-1.5 text-aubergine-400"></i>Clinic Address</label>
                <textarea id="doctor-profile-clinicAddress" rows={2} value={form.clinicAddress} onChange={e => setForm(p => ({ ...p, clinicAddress: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
              </div>
              <div>
                <label htmlFor="doctor-profile-bio" className="text-xs font-bold text-slate-500 mb-1.5 block"><i className="fas fa-circle-info mr-1.5 text-aubergine-400"></i>Professional Bio (Patient-facing)</label>
                <textarea id="doctor-profile-bio" rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief description of your expertise..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
              </div>

              {/* Notification Preferences */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 text-sm mb-3">Notification Preferences</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Email Notifications', sub: 'Appointment bookings, lab reports', state: emailNotif, set: setEmailNotif },
                    { label: 'SMS Alerts', sub: 'Patient-in-waiting, urgent lab flags', state: smsNotif, set: setSmsNotif },
                  ].map(n => (
                    <div key={n.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{n.label}</p>
                        <p className="text-xs text-slate-500">{n.sub}</p>
                      </div>
                      <button onClick={() => { n.set(!n.state); toast(`${n.label} ${!n.state ? 'enabled' : 'disabled'}.`, 'info'); }}
                        className={`w-12 h-6 rounded-full relative transition-all border ${n.state ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${n.state ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Push Notifications</p>
                      <p className="text-xs text-slate-500">Device alerts for incoming calls</p>
                    </div>
                    <button onClick={handlePushToggle}
                      className={`w-12 h-6 rounded-full relative transition-all border ${pushEnabled ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${pushEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleSave}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saved ? 'fa-check' : 'fa-floppy-disk'}`}></i> {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── SHARE & BOOKING LINK ── */}
          {tab === 'share' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Live Telehealth Link
                    </span>
                    <h3 className="text-lg font-black text-white">{form.name}</h3>
                  </div>
                  <p className="text-xs text-aubergine-200">
                    Your direct public profile allows patients to book video consultations specifically with you.
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="bg-aubergine-600 hover:bg-aubergine-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md"
                  >
                    <i className="fas fa-qrcode"></i> View QR &amp; Poster
                  </button>
                  <a
                    href={`${window.location.origin}/dr/${doc.id || 'sarah-mitchell'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/20"
                  >
                    <i className="fas fa-arrow-up-right-from-square"></i> Open Public Page
                  </a>
                </div>
              </div>

              {/* Direct Link Copy Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Your Public Profile &amp; Direct Booking URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/dr/${doc.id || 'sarah-mitchell'}`}
                    className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/dr/${doc.id || 'sarah-mitchell'}`;
                      navigator.clipboard.writeText(url).then(() => {
                        toast('Booking link copied to clipboard!', 'success');
                      });
                    }}
                    className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    <i className="fas fa-copy"></i> Copy Link
                  </button>
                </div>
              </div>

              {/* WhatsApp Share Card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <i className="fab fa-whatsapp text-emerald-600 text-base"></i> WhatsApp Referral Message
                  </h4>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hello! You can view my verified clinical profile and book a direct video consultation with me (${form.name} — ${form.specialty}) on HealNari here:\n\n${window.location.origin}/dr/${doc.id || 'sarah-mitchell'}\n\n• NMC Verified & HIPAA Compliant\n• Direct digital prescription & follow-up care`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <i className="fab fa-whatsapp"></i> Send via WhatsApp
                  </a>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line shadow-xs">
                  {`Hello! You can view my verified clinical profile and book a direct video consultation with me (${form.name} — ${form.specialty}) on HealNari here:\n\n${window.location.origin}/dr/${doc.id || 'sarah-mitchell'}\n\n• NMC Verified & HIPAA Compliant\n• Direct digital prescription & follow-up care`}
                </div>
              </div>
            </div>
          )}

          {/* ── AVAILABILITY ── */}
          {tab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Working Days</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(availability).map(([day, active]) => (
                    <button key={day} onClick={() => { setAvailability(prev => ({ ...prev, [day]: !prev[day] })); toast(`${day} ${!active ? 'enabled' : 'disabled'}.`, 'info'); }}
                      className={`w-14 h-14 rounded-2xl font-bold text-sm flex flex-col items-center justify-center border transition-all ${active ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-aubergine-300'}`}>
                      {day}
                      {active && <i className="fas fa-check text-[10px] mt-0.5"></i>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Clinic Start Time</label>
                  <input
                    type="time"
                    value={scheduleTimes.startTime}
                    onChange={e => setScheduleTimes(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Clinic End Time</label>
                  <input
                    type="time"
                    value={scheduleTimes.endTime}
                    onChange={e => setScheduleTimes(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Lunch Break (Start - End)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={scheduleTimes.lunchStart}
                      onChange={e => setScheduleTimes(p => ({ ...p, lunchStart: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
                    />
                    <input
                      type="time"
                      value={scheduleTimes.lunchEnd}
                      onChange={e => setScheduleTimes(p => ({ ...p, lunchEnd: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Slot Duration</label>
                  <select
                    value={scheduleTimes.slotDuration}
                    onChange={e => setScheduleTimes(p => ({ ...p, slotDuration: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="20">20 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Leave / Unavailability Mode</h4>
                  <p className="text-xs text-amber-700 mt-0.5">Block all appointments and notify patients</p>
                </div>
                <button onClick={() => { setLeaveMode(!leaveMode); toast(leaveMode ? 'Leave mode disabled. Accepting appointments.' : 'Leave mode enabled. Patients notified.', leaveMode ? 'success' : 'warning'); }}
                  className={`w-12 h-6 rounded-full relative transition-all border ${leaveMode ? 'bg-amber-500 border-amber-500' : 'bg-slate-200 border-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${leaveMode ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className={`fas ${savingSchedule ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                {savingSchedule ? 'Saving Schedule...' : 'Save Schedule'}
              </button>
            </div>
          )}

          {/* ── FEES ── */}
          {tab === 'fees' && (
            <div className="space-y-5 max-w-lg">
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: `Video Consult Fee (${doc?.profile?.currency || 'INR'})`, key: 'videoFee', icon: 'fa-video', color: 'bg-aubergine-50 text-aubergine-700 border-aubergine-100' },
                  { label: `Clinic Visit Fee (${doc?.profile?.currency || 'INR'})`, key: 'clinicFee', icon: 'fa-hospital', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                ].map(f => (
                  <div key={f.key} className={`border ${f.color} rounded-2xl p-5`}>
                    <div className="text-base mb-2"><i className={`fas ${f.icon}`}></i></div>
                    <label htmlFor={`doctor-fee-${f.key}`} className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input id={`doctor-fee-${f.key}`} type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-700 text-sm mb-2">Platform Deductions &amp; Take-Home</h4>
                <div className="space-y-2 text-xs">
                  {(() => {
                    const commRate = Number(doc?.profile?.commission_rate ?? doc?.commission_rate ?? 10);
                    const feeAmount = Math.round(Number(form.videoFee || 0) * (commRate / 100));
                    const netPayout = Math.max(0, Number(form.videoFee || 0) - feeAmount);
                    const curr = doc?.profile?.currency || 'INR';
                    return [
                      ['Video Consult Gross', formatCurrency(form.videoFee, curr)],
                      ['Platform & Clinical Infrastructure Fee', `-${formatCurrency(feeAmount, curr)}`],
                      ['Your Estimated Net Take-Home', formatCurrency(netPayout, curr)]
                    ];
                  })().map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className={`font-bold ${k.startsWith('Your') ? 'text-emerald-700 text-sm' : 'text-slate-800'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveFees}
                disabled={savingFees}
                className="bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className={`fas ${savingFees ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                {savingFees ? 'Saving Fees...' : 'Save Fee Structure'}
              </button>
            </div>
          )}

          {/* ── NOTIFICATIONS & ALERTS ── */}
          {tab === 'notifications' && (
            <NotificationSettingsTab />
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div className="space-y-6 max-w-lg">
              {/* Password */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800">Change Password</h3>
                {[{ label: 'Current Password', key: 'current' }, { label: 'New Password', key: 'newPwd' }, { label: 'Confirm New Password', key: 'confirm' }].map(f => (
                  <div key={f.key}>
                    <label htmlFor={`doctor-pwd-${f.key}`} className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input id={`doctor-pwd-${f.key}`} type="password" placeholder="••••••••" value={pwdForm[f.key]} onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                  </div>
                ))}
                <button onClick={handlePasswordUpdate} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                  <i className="fas fa-key"></i> Update Password
                </button>
              </div>

              {/* 2FA */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-700">Two-Factor Authentication</h4>
                  <p className="text-xs text-slate-500 mt-0.5">OTP verification on every login</p>
                </div>
                <button onClick={() => { setTwoFA(!twoFA); toast(`2FA ${!twoFA ? 'enabled' : 'disabled'}.`, !twoFA ? 'success' : 'info'); }}
                  className={`w-12 h-6 rounded-full relative transition-all border ${twoFA ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${twoFA ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              {/* PHI Audit Logs */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 mb-3">System Access Log</h4>
                <p className="text-xs text-slate-500 mb-4">
                  A compliance trail of your access to patient health information.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {auditLogsLoading ? (
                    <div className="p-6 text-center text-slate-400">
                      <i className="fas fa-spinner fa-spin text-xl"></i>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No access records found.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/60">
                      {auditLogs.map(log => (
                        <div key={log.id} className="p-3 text-xs flex justify-between items-start gap-4 hover:bg-slate-100 transition-colors">
                          <div>
                            <p className="font-bold text-slate-700">{log.target?.full_name || 'System Resource'}</p>
                            <p className="text-slate-500 mt-0.5">
                              {log.action} <span className="font-mono bg-white px-1 border border-slate-200 rounded">{log.resource.replace('/api/', '')}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</p>
                            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {log.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="font-bold text-rose-600 mb-3">Danger Zone</h3>
                <button onClick={() => setShowLogout(true)}
                  className="flex items-center gap-2 text-sm font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-xl transition-colors w-full justify-start">
                  <i className="fas fa-right-from-bracket"></i> Sign Out of All Devices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <DoctorShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} doctor={doc} />

      {/* Photo Adjust & Upload Modal */}
      <PhotoAdjustModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        currentAvatarUrl={user?.avatarUrl}
        userName={form.name}
        initials={initials}
        onSave={async (file) => {
          try {
            await uploadAvatar(file);
            toast('Profile photo updated successfully!', 'success');
          } catch (err) {
            toast(err.message || 'Failed to update photo', 'error');
            throw err;
          }
        }}
        onRemove={async () => {
          try {
            await removeAvatar();
            toast('Profile photo removed.', 'info');
          } catch (err) {
            toast(err.message || 'Failed to remove photo', 'error');
            throw err;
          }
        }}
      />

      <ConfirmModal isOpen={showLogout} onClose={() => setShowLogout(false)}
        onConfirm={() => { logout(); toast('Signed out.', 'info'); }}
        title="Sign Out?" message="You will be signed out from all devices."
        confirmLabel="Sign Out" confirmStyle="danger" />
    </div>
  );
}

export default DoctorProfile;
