import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';

const NAV_ITEMS = [
  { name: 'Dashboard',        icon: 'fa-chart-pie',           path: '/doctor-dashboard',              end: true },
  { name: 'Appointments',     icon: 'fa-calendar-check',      path: '/doctor-dashboard/appointments', end: false },
  { name: 'Patients & EMR',   icon: 'fa-users',               path: '/doctor-dashboard/patients',     end: false },
  { name: 'Prescriptions',    icon: 'fa-file-prescription',   path: '/doctor-dashboard/prescriptions',end: false },
  { name: 'Telemedicine',     icon: 'fa-video',               path: '/doctor-dashboard/telemedicine', end: false },
  { name: 'Lab & Reports',    icon: 'fa-flask',               path: '/doctor-dashboard/reports',      end: false },
  { name: 'Billing',          icon: 'fa-file-invoice-dollar', path: '/doctor-dashboard/billing',      end: false },
  { name: 'Staff Management', icon: 'fa-user-nurse',          path: '/doctor-dashboard/staff',        end: false },
  { name: 'My Profile',       icon: 'fa-circle-user',         path: '/doctor-dashboard/profile',      end: false },
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
function SidebarContent({ user, onClose }) {
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
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-aubergine-600 to-aubergine-400 flex items-center justify-center shadow-md">
          <i className="fas fa-stethoscope text-white text-sm"></i>
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-display ml-2">
          Fem<span className="text-aubergine-200">Care</span>
        </span>
        <span className="ml-auto text-[10px] bg-aubergine-600/60 text-aubergine-200 px-2 py-0.5 rounded-full font-bold border border-aubergine-500/30">Provider</span>
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
      <nav className="px-4 pt-3 flex-1 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-2">Provider Portal</p>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.name} to={item.path} end={item.end} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${isActive
                ? 'bg-aubergine-600 text-white shadow-sm'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }>
            <div className="w-5 text-center"><i className={`fas ${item.icon}`}></i></div>
            {item.name}
          </NavLink>
        ))}
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const ALL_PATIENTS = ['Priya Sharma', 'Anita Desai', 'Kavita Patel', 'Aisha Khan', 'Sunita Desai', 'Divya Menon'];

  const handleSearch = (val) => {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearchResults(ALL_PATIENTS.filter(p => p.toLowerCase().includes(val.toLowerCase())));
  };

  // Breadcrumb
  const crumbs = ['Doctor', ...location.pathname.split('/').filter(Boolean).slice(1)];

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0" style={{ backgroundColor: '#1a0d16' }}>
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col shadow-2xl animate-slide-in" style={{ backgroundColor: '#1a0d16' }}>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white">
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
                placeholder="Search patients..."
                className="pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-aubergine-300 focus:ring-2 focus:ring-aubergine-100 transition-all outline-none w-52" />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchResults.map(p => (
                    <button key={p} onClick={() => { navigate('/doctor-dashboard/patients'); setSearch(''); setSearchResults([]); toast(`Opening EMR for ${p}...`, 'info'); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-aubergine-50 flex items-center gap-2 transition-colors">
                      <i className="fas fa-user text-slate-400 text-xs w-4"></i> {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8" key={location.pathname}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DoctorLayout;
