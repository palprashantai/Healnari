import React, { useRef } from 'react';

const isTouchOrMobile = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 ||
    window.matchMedia?.('(hover: none)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Wraps a card in a subtle mouse-tracking 3D tilt — follows the cursor while
 * hovered, springs back flat on mouse-leave. Use sparingly on showcase cards.
 */
export function Tilt3D({ children, className = '', max = 8, lift = true }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el || isTouchOrMobile()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * max * 2;
    const rotateX = (0.5 - py) * max * 2;
    el.style.transition = 'transform 0.06s linear';
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${lift ? 1.02 : 1}, ${lift ? 1.02 : 1}, 1)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`[transform-style:preserve-3d] will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

export default Tilt3D;
