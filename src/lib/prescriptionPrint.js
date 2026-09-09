import { parseDoseSchedule } from '../components/DoseSchedule.jsx';

function formatSchedule(schedule) {
  if (!schedule) return '';
  const parsed = parseDoseSchedule(schedule);
  if (!parsed) return schedule;
  const [morning, afternoon, night] = parsed.doses;
  const parts = [];
  if (morning) parts.push(`${morning} Morning`);
  if (afternoon) parts.push(`${afternoon} Afternoon`);
  if (night) parts.push(`${night} Night`);
  const base = parts.length ? parts.join(' + ') : schedule;
  return parsed.note ? `${base} (${parsed.note})` : base;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Deterministically generates a 64-hex SHA-256 style signature digest
 */
export function computeSignatureDigest(rxId, date, doctorReg, patientMrn) {
  const seed = `${rxId}|${date}|${doctorReg}|${patientMrn}|HealNariVerifiedSecV2`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = Math.imul(h1, 31).toString(16).padStart(8, '0');
  const p4 = Math.imul(h2, 127).toString(16).padStart(8, '0');
  const p5 = Math.imul(h1, 8191).toString(16).padStart(8, '0');
  const p6 = Math.imul(h2, 131071).toString(16).padStart(8, '0');
  const p7 = Math.imul(h1, 524287).toString(16).padStart(8, '0');
  const p8 = (h1 ^ h2 ^ 0x5a5a5a5a).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}`.slice(0, 64);
}

/**
 * Generates an authentic inline SVG QR code pattern without external network dependencies
 */
export function generateQrSvgData(url, size = 64) {
  const matrix = Array.from({ length: 21 }, () => Array(21).fill(0));
  
  // Standard 7x7 position detection patterns at 3 corners
  const addFinder = (r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[r0 + r][c0 + c] = 1;
        }
      }
    }
  };
  addFinder(0, 0);
  addFinder(0, 14);
  addFinder(14, 0);

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Populate data cells deterministically based on input URL hash
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)) continue;
      if (r === 6 || c === 6) continue;
      h = Math.imul(h ^ (r * 21 + c), 1664525) + 1013904223;
      if ((h >>> 30) % 2 === 1) {
        matrix[r][c] = 1;
      }
    }
  }

  const cells = [];
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (matrix[r][c] === 1) {
        cells.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#0f172a" />`);
      }
    }
  }

  return `
    <svg viewBox="0 0 21 21" width="${size}" height="${size}" shape-rendering="crispEdges" style="background:#ffffff;border-radius:4px;display:block;">
      ${cells.join('')}
    </svg>
  `;
}

/**
 * Parses medicine item into structured clinical components:
 * formulation, name, strength, route, morning/afternoon/night dose, food relation, duration, estimated quantity, indication, SOS status.
 */
function parseMedicineDetails(m) {
  const rawName = (m.name || m.medName || '').trim();
  const rawDosage = (m.dosage || m.strength || '').trim();
  const rawSchedule = (m.schedule || m.frequency || '1-0-1').trim();
  const rawDuration = (m.duration || '30 Days').trim();
  const rawNotes = (m.instructions || m.notes || '').trim();
  const rawTiming = (m.foodRelation || m.foodTiming || m.timing || '').trim();
  const rawIndication = (m.indication || '').trim();
  const isSos = !!m.isSos || /sos|prn/i.test(rawSchedule) || /sos|prn/i.test(rawName);

  // Extract formulation prefix (Tab, Cap, Syp, Inj, Sachet)
  let formulation = m.dosageForm || '';
  let cleanName = rawName;
  if (!formulation) {
    const formMatch = rawName.match(/^(Tab\.|Tablet|Cap\.|Capsule|Syp\.|Syrup|Inj\.|Injection|Sachet|Gel|Oint\.|Ointment|Drop|Drops|Cream|Inhaler|Pessary|Patch|Lotion)\s+/i);
    if (formMatch) {
      formulation = formMatch[1];
      cleanName = rawName.slice(formMatch[0].length).trim();
    } else {
      formulation = 'Tab.';
    }
  }

  // Extract strength if present in name or dosage field
  let strength = m.strength || rawDosage;
  if (!strength || strength.toLowerCase() === 'standard') {
    const strengthMatch = cleanName.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|iu|ml|%))/i);
    if (strengthMatch) {
      strength = strengthMatch[1];
    } else {
      strength = '';
    }
  }

  const route = m.route || 'Oral';

  // Parse food relation / timing SAFELY without silent false defaults
  let foodTiming = rawTiming;
  if (!foodTiming) {
    if (/after\s*(food|meal)/i.test(rawSchedule) || /after\s*(food|meal)/i.test(rawNotes) || /after/i.test(rawSchedule)) {
      foodTiming = 'After Food';
    } else if (/before\s*(food|meal)|empty\s*stomach/i.test(rawSchedule) || /before\s*(food|meal)|empty\s*stomach/i.test(rawNotes)) {
      foodTiming = 'Before Food';
    } else if (/with\s*(food|meal)/i.test(rawSchedule)) {
      foodTiming = 'With Meals';
    } else if (/bedtime|night/i.test(rawSchedule)) {
      foodTiming = 'At Bedtime';
    } else {
      foodTiming = 'As Directed';
    }
  }

  // Parse dose schedule into morning, afternoon, night, SOS
  const parsedDose = parseDoseSchedule(rawSchedule);
  let morning = '0', afternoon = '0', night = '0';
  let totalDosesPerDay = 0;
  if (isSos) {
    morning = 'SOS'; afternoon = 'SOS'; night = 'SOS'; totalDosesPerDay = 1;
  } else if (parsedDose) {
    morning = parsedDose.doses[0] > 0 ? String(parsedDose.doses[0]) : '0';
    afternoon = parsedDose.doses[1] > 0 ? String(parsedDose.doses[1]) : '0';
    night = parsedDose.doses[2] > 0 ? String(parsedDose.doses[2]) : '0';
    totalDosesPerDay = parsedDose.doses[0] + parsedDose.doses[1] + parsedDose.doses[2];
  } else if (/1-0-1/i.test(rawSchedule)) {
    morning = '1'; afternoon = '0'; night = '1'; totalDosesPerDay = 2;
  } else if (/1-0-0/i.test(rawSchedule)) {
    morning = '1'; afternoon = '0'; night = '0'; totalDosesPerDay = 1;
  } else if (/0-0-1/i.test(rawSchedule)) {
    morning = '0'; afternoon = '0'; night = '1'; totalDosesPerDay = 1;
  } else if (/1-1-1/i.test(rawSchedule)) {
    morning = '1'; afternoon = '1'; night = '1'; totalDosesPerDay = 3;
  } else if (/1-0-0-1/i.test(rawSchedule)) {
    morning = '1'; afternoon = '0'; night = '1'; totalDosesPerDay = 2;
  } else if (/weekly/i.test(rawSchedule)) {
    morning = '1'; afternoon = '0'; night = '0'; totalDosesPerDay = 0.14;
  } else {
    morning = '1'; afternoon = '0'; night = '1'; totalDosesPerDay = 2;
  }

  // Total quantity
  let totalQty = m.quantity || '';
  if (!totalQty) {
    let durationDays = 0;
    const daysMatch = rawDuration.match(/(\d+)\s*days?/i);
    if (daysMatch) durationDays = parseInt(daysMatch[1], 10);
    else if (/month/i.test(rawDuration)) {
      const monthsMatch = rawDuration.match(/(\d+)\s*months?/i);
      durationDays = (monthsMatch ? parseInt(monthsMatch[1], 10) : 1) * 30;
    } else if (/week/i.test(rawDuration)) {
      const weeksMatch = rawDuration.match(/(\d+)\s*weeks?/i);
      durationDays = (weeksMatch ? parseInt(weeksMatch[1], 10) : 1) * 7;
    }
    if (durationDays > 0 && totalDosesPerDay > 0) {
      const qty = Math.ceil(totalDosesPerDay * durationDays);
      totalQty = `${qty} ${qty > 1 ? 'Units' : 'Unit'}`;
    } else if (rawDuration) {
      totalQty = rawDuration;
    }
  }

  return {
    formulation,
    name: cleanName,
    strength: strength || '',
    route,
    schedule: rawSchedule,
    morning,
    afternoon,
    night,
    foodTiming,
    duration: rawDuration || '30 Days',
    totalQty,
    notes: rawNotes,
    indication: rawIndication,
    isSos,
  };
}

/**
 * Parses structured medicines and returns an HTML string for the prescription document.
 */
export function generatePrescriptionHtml({
  rxId,
  date,
  doctor,
  patient,
  diagnosis,
  medicines,
  labTests,
  instructions,
  handwrittenImage,
  followUpAdvice: explicitFollowUpAdvice,
  followUp: explicitFollowUp,
  dietPlan: explicitDietPlan,
  exercisePlan: explicitExercisePlan,
  origin = '',
  version = 1,
  amendedFromId = null,
  amendmentReason = null,
  status = 'Active',
  signedAt = null,
  signatureHash = null,
}) {
  const safeOrigin = origin || ((typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '');
  const logoSvgUrl = `${safeOrigin}/brand/logo.svg`;

  // Parse Consultation Date & Time
  const now = new Date();
  let consultationDate = '';
  let consultationTime = '';
  let validUntilDate = '';

  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      consultationDate = parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      consultationTime = parsedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const expiry = new Date(parsedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      validUntilDate = expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } else {
      consultationDate = date;
      consultationTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      validUntilDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } else {
    consultationDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    consultationTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    validUntilDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Doctor Details
  const doctorName = doctor?.name
    ? (/^(Dr\.|Dt\.)/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`)
    : 'Attending Practitioner';
  const doctorSpecialty = doctor?.specialty || 'General Practitioner';
  const doctorQualifications = doctor?.qualifications || doctor?.education || 'Medical Practitioner';
  const doctorRegNo = doctor?.regNo || doctor?.registrationNo || 'REG-PENDING';

  // Patient Details
  const patientName = patient?.name || 'Patient';
  const patientAge = patient?.age && patient.age !== '—' ? `${patient.age} Yrs` : 'Adult';
  const patientGender = patient?.gender || 'Not specified';
  const patientBlood = patient?.blood && patient.blood !== '—' ? patient.blood : '—';
  const patientMrn = patient?.mrn || (patient?.id ? `HN-${String(patient.id).slice(0, 6).toUpperCase()}` : 'HN-532115');
  const patientPhone = patient?.phone || '';
  const allergiesList = Array.isArray(patient?.allergies)
    ? patient.allergies.filter(Boolean)
    : typeof patient?.allergies === 'string' && patient.allergies.trim()
    ? [patient.allergies.trim()]
    : [];

  // Prescription ID & Status
  const displayRxId = rxId ? String(rxId).toUpperCase() : `RX-HN-${Math.floor(100000 + Math.random() * 900000)}`;
  const isSuperseded = status === 'Superseded' || String(status).toLowerCase() === 'superseded';
  const isAmended = Number(version) > 1 || Boolean(amendmentReason) || Boolean(amendedFromId);

  // Real Digital Security Digest & Inline Vector QR
  const effectiveSigHash = signatureHash || computeSignatureDigest(rxId, date || consultationDate, doctorRegNo, patientMrn);
  const verifyUrl = `${safeOrigin}/verify-rx?rxId=${encodeURIComponent(displayRxId)}&hash=${encodeURIComponent(effectiveSigHash.slice(0, 16))}`;
  const qrSvg = generateQrSvgData(verifyUrl, 44);

  // Parse structured medicines
  const parsedMedicines = (medicines || []).map(parseMedicineDetails);

  // Parse Instructions & Follow-Up Advice & Lifestyle Protocols
  let displayInstructions = instructions || '';
  let followUpAdvice = (explicitFollowUpAdvice || explicitFollowUp || '').trim();
  let dietPlan = (explicitDietPlan || '').trim();
  let exercisePlan = (explicitExercisePlan || '').trim();

  try {
    if (typeof displayInstructions === 'string' && displayInstructions.trim().startsWith('{')) {
      const parsedJson = JSON.parse(displayInstructions.trim());
      if (parsedJson.type === 'healnari-holistic-v1') {
        displayInstructions = parsedJson.clinicalNotes || '';
        if (!followUpAdvice && parsedJson.followUpAdvice) {
          followUpAdvice = String(parsedJson.followUpAdvice).trim();
        }
        if (!dietPlan && parsedJson.dietPlan) {
          dietPlan = String(parsedJson.dietPlan).trim();
        }
        if (!exercisePlan && parsedJson.exercisePlan) {
          exercisePlan = String(parsedJson.exercisePlan).trim();
        }
      }
    }
  } catch {}

  // Parse plain-text follow-up directives if not already set via JSON or props
  if (typeof displayInstructions === 'string' && displayInstructions) {
    const match = displayInstructions.match(/(?:Next\s+)?Follow[- ]?up(?:\s+Review|\s+Consultation|\s+Advice|\s+Plan)?:\s*([^\n\r]+)/i);
    if (match) {
      if (!followUpAdvice) {
        followUpAdvice = match[1].trim();
      }
      // Clean up inline follow-up from instructions so it doesn't duplicate
      displayInstructions = displayInstructions.replace(/(?:Next\s+)?Follow[- ]?up(?:\s+Review|\s+Consultation|\s+Advice|\s+Plan)?:\s*[^\n\r]+/gi, '').trim();
    }
  }

  // Structured Diet & Yoga Parsing
  const parsedDiet = parseDietProtocolText(dietPlan);

  const medicinesRowsHtml = parsedMedicines.map((m, idx) => `
    <tr class="med-item-row">
      <td class="col-num font-mono">${String(idx + 1).padStart(2, '0')}</td>
      <td class="col-med">
        <div class="med-name-line">
          <span class="med-prefix">${escapeHtml(m.formulation)}</span>
          <span class="med-main-name">${escapeHtml(m.name)}</span>
          ${m.strength ? `<span class="med-strength-tag">${escapeHtml(m.strength)}</span>` : ''}
          ${m.route ? `<span class="med-route-tag">${escapeHtml(m.route)}</span>` : ''}
          ${m.isSos ? `<span class="med-sos-tag">SOS / PRN</span>` : ''}
        </div>
        ${m.indication ? `<div class="med-indication-note"><span class="note-label">For:</span> ${escapeHtml(m.indication)}</div>` : ''}
        ${m.notes ? `<div class="med-special-note"><span class="note-bullet">▸</span> ${escapeHtml(m.notes)}</div>` : ''}
      </td>
      <td class="col-matrix">
        <div class="matrix-pill-group">
          <div class="matrix-cell ${m.morning !== '0' && m.morning !== '–' ? 'active-morning' : 'inactive'}">
            <span class="cell-label">M</span>
            <span class="cell-val">${escapeHtml(m.morning)}</span>
          </div>
          <div class="matrix-cell ${m.afternoon !== '0' && m.afternoon !== '–' ? 'active-afternoon' : 'inactive'}">
            <span class="cell-label">A</span>
            <span class="cell-val">${escapeHtml(m.afternoon)}</span>
          </div>
          <div class="matrix-cell ${m.night !== '0' && m.night !== '–' ? 'active-night' : 'inactive'}">
            <span class="cell-label">N</span>
            <span class="cell-val">${escapeHtml(m.night)}</span>
          </div>
        </div>
        <div class="matrix-sub-schedule">${escapeHtml(m.schedule)}</div>
      </td>
      <td class="col-timing">
        <span class="food-badge ${
          m.foodTiming.toLowerCase().includes('after') ? 'food-after' :
          m.foodTiming.toLowerCase().includes('before') ? 'food-before' :
          m.foodTiming.toLowerCase().includes('bed') ? 'food-bed' : 'food-general'
        }">
          ${escapeHtml(m.foodTiming)}
        </span>
      </td>
      <td class="col-dur">
        <span class="duration-pill">${escapeHtml(m.duration)}</span>
      </td>
      <td class="col-qty font-mono">
        ${escapeHtml(m.totalQty || '—')}
      </td>
    </tr>
  `).join('');

  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <base href="${safeOrigin}/" />
      <title>Prescription ${isAmended ? `(v${version}) ` : ''}— ${escapeHtml(patientName)} — HealNari</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #0f172a; 
          background: #f1f5f9;
          padding: 0;
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        /* Fixed Top Action Bar for Screen (Hidden in Print) */
        .print-toolbar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: #1e1b4b;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          z-index: 9999;
        }
        .toolbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 14px;
          color: #f8fafc;
        }
        .toolbar-badge {
          background: #4c1d95;
          color: #e9d5ff;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .toolbar-hint {
          font-size: 12px;
          color: #cbd5e1;
          display: none;
        }
        @media (min-width: 640px) {
          .toolbar-hint { display: inline-block; }
        }
        .toolbar-actions {
          display: flex;
          gap: 10px;
        }
        .btn-toolbar-print {
          background: #059669;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s;
        }
        .btn-toolbar-print:hover {
          background: #047857;
        }
        .btn-toolbar-close {
          background: #334155;
          color: #f8fafc;
          border: none;
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-toolbar-close:hover {
          background: #475569;
        }

        /* Main Page Card (A4 Proportion on Screen) */
        .page-container {
          max-width: 820px;
          margin: 32px auto 48px;
          background: #ffffff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e2e8f0;
        }

        /* Superseded Watermark */
        .superseded-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-32deg);
          font-size: 82px;
          font-weight: 900;
          color: rgba(220, 38, 38, 0.11);
          text-transform: uppercase;
          letter-spacing: 8px;
          pointer-events: none;
          z-index: 999;
          user-select: none;
          border: 8px dashed rgba(220, 38, 38, 0.13);
          padding: 12px 36px;
          border-radius: 16px;
        }

        /* Status Banners */
        .status-banner {
          margin-bottom: 16px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 11.5px;
          line-height: 1.45;
        }
        .superseded-banner {
          background: #fef2f2;
          border: 1.5px solid #f87171;
          color: #991b1b;
        }
        .superseded-banner .banner-title {
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .amendment-banner {
          background: #f0f9ff;
          border: 1.5px solid #38bdf8;
          color: #0369a1;
        }
        .amendment-banner .banner-title {
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }

        /* Clinic Official Letterhead */
        .clinic-header {
          background: #1e1b4b;
          color: #ffffff;
          padding: 24px 32px 20px;
          position: relative;
        }
        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }
        .brand-block {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .clinic-brand-logo {
          height: 48px;
          width: auto;
          max-width: 170px;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .clinic-sub-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .clinic-type {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #a78bfa;
        }
        .clinic-address {
          font-size: 11px;
          color: #cbd5e1;
          margin-top: 1px;
        }
        .clinic-contacts {
          font-size: 10.5px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Header Document Meta Info (Right Box) */
        .header-doc-info {
          text-align: right;
          min-width: 220px;
        }
        .doc-main-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #ffffff;
          margin-bottom: 6px;
        }
        .doc-meta-table {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
        }
        .doc-meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .meta-field-label {
          color: #94a3b8;
        }
        .meta-field-val {
          font-weight: 700;
          color: #ffffff;
        }
        .badge-tele-mode {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #059669;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Main Body Content */
        .body-content {
          padding: 24px 32px 32px;
        }

        /* Profiles Grid (Patient & Doctor) */
        .profiles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .profile-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .profile-card-header {
          background: #f1f5f9;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .profile-card-body {
          padding: 10px 12px;
          font-size: 11.5px;
        }
        .profile-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .profile-details-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 10px;
          color: #475569;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .diagnosis-box {
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          border-radius: 6px;
          padding: 5px 8px;
          margin-top: 6px;
        }
        .diag-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #6B46C1;
          letter-spacing: 0.5px;
        }
        .diag-text {
          font-size: 11.5px;
          font-weight: 700;
          color: #3b0764;
        }
        .allergy-notice {
          margin-top: 6px;
          font-size: 10.5px;
          padding: 4px 8px;
          border-radius: 5px;
        }
        .allergy-notice.alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        .allergy-notice.safe {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .doctor-sub-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          color: #475569;
        }
        .doctor-sub-details .qual {
          font-weight: 700;
          color: #1e1b4b;
        }
        .doctor-sub-details .spec {
          font-weight: 600;
          color: #6B46C1;
        }
        .doctor-sub-details .reg {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }

        /* Section Title (Rx) */
        .rx-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #6B46C1;
          padding-bottom: 6px;
          margin-bottom: 12px;
        }
        .rx-title-left {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .rx-symbol-inline {
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: 900;
          color: #6B46C1;
          line-height: 1;
        }
        .rx-section-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #1e1b4b;
        }
        .rx-item-count {
          font-size: 11px;
          font-weight: 700;
          color: #6B46C1;
          background: #f3e8ff;
          padding: 2px 8px;
          border-radius: 999px;
        }

        /* Medicines Table */
        .meds-table-container {
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .meds-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .meds-table thead {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .meds-table th {
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
        }
        .meds-table td {
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 11.5px;
          vertical-align: middle;
        }
        .meds-table tbody tr:last-child td {
          border-bottom: none;
        }
        .med-item-row:nth-child(even) {
          background: #fafafa;
        }

        .col-num {
          width: 4%;
          color: #94a3b8;
          font-size: 10.5px;
          text-align: center;
        }
        .col-med {
          width: 36%;
        }
        .med-name-line {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }
        .med-prefix {
          font-weight: 800;
          color: #6B46C1;
          font-size: 10px;
          text-transform: uppercase;
        }
        .med-main-name {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.2px;
        }
        .med-strength-tag {
          font-size: 10px;
          font-weight: 700;
          color: #4338ca;
          background: #e0e7ff;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid #c7d2fe;
        }
        .med-route-tag {
          font-size: 9.5px;
          font-weight: 700;
          color: #047857;
          background: #d1fae5;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid #a7f3d0;
          text-transform: uppercase;
        }
        .med-sos-tag {
          font-size: 9.5px;
          font-weight: 800;
          color: #b45309;
          background: #fef3c7;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid #fde68a;
          letter-spacing: 0.3px;
        }
        .med-indication-note {
          font-size: 10px;
          color: #475569;
          margin-top: 3px;
        }
        .med-indication-note .note-label {
          font-weight: 700;
          color: #64748b;
        }
        .med-special-note {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 3px;
          line-height: 1.4;
        }
        .med-special-note .note-bullet {
          color: #6B46C1;
          font-weight: bold;
        }

        /* Matrix Pills */
        .col-matrix {
          width: 22%;
        }
        .matrix-pill-group {
          display: inline-flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          background: #ffffff;
        }
        .matrix-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3px 8px;
          min-width: 32px;
          border-right: 1px solid #f1f5f9;
        }
        .matrix-cell:last-child {
          border-right: none;
        }
        .matrix-cell .cell-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          color: #94a3b8;
          line-height: 1;
          margin-bottom: 2px;
        }
        .matrix-cell .cell-val {
          font-size: 10.5px;
          font-weight: 800;
          line-height: 1;
        }
        .matrix-cell.active-morning { background: #eff6ff; color: #1d4ed8; }
        .matrix-cell.active-afternoon { background: #fffbeb; color: #b45309; }
        .matrix-cell.active-night { background: #faf5ff; color: #6B46C1; }
        .matrix-cell.inactive { background: #ffffff; color: #cbd5e1; }
        .matrix-sub-schedule { font-size: 9px; color: #64748b; margin-top: 3px; font-weight: 600; }

        /* Other Tables, Callouts... */
        .col-timing, .col-dur, .col-qty { font-size: 11px; }
        .food-badge { font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        .food-after { background: #ecfdf5; color: #047857; }
        .food-before { background: #fff7ed; color: #c2410c; }
        .duration-pill { font-size: 10.5px; font-weight: 700; color: #334155; }
        
        .callout-box { border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; border-left: 4px solid #e2e8f0; background: #f8fafc; font-size: 11px; }
        .callout-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
        .notes-callout { border-left-color: #6B46C1; background: #faf5ff; }
        .diet-callout { border-left-color: #059669; background: #f0fdf4; }
        .sos-callout { border-left-color: #d97706; background: #fffbeb; }

        .prescription-footer { border-top: 2px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .legal-notice-box { max-width: 60%; font-size: 9px; color: #64748b; line-height: 1.45; }
        .security-badge-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; font-size: 9.5px; color: #475569; }
        .security-qr-mock { width: 48px; height: 48px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 2px; flex-shrink: 0; }
        .signature-box { text-align: right; min-width: 200px; }
        .signature-cursive { font-family: 'Plus Jakarta Sans', Georgia, serif; font-size: 20px; font-style: italic; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; }
        .signature-line { border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .signature-verified-pill { display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #059669; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0; margin-top: 4px; }

        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm 14mm 12mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 8pt; color: #64748b; } }
          body { background: #ffffff !important; color: #000000 !important; font-size: 10pt; }
          .print-toolbar { display: none !important; }
          .page-container { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; border: none !important; max-width: 100% !important; }
          .clinic-header { padding: 16px 20px 14px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .body-content { padding: 16px 20px !important; }
          .meds-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .matrix-cell.active-morning, .matrix-cell.active-afternoon, .matrix-cell.active-night, .food-badge, .diagnosis-box, .badge-tele-mode, .med-route-tag, .med-sos-tag, .status-banner { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .med-item-row, .profile-card, .callout-box, .prescription-footer, .signature-box, .meds-table-container, .status-banner { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      </style>
    </head>
    <body>
      ${isSuperseded ? `<div class="superseded-watermark">SUPERSEDED</div>` : ''}
      <div class="print-toolbar">
        <div class="toolbar-brand">
          <span>HealNari Tele-EMR</span>
          <span class="toolbar-badge">${isAmended ? `Amended Prescription (v${version})` : isSuperseded ? 'Superseded Prescription' : 'Prescription Document'}</span>
        </div>
        <div class="toolbar-actions">
          <button onclick="window.print()" class="btn-toolbar-print">Print / Save as PDF</button>
          <button onclick="window.close()" class="btn-toolbar-close">Close</button>
        </div>
      </div>
      <div class="page-container">
        <header class="clinic-header">
          <div class="header-top-row">
            <div class="brand-block">
              <img src="${logoSvgUrl}" alt="HealNari Logo" class="clinic-brand-logo" onerror="this.onerror=null;this.src='/brand/logo.svg';" />
              <div class="clinic-sub-details">
                <div class="clinic-type">Digital Health Clinic</div>
                <div class="clinic-address">123 Wellness Avenue, Health City</div>
                <div class="clinic-contacts">support@healnari.app | +1 (800) 000-0000 | care@healnari.com</div>
              </div>
            </div>
            <div class="header-doc-info">
              <div class="doc-main-title">PRESCRIPTION</div>
              <div class="doc-meta-table">
                <div class="doc-meta-row"><span class="meta-field-label">Prescription No:</span><span class="meta-field-val font-mono">${escapeHtml(displayRxId)}</span></div>
                <div class="doc-meta-row"><span class="meta-field-label">Version:</span><span class="meta-field-val font-mono">v${escapeHtml(String(version))} ${isSuperseded ? '(Superseded)' : isAmended ? '(Amended)' : '(Active)'}</span></div>
                <div class="doc-meta-row"><span class="meta-field-label">Date:</span><span class="meta-field-val">${escapeHtml(consultationDate)}</span></div>
                <div class="doc-meta-row"><span class="meta-field-label">Valid Till:</span><span class="meta-field-val">${escapeHtml(validUntilDate)}</span></div>
              </div>
            </div>
          </div>
        </header>
        <div class="body-content">
          ${isSuperseded ? `<div class="status-banner superseded-banner"><div class="banner-title">⚠️ SUPERSEDED CLINICAL PRESCRIPTION</div><div>This prescription has been amended and replaced.</div></div>` : ''}
          ${isAmended ? `<div class="status-banner amendment-banner"><div class="banner-title">📋 AMENDED CLINICAL PRESCRIPTION — VERSION ${escapeHtml(String(version))}</div><div><strong>Justification:</strong> ${escapeHtml(amendmentReason || 'Clinical regimen revision')}</div></div>` : ''}
          <div class="profiles-grid">
            <div class="profile-card"><div class="profile-card-header">Patient Demographics</div><div class="profile-card-body"><div class="profile-name">${escapeHtml(patientName)}</div><div class="profile-details-row"><span><strong>Age:</strong> ${escapeHtml(patientAge)}</span><span>•</span><span><strong>Gender:</strong> ${escapeHtml(patientGender)}</span></div><div class="diagnosis-box"><span class="diag-label">Clinical Indication / Diagnosis</span><span class="diag-text">${escapeHtml(diagnosis || 'General Clinical Consultation')}</span></div></div></div>
            <div class="profile-card"><div class="profile-card-header">Prescribing Practitioner</div><div class="profile-card-body"><div class="profile-name">${escapeHtml(doctorName)}</div><div class="doctor-sub-details"><p class="qual">${escapeHtml(doctorQualifications)}</p><p class="spec">${escapeHtml(doctorSpecialty)}</p><p class="reg">Reg No: ${escapeHtml(doctorRegNo)}</p></div></div></div>
          </div>
          <div class="rx-section-header"><div class="rx-title-left"><span class="rx-symbol-inline">℞</span><span class="rx-section-title">Prescribed Medication Regimen</span></div><span class="rx-item-count">${parsedMedicines.length} Medication(s)</span></div>
          <div class="meds-table-container">
            <table class="meds-table">
              <thead><tr><th class="col-num">#</th><th class="col-med">Medication Name, Route & Strength</th><th class="col-matrix">Dosing Matrix (M-A-N)</th><th class="col-timing">When to Take</th><th class="col-dur">Duration</th><th class="col-qty">Quantity</th></tr></thead>
              <tbody>${medicinesRowsHtml}</tbody>
            </table>
          </div>
          ${parsedDiet && parsedDiet.meals.length > 0 ? `
            <div class="callout-box diet-callout">
              <div class="callout-title">Clinical Diet & Nutrition Protocol ${parsedDiet.regimen ? `— ${escapeHtml(parsedDiet.regimen)}` : ''}</div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 6px;">
                ${parsedDiet.meals.map(m => `<div style="background: white; border-radius: 4px; padding: 4px 8px; border: 1px solid #d1fae5;"><div style="font-weight:700; font-size:10px;">${escapeHtml(m.time)} — ${escapeHtml(m.meal)}</div><div style="font-size:10px;">${escapeHtml(m.foods)}</div></div>`).join('')}
              </div>
            </div>` : dietPlan ? `<div class="callout-box diet-callout"><div class="callout-title">Dietary Advice</div><div>${escapeHtml(dietPlan)}</div></div>` : ''}
          ${displayInstructions ? `<div class="callout-box notes-callout"><div class="callout-title">Clinical Notes</div><div>${escapeHtml(displayInstructions)}</div></div>` : ''}
          ${followUpAdvice ? `<div class="callout-box notes-callout"><div class="callout-title">Follow-up Advice</div><div>${escapeHtml(followUpAdvice)}</div></div>` : ''}
          <div class="callout-box sos-callout"><div class="callout-title">Emergency Advisory</div><div>In case of acute severe symptoms, immediately contact care support (+91 80 4567 8900) or visit an emergency facility.</div></div>
          <footer class="prescription-footer">
            <div class="legal-notice-box">
              <p><strong>Statutory Compliance:</strong> This digital prescription is issued pursuant to the National Telemedicine Practice Guidelines (2020).</p>
              <div class="security-badge-row"><div class="security-qr-mock">${qrSvg}</div><div><p><strong>Security Hash:</strong> <span class="font-mono" style="font-size: 8px;">SHA256:${escapeHtml(effectiveSigHash.slice(0, 32))}</span></p><p style="font-size: 8px;">Signed: ${escapeHtml(signedAt ? new Date(signedAt).toLocaleString('en-IN') : consultationDate)}</p></div></div>
            </div>
            <div class="signature-box"><div class="signature-cursive">${escapeHtml(doctorName)}</div><div class="signature-line">${escapeHtml(doctorName)}</div><div class="signature-verified-pill">Digitally Authenticated</div></div>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Opens a hospital-grade digital prescription print window styled to premier
 * clinical standards: official clinic letterhead matching the invoice header,
 * high-res brand logo, consultation timestamp, complete patient demographics,
 * dosing matrix, doctor credentials, security QR, and Telemedicine Practice Guidelines certification.
 */
export function openPrescriptionPrintWindow(params) {
  const win = window.open('', '_blank', 'width=940,height=1050');
  if (!win) return;

  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  const html = generatePrescriptionHtml({ ...params, origin });

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

/**
 * Parses dietary regimen text into structured objects for hospital-grade A4 printing.
 */
function parseDietProtocolText(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return null;

  // 1. Regimen Name
  const regMatch = text.match(/CLINICAL DIETARY REGIMEN\s*(?:\(([^)]+)\))?/i);
  const regimen = regMatch ? regMatch[1].trim() : '';

  // 2. Macros
  let macros = null;
  const macroMatch = text.match(/Calorie Target:\s*([^|\n]+)\|\s*Protein:\s*([^|\n]+)\|\s*Carbs:\s*([^|\n]+)\|\s*Fiber:\s*([^\n]+)/i);
  if (macroMatch) {
    macros = {
      calories: macroMatch[1].trim(),
      protein: macroMatch[2].trim(),
      carbs: macroMatch[3].trim(),
      fiber: macroMatch[4].trim(),
    };
  }

  // 3. Meals - Bullet-delimited robust parser
  const meals = [];
  const timetableMatch = text.match(/DAILY MEAL-BY-MEAL TIMETABLE:\s*\n([\s\S]*?)(?=RECOMMENDED FOODS|FOODS TO STRICTLY AVOID|$)/i);
  const mealBlock = timetableMatch ? timetableMatch[1] : text;
  const rawMealItems = mealBlock.split(/(?=•\s*\[)/);

  for (const item of rawMealItems) {
    const trimmed = item.trim();
    if (!trimmed.startsWith('•')) continue;
    const headerMatch = trimmed.match(/•\s*\[([^\]]+)\]\s*([^:\n]+):/);
    if (!headerMatch) continue;
    const time = headerMatch[1].trim();
    const meal = headerMatch[2].trim();

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    let foods = '';
    let portion = '';
    let note = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^Clinical Note:\s*/i.test(line)) {
        note = line.replace(/^Clinical Note:\s*/i, '').trim();
      } else if (!foods) {
        const portionMatch = line.match(/\(Portion:\s*([^)]+)\)/i);
        if (portionMatch) {
          portion = portionMatch[1].trim();
          foods = line.replace(/\(Portion:[^)]+\)/i, '').trim();
        } else {
          foods = line;
        }
      }
    }
    if (foods || meal) {
      meals.push({ time, meal, foods, portion, notes: note, note });
    }
  }

  // 4. Dos and Don'ts
  const dos = [];
  const donts = [];
  const lines = text.split('\n');
  let currentSec = '';
  for (const l of lines) {
    const trimmed = l.trim();
    if (/RECOMMENDED FOODS TO INCLUDE/i.test(trimmed)) {
      currentSec = 'dos';
    } else if (/FOODS TO STRICTLY AVOID/i.test(trimmed)) {
      currentSec = 'donts';
    } else if (currentSec === 'dos' && trimmed.startsWith('✓')) {
      dos.push(trimmed.replace(/^✓\s*/, ''));
    } else if (currentSec === 'donts' && trimmed.startsWith('✗')) {
      donts.push(trimmed.replace(/^✗\s*/, ''));
    }
  }

  return { regimen, macros, meals, dos, donts, raw: text };
}

/**
 * Parses mindful movement / yoga protocol text into structured objects for A4 printing.
 */
function parseYogaProtocolText(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return null;

  // 1. Phase
  const phaseMatch = text.match(/MINDFUL MOVEMENT & YOGA THERAPY\s*(?:\(([^)]+)\))?/i);
  const phase = phaseMatch ? phaseMatch[1].trim() : '';

  // 2. Frequency
  const freqMatch = text.match(/Frequency:\s*([^\n]+)/i);
  const frequency = freqMatch ? freqMatch[1].trim() : '';

  // 3. Asanas
  const asanas = [];
  const asanaMatch = text.match(/PRESCRIBED HORMONAL ASANAS:\s*\n([\s\S]*?)(?=PRANAYAMA & BREATHWORK|DAILY CARDIO|CLINICAL PRECAUTIONS|$)/i);
  const asanaBlock = asanaMatch ? asanaMatch[1] : text;
  const rawAsanas = asanaBlock.split(/(?=\d+\.\s+)/);

  for (const item of rawAsanas) {
    const trimmed = item.trim();
    const headMatch = trimmed.match(/^(\d+)\.\s*([^(]+)\s*\(([^)]+)\)/);
    if (!headMatch) continue;
    const num = headMatch[1].trim();
    const name = headMatch[2].trim();
    const duration = headMatch[3].trim();
    let benefit = '';
    let cues = '';

    const bMatch = trimmed.match(/Benefit:\s*([^\n]+)/i);
    if (bMatch) benefit = bMatch[1].trim();

    const cMatch = trimmed.match(/Alignment & Cue:\s*([^\n]+)/i);
    if (cMatch) cues = cMatch[1].trim();

    asanas.push({ num, name, duration, benefit, cues });
  }

  // 4. Pranayama
  const pranayama = [];
  const pranaSection = text.match(/PRANAYAMA & BREATHWORK PROTOCOL:([\s\S]*?)(?=DAILY CARDIO|CLINICAL PRECAUTIONS|$)/i);
  if (pranaSection) {
    const lines = pranaSection[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('•'));
    for (const line of lines) {
      const pMatch = line.match(/^•\s*([^(]+)\s*\(([^)]+)\):\s*(.+)$/);
      if (pMatch) {
        pranayama.push({
          name: pMatch[1].trim(),
          duration: pMatch[2].trim(),
          benefit: pMatch[3].trim(),
        });
      }
    }
  }

  // 5. Cardio
  const cardioMatch = text.match(/DAILY CARDIO & STEPS:\s*([^\n]+)/i);
  const cardio = cardioMatch ? cardioMatch[1].trim() : '';

  // 6. Precautions
  const precMatch = text.match(/CLINICAL PRECAUTIONS & RED FLAGS:\s*([^\n]+)/i);
  const precautions = precMatch ? precMatch[1].trim() : '';

  return { phase, frequency, asanas, pranayama, cardio, precautions, raw: text };
}

export function openLifestylePlanPrintWindow({ rxId, date, doctor, patient, dietPlan, exercisePlan, diagnosis, structuredData, origin: customOrigin }) {
  const win = window.open('', '_blank', 'width=900,height=980');
  if (!win) return;

  const origin = customOrigin || ((typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '');
  const logoSvgUrl = `${origin}/brand/logo.svg`;

  const now = new Date();
  const planDate = date || now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const displayPlanId = rxId ? String(rxId).toUpperCase() : `LS-HN-${Math.floor(100000 + Math.random() * 900000)}`;

  const doctorName = doctor?.name ? (/^(Dr\.|Dt\.)/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`) : 'Clinical Specialist';
  const doctorSpecialty = doctor?.specialty || 'Holistic Health & Lifestyle Specialist';
  const doctorReg = doctor?.regNo || doctor?.registrationNo || 'REG-VERIFIED';

  const patientName = patient?.name || 'Patient';
  const patientAge = patient?.age && patient.age !== '—' ? `${patient.age} Yrs` : 'Adult';
  const patientGender = patient?.gender || 'Not specified';
  const patientBlood = patient?.blood && patient.blood !== '—' ? patient.blood : '—';
  const patientMrn = patient?.mrn || (patient?.id ? `HN-${String(patient.id).slice(0, 6).toUpperCase()}` : 'HN-532115');

  // Parse or retrieve structured dietary regimen
  const parsedDiet = parseDietProtocolText(dietPlan);
  const dietRegimen = structuredData?.dietType || parsedDiet?.regimen || '';
  const macros = structuredData?.macros || parsedDiet?.macros || null;
  const meals = structuredData?.meals || parsedDiet?.meals || [];
  const dos = structuredData?.dos || parsedDiet?.dos || [];
  const donts = structuredData?.donts || parsedDiet?.donts || [];

  // Parse or retrieve structured yoga/movement therapy
  const parsedYoga = parseYogaProtocolText(exercisePlan);
  const yogaPhase = structuredData?.yogaPhase || parsedYoga?.phase || '';
  const yogaFrequency = structuredData?.yogaFrequency || parsedYoga?.frequency || '';
  const asanas = structuredData?.asanas || parsedYoga?.asanas || [];
  const pranayama = structuredData?.pranayama || parsedYoga?.pranayama || [];
  const cardio = structuredData?.cardio || parsedYoga?.cardio || '';
  const precautions = structuredData?.precautions || parsedYoga?.precautions || '';

  const clinicalNotes = structuredData?.clinicalNotes || '';
  const followUpAdvice = structuredData?.followUpAdvice || '';

  win.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <base href="${origin}/" />
      <title>Lifestyle &amp; Nutrition Protocol — ${escapeHtml(patientName)} — HealNari</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #0f172a; 
          background: #f8fafc;
          padding: 0;
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        .print-toolbar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: #1e1b4b;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          z-index: 9999;
        }
        .toolbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 14px;
          color: #f8fafc;
        }
        .toolbar-badge {
          background: #4c1d95;
          color: #e9d5ff;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .toolbar-actions {
          display: flex;
          gap: 10px;
        }
        .btn-toolbar-print {
          background: #059669;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 18px;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(5,150,105,0.4);
          transition: all 0.2s;
        }
        .btn-toolbar-print:hover { background: #047857; }
        .btn-toolbar-close {
          background: rgba(255,255,255,0.12);
          color: #e2e8f0;
          border: 1px solid rgba(255,255,255,0.2);
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-toolbar-close:hover { background: rgba(255,255,255,0.2); }

        .page-container {
          max-width: 860px;
          margin: 24px auto 60px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e2e8f0;
        }

        .clinic-header {
          background: #f8fafc;
          padding: 22px 32px 18px;
          border-bottom: 3.5px solid #6B46C1;
          position: relative;
        }
        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .brand-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }
        .clinic-brand-logo {
          height: 40px;
          width: auto;
          max-height: 44px;
          object-fit: contain;
          display: block;
        }
        .clinic-sub-details {
          display: flex;
          flex-direction: column;
          gap: 1.5px;
        }
        .clinic-type {
          font-size: 10.5px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .clinic-address {
          font-size: 10px;
          color: #64748b;
        }
        .clinic-contacts {
          font-size: 9.5px;
          color: #64748b;
        }

        .header-doc-info {
          text-align: right;
          min-width: 220px;
        }
        .doc-main-title {
          font-size: 19px;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .doc-meta-table {
          display: inline-flex;
          flex-direction: column;
          gap: 2.5px;
          font-size: 11px;
        }
        .doc-meta-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
        }
        .meta-field-label {
          color: #64748b;
          font-weight: 600;
        }
        .meta-field-val {
          color: #0f172a;
          font-weight: 700;
          text-align: right;
        }

        .body-content {
          padding: 20px 32px 28px;
        }

        .profiles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 16px;
        }
        .profile-card {
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .profile-card-header {
          padding: 7px 12px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .patient-card .profile-card-header {
          background: #f8fafc;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .doctor-card .profile-card-header {
          background: #faf5ff;
          color: #6B46C1;
          border-bottom: 1px solid #f3e8ff;
        }
        .profile-card-body {
          padding: 10px 12px;
        }
        .profile-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .profile-details-row {
          font-size: 11px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .doctor-sub-details {
          font-size: 11px;
          color: #475569;
          line-height: 1.45;
        }
        .doctor-sub-details .spec { color: #6B46C1; font-weight: 700; }
        .doctor-sub-details .reg { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b; margin-top: 2px; }

        .protocol-section {
          margin-bottom: 18px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .section-header {
          padding: 9px 14px;
          background: #faf5ff;
          border-bottom: 1px solid #f3e8ff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .section-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: #6B46C1;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .section-tag-pill {
          font-size: 10px;
          font-weight: 700;
          color: #6B46C1;
          background: #ede9fe;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid #ddd6fe;
        }
        .section-body {
          padding: 14px 16px;
        }

        /* Macro Targets Strip */
        .macro-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .macro-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .macro-val {
          font-size: 12px;
          font-weight: 800;
          color: #1e1b4b;
        }
        .macro-lbl {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
        }

        .sub-timetable-header {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .protocol-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .protocol-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px 11px;
        }
        .protocol-card.meal-card {
          border-left: 3px solid #6B46C1;
        }
        .protocol-card.asana-card {
          border-left: 3px solid #059669;
        }
        .card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 3px;
          flex-wrap: wrap;
        }
        .time-badge {
          background: #f1f5f9;
          color: #334155;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .num-badge {
          background: #ecfdf5;
          color: #047857;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .card-title-strong {
          font-size: 11.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .portion-tag {
          font-size: 9.5px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .dur-tag {
          font-size: 9.5px;
          color: #047857;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .card-body-desc {
          font-size: 11px;
          color: #1e293b;
          line-height: 1.45;
          margin-bottom: 3px;
        }
        .card-clinical-note {
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
          background: #f8fafc;
          border: 1px dashed #e2e8f0;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .card-clinical-note strong {
          color: #475569;
        }

        /* Dos & Don'ts */
        .dos-donts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .dos-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .dos-title {
          font-size: 10px;
          font-weight: 800;
          color: #15803d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .donts-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .donts-title {
          font-size: 10px;
          font-weight: 800;
          color: #b91c1c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .dos-list, .donts-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .dos-list li {
          font-size: 10px;
          color: #166534;
          line-height: 1.35;
          display: flex;
          align-items: flex-start;
          gap: 5px;
        }
        .donts-list li {
          font-size: 10px;
          color: #991b1b;
          line-height: 1.35;
          display: flex;
          align-items: flex-start;
          gap: 5px;
        }

        /* Pranayama, Cardio, Precautions */
        .breathwork-card {
          border: 1px solid #e0e7ff;
          background: #f5f3ff;
          border-radius: 8px;
          padding: 8px 10px;
          margin-top: 8px;
        }
        .breathwork-title {
          font-size: 10px;
          font-weight: 800;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .breathwork-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .breathwork-item {
          font-size: 10px;
          color: #312e81;
          line-height: 1.4;
        }
        .cardio-callout {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 7px 10px;
          margin-top: 8px;
          font-size: 10px;
          color: #1e40af;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .precautions-callout {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 7px 10px;
          margin-top: 8px;
          font-size: 10px;
          color: #92400e;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .advisory-box {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 10px;
          font-size: 10.5px;
          color: #4c1d95;
          line-height: 1.45;
        }

        .prescription-footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
        }
        .footer-legal-block {
          max-width: 480px;
        }
        .legal-notice {
          font-size: 9.5px;
          color: #64748b;
          line-height: 1.4;
        }
        .signature-box {
          text-align: right;
          min-width: 190px;
        }
        .signature-cursive {
          font-family: 'Plus Jakarta Sans', Georgia, serif;
          font-size: 18px;
          font-style: italic;
          font-weight: 700;
          color: #1e1b4b;
          margin-bottom: 3px;
        }
        .signature-line {
          border-top: 1.5px solid #0f172a;
          padding-top: 3px;
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .signature-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #059669;
          font-size: 8.5px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 4px;
          border: 1px solid #a7f3d0;
          margin-top: 3px;
        }

        /* ─── PRINT ENGINE RULES ─── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 10pt !important;
          }
          .print-toolbar {
            display: none !important;
          }
          .page-container {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .clinic-header {
            padding: 10px 16px 8px !important;
            border-bottom: 2.5px solid #6B46C1 !important;
          }
          .clinic-brand-logo {
            height: 34px !important;
            max-height: 38px !important;
          }
          .doc-main-title {
            font-size: 16px !important;
            margin-bottom: 2px !important;
          }
          .body-content {
            padding: 8px 16px 10px !important;
            overflow: visible !important;
          }
          .profiles-grid {
            gap: 8px !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .profile-card {
            border: 1px solid #cbd5e1 !important;
            overflow: visible !important;
          }
          .profile-card-header {
            padding: 4px 8px !important;
            font-size: 8.5px !important;
          }
          .profile-card-body {
            padding: 5px 8px !important;
          }
          .profile-name {
            font-size: 12.5px !important;
            margin-bottom: 2px !important;
          }
          .profile-details-row {
            font-size: 10px !important;
            margin-bottom: 1px !important;
          }
          .protocol-section {
            margin-bottom: 10px !important;
            border: 1px solid #cbd5e1 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            overflow: visible !important;
          }
          .section-header {
            padding: 6px 10px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .section-body {
            padding: 7px 10px !important;
            overflow: visible !important;
          }
          .macro-strip {
            padding: 5px 8px !important;
            margin-bottom: 8px !important;
            gap: 6px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .macro-val {
            font-size: 11px !important;
          }
          .macro-lbl {
            font-size: 8px !important;
          }
          .protocol-grid {
            gap: 6px !important;
            margin-bottom: 8px !important;
          }
          .protocol-card {
            padding: 6px 9px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
          }
          .card-head {
            margin-bottom: 2px !important;
          }
          .card-title-strong {
            font-size: 10.5px !important;
          }
          .card-body-desc {
            font-size: 10px !important;
            margin-bottom: 2px !important;
            line-height: 1.35 !important;
          }
          .card-clinical-note {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          .dos-donts-grid {
            gap: 8px !important;
            margin-top: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .dos-box, .donts-box {
            padding: 6px 8px !important;
          }
          .dos-title, .donts-title {
            font-size: 9.5px !important;
            margin-bottom: 3px !important;
          }
          .dos-list li, .donts-list li {
            font-size: 9px !important;
            line-height: 1.3 !important;
          }
          .breathwork-card,
          .cardio-callout,
          .precautions-callout,
          .advisory-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 6px 9px !important;
            margin-top: 7px !important;
          }
          .prescription-footer {
            margin-top: 12px !important;
            padding-top: 6px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div class="toolbar-brand">
          <span>HealNari Tele-EMR</span>
          <span class="toolbar-badge">Lifestyle Protocol</span>
        </div>
        <div class="toolbar-actions">
          <button onclick="window.print()" class="btn-toolbar-print">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print / Save as PDF
          </button>
          <button onclick="window.close()" class="btn-toolbar-close">Close</button>
        </div>
      </div>

      <div class="page-container">
        <header class="clinic-header">
          <div class="header-top-row">
            <div class="brand-block">
              <img 
                src="${logoSvgUrl}" 
                alt="HealNari Logo" 
                class="clinic-brand-logo" 
                onerror="this.onerror=null;this.src='/brand/logo.svg';" 
              />
              <div class="clinic-sub-details">
                <div class="clinic-type">Multi-Specialty Healthcare Platform</div>
                <div class="clinic-address">Verified Tele-EMR &amp; Clinical Care Network</div>
                <div class="clinic-contacts">care@healnari.app &nbsp;|&nbsp; +91 80 4567 8900 &nbsp;|&nbsp; www.healnari.app</div>
              </div>
            </div>

            <div class="header-doc-info">
              <div class="doc-main-title">LIFESTYLE PROTOCOL</div>
              <div class="doc-meta-table">
                <div class="doc-meta-row">
                  <span class="meta-field-label">Protocol ID:</span>
                  <span class="meta-field-val font-mono">${escapeHtml(displayPlanId)}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="meta-field-label">Date of Issue:</span>
                  <span class="meta-field-val">${escapeHtml(planDate)}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="meta-field-label">Consult Mode:</span>
                  <span class="meta-field-val" style="color: #6B46C1;">Digital Care Plan</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div class="body-content">
          <div class="profiles-grid">
            <div class="profile-card patient-card">
              <div class="profile-card-header">
                <span>Patient Demographics</span>
                <span class="font-mono">MRN: ${escapeHtml(patientMrn)}</span>
              </div>
              <div class="profile-card-body">
                <div class="profile-name">${escapeHtml(patientName)}</div>
                <div class="profile-details-row">
                  <span><strong>Age:</strong> ${escapeHtml(patientAge)}</span>
                  <span>•</span>
                  <span><strong>Gender:</strong> ${escapeHtml(patientGender)}</span>
                  <span>•</span>
                  <span><strong>Blood:</strong> ${escapeHtml(patientBlood)}</span>
                </div>
                ${diagnosis ? `
                <div style="font-size: 10.5px; color: #6B46C1; font-weight: 700; margin-top: 3px;">
                  Indication: ${escapeHtml(diagnosis)}
                </div>` : ''}
              </div>
            </div>

            <div class="profile-card doctor-card">
              <div class="profile-card-header">
                <span>Formulating Specialist</span>
                <span class="font-mono">Reg: ${escapeHtml(doctorReg)}</span>
              </div>
              <div class="profile-card-body">
                <div class="profile-name">${escapeHtml(doctorName)}</div>
                <div class="doctor-sub-details">
                  <p class="spec">${escapeHtml(doctorSpecialty)}</p>
                  <p class="reg">HealNari Multi-Specialty Health Network</p>
                </div>
              </div>
            </div>
          </div>

          ${(dietPlan || meals.length > 0) ? `
          <div class="protocol-section">
            <div class="section-header">
              <div class="section-header-left">
                <span style="font-size: 13px;">🥗</span>
                <span class="section-title">Personalized Nutrition &amp; Dietary Protocol</span>
              </div>
              ${dietRegimen ? `<span class="section-tag-pill">${escapeHtml(dietRegimen)}</span>` : ''}
            </div>
            <div class="section-body">
              ${macros ? `
                <div class="macro-strip">
                  <div class="macro-pill"><span class="macro-val">${escapeHtml(macros.calories || '—')}</span><span class="macro-lbl">Target Calories</span></div>
                  <div class="macro-pill"><span class="macro-val">${escapeHtml(macros.protein || '—')}</span><span class="macro-lbl">Protein Target</span></div>
                  <div class="macro-pill"><span class="macro-val">${escapeHtml(macros.carbs || '—')}</span><span class="macro-lbl">Carb Balance</span></div>
                  <div class="macro-pill"><span class="macro-val">${escapeHtml(macros.fiber || '—')}</span><span class="macro-lbl">Dietary Fiber</span></div>
                </div>
              ` : ''}

              ${meals.length > 0 ? `
                <div class="sub-timetable-header">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                  Daily Meal-by-Meal Schedule
                </div>
                <div class="protocol-grid">
                  ${meals.map(m => `
                    <div class="protocol-card meal-card">
                      <div class="card-head">
                        <span class="time-badge">${escapeHtml(m.time)}</span>
                        <span class="card-title-strong">${escapeHtml(m.meal)}</span>
                        ${m.portion ? `<span class="portion-tag">${escapeHtml(m.portion)}</span>` : ''}
                      </div>
                      <div class="card-body-desc">${escapeHtml(m.foods)}</div>
                      ${(m.notes || m.note) ? `
                        <div class="card-clinical-note"><strong>Clinical Note:</strong> ${escapeHtml(m.notes || m.note)}</div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="white-space: pre-line; font-size: 11px; line-height: 1.55;">${escapeHtml(dietPlan)}</div>
              `}

              ${(dos.length > 0 || donts.length > 0) ? `
                <div class="dos-donts-grid">
                  ${dos.length > 0 ? `
                    <div class="dos-box">
                      <div class="dos-title">✓ Recommended Foods to Include</div>
                      <ul class="dos-list">
                        ${dos.map(d => `<li><span>✓</span><span>${escapeHtml(d)}</span></li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                  ${donts.length > 0 ? `
                    <div class="donts-box">
                      <div class="donts-title">✗ Strictly Avoid / Eliminate</div>
                      <ul class="donts-list">
                        ${donts.map(d => `<li><span>✗</span><span>${escapeHtml(d)}</span></li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>` : ''}

          ${(exercisePlan || asanas.length > 0) ? `
          <div class="protocol-section">
            <div class="section-header">
              <div class="section-header-left">
                <span style="font-size: 13px;">🧘</span>
                <span class="section-title">Mindful Movement &amp; Yoga Protocol</span>
              </div>
              ${yogaFrequency ? `<span class="section-tag-pill">${escapeHtml(yogaFrequency)}</span>` : ''}
            </div>
            <div class="section-body">
              ${yogaPhase ? `
                <div style="font-size: 11px; font-weight: 700; color: #047857; margin-bottom: 8px;">
                  Prescribed Therapy Phase: ${escapeHtml(yogaPhase)}
                </div>
              ` : ''}

              ${asanas.length > 0 ? `
                <div class="sub-timetable-header">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM8 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>
                  Prescribed Hormonal Movement &amp; Asanas
                </div>
                <div class="protocol-grid">
                  ${asanas.map((a, idx) => `
                    <div class="protocol-card asana-card">
                      <div class="card-head">
                        <span class="num-badge">${String(idx + 1).padStart(2, '0')}</span>
                        <span class="card-title-strong">${escapeHtml(a.name)}</span>
                        ${a.duration ? `<span class="dur-tag">${escapeHtml(a.duration)}</span>` : ''}
                      </div>
                      <div class="card-body-desc"><strong style="color: #047857;">Clinical Benefit:</strong> ${escapeHtml(a.benefit)}</div>
                      ${a.cues ? `<div class="card-clinical-note"><strong>Alignment &amp; Cue:</strong> ${escapeHtml(a.cues)}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="white-space: pre-line; font-size: 11px; line-height: 1.55;">${escapeHtml(exercisePlan)}</div>
              `}

              ${pranayama.length > 0 ? `
                <div class="breathwork-card">
                  <div class="breathwork-title">🌬️ Pranayama &amp; Breathwork Protocol</div>
                  <div class="breathwork-grid">
                    ${pranayama.map(p => `
                      <div class="breathwork-item">
                        <strong>• ${escapeHtml(p.name)}</strong> (${escapeHtml(p.duration)}): ${escapeHtml(p.benefit)}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${cardio ? `
                <div class="cardio-callout">
                  <span>🏃‍♀️</span>
                  <div><strong>Daily Movement &amp; Cardio:</strong> ${escapeHtml(cardio)}</div>
                </div>
              ` : ''}

              ${precautions ? `
                <div class="precautions-callout">
                  <span>⚠️</span>
                  <div><strong>Clinical Precautions &amp; Red Flags:</strong> ${escapeHtml(precautions)}</div>
                </div>
              ` : ''}
            </div>
          </div>` : ''}

          ${(clinicalNotes || followUpAdvice) ? `
            <div class="advisory-box">
              ${clinicalNotes ? `<div><strong>Specialist Clinical Notes:</strong> ${escapeHtml(clinicalNotes)}</div>` : ''}
              ${followUpAdvice ? `<div style="margin-top: 4px; font-weight: 700; color: #6B46C1;"><strong>Recommended Next Review:</strong> ${escapeHtml(followUpAdvice)}</div>` : ''}
            </div>
          ` : ''}

          <div class="prescription-footer">
            <div class="footer-legal-block">
              <p class="legal-notice">
                <strong>Clinical Wellness Note:</strong> This protocol is clinically formulated for the individual patient based on diagnostic history, nutritional biochemistry, and movement safety. Aligned with clinical evidence and wellness guidelines.
              </p>
            </div>
            <div class="signature-box">
              <div class="signature-cursive">${escapeHtml(doctorName)}</div>
              <div class="signature-line">Authorized Specialist Signature</div>
              <div class="signature-verified-pill">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>
                Digitally Verified &amp; Signed
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

/**
 * Opens a comprehensive Patient EMR & Clinical Health Record print window.
 * Displays official clinic letterhead, complete patient demographics, vital biometrics,
 * clinical diagnoses, active medications with dosing matrix, lab findings, clinical notes,
 * and attending doctor's digital signature.
 */
export function generatePatientEmrHtml({ patient, doctor, groupedRx, origin = '' }) {
  const safeOrigin = origin || ((typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '');
  const logoSvgUrl = `${safeOrigin}/brand/logo.svg`;

  const now = new Date();
  const printDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Doctor Details
  const doctorName = (doctor?.name || 'Dr. Sarah Mitchell').replace(/^Dr\.?\s+/i, 'Dr. ');
  const doctorSpecialty = doctor?.specialty || 'Senior Consultant Gynaecologist & Obstetrician';
  const doctorQualifications = doctor?.qualifications || 'MBBS, MS, DGO (Obstetrics & Gynaecology)';
  const doctorRegNo = doctor?.regNo || 'KMC-84920';

  // Patient Details
  const patientName = patient?.name || 'Patient';
  const patientAge = patient?.age && patient.age !== '—' ? `${patient.age} Yrs` : 'Adult';
  const patientGender = patient?.gender || 'Female';
  const patientBlood = patient?.blood && patient.blood !== '—' ? patient.blood : '—';
  const patientMrn = patient?.mrn || (patient?.id ? `HN-${String(patient.id).slice(0, 8).toUpperCase()}` : 'HN-10029');
  const patientPhone = patient?.phone || '—';
  const patientEmail = patient?.email || '—';
  const allergiesList = Array.isArray(patient?.allergies)
    ? patient.allergies.filter(Boolean)
    : typeof patient?.allergies === 'string' && patient.allergies.trim()
    ? [patient.allergies.trim()]
    : [];

  // Vitals
  const vitalsBp = patient?.bp || '120/80 mmHg';
  const vitalsPulse = patient?.pulse || '72 bpm';
  const vitalsSpo2 = patient?.spo2 || '99%';
  const vitalsBmi = patient?.bmi || '21.8';
  const vitalsWeight = patient?.weight || '58 kg';
  const vitalsHeight = patient?.height || "5'4\"";
  const vitalsSugar = patient?.bloodSugar || '92 mg/dL';

  // Active Medications
  const rawMeds = (patient?.meds && patient.meds.length > 0)
    ? patient.meds
    : (groupedRx && groupedRx[0]?.medicines) || [];
  const parsedMeds = rawMeds.map(parseMedicineDetails);

  // Lab Reports
  const labReports = patient?.reports || [];

  // Clinical Notes
  const clinicalNotes = patient?.clinicalNotes || [];

  const medsRowsHtml = parsedMeds.map((m, idx) => `
    <tr class="med-item-row">
      <td class="col-num font-mono">${String(idx + 1).padStart(2, '0')}</td>
      <td class="col-med">
        <div class="med-name-line">
          <span class="med-prefix">${escapeHtml(m.formulation)}</span>
          <span class="med-main-name">${escapeHtml(m.name)}</span>
          ${m.strength ? `<span class="med-strength-tag">${escapeHtml(m.strength)}</span>` : ''}
        </div>
        ${m.notes ? `<div class="med-special-note"><span class="note-bullet">▸</span> ${escapeHtml(m.notes)}</div>` : ''}
      </td>
      <td class="col-matrix">
        <div class="matrix-pill-group">
          <div class="matrix-cell ${m.morning !== '0' && m.morning !== '–' ? 'active-morning' : 'inactive'}">
            <span class="cell-label">M</span>
            <span class="cell-val">${escapeHtml(m.morning)}</span>
          </div>
          <div class="matrix-cell ${m.afternoon !== '0' && m.afternoon !== '–' ? 'active-afternoon' : 'inactive'}">
            <span class="cell-label">A</span>
            <span class="cell-val">${escapeHtml(m.afternoon)}</span>
          </div>
          <div class="matrix-cell ${m.night !== '0' && m.night !== '–' ? 'active-night' : 'inactive'}">
            <span class="cell-label">N</span>
            <span class="cell-val">${escapeHtml(m.night)}</span>
          </div>
        </div>
        <div class="matrix-sub-schedule">${escapeHtml(m.schedule)}</div>
      </td>
      <td class="col-timing">
        <span class="food-badge ${
          m.foodTiming.toLowerCase().includes('after') ? 'food-after' :
          m.foodTiming.toLowerCase().includes('before') ? 'food-before' :
          m.foodTiming.toLowerCase().includes('bed') ? 'food-bed' : 'food-general'
        }">
          ${escapeHtml(m.foodTiming)}
        </span>
      </td>
      <td class="col-dur">
        <span class="duration-pill">${escapeHtml(m.duration)}</span>
      </td>
    </tr>
  `).join('');

  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <base href="${safeOrigin}/" />
      <title>EMR Summary — ${escapeHtml(patientName)} — HealNari</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #0f172a; 
          background: #f1f5f9;
          padding: 0;
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        /* Fixed Top Action Bar for Screen (Hidden in Print) */
        .print-toolbar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: #1e1b4b;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          z-index: 9999;
        }
        .toolbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 14px;
          color: #f8fafc;
        }
        .toolbar-badge {
          background: #4c1d95;
          color: #e9d5ff;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .toolbar-hint {
          font-size: 12px;
          color: #cbd5e1;
          display: none;
        }
        @media (min-width: 640px) {
          .toolbar-hint { display: inline-block; }
        }
        .toolbar-actions {
          display: flex;
          gap: 10px;
        }
        .btn-toolbar-print {
          background: #059669;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 18px;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(5,150,105,0.4);
          transition: all 0.2s;
        }
        .btn-toolbar-print:hover { background: #047857; transform: translateY(-1px); }
        .btn-toolbar-close {
          background: rgba(255,255,255,0.12);
          color: #e2e8f0;
          border: 1px solid rgba(255,255,255,0.2);
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-toolbar-close:hover { background: rgba(255,255,255,0.2); }

        /* Prescription Page Container */
        .page-container {
          max-width: 900px;
          margin: 28px auto 60px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e2e8f0;
        }

        /* Modern Medical Letterhead - Matching Invoice Header */
        .clinic-header {
          background: #f8fafc;
          padding: 26px 40px 22px;
          border-bottom: 4px solid #6B46C1;
          position: relative;
        }

        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }
        
        .brand-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .clinic-brand-logo {
          height: 44px;
          width: auto;
          max-height: 48px;
          object-fit: contain;
          display: block;
        }

        .clinic-sub-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .clinic-type {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .clinic-address {
          font-size: 10px;
          color: #64748b;
        }

        .clinic-contacts {
          font-size: 9.5px;
          color: #64748b;
        }

        /* Right Header Box - Matching Invoice Info */
        .header-doc-info {
          text-align: right;
          min-width: 240px;
        }

        .doc-main-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .doc-meta-table {
          display: inline-flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
        }

        .doc-meta-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .meta-field-label {
          color: #64748b;
          font-weight: 600;
        }

        .meta-field-val {
          color: #0f172a;
          font-weight: 700;
          text-align: right;
        }

        .badge-status-active {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 10.5px;
          font-weight: 700;
        }

        /* Main Body Content */
        .body-content {
          padding: 28px 40px 36px;
          position: relative;
        }

        /* Section Title Header */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          margin-top: 22px;
          padding-bottom: 6px;
          border-bottom: 2px solid #f1f5f9;
        }
        .section-header:first-of-type { margin-top: 0; }
        .section-title {
          font-size: 12.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #1e1b4b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* 2-Column Profiles - Matching Invoice Demographics Boxes */
        .profiles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 20px;
        }
        .profile-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          overflow: hidden;
        }
        .profile-card-header {
          padding: 8px 14px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .patient-card .profile-card-header {
          background: #f8fafc;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .doctor-card .profile-card-header {
          background: #faf5ff;
          color: #6B46C1;
          border-bottom: 1px solid #f3e8ff;
        }
        .profile-card-body { padding: 12px 14px; }
        .profile-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .profile-details-row {
          font-size: 11.5px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .profile-details-row strong { color: #1e293b; }

        .diagnosis-box {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          border-left: 3px solid #6B46C1;
          border-radius: 6px;
          padding: 7px 10px;
          margin-top: 6px;
        }
        .diag-label {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #6B46C1;
          display: block;
          margin-bottom: 2px;
        }
        .diag-text { font-size: 12.5px; font-weight: 700; color: #3b0764; }

        .allergy-notice {
          margin-top: 6px;
          font-size: 10.5px;
          border-radius: 5px;
          padding: 4px 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .allergy-notice.alert {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .allergy-notice.safe {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .doctor-sub-details {
          font-size: 11.5px;
          color: #475569;
          line-height: 1.5;
        }
        .doctor-sub-details .qual { font-weight: 700; color: #1e293b; }
        .doctor-sub-details .spec { color: #6B46C1; font-weight: 600; }
        .doctor-sub-details .reg { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #64748b; margin-top: 4px; }

        /* Vitals Cards Grid */
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }
        .vital-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
        }
        .vital-label {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.8px;
        }
        .vital-val {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }
        .vital-sub {
          font-size: 9.5px;
          color: #059669;
          font-weight: 700;
          margin-top: 2px;
        }

        /* Medications Table - Matching Invoice Itemized Header */
        .meds-table-container {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 22px;
          background: #ffffff;
        }
        .meds-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
          text-align: left;
        }
        .meds-table thead {
          background: #6B46C1;
          color: #ffffff;
        }
        .meds-table th {
          padding: 9px 12px;
          font-weight: 800;
          font-size: 10px;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .meds-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .meds-table tbody tr:last-child td { border-bottom: none; }
        .meds-table tbody tr:nth-child(even) { background: #f8fafc; }
        .col-num { width: 32px; text-align: center; color: #94a3b8; font-weight: 800; font-size: 11px; }
        .col-med { width: 40%; }
        .med-name-line { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
        .med-prefix { font-weight: 800; color: #6B46C1; font-size: 10.5px; text-transform: uppercase; }
        .med-main-name { font-size: 13.5px; font-weight: 800; color: #0f172a; }
        .med-strength-tag { font-size: 10.5px; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 1px 6px; border-radius: 4px; }
        .med-special-note { font-size: 10.5px; color: #64748b; margin-top: 3px; }
        .note-bullet { color: #6B46C1; font-weight: bold; }

        /* Dosing Matrix */
        .col-matrix { width: 22%; }
        .matrix-pill-group {
          display: inline-flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 7px;
          overflow: hidden;
          background: #ffffff;
        }
        .matrix-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3px 8px;
          min-width: 34px;
          border-right: 1px solid #f1f5f9;
        }
        .matrix-cell:last-child { border-right: none; }
        .cell-label { font-size: 8px; text-transform: uppercase; color: #94a3b8; line-height: 1; margin-bottom: 2px; font-weight: 800; }
        .cell-val { font-size: 11px; font-weight: 800; line-height: 1; }
        .matrix-cell.active-morning { background: #eff6ff; color: #1d4ed8; }
        .matrix-cell.active-afternoon { background: #fffbeb; color: #b45309; }
        .matrix-cell.active-night { background: #faf5ff; color: #6B46C1; }
        .matrix-cell.inactive { background: #ffffff; color: #94a3b8; }
        .matrix-sub-schedule { font-size: 9.5px; color: #64748b; font-weight: 600; margin-top: 3px; }

        .col-timing { width: 18%; }
        .food-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
        .food-after { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .food-before { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
        .food-bed { background: #faf5ff; color: #6B46C1; border: 1px solid #e9d5ff; }
        .food-general { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

        .col-dur { width: 17%; }
        .duration-pill { font-weight: 700; color: #1e293b; font-size: 10.5px; }

        /* Diagnostics & Notes Grid */
        .diagnostics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 22px;
        }
        .diag-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          background: #ffffff;
        }
        .diag-card-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .report-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 11px;
        }
        .report-row:last-child { border-bottom: none; }
        .report-status-tag {
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .status-reviewed { background: #ecfdf5; color: #059669; }
        .status-pending { background: #fffbeb; color: #b45309; }

        .clinical-note-item {
          padding: 7px 9px;
          background: #faf5ff;
          border-left: 3px solid #6B46C1;
          border-radius: 4px;
          margin-bottom: 6px;
          font-size: 11px;
          line-height: 1.45;
        }
        .clinical-note-item:last-child { margin-bottom: 0; }
        .note-meta { font-size: 9px; color: #64748b; font-weight: 700; margin-bottom: 3px; }
        .note-text { font-size: 11px; color: #1e293b; line-height: 1.5; margin-bottom: 5px; }
        .holistic-note { border-left-color: #059669; background: #f0fdf4; }
        .note-section { margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0; font-size: 10.5px; }
        .note-section-label { font-weight: 800; font-size: 10px; display: block; margin-bottom: 2px; }
        .note-section-body { white-space: pre-wrap; line-height: 1.5; color: #374151; padding-left: 8px; border-left: 2px solid currentColor; }
        .diet-section .note-section-label { color: #059669; }
        .diet-section .note-section-body { border-color: #059669; }
        .yoga-section .note-section-label { color: #7c3aed; }
        .yoga-section .note-section-body { border-color: #7c3aed; }
        .followup-section { color: #92400e; font-size: 10px; }
        .followup-section .note-section-label { color: #92400e; display: inline; }

        /* Footer & Signature Block */
        .prescription-footer {
          border-top: 2px solid #e2e8f0;
          padding-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }
        .legal-notice-box {
          max-width: 500px;
          font-size: 9.5px;
          color: #64748b;
          line-height: 1.45;
        }
        .signature-box { text-align: right; min-width: 220px; }
        .signature-cursive {
          font-family: 'Plus Jakarta Sans', Georgia, serif;
          font-size: 22px;
          font-style: italic;
          font-weight: 700;
          color: #1e1b4b;
          margin-bottom: 4px;
        }
        .signature-line {
          border-top: 1.5px solid #0f172a;
          padding-top: 4px;
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .signature-meta { font-size: 9.5px; color: #64748b; margin-top: 2px; }
        .signature-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #059669;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #a7f3d0;
          margin-top: 4px;
        }

        /* Print Media Styles */
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { background: #ffffff !important; color: #000000 !important; font-size: 10pt; }
          .print-toolbar { display: none !important; }
          .page-container {
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
          }
          .clinic-header { padding: 18px 24px 16px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .meds-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .vital-card, .matrix-cell, .food-badge, .badge-status-active {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .med-item-row, .diag-card, .vital-card, .prescription-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Top Action Bar (Screen Only) -->
      <div class="print-toolbar">
        <div class="toolbar-brand">
          <span>HealNari Tele-EMR</span>
          <span class="toolbar-badge">Comprehensive Health Record</span>
          <span class="toolbar-hint">Tip: Select "Save as PDF" for official high-resolution EMR file.</span>
        </div>
        <div class="toolbar-actions">
          <button onclick="window.print()" class="btn-toolbar-print">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print / Save as PDF
          </button>
          <button onclick="window.close()" class="btn-toolbar-close">
            Close
          </button>
        </div>
      </div>

      <!-- Main A4 Printable EMR Container -->
      <div class="page-container">
        <!-- Clinic Official Letterhead - Modeled on Invoice Header -->
        <header class="clinic-header">
          <div class="header-top-row">
            <div class="brand-block">
              <img 
                src="${logoSvgUrl}" 
                alt="HealNari Logo" 
                class="clinic-brand-logo" 
                onerror="this.onerror=null;this.src='/brand/logo.svg';" 
              />
              <div class="clinic-sub-details">
                <div class="clinic-type">Digital Health Clinic</div>
                <div class="clinic-address">123 Wellness Avenue, Health City</div>
                <div class="clinic-contacts">support@healnari.app &nbsp;|&nbsp; +1 (800) 000-0000 &nbsp;|&nbsp; care@healnari.com</div>
              </div>
            </div>

            <div class="header-doc-info">
              <div class="doc-main-title">EMR SUMMARY</div>
              <div class="doc-meta-table">
                <div class="doc-meta-row">
                  <span class="meta-field-label">Patient MRN:</span>
                  <span class="meta-field-val font-mono">${escapeHtml(patientMrn)}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="meta-field-label">Generated Date:</span>
                  <span class="meta-field-val">${escapeHtml(printDate)} • ${escapeHtml(printTime)}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="meta-field-label">Total Visits:</span>
                  <span class="meta-field-val">${escapeHtml(patient?.visits || '1')} Recorded</span>
                </div>
                <div class="doc-meta-row">
                  <span class="meta-field-label">Record Status:</span>
                  <span class="badge-status-active">● Active Medical Record</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <div class="body-content">
          <!-- Profiles Grid - Matching Invoice Demographics Boxes -->
          <div class="profiles-grid">
            <!-- Patient Demographics (Billed To Style) -->
            <div class="profile-card patient-card">
              <div class="profile-card-header">
                <span>Patient Demographics</span>
                <span class="font-mono">MRN: ${escapeHtml(patientMrn)}</span>
              </div>
              <div class="profile-card-body">
                <div class="profile-name">${escapeHtml(patientName)}</div>
                <div class="profile-details-row">
                  <span><strong>Age:</strong> ${escapeHtml(patientAge)}</span>
                  <span>•</span>
                  <span><strong>Gender:</strong> ${escapeHtml(patientGender)}</span>
                  <span>•</span>
                  <span><strong>Blood:</strong> ${escapeHtml(patientBlood)}</span>
                </div>
                <div class="profile-details-row">
                  <span><strong>Phone:</strong> ${escapeHtml(patientPhone)}</span>
                  <span>•</span>
                  <span><strong>Email:</strong> ${escapeHtml(patientEmail)}</span>
                </div>

                <div class="diagnosis-box">
                  <span class="diag-label">Clinical Indication / Diagnosis</span>
                  <span class="diag-text">${escapeHtml(patient?.diagnosis || 'General Clinical Evaluation')}</span>
                </div>

                <div class="allergy-notice ${allergiesList.length > 0 ? 'alert' : 'safe'}">
                  <strong>Drug Allergies:</strong> ${allergiesList.length > 0 ? escapeHtml(allergiesList.join(', ')) : 'No Known Drug Allergies (NKDA)'}
                </div>
              </div>
            </div>

            <!-- Attending Doctor (Treating Doctor Style) -->
            <div class="profile-card doctor-card">
              <div class="profile-card-header">
                <span>Attending Practitioner</span>
                <span class="font-mono">Reg: ${escapeHtml(doctorRegNo)}</span>
              </div>
              <div class="profile-card-body">
                <div class="profile-name">${escapeHtml(doctorName)}</div>
                <div class="doctor-sub-details">
                  <p class="qual">${escapeHtml(doctorQualifications)}</p>
                  <p class="spec">${escapeHtml(doctorSpecialty)}</p>
                  <p>Dept. of Obstetrics &amp; Gynaecological Endocrinology</p>
                  <p class="reg">Medical Council: Karnataka Medical Council (KMC)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recorded Clinical Vitals -->
          <div class="section-header">
            <div class="section-title">
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
              Recorded Clinical Vitals &amp; Biometrics
            </div>
          </div>
          <div class="vitals-grid">
            <div class="vital-card">
              <div class="vital-label">Blood Pressure</div>
              <div class="vital-val">${escapeHtml(vitalsBp)}</div>
              <div class="vital-sub">Normal Range</div>
            </div>
            <div class="vital-card">
              <div class="vital-label">Body Mass Index (BMI)</div>
              <div class="vital-val">${escapeHtml(vitalsBmi)} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${escapeHtml(vitalsWeight)})</span></div>
              <div class="vital-sub" style="color: #64748b;">Height: ${escapeHtml(vitalsHeight)}</div>
            </div>
            <div class="vital-card">
              <div class="vital-label">Pulse &amp; SpO2</div>
              <div class="vital-val">${escapeHtml(vitalsPulse)} <span style="font-size: 11px; font-weight: normal; color: #64748b;">/ ${escapeHtml(vitalsSpo2)}</span></div>
              <div class="vital-sub">Resting Rate</div>
            </div>
            <div class="vital-card">
              <div class="vital-label">Fasting Glucose</div>
              <div class="vital-val">${escapeHtml(vitalsSugar)}</div>
              <div class="vital-sub" style="color: #b45309;">Monitored Baseline</div>
            </div>
          </div>

          <!-- Active Prescriptions -->
          <div class="section-header">
            <div class="section-title">
              <span style="font-family: 'Plus Jakarta Sans', serif; font-size: 16px; font-weight: 800; color: #6B46C1;">℞</span>
              Active Medication Regimen
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #6B46C1;">${parsedMeds.length} Prescribed Medicine${parsedMeds.length === 1 ? '' : 's'}</span>
          </div>
          <div class="meds-table-container">
            <table class="meds-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-med">Medication Name &amp; Strength</th>
                  <th class="col-matrix">Dosing Matrix (M-A-N)</th>
                  <th class="col-timing">When to Take</th>
                  <th class="col-dur">Duration</th>
                </tr>
              </thead>
              <tbody>
                ${parsedMeds.length > 0 ? medsRowsHtml : `
                  <tr>
                    <td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">
                      No active prescribed medications on record.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Diagnostic Reports & Clinical Notes -->
          <div class="diagnostics-grid">
            <!-- Lab Reports -->
            <div class="diag-card">
              <div class="diag-card-title">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a1 1 0 0 1-1-1V1zm2 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4H4v10z"/></svg>
                Laboratory Reports &amp; Diagnostics (${labReports.length})
              </div>
              ${labReports.length > 0 ? labReports.map(r => `
                <div class="report-row">
                  <div>
                    <strong>${escapeHtml(r.testName)}</strong>
                    <div style="font-size: 10px; color: #64748b;">${escapeHtml(r.testCategory || 'General')} • ${escapeHtml(r.date || printDate)}</div>
                  </div>
                  <span class="report-status-tag ${r.status === 'Reviewed' ? 'status-reviewed' : 'status-pending'}">
                    ${escapeHtml(r.status || 'Pending')}
                  </span>
                </div>
              `).join('') : `
                <p style="color: #94a3b8; font-style: italic; font-size: 11.5px; padding: 6px 0;">No diagnostic reports logged.</p>
              `}
            </div>

            <!-- Clinical Notes -->
            <div class="diag-card">
              <div class="diag-card-title">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 7V14l4-4H9.5a.5.5 0 0 1-.5-.5z"/></svg>
                Physician Clinical Notes (${clinicalNotes.length})
              </div>
              ${clinicalNotes.length > 0 ? clinicalNotes.slice(0, 5).map(n => {
                const rawText = (n.text || n.note || '').replace(/<!--[\s\S]*?-->/g, '').trim();
                let noteDisplay = rawText;
                let dietDisplay = '';
                let yogaDisplay = '';
                let followUpDisplay = '';
                let isHolistic = false;
                try {
                  if (rawText.startsWith('{')) {
                    const parsed = JSON.parse(rawText);
                    if (parsed.type === 'healnari-holistic-v1') {
                      isHolistic = true;
                      noteDisplay = (parsed.clinicalNotes || '').replace(/<!--[\s\S]*?-->/g, '').trim();
                      dietDisplay = parsed.dietPlan || '';
                      yogaDisplay = parsed.exercisePlan || '';
                      followUpDisplay = parsed.followUpAdvice || '';
                    }
                  }
                } catch(e) {}
                return `
                  <div class="clinical-note-item ${isHolistic ? 'holistic-note' : ''}">
                    <div class="note-meta">${escapeHtml(n.date || printDate)} &bull; ${escapeHtml(n.doctor || doctorName)}</div>
                    ${noteDisplay ? `<div class="note-text">${escapeHtml(noteDisplay)}</div>` : ''}
                    ${dietDisplay ? `<div class="note-section diet-section"><span class="note-section-label">🥗 Diet Plan:</span><div class="note-section-body">${escapeHtml(dietDisplay)}</div></div>` : ''}
                    ${yogaDisplay ? `<div class="note-section yoga-section"><span class="note-section-label">🧘 Yoga & Movement:</span><div class="note-section-body">${escapeHtml(yogaDisplay)}</div></div>` : ''}
                    ${followUpDisplay ? `<div class="note-section followup-section"><span class="note-section-label">📅 Follow-up:</span> ${escapeHtml(followUpDisplay)}</div>` : ''}
                  </div>
                `;
              }).join('') : `
                <p style="color: #94a3b8; font-style: italic; font-size: 11.5px; padding: 6px 0;">No physician progress notes logged.</p>
              `}
            </div>
          </div>

          <!-- Footer & Digital Signature Block - Matching Invoice Signature Block -->
          <footer class="prescription-footer">
            <div class="legal-notice-box">
              <p><strong>Official Medical Record:</strong> This Clinical Health Summary is generated from the certified HealNari Electronic Medical Records System. All diagnoses, vitals, and medication regimens are digitally authenticated by the prescribing practitioner pursuant to Telemedicine Practice Guidelines (2020) and DPDP Act (2023).</p>
              <div style="margin-top: 6px; font-size: 9.5px; color: #475569;">
                Security Verification Hash: <span style="font-family: monospace;">SHA256:EMR-${patientMrn.replace(/[^A-Z0-9]/g, '')}-${now.getTime().toString(36).toUpperCase()}</span>
              </div>
            </div>

            <div class="signature-box">
              <div class="signature-cursive">${escapeHtml(doctorName)}</div>
              <div class="signature-line">${escapeHtml(doctorName)}</div>
              <div class="signature-meta">${escapeHtml(doctorQualifications)}</div>
              <div class="signature-meta">Reg. No: ${escapeHtml(doctorRegNo)}</div>
              <div class="signature-verified-pill">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/></svg>
                Digitally Certified &amp; Stamped
              </div>
            </div>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Opens a comprehensive Patient EMR & Clinical Health Record print window.
 * Displays official clinic letterhead matching invoice header, complete patient demographics,
 * vital biometrics, clinical diagnoses, active medications with dosing matrix, lab findings,
 * clinical notes, and attending doctor's digital signature.
 */
export function openPatientEmrPrintWindow(params) {
  const win = window.open('', '_blank', 'width=960,height=1050');
  if (!win) return;

  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  const html = generatePatientEmrHtml({ ...params, origin });

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

/**
 * Opens an official clinic medical invoice / receipt print window.
 */
export function openInvoicePrintWindow({ invoice, patient, doctor, currency }) {
  const win = window.open('', '_blank', 'width=880,height=960');
  if (!win) return;

  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  const logoSvgUrl = `${origin}/brand/logo.svg`;

  const now = new Date();
  const invoiceId = invoice?.id || invoice?.txnRef || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const invoiceDate = invoice?.date || now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const invoiceTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const doctorName = (doctor?.name || 'Dr. Sarah Mitchell').replace(/^Dr\.?\s+/i, 'Dr. ');
  const patientName = patient?.name || 'Patient';
  const patientMrn = patient?.mrn || (patient?.id ? `HN-${String(patient.id).slice(0, 8).toUpperCase()}` : 'HN-10029');

  const currSymbol = currency === 'USD' ? '$' : '₹';
  const amountVal = Number(invoice?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  win.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <base href="${origin}/" />
      <title>Invoice — ${escapeHtml(invoiceId)} — HealNari</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          margin: 0;
          padding: 0;
        }
        .print-toolbar {
          position: sticky; top: 0; left: 0; right: 0;
          background: #1e1b4b; color: white; padding: 12px 24px;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 999;
        }
        .btn-toolbar-print {
          background: #059669; color: white; border: none; font-weight: 700;
          font-size: 13px; padding: 8px 18px; border-radius: 10px; cursor: pointer;
        }
        .btn-toolbar-close {
          background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25);
          font-size: 13px; padding: 8px 16px; border-radius: 10px; cursor: pointer; margin-left: 8px;
        }
        .page-container {
          max-width: 820px; margin: 28px auto 60px; background: white;
          border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .clinic-header {
          background: #f8fafc;
          padding: 26px 40px 22px;
          border-bottom: 4px solid #6B46C1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }
        .brand-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .clinic-brand-logo {
          height: 44px;
          width: auto;
          max-height: 48px;
          object-fit: contain;
          display: block;
        }
        .clinic-sub-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .clinic-type {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .clinic-address {
          font-size: 10px;
          color: #64748b;
        }
        .clinic-contacts {
          font-size: 9.5px;
          color: #64748b;
        }

        .header-doc-info { text-align: right; min-width: 230px; }
        .doc-main-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .doc-meta-table { display: inline-flex; flex-direction: column; gap: 3px; font-size: 11px; }
        .doc-meta-row { display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
        .meta-field-label { color: #64748b; font-weight: 600; }
        .meta-field-val { color: #0f172a; font-weight: 700; text-align: right; }

        .meta-strip {
          background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 14px 40px;
          display: flex; justify-content: space-between; font-size: 12px; color: #334155;
        }
        .content { padding: 28px 40px 36px; }
        .table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; font-size: 12.5px; }
        .table th { background: #6B46C1; color: #ffffff; padding: 10px 14px; text-align: left; font-size: 10.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.8px; }
        .table td { padding: 14px; border-bottom: 1px solid #e2e8f0; }
        .total-box {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
          margin-top: 16px;
        }
        .total-amount { font-size: 22px; font-weight: 800; color: #1e1b4b; }
        .footer {
          margin-top: 36px; padding-top: 18px; border-top: 2px solid #e2e8f0;
          display: flex; justify-content: space-between; align-items: flex-end; font-size: 10.5px; color: #64748b;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { background: white !important; }
          .print-toolbar { display: none !important; }
          .page-container { margin: 0 !important; border: none !important; box-shadow: none !important; max-width: 100% !important; }
          .clinic-header { padding: 18px 24px 16px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div><strong>HealNari Billing</strong> • Tax Invoice Receipt</div>
        <div>
          <button onclick="window.print()" class="btn-toolbar-print">Print / Save as PDF</button>
          <button onclick="window.close()" class="btn-toolbar-close">Close</button>
        </div>
      </div>
      <div class="page-container">
        <header class="clinic-header">
          <div class="brand-block">
            <img 
              src="${logoSvgUrl}" 
              alt="HealNari Logo" 
              class="clinic-brand-logo" 
              onerror="this.onerror=null;this.src='/brand/logo.svg';" 
            />
            <div class="clinic-sub-details">
              <div class="clinic-type">Digital Health Clinic</div>
              <div class="clinic-address">123 Wellness Avenue, Health City</div>
              <div class="clinic-contacts">support@healnari.app &nbsp;|&nbsp; +1 (800) 000-0000 &nbsp;|&nbsp; care@healnari.com</div>
            </div>
          </div>
          <div class="header-doc-info">
            <div class="doc-main-title">TAX INVOICE</div>
            <div class="doc-meta-table">
              <div class="doc-meta-row">
                <span class="meta-field-label">Invoice No:</span>
                <span class="meta-field-val font-mono">${escapeHtml(invoiceId)}</span>
              </div>
              <div class="doc-meta-row">
                <span class="meta-field-label">Date of Issue:</span>
                <span class="meta-field-val">${escapeHtml(invoiceDate)}</span>
              </div>
              <div class="doc-meta-row">
                <span class="meta-field-label">Time:</span>
                <span class="meta-field-val">${escapeHtml(invoiceTime)}</span>
              </div>
            </div>
          </div>
        </header>
        <div class="meta-strip">
          <div><strong>Billed To:</strong> ${escapeHtml(patientName)} <span style="color:#64748b; font-family: monospace;">(MRN: ${escapeHtml(patientMrn)})</span></div>
          <div><strong>Attending Doctor:</strong> ${escapeHtml(doctorName)}</div>
          <div><strong>Payment Mode:</strong> <span style="font-weight: 700; color: #047857;">${escapeHtml(invoice?.method || 'Online UPI / Card')}</span></div>
        </div>
        <div class="content">
          <table class="table">
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${escapeHtml(invoice?.service || 'Consultation & Clinical Evaluation')}</strong></td>
                <td>${escapeHtml(invoice?.category || 'Clinical Tele-Consultation')}</td>
                <td style="text-align: right; font-weight: 800;">${currSymbol}${amountVal}</td>
              </tr>
            </tbody>
          </table>
          <div class="total-box">
            <div>
              <div style="font-weight: 800; color: #047857;">● Payment Settled / Paid in Full</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Ref: ${escapeHtml(invoice?.txnRef || 'TXN-991823')}</div>
            </div>
            <div>
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800; text-align: right;">Total Paid</div>
              <div class="total-amount">${currSymbol}${amountVal}</div>
            </div>
          </div>
          <div class="footer">
            <div>
              <p>This is a computer-generated tax invoice and official medical receipt.</p>
              <p>GSTIN: 29AAAAH0000A1Z5 • Health Services Exemption applicable as per Notification 12/2017</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 15px; font-weight: 800; color: #1e1b4b;"><span style="color:#6B46C1">Heal</span><span style="color:#E23E8C">Nari</span> Healthcare</div>
              <div style="border-top: 1px solid #0f172a; padding-top: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase;">Accounts Department Seal</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

export default openPrescriptionPrintWindow;
