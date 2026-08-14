"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { APP_URL } from '@/config/env';

const questions = [
  { id: 'irregular', text: 'Do you have irregular periods (fewer than 8 periods a year, or cycles longer than 35 days)?' },
  { id: 'acne', text: 'Do you experience severe acne that doesn\'t respond well to usual treatments?' },
  { id: 'hair', text: 'Have you noticed excessive facial or body hair growth (hirsutism)?' },
  { id: 'weight', text: 'Do you find it unusually difficult to lose weight, or have you experienced sudden weight gain?' },
  { id: 'thinning', text: 'Have you noticed hair thinning or hair loss from the scalp?' }
];

export default function PcosAssessment() {
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const calculateScore = () => {
    let score = 0;
    Object.values(answers).forEach(val => {
      if (val === 'yes') score += 1;
    });
    return score;
  };

  const submit = (e) => {
    e.preventDefault();
    if (Object.keys(answers).length < questions.length) {
      alert("Please answer all questions");
      return;
    }
    setShowResult(true);
  };

  const score = calculateScore();
  const isHighRisk = score >= 3;

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aubergine-50 text-aubergine-700 font-bold text-xs mb-4">
            Health Assessment
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4">PCOS Risk Assessment</h1>
          <p className="text-lg text-slate-600">
            Take this quick 5-question assessment to understand if your symptoms align with Polycystic Ovary Syndrome (PCOS).
          </p>
        </div>

        {!showResult ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100/50 mb-12">
            <form onSubmit={submit} className="space-y-8">
              {questions.map((q, idx) => (
                <div key={q.id} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <p className="font-bold text-slate-800 mb-4">{idx + 1}. {q.text}</p>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer transition-all ${answers[q.id] === 'yes' ? 'border-aubergine-600 bg-aubergine-50 text-aubergine-700 font-bold' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input type="radio" name={q.id} className="hidden" onChange={() => handleAnswer(q.id, 'yes')} />
                      Yes
                    </label>
                    <label className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer transition-all ${answers[q.id] === 'no' ? 'border-slate-600 bg-slate-100 text-slate-800 font-bold' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input type="radio" name={q.id} className="hidden" onChange={() => handleAnswer(q.id, 'no')} />
                      No
                    </label>
                  </div>
                </div>
              ))}
              
              <button type="submit" className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-4 rounded-xl transition-all shadow-md">
                Get My Results
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100/50 mb-12 animate-fade-in">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isHighRisk ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isHighRisk ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {isHighRisk ? 'You may have an elevated risk for PCOS' : 'Low indicated risk for PCOS'}
              </h2>
              <p className="text-slate-600">
                You answered "Yes" to {score} out of {questions.length} common PCOS symptoms.
              </p>
            </div>
            
            <div className={`p-6 rounded-2xl mb-8 ${isHighRisk ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'}`}>
              <p className="text-sm leading-relaxed text-slate-700">
                {isHighRisk 
                  ? "Based on your answers, you are experiencing multiple symptoms commonly associated with Polycystic Ovary Syndrome (PCOS). While this quiz is not a diagnosis, we strongly recommend consulting a healthcare professional for a proper evaluation."
                  : "Based on your answers, you are experiencing few or no common symptoms of PCOS. However, if you are experiencing irregular cycles or other discomforts, it is always a good idea to speak with a doctor."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isHighRisk && (
                <Link href="/doctors/search" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-center font-bold py-3 rounded-xl transition-colors">
                  Consult a Gynecologist
                </Link>
              )}
              <button onClick={() => setShowResult(false)} className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-all">
                Retake Assessment
              </button>
            </div>
            
            <p className="mt-6 text-xs text-center text-slate-400">
              Disclaimer: This assessment is for educational purposes only and is not intended to replace professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
