import { defineConfig, loadEnv } from 'vite';
// Force Vite restart for recharts dependency
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // AUDIT_REPORT.md OPS-5 — the dev server's /api proxy below never applies
  // to a production build. Without VITE_API_URL set, the deployed bundle
  // falls back to relative /api/... paths against whatever static host
  // serves it — this app's frontend (Vercel) and backend (Render) are never
  // same-origin, so that's a guaranteed silent 404 on every request. The
  // build used to succeed cleanly while shipping a completely broken app;
  // fail it loudly instead.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), '');
    if (!env.VITE_API_URL) {
      throw new Error(
        'VITE_API_URL is not set. A production build needs it pointed at the deployed backend ' +
        '(e.g. VITE_API_URL=https://healnari.onrender.com/api) ' +
        '— otherwise every API call in the ' +
        'deployed app 404s silently. See vite.config.js / AUDIT_REPORT.md OPS-5.'
      );
    }
  }

  // Plugin: defer Vite-injected CSS so inline pre-render shell paints instantly
  const deferCss = () => ({
    name: 'defer-css',
    transformIndexHtml(html) {
      // Convert Vite's render-blocking CSS link → async (print trick)
      return html.replace(
        /<link rel="stylesheet" crossorigin href="\/assets\/[^"]+\.css">/g,
        (match) => {
          const href = match.match(/href="([^"]+)"/)[1];
          return `<link rel="preload" as="style" href="${href}" onload="this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="${href}"></noscript>`;
        }
      );
    }
  });

  return {
    plugins: [
      react(),
      deferCss(),
      VitePWA({
        registerType: 'prompt',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: {},
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: ['brand/logo-icon.png', 'brand/logo-full.png'],
        manifest: {
          name: 'HealNari | Women\'s Health',
          short_name: 'HealNari',
          description: 'Root-cause, doctor-led care for PCOS, hormonal imbalance, and women\'s health.',
          theme_color: '#2A1647',
          background_color: '#F8F6FF',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          categories: ['medical', 'health', 'lifestyle'],
          shortcuts: [
            {
              name: 'Log Health & Period',
              short_name: 'Track',
              description: 'Log daily symptoms, cycle, and mood',
              url: '/patient-dashboard/tracking',
              icons: [{ src: '/brand/logo-icon.png', sizes: '192x192' }]
            },
            {
              name: 'Book ₹799 Consult',
              short_name: 'Consult',
              description: 'Book instant consultation with a doctor',
              url: '/patient-dashboard/find-doctor',
              icons: [{ src: '/brand/logo-icon.png', sizes: '192x192' }]
            },
            {
              name: 'Doctor Queue & Telemed',
              short_name: 'Doctor Queue',
              description: 'Open patient appointments & teleconsultation room',
              url: '/doctor-dashboard/appointments',
              icons: [{ src: '/brand/logo-icon.png', sizes: '192x192' }]
            },
            {
              name: 'Prescriptions & Vault',
              short_name: 'Rx Vault',
              description: 'Access digital prescriptions & lab records',
              url: '/patient-dashboard/records',
              icons: [{ src: '/brand/logo-icon.png', sizes: '192x192' }]
            }
          ],
          icons: [
            {
              src: '/brand/logo-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/brand/logo-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/brand/logo-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/brand/logo-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
        }
      }
    },
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            icons: ['lucide-react'],
            charts: ['recharts'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            socket: ['socket.io-client']
          }
        }
      }
    }
  };
});
