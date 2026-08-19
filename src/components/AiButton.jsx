import React from 'react';

/**
 * High-End AI Button Component with Shimmer Glow and Context-Specific Aesthetics.
 *
 * Variants:
 * - 'gradient' / 'hero': Shimmering purple-to-pink gradient with glowing hover effect.
 * - 'glass' / 'subtle': Sleek glassmorphism with purple/indigo border and glow.
 * - 'safety' / 'warning': Amber-to-purple pulse for clinical safety & drug checks.
 * - 'voice' / 'recording': Pulsing rose-to-purple for live voice transcription.
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
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 font-bold',
    md: 'px-4 py-2 text-xs rounded-xl gap-2 font-bold',
    lg: 'px-5 py-2.5 text-sm rounded-2xl gap-2.5 font-extrabold',
  }[size] || 'px-4 py-2 text-xs rounded-xl gap-2 font-bold';

  const variantClasses = {
    gradient: `
      bg-gradient-to-r from-purple-700 via-indigo-600 to-magenta-600
      hover:from-purple-600 hover:via-indigo-500 hover:to-magenta-500
      text-white font-black shadow-md shadow-purple-900/30 hover:shadow-lg hover:shadow-purple-600/40
      border border-white/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95
    `,
    glass: `
      bg-slate-900/95 hover:bg-slate-800
      text-purple-200 hover:text-white font-bold
      border-2 border-purple-500/40 hover:border-purple-400
      shadow-sm shadow-purple-950/50 hover:-translate-y-0.5 active:scale-95
    `,
    safety: `
      bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-amber-600/20 hover:from-amber-500/30 hover:to-purple-600/30
      text-amber-900 font-extrabold
      border-2 border-amber-500/60 hover:border-amber-500
      shadow-sm hover:shadow-amber-500/20 hover:-translate-y-0.5 active:scale-95
    `,
    voice: `
      bg-gradient-to-r from-rose-600 via-magenta-600 to-purple-600 hover:from-rose-500 hover:to-purple-500
      text-white font-black
      border border-rose-300/50 hover:border-white/50
      shadow-md shadow-rose-600/30 hover:-translate-y-0.5 active:scale-95
    `,
    compact: `
      bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold
      hover:from-purple-500 hover:to-indigo-500 border border-white/30 shadow-xs
      hover:scale-105 active:scale-95
    `,
  }[variant] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`
        relative inline-flex items-center justify-center transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:pointer-events-none
        select-none cursor-pointer tracking-wide
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
    >
      {/* AI Glow Sparkle Particle */}
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-xs"></span>
      {loading ? (
        <>
          <i className="fas fa-rotate fa-spin text-xs opacity-90"></i>
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && (
            <i className={`fas ${icon} text-xs transition-transform group-hover:scale-110 drop-shadow-xs`}></i>
          )}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export const AiButton = AIButton;
export default AIButton;
