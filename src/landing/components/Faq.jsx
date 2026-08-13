import React, { useState } from 'react';

function Faq() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: "How is HealNari different from a regular gynaecologist visit?",
      a: "We take an integrated, root-cause clinical approach combining gynaecology, endocrinology, dermatology, and clinical nutrition. Instead of quick 5-minute visits, we offer comprehensive 45-minute video consults, customized lifestyle-medical treatment plans, and continuous daily chat support with a dedicated care team."
    },
    {
      q: "Can hair fall due to PCOS be improved?",
      a: "For many patients, yes. Correcting the underlying hormonal driver, alongside nutritional support and — when appropriate — topical or medical therapy, often reduces shedding and supports regrowth. Timelines vary, but most patients who respond see visible change within 4 to 6 months of consistent clinical care."
    },
    {
      q: "Is the video consultation completely secure & confidential?",
      a: "Yes. All video consultations, health records, lab documents, and care team chats are fully encrypted. We are built on patient-first privacy principles and never share your clinical parameters or contact details with third parties without your explicit, written consent."
    },
    {
      q: "What if I need to cancel or reschedule my booking?",
      a: "We offer completely free, hassle-free rescheduling or cancellations up to 4 hours before your scheduled appointment time. You can easily modify your slot instantly from your patient dashboard or by messaging our support line."
    }
  ];

  const toggleAccordion = (idx) => {
    setActiveIndex((prev) => (prev === idx ? null : idx));
  };

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
