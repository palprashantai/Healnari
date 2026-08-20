/** Shared between Tracking.jsx (the daily checklist) and Dashboard.jsx (the
 * "Current Focus" widget, which shows real rolling completion for a subset
 * of these) so both read the same habit keys/labels as the lifestyle_logs API. */
export const LIFESTYLE_ITEMS = [
  { key: 'sleep', label: 'Restful 7–9h sleep', icon: 'fa-moon', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
  { key: 'lowGI', label: 'Ate nourishing, balanced meals', icon: 'fa-utensils', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'exercise', label: 'Engaged in sustainable movement (30m)', icon: 'fa-person-walking', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'meds', label: 'Took prescribed medicines / supplements', icon: 'fa-pills', color: 'text-magenta-600 bg-magenta-50 border-magenta-100' },
  { key: 'water', label: 'Hydrated with 2–2.5L water', icon: 'fa-bottle-water', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
  { key: 'stress', label: 'Mindful relaxation / breathing (10m)', icon: 'fa-spa', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
];

export const HEALTH_GOALS = [
  { id: 'habits', label: 'Build Healthy Habits', icon: 'fa-seedling', emoji: '🌱', desc: 'Consistent daily routines for long-term vitality' },
  { id: 'cycle', label: 'Support Cycle Health', icon: 'fa-droplet', emoji: '🩸', desc: 'Encourage hormonal balance and ovulatory regularity' },
  { id: 'energy', label: 'Improve Energy & Fitness', icon: 'fa-bolt', emoji: '⚡', desc: 'Boost cellular energy and cardiovascular stamina' },
  { id: 'nutrition', label: 'Improve Nutrition', icon: 'fa-utensils', emoji: '🍽️', desc: 'Nourishing, sustainable meals tailored to your life' },
  { id: 'wellbeing', label: 'Manage Stress & Well-being', icon: 'fa-spa', emoji: '🧘', desc: 'Emotional health, restful sleep, and nervous system recovery' },
  { id: 'weight_mgmt', label: 'Weight Management', icon: 'fa-scale-balanced', emoji: '⚖️', desc: 'Metabolic health support when clinically appropriate' },
];

export const MOVEMENT_CATEGORIES = [
  { id: 'beginner', label: 'Beginner Movement', icon: 'fa-person-walking', color: 'emerald', desc: 'Low-impact walking, daily step building, gentle mobilization' },
  { id: 'gentle_yoga', label: 'Gentle Yoga', icon: 'fa-om', color: 'amber', desc: 'Restorative asanas, pelvic alignment, and joint mobility' },
  { id: 'flexibility', label: 'Flexibility', icon: 'fa-arrows-left-right', color: 'teal', desc: 'Full-body stretches and myofascial release' },
  { id: 'relaxation', label: 'Relaxation', icon: 'fa-spa', color: 'indigo', desc: 'Savasana, restorative postures, and stress alleviation' },
  { id: 'breathing', label: 'Breathing & Mindfulness', icon: 'fa-wind', color: 'rose', desc: 'Pranayama, diaphragmatic breathwork, autonomic tone' },
  { id: 'strength', label: 'Strength & Mobility', icon: 'fa-dumbbell', color: 'aubergine', desc: 'Resistance bands, bodyweight strength, functional fitness' },
];
