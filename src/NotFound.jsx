import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-aubergine-50 flex items-center justify-center p-6 font-sans">
      <div className="text-center max-w-md mx-auto animate-fade-in">
        {/* Animated graphic */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-aubergine-100 rounded-full animate-pulse opacity-50"></div>
          <div className="absolute inset-4 bg-aubergine-200/50 rounded-full flex items-center justify-center">
            <span className="text-7xl font-black text-aubergine-600 leading-none">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-3 font-display">Page Not Found</h1>
        <p className="text-slate-500 leading-relaxed mb-8 text-sm">
          Oops! The page you are looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 py-3 rounded-xl border border-sand-300 transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-aubergine-200 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <i className="fas fa-house"></i> Go to Home
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-8">
          If you think this is an error, please{' '}
          <a href="mailto:support@healnari.care" className="text-aubergine-600 hover:underline font-bold">contact support</a>.
        </p>
      </div>
    </div>
  );
}

export default NotFound;
