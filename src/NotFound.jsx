import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto animate-fade-in">
        {/* Animated graphic */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-brand-100 rounded-full animate-pulse opacity-50"></div>
          <div className="absolute inset-4 bg-brand-200/50 rounded-full flex items-center justify-center">
            <span className="text-7xl font-black text-brand-600 leading-none">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-3">Page Not Found</h1>
        <p className="text-slate-500 leading-relaxed mb-8">
          Oops! The page you are looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <i className="fas fa-house"></i> Go to Home
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-8">
          If you think this is an error, please{' '}
          <a href="mailto:support@healnari.in" className="text-brand-500 hover:underline font-medium">contact support</a>.
        </p>
      </div>
    </div>
  );
}

export default NotFound;
