import { useState, useEffect, useCallback } from 'react';

/**
 * Wraps the browser's native Fullscreen API for a given element ref — true
 * OS-level fullscreen (hides the address bar/tabs too), not just a CSS
 * full-viewport overlay. Falls back to a no-op `toggle` (and `supported:
 * false`) on browsers that don't expose it at all (notably iPhone Safari,
 * which only supports fullscreen on a bare <video> element, not arbitrary
 * containers) — callers should hide their fullscreen button in that case
 * rather than show one that silently does nothing.
 */
export function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  useEffect(() => {
    if (!supported) return undefined;
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported || !ref.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      ref.current.requestFullscreen().catch(() => {});
    }
  }, [ref, supported]);

  return { isFullscreen, toggle, supported };
}

export default useFullscreen;
