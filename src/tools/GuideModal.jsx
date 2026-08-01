import React from 'react';

function GuideModal({ isOpen, onClose, guide }) {
  if (!isOpen || !guide) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up flex flex-col my-auto max-h-[90vh]"
      >
        {/* Header Image Area */}
        <div className={`h-32 md:h-40 relative flex items-center justify-center bg-gradient-to-tr ${
          guide.color === 'indigo' ? 'from-indigo-600 to-brand-400' :
          guide.color === 'emerald' ? 'from-emerald-600 to-teal-400' :
          guide.color === 'violet' ? 'from-violet-600 to-fuchsia-400' :
          guide.color === 'amber' ? 'from-amber-500 to-orange-400' :
          guide.color === 'rose' ? 'from-rose-600 to-aubergine-400' :
          'from-sky-600 to-blue-400'
        }`}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors backdrop-blur-md"
          >
            <i className="fas fa-times"></i>
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl text-white shadow-lg">
            <i className={`fas ${guide.icon}`}></i>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-10 overflow-y-auto flex-grow space-y-6 text-slate-700 bg-white">
          <div className="space-y-3 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                guide.color === 'indigo' ? 'bg-indigo-50 text-indigo-700' :
                guide.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                guide.color === 'violet' ? 'bg-violet-50 text-violet-700' :
                guide.color === 'amber' ? 'bg-amber-50 text-amber-700' :
                guide.color === 'rose' ? 'bg-rose-50 text-rose-700' :
                'bg-sky-50 text-sky-700'
              }`}>
                {guide.tag}
              </span>
              <span className="text-xs font-bold text-slate-400"><i className="fas fa-clock mr-1"></i>{guide.readTime}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-display leading-tight">
              {guide.title}
            </h2>
          </div>

          {/* Full Guide Content - simulated rich text */}
          <div className="space-y-5 text-sm md:text-base leading-relaxed font-medium">
            <p className="text-lg text-slate-655 font-semibold leading-relaxed">
              {guide.summary}
            </p>
            
            <h4 className="text-lg font-bold text-slate-900 mt-6 pt-4 border-t border-slate-50">Understanding the Root Cause</h4>
            <p>
              In clinical practice, we often see this issue masked by superficial treatments. Whether you are dealing with hormonal imbalances or metabolic resistance, the key is addressing the foundational systems of your body rather than just suppressing the symptoms.
            </p>
            <p>
              Our endocrine system is highly interconnected. A disruption in one pathway—such as cortisol or insulin—creates a cascading effect that alters thyroid function, sex hormone production, and inflammatory responses. 
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 my-6">
              <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <i className="fas fa-list-check text-brand-600"></i> Clinical Action Steps
              </h5>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                  <span><strong>Testing:</strong> Always demand a comprehensive hormonal panel rather than standard reference ranges.</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                  <span><strong>Nutrition:</strong> Focus on anti-inflammatory and low-glycemic index foods to stabilize insulin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-500 mt-1 text-[10px]"></i>
                  <span><strong>Consistency:</strong> Hormonal protocols take 90 to 120 days to show cellular turnover results.</span>
                </li>
              </ul>
            </div>

            <h4 className="text-lg font-bold text-slate-900 mt-4">The FemHealth Approach</h4>
            <p>
              We don't believe in the "pill for an ill" philosophy. Our specialist doctors combine targeted medical therapies with clinical nutrition and sustainable lifestyle modifications to ensure long-term health restoration.
            </p>
          </div>
          
          {/* Doctor Tip Callout */}
          <div className={`mt-8 border-l-4 rounded-r-xl p-5 bg-slate-50 ${
            guide.color === 'indigo' ? 'border-indigo-500' :
            guide.color === 'emerald' ? 'border-emerald-500' :
            guide.color === 'violet' ? 'border-violet-500' :
            guide.color === 'amber' ? 'border-amber-500' :
            guide.color === 'rose' ? 'border-rose-500' :
            'border-sky-500'
          }`}>
            <h5 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wider">Doctor's Tip</h5>
            <p className="text-slate-655 font-semibold text-sm leading-relaxed">
              {guide.tip}
            </p>
          </div>

        </div>
        
        {/* Footer CTA */}
        <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <p className="text-xs text-slate-505 font-bold max-w-xs text-center sm:text-left">
            Ready to find your root cause? Let our clinical experts guide you.
          </p>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all text-sm"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuideModal;
