import { saveTokensToIndexedDb, clearTokensFromIndexedDb } from './tokenStore.js';

export const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'healnari_tokens';

export function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function setTokens(tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  // Best-effort mirror into IndexedDB, which (unlike localStorage) the
  // service worker can read — needed so the OS push notification's
  // "Decline" action can call decline-call directly without an app tab open.
  saveTokensToIndexedDb(tokens);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('healnari_user');
  clearTokensFromIndexedDb();

  // Women's Health & EHR Data Isolation: purge any health logs, drafts, and user preferences on logout
  const sensitivePrefixes = ['meds_taken_', 'kicks_', 'telemed_draft_', 'healnari_', 'pregnancy_', 'doctor_quick_notes', 'patient_life_mode'];
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (sensitivePrefixes.some(p => key.startsWith(p)) && key !== 'healnari_cookie_consent' && key !== 'healnari_ios_prompt_dismissed')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// Supabase refresh tokens are single-use/rotating. AuthContext, ClinicDataContext,
// NotificationsContext and various page-level fetches each make their own
// apiFetch() calls independently — if the access token has expired (e.g. the
// app was closed for a while), several of them hit 401 at nearly the same
// moment and would each try to refresh with the SAME (still-old) refresh
// token. Only the first actually succeeds; the rest get rejected as reusing
// an already-rotated token and call clearTokens(), wiping out the good pair
// the winner just stored — forcing a spurious logout. Sharing one in-flight
// promise across all callers means only one network call to /auth/refresh
// ever happens per expiry, and every caller gets the same result.
let refreshPromise = null;

async function refreshTokens() {
  if (refreshPromise) return refreshPromise;

  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const body = await res.json();
      setTokens(body.data);
      return body.data;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Thin fetch wrapper for the vision NestJS API. Attaches the stored access
 * token, retries once through a silent refresh on 401, and unwraps vision's
 * `{ success, data, message }` response envelope.
 */
export async function apiFetch(path, { method = 'GET', body, skipAuth = false, retry = true } = {}) {
  const tokens = getTokens();
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (!skipAuth && tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && !skipAuth && retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiFetch(path, { method, body, skipAuth, retry: false });
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || (payload && payload.success === false)) {
    const err = new Error(payload?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  // Paginated endpoints (ResponseHelper.paginated) carry a sibling
  // `pagination` object alongside `data` — surface both instead of
  // silently dropping page/total info that callers need to page through.
  return payload?.pagination ? { data: payload.data, pagination: payload.pagination } : payload?.data;
}
