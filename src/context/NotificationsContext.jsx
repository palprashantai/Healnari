import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch, getTokens } from '../lib/apiClient.js';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

const NotificationsContext = createContext(null);

export function useNotifications() {
  return useContext(NotificationsContext);
}

/** Icon/colour presentation for each backend notification `type` — see
 * AppointmentsService.notifyStatusChange / callNext / CommunicationsService
 * on the vision backend for where these are emitted. */
export const NOTIFICATION_STYLE = {
  appointment_requested: { icon: 'fa-calendar-plus', color: 'text-amber-600 bg-amber-50' },
  appointment_approved:  { icon: 'fa-calendar-check', color: 'text-aubergine-600 bg-aubergine-50' },
  appointment_cancelled: { icon: 'fa-calendar-xmark', color: 'text-rose-600 bg-rose-50' },
  appointment_called:    { icon: 'fa-bell', color: 'text-emerald-600 bg-emerald-50' },
  broadcast:              { icon: 'fa-bullhorn', color: 'text-sky-600 bg-sky-50' },
};
export const DEFAULT_NOTIFICATION_STYLE = { icon: 'fa-bell', color: 'text-slate-600 bg-slate-100' };

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    apiFetch('/notifications').then(setNotifications).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getTokens()?.accessToken || null },
    });
    socketRef.current = socket;

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      toast(notif.title, notif.type === 'appointment_cancelled' ? 'warning' : 'success');
    });

    return () => socket.disconnect();
  }, [user]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
    } catch { /* local state already optimistically updated */ }
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
    } catch { /* local state already optimistically updated */ }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = { notifications, unreadCount, markAllRead, markRead };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
