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
  appointment_delayed:   { icon: 'fa-clock', color: 'text-amber-600 bg-amber-50' },
  broadcast:              { icon: 'fa-bullhorn', color: 'text-sky-600 bg-sky-50' },
  payment_success:        { icon: 'fa-circle-check', color: 'text-emerald-600 bg-emerald-50' },
  payment_received:       { icon: 'fa-hand-holding-dollar', color: 'text-emerald-600 bg-emerald-50' },
  refund_processed:       { icon: 'fa-rotate-left', color: 'text-sky-600 bg-sky-50' },
};
export const DEFAULT_NOTIFICATION_STYLE = { icon: 'fa-bell', color: 'text-slate-600 bg-slate-100' };

// Cross-tab sync: accepting/declining a ringing call in one tab must silence
// it in every other open tab for the same login (same browser, same user).
const CALL_CHANNEL_NAME = 'healnari-call';

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null); // { appointmentId, title, message } | null
  // Set whenever a `call_cancelled' arrives, independent of `incomingCall` —
  // this is what an *active* call screen (the caller, still waiting for the
  // other side to pick up) watches to hang itself up when declined, not just
  // the ring screen.
  const [callDeclinedId, setCallDeclinedId] = useState(null);
  const socketRef = useRef(null);
  const callChannelRef = useRef(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await apiFetch(`/notifications?page=${pageNum}&limit=20`);
      const newItems = res.items || [];
      if (append) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          return [...prev, ...newItems.filter(n => !existingIds.has(n.id))];
        });
      } else {
        setNotifications(newItems);
      }
      setHasMore(pageNum < (res.totalPages || 0));
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications(1);
  }, [user, fetchNotifications]);

  const loadMore = useCallback(() => {
    if (hasMore) {
      fetchNotifications(page + 1, true);
    }
  }, [hasMore, page, fetchNotifications]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(CALL_CHANNEL_NAME);
    callChannelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === 'clear') {
        setIncomingCall(prev => (prev?.appointmentId === event.data.appointmentId ? null : prev));
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getTokens()?.accessToken || null },
    });
    socketRef.current = socket;

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);

      const appointmentId = notif.data?.appointmentId;
      if (notif.type === 'appointment_called' && appointmentId) {
        setIncomingCall(prev => (prev?.appointmentId === appointmentId ? prev : {
          appointmentId,
          title: notif.title,
          message: notif.message,
          avatarUrl: notif.data?.callerAvatarUrl || null,
        }));
        return; // ring screen covers this — skip the toast, it'd just be noise underneath it
      }
      if (notif.type === 'call_cancelled' && appointmentId) {
        setIncomingCall(prev => (prev?.appointmentId === appointmentId ? null : prev));
        setCallDeclinedId(appointmentId);
      }

      const isNegative = notif.type === 'appointment_cancelled' || notif.type === 'call_cancelled';
      toast(notif.title, isNegative ? 'warning' : 'success');
    });

    return () => socket.disconnect();
  }, [user]);

  const clearIncomingCall = useCallback((appointmentId) => {
    setIncomingCall(null);
    callChannelRef.current?.postMessage({ type: 'clear', appointmentId });
  }, []);

  const acceptCall = useCallback((appointmentId) => {
    clearIncomingCall(appointmentId);
  }, [clearIncomingCall]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    const { appointmentId } = incomingCall;
    clearIncomingCall(appointmentId);
    // Tell the backend so it can ring off the caller's side too — otherwise
    // they're left staring at a "ringing…" screen that never resolves.
    apiFetch(`/appointments/${appointmentId}/decline-call`, { method: 'POST' }).catch(() => {});
  }, [incomingCall, clearIncomingCall]);

  const clearCallDeclined = useCallback(() => setCallDeclinedId(null), []);

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

  const value = { notifications, unreadCount, markAllRead, markRead, incomingCall, acceptCall, declineCall, callDeclinedId, clearCallDeclined, loadMore, hasMore };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
