import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { apiFetch } from '../lib/apiClient.js';
import { triggerHaptic } from '../lib/haptics.js';

const RATING_TAGS = [
  'Empathetic & Caring',
  'Clear Explanation',
  'Accurate Diagnosis',
  'Punctual & Attentive',
  'Effective Treatment',
  'Highly Recommended',
  'Holistic Care',
  'Detailed Follow-up',
];

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Fair Experience',
  3: 'Good Consultation',
  4: 'Very Good & Helpful',
  5: 'Excellent & Outstanding',
};

export function RateDoctorModal({ isOpen, onClose, doctor, onSuccess }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['Empathetic & Caring', 'Highly Recommended']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!doctor) return null;

  const toggleTag = (tag) => {
    triggerHaptic('light');
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!rating || rating < 1) {
      toast('Please choose a star rating (1 to 5 stars).', 'warning');
      return;
    }

    setSubmitting(true);
    triggerHaptic('medium');

    try {
      const docId = doctor.id || doctor._id || 'demo-1';
      const result = await apiFetch(`/doctors/${docId}/reviews`, {
        method: 'POST',
        body: {
          rating,
          comment: comment.trim(),
          tags: selectedTags,
        },
      });

      toast(`Thank you! Your rating for ${doctor.full_name || doctor.name} has been published.`, 'success');
      onSuccess?.(result);
      onClose();
      setComment('');
    } catch (err) {
      toast(err.message || 'Could not submit review. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStarValue = hoverRating || rating;
  const docName = doctor.full_name || doctor.name || 'Doctor';
  const docSpecialty = doctor.specialty || 'Specialist';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Consultation" size="md">
      <div className="space-y-3.5 pt-0.5 text-slate-800 pb-1">
        {/* Doctor Summary Banner */}
        <div className="flex items-center gap-3 p-3 bg-aubergine-50/70 border border-aubergine-100 rounded-2xl">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-aubergine-100 flex-shrink-0 border border-aubergine-200">
            {doctor.avatar_url ? (
              <img src={doctor.avatar_url} alt={docName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-aubergine-700 text-base">
                {docName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm text-slate-900 truncate">{docName}</h4>
            <p className="text-xs text-aubergine-700 font-semibold truncate">{docSpecialty}</p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-white px-2 py-0.5 rounded-lg border border-aubergine-200 text-aubergine-800 shrink-0">
            Verified Visit
          </span>
        </div>

        {/* Interactive Star Picker */}
        <div className="text-center py-2 px-3 bg-slate-50/70 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
            Select Your Rating
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= activeStarValue;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                    triggerHaptic('light');
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-2xl sm:text-3xl transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                  aria-label={`${star} star`}
                >
                  <i
                    className={`fas fa-star transition-colors ${
                      filled ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200 hover:text-amber-200'
                    }`}
                  ></i>
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold text-aubergine-700 mt-1 transition-all">
            {RATING_LABELS[activeStarValue] || 'Tap stars to rate'}
          </p>
        </div>

        {/* Quick Highlights / Tags */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1.5">
            What stood out about your care? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {RATING_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-aubergine-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <i className="fas fa-check text-[9px] mr-1"></i>}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Written Review */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">
            Write your detailed review (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Share how this specialist helped you, their bedside manner, clarity of instructions, or clinical outcome..."
            className="w-full border border-slate-200 rounded-2xl p-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-100 transition-all resize-none"
          />
          <span className="text-[10px] text-slate-400 block mt-0.5">
            🔒 Reviews are authenticated and follow HealNari clinical patient privacy standards.
          </span>
        </div>

        {/* Sticky Submit Actions — Always Visible */}
        <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex gap-2.5 z-20 shadow-md mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-28 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-aubergine-600 via-magenta-600 to-aubergine-700 hover:from-aubergine-700 hover:to-magenta-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-aubergine-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i> Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane text-xs"></i> Submit Real Patient Review
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
