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
 * Opens a print-ready window styled like a real doctor's prescription pad —
 * letterhead, patient/diagnosis block, Rx-numbered medicine list, signature
 * line — shared by both the doctor's and the patient's "Download PDF" so a
 * prescription looks the same however it's printed.
 */
export function openPrescriptionPrintWindow({ rxId, date, doctor, patient, diagnosis, medicines, instructions }) {
  const win = window.open('', '_blank', 'width=760,height=920');
  if (!win) return;

  const doctorMeta = [doctor?.specialty, doctor?.regNo ? `Reg. No. ${doctor.regNo}` : null].filter(Boolean).join(' &middot; ');
  const patientMeta = [patient?.age ? `${patient.age} yrs` : null, patient?.gender].filter(Boolean).join(', ');

  const medsHtml = (medicines || []).map((m, i) => `
    <div class="med-row">
      <div class="med-num">${i + 1}.</div>
      <div class="med-body">
        <div class="med-name">${escapeHtml(m.name)}</div>
        <div class="med-detail">${escapeHtml(formatSchedule(m.schedule))}${m.duration ? ` &middot; ${escapeHtml(m.duration)}` : ''}</div>
      </div>
    </div>`).join('');

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Prescription — ${escapeHtml(patient?.name)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #1e293b; padding: 40px; max-width: 720px; margin: 0 auto; }
        .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6B46C1; padding-bottom: 16px; margin-bottom: 20px; }
        .brand { font-size: 22px; font-weight: 900; color: #6B46C1; letter-spacing: 0.5px; }
        .clinic-line { font-size: 11px; color: #64748b; margin-top: 2px; }
        .doctor-name { font-size: 16px; font-weight: 700; margin-top: 12px; }
        .doctor-meta { font-size: 11px; color: #64748b; }
        .meta-right { text-align: right; font-size: 12px; color: #475569; white-space: nowrap; }
        .rx-id { font-family: 'Courier New', monospace; color: #94a3b8; font-size: 11px; margin-top: 4px; }
        .patient-box { display: flex; justify-content: space-between; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px; font-size: 13px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
        .rx-symbol { font-size: 30px; font-weight: 900; color: #6B46C1; margin-bottom: 8px; }
        .med-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
        .med-num { font-weight: 700; color: #6B46C1; width: 20px; }
        .med-name { font-weight: 700; font-size: 14px; }
        .med-detail { font-size: 12px; color: #64748b; margin-top: 2px; }
        .instructions { margin-top: 22px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #92400e; }
        .footer { margin-top: 70px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
        .disclaimer { font-size: 10px; color: #94a3b8; max-width: 300px; line-height: 1.5; }
        .sign-line { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 6px; font-size: 11px; color: #475569; white-space: nowrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <div>
          <div class="brand">HealNari</div>
          <div class="clinic-line">Women's Health &amp; Fertility Care</div>
          <div class="doctor-name">Dr. ${escapeHtml(doctor?.name)}</div>
          <div class="doctor-meta">${doctorMeta || 'Registered Medical Practitioner'}</div>
        </div>
        <div class="meta-right">
          <div>${escapeHtml(date)}</div>
          <div class="rx-id">${escapeHtml(rxId)}</div>
        </div>
      </div>

      <div class="patient-box">
        <div>
          <div class="label">Patient</div>
          <div><strong>${escapeHtml(patient?.name)}</strong>${patientMeta ? ` &middot; ${escapeHtml(patientMeta)}` : ''}</div>
        </div>
        <div>
          <div class="label">Diagnosis</div>
          <div><strong>${escapeHtml(diagnosis || 'General')}</strong></div>
        </div>
      </div>

      <div class="rx-symbol">&#8478;</div>
      <div class="meds">${medsHtml}</div>

      ${instructions ? `<div class="instructions"><strong>Instructions:</strong> ${escapeHtml(instructions)}</div>` : ''}

      <div class="footer">
        <div class="disclaimer">Digitally issued via HealNari. Valid only with the prescribing doctor's e-signature on file.</div>
        <div class="sign-line">Dr. ${escapeHtml(doctor?.name)}</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export default openPrescriptionPrintWindow;
