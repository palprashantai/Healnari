import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('New content available, ready to refresh.');
    },
    onOfflineReady() {
      console.log('App is ready to work offline.');
    },
  });
}
