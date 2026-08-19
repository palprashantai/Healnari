import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useNotifications, NOTIFICATION_STYLE, DEFAULT_NOTIFICATION_STYLE } from '../../context/NotificationsContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { PageTransition } from '../../components/PageTransition.jsx';
import { DataErrorBanner } from '../../components/DataErrorBanner.jsx';
import { NavHoverRail } from '../../components/NavHoverRail.jsx';
import { ModuleAccentBar } from '../../components/ModuleAccentBar.jsx';
import AiChatWidget from '../../tools/AiChatWidget.jsx';

import { triggerHaptic } from '../../lib/haptics.js';

const DEFAULT_ACCENT = '#6B46C1';

const NAV_ITEMS = [
  { name: 'Dashboard',        icon: 'fa-chart-pie',           path: '/doctor-dashboard',              end: true,  color: '#6B46C1' },
  { name: 'Analytics & Growth',icon: 'fa-chart-line',         path: '/doctor-dashboard/analytics',    end: false, color: '#f59e0b' },
  { name: 'Appointments',     icon: 'fa-calendar-check',      path: '/doctor-dashboard/appointments', end: false, color: '#10b981' },
  { name: 'Patient Requests', icon: 'fa-user-plus',           path: '/doctor-dashboard/requests',     end: false, color: '#22c55e' },
  { name: 'Patients & EMR',   icon: 'fa-users',               path: '/doctor-dashboard/patients',     end: false, color: '#0ea5e9' },
  { name: 'Prescriptions',    icon: 'fa-file-prescription',   path: '/doctor-dashboard/prescriptions',end: false, color: '#f43f5e' },
  { name: 'Telemedicine',     icon: 'fa-video',               path: '/doctor-dashboard/telemedicine', end: false, color: '#6366f1' },
  { name: 'Communication Center',icon: 'fa-bullhorn',         path: '/doctor-dashboard/communications',end:false, color: '#ec4899' },
  { name: 'Lab & Reports',    icon: 'fa-flask',               path: '/doctor-dashboard/reports',      end: false, color: '#f59e0b' },
  { name: 'Earnings & Payouts', icon: 'fa-file-invoice-dollar', path: '/doctor-dashboard/billing',      end: false, color: '#14b8a6' },
  { name: 'Staff Management', icon: 'fa-user-nurse',          path: '/doctor-dashboard/staff',        end: false, color: '#d946ef' },
  { name: 'My Profile',       icon: 'fa-circle-user',         path: '/doctor-dashboard/profile',      end: false, color: '#64748b' },
];

const DOCTOR_BOTTOM_TABS = [
  { name: 'Overview',     icon: 'fa-chart-pie',         path: '/doctor-dashboard', end: true },
  { name: 'Queue',        icon: 'fa-calendar-check',    path: '/doctor-dashboard/appointments' },
  { name: 'Telemed',      icon: 'fa-video',             path: '/doctor-dashboard/telemedicine', isFab: true },
  { name: 'Patients',     icon: 'fa-users',             path: '/doctor-dashboard/patients' },
  { name: 'Prescribe',    icon: 'fa-file-prescription', path: '/doctor-dashboard/prescriptions' },
];

/** "10 min ago" style relative timestamp for a notification's created_at. */
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

/* ─── Notification Panel ─────────────────────── */
// System / informational feed only — urgent clinical items (labs needing a decision)
// live exclusively in the Clinical Alerts drawer so the same event isn't triaged twice.
function NotificationPanel({ isOpen, onClose, notifications, onMarkAll, onMarkOne }) {
  const unread = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(42,22,71,0.25)] z-[100] animate-fade-in overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/90">
        <h3 className="font-bold text-slate-800 text-sm">Notifications {unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{unread}</span>}</h3>
        {unread > 0 && <button onClick={onMarkAll} className="text-xs text-aubergine-600 font-bold hover:underline">Mark all read</button>}
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">You're all caught up.</p>
        )}
        {notifications.map(n => {
          const style = NOTIFICATION_STYLE[n.type] || DEFAULT_NOTIFICATION_STYLE;
          return (
            <div key={n.id} onClick={() => !n.read && onMarkOne(n.id)} className={`px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-aubergine-50/30' : ''}`}>
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${style.color} flex items-center justify-center flex-shrink-0`}>
                  <i className={`fas ${style.icon} text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-xs font-bold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 bg-aubergine-600 rounded-full flex-shrink-0 mt-0.5"></div>}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-slate-100">
        <button onClick={onClose} className="w-full text-xs text-center text-slate-500 hover:text-aubergine-600 font-medium transition-colors">Close</button>
      </div>
    </div>
  );
}

/* ─── Sidebar Content ────────────────────────── */
function SidebarContent({ user, onClose, onItemHover }) {
  const { logout } = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();

  const handleLogout = () => {
    logout();
    toast('Signed out. See you soon!', 'info');
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-aubergine-900">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 shrink-0 pt-2">
        <NavLink to="/doctor-dashboard" className="flex items-center">
          <HealNariLogo showTagline={false} size="sm" variant="dark" />
        </NavLink>
        <span className="ml-auto text-[9px] text-aubergine-300 font-bold uppercase tracking-widest border border-aubergine-500/30 bg-aubergine-500/10 px-2 py-0.5 rounded-full shadow-inner">Provider</span>
      </div>

      {/* Doctor Badge */}
      <div className="mx-4 mt-6 mb-4 py-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer group">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-aubergine-500 to-magenta-600 shadow-lg flex items-center justify-center text-white text-xs font-black shrink-0 relative">
          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
        </div>
        <div className="min-w-0">
          <p className="text-slate-200 text-xs font-bold leading-tight truncate group-hover:text-white transition-colors">{user?.name || 'Dr. Sarah Mitchell'}</p>
          <p className="text-slate-500 text-[10px] truncate">{user?.specialty || 'Gynaecologist'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-2 flex-1 overflow-y-auto hide-scrollbar">
        <p className="text-[11px] font-bold text-aubergine-300/60 uppercase tracking-widest mb-3 px-3">Main Menu</p>
        <NavHoverRail indicatorClassName="bg-aubergine-800/40 rounded-xl">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.name} to={item.path} end={item.end} onClick={onClose}
              onMouseEnter={() => onItemHover?.(item.color)}
              onMouseLeave={() => onItemHover?.(null)}
              data-nav-item
              className={({ isActive }) =>
                `group flex items-center gap-3.5 px-4 py-3 mb-1 rounded-xl font-medium text-[14px] tracking-wide transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-aubergine-600/90 to-aubergine-700/50 text-white shadow-md shadow-aubergine-900/40 border border-aubergine-500/30'
                    : 'text-aubergine-200/70 hover:text-white border border-transparent'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-6 flex justify-center items-center transition-all duration-300 ${isActive ? 'text-white drop-shadow-md scale-110' : 'text-aubergine-300/70 group-hover:text-white group-hover:scale-110'}`}>
                    <i className={`fas ${item.icon} text-[16px]`}></i>
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </NavHoverRail>
      </nav>

      {/* Logout */}
      <div className="p-4 shrink-0 pb-28 md:pb-4 safe-area-pb border-t border-aubergine-800/40">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all w-full shadow-sm active:scale-95"
        >
          <i className="fas fa-arrow-right-from-bracket"></i>
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Layout ────────────────────────────── */
function DoctorLayout() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const toast     = useToast();
  const { patients, loadError, retryLoad } = useClinicData();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hoveredColor, setHoveredColor]   = useState(null);

  // Patients actually opened this session, most-recent first — feeds the "Switch Patient"
  // shortcut so it's a real recency list rather than a second copy of the full directory
  // the search box already covers.
  const [recentPatients, setRecentPatients] = useState(['Priya Sharma']);
  const trackRecent = (name) => setRecentPatients(prev => [name, ...prev.filter(p => p !== name)].slice(0, 5));

  const formatDob = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // Builds the 2-identifier banner shape from a real roster record, so the name,
  // MRN, DOB, and allergy list shown here always match the patient's own EMR.
  const toActivePatient = (patient) => {
    if (!patient) return {
      name: 'No Patient Selected', dob: '—', mrn: '—', age: '—', bloodGroup: '—',
      allergies: [], alerts: []
    };
    return {
      name: patient.name,
      dob: formatDob(patient.dob),
      mrn: patient.mrn,
      age: `${patient.age}F`,
      bloodGroup: patient.blood,
      allergies: patient.allergies && patient.allergies.length ? patient.allergies : ['None recorded'],
      alerts: [patient.alert || 'No active clinical flags'],
    };
  };

  // Measures the combined height of the topbar + patient-context bar so the Clinical
  // Alert drawer can anchor below it precisely, even if the bar wraps to two lines on
  // a narrower viewport, instead of assuming a fixed pixel offset.
  const chromeRef = useRef(null);
  const [chromeHeight, setChromeHeight] = useState(112);
  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setChromeHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The full patient-context bar (allergy/risk chips, DOB, blood group) only earns its
  // space on screens actually scoped to one patient; elsewhere it collapses to one line.
  const PATIENT_SCOPED_PREFIXES = ['/doctor-dashboard/patients', '/doctor-dashboard/prescriptions', '/doctor-dashboard/telemedicine', '/doctor-dashboard/reports'];
  const isPatientScoped = PATIENT_SCOPED_PREFIXES.some(p => location.pathname.startsWith(p));

  const handleSearch = (val) => {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const q = val.toLowerCase();
    setSearchResults(patients.filter(p => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)));
  };

  // Active Patient context for 2-Identifier Banner — seeded from the real roster.
  const [activePatient, setActivePatient] = useState(() => toActivePatient(patients.find(p => p.name === 'Priya Sharma') || patients[0]));

  useEffect(() => {
    if (activePatient.name === 'No Patient Selected' && patients.length > 0) {
      setActivePatient(toActivePatient(patients[0]));
    }
  }, [patients, activePatient.name]);

  const [activePatientMenu, setActivePatientMenu] = useState(false);
  const [alertDrawerOpen, setAlertDrawerOpen]     = useState(false);

  // Clinical Alerts is reserved for values that need an immediate decision. Routine
  // pending labs (urgent: false) surface instead in the Pending Lab Reports card on the
  // dashboard, so a result isn't triaged in two unrelated places at once. Drawn from
  // each patient's own urgent lab reports and refill requests, so it can't reference
  // anyone outside the real roster.
  const urgentAlerts = patients.flatMap(p =>
    p.reports.filter(r => r.urgent).map(r => ({
      id: r.id,
      patient: p.name,
      test: r.testName,
      received: r.date,
      values: Object.entries(r.results).filter(([, v]) => v.status !== 'normal').map(([k, v]) => `${k}: ${v.value}`).join(', ') || 'See full report',
    }))
  );

  // Breadcrumb
  const crumbs = ['Doctor', ...location.pathname.split('/').filter(Boolean).slice(1)];

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden font-sans bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0 bg-aubergine-900 border-r border-aubergine-800">
        <SidebarContent user={user} onItemHover={setHoveredColor} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col shadow-2xl animate-slide-in bg-aubergine-900 border-r border-aubergine-800">
            <div className="absolute top-4 right-4">
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <SidebarContent user={user} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ModuleAccentBar color={hoveredColor || DEFAULT_ACCENT} className="rounded-none" />
        <div ref={chromeRef}>
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200/60 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/80 backdrop-blur-md shadow-sm z-40 relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-slate-500 hover:text-aubergine-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <i className="fas fa-chevron-right text-[9px]"></i>}
                  <span className={i === crumbs.length - 1 ? 'text-aubergine-700 font-bold capitalize' : 'capitalize'}>{c.replace('-', ' ')}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Patient Search */}
            <div className="relative hidden sm:block group">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-aubergine-500 transition-colors"></i>
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search patients by Name or MRN..."
                className="pl-11 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 rounded-full text-[13px] focus:bg-white focus:border-aubergine-400 focus:ring-4 focus:ring-aubergine-50 transition-all outline-none w-64 shadow-inner" />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => {
                      setActivePatient(toActivePatient(p));
                      trackRecent(p.name);
                      setSearch('');
                      setSearchResults([]);
                      toast(`Active chart switched to ${p.name}`, 'info');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-aubergine-50 flex items-center justify-between transition-colors">
                      <span className="font-bold text-slate-800"><i className="fas fa-user text-slate-500 text-xs mr-2"></i>{p.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Non-modal Clinical Alerts Toggle */}
            <button onClick={() => setAlertDrawerOpen(!alertDrawerOpen)}
              className={`relative px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border ${alertDrawerOpen ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
              <i className="fas fa-triangle-exclamation"></i>
              <span className="hidden sm:inline">Clinical Alerts</span>
              {urgentAlerts.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">{urgentAlerts.length}</span>
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:bg-aubergine-50 hover:text-aubergine-600 transition-colors flex items-center justify-center">
                <i className="fas fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="fixed inset-0 z-[90]" onClick={() => setNotifOpen(false)} />
              )}
              <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} onMarkAll={markAllRead} onMarkOne={markRead} />
            </div>

            {/* Doctor Avatar */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 cursor-pointer group" onClick={() => navigate('/doctor-dashboard/profile')}>
              <div className="w-8 h-8 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center font-black text-xs group-hover:bg-aubergine-200 transition-colors">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
              </div>
              <div className="hidden lg:block text-xs">
                <p className="font-bold text-slate-800 leading-tight">{user?.name || 'Dr. Mitchell'}</p>
                <p className="text-slate-500">{user?.specialty?.split(' ')[0] || 'Gynaecologist'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Persistent 2-Identifier Patient Header Bar (Clinical Safety).
            Full detail (allergy/risk chips) only on patient-scoped screens — elsewhere
            it collapses to one line so it stops outweighing the page's own content. */}
        <div className={`bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-900 text-white px-4 md:px-6 flex flex-wrap items-center justify-between gap-3 text-xs z-10 border-b border-aubergine-800/40 shadow-xs transition-all ${isPatientScoped ? 'py-2' : 'py-1.5'}`}>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-500/30 flex items-center gap-1">
              <i className="fas fa-lock text-[9px]"></i> Active Patient
            </span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-white text-sm tracking-wide font-medium">{activePatient.name}</span>
              <span className="text-aubergine-300 font-mono text-[11px]">[{activePatient.mrn}]</span>
              {isPatientScoped && (
                <>
                  <span className="text-slate-400">• DOB: {activePatient.dob} ({activePatient.age})</span>
                  <span className="text-slate-400">• Blood: {activePatient.bloodGroup}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPatientScoped && (
              <>
                {/* Allergy Flag */}
                <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-600/40 px-2.5 py-1 rounded-lg text-rose-300 font-medium">
                  <i className="fas fa-hand-dots text-rose-400"></i>
                  <span className="font-bold text-[11px]">Allergies:</span> {activePatient.allergies.join(', ')}
                </div>

                {/* Risk Flag */}
                <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/40 px-2.5 py-1 rounded-lg text-amber-300 font-medium hidden lg:flex">
                  <i className="fas fa-triangle-exclamation text-amber-400"></i>
                  <span className="font-bold text-[11px]">Clinical Flag:</span> {activePatient.alerts[0]}
                </div>
              </>
            )}

            {/* Quick Switch — recently opened charts; use the topbar search for anyone else */}
            <div className="relative">
              <button onClick={() => setActivePatientMenu(!activePatientMenu)} className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1.5 border border-white/20">
                <i className="fas fa-clock-rotate-left text-[10px]"></i> Recent
              </button>
              {activePatientMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Recently Opened Charts
                  </div>
                  {recentPatients.map(name => {
                    const p = patients.find(x => x.name === name);
                    if (!p) return null;
                    return (
                      <button key={name} onClick={() => {
                        setActivePatient(toActivePatient(p));
                        trackRecent(p.name);
                        setActivePatientMenu(false);
                        toast(`Switched active context to ${p.name}`, 'info');
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-aubergine-50 flex justify-between items-center transition-colors">
                        <span className="font-bold text-slate-700">{p.name}</span>
                        <span className="text-[10px] text-slate-500">Select</span>
                      </button>
                    );
                  })}
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
                    Looking for someone else? Use <span className="font-bold text-aubergine-700">Search</span> above.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Expandable Clinical Alert Drawer (Non-Modal for Zero Interruptive Context Switching) —
            urgent items only; routine pending labs live in the dashboard's own card. */}
        {alertDrawerOpen && (
          <div style={{ top: chromeHeight }} className="absolute right-0 bottom-0 w-full sm:w-96 max-w-full bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col animate-fade-in">
            <div className="p-4 bg-rose-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <i className="fas fa-triangle-exclamation text-rose-300"></i>
                <h3 className="font-bold text-sm">Urgent Clinical Alerts (CDSS)</h3>
              </div>
              <button onClick={() => setAlertDrawerOpen(false)} className="text-white/80 hover:text-white p-1">
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {urgentAlerts.map(lab => (
                <div key={lab.id} className="p-4 rounded-xl border transition-all bg-rose-50 border-rose-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 text-sm">{lab.patient}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{lab.received}</span>
                  </div>
                  <p className="text-xs font-bold text-rose-700">{lab.test}</p>
                  <p className="text-xs text-slate-600 mt-1 bg-white/70 p-2 rounded-lg border border-slate-200/60 font-mono">{lab.values}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => toast(`Contacting ${lab.patient} via secure SMS/Call...`, 'success')} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors">
                      <i className="fas fa-phone mr-1"></i> Contact Patient
                    </button>
                    <button onClick={() => toast(`Alert acknowledged for ${lab.patient}`, 'info')} className="px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-1.5 rounded-lg text-xs transition-colors">
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
              {urgentAlerts.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  <i className="fas fa-circle-check text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-xs font-medium">No urgent values right now.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Routine pending labs are in the dashboard's Lab Reports card.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {loadError && <DataErrorBanner message={loadError} onRetry={retryLoad} />}
          <PageTransition />
        </main>
      </div>

      {/* iOS/Android Styled Floating Frosted-Glass Mobile Bottom Dock for Doctors */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-50 pointer-events-none safe-area-pb">
        <div className="mobile-floating-dock pointer-events-auto rounded-3xl border border-white/60 px-2 py-1.5 flex items-center justify-around shadow-[0_12px_35px_rgba(42,22,71,0.18)]">
          {DOCTOR_BOTTOM_TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              onClick={() => triggerHaptic(tab.isFab ? 'medium' : 'light')}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center transition-all duration-200 ${
                  tab.isFab ? '-mt-5' : 'flex-1 py-1'
                } ${isActive ? 'text-aubergine-700 font-extrabold' : 'text-slate-500 font-medium'}`
              }
            >
              {({ isActive }) => (
                <>
                  {tab.isFab ? (
                    <div className="flex flex-col items-center group">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-aubergine-600 to-magenta-600 text-white flex items-center justify-center text-lg shadow-lg shadow-indigo-500/30 ring-4 ring-white transition-transform active:scale-90">
                        <i className={`fas ${tab.icon}`}></i>
                      </div>
                      <span className="text-[10px] font-black text-indigo-700 mt-1 tracking-tight">
                        {tab.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isActive ? 'bg-aubergine-100/90 text-aubergine-700 scale-105 shadow-2xs' : 'text-slate-500 active:scale-95'
                      }`}>
                        <i className={`fas ${tab.icon} text-sm`}></i>
                      </div>
                      <span className="text-[10px] tracking-tight leading-none mt-0.5">{tab.name}</span>
                      {isActive && (
                        <div className="w-1 h-1 rounded-full bg-aubergine-600 mt-0.5"></div>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <AiChatWidget context="doctor" />
    </div>
  );
}

export default DoctorLayout;

