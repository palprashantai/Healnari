import React from 'react';
import { triggerHaptic } from '../lib/haptics.js';

/**
 * Ultra-Premium AI Button Component with Atmospheric Light Sweep, Halo Glows,
 * and Micro-Interactions for Healthcare AI Capabilities.
 *
 * Variants:
 * - 'gradient' / 'hero': Royal Amethyst to Magenta shimmer gradient with ambient glow halo.
 * - 'glass' / 'cyber': Velvet obsidian glassmorphism with neon lilac edge lighting.
 * - 'luxury' / 'light': Pristine white card aesthetic with chromatic border & lilac accents.
 * - 'safety' / 'warning': Warm gold-to-amber clinical safety & pharmacology shield.
 * - 'voice' / 'recording': Pulsing rose-to-fuchsia wave for live consultation dictation.
 * - 'compact': Micro-pill with starry shimmer for table rows and cards.
 */
export function AIButton({
  children,
  onClick,
  loading = false,
  loadingText = 'AI Thinking...',
  variant = 'gradient',
  icon = 'fa-wand-magic-sparkles',
  size = 'md',
  disabled = false,
  className = '',
  title,
  type = 'button',
  badge,
  haptic = true,
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (haptic) triggerHaptic?.();
    onClick?.(e);
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5 font-bold',
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-2 font-bold',
    md: 'px-4.5 py-2.5 text-xs rounded-xl gap-2 font-black',
    lg: 'px-6 py-3 text-sm rounded-2xl gap-2.5 font-black tracking-wide',
  }[size] || 'px-4.5 py-2.5 text-xs rounded-xl gap-2 font-black';

  // Variant configurations
  const variantStyles = {
    gradient: {
      button: `
        bg-gradient-to-r from-purple-700 via-indigo-600 to-magenta-600
        hover:from-purple-600 hover:via-indigo-500 hover:to-magenta-500
        text-white border border-white/25
        shadow-lg shadow-purple-900/30 hover:shadow-purple-600/40
      `,
      halo: 'bg-gradient-to-r from-purple-600 to-magenta-600 opacity-40 blur-md',
      dot: 'bg-emerald-400',
    },
    glass: {
      button: `
        bg-slate-900/90 hover:bg-slate-800/95
        text-purple-100 hover:text-white
        border border-purple-500/40 hover:border-purple-400
        shadow-lg shadow-purple-950/40 hover:shadow-purple-900/50
        backdrop-blur-md
      `,
      halo: 'bg-purple-600/30 opacity-30 blur-md',
      dot: 'bg-purple-400',
    },
    luxury: {
      button: `
        bg-white hover:bg-purple-50/50
        text-purple-900 hover:text-purple-950
        border-2 border-purple-200/80 hover:border-purple-400
        shadow-md shadow-purple-950/5 hover:shadow-purple-900/15
      `,
      halo: 'bg-purple-300/30 opacity-20 blur-md',
      dot: 'bg-purple-600',
    },
    safety: {
      button: `
        bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/20
        hover:from-amber-500/25 hover:to-orange-500/20
        text-amber-950 hover:text-amber-900
        border-2 border-amber-400/80 hover:border-amber-500
        shadow-md shadow-amber-900/10 hover:shadow-amber-500/20
      `,
      halo: 'bg-amber-500/30 opacity-30 blur-md',
      dot: 'bg-amber-500',
    },
    voice: {
      button: `
        bg-gradient-to-r from-rose-600 via-magenta-600 to-purple-600
        hover:from-rose-500 hover:via-magenta-500 hover:to-purple-500
        text-white border border-rose-300/30
        shadow-lg shadow-rose-900/30 hover:shadow-rose-600/40
      `,
      halo: 'bg-rose-500/50 opacity-40 blur-md',
      dot: 'bg-rose-300',
    },
    compact: {
      button: `
        bg-gradient-to-r from-purple-600 to-indigo-600
        hover:from-purple-500 hover:to-indigo-500
        text-white border border-white/20
        shadow-sm shadow-purple-900/20 hover:shadow-purple-600/30
      `,
      halo: 'bg-purple-500/30 opacity-20 blur-sm',
      dot: 'bg-emerald-300',
    },
  }[variant] || variantStyles.gradient;

  return (
    <div className="relative inline-flex group">
      {/* Outer Ambient Glow Halo */}
      {!disabled && !loading && (
        <div
          className={`
            absolute -inset-0.5 rounded-2xl pointer-events-none transition-all duration-300
            group-hover:opacity-75 group-hover:scale-105
            ${variantStyles.halo}
          `}
        />
      )}

      {/* Main Interactive Button Surface */}
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled || loading}
        title={title}
        className={`
          relative overflow-hidden inline-flex items-center justify-center select-none
          transition-all duration-200 ease-out cursor-pointer tracking-wide
          hover:-translate-y-0.5 active:translate-y-0 active:scale-97
          focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:ring-offset-1
          disabled:opacity-50 disabled:pointer-events-none disabled:transform-none
          ${sizeClasses}
          ${variantStyles.button}
          ${className}
        `}
      >
        {/* Continuous Gliding Light Shimmer Beam */}
        {!disabled && !loading && (
          <span
            className="
              absolute inset-0 w-1/2 h-full pointer-events-none
              bg-gradient-to-r from-transparent via-white/25 to-transparent
              animate-ai-shimmer
            "
          />
        )}

        {/* Content & State Layout */}
        {loading ? (
          <div className="flex items-center gap-2 relative z-10">
            {/* High-end Dual Aurora Spinner */}
            <div className="relative w-4 h-4 flex items-center justify-center">
              <span className="absolute w-full h-full rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="font-bold tracking-normal">{loadingText}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 relative z-10">
            {/* Live State Pulse Dot */}
            <span
              className={`
                inline-block w-1.5 h-1.5 rounded-full shrink-0 shadow-xs
                ${variantStyles.dot}
                ${variant === 'voice' ? 'animate-ping' : 'animate-pulse'}
              `}
            />

            {/* Magic Sparkle Icon with Floating Keyframe */}
            {icon && (
              <span className="inline-flex items-center justify-center animate-ai-star">
                <i className={`fas ${icon} text-xs drop-shadow-xs`}></i>
              </span>
            )}

            {/* Label Text */}
            <span className="truncate">{children}</span>

            {/* Optional Small Badge */}
            {badge && (
              <span className="ml-1 text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-white/20 text-white font-black tracking-wider border border-white/20">
                {badge}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

export const AiButton = AIButton;
export default AIButton;
