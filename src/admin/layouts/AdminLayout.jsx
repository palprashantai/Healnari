import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications, NOTIFICATION_STYLE, DEFAULT_NOTIFICATION_STYLE } from '../../context/NotificationsContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { PageTransition } from '../../components/PageTransition.jsx';
import { NavHoverRail } from '../../components/NavHoverRail.jsx';
import { ModuleAccentBar } from '../../components/ModuleAccentBar.jsx';
import { AdminScopeProvider } from '../../context/AdminScopeContext.jsx';
import { FacilityScopeSelector } from '../components/FacilityScopeSelector.jsx';

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

const DEFAULT_ACCENT = '#6B46C1';

const NAV_CATEGORIES = [
  {
    title: 'Core & Analytics',
    items: [
      { name: 'Dashboard',          icon: 'fa-chart-pie',         path: '/admin-dashboard',              end: true,  color: '#6B46C1' },
      { name: 'AI Product Control', icon: 'fa-wand-magic-sparkles',path:'/admin-dashboard/ai',           end: false, color: '#a855f7' },
      { name: 'Analytics & Growth', icon: 'fa-chart-line',        path: '/admin-dashboard/analytics',    end: false, color: '#f59e0b' },
      { name: 'Revenue & Payouts',  icon: 'fa-money-bill-transfer',path:'/admin-dashboard/revenue',      end: false, color: '#ef4444' },
      { name: 'Reports',            icon: 'fa-file-contract',     path: '/admin-dashboard/reports',      end: false, color: '#6366f1' },
    ]
  },
  {
    title: 'User Management',
    items: [
      { name: 'Doctor Management',  icon: 'fa-user-doctor',       path: '/admin-dashboard/doctors',      end: false, color: '#8b5cf6' },
      { name: 'Doctor Verification',icon: 'fa-user-check',        path: '/admin-dashboard/verification', end: false, color: '#10b981' },
      { name: 'Patient Management', icon: 'fa-users-gear',        path: '/admin-dashboard/users',        end: false, color: '#0ea5e9' },
    ]
  },
  {
    title: 'Platform config',
    items: [
      { name: 'Landing Page',       icon: 'fa-globe',             path: '/admin-dashboard/landing',      end: false, color: '#06b6d4' },
      { name: 'CMS & Content',      icon: 'fa-pen-to-square',     path: '/admin-dashboard/cms',          end: false, color: '#d946ef' },
      { name: 'Specialty Manager',  icon: 'fa-stethoscope',       path: '/admin-dashboard/specialties',  end: false, color: '#10b981' },
    ]
  },
  {
    title: 'Marketing & Ops',
    items: [
      { name: 'Communication',      icon: 'fa-bullhorn',          path: '/admin-dashboard/communications',end:false, color: '#f43f5e' },
      { name: 'Message Templates',  icon: 'fa-pager',             path: '/admin-dashboard/templates',    end: false, color: '#fb923c' },
      { name: 'Leads',              icon: 'fa-address-book',      path: '/admin-dashboard/leads',        end: false, color: '#14b8a6' },
    ]
  },
  {
    title: 'System & Security',
    items: [
      { name: 'Audit Logs (HIPAA)', icon: 'fa-shield-halved',     path: '/admin-dashboard/audit-logs',   end: false, color: '#0ea5e9' },
      { name: 'Cron & Automations', icon: 'fa-clock-rotate-left', path: '/admin-dashboard/crons',        end: false, color: '#10b981' },
    ]
  }
];

/* ─── Notification Panel ─────────────────────── */
// AUDIT_REPORT.md FE-6 — this used to be 3 hardcoded fake alerts (including
// a fabricated "Dr. Sarah Mitchell requested payout of ₹5,600"), never
// backed by anything real. Now reads the same real notifications feed
// (NotificationsContext) every other role's layout uses.
function NotificationPanel({ isOpen, onClose, notifications, onMarkAllRead, onMarkRead, hasMore, loadMore }) {
  const unread = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 animate-fade-in overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Alerts {unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1">{unread}</span>}</h3>
        {unread > 0 && <button onClick={onMarkAllRead} className="text-xs text-aubergine-600 font-bold hover:underline">Mark all read</button>}
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">You're all caught up.</p>
        )}
        {notifications.map(n => {
          const style = NOTIFICATION_STYLE[n.type] || DEFAULT_NOTIFICATION_STYLE;
          return (
            <div key={n.id} onClick={() => !n.read && onMarkRead(n.id)} className={`px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-amber-50/30' : ''}`}>
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.color}`}>
                  <i className={`fas ${style.icon} text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-xs font-bold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-0.5"></div>}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="px-5 py-3 text-center border-t border-slate-50">
            <button onClick={loadMore} className="text-xs text-aubergine-600 font-bold hover:underline">
              Load Older Notifications
            </button>
          </div>
        )}
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
    toast('Admin session ended.', 'info');
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-md border border-white/10">
          <img src="/brand/logo-icon.jpg" alt="HealNari" className="w-full h-full object-cover" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-white font-sans ml-2">
          Heal<span className="text-slate-400">Nari</span>
        </span>
        <span className="ml-auto text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-semibold uppercase shadow-sm">Admin</span>
      </div>

      {/* Admin Badge */}
      <div className="mx-4 mt-4 mb-1 py-2.5 px-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold leading-tight truncate">{user?.name || 'System Admin'}</p>
          <p className="text-slate-400 text-xs truncate">{user?.accessLevel || 'Super Admin'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-2 flex-1 overflow-y-auto hide-scrollbar">
        <NavHoverRail indicatorClassName="bg-aubergine-800/40 rounded-xl">
          {NAV_CATEGORIES.map((category, catIdx) => (
            <details key={category.title} className={`group/nav-cat ${catIdx > 0 ? "mt-4" : ""}`} open>
              <summary className="text-xs font-semibold text-aubergine-300/70 uppercase tracking-wider mb-1.5 px-3 cursor-pointer list-none flex items-center justify-between hover:text-white transition-colors select-none">
                {category.title}
                <i className="fas fa-chevron-down text-[9px] transition-transform group-open/nav-cat:-rotate-180"></i>
              </summary>
              <div className="space-y-0.5">
                {category.items.map(item => (
                  <NavLink key={item.name} to={item.path} end={item.end} onClick={onClose}
                    onMouseEnter={() => onItemHover?.(item.color)}
                    onMouseLeave={() => onItemHover?.(null)}
                    data-nav-item
                    className={({ isActive }) =>
                      `group flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-aubergine-600/90 to-aubergine-700/50 text-white shadow-md shadow-aubergine-900/40 border border-aubergine-500/30'
                          : 'text-aubergine-200/70 hover:text-white border border-transparent'
                      }`
                    }>
                    {({ isActive }) => (
                      <>
                        <div className={`w-5 flex justify-center items-center transition-all duration-300 ${isActive ? 'text-white drop-shadow-md scale-110' : 'text-aubergine-300/70 group-hover:text-white group-hover:scale-110'}`}>
                          <i className={`fas ${item.icon} text-[15px]`}></i>
                        </div>
                        <span className="flex-1 truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </details>
          ))}
        </NavHoverRail>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 transition-all w-full border border-transparent hover:border-rose-900">
          <div className="w-5 text-center"><i className="fas fa-right-from-bracket"></i></div>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ─── Main Layout ────────────────────────────── */
function AdminLayoutInner() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const toast     = useToast();
  const { notifications, unreadCount, markAllRead: markAllReadRemote, markRead, hasMore, loadMore } = useNotifications();

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [hoveredColor, setHoveredColor]   = useState(null);
  const [dynamicCrumbs, setDynamicCrumbs] = useState({});

  React.useEffect(() => {
    const handler = (e) => setDynamicCrumbs(prev => ({...prev, [e.detail.id]: e.detail.label}));
    window.addEventListener('set-breadcrumb', handler);
    return () => window.removeEventListener('set-breadcrumb', handler);
  }, []);

  const markAllRead = () => {
    markAllReadRemote();
    toast('All notifications marked as read.', 'success');
  };

  // Breadcrumb
  const crumbs = ['Admin', ...location.pathname.split('/').filter(Boolean).slice(1)];

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0 bg-aubergine-900">
        <SidebarContent user={user} onItemHover={setHoveredColor} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-aubergine-900/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ModuleAccentBar color={hoveredColor || DEFAULT_ACCENT} className="rounded-none" />
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                let label = dynamicCrumbs[c] || c;
                // If it's a UUID and we don't have a dynamic name yet, truncate it or hide it nicely
                if (!dynamicCrumbs[c] && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(c)) {
                  label = 'Detail';
                } else if (label === c) {
                  label = label.replace('-', ' ');
                }
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <i className="fas fa-chevron-right text-[9px]"></i>}
                    <span className={isLast ? 'text-slate-800 font-bold capitalize' : 'capitalize truncate max-w-[200px]'} title={dynamicCrumbs[c] || c}>{label}</span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Multi-Facility & Practice Scope Switcher */}
            <FacilityScopeSelector />

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center justify-center">
                <i className="fas fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-semibold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} onMarkAllRead={markAllRead} onMarkRead={markRead} hasMore={hasMore} loadMore={loadMore} />
            </div>

            {/* Admin Avatar */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden lg:block text-xs">
                <p className="font-semibold text-slate-800 leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-slate-400">{user?.accessLevel || 'System'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 md:p-8">
          <div className="max-w-[1700px] mx-auto w-full min-w-0">
            <PageTransition />
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminLayout() {
  return (
    <AdminScopeProvider>
      <AdminLayoutInner />
    </AdminScopeProvider>
  );
}

export default AdminLayout;
