/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary: Aubergine (replaces all pink) ────────────────────────────
        aubergine: {
          50:  '#F5F0F3',
          100: '#E8D9E2',
          200: '#C9A8BC',
          400: '#9E6485',
          600: '#7a3e65',
          700: '#622f52',
          800: '#3b1c32',
          900: '#251121',
        },
        // ── Secondary: Sage Green (replaces teal) ─────────────────────────────
        sage: {
          50:  '#F0F5F0',
          100: '#D4E6D4',
          200: '#A8CCA8',
          400: '#6BA06B',
          600: '#5A7A5A',
          800: '#2E4A2E',
          900: '#1A2E1A',
        },
        // ── Accent: Warm Sand (replaces stark white/gray) ─────────────────────
        sand: {
          50:  '#FDFBF7',
          100: '#F5F0E8',
          200: '#E8DDD0',
          400: '#C4A882',
          600: '#8B7355',
        },
        // ── Semantic brand aliases ─────────────────────────────────────────────
        brand: {
          DEFAULT: '#7a3e65',
          light:   '#F5F0F3',
          dark:    '#3b1c32',
          hover:   '#9E6485',
          border:  '#E8D9E2',
          50:  '#F5F0F3',
          100: '#E8D9E2',
          200: '#C9A8BC',
          400: '#9E6485',
          600: '#7a3e65',
          700: '#622f52',
          800: '#3b1c32',
          900: '#251121',
        },
        surface: {
          page:   '#FDFBF7',
          card:   '#F5F0E8',
          border: '#E8DDD0',
        },
        clinical: {
          success: '#5A7A5A',
          period:  '#D85A30',
        },
        // ── Keep existing functional colors ───────────────────────────────────
        slate: {
          150: '#eef2f6',
          450: '#8091a7',
          550: '#5c6f88',
          650: '#3f516a',
          850: '#172237',
        },
        accent: {
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'Outfit', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        serif:   ['Lora', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2.5xl': '1.625rem',
        '3.5xl': '2.0rem',
        '4.5xl': '2.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':       '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        'card':       '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'brand-glow': '0 0 20px rgba(122, 62, 101, 0.2)',
        'inset-subtle':'inset 0 1px 2px rgba(0,0,0,0.05)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '450': '450ms',
      },
      animation: {
        'fade-in':      'pageFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up':     'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-subtle': 'pulseSubtle 2.5s infinite ease-in-out',
        'float':        'float 4s ease-in-out infinite',
        'bounce-subtle':'bounceSubtle 3s ease-in-out infinite',
        'shimmer':      'shimmer 1.4s ease-in-out infinite',
        'modal-in':     'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'overlay-in':   'overlayIn 0.25s ease both',
        'spin-slow':    'spin 3s linear infinite',
      },
      keyframes: {
        pageFadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.03)', opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        modalIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        overlayIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
