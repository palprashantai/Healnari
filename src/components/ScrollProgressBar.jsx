import React, { useEffect, useState } from 'react';

/** Thin gradient bar fixed to the top of the viewport that fills as the page scrolls. */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    let docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Cache the document height using ResizeObserver to avoid forced reflows on scroll
    const resizeObserver = new ResizeObserver(() => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
    });
    resizeObserver.observe(document.body);

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9998] pointer-events-none" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-aubergine-600 via-brand-700 to-magenta-500 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default ScrollProgressBar;
