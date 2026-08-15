import React, { useState } from 'react';

export default function PromoBanner({ text, type = 'promo' }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!text || !isVisible) return null;

  const bgStyles = type === 'emergency' 
    ? 'bg-rose-600 text-white border-b border-rose-700' 
    : 'bg-amber-100 text-amber-900 border-b border-amber-200';
    
  const icon = type === 'emergency' ? 'fa-triangle-exclamation' : 'fa-bullhorn';

  return (
    <div className={`relative px-4 py-2 text-center text-xs sm:text-sm font-bold z-50 animate-slide-down ${bgStyles}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 pr-6">
        <i className={`fas ${icon} flex-shrink-0`}></i>
        <span className="truncate" dangerouslySetInnerHTML={{ __html: text }}></span>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
        aria-label="Dismiss banner"
      >
        <i className="fas fa-xmark text-xs opacity-70"></i>
      </button>
    </div>
  );
}
