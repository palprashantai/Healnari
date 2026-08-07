import React, { useState } from 'react';

function PcosDiagram() {
  const [activeTab, setActiveTab] = useState('compare'); // 'normal', 'pcos', 'compare'

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
          Medical Education
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          Understanding PCOS & PCOD
        </h2>
        <p className="text-slate-500 text-sm md:text-base">
          Polycystic Ovary Syndrome (PCOS) involves hormonal imbalances that can affect ovulation, leading to the formation of multiple small cysts on the ovaries.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-100 overflow-hidden">
        {/* Controls */}
        <div className="flex justify-center p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1">
            <button 
              onClick={() => setActiveTab('normal')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'normal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Normal Ovary
            </button>
            <button 
              onClick={() => setActiveTab('compare')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'compare' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Side-by-Side
            </button>
            <button 
              onClick={() => setActiveTab('pcos')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pcos' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Polycystic Ovary
            </button>
          </div>
        </div>

        {/* Diagram Area */}
        <div className="p-8 md:p-12 bg-gradient-to-b from-white to-slate-50/50 relative">
          <div className={`flex flex-row md:grid gap-12 lg:gap-8 items-center transition-all duration-500 ${activeTab === 'compare' ? 'md:grid-cols-2 overflow-x-auto snap-x snap-mandatory pb-8 -mx-8 px-8 md:mx-0 md:px-0 md:pb-0 md:overflow-visible hide-scrollbar' : 'max-w-2xl mx-auto'}`}>
            
            {/* Normal Ovary Panel */}
            {(activeTab === 'normal' || activeTab === 'compare') && (
              <div className={`flex flex-col items-center animate-fade-in group relative ${activeTab === 'compare' ? 'w-[85vw] md:w-auto flex-shrink-0 snap-center' : 'w-full'}`}>
                <div className="absolute inset-0 bg-emerald-50 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <h3 className="text-xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-check-circle text-emerald-500"></i> Normal Ovary
                </h3>
                
                <div className="relative w-full max-w-[320px] aspect-square flex justify-center items-center">
                  {/* Connective lines and labels */}
                  <div className="absolute top-10 -left-4 md:-left-12 flex flex-col items-end z-10 transition-transform group-hover:-translate-x-2">
                    <span className="text-xs font-bold text-slate-700 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-slate-100 mb-1">Developing Follicles</span>
                    <div className="h-px w-16 bg-slate-300 transform -rotate-12"></div>
                  </div>
                  
                  <div className="absolute bottom-12 -right-4 md:-right-8 flex flex-col items-start z-10 transition-transform group-hover:translate-x-2">
                    <span className="text-xs font-bold text-slate-700 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-slate-100 mb-1">Mature Ovum (Egg)</span>
                    <div className="h-px w-16 bg-slate-300 transform -rotate-[160deg] translate-x-4"></div>
                  </div>

                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl z-0 transform transition-transform duration-700 group-hover:scale-105">
                    {/* Fallopian Tube partial */}
                    <path d="M10,80 C30,70 60,60 90,80 C95,83 95,95 90,95 C60,85 30,95 10,105 Z" fill="#fcd5ce" className="opacity-80" />
                    <path d="M80,75 C85,65 95,60 105,75" stroke="#fcd5ce" strokeWidth="4" fill="none" strokeLinecap="round" />
                    
                    {/* Main Ovary Body */}
                    <path d="M50,110 C40,70 90,40 140,60 C180,75 190,120 160,150 C120,190 60,160 50,110 Z" fill="url(#normalOvaryGrad)" stroke="#f4978e" strokeWidth="2" />
                    
                    {/* Developing Follicles */}
                    <circle cx="80" cy="80" r="4" fill="#ffb5a7" stroke="#f08080" strokeWidth="1" />
                    <circle cx="95" cy="70" r="6" fill="#ffb5a7" stroke="#f08080" strokeWidth="1" />
                    <circle cx="115" cy="75" r="8" fill="#ffb5a7" stroke="#f08080" strokeWidth="1" />
                    <circle cx="140" cy="95" r="10" fill="#ffb5a7" stroke="#f08080" strokeWidth="1" />
                    
                    {/* Mature Follicle */}
                    <circle cx="130" cy="130" r="16" fill="#f8edeb" stroke="#f08080" strokeWidth="1.5" />
                    <circle cx="130" cy="130" r="6" fill="#fbc4ab" stroke="#f4a261" strokeWidth="1" />
                    
                    {/* Corpus Luteum / Stroma texture */}
                    <path d="M70,130 C75,120 85,120 90,130 C95,140 85,150 75,145 Z" fill="#ffe5d9" stroke="#f4978e" strokeWidth="1" opacity="0.7" />
                    <circle cx="100" cy="110" r="1" fill="#e5989b" opacity="0.5" />
                    <circle cx="110" cy="100" r="1.5" fill="#e5989b" opacity="0.5" />
                    <circle cx="70" cy="100" r="1" fill="#e5989b" opacity="0.5" />
                    
                    <defs>
                      <radialGradient id="normalOvaryGrad" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#fae1dd" />
                        <stop offset="70%" stopColor="#f8ad9d" />
                        <stop offset="100%" stopColor="#f4978e" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                
                <div className="mt-6 text-center max-w-xs">
                  <p className="text-sm text-slate-600 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    A healthy ovary develops a single mature follicle each cycle, releasing one egg (ovulation).
                  </p>
                </div>
              </div>
            )}

            {/* PCOS Ovary Panel */}
            {(activeTab === 'pcos' || activeTab === 'compare') && (
              <div className={`flex flex-col items-center animate-fade-in group relative ${activeTab === 'compare' ? 'w-[85vw] md:w-auto flex-shrink-0 snap-center' : 'w-full'}`}>
                <div className="absolute inset-0 bg-rose-50 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <h3 className="text-xl font-bold text-rose-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-triangle-exclamation text-rose-500"></i> Polycystic Ovary
                </h3>
                
                <div className="relative w-full max-w-[320px] aspect-square flex justify-center items-center">
                  
                  {/* Connective lines and labels */}
                  <div className="absolute top-6 right-0 md:-right-8 flex flex-col items-start z-10 transition-transform group-hover:translate-x-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-rose-200 mb-1">Enlarged Volume</span>
                    <div className="h-px w-16 bg-rose-300 transform rotate-12 -translate-x-4"></div>
                  </div>
                  
                  <div className="absolute bottom-16 -left-4 md:-left-12 flex flex-col items-end z-10 transition-transform group-hover:-translate-x-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-rose-200 mb-1">Multiple Small Cysts</span>
                    <span className="text-[10px] text-rose-500 mb-1 leading-none">("String of Pearls")</span>
                    <div className="h-px w-16 bg-rose-300 transform -rotate-12 translate-x-2"></div>
                  </div>

                  {/* Enlarged slightly using scale */}
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl z-0 transform transition-transform duration-700 group-hover:scale-110 scale-105">
                    {/* Fallopian Tube partial */}
                    <path d="M0,70 C25,60 55,50 85,75 C90,78 90,90 85,90 C55,75 25,85 0,95 Z" fill="#fcd5ce" className="opacity-70" />
                    
                    {/* Main Ovary Body - Enlarged and slightly irregular */}
                    <path d="M40,110 C30,60 85,30 145,55 C190,75 195,130 165,165 C120,205 50,170 40,110 Z" fill="url(#pcosOvaryGrad)" stroke="#e5989b" strokeWidth="2.5" />
                    
                    {/* Multiple Cysts arranged peripherally */}
                    {/* Top edge */}
                    <circle cx="85" cy="55" r="7" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="105" cy="50" r="8" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="125" cy="52" r="9" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="145" cy="62" r="8" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    
                    {/* Right edge */}
                    <circle cx="160" cy="78" r="9" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="170" cy="100" r="8" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="165" cy="122" r="10" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="152" cy="142" r="9" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    
                    {/* Bottom edge */}
                    <circle cx="132" cy="158" r="8" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="110" cy="165" r="9" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="88" cy="162" r="7" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    <circle cx="68" cy="150" r="8" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    
                    {/* Left edge */}
                    <circle cx="55" cy="130" r="7" fill="#e8e8e4" stroke="#d8e2dc" strokeWidth="1.5" />
                    
                    {/* Stroma texture - denser */}
                    <circle cx="100" cy="100" r="1.5" fill="#c9ada7" opacity="0.6" />
                    <circle cx="115" cy="110" r="2" fill="#c9ada7" opacity="0.6" />
                    <circle cx="95" cy="125" r="1.5" fill="#c9ada7" opacity="0.6" />
                    <circle cx="130" cy="95" r="2" fill="#c9ada7" opacity="0.6" />
                    <circle cx="120" cy="130" r="1.5" fill="#c9ada7" opacity="0.6" />
                    <circle cx="80" cy="115" r="2" fill="#c9ada7" opacity="0.6" />
                    <circle cx="105" cy="140" r="1.5" fill="#c9ada7" opacity="0.6" />
                    <circle cx="140" cy="115" r="2" fill="#c9ada7" opacity="0.6" />
                    
                    <defs>
                      <radialGradient id="pcosOvaryGrad" cx="40%" cy="40%" r="70%">
                        <stop offset="0%" stopColor="#f4dbd6" />
                        <stop offset="60%" stopColor="#e5b3bb" />
                        <stop offset="100%" stopColor="#d5899a" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>

                <div className="mt-6 text-center max-w-xs">
                  <p className="text-sm text-slate-600 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                    Hormonal imbalance prevents follicles from maturing, creating multiple small cysts. The ovary may become enlarged.
                  </p>
                </div>
              </div>
            )}
            
          </div>
          
          {/* Informational Footer */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center bg-white/50 p-6 rounded-2xl">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                <i className="fas fa-stethoscope"></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Did you know?</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  Not all women with PCOS actually have cysts on their ovaries. Diagnosis requires 2 of 3 criteria: irregular periods, excess androgens, or polycystic ovaries on an ultrasound.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => document.getElementById('doctors').scrollIntoView({ behavior: 'smooth' })}
              className="whitespace-nowrap px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-brand-700 font-bold hover:border-brand-300 hover:bg-brand-50 transition-all"
            >
              Consult an Expert
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PcosDiagram;
