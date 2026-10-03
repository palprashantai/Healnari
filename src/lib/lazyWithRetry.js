import React from 'react';

/**
 * Robust wrapper around React.lazy that handles stale chunk 404s after new production deployments.
 * When a new deployment replaces hashed chunks on Vercel/CDN, users with an active tab
 * or PWA service worker cache will attempt to load the old chunk which now 404s.
 * This helper catches the dynamic module / strict MIME-type error, clears stale PWA caches,
 * and seamlessly reloads the page to load the latest deployment manifest.
 */
export function lazyWithRetry(componentImport, componentName = 'module') {
  return React.lazy(async () => {
    const sessionKey = `healnari_chunk_retry_${componentName}`;
    const hasRetried = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;

    try {
      const module = await componentImport();
      if (typeof window !== 'undefined' && hasRetried) {
        sessionStorage.removeItem(sessionKey);
      }
      return module;
    } catch (error) {
      const errorMessage = error?.message || String(error);
      const isChunkLoadError =
        error?.name === 'ChunkLoadError' ||
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Expected a JavaScript-or-Wasm module script') ||
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('text/html') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('MIME type');

      if (isChunkLoadError && !hasRetried && typeof window !== 'undefined') {
        sessionStorage.setItem(sessionKey, 'true');
        console.warn(`[Auto-Recover] Chunk load failed for ${componentName} due to updated deployment. Reloading...`);

        // Purge outdated caches if available
        if ('caches' in window) {
          try {
            const cacheKeys = await window.caches.keys();
            await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
          } catch (_) {}
        }

        // Force reload page to fetch latest deployment index
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });
}
