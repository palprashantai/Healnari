import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';

function ProviderCalculator({ onApply }) {
  const [currency, setCurrency] = useState('INR'); // 'INR' or 'USD'
  const [fee, setFee] = useState(800);
  const [consultsPerDay, setConsultsPerDay] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const isUSD = currency === 'USD';
  const currencySymbol = isUSD ? '$' : '₹';

  // Math Logic (10% platform fee, 90% doctor take-home)
  const PLATFORM_FEE_PERCENT = 10;
  const DOCTOR_SHARE_PERCENT = 90;

  const weeklyConsults = consultsPerDay * daysPerWeek;
  const monthlyConsults = weeklyConsults * 4;
  
  // Gross & Net Calculations
  const grossMonthlyBillings = monthlyConsults * fee;
  const platformFeeMonthly = Math.round((grossMonthlyBillings * PLATFORM_FEE_PERCENT) / 100);
  const netMonthlyIncome = Math.round((grossMonthlyBillings * DOCTOR_SHARE_PERCENT) / 100);
  
  const netWeeklyPayout = Math.round(netMonthlyIncome / 4);
  const netAnnualIncome = netMonthlyIncome * 12;
  const netPerConsultFee = Math.round((fee * DOCTOR_SHARE_PERCENT) / 100);
  const weeklyHours = Math.round((weeklyConsults * 30) / 60); // 30 min per consult

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    if (newCurrency === 'USD') {
      setFee(40);
    } else {
      setFee(800);
    }
  };

  const feePresets = isUSD ? [25, 40, 60, 80, 100] : [500, 800, 1000, 1500, 2000];
  const consultPresets = [2, 4, 6, 8, 12];
  const daysOptions = [
    { label: '2 Days (Weekends)', value: 2 },
    { label: '3 Days (Alternate)', value: 3 },
    { label: '5 Days (Mon - Fri)', value: 5 },
    { label: '6 Days (Mon - Sat)', value: 6 },
  ];

  return (
    <section id="calculator" className="py-16 md:py-24 max-w-7xl mx-auto px-5 md:px-8 scroll-mt-20">
      
      {/* Header Section */}
      <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <div className="flex flex-wrap justify-center items-center gap-3">
          <span className="text-xs font-semibold text-aubergine-800 uppercase tracking-wider bg-aubergine-100/80 border border-aubergine-200 px-4 py-1.5 rounded-full shadow-xs">
            Practice Economics
          </span>

          {/* Currency Switcher */}
          <div className="bg-white p-1 rounded-2xl flex items-center gap-1 text-xs font-semibold border border-sand-300 shadow-xs">
            <button
              onClick={() => handleCurrencyChange('INR')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${currency === 'INR' ? 'bg-aubergine-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-aubergine-800'}`}
            >
              ₹ INR (India)
            </button>
            <button
              onClick={() => handleCurrencyChange('USD')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${currency === 'USD' ? 'bg-aubergine-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-aubergine-800'}`}
            >
              $ USD (Global)
            </button>
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 font-display tracking-tight">
          Calculate Your Practice Earnings
        </h2>
        <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          You receive <strong className="text-slate-900 font-bold">90% net payout</strong> of every completed consultation. The 10% platform fee covers HIPAA video hosting, payment gateway processing, and AI EMR maintenance.
        </p>
      </Reveal>

      {/* Main Interactive Calculator Card */}
      <Reveal delay={100}>
        <div className="max-w-5xl mx-auto bg-white border border-sand-200 rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Input Controls */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Input 1: Consultation Fee */}
              <div className="space-y-3">
                <div className="flex justify-between items-start sm:items-center gap-2">
                  <div className="min-w-0">
                    <label className="text-sm font-extrabold text-slate-900">1. Your Consultation Fee (Per Patient)</label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your 90% Take-Home: <strong className="text-emerald-700 font-black">{currencySymbol}{netPerConsultFee}</strong> · Platform: {currencySymbol}{Math.round(fee * 0.1)}
                    </p>
                  </div>
                  <span className="text-base sm:text-xl font-black text-white bg-aubergine-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl shadow-md font-sans shrink-0">
                    {currencySymbol}{fee.toLocaleString()}
                  </span>
                </div>
                
                <input
                  type="range"
                  min={isUSD ? 20 : 300}
                  max={isUSD ? 150 : 3000}
                  step={isUSD ? 5 : 50}
                  value={fee}
                  onChange={e => setFee(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {feePresets.map(val => (
                    <button
                      key={val}
                      onClick={() => setFee(val)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                        fee === val
                          ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-md scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300 hover:bg-white'
                      }`}
                    >
                      {currencySymbol}{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 2: Consultations per Day */}
              <div className="space-y-3">
                <div className="flex justify-between items-start sm:items-center gap-2">
                  <div className="min-w-0">
                    <label className="text-sm font-extrabold text-slate-900">2. Consultations Per Day</label>
                    <p className="text-xs text-slate-500 mt-0.5">Patient volume you wish to consult on clinic days</p>
                  </div>
                  <span className="text-base sm:text-lg font-black text-white bg-indigo-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl shadow-md font-sans shrink-0 whitespace-nowrap">
                    {consultsPerDay} / day
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={consultsPerDay}
                  onChange={e => setConsultsPerDay(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {consultPresets.map(val => (
                    <button
                      key={val}
                      onClick={() => setConsultsPerDay(val)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                        consultsPerDay === val
                          ? 'bg-indigo-700 text-white border-indigo-700 shadow-md scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-white'
                      }`}
                    >
                      {val} {val === 1 ? 'patient' : 'patients'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 3: Working Days per Week */}
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-900 block">3. Practice Days per Week</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {daysOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDaysPerWeek(opt.value)}
                      className={`py-2.5 px-3 text-center text-xs font-black rounded-2xl border transition-all ${
                        daysPerWeek === opt.value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Visibility Transparent Split Breakdown Box */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-receipt text-aubergine-600"></i> Revenue Split Breakdown
                  </span>
                  <span className="text-aubergine-800 font-extrabold bg-aubergine-100 px-2.5 py-0.5 rounded-lg">
                    {monthlyConsults} Consultations / Month
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Billings</span>
                    <strong className="text-sm font-black text-slate-800 font-sans block mt-0.5">
                      {currencySymbol}{grossMonthlyBillings.toLocaleString()}
                    </strong>
                  </div>
                  
                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Platform Fee (10%)</span>
                    <strong className="text-sm font-black text-amber-800 font-sans block mt-0.5">
                      -{currencySymbol}{platformFeeMonthly.toLocaleString()}
                    </strong>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 shadow-xs">
                    <span className="text-[10px] uppercase font-black text-emerald-700 block">Your Take-Home (90%)</span>
                    <strong className="text-sm font-black text-emerald-800 font-sans block mt-0.5">
                      {currencySymbol}{netMonthlyIncome.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: High-Contrast Results Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#160B28] border border-aubergine-500/40 text-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 lg:p-9 shadow-2xl relative flex flex-col justify-between space-y-5 sm:space-y-7">
              
              {/* Header Badge & Hero Number */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-aubergine-200">
                    Net Take-Home Monthly Income
                  </span>
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-400/40 shadow-xs">
                    90% Direct Payout
                  </span>
                </div>

                {/* Big Metric Number with Crisp Sans Typography */}
                <div className="text-4xl sm:text-5xl font-black text-white font-sans tracking-tight pt-1">
                  <span className="text-emerald-400 mr-1">{currencySymbol}</span>
                  {netMonthlyIncome.toLocaleString()}
                </div>
                
                <p className="text-xs text-slate-300 font-medium">
                  ≈ <strong className="text-white font-bold">{currencySymbol}{netAnnualIncome.toLocaleString()}</strong> projected net annual practice revenue
                </p>
              </div>

              {/* Breakdown Metric Tiles */}
              <div className="grid grid-cols-2 gap-3.5 py-4 border-y border-white/15">
                <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-300 uppercase font-extrabold block">Weekly Monday Payout</span>
                  <strong className="text-lg text-emerald-300 font-black font-sans block mt-0.5">
                    {currencySymbol}{netWeeklyPayout.toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-1 font-medium">Auto-settled weekly</span>
                </div>
                
                <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-300 uppercase font-extrabold block">Time Commitment</span>
                  <strong className="text-lg text-white font-black font-sans block mt-0.5">
                    ~{weeklyHours} hrs / week
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-1 font-medium">{weeklyConsults} consults / wk</span>
                </div>
              </div>

              {/* Transparency Callout Checks */}
              <div className="space-y-2 text-xs text-slate-200 font-medium">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><i className="fas fa-check-circle text-emerald-400"></i> Platform Deduction:</span>
                  <strong className="text-white font-bold">10% per consultation</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><i className="fas fa-check-circle text-emerald-400"></i> Monthly Fixed Rent:</span>
                  <strong className="text-emerald-400 font-bold">{currencySymbol}0 / month</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><i className="fas fa-check-circle text-emerald-400"></i> Clinical Overhead:</span>
                  <strong className="text-emerald-400 font-bold">Zero Clinic Overhead</strong>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onApply}
                className="w-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] text-sm flex items-center justify-center gap-2"
              >
                Apply to Start Earning <i className="fas fa-arrow-right text-xs"></i>
              </button>

            </div>

          </div>

        </div>
      </Reveal>
    </section>
  );
}

export default ProviderCalculator;
