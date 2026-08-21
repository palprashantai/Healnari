import React, { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/**
 * Drop-in replacement for <Outlet /> inside a layout's <main>.
 * Fades the outgoing page out, then swaps in the new page and fades it in —
 * a real crossfade on route change instead of an instant content swap.
 */
export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  const [display, setDisplay] = useState({ location, outlet });
  const [stage, setStage] = useState('in');

  useEffect(() => {
    if (location.pathname !== display.location.pathname) {
      setStage('out');
    }
  }, [location, display.location]);

  const handleAnimationEnd = () => {
    if (stage === 'out') {
      setDisplay({ location, outlet });
      setStage('in');
    }
  };

  return (
    <div
      key={display.location.pathname}
      className={`w-full min-w-0 ${stage === 'out' ? 'page-transition-out' : 'page-transition-in'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {display.outlet}
      <style>{`
        @keyframes pageTransitionIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pageTransitionOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-6px); } }
        .page-transition-in { animation: pageTransitionIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .page-transition-out { animation: pageTransitionOut 0.15s ease-in both; }
        @media (prefers-reduced-motion: reduce) {
          .page-transition-in, .page-transition-out { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default PageTransition;
