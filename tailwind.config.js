/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Official HealNari Controlled Brand Palette ────────────────────────
        healnari: {
          purple:   '#6B46C1', // Primary Royal Purple
          magenta:  '#E23E8C', // Secondary Magenta Pink
          lilac:    '#A78BFA', // Soft Lilac Accent
          rose:     '#F98BD2', // Soft Rose Tint
          softbg:   '#EDE7FF', // Light Background Tint
          navy:     '#334155', // Slate Text / Navy
          dark:     '#2A1647', // Dark Theme Purple
        },
        // ── Aubergine & Brand Unified Scale ─────────────────────────────
        aubergine: {
          50:  '#F8F6FF',
          100: '#EDE7FF', // Soft Tint
          200: '#D6C7FF',
          300: '#A78BFA', // Soft Lilac
          400: '#8B5CF6',
          500: '#6B46C1', // Primary Royal Purple
          600: '#522F9E', // Primary Hover
          700: '#3A1C78', // Deep Purple
          800: '#2A1647', // Dark Purple
          900: '#1E1035', // Deep Dark Purple
        },
        brand: {
          DEFAULT: '#6B46C1',
          magenta: '#E23E8C',
          light:   '#EDE7FF',
          dark:    '#2A1647',
          hover:   '#522F9E',
          border:  '#A78BFA',
          50:  '#F8F6FF',
          100: '#EDE7FF',
          200: '#D6C7FF',
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#6B46C1',
          600: '#522F9E',
          700: '#3A1C78',
          800: '#2A1647',
          900: '#1E1035',
        },
        magenta: {
          50:  '#FFF0F7',
          100: '#FFE0F0',
          200: '#F98BD2', // Soft Rose
          300: '#F45BB7',
          400: '#F45BB7',
          500: '#E23E8C', // Official Magenta Pink
          600: '#C22572', // Magenta Hover
          700: '#9E1759',
          800: '#7A0F43',
          900: '#58082E',
        },
        surface: {
          page:   '#F8F6FF',
          card:   '#FFFFFF',
          border: '#EDE7FF',
          muted:  '#F1EDFC',
        },
        // ── Semantic Status Colors (strictly for status, not decorative) ────
        status: {
          success: '#10B981',
          'success-bg': '#ECFDF5',
          warning: '#F59E0B',
          'warning-bg': '#FFFBEB',
          danger:  '#EF4444',
          'danger-bg':  '#FEF2F2',
          info:    '#6B46C1',
          'info-bg':    '#EDE7FF',
        },
        // ── Extra slate shades used across the app ────
        slate: {
          150: '#eef2f6',
          450: '#8091a7',
          550: '#5c6f88',
          650: '#3f516a',
          850: '#172237',
        },
      },
      screens: {
        'xs': '420px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif:   ['Playfair Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs':    ['0.75rem',  { lineHeight: '1.125rem' }], // 12px
        'sm':    ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base':  ['1rem',     { lineHeight: '1.5rem' }],   // 16px
        'lg':    ['1.125rem', { lineHeight: '1.625rem' }], // 18px
        'xl':    ['1.25rem',  { lineHeight: '1.75rem' }],  // 20px
        '2xl':   ['1.5rem',   { lineHeight: '2rem' }],     // 24px
        '2.5xl': ['1.625rem', { lineHeight: '2.125rem' }], // 26px
        '3xl':   ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '3.5xl': ['2.0rem',   { lineHeight: '2.375rem' }], // 32px
        '4xl':   ['2.25rem',  { lineHeight: '2.5rem' }],   // 36px
        '4.5xl': ['2.5rem',   { lineHeight: '2.75rem' }],  // 40px
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':       '0 2px 15px -3px rgba(107, 70, 193, 0.08), 0 10px 20px -2px rgba(107, 70, 193, 0.04)',
        'card':       '0 1px 3px rgba(107, 70, 193, 0.04), 0 4px 12px rgba(107, 70, 193, 0.06)',
        'card-hover': '0 8px 30px rgba(107, 70, 193, 0.12), 0 2px 8px rgba(226, 62, 140, 0.08)',
        'brand-glow': '0 0 25px rgba(107, 70, 193, 0.25)',
        'magenta-glow': '0 0 25px rgba(226, 62, 140, 0.25)',
      },
      animation: {
        'fade-in':        'pageFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up':       'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-subtle':   'pulseSubtle 2.5s infinite ease-in-out',
        'float':          'float 4s ease-in-out infinite',
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
        slideInRight: {
          '0%':   { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.03)', opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
