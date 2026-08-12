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
export function openPrescriptionPrintWindow({ rxId, date, doctor, patient, diagnosis, medicines, labTests, instructions }) {
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
        
        * { box-sizing: border-box; }
        body { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          color: #0f172a; 
          padding: 0; 
          margin: 0 auto; 
          background: #ffffff;
        }
        
        .page-container {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        /* Top Banner */
        .banner {
          background-color: #f8fafc;
          border-bottom: 4px solid #6B46C1;
          padding: 40px 50px 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .brand-col { max-width: 60%; }
        .brand { font-size: 32px; font-weight: 900; color: #6B46C1; letter-spacing: -0.5px; margin-bottom: 5px; }
        .clinic-line { font-size: 13px; font-weight: 700; color: #475569; }
        .clinic-address { font-size: 11px; color: #64748b; margin-top: 4px; }
        
        .doc-col { max-width: 40%; text-align: right; }
        .doctor-name { font-size: 18px; font-weight: 800; color: #0f172a; }
        .doctor-meta { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; }

        .content { padding: 40px 50px; position: relative; }
        
        /* Rx Watermark */
        .watermark {
          position: absolute;
          top: 150px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 400px;
          font-weight: 900;
          color: #6B46C1;
          opacity: 0.03;
          z-index: 0;
          pointer-events: none;
        }

        /* Meta Info Grid */
        .meta-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          position: relative;
          z-index: 1;
        }

        .meta-item { margin-bottom: 15px; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
        .meta-value { font-size: 14px; font-weight: 600; color: #0f172a; }
        
        /* Patient & Diagnosis Box */
        .patient-box {
          display: flex;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px 25px;
          margin-bottom: 35px;
          box-shadow: 0 4px 12px rgba(107, 70, 193, 0.03);
          position: relative;
          z-index: 1;
        }
        .patient-box > div { flex: 1; border-right: 1px solid #e2e8f0; padding-right: 20px; }
        .patient-box > div:last-child { border-right: none; padding-right: 0; padding-left: 20px; }
        
        .patient-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .patient-details { font-size: 13px; color: #64748b; }

        /* Medicines List */
        .rx-symbol { font-size: 36px; font-weight: 900; color: #6B46C1; margin-bottom: 20px; position: relative; z-index: 1; }
        .meds { position: relative; z-index: 1; margin-bottom: 40px; }
        
        .med-row {
          display: flex;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid #f1f5f9;
          page-break-inside: avoid;
        }
        .med-row:last-child { border-bottom: none; }
        
        .med-num { 
          font-weight: 800; 
          color: #cbd5e1; 
          font-size: 20px;
          width: 30px;
          text-align: right;
          padding-top: 2px;
        }
        .med-body { flex: 1; }
        .med-name { font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 6px; }
        .med-detail { display: flex; align-items: center; gap: 8px; }
        .med-schedule { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; }
        .med-duration { font-size: 13px; color: #64748b; font-weight: 500; }

        /* Instructions */
        .instructions {
          margin-top: 20px;
          background: #fefce8;
          border: 1px solid #fef08a;
          border-left: 4px solid #eab308;
          border-radius: 8px;
          padding: 16px 20px;
          font-size: 13px;
          line-height: 1.6;
          color: #854d0e;
          position: relative;
          z-index: 1;
        }

        /* Footer */
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative;
          z-index: 1;
        }
        .disclaimer { font-size: 11px; color: #94a3b8; max-width: 350px; line-height: 1.5; font-weight: 500; }
        .sign-box { text-align: center; }
        .sign-line { border-top: 1px dashed #94a3b8; width: 220px; padding-top: 8px; font-size: 12px; color: #475569; font-weight: 600; }
        .sign-doc { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 25px; font-family: 'Playfair Display', serif; font-style: italic; }

        @media print {
          @page { margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .banner { border-bottom-width: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="banner">
          <div class="brand-col">
            <img src="/brand/logo-full.jpg" alt="HealNari" style="height: 38px; margin-bottom: 8px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="brand" style="display: none;">HealNari</div>
            <div class="clinic-line">Digital Health Clinic</div>
            <div class="clinic-address">123 Wellness Avenue, Health City<br/>support@healnari.app | +91 80000 00000</div>
          </div>
          <div class="doc-col">
            <div class="doctor-name">Dr. ${escapeHtml(doctor?.name)}</div>
            <div class="doctor-meta">${doctorMeta || 'Registered Medical Practitioner'}</div>
          </div>
        </div>

        <div class="content">
          <div class="watermark">&#8478;</div>

          <div class="meta-grid">
            <div>
              <div class="meta-item">
                <div class="meta-label">Date of Issue</div>
                <div class="meta-value">${escapeHtml(date)}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="meta-item">
                <div class="meta-label">Prescription ID</div>
                <div class="meta-value" style="font-family: monospace; color: #475569;">${escapeHtml(rxId)}</div>
              </div>
            </div>
          </div>

          <div class="patient-box">
            <div>
              <div class="meta-label">Billed To (Patient)</div>
              <div class="patient-name">${escapeHtml(patient?.name)}</div>
              <div class="patient-details">${patientMeta ? escapeHtml(patientMeta) : 'Telehealth Member'}</div>
            </div>
            <div>
              <div class="meta-label">Clinical Diagnosis</div>
              <div class="meta-value" style="margin-top: 4px;">${escapeHtml(diagnosis || 'General Consultation')}</div>
            </div>
          </div>

          <div class="rx-symbol">&#8478;</div>
          <div class="meds">${medsHtml}</div>

          ${(labTests && labTests.length > 0) ? `
          <div class="instructions" style="background: #f0f9ff; border-color: #bae6fd; border-left-color: #0284c7; margin-bottom: 20px;">
            <div class="meta-label" style="color: #0369a1; margin-bottom: 6px;">Suggested Lab Tests</div>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-weight: 500;">
              ${labTests.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>` : ''}

          ${instructions ? `
          <div class="instructions">
            <div class="meta-label" style="color: #a16207; margin-bottom: 6px;">Special Instructions</div>
            ${escapeHtml(instructions)}
          </div>` : ''}

          <div class="footer">
            <div class="disclaimer">
              <strong>Note:</strong> This is a digitally generated prescription.<br/>
              Valid only with the prescribing doctor's e-signature on file. Dispense as written.
            </div>
            <div class="sign-box">
              <div class="sign-doc">${escapeHtml(doctor?.name)}</div>
              <div class="sign-line">Doctor's Signature</div>
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

export default openPrescriptionPrintWindow;
