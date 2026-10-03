import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const errorMsg = error?.message || String(error);
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Expected a JavaScript-or-Wasm module script') ||
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('text/html') ||
      errorMsg.includes('MIME type');

    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);

    const errorMsg = error?.message || String(error);
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Expected a JavaScript-or-Wasm module script') ||
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('text/html') ||
      errorMsg.includes('MIME type');

    // Automatically recover from stale chunks caused by a new production deployment
    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('healnari_chunk_error_reload');
      const now = Date.now();
      // Allow 1 automatic reload attempt every 12 seconds
      if (!lastReload || now - Number(lastReload) > 12000) {
        sessionStorage.setItem('healnari_chunk_error_reload', String(now));
        console.warn('[Auto-Recover] Dynamic chunk stale after new deployment. Auto-reloading page...');
        if ('caches' in window) {
          try {
            window.caches.keys().then((keys) => {
              keys.forEach((k) => window.caches.delete(k));
            });
          } catch (_) {}
        }
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
    if (typeof window !== 'undefined') {
      if ('caches' in window) {
        try {
          window.caches.keys().then((keys) => {
            keys.forEach((k) => window.caches.delete(k));
          });
        } catch (_) {}
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isChunkError } = this.state;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-purple-100 p-8 sm:p-10 shadow-lg max-w-md w-full">
            <div className="w-16 h-16 bg-purple-50 text-aubergine-700 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-xs">
              <i className={`fas ${isChunkError ? 'fa-cloud-arrow-down' : 'fa-stethoscope'}`}></i>
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {isChunkError ? 'New Update Ready' : 'Something went wrong'}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              {isChunkError
                ? 'A new clinical version of HealNari was just published. Click below to reload and access the latest features.'
                : 'An unexpected display issue occurred in this section. Your clinical data and session remain secure.'}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="bg-gradient-to-r from-aubergine-700 via-healnari-purple to-magenta-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fas fa-rotate-right text-xs"></i>
                <span>{isChunkError ? 'Update & Refresh' : 'Reload Page'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
