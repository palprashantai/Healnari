import React from 'react';

/**
 * Thin glowing accent bar shown at the top of a dashboard's content area.
 * Its color smoothly transitions to match whichever sidebar item is
 * currently hovered, falling back to the brand color when nothing is.
 */
export function ModuleAccentBar({ color, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[3px] w-full rounded-full transition-all duration-300 ease-out ${className}`}
      style={{ backgroundColor: color, boxShadow: `0 0 14px 0 ${color}77` }}
    />
  );
}

export default ModuleAccentBar;
