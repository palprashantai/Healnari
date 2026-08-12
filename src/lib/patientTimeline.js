// Builds one chronological timeline (appointments + prescriptions + lab
// reports + doctor's notes) from data the patient/doctor EMR pages already
// fetch — shared so the patient's own Records.jsx and the doctor's
// per-patient EMR page render the exact same story instead of two
// independently-maintained versions that can drift apart.
export function buildPatientTimeline(patient, appointments) {
  if (!patient) return [];
  const events = [];

  (appointments || []).forEach(a => {
    events.push({
      key: `apt-${a.id}`,
      dateRaw: a.date, // already YYYY-MM-DD
      icon: 'fa-calendar-check',
      color: 'bg-sky-50 text-sky-600 border-sky-100',
      title: `${a.type} with Dr. ${a.doctorName}`,
      detail: `${a.status}${a.reason ? ` • ${a.reason}` : ''}`,
    });
  });

  const rxByGroup = new Map();
  (patient.meds || []).forEach(m => {
    if (!rxByGroup.has(m.groupId)) rxByGroup.set(m.groupId, []);
    rxByGroup.get(m.groupId).push(m);
  });
  rxByGroup.forEach(meds => {
    events.push({
      key: `rx-${meds[0].groupId}`,
      dateRaw: meds[0].prescribedOnRaw,
      icon: 'fa-file-prescription',
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      title: meds[0].diagnosis ? `Prescription — ${meds[0].diagnosis}` : 'Prescription issued',
      detail: `${meds.map(m => m.name).join(', ')} • ${meds[0].doctor}`,
    });
  });

  (patient.reports || []).forEach(r => {
    events.push({
      key: `lab-${r.id}`,
      dateRaw: r.dateRaw,
      icon: 'fa-flask',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      title: r.testName,
      detail: `${r.status}${r.urgent ? ' • Urgent' : ''}${r.labName ? ` • ${r.labName}` : ''}`,
    });
  });

  (patient.clinicalNotes || []).forEach(n => {
    events.push({
      key: `note-${n.id}`,
      dateRaw: n.dateRaw,
      icon: 'fa-notes-medical',
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      title: `Doctor's note — ${n.author}`,
      detail: n.text,
    });
  });

  return events
    .filter(e => e.dateRaw)
    .sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));
}
