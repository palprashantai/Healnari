// Mirrors the access/refresh token pair into IndexedDB alongside
// localStorage (see apiClient.js). The service worker can't read
// localStorage at all, but it CAN read IndexedDB — this is what lets a tap
// on the OS push notification's "Decline" action call the backend directly
// (POST /appointments/:id/decline-call) even when no app tab/window is
// open, so the caller's side actually hangs up instead of ringing out.
const DB_NAME = 'healnari-auth';
const STORE_NAME = 'tokens';
const KEY = 'current';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTokensToIndexedDb(tokens) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(tokens, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable (private browsing, storage disabled, etc.) —
    // background-decline from the OS notification just won't work; the
    // in-app Decline button still does, since it has localStorage directly.
  }
}

export async function clearTokensFromIndexedDb() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // no-op
  }
}

export async function readTokensFromIndexedDb() {
  try {
    const db = await openDb();
    const tokens = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return tokens;
  } catch {
    return null;
  }
}
