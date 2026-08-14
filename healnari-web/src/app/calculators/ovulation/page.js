"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { APP_URL } from '@/config/env';

export default function OvulationCalculator() {
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [result, setResult] = useState(null);

  const calculate = (e) => {
    e.preventDefault();
    if (!lastPeriod) return;

    const date = new Date(lastPeriod);
    
    // Estimated ovulation is 14 days before next period
    // Next period = last period + cycle length
    const nextPeriod = new Date(date);
    nextPeriod.setDate(date.getDate() + parseInt(cycleLength));
    
    const ovulationDate = new Date(nextPeriod);
    ovulationDate.setDate(nextPeriod.getDate() - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(ovulationDate.getDate() - 5);

    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(ovulationDate.getDate() + 1);

    setResult({
      ovulation: ovulationDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      fertileWindow: `${fertileStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${fertileEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      nextPeriod: nextPeriod.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter text-aubergine-600">
            Healnari<span className="text-emerald-500">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href={APP_URL} className="font-bold text-sm text-slate-600 hover:text-aubergine-600">Login</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-xs mb-4">
            Free Clinical Tool
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4">Free Ovulation Calculator</h1>
          <p className="text-lg text-slate-600">
            Find your most fertile days and predict your next period to help you conceive or track your cycle.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100/50 mb-12">
          <form onSubmit={calculate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">First day of your last period</label>
              <input 
                type="date" 
                required
                value={lastPeriod}
                onChange={(e) => setLastPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-aubergine-500 focus:ring-1 focus:ring-aubergine-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Average cycle length (days)</label>
              <input 
                type="number" 
                min="20" max="45"
                required
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-aubergine-500 focus:ring-1 focus:ring-aubergine-500"
              />
            </div>
            <button type="submit" className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-4 rounded-xl transition-all shadow-md">
              Calculate My Fertile Window
            </button>
          </form>

          {result && (
            <div className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl animate-fade-in">
              <h3 className="font-black text-emerald-900 text-xl mb-4">Your Results</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-emerald-700 font-bold mb-1">Estimated Ovulation Date</div>
                  <div className="text-2xl font-black text-emerald-900">{result.ovulation}</div>
                </div>
                <div className="pt-4 border-t border-emerald-200/50">
                  <div className="text-sm text-emerald-700 font-bold mb-1">Highly Fertile Window</div>
                  <div className="text-lg font-bold text-emerald-800">{result.fertileWindow}</div>
                </div>
                <div className="pt-4 border-t border-emerald-200/50">
                  <div className="text-sm text-emerald-700 font-bold mb-1">Next Expected Period</div>
                  <div className="text-lg font-bold text-emerald-800">{result.nextPeriod}</div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-emerald-200/50">
                <p className="text-sm text-emerald-800 mb-4">
                  Want to track your cycle daily and get personalized health insights?
                </p>
                <a href={APP_URL} className="block text-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
                  Create a Free Account
                </a>
              </div>
            </div>
          )}
        </div>

        {/* SEO Text Block */}
        <article className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold mb-4">How does the ovulation calculator work?</h2>
          <p className="mb-4">
            Our free ovulation calculator uses the standard calendar method to predict your most fertile days. In an average 28-day cycle, ovulation typically occurs around day 14. 
            By subtracting 14 days from your expected next period date, we can estimate when your ovary will release an egg.
          </p>
          <p className="text-sm text-slate-500 italic">
            Disclaimer: This calculator provides an estimate and should not be used as a form of birth control or medical diagnosis. For personalized advice, <Link href="/doctors/search" className="text-aubergine-600 hover:underline">consult a Healnari gynecologist</Link>.
          </p>
        </article>
      </main>
    </div>
  );
}
