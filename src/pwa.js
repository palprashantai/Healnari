import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Create an iOS/Android style frosted glass PWA update banner
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 sm:top-auto sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] sm:w-auto max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-[0_20px_50px_rgba(42,22,71,0.25)] border border-aubergine-100 flex items-center gap-3.5 animate-slide-up safe-area-pt sm:safe-area-pt-0';
      
      toast.innerHTML = `
        <div class="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-aubergine-600 to-magenta-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-aubergine-500/20">
          <i class="fas fa-sparkles text-sm animate-pulse"></i>
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-black uppercase tracking-wider text-aubergine-900">HealNari Update</h4>
            <span class="bg-aubergine-100 text-aubergine-700 text-[10px] font-bold px-2 py-0.5 rounded-full">vReady</span>
          </div>
          <p class="text-xs text-slate-600 font-medium truncate mt-0.5">New features & care protocols ready.</p>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button id="pwa-refresh-btn" class="bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:from-aubergine-700 hover:to-magenta-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md active:scale-95">
            Update
          </button>
          <button id="pwa-dismiss-btn" class="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <i class="fas fa-xmark text-xs"></i>
          </button>
        </div>
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
