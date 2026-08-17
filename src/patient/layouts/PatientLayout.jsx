import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useNotifications, NOTIFICATION_STYLE, DEFAULT_NOTIFICATION_STYLE } from '../../context/NotificationsContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { PageTransition } from '../../components/PageTransition.jsx';
import { DataErrorBanner } from '../../components/DataErrorBanner.jsx';
import { NavHoverRail } from '../../components/NavHoverRail.jsx';
import { ModuleAccentBar } from '../../components/ModuleAccentBar.jsx';
import AiChatWidget from '../../tools/AiChatWidget.jsx';

const DEFAULT_ACCENT = '#6B46C1';

const MENU_ITEMS = [
  { name: 'Dashboard',          icon: 'fa-house',          path: '/patient-dashboard',              color: '#6B46C1' },
  { name: 'Find a Doctor',      icon: 'fa-user-doctor',    path: '/patient-dashboard/find-doctor',   color: '#0ea5e9' },
  { name: 'My Appointments',    icon: 'fa-calendar-check', path: '/patient-dashboard/appointments',  color: '#10b981' },
  { name: 'Medical Records',    icon: 'fa-file-medical',   path: '/patient-dashboard/records',       color: '#f59e0b' },
  { name: 'Prescriptions',      icon: 'fa-pills',          path: '/patient-dashboard/prescriptions', color: '#f43f5e' },
  { name: 'Health Tracking',    icon: 'fa-heart-pulse',    path: '/patient-dashboard/tracking',      color: '#6366f1' },
  { name: 'Fertility Insights', icon: 'fa-circle-dot',     path: '/patient-dashboard/fertility',     color: '#e11d48' },
  { name: 'Partner & Support',  icon: 'fa-users',          path: '/patient-dashboard/family',        color: '#d946ef' },
  { name: 'Billing & Payments', icon: 'fa-credit-card',    path: '/patient-dashboard/billing',       color: '#14b8a6' },
  { name: 'My Profile',         icon: 'fa-circle-user',    path: '/patient-dashboard/profile',       color: '#64748b' },
];

// Bottom 5 tabs shown on mobile
const BOTTOM_TABS = [
  { name: 'Home',         icon: 'fa-house',          path: '/patient-dashboard' },
  { name: 'Appointments', icon: 'fa-calendar-check', path: '/patient-dashboard/appointments' },
  { name: 'Records',      icon: 'fa-file-medical',   path: '/patient-dashboard/records' },
  { name: 'Tracking',     icon: 'fa-heart-pulse',    path: '/patient-dashboard/tracking' },
  { name: 'Profile',      icon: 'fa-circle-user',    path: '/patient-dashboard/profile' },
];

/** "2 hours ago" style relative timestamp for a notification's created_at. */
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function Sidebar({ onClose, onItemHover }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  const toggleDiscreet = () => {
    const next = !discreet;
    localStorage.setItem('discreet_mode', next ? 'true' : 'false');
    window.dispatchEvent(new Event('discreet_mode_changed'));
    toast(next ? 'Discreet mode enabled.' : 'Discreet mode disabled.', 'info');
  };

  const handleLogout = () => {
    logout();
    toast('Signed out. See you soon!', 'info');
    navigate('/');
  };

  return (
    <div className="w-full h-full flex flex-col bg-aubergine-900">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10 shrink-0 justify-between">
        <NavLink to="/patient-dashboard" className="flex items-center">
          <HealNariLogo showTagline={false} size="sm" variant="dark" />
        </NavLink>
        {onClose && (
          <button onClick={onClose} className="text-aubergine-300 hover:text-white md:hidden ml-2">
            <i className="fas fa-xmark text-lg"></i>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="p-3 flex-1 overflow-y-auto hide-scrollbar">
        <div className="text-[11px] font-bold text-aubergine-300/60 uppercase tracking-widest mb-3 px-3">Patient Portal</div>
        <NavHoverRail indicatorClassName="bg-aubergine-800/40 rounded-xl">
          {MENU_ITEMS.map(item => (
            <NavLink key={item.name} to={item.path} end={item.path === '/patient-dashboard'}
              onClick={onClose}
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-aubergine-700/40 shrink-0 space-y-2">
        {/* Discreet mode */}
        <button onClick={toggleDiscreet}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all w-full ${discreet ? 'bg-aubergine-600/50 text-white' : 'text-aubergine-100/60 hover:bg-aubergine-700/40 hover:text-white'}`}>
          <div className="w-5 text-center"><i className={`fas ${discreet ? 'fa-eye-slash' : 'fa-eye'}`}></i></div>
          {discreet ? 'Discreet: ON' : 'Discreet Mode'}
        </button>

        {/* Privacy badges */}
        <div className="bg-aubergine-900/40 p-2.5 rounded-xl border border-aubergine-700/30">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-aubergine-200/70 uppercase tracking-wide">
            <i className="fas fa-shield-halved text-sage-400"></i> DPDP Act, 2023 Compliant
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-aubergine-200/70 uppercase tracking-wide mt-1">
            <i className="fas fa-lock text-sage-400"></i> Private, Doctor-Only Access
          </div>
        </div>

        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-aubergine-200/70 hover:bg-red-900/30 hover:text-red-300 transition-all w-full">
          <div className="w-5 text-center"><i className="fas fa-sign-out-alt"></i></div>
          Logout
        </button>
      </div>
    </div>
  );
}

        {/* Notification panel: constrained width on mobile */}
function NotificationsPanel({ notifications, onMarkAllRead, onMarkRead, onClose, panelRef }) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-[20rem] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
      style={{ animation: 'slideUp 0.2s ease-out' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          Notifications
          {unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAllRead} className="text-xs text-aubergine-600 font-bold hover:underline">Mark all read</button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-600 ml-1"><i className="fas fa-xmark"></i></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">You're all caught up.</p>
        )}
        {notifications.map(n => {
          const style = NOTIFICATION_STYLE[n.type] || DEFAULT_NOTIFICATION_STYLE;
          return (
            <div key={n.id} onClick={() => !n.read && onMarkRead(n.id)}
              className={`flex gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-aubergine-50/30' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${style.color}`}>
                <i className={`fas ${style.icon}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold text-slate-800 ${!n.read ? '' : 'text-slate-600'}`}>{n.title}</p>
                <p className="text-xs text-slate-500 truncate">{n.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 bg-aubergine-500 rounded-full mt-2 flex-shrink-0"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { notifications, unreadCount, markAllRead: markAllReadRemote, markRead } = useNotifications();
  const { loadError, retryLoad } = useClinicData();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hoveredColor, setHoveredColor] = useState(null);
  const notifRef = useRef(null);
  const notifBtnRef = useRef(null);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target) && !notifBtnRef.current?.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);

  const markAllRead = () => {
    markAllReadRemote();
    toast('All notifications marked as read.', 'success');
  };

  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');
  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: 'var(--color-surface-page)' }}>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)}></div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-60 hidden md:flex flex-col flex-shrink-0">
        <Sidebar onItemHover={setHoveredColor} />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed left-0 top-0 h-full w-60 z-50 flex flex-col flex-shrink-0 transition-transform duration-300 md:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModuleAccentBar color={hoveredColor || DEFAULT_ACCENT} className="rounded-none" />
        {/* Topbar */}
        <header className="h-16 border-b border-sand-200 flex items-center justify-between px-4 md:px-6 shrink-0" style={{ backgroundColor: 'var(--color-surface-page)' }}>
          {/* Mobile hamburger */}
          <button className="md:hidden text-aubergine-600 hover:text-aubergine-800 mr-3" onClick={() => setMobileSidebarOpen(true)}>
            <i className="fas fa-bars text-xl"></i>
          </button>

          {/* Page breadcrumb (desktop) */}
          <div className="hidden md:flex items-center text-sm text-slate-500">
            <span className="text-aubergine-700 font-bold">Patient Portal</span>
            {location.pathname !== '/patient-dashboard' && (
              <>
                <i className="fas fa-chevron-right text-[10px] mx-2 text-slate-300"></i>
                <span className="text-slate-600 font-semibold capitalize">
                  {location.pathname.split('/').pop().replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {/* Discreet mode (desktop only) */}
            <button
              onClick={() => {
                const next = !discreet;
                localStorage.setItem('discreet_mode', next ? 'true' : 'false');
                window.dispatchEvent(new Event('discreet_mode_changed'));
                toast(next ? 'Discreet mode on.' : 'Discreet mode off.', 'info');
              }}
              className={`hidden md:flex w-9 h-9 rounded-full transition-all items-center justify-center border text-sm ${discreet ? 'bg-aubergine-100 border-aubergine-200 text-aubergine-700' : 'bg-sand-100 border-sand-200 text-sand-600 hover:bg-aubergine-50 hover:border-aubergine-100 hover:text-aubergine-600'}`}
              title={discreet ? 'Disable Discreet Mode' : 'Enable Discreet Mode'}>
              <i className={`fas ${discreet ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button ref={notifBtnRef}
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-full bg-sand-100 border border-sand-200 text-sand-600 hover:bg-aubergine-50 hover:text-aubergine-600 transition-colors flex items-center justify-center">
                <i className="fas fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full border-2 border-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotificationsPanel
                  notifications={notifications}
                  onMarkAllRead={markAllRead}
                  onMarkRead={markRead}
                  onClose={() => setNotifOpen(false)}
                  panelRef={notifRef}
                />
              )}
            </div>

            {/* Profile */}
            <div
              className="flex items-center gap-2 md:gap-3 border-l border-sand-200 pl-2 md:pl-4 cursor-pointer group"
              onClick={() => navigate('/patient-dashboard/profile')}>
              <div className="w-8 h-8 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center font-bold text-xs group-hover:bg-aubergine-200 transition-colors">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2) || 'PS'}
              </div>
              <div className="hidden lg:block text-xs">
                <p className="font-bold text-slate-800 leading-tight">{user?.name || 'Priya Sharma'}</p>
                <p className="text-sand-600">Care Member</p>
              </div>
              <i className="fas fa-chevron-down text-[10px] text-slate-500 hidden lg:block"></i>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 transition-all duration-100 ${discreet ? 'discreet-blur' : ''}`}>
          {loadError && <DataErrorBanner message={loadError} onRetry={retryLoad} />}
          <PageTransition />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {BOTTOM_TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/patient-dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 w-full h-full text-center transition-all ${
                  isActive ? 'text-aubergine-700' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-aubergine-100' : ''
                  }`}>
                    <i className={`fas ${tab.icon} text-base`}></i>
                  </div>
                  <span className="text-[10px] font-bold leading-none">{tab.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <AiChatWidget context="patient" />
    </div>
  );
}

export default PatientLayout;
