import { defineConfig } from 'vite';
// Force Vite restart for recharts dependency
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/logo-icon.jpg', 'brand/logo-full.jpg'],
      manifest: {
        name: 'HealNari | Women\'s Health',
        short_name: 'HealNari',
        description: 'Root-cause, doctor-led care for PCOS, hormonal imbalance, and women\'s health.',
        theme_color: '#2A1647',
        background_color: '#F8F6FF',
        display: 'standalone',
        icons: [
          {
            src: '/brand/logo-icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/brand/logo-icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  }
});
