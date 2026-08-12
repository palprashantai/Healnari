/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Official HealNari Brand Identity Palette ────────────────────────
        healnari: {
          purple:   '#6B46C1', // Primary Royal Purple
          magenta:  '#E23E8C', // Primary Magenta Pink
          lilac:    '#A78BFA', // Soft Lilac Accent
          rose:     '#F98BD2', // Soft Pink Tint
          softbg:   '#EDE7FF', // Light Background Tint
          navy:     '#334155', // Slate Text / Navy
          dark:     '#2A1647', // Dark Theme Purple
        },
        // ── Aubergine & Brand aliases (Updated to Official HealNari Colors) ──
        aubergine: {
          50:  '#F6F3FF',
          100: '#EDE7FF', // Soft Tint
          200: '#D6C7FF',
          300: '#A78BFA', // Soft Lilac
          400: '#8B5CF6',
          500: '#6B46C1', // Official Primary Purple
          600: '#6B46C1', // Official Primary Purple
          700: '#522F9E',
          800: '#3A1C78',
          900: '#2A1647', // Deep Dark Purple
        },
        brand: {
          DEFAULT: '#6B46C1',
          magenta: '#E23E8C',
          light:   '#EDE7FF',
          dark:    '#2A1647',
          hover:   '#522F9E',
          border:  '#A78BFA',
          50:  '#F6F3FF',
          100: '#EDE7FF',
          200: '#D6C7FF',
          300: '#A78BFA',
          500: '#6B46C1',
          600: '#6B46C1',
          700: '#E23E8C', // Accent Pink
          800: '#3A1C78',
          900: '#2A1647',
        },
        magenta: {
          50:  '#FFF0F7',
          100: '#FFE0F0',
          200: '#F98BD2', // Soft Rose
          400: '#F45BB7',
          500: '#E23E8C', // Official Magenta Pink
          600: '#C22572',
          700: '#9E1759',
        },
        surface: {
          page:   '#F8F6FF',
          card:   '#FFFFFF',
          border: '#EDE7FF',
        },
        // ── Secondary: Sage Green (used for wellness/positive accents) ────────
        sage: {
          50:  '#F0F5F0',
          100: '#D4E6D4',
          200: '#A8CCA8',
          400: '#6BA06B',
          600: '#5A7A5A',
          800: '#2E4A2E',
          900: '#1A2E1A',
        },
        // ── Accent: Warm Sand (used for warm neutral surfaces/borders) ────────
        sand: {
          50:  '#FDFBF7',
          100: '#F5F0E8',
          200: '#E8DDD0',
          400: '#C4A882',
          600: '#8B7355',
        },
        clinical: {
          success: '#5A7A5A',
          period:  '#D85A30',
        },
        // ── Extra slate shades used across the app between the stock steps ────
        slate: {
          150: '#eef2f6',
          450: '#8091a7',
          550: '#5c6f88',
          650: '#3f516a',
          850: '#172237',
        },
      },
      fontFamily: {
        serif:   ['Playfair Display', 'serif'],
        display: ['Playfair Display', 'serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2.5xl': '1.625rem',
        '3.5xl': '2.0rem',
        '4.5xl': '2.5rem',
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
