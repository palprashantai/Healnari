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
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-xs rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-2xl gap-2.5',
  }[size] || 'px-4 py-2 text-xs rounded-xl gap-2';

  const variantClasses = {
    gradient: `
      bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500
      hover:from-purple-500 hover:via-indigo-500 hover:to-pink-400
      text-white font-black shadow-md hover:shadow-purple-500/30
      border border-white/20 hover:-translate-y-0.5 active:translate-y-0
    `,
    glass: `
      bg-slate-900/90 hover:bg-slate-800
      text-purple-300 hover:text-white font-bold
      border border-purple-500/30 hover:border-purple-400/80
      shadow-sm shadow-purple-950/40 hover:-translate-y-0.5
    `,
    safety: `
      bg-gradient-to-r from-amber-500/15 to-purple-600/15 hover:from-amber-500/25 hover:to-purple-600/25
      text-amber-300 hover:text-amber-200 font-black
      border border-amber-500/40 hover:border-amber-400
      shadow-sm hover:shadow-amber-500/20 hover:-translate-y-0.5
    `,
    voice: `
      bg-gradient-to-r from-rose-600/90 to-purple-600/90 hover:from-rose-500 hover:to-purple-500
      text-white font-black
      border border-rose-400/40 hover:border-rose-300
      shadow-md shadow-rose-600/30 hover:-translate-y-0.5
    `,
  }[variant] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`
        relative inline-flex items-center justify-center transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:pointer-events-none
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
    >
      {loading ? (
        <>
          <i className="fas fa-rotate fa-spin text-[11px] opacity-90"></i>
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && (
            <i className={`fas ${icon} text-[11px] transition-transform group-hover:scale-110`}></i>
          )}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export const AiButton = AIButton;
export default AIButton;
