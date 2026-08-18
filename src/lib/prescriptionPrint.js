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
export function openPrescriptionPrintWindow({ rxId, date, doctor, patient, diagnosis, medicines, labTests, instructions, handwrittenImage }) {
  const win = window.open('', '_blank', 'width=800,height=960');
  if (!win) return;

  const doctorMeta = [doctor?.specialty, doctor?.regNo ? `Reg. No. ${doctor.regNo}` : null].filter(Boolean).join(' &middot; ');
  const patientMeta = [patient?.age ? `${patient.age} yrs` : null, patient?.gender].filter(Boolean).join(', ');

  const medsHtml = (medicines || []).map((m, i) => `
    <div class="med-row">
      <div class="med-num">0${i + 1}</div>
      <div class="med-body">
        <div class="med-name">${escapeHtml(m.name)}</div>
        <div class="med-detail">
          <span class="med-schedule">${escapeHtml(formatSchedule(m.schedule))}</span>
          ${m.duration ? `<span class="med-duration">&middot; ${escapeHtml(m.duration)}</span>` : ''}
        </div>
      </div>
    </div>`).join('');

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Prescription — ${escapeHtml(patient?.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
        
        * { box-sizing: border-box; }
        body { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          color: #1e293b; 
          padding: 0; 
          margin: 0 auto; 
          background: #f8fafc;
        }
        
        .page-container {
          max-width: 800px;
          margin: 40px auto;
          position: relative;
          background: #ffffff;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        /* Top Banner */
        .banner {
          background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%);
          color: white;
          padding: 45px 55px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        
        .banner::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background-image: radial-gradient(circle at 100% 0%, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }

        .brand-col { max-width: 55%; position: relative; z-index: 1; }
        .brand-logo-text { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1; }
        .clinic-line { font-size: 14px; font-weight: 600; color: #d8b4fe; letter-spacing: 1.5px; text-transform: uppercase; }
        .clinic-address { font-size: 12px; color: #e2e8f0; margin-top: 10px; line-height: 1.6; opacity: 0.9; }
        
        .doc-col { max-width: 45%; text-align: right; position: relative; z-index: 1; }
        .doctor-name { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
        .doctor-meta { font-size: 14px; color: #c4b5fd; line-height: 1.5; font-weight: 500; }

        .content { padding: 55px; position: relative; background: #ffffff; }
        
        /* Rx Watermark */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Playfair Display', serif;
          font-size: 500px;
          font-weight: 700;
          color: #8b5cf6;
          opacity: 0.02;
          z-index: 0;
          pointer-events: none;
        }

        /* Meta Info Grid */
        .meta-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
          padding-bottom: 20px;
          border-bottom: 2px dashed #f1f5f9;
        }

        .meta-item { display: flex; flex-direction: column; gap: 6px; }
        .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 800; }
        .meta-value { font-size: 15px; font-weight: 700; color: #0f172a; }
        
        /* Patient Box */
        .patient-box {
          display: flex;
          background: linear-gradient(to right, #f8fafc, #ffffff);
          border-left: 4px solid #8b5cf6;
          border-radius: 0 16px 16px 0;
          padding: 28px 32px;
          margin-bottom: 50px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          position: relative;
          z-index: 1;
        }
        .patient-box > div { flex: 1; border-right: 2px solid #f1f5f9; padding-right: 32px; }
        .patient-box > div:last-child { border-right: none; padding-right: 0; padding-left: 32px; }
        
        .patient-name { font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 6px; letter-spacing: -0.3px; }
        .patient-details { font-size: 15px; color: #64748b; font-weight: 500; }
        .diagnosis-val { font-size: 17px; font-weight: 700; color: #4c1d95; margin-top: 8px; line-height: 1.4; }

        /* Medicines List */
        .rx-symbol { 
          font-family: 'Playfair Display', serif;
          font-size: 48px; 
          font-weight: 700; 
          color: #1e1b4b; 
          margin-bottom: 35px; 
          position: relative; 
          z-index: 1; 
          line-height: 1;
        }
        .meds { position: relative; z-index: 1; margin-bottom: 50px; }
        
        .med-row {
          display: flex;
          gap: 25px;
          padding: 22px 28px;
          margin-bottom: 16px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .med-row:nth-child(even) { background: #fafaf9; }
        
        .med-num { 
          font-weight: 900; 
          color: #e2e8f0; 
          font-size: 26px;
          width: 40px;
          text-align: right;
          line-height: 1;
        }
        .med-body { flex: 1; }
        .med-name { font-weight: 800; font-size: 18px; color: #0f172a; margin-bottom: 10px; letter-spacing: -0.2px; }
        .med-detail { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .med-schedule { background: #ede9fe; border: 1px solid #ddd6fe; padding: 6px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #5b21b6; }
        .med-duration { font-size: 14px; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 10px; }
        .med-duration::before { content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: #cbd5e1; }

        /* Instructions & Labs */
        .instructions-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        
        .callout-box {
          border-radius: 16px;
          padding: 28px;
          position: relative;
          z-index: 1;
        }
        
        .labs-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-left: 6px solid #22c55e;
        }
        
        .notes-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 6px solid #f59e0b;
        }

        .callout-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; margin-bottom: 14px; }
        .labs-box .callout-title { color: #166534; }
        .notes-box .callout-title { color: #92400e; }
        
        .callout-content { font-size: 15px; line-height: 1.6; font-weight: 500; }
        .labs-box .callout-content { color: #14532d; }
        .notes-box .callout-content { color: #78350f; }
        
        .callout-content ul { margin: 0; padding-left: 20px; }
        .callout-content li { margin-bottom: 8px; }
        .callout-content li:last-child { margin-bottom: 0; }

        /* Footer */
        .footer {
          margin-top: 70px;
          padding-top: 40px;
          border-top: 2px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative;
          z-index: 1;
        }
        
        .disclaimer-box { max-width: 420px; }
        .disclaimer { font-size: 13px; color: #64748b; line-height: 1.6; font-weight: 500; }
        .disclaimer strong { color: #0f172a; font-weight: 700; }
        
        .sign-box { text-align: center; min-width: 260px; }
        .sign-doc { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: #1e1b4b; margin-bottom: 15px; font-style: italic; }
        .sign-line { border-top: 2px dashed #cbd5e1; padding-top: 14px; font-size: 13px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

        @media print {
          @page { margin: 0; size: auto; }
          body { background: #ffffff; padding: 0; }
          .page-container { margin: 0; border-radius: 0; box-shadow: none; max-width: 100%; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .med-row { break-inside: avoid; }
          .callout-box { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="banner">
          <div class="brand-col">
            <div class="brand-logo-text">HealNari</div>
            <div class="clinic-line">Advanced Telehealth Center</div>
            <div class="clinic-address">123 Wellness Avenue, Health City<br/>support@healnari.com &nbsp;&bull;&nbsp; +91 80000 00000</div>
          </div>
          <div class="doc-col">
            <div class="doctor-name">Dr. ${escapeHtml(doctor?.name)}</div>
            <div class="doctor-meta">${doctorMeta || 'Registered Medical Practitioner'}</div>
          </div>
        </div>

        <div class="content">
          <div class="watermark">&#8478;</div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Date of Consultation</div>
              <div class="meta-value">${escapeHtml(date)}</div>
            </div>
            <div class="meta-item" style="text-align: right;">
              <div class="meta-label">Prescription ID</div>
              <div class="meta-value" style="font-family: monospace; color: #475569; letter-spacing: 0.5px;">${escapeHtml(rxId)}</div>
            </div>
          </div>

          <div class="patient-box">
            <div>
              <div class="meta-label">Patient Details</div>
              <div class="patient-name">${escapeHtml(patient?.name)}</div>
              <div class="patient-details">${patientMeta ? escapeHtml(patientMeta) : 'Telehealth Member'}</div>
            </div>
            <div>
              <div class="meta-label">Clinical Diagnosis</div>
              <div class="diagnosis-val">${escapeHtml(diagnosis || 'General Consultation')}</div>
            </div>
          </div>

          ${handwrittenImage ? `
          <div style="margin: 30px 0; border: 2px solid #f1f5f9; border-radius: 20px; overflow: hidden; background: #faf8f5; padding: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <img src="${handwrittenImage}" alt="Handwritten Clinical Prescription" style="width: 100%; border-radius: 12px; display: block;" />
          </div>` : `
          <div class="rx-symbol">&#8478;</div>
          <div class="meds">${medsHtml}</div>`}

          <div class="instructions-container">
            ${(labTests && labTests.length > 0) ? `
            <div class="callout-box labs-box">
              <div class="callout-title">Suggested Investigations (Labs)</div>
              <div class="callout-content">
                <ul>
                  ${labTests.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                </ul>
              </div>
            </div>` : ''}

            ${instructions ? `
            <div class="callout-box notes-box">
              <div class="callout-title">Special Instructions</div>
              <div class="callout-content">
                ${escapeHtml(instructions)}
              </div>
            </div>` : ''}
          </div>

          <div class="footer">
            <div class="disclaimer-box">
              <div class="disclaimer">
                <strong>Important Note:</strong> This is a digitally generated electronic prescription under the Telemedicine Practice Guidelines. Valid only with the prescribing doctor's e-signature on file. Dispense as written.
              </div>
            </div>
            <div class="sign-box">
              <div class="sign-doc">${escapeHtml(doctor?.name)}</div>
              <div class="sign-line">Digital Signature</div>
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
  }, 500); // Small delay to let Inter font load
}

export function openLifestylePlanPrintWindow({ rxId, date, doctor, patient, dietPlan, exercisePlan }) {
  const win = window.open('', '_blank', 'width=800,height=960');
  if (!win) return;

  const doctorMeta = [doctor?.specialty, doctor?.regNo ? `Reg. No. ${doctor.regNo}` : null].filter(Boolean).join(' &middot; ');
  const patientMeta = [patient?.age ? `${patient.age} yrs` : null, patient?.gender].filter(Boolean).join(', ');

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Lifestyle Protocol — ${escapeHtml(patient?.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
        
        * { box-sizing: border-box; }
        body { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          color: #1e293b; 
          padding: 0; 
          margin: 0 auto; 
          background: #f8fafc;
        }
        
        .page-container {
          max-width: 800px;
          margin: 40px auto;
          position: relative;
          background: #ffffff;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        /* Top Banner */
        .banner {
          background: linear-gradient(135deg, #065f46 0%, #047857 100%);
          color: white;
          padding: 45px 55px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        
        .banner::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background-image: radial-gradient(circle at 100% 0%, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }

        .brand-col { max-width: 55%; position: relative; z-index: 1; }
        .brand-logo-text { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1; }
        .clinic-line { font-size: 14px; font-weight: 600; color: #a7f3d0; letter-spacing: 1.5px; text-transform: uppercase; }
        .clinic-address { font-size: 12px; color: #e2e8f0; margin-top: 10px; line-height: 1.6; opacity: 0.9; }
        
        .doc-col { max-width: 45%; text-align: right; position: relative; z-index: 1; }
        .doctor-name { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
        .doctor-meta { font-size: 14px; color: #6ee7b7; line-height: 1.5; font-weight: 500; }

        .content { padding: 55px; position: relative; background: #ffffff; }
        
        /* Meta Info Grid */
        .meta-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
          padding-bottom: 20px;
          border-bottom: 2px dashed #f1f5f9;
        }

        .meta-item { display: flex; flex-direction: column; gap: 6px; }
        .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 800; }
        .meta-value { font-size: 15px; font-weight: 700; color: #0f172a; }
        
        /* Patient Box */
        .patient-box {
          display: flex;
          background: linear-gradient(to right, #f8fafc, #ffffff);
          border-left: 4px solid #10b981;
          border-radius: 0 16px 16px 0;
          padding: 28px 32px;
          margin-bottom: 50px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          position: relative;
          z-index: 1;
        }
        .patient-box > div { flex: 1; }
        
        .patient-name { font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 6px; letter-spacing: -0.3px; }
        .patient-details { font-size: 15px; color: #64748b; font-weight: 500; }

        /* Protocol Sections */
        .protocol-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px; 
          font-weight: 700; 
          color: #064e3b; 
          margin-bottom: 25px;
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
        }

        .instructions-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        
        .callout-box {
          border-radius: 16px;
          padding: 35px;
          position: relative;
          z-index: 1;
        }
        
        .diet-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-left: 6px solid #22c55e;
        }
        
        .yoga-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 6px solid #f59e0b;
        }

        .callout-title { font-size: 16px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .diet-box .callout-title { color: #166534; }
        .yoga-box .callout-title { color: #92400e; }
        
        .callout-content { font-size: 16px; line-height: 1.8; font-weight: 500; white-space: pre-wrap; }
        .diet-box .callout-content { color: #14532d; }
        .yoga-box .callout-content { color: #78350f; }

        /* Footer */
        .footer {
          margin-top: 70px;
          padding-top: 40px;
          border-top: 2px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative;
          z-index: 1;
        }
        
        .disclaimer-box { max-width: 420px; }
        .disclaimer { font-size: 13px; color: #64748b; line-height: 1.6; font-weight: 500; }
        .disclaimer strong { color: #0f172a; font-weight: 700; }
        
        .sign-box { text-align: center; min-width: 260px; }
        .sign-doc { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: #064e3b; margin-bottom: 15px; font-style: italic; }
        .sign-line { border-top: 2px dashed #cbd5e1; padding-top: 14px; font-size: 13px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

        @media print {
          @page { margin: 0; size: auto; }
          body { background: #ffffff; padding: 0; }
          .page-container { margin: 0; border-radius: 0; box-shadow: none; max-width: 100%; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .callout-box { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="banner">
          <div class="brand-col">
            <div class="brand-logo-text">HealNari</div>
            <div class="clinic-line">Holistic Wellness Protocol</div>
            <div class="clinic-address">123 Wellness Avenue, Health City<br/>support@healnari.com &nbsp;&bull;&nbsp; +91 80000 00000</div>
          </div>
          <div class="doc-col">
            <div class="doctor-name">Dr. ${escapeHtml(doctor?.name)}</div>
            <div class="doctor-meta">${doctorMeta || 'Registered Medical Practitioner'}</div>
          </div>
        </div>

        <div class="content">
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Date of Consultation</div>
              <div class="meta-value">${escapeHtml(date)}</div>
            </div>
            <div class="meta-item" style="text-align: right;">
              <div class="meta-label">Protocol ID</div>
              <div class="meta-value" style="font-family: monospace; color: #475569; letter-spacing: 0.5px;">${escapeHtml(rxId)}</div>
            </div>
          </div>

          <div class="patient-box">
            <div>
              <div class="meta-label">Patient Details</div>
              <div class="patient-name">${escapeHtml(patient?.name)}</div>
              <div class="patient-details">${patientMeta ? escapeHtml(patientMeta) : 'Telehealth Member'}</div>
            </div>
          </div>

          <div class="protocol-title">Personalized Lifestyle Protocol</div>

          <div class="instructions-container">
            ${dietPlan ? `
            <div class="callout-box diet-box">
              <div class="callout-title">🥗 Diet & Nutrition Plan</div>
              <div class="callout-content">${escapeHtml(dietPlan)}</div>
            </div>` : ''}

            ${exercisePlan ? `
            <div class="callout-box yoga-box">
              <div class="callout-title">🧘‍♀️ Yoga & Exercise Protocol</div>
              <div class="callout-content">${escapeHtml(exercisePlan)}</div>
            </div>` : ''}
          </div>

          <div class="footer">
            <div class="disclaimer-box">
              <div class="disclaimer">
                <strong>Important Note:</strong> This protocol is designed to complement your medical treatment. Please consult your physician before making drastic changes.
              </div>
            </div>
            <div class="sign-box">
              <div class="sign-doc">${escapeHtml(doctor?.name)}</div>
              <div class="sign-line">Digital Signature</div>
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
