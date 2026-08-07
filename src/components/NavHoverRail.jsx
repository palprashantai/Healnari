import React, { useCallback, useRef, useState } from 'react';

/**
 * Wraps a list of nav items (each marked with data-nav-item) and renders a
 * smooth, cursor-following highlight bar behind whichever item the mouse is
 * over — no click needed, and it glides between items instead of popping.
 */
export function NavHoverRail({ children, indicatorClassName = 'bg-white/10' }) {
  const containerRef = useRef(null);
  const [rect, setRect] = useState(null);

  const trackTarget = useCallback((target) => {
    const item = target.closest('[data-nav-item]');
    const container = containerRef.current;
    if (!item || !container) { setRect(null); return; }
    const itemBox = item.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    setRect({ top: itemBox.top - containerBox.top, height: itemBox.height });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={(e) => trackTarget(e.target)}
      onMouseLeave={() => setRect(null)}
    >
      <div
        aria-hidden="true"
        className={`absolute left-0 right-0 rounded-xl pointer-events-none transition-[top,height,opacity] duration-200 ease-out ${indicatorClassName}`}
        style={{ top: rect ? rect.top : 0, height: rect ? rect.height : 0, opacity: rect ? 1 : 0 }}
      />
      <div className="relative space-y-0.5">{children}</div>
    </div>
  );
}

export default NavHoverRail;
