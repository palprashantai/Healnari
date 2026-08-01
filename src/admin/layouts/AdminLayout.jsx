import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';

const NAV_ITEMS = [
  { name: 'Dashboard',          icon: 'fa-chart-line',        path: '/admin-dashboard',              end: true },
  { name: 'User Management',    icon: 'fa-users-gear',        path: '/admin-dashboard/users',        end: false },
  { name: 'Doctor Verification',icon: 'fa-user-check',        path: '/admin-dashboard/verification', end: false },
  { name: 'Clinic Management',  icon: 'fa-hospital',          path: '/admin-dashboard/clinics',      end: false },
  { name: 'Revenue & Payouts',  icon: 'fa-indian-rupee-sign', path: '/admin-dashboard/revenue',      end: false },
  { name: 'CMS & Content',      icon: 'fa-pen-to-square',     path: '/admin-dashboard/cms',          end: false },
  { name: 'Reports',            icon: 'fa-file-contract',     path: '/admin-dashboard/reports',      end: false },
];

const NOTIFICATIONS = [
  { id: 1, icon: 'fa-user-doctor',  color: 'text-amber-500', title: 'New Doctor Verification', body: 'Dr. Riya Sen has submitted profile for review.', time: '5 mins ago',  read: false },
  { id: 2, icon: 'fa-indian-rupee-sign', color: 'text-emerald-500', title: 'Payout Request',    body: 'Dr. Sarah Mitchell requested payout of ₹5,600.', time: '1 hour ago',  read: false },
  { id: 3, icon: 'fa-triangle-exclamation', color: 'text-rose-500', title: 'High API Usage',   body: 'SMS gateway limit approaching 90%.',              time: '2 hours ago', read: true  },
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
        <h3 className="font-bold text-slate-800 text-sm">Alerts {unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{unread}</span>}</h3>
        {unread > 0 && <button onClick={markAll} className="text-xs text-aubergine-600 font-bold hover:underline">Mark all read</button>}
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {notifications.map(n => (
          <div key={n.id} onClick={() => markOne(n.id)} className={`px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-amber-50/30' : ''}`}>
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${!n.read ? 'bg-amber-100' : 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                <i className={`fas ${n.icon} text-xs ${n.color}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-xs font-bold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-0.5"></div>}
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
    toast('Admin session ended.', 'info');
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md border border-white/10">
          <i className="fas fa-shield-halved text-white text-sm"></i>
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-display ml-2">
          Fem<span className="text-slate-400">Care</span>
        </span>
        <span className="ml-auto text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Admin</span>
      </div>

      {/* Admin Badge */}
      <div className="mx-4 mt-4 mb-1 py-2.5 px-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white text-xs font-black shrink-0">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold leading-tight truncate">{user?.name || 'System Admin'}</p>
          <p className="text-slate-400 text-[10px] truncate">{user?.accessLevel || 'Super Admin'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-4 pt-3 flex-1 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Control Panel</p>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.name} to={item.path} end={item.end} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${isActive
                ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 transition-all w-full border border-transparent hover:border-rose-900">
          <div className="w-5 text-center"><i className="fas fa-right-from-bracket"></i></div>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ─── Main Layout ────────────────────────────── */
function AdminLayout() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const toast     = useToast();

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Breadcrumb
  const crumbs = ['Admin', ...location.pathname.split('/').filter(Boolean).slice(1)];

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0 bg-slate-900">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col shadow-2xl animate-slide-in bg-slate-900">
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
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <i className="fas fa-chevron-right text-[9px]"></i>}
                  <span className={i === crumbs.length - 1 ? 'text-slate-800 font-bold capitalize' : 'capitalize'}>{c.replace('-', ' ')}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center justify-center">
                <i className="fas fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} setNotifications={setNotifications} />
            </div>

            {/* Admin Avatar */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-xs">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden lg:block text-xs">
                <p className="font-bold text-slate-800 leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-slate-500">{user?.accessLevel || 'System'}</p>
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

export default AdminLayout;
