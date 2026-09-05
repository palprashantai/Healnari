import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { SUPPORTED_CURRENCIES, setStoredCurrency, getStoredCurrency } from '../../lib/currency.js';
import { LIFE_MODES } from './Dashboard.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import NotificationSettingsTab from '../../components/NotificationSettingsTab.jsx';

function PatientProfile() {
  const { user, updateUser, updatePassword, uploadAvatar, removeAvatar, logout, subscribePush } = useAuth();
  const { patients, updatePatient } = useClinicData();
  const own = patients?.[0];
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
  const [activeTab, setActiveTab] = useState('personal');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
    age: user?.age || '',
    bloodGroup: '',
    height: '',
    weight: '',
    city: '',
  });
  // Real patient record loads after the initial render (ClinicDataContext
  // fetches it async) — seed the form from it once it's available, without
  // clobbering anything the user has already started typing.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!own || hydrated) return;
    // Server/auth data only fills a field the user hasn't already typed into
    // (form value wins) — otherwise this would clobber in-progress input the
    // moment the async patient record resolves.
    setForm(p => ({
      ...p,
      name: p.name || user?.name || '',
      email: p.email || user?.email || '',
      phone: p.phone || user?.phone || '',
      dob: p.dob || own.dob || user?.dob || '',
      age: user?.age || '',
      bloodGroup: p.bloodGroup || (own.blood && own.blood !== '—' ? own.blood : ''),
      height: p.height || (own.height && own.height !== '—' ? String(own.height) : ''),
      weight: p.weight || (own.weight && own.weight !== '—' ? String(own.weight) : ''),
      city: p.city || own.city || '',
    }));
    setHydrated(true);
  }, [own, hydrated, user]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [emailNotif, setEmailNotif] = useState(user?.emailNotifications ?? true);
  const [smsNotif, setSmsNotif] = useState(user?.smsNotifications ?? true);
  const [selectedCurrency, setSelectedCurrency] = useState(() => localStorage.getItem('healnari_currency') || 'INR');
  const [selectedLifeMode, setSelectedLifeMode] = useState(() => localStorage.getItem('patient_life_mode') || 'cycle');
  const [discreetMode, setDiscreetMode] = useState(() => localStorage.getItem('discreet_mode') === 'true');

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'security') {
      setAuditLogsLoading(true);
      apiFetch('/patients/me/audit-logs')
        .then(res => setAuditLogs(res || []))
        .catch(() => toast('Failed to load audit logs', 'error'))
        .finally(() => setAuditLogsLoading(false));
    }
  }, [activeTab]);

  const handleCurrencyChange = async (code) => {
    const normalized = setStoredCurrency(code);
    setSelectedCurrency(normalized);
    try {
      await updateUser?.({ currency: normalized, country: normalized === 'USD' ? 'US' : 'IN' });
    } catch {}
    toast(`Display currency updated to ${normalized}.`, 'success');
  };

  const handleLifeModeChange = (id) => {
    setSelectedLifeMode(id);
    localStorage.setItem('patient_life_mode', id);
    toast(`Primary life stage set to ${LIFE_MODES.find(m => m.id === id)?.label}.`, 'success');
  };

  const handleDiscreetToggle = () => {
    const next = !discreetMode;
    setDiscreetMode(next);
    localStorage.setItem('discreet_mode', String(next));
    window.dispatchEvent(new Event('discreet_mode_changed'));
    toast(`Discreet Mode ${next ? 'enabled' : 'disabled'}.`, 'info');
  };

  const validateForm = () => {
    if (!form.name || form.name.trim().length < 2) return 'Please enter a valid full name.';
    if (form.phone && !/^[0-9+\s\-()]{7,20}$/.test(form.phone.trim())) return 'Please enter a valid contact phone number.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) { toast(validationError, 'error'); return; }
    setSaving(true);
    try {
      // email is intentionally excluded — the account email can't be changed
      // from here; it's not accepted by either the auth or patient-record API.
      await updateUser?.({ name: form.name, phone: form.phone });
      if (own) {
        await updatePatient({
          ...own,
          name: form.name,
          phone: form.phone,
          dob: form.dob,
          blood: form.bloodGroup,
          height: form.height,
          weight: form.weight,
          city: form.city,
        });
      }
      setSaved(true);
      toast('Profile updated successfully!', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch {
      toast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = async (key, current, setter) => {
    setter(!current);
    try {
      await updateUser?.({ [key]: !current });
      toast(`${key === 'emailNotifications' ? 'Email' : 'SMS'} notifications ${!current ? 'enabled' : 'disabled'}.`, 'info');
    } catch {
      setter(current); // rollback
      toast('Failed to update notification preference.', 'error');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!pwdForm.current) { toast('Please enter your current password.', 'error'); return; }
    if (pwdForm.newPwd.length < 6) { toast('New password must be at least 6 characters.', 'error'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast('New passwords do not match.', 'error'); return; }
    setPwdSaving(true);
    try {
      await updatePassword(pwdForm.current, pwdForm.newPwd);
      toast('Password updated successfully!', 'success');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch (err) {
      toast(err.message || 'Failed to update password. Please try again.', 'error');
    } finally {
      setPwdSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSaving(true);
    try {
      await uploadAvatar(file);
      toast('Profile photo updated!', 'success');
      setShowPhotoModal(false);
    } catch (err) {
      toast(err.message || 'Failed to upload photo. Please try again.', 'error');
    } finally {
      setPhotoSaving(false);
      e.target.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoSaving(true);
    try {
      await removeAvatar();
      toast('Photo removed.', 'info');
      setShowPhotoModal(false);
    } catch (err) {
      toast(err.message || 'Failed to remove photo. Please try again.', 'error');
    } finally {
      setPhotoSaving(false);
    }
  };

  const initials = form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const FIELD_COLOR = {
    personal: 'from-aubergine-900 to-aubergine-700',
    health: 'from-rose-900 to-rose-700',
    preferences: 'from-aubergine-900 to-aubergine-700',
    security: 'from-slate-800 to-slate-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-slate-800">My Profile</h1>

      {/* Profile Header */}
      <div className={`bg-gradient-to-r ${FIELD_COLOR[activeTab]} rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden transition-all duration-500`}>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-semibold text-white shrink-0 shadow-xl overflow-hidden">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt={form.name} className="w-full h-full object-cover" /> : initials}
          </div>
          <button onClick={() => setShowPhotoModal(true)}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-aubergine-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <i className="fas fa-camera text-xs"></i>
          </button>
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold">{form.name}</h2>
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
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar">
          {[
            ['personal', 'Personal Info', 'fa-user'],
            ['health', 'Health Details', 'fa-heart-pulse'],
            ['preferences', 'Regional & Life Stage', 'fa-globe'],
            ['notifications', 'Notifications & Alerts', 'fa-bell'],
            ['security', 'Security', 'fa-shield-halved'],
          ].map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* ── PERSONAL INFO ── */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name', key: 'name', icon: 'fa-user' },
                  { label: 'Email Address', key: 'email', icon: 'fa-envelope', type: 'email', readOnly: true },
                  { label: 'Phone Number', key: 'phone', icon: 'fa-phone' },
                  { label: 'Date of Birth', key: 'dob', icon: 'fa-cake-candles', type: 'date' },
                  { label: 'Age', key: 'age', icon: 'fa-user-clock', readOnly: true },
                  { label: 'City / Location', key: 'city', icon: 'fa-location-dot' },
                ].map(field => (
                  <div key={field.key}>
                    <label htmlFor={`profile-${field.key}`} className="text-xs font-bold text-slate-500 mb-1.5 block">
                      <i className={`fas ${field.icon} mr-1.5 text-aubergine-400`}></i>{field.label}
                      {field.readOnly && <span className="ml-1.5 font-normal text-slate-400 normal-case">{field.key === 'age' ? '(auto-calculated)' : '(cannot be changed)'}</span>}
                    </label>
                    <input
                      id={`profile-${field.key}`}
                      type={field.type || 'text'}
                      value={form[field.key]}
                      readOnly={field.readOnly}
                      onChange={e => !field.readOnly && setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 transition-colors ${field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50'}`}
                    />
                  </div>
                ))}
              </div>

              {/* Notification Preferences */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 text-sm mb-3">Notification Preferences</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Email Notifications', sub: 'Appointment reminders, lab reports', key: 'emailNotifications', state: emailNotif, set: setEmailNotif },
                    { label: 'SMS Notifications', sub: 'Booking confirmations, urgent alerts', key: 'smsNotifications', state: smsNotif, set: setSmsNotif },
                  ].map(n => (
                    <div key={n.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{n.label}</p>
                        <p className="text-xs text-slate-500">{n.sub}</p>
                      </div>
                      <button onClick={() => toggleNotif(n.key, n.state, n.set)}
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

              <button onClick={handleSave} disabled={saving}
                className={`mt-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-60 ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : saved ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── HEALTH DETAILS ── */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="profile-bloodGroup" className="text-xs font-bold text-slate-500 mb-1.5 block">Blood Group <span className="font-normal text-slate-400 ml-1">(Optional)</span></label>
                  <select id="profile-bloodGroup" value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-height" className="text-xs font-bold text-slate-500 mb-1.5 block">Height (cm) <span className="font-normal text-slate-400 ml-1">(Optional)</span></label>
                  <input id="profile-height" type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                </div>
                <div>
                  <label htmlFor="profile-weight" className="text-xs font-bold text-slate-500 mb-1.5 block">Weight (kg) <span className="font-normal text-slate-400 ml-1">(Optional)</span></label>
                  <input id="profile-weight" type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                </div>
              </div>

              {/* BMI Calculator */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">BMI Calculator</h4>
                {(() => {
                  const h = parseFloat(form.height) / 100;
                  const w = parseFloat(form.weight);
                  // Previously computed height-only-valid inputs as (NaN /
                  // x).toFixed(1), which is the *string* "NaN" — isNaN("NaN")
                  // is true so the category still fell back correctly, but
                  // the literal text "NaN" was displayed as the BMI value.
                  const bmi = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : null;
                  const category = bmi === null ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
                  const catColor = category === 'Normal' ? 'text-emerald-600' : category === 'Underweight' ? 'text-amber-600' : 'text-rose-600';
                  return (
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-semibold text-slate-800">{bmi ?? '—'}</div>
                      <div>
                        <p className={`text-sm font-bold ${catColor}`}>{category}</p>
                        <p className="text-xs text-slate-500">BMI Index</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button onClick={handleSave} disabled={saving}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-60 ${saved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : saved ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── REGIONAL & LIFE STAGE PREFERENCES ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-8 max-w-2xl">
              {/* Primary Life Stage Goal */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Primary Health & Life Stage Goal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Customizes your daily dashboard widgets, trackers, and insights.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {LIFE_MODES.map(m => {
                    const isSelected = selectedLifeMode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleLifeModeChange(m.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-aubergine-500 bg-aubergine-50/60 shadow-sm ring-2 ring-aubergine-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center text-sm shadow-sm`}>
                            <i className={`fas ${m.icon}`}></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-800 text-xs">{m.label}</h4>
                              {isSelected && <i className="fas fa-circle-check text-aubergine-600 text-sm"></i>}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Billing Currency (Automated by Country) */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Regional Billing Currency</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automatically configured according to your verified country of residence.</p>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl max-w-md">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-sm">
                    {user?.country === 'IN' ? '🇮🇳' : '🌍'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {user?.country === 'IN' ? 'India (Domestic Patient)' : 'International Patient'}
                    </p>
                    <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                      <i className="fas fa-shield-alt text-[11px]"></i>
                      <span>Auto-Assigned Currency: {user?.country === 'IN' ? 'INR (₹) — Indian Rupee' : 'USD ($) — US Dollar'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Discreet Mode Privacy Switch */}
              <div className="border-t border-slate-100 pt-6">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-sm shadow-inner">
                      <i className="fas fa-eye-slash"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Discreet Public Privacy Mode</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Blurs sensitive vitals, cycle days, and diagnoses when browsing in public.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscreetToggle}
                    className={`w-12 h-6 rounded-full relative transition-colors ${discreetMode ? 'bg-aubergine-600' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${discreetMode ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS & ALERTS ── */}
          {activeTab === 'notifications' && (
            <NotificationSettingsTab />
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
                    <label htmlFor={`profile-pwd-${f.key}`} className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
                    <input id={`profile-pwd-${f.key}`} type="password" placeholder="••••••••" value={pwdForm[f.key]}
                      onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                  </div>
                ))}
                <button onClick={handlePasswordUpdate} disabled={pwdSaving}
                  className="bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                  <i className={`fas ${pwdSaving ? 'fa-spinner fa-spin' : 'fa-key'}`}></i> {pwdSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>

              {/* 2FA — no OTP/verification backend exists yet, so this can't
                  actually be turned on. Previously this was a fully working
                  toggle that flipped to "enabled" and told the user their
                  account was more secure, with nothing behind it. */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-700">Two-Factor Authentication</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Adds an extra layer of security via OTP — coming soon</p>
                  </div>
                  <button disabled title="Coming soon"
                    className="w-12 h-6 rounded-full relative border bg-slate-200 border-slate-300 opacity-50 cursor-not-allowed">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                  </button>
                </div>
              </div>

              {/* Active Sessions — no session/device tracking exists on the
                  backend. Previously this showed the same two fabricated
                  devices ("Chrome on Windows 11", "HealNari iOS App") to
                  every user with a working-looking "Revoke" button. */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 mb-3">Active Sessions</h4>
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Viewing and managing individual sign-in sessions isn't available yet.
                </p>
              </div>

              {/* PHI Audit Logs */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-700 mb-3">Health Record Access Log</h4>
                <p className="text-xs text-slate-500 mb-4">
                  See when doctors or system services access your health information.
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
                            <p className="font-bold text-slate-700">{log.actor?.full_name || log.actor_id}</p>
                            <p className="text-slate-500 mt-0.5">
                              {log.action} <span className="font-mono bg-white px-1 border border-slate-200 rounded">{log.resource.replace('/api/', '')}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</p>
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-semibold uppercase">
                              {log.actor_role}
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
                <div className="space-y-2">
                  <button onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-xl transition-colors w-full justify-start">
                    <i className="fas fa-right-from-bracket"></i> Sign Out
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
          <div className="w-24 h-24 rounded-3xl bg-aubergine-100 text-aubergine-700 text-3xl font-semibold flex items-center justify-center mx-auto overflow-hidden">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt={form.name} className="w-full h-full object-cover" /> : initials}
          </div>
          <p className="text-sm text-slate-500">Upload a new profile photo (PNG, JPG up to 5MB)</p>
          <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={handlePhotoUpload} disabled={photoSaving} />
          <label htmlFor="photo-upload"
            className="block w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer aria-disabled:opacity-60"
            aria-disabled={photoSaving}>
            <i className={`fas ${photoSaving ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}></i> {photoSaving ? 'Uploading…' : 'Choose Photo'}
          </label>
          {user?.avatarUrl && (
            <button onClick={handlePhotoRemove} disabled={photoSaving}
              className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 font-bold py-2.5 rounded-xl text-sm transition-colors">
              Remove Photo
            </button>
          )}
        </div>
      </Modal>

      {/* logout() only clears this device's local tokens — it doesn't call
          Supabase to revoke the refresh token, so it never actually signed
          out other devices/sessions despite the previous "of All Devices"
          label and message claiming otherwise. */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { logout(); toast('Signed out successfully.', 'info'); }}
        title="Sign Out?"
        message="You will be signed out of this device. You can log back in anytime."
        confirmLabel="Sign Out"
        confirmStyle="danger"
      />
      {/* No account-deletion endpoint exists yet — this used to claim "request
          submitted, confirmation email sent" when neither happened. For an
          app that advertises DPDP Act compliance elsewhere, falsely
          confirming a data-deletion request is a real problem, not just a
          cosmetic stub. */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => toast('Self-serve account deletion isn\'t available yet. Please contact the clinic directly to request deletion of your account and data.', 'info')}
        title="Delete Account?"
        message="This action is permanent. All your medical records, prescriptions, and data will be deleted. This cannot be undone."
        confirmLabel="Delete My Account"
        confirmStyle="danger"
      />
    </div>
  );
}

export default PatientProfile;
