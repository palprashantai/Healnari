const API_URL = import.meta.env.VITE_API_URL || '/api';
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
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

async function refreshTokens() {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;

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
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }
  return payload?.data;
}
