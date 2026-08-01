import React, { useState } from 'react';
import { useAuth, DEMO_DOCTOR } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Main Component ─────────────────────────── */
function DoctorProfile() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const doc = user || DEMO_DOCTOR;

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    name:         doc.name         || 'Dr. Sarah Mitchell',
    email:        doc.email        || 'sarah@femcare.app',
    phone:        doc.phone        || '+91 98765 00001',
    specialty:    doc.specialty    || 'Gynaecology & Obstetrics',
    qualification:doc.qualification|| 'MBBS, MD (OBG)',
    regNo:        doc.regNo        || 'MCI-29402',
    experience:   doc.experience   || '12 Years',
    clinicName:   doc.clinicName   || 'FemCare Women\'s Clinic — Bandra',
    clinicAddress:doc.clinicAddress|| 'Shop 4, Mehta Plaza, Bandra West, Mumbai',
    bio:          doc.bio          || '',
    consultFee:   String(doc.consultFee || 799),
    videoFee:     '799',
    clinicFee:    '999',
  });
  const [saved, setSaved] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showLogout, setShowLogout] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [twoFA, setTwoFA] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [availability, setAvailability] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
  });
  const [leaveMode, setLeaveMode] = useState(false);

  const handleSave = () => {
    updateUser?.(form);
    setSaved(true);
    toast('Profile updated successfully!', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordUpdate = () => {
    if (!pwdForm.current) { toast('Enter current password.', 'error'); return; }
    if (pwdForm.newPwd.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast('Passwords do not match.', 'error'); return; }
    toast('Password updated!', 'success');
    setPwdForm({ current: '', newPwd: '', confirm: '' });
  };

  const initials = form.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-slate-800">Doctor Profile</h1>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#251121] to-[#3b1c32] rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-3xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-black shadow-xl">
            {initials}
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
            <span className="bg-emerald-500/80 border border-emerald-400/40 text-white text-xs font-bold px-3 py-1 rounded-full">
              <i className="fas fa-circle-check mr-1 text-[10px]"></i>Verified
            </span>
          </div>
        </div>
        <button onClick={() => setShowPhotoModal(true)}
          className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 flex-shrink-0">
          <i className="fas fa-camera"></i> Change Photo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['profile', 'Practice Info', 'fa-stethoscope'],
            ['schedule', 'Availability', 'fa-calendar'],
            ['fees', 'Consultation Fees', 'fa-indian-rupee-sign'],
            ['security', 'Security', 'fa-shield-halved'],
          ].map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
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
                  { label: 'Qualification', key: 'qualification', icon: 'fa-graduation-cap' },
                  { label: 'Years of Experience', key: 'experience', icon: 'fa-clock-rotate-left' },
                  { label: 'Clinic Name', key: 'clinicName', icon: 'fa-hospital' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                      <i className={`fas ${f.icon} mr-1.5 text-aubergine-400`}></i>{f.label}
                    </label>
                    <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block"><i className="fas fa-location-dot mr-1.5 text-aubergine-400"></i>Clinic Address</label>
                <textarea rows={2} value={form.clinicAddress} onChange={e => setForm(p => ({ ...p, clinicAddress: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block"><i className="fas fa-circle-info mr-1.5 text-aubergine-400"></i>Professional Bio (Patient-facing)</label>
                <textarea rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief description of your expertise..."
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
                        <p className="text-xs text-slate-400">{n.sub}</p>
                      </div>
                      <button onClick={() => { n.set(!n.state); toast(`${n.label} ${!n.state ? 'enabled' : 'disabled'}.`, 'info'); }}
                        className={`w-12 h-6 rounded-full relative transition-all border ${n.state ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${n.state ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saved ? 'fa-check' : 'fa-floppy-disk'}`}></i> {saved ? 'Saved!' : 'Save Changes'}
              </button>
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
                      className={`w-14 h-14 rounded-2xl font-bold text-sm flex flex-col items-center justify-center border transition-all ${active ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200 hover:border-aubergine-300'}`}>
                      {day}
                      {active && <i className="fas fa-check text-[10px] mt-0.5"></i>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { label: 'Clinic Start Time', value: '09:00 AM' },
                  { label: 'Clinic End Time', value: '05:00 PM' },
                  { label: 'Lunch Break', value: '01:00 PM – 02:00 PM' },
                  { label: 'Slot Duration', value: '30 Minutes' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input defaultValue={f.value} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50" />
                  </div>
                ))}
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

              <button onClick={() => toast('Schedule updated and synced!', 'success')}
                className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                <i className="fas fa-floppy-disk"></i> Save Schedule
              </button>
            </div>
          )}

          {/* ── FEES ── */}
          {tab === 'fees' && (
            <div className="space-y-5 max-w-lg">
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Video Consult Fee (₹)', key: 'videoFee', icon: 'fa-video', color: 'bg-sky-50 text-sky-600 border-sky-100' },
                  { label: 'Clinic Visit Fee (₹)', key: 'clinicFee', icon: 'fa-hospital', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                ].map(f => (
                  <div key={f.key} className={`border ${f.color} rounded-2xl p-5`}>
                    <div className="text-base mb-2"><i className={`fas ${f.icon}`}></i></div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-700 text-sm mb-2">Platform Deductions</h4>
                <div className="space-y-2 text-xs">
                  {[['Video Consult Gross', `₹${form.videoFee}`], ['Platform Fee (8%)', `-₹${Math.round(form.videoFee * 0.08)}`], ['GST on fee (18%)', `-₹${Math.round(form.videoFee * 0.08 * 0.18)}`], ['Your Net Earnings', `₹${Math.round(form.videoFee * 0.92 * 0.82)}`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className={`font-bold ${k.startsWith('Your') ? 'text-emerald-700 text-sm' : 'text-slate-800'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => toast('Fee structure saved and updated on your public profile.', 'success')}
                className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                <i className="fas fa-floppy-disk"></i> Save Fee Structure
              </button>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div className="space-y-6 max-w-lg">
              {/* Password */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800">Change Password</h3>
                {[{ label: 'Current Password', key: 'current' }, { label: 'New Password', key: 'newPwd' }, { label: 'Confirm New Password', key: 'confirm' }].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input type="password" placeholder="••••••••" value={pwdForm[f.key]} onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
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

      {/* Photo Modal */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="Change Profile Photo" size="sm">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-3xl bg-aubergine-100 text-aubergine-700 text-3xl font-black flex items-center justify-center mx-auto">{initials}</div>
          <input type="file" accept="image/*" className="hidden" id="doctor-photo-upload" onChange={() => { toast('Profile photo updated!', 'success'); setShowPhotoModal(false); }} />
          <label htmlFor="doctor-photo-upload" className="block w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors">
            <i className="fas fa-upload mr-2"></i> Upload Photo
          </label>
          <button onClick={() => { toast('Photo removed.', 'info'); setShowPhotoModal(false); }}
            className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 rounded-xl text-sm transition-colors">
            Remove Photo
          </button>
        </div>
      </Modal>

      <ConfirmModal isOpen={showLogout} onClose={() => setShowLogout(false)}
        onConfirm={() => { logout(); toast('Signed out.', 'info'); }}
        title="Sign Out?" message="You will be signed out from all devices."
        confirmLabel="Sign Out" confirmStyle="danger" />
    </div>
  );
}

export default DoctorProfile;
