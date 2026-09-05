import React, { useState, useEffect } from 'react';

function Faq({ faqs: customFaqs }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const defaultFaqs = [
    {
      q: "What exactly do I get in a ₹799 consultation?",
      a: "Your ₹799 consultation includes a full 45-minute 1-on-1 video call with a specialist doctor (gynaecologist, endocrinologist, or trichologist depending on your concern), a personalised lab-test roadmap, a custom diet & yoga protocol designed for your hormonal profile, a digital prescription where applicable, and 14 days of free follow-up chat — all from the comfort of your home."
    },
    {
      q: "How does HealNari combine lifestyle interventions with medical therapy?",
      a: "Clinical guidelines consistently show that evidence-based nutrition, therapeutic movement, stress regulation, and sleep are foundational for improving insulin sensitivity and hormonal balance. Rather than relying solely on quick fixes, our specialists combine structured lifestyle protocols with targeted, evidence-based medications (such as insulin sensitizers or cycle regulators) whenever clinically indicated. This integrated care model addresses the root metabolic drivers to achieve sustainable, long-term health."
    },
    {
      q: "How is HealNari different from a regular hospital or clinic visit?",
      a: "Unlike a busy OPD that gives you 5 minutes, HealNari gives you 45 minutes with a specialist who actually listens. We take a root-cause, integrative approach combining gynaecology, endocrinology, nutrition, and yoga. No queues, no travel, no judgment — consult from home in your preferred language."
    },
    {
      q: "Which conditions do your doctors treat?",
      a: "Our specialists provide care for PCOS (Polycystic Ovary Syndrome, commonly referred to as PCOD in some regions), irregular or painful periods, hormonal hair thinning, acne & hirsutism, thyroid disorders, insulin resistance, fertility & preconception planning, and general hormonal health. If you're unsure, use our free screening tool to see which specialist can best assist you."
    },
    {
      q: "Can PCOS be cured or managed?",
      a: "According to the World Health Organization (WHO), PCOS has no cure, although symptoms and associated metabolic risks can be effectively managed. With personalized medical care, sustainable nutrition support, mindful movement, and lifestyle guidance, most women experience significant improvements in cycle regularity, energy, skin, and overall well-being."
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

  const rawList = (customFaqs && customFaqs.length > 0) ? customFaqs : defaultFaqs;
  const faqs = rawList.map(item => ({
    q: item.q || item.question || '',
    a: item.a || item.answer || ''
  })).filter(item => item.q && item.a);


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
