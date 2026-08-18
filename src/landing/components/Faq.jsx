import React, { useState, useEffect } from 'react';

function Faq() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: "What exactly do I get in a ₹799 consultation?",
      a: "Your ₹799 consultation includes a full 45-minute 1-on-1 video call with a specialist doctor (gynaecologist, endocrinologist, or trichologist depending on your concern), a personalised lab-test roadmap, a custom diet & yoga protocol designed for your hormonal profile, a digital prescription where applicable, and 14 days of free follow-up chat — all from the comfort of your home."
    },
    {
      q: "Why does HealNari focus on diet and yoga over medication?",
      a: "Because research shows diet and lifestyle are the most powerful tools for reversing PCOS, insulin resistance, and hormonal imbalances — far more effective long-term than medication alone. Most pills just manage symptoms. Our approach corrects the hormonal root cause so the symptoms disappear naturally. Medication is prescribed only when medically necessary, not as the first line of treatment."
    },
    {
      q: "How is HealNari different from a regular hospital or clinic visit?",
      a: "Unlike a busy OPD that gives you 5 minutes, HealNari gives you 45 minutes with a specialist who actually listens. We take a root-cause, integrative approach combining gynaecology, endocrinology, nutrition, and yoga. No queues, no travel, no judgment — consult from home in your preferred language."
    },
    {
      q: "Which conditions do your doctors treat?",
      a: "Our specialists treat PCOS / PCOD, irregular or painful periods, hormonal hair fall & thinning, acne & hirsutism, thyroid disorders (hypothyroidism, hyperthyroidism), hormonal weight gain, insulin resistance, fertility & preconception planning, and general hormonal imbalances. If you're unsure, use our free 2-minute symptom checker to find out which specialist you need."
    },
    {
      q: "Can PCOS symptoms really improve through diet, yoga, and treatment?",
      a: "For many women, yes — significantly. PCOS is a lifelong hormonal condition, but its symptoms (irregular cycles, hair fall, acne, weight gain) can often be greatly reduced or even brought under control with the right combination of diet, lifestyle changes, and medical support. Most patients on a consistent protocol see meaningful improvements within 8–12 weeks. Individual results vary based on your specific hormonal profile and consistency of the plan."
    },
    {
      q: "Is the video consultation completely secure & confidential?",
      a: "Yes — completely. All consultations, health records, and lab documents are end-to-end encrypted. We are built on patient-first privacy principles and never share your health information with any third party without your explicit consent."
    },
    {
      q: "What if I need to cancel or reschedule my booking?",
      a: "No problem at all. We offer completely free, hassle-free rescheduling or cancellation up to 4 hours before your appointment. You can modify your slot directly from your patient dashboard or by messaging our support team anytime."
    }
  ];


  const toggleAccordion = (idx) => {
    setActiveIndex((prev) => (prev === idx ? null : idx));
  };

  useEffect(() => {
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'faq-schema';
    
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    };
    
    schemaScript.text = JSON.stringify(schemaData);
    document.head.appendChild(schemaScript);
    
    return () => {
      const existingScript = document.getElementById('faq-schema');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20 scroll-mt-20">
      <div className="rounded-3xl p-6 md:p-10 border border-sand-200 shadow-sm" style={{ backgroundColor: 'var(--color-surface-card)' }}>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center text-slate-900 mb-8 font-display">
          Frequently Asked Questions
        </h2>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div 
                key={idx} 
                className={`border-b border-slate-100/90 pb-4 transition-all duration-300 ${
                  isOpen ? 'bg-[#fafcff]/40 p-4 rounded-2xl border' : 'bg-transparent'
                }`}
              >
                {/* Accordion Toggle Header */}
                <h3 className="m-0 p-0 font-inherit">
                  <button
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex justify-between items-center text-left font-bold text-slate-800 text-sm md:text-base leading-snug py-2 hover:text-aubergine-700 transition-colors select-none focus:outline-none"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <div className={`w-8 h-8 rounded-xl bg-sand-100 flex items-center justify-center text-slate-400 border border-sand-200 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-aubergine-50 border-aubergine-100 text-aubergine-600' : ''
                    }`}>
                      <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                  </button>
                </h3>

                {/* Animated Body Content — grid-rows trick so any answer length can expand, not just <240px */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-semibold">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default Faq;
