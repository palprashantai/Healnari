import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

function PatientProfile() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [form, setForm] = useState({
    name: user?.name || 'Priya Sharma',
    email: user?.email || 'priya@example.com',
    phone: user?.phone || '+91 98765 43210',
    dob: user?.dob || '1996-04-12',
    bloodGroup: user?.bloodGroup || 'B+',
    height: user?.height || '163',
    weight: user?.weight || '64.5',
    city: user?.city || 'Mumbai',
  });
  const [saved, setSaved] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);

  const handleSave = () => {
    updateUser?.(form);
    setSaved(true);
    toast('Profile updated successfully!', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordUpdate = () => {
    if (!pwdForm.current) { toast('Please enter your current password.', 'error'); return; }
    if (pwdForm.newPwd.length < 8) { toast('New password must be at least 8 characters.', 'error'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast('New passwords do not match.', 'error'); return; }
    toast('Password updated successfully!', 'success');
    setPwdForm({ current: '', newPwd: '', confirm: '' });
  };

  const initials = form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const FIELD_COLOR = {
    personal: 'from-aubergine-900 to-aubergine-700',
    health: 'from-rose-900 to-rose-700',
    security: 'from-slate-800 to-slate-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-slate-800">My Profile</h1>

      {/* Profile Header */}
      <div className={`bg-gradient-to-r ${FIELD_COLOR[activeTab]} rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden transition-all duration-500`}>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-black text-white shrink-0 shadow-xl">
            {initials}
          </div>
          <button onClick={() => setShowPhotoModal(true)}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-aubergine-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <i className="fas fa-camera text-xs"></i>
          </button>
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-black">{form.name}</h2>
          <p className="text-white/70 text-sm mt-1">{form.email}</p>
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <span className="bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">Patient</span>
            <span className="bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              <i className="fas fa-location-dot mr-1"></i>{form.city}
            </span>
            <span className="bg-emerald-500/80 border border-emerald-400/50 text-white text-xs font-bold px-3 py-1 rounded-full">
              <i className="fas fa-circle-check mr-1 text-[10px]"></i>Verified
            </span>
          </div>
        </div>
        <div className="sm:ml-auto flex gap-2 shrink-0">
          <button onClick={() => setShowPhotoModal(true)}
            className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
            <i className="fas fa-camera"></i> Change Photo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['personal', 'Personal Info', 'fa-user'],
            ['health', 'Health Details', 'fa-heart-pulse'],
            ['security', 'Security', 'fa-shield-halved'],
          ].map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── PERSONAL INFO ── */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name', key: 'name', icon: 'fa-user' },
                  { label: 'Email Address', key: 'email', icon: 'fa-envelope', type: 'email' },
                  { label: 'Phone Number', key: 'phone', icon: 'fa-phone' },
                  { label: 'Date of Birth', key: 'dob', icon: 'fa-cake-candles', type: 'date' },
                  { label: 'City / Location', key: 'city', icon: 'fa-location-dot' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                      <i className={`fas ${field.icon} mr-1.5 text-aubergine-400`}></i>{field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={form[field.key]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 transition-colors"
                    />
                  </div>
                ))}
              </div>

              {/* Notification Preferences */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 text-sm mb-3">Notification Preferences</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Email Notifications', sub: 'Appointment reminders, lab reports', state: emailNotif, set: setEmailNotif },
                    { label: 'SMS Notifications', sub: 'Booking confirmations, urgent alerts', state: smsNotif, set: setSmsNotif },
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
                className={`mt-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saved ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── HEALTH DETAILS ── */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Height (cm)</label>
                  <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Weight (kg)</label>
                  <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                </div>
              </div>

              {/* BMI Calculator */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">BMI Calculator</h4>
                {(() => {
                  const h = parseFloat(form.height) / 100;
                  const w = parseFloat(form.weight);
                  const bmi = h > 0 ? (w / (h * h)).toFixed(1) : '—';
                  const category = isNaN(bmi) ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
                  const catColor = category === 'Normal' ? 'text-emerald-600' : category === 'Underweight' ? 'text-sky-600' : 'text-rose-600';
                  return (
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-black text-slate-800">{bmi}</div>
                      <div>
                        <p className={`text-sm font-bold ${catColor}`}>{category}</p>
                        <p className="text-xs text-slate-400">BMI Index</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button onClick={handleSave}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saved ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-lg">
              {/* Change Password */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800">Change Password</h3>
                {[
                  { label: 'Current Password', key: 'current' },
                  { label: 'New Password', key: 'newPwd' },
                  { label: 'Confirm New Password', key: 'confirm' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input type="password" placeholder="••••••••" value={pwdForm[f.key]}
                      onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                  </div>
                ))}
                <button onClick={handlePasswordUpdate}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                  <i className="fas fa-key"></i> Update Password
                </button>
              </div>

              {/* 2FA */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-700">Two-Factor Authentication</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Adds an extra layer of security via OTP</p>
                  </div>
                  <button onClick={() => { setTwoFA(!twoFA); toast(`2FA ${!twoFA ? 'enabled' : 'disabled'}.`, !twoFA ? 'success' : 'info'); }}
                    className={`w-12 h-6 rounded-full relative transition-all border ${twoFA ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${twoFA ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 mb-3">Active Sessions</h4>
                {[
                  { device: 'Chrome on Windows 11', location: 'Mumbai, IN', current: true },
                  { device: 'HealNari iOS App', location: 'Mumbai, IN', current: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        {s.device}
                        {s.current && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Current</span>}
                      </p>
                      <p className="text-xs text-slate-400">{s.location}</p>
                    </div>
                    {!s.current && (
                      <button onClick={() => toast('Session terminated.', 'success')} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Revoke</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Danger Zone */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="font-bold text-rose-600 mb-3">Danger Zone</h3>
                <div className="space-y-2">
                  <button onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-xl transition-colors w-full justify-start">
                    <i className="fas fa-right-from-bracket"></i> Sign Out of All Devices
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-rose-700 border border-rose-300 bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-xl transition-colors w-full justify-start">
                    <i className="fas fa-trash"></i> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="Change Profile Photo" size="sm">
        <div className="space-y-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-aubergine-100 text-aubergine-700 text-3xl font-black flex items-center justify-center mx-auto">{initials}</div>
          <p className="text-sm text-slate-500">Upload a new profile photo (PNG, JPG up to 5MB)</p>
          <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={() => { toast('Profile photo updated!', 'success'); setShowPhotoModal(false); }} />
          <label htmlFor="photo-upload"
            className="block w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">
            <i className="fas fa-upload mr-2"></i> Choose Photo
          </label>
          <button onClick={() => { toast('Photo removed.', 'info'); setShowPhotoModal(false); }}
            className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 rounded-xl text-sm transition-colors">
            Remove Photo
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { logout(); toast('Signed out successfully.', 'info'); }}
        title="Sign Out?"
        message="You will be signed out from all devices. You can log back in anytime."
        confirmLabel="Sign Out"
        confirmStyle="danger"
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => toast('Account deletion request submitted. You will receive a confirmation email.', 'info')}
        title="Delete Account?"
        message="This action is permanent. All your medical records, prescriptions, and data will be deleted. This cannot be undone."
        confirmLabel="Delete My Account"
        confirmStyle="danger"
      />
    </div>
  );
}

export default PatientProfile;
