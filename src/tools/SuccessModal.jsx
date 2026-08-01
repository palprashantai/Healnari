import React from 'react';

function SuccessModal({ details, onClose }) {
  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center space-y-6 shadow-2xl border border-slate-100 animate-slide-up">
        
        {/* Animated Checkmark Circle */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-3xl shadow-sm shadow-emerald-50">
          <i className="fas fa-circle-check"></i>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h3 className="text-2xl font-black text-slate-800 font-display">
            Appointment Confirmed!
          </h3>
          <p className="text-slate-400 text-xs md:text-sm font-semibold max-w-xs mx-auto">
            Your clinical consultation is successfully booked. An SMS and calendar invite have been sent.
          </p>
        </div>

        {/* Confirmation Details Card */}
        <div className="bg-slate-50 border border-slate-150/40 rounded-2xl p-4 text-left space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Patient Name</span>
            <span className="text-slate-700 font-bold">{details.name}</span>
          </div>
          <div className="h-px bg-slate-200/60"></div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Specialist</span>
            <span className="text-brand-700 font-bold">{details.doctor}</span>
          </div>
          <div className="h-px bg-slate-200/60"></div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Date & Time</span>
            <span className="text-slate-700 font-bold">{details.slot}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button 
            onClick={onClose} 
            className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive"
          >
            Back to Home
          </button>
          
          <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-400">
            <span><i className="fas fa-video text-brand-500 mr-1"></i> Zoom/Meet Video</span>
            <span><i className="fas fa-lock text-brand-500 mr-1"></i> HIPAA Encrypted</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SuccessModal;
