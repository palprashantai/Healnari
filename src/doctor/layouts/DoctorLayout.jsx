import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { PageTransition } from '../../components/PageTransition.jsx';
import { NavHoverRail } from '../../components/NavHoverRail.jsx';
import { ModuleAccentBar } from '../../components/ModuleAccentBar.jsx';

const DEFAULT_ACCENT = '#6B46C1';

const NAV_ITEMS = [
  { name: 'Dashboard',        icon: 'fa-chart-pie',           path: '/doctor-dashboard',              end: true,  color: '#6B46C1' },
  { name: 'Analytics & Growth',icon: 'fa-chart-line',         path: '/doctor-dashboard/analytics',    end: false, color: '#f59e0b' },
  { name: 'Appointments',     icon: 'fa-calendar-check',      path: '/doctor-dashboard/appointments', end: false, color: '#10b981' },
  { name: 'Patients & EMR',   icon: 'fa-users',               path: '/doctor-dashboard/patients',     end: false, color: '#0ea5e9' },
  { name: 'Prescriptions',    icon: 'fa-file-prescription',   path: '/doctor-dashboard/prescriptions',end: false, color: '#f43f5e' },
  { name: 'Telemedicine',     icon: 'fa-video',               path: '/doctor-dashboard/telemedicine', end: false, color: '#6366f1' },
  { name: 'Communication Center',icon: 'fa-bullhorn',         path: '/doctor-dashboard/communications',end:false, color: '#ec4899' },
  { name: 'Lab & Reports',    icon: 'fa-flask',               path: '/doctor-dashboard/reports',      end: false, color: '#f59e0b' },
  { name: 'Billing',          icon: 'fa-file-invoice-dollar', path: '/doctor-dashboard/billing',      end: false, color: '#14b8a6' },
  { name: 'Staff Management', icon: 'fa-user-nurse',          path: '/doctor-dashboard/staff',        end: false, color: '#d946ef' },
  { name: 'My Profile',       icon: 'fa-circle-user',         path: '/doctor-dashboard/profile',      end: false, color: '#64748b' },
];

const NOTIFICATIONS = [
  { id: 1, icon: 'fa-flask',            color: 'text-amber-500', title: 'Lab Result Ready',        body: 'Priya Sharma — Thyroid Panel received.',          time: '10 min ago',  read: false },
  { id: 2, icon: 'fa-calendar-check',   color: 'text-sky-500',   title: 'New Booking Request',     body: 'Riya Patel has requested a video consult.',        time: '32 min ago',  read: false },
  { id: 3, icon: 'fa-pills',            color: 'text-rose-500',  title: 'Refill Request',          body: 'Kavita Patel needs Norethisterone 5mg refill.',    time: '1 hr ago',    read: false },
  { id: 4, icon: 'fa-video',            color: 'text-emerald-500',title: 'Call Starting Soon',     body: 'Video call with Anita Desai at 10:00 AM.',        time: '2 hr ago',    read: true  },
  { id: 5, icon: 'fa-indian-rupee-sign',color: 'text-aubergine-400',title: 'Payment Settled',     body: '₹799 settled for TXN-9821.',                       time: 'Yesterday',   read: true  },
];

/* ─── Notification Panel ─────────────────────── */
function NotificationPanel({ isOpen, onClose, notifications, setNotifications }) {
  const unread = notifications.filter(n => !n.read).length;

  const markAll = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markOne = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 animate-fade-in overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Notifications {unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{unread}</span>}</h3>
        {unread > 0 && <button onClick={markAll} className="text-xs text-aubergine-600 font-bold hover:underline">Mark all read</button>}
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {notifications.map(n => (
          <div key={n.id} onClick={() => markOne(n.id)} className={`px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-aubergine-50/30' : ''}`}>
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${!n.read ? 'bg-aubergine-100' : 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                <i className={`fas ${n.icon} text-xs ${n.color}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-xs font-bold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-aubergine-600 rounded-full flex-shrink-0 mt-0.5"></div>}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{n.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-slate-100">
        <button onClick={onClose} className="w-full text-xs text-center text-slate-400 hover:text-aubergine-600 font-medium transition-colors">Close</button>
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10 shrink-0">
        <NavLink to="/doctor-dashboard" className="flex items-center">
          <HealNariLogo showTagline={false} size="sm" variant="dark" />
        </NavLink>
        <span className="ml-auto text-[10px] bg-magenta-500 text-white px-2.5 py-0.5 rounded-full font-bold border border-magenta-400/30">Provider</span>
      </div>

      {/* Doctor Badge */}
      <div className="mx-4 mt-4 mb-1 py-2.5 px-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-aubergine-600 flex items-center justify-center text-white text-xs font-black shrink-0">
          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold leading-tight truncate">{user?.name || 'Dr. Sarah Mitchell'}</p>
          <p className="text-aubergine-300 text-[10px] truncate">{user?.specialty || 'Gynaecologist'}</p>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0 ml-auto" title="Online"></div>
      </div>

      {/* Nav */}
      <nav className="px-4 pt-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-2">Provider Portal</p>
        <NavHoverRail indicatorClassName="bg-white/5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.name} to={item.path} end={item.end} onClick={onClose}
              onMouseEnter={() => onItemHover?.(item.color)}
              onMouseLeave={() => onItemHover?.(null)}
              data-nav-item
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${isActive
                  ? 'bg-aubergine-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
                }`
              }>
              <div className="w-5 text-center transition-transform duration-200"><i className={`fas ${item.icon}`}></i></div>
              {item.name}
            </NavLink>
          ))}
        </NavHoverRail>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-white/40 hover:bg-rose-900/30 hover:text-rose-300 transition-all w-full">
          <div className="w-5 text-center"><i className="fas fa-right-from-bracket"></i></div>
          Sign Out
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

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hoveredColor, setHoveredColor]   = useState(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const ALL_PATIENTS = ['Priya Sharma', 'Anita Desai', 'Kavita Patel', 'Aisha Khan', 'Sunita Desai', 'Divya Menon'];

  // Deterministic per-patient MRN so the same patient always shows the same chart number
  const mrnFor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return `HN-${100000 + (hash % 900000)}`;
  };

  const handleSearch = (val) => {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearchResults(ALL_PATIENTS.filter(p => p.toLowerCase().includes(val.toLowerCase())));
  };

  // Active Patient context for 2-Identifier Banner
  const [activePatient, setActivePatient] = useState({
    name: 'Priya Sharma',
    dob: '14 May 1996',
    mrn: 'HN-882910',
    age: '28F',
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    alerts: ['Elevated TSH 5.2 mIU/L', 'Fasting Insulin 18 mIU/L']
  });

  const [activePatientMenu, setActivePatientMenu] = useState(false);
  const [alertDrawerOpen, setAlertDrawerOpen]     = useState(false);

  const URGENT_CLINICAL_ALERTS = [
    { id: 1, patient: 'Priya Sharma',  test: 'Full Thyroid Panel + CBC', received: '10 mins ago', urgent: true,  values: 'Hb: 7.2 g/dL (Low), Ferritin: 8 ng/mL (Low)' },
    { id: 2, patient: 'Meera Nair',    test: 'AMH + LH + FSH Profile',  received: '2 hrs ago',   urgent: false, values: 'LH/FSH ratio 2.8 (PCOS pattern)' },
    { id: 3, patient: 'Sunita Desai',  test: 'Fasting Insulin + HbA1c', received: 'Yesterday',   urgent: false, values: 'HbA1c: 6.1% (Prediabetes range)' },
  ];

  // Breadcrumb
  const crumbs = ['Doctor', ...location.pathname.split('/').filter(Boolean).slice(1)];

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0 bg-aubergine-900">
        <SidebarContent user={user} onItemHover={setHoveredColor} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col shadow-2xl animate-slide-in bg-aubergine-900">
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
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white shadow-xs z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-slate-500 hover:text-aubergine-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
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
            <div className="relative hidden sm:block">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search patients by Name or MRN..."
                className="pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-aubergine-300 focus:ring-2 focus:ring-aubergine-100 transition-all outline-none w-64" />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchResults.map(p => (
                    <button key={p} onClick={() => {
                      setActivePatient({ name: p, dob: '10 Feb 1994', mrn: mrnFor(p), age: '30F', bloodGroup: 'B+', allergies: ['Penicillin'], alerts: ['Review Lab Results'] });
                      setSearch('');
                      setSearchResults([]);
                      toast(`Active chart switched to ${p}`, 'info');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-aubergine-50 flex items-center justify-between transition-colors">
                      <span className="font-bold text-slate-800"><i className="fas fa-user text-slate-400 text-xs mr-2"></i>{p}</span>
                      <span className="text-xs text-slate-400 font-mono">{mrnFor(p)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Non-modal Clinical Alerts Toggle */}
            <button onClick={() => setAlertDrawerOpen(!alertDrawerOpen)}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border ${alertDrawerOpen ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
              <i className="fas fa-triangle-exclamation"></i>
              <span>Clinical Alerts</span>
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">{URGENT_CLINICAL_ALERTS.length}</span>
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
              <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} setNotifications={setNotifications} />
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

        {/* Persistent 2-Identifier Patient Header Bar (Clinical Safety) */}
        <div className="bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-900 text-white px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-10 border-b border-aubergine-800/40 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-500/30 flex items-center gap-1">
              <i className="fas fa-lock text-[9px]"></i> Active Patient Context
            </span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-white text-sm tracking-wide font-medium">{activePatient.name}</span>
              <span className="text-aubergine-300 font-mono text-[11px]">[{activePatient.mrn}]</span>
              <span className="text-slate-400">• DOB: {activePatient.dob} ({activePatient.age})</span>
              <span className="text-slate-400">• Blood: {activePatient.bloodGroup}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

            {/* Quick Switch */}
            <div className="relative">
              <button onClick={() => setActivePatientMenu(!activePatientMenu)} className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1.5 border border-white/20">
                <i className="fas fa-arrows-rotate text-[10px]"></i> Switch Patient
              </button>
              {activePatientMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Recent Patient Charts
                  </div>
                  {ALL_PATIENTS.map(p => (
                    <button key={p} onClick={() => {
                      setActivePatient({ name: p, dob: '22 Aug 1998', mrn: mrnFor(p), age: '26F', bloodGroup: 'A+', allergies: ['Sulfa Drugs'], alerts: ['Routine PCOS Review'] });
                      setActivePatientMenu(false);
                      toast(`Switched active context to ${p}`, 'info');
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-aubergine-50 flex justify-between items-center transition-colors">
                      <span className="font-bold text-slate-700">{p}</span>
                      <span className="text-[10px] text-slate-400">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Clinical Alert Drawer (Non-Modal for Zero Interruptive Context Switching) */}
        {alertDrawerOpen && (
          <div className="absolute right-0 top-28 bottom-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col animate-fade-in">
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
              {URGENT_CLINICAL_ALERTS.map(lab => (
                <div key={lab.id} className={`p-4 rounded-xl border transition-all ${lab.urgent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 text-sm">{lab.patient}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{lab.received}</span>
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
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-5">
          <PageTransition />
        </main>
      </div>
    </div>
  );
}

export default DoctorLayout;

