import React from 'react';

/**
 * PageWrapper - Wraps every page/route in a smooth entrance animation.
 * Add `key={location.pathname}` in the router for automatic re-mount on navigate.
 */
function PageWrapper({ children, className = '' }) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

export default PageWrapper;
