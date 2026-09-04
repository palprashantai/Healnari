import React from 'react';

export function HealNariLogoMark({ className = "w-9 h-9" }) {
  return (
    <img
      src="/brand/logo-icon.png"
      alt="HealNari Logo"
      className={`rounded-full object-contain shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
      onError={(e) => {
        e.target.src = "/favicon.svg";
      }}
    />
  );
}

export function HealNariLogo({ showTagline = false, size = "md", variant = "light", useFullLogoImage = false }) {
  const isDark = variant === "dark";
  const sizeClasses = {
    sm: { icon: "w-8 h-8", text: "text-xl", tagline: "text-[9px]", fullHeight: "h-8" },
    md: { icon: "w-9 h-9", text: "text-2xl", tagline: "text-[10px]", fullHeight: "h-9" },
    lg: { icon: "w-12 h-12", text: "text-3.5xl", tagline: "text-xs", fullHeight: "h-12" },
  }[size] || { icon: "w-9 h-9", text: "text-2xl", tagline: "text-[10px]", fullHeight: "h-9" };

  if (useFullLogoImage) {
    return (
      <div className="flex flex-col">
        <img
          src={isDark ? "/brand/logo-dark.svg" : "/brand/logo.svg"}
          alt="HealNari"
          className={`${sizeClasses.fullHeight} w-auto object-contain shrink-0`}
          onError={(e) => {
            e.target.src = "/brand/logo-icon.png";
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
          <span className={`font-black tracking-tight font-serif ${sizeClasses.text} ${isDark ? 'text-white' : 'text-[#2A1647]'}`}>
            Heal<span className={isDark ? 'text-pink-400' : 'text-[#E23E8C]'}>Nar<span className="relative inline-block">ı<span className="absolute -top-[0.25em] left-1/2 -translate-x-1/2 text-[0.45em] leading-none select-none">♥</span></span></span>
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

