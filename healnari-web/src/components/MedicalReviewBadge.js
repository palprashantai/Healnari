import Image from 'next/image';

export default function MedicalReviewBadge({ doctorName, doctorUrl, dateReviewed }) {
  return (
    <div className="inline-flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium">Medically Reviewed by</div>
        <a href={doctorUrl || "/doctors/search"} className="text-sm font-bold text-slate-900 hover:text-aubergine-600 transition-colors">
          {doctorName || 'Healnari Medical Board'}
        </a>
        {dateReviewed && (
          <div className="text-xs text-slate-400 mt-0.5">Updated on {dateReviewed}</div>
        )}
      </div>
    </div>
  );
}
