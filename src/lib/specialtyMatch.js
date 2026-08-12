// Shared concern -> recommended specialty mapping, used by both the public
// landing-page symptom checker and the logged-in patient's "not sure which
// doctor?" picker on Discovery.jsx — one list instead of two copies that
// can drift apart.
export const CONCERN_OPTIONS = [
  { label: 'PCOS / PCOD', specialty: 'Gynaecologist' },
  { label: 'Irregular periods', specialty: 'Gynaecologist' },
  { label: 'Fertility / Conception', specialty: 'Gynaecologist' },
  { label: 'Hair fall & thinning', specialty: 'Dermatologist' },
  { label: 'Acne / Skin concerns', specialty: 'Dermatologist' },
  { label: 'Hormonal imbalance', specialty: 'Endocrinologist' },
  { label: 'Thyroid concerns', specialty: 'Endocrinologist' },
  { label: 'General checkup', specialty: 'General Physician' },
];

export function specialtyForConcern(concern) {
  return CONCERN_OPTIONS.find(c => c.label === concern)?.specialty || 'Gynaecologist';
}

/** Real doctor specialty text is free-form ("Gynecology" vs
 * "Gynaecologist", etc.) — matches the recommended specialty against a real
 * list of specialties loosely (case-insensitive substring both ways)
 * instead of requiring an exact string match that would silently return
 * nothing. */
export function findClosestSpecialty(recommended, availableSpecialties) {
  const rec = recommended.toLowerCase();
  const stem = rec.slice(0, Math.min(6, rec.length)); // "Gynaecologist"/"Gynecology" share "gynec"
  return availableSpecialties.find(s => {
    const low = (s || '').toLowerCase();
    return low.includes(stem) || rec.includes(low);
  }) || null;
}
