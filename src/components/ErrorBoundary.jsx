import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white rounded-3xl border border-purple-100 p-8 sm:p-10 shadow-lg max-w-md w-full">
            <div className="w-16 h-16 bg-purple-100 text-aubergine-700 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-xs">
              <i className="fas fa-stethoscope"></i>
            </div>
            <h2 className="text-xl font-black text-slate-900 font-display mb-2">Something went wrong</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected display issue occurred in this section. Your clinical data and session remain secure.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="bg-gradient-to-r from-aubergine-700 via-aubergine-800 to-indigo-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
              >
                <i className="fas fa-rotate-right mr-1.5"></i> Reload Page
              </button>
              <button
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
