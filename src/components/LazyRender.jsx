import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyRender delays the rendering (and fetching, if combined with React.lazy) 
 * of its children until they scroll near the viewport. This dramatically 
 * reduces initial DOM size and network payload for below-the-fold content.
 */
export default function LazyRender({ children, threshold = 0.1, rootMargin = '300px' }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, just render immediately
    if (!window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={containerRef} className="lazy-render-container w-full">
      {isVisible ? children : <div style={{ height: '300px' }}></div>}
    </div>
  );
}
