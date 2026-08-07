import React from 'react';

export function HealNariLogoMark({ className = "w-9 h-9" }) {
  return (
    <img
      src="/brand/logo-icon.jpg"
      alt="HealNari Logo"
      className={`rounded-full object-contain shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
      onError={(e) => {
        e.target.src = "/brand/logo-full.jpg";
      }}
    />
  );
}

export function HealNariLogo({ showTagline = false, size = "md", variant = "light", useFullLogoImage = false }) {
  const isDark = variant === "dark";
  const sizeClasses = {
    sm: { icon: "w-7 h-7", text: "text-lg", tagline: "text-[9px]", fullHeight: "h-7" },
    md: { icon: "w-9 h-9", text: "text-2xl", tagline: "text-[10px]", fullHeight: "h-9" },
    lg: { icon: "w-12 h-12", text: "text-3.5xl", tagline: "text-xs", fullHeight: "h-12" },
  }[size] || { icon: "w-9 h-9", text: "text-2xl", tagline: "text-[10px]", fullHeight: "h-9" };

  if (useFullLogoImage) {
    return (
      <div className="flex flex-col">
        <img
          src="/brand/logo-full.jpg"
          alt="HealNari"
          className={`${sizeClasses.fullHeight} w-auto object-contain shrink-0`}
          onError={(e) => {
            e.target.src = "/brand/logo-icon.jpg";
          }}
        />
        {showTagline && (
          <span className={`font-semibold tracking-wider italic mt-0.5 ${sizeClasses.tagline} ${isDark ? 'text-aubergine-200' : 'text-aubergine-600'}`}>
            — AI Care, Every Woman, Every Stage —
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 group cursor-pointer">
        <HealNariLogoMark className={sizeClasses.icon} />
        <div className="flex flex-col">
          <span className={`font-black tracking-tight font-serif ${sizeClasses.text} ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Heal<span className={isDark ? 'text-brand-300' : 'text-brand-600'}>Nari</span>
          </span>
        </div>
      </div>
      {showTagline && (
        <span className={`font-semibold tracking-wider italic mt-0.5 ${sizeClasses.tagline} ${isDark ? 'text-aubergine-200' : 'text-aubergine-600'}`}>
          — AI Care, Every Woman, Every Stage —
        </span>
      )}
    </div>
  );
}

export default HealNariLogo;
