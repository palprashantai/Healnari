import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Create a nice PWA update toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-white rounded-2xl shadow-2xl border border-aubergine-100 p-4 flex items-center gap-4 animate-fade-in sm:min-w-[320px] max-w-[90vw]';
      
      toast.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-aubergine-50 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-download text-aubergine-600"></i>
        </div>
        <div class="flex-grow">
          <h4 class="text-sm font-bold text-slate-900">Update Available</h4>
          <p class="text-xs text-slate-500">A new version of HealNari is ready.</p>
        </div>
        <button id="pwa-refresh-btn" class="bg-aubergine-600 hover:bg-aubergine-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
          Refresh
        </button>
        <button id="pwa-dismiss-btn" class="text-slate-400 hover:text-slate-600 p-2">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      document.body.appendChild(toast);
      
      document.getElementById('pwa-refresh-btn').addEventListener('click', () => {
        updateSW(true);
      });
      
      document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        toast.remove();
      });
    },
    onOfflineReady() {
      console.log('App is ready to work offline.');
    },
  });
}
