import React, { useState, useEffect } from 'react';
import { formatCurrency, getCurrencySymbol } from '../lib/currency.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { generateQrUrl } from '../lib/qrCode.js';

export function DoctorShareModal({ isOpen, onClose, doctor }) {
  const toast = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState('qr'); // 'qr', 'link', 'whatsapp', 'embed'
  const [posterTemplate, setPosterTemplate] = useState('desk'); // 'desk', 'wall', 'cards'

  const doc = doctor || {};
  const docId = doc.id || (doc.name ? doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sarah-mitchell');
  const docName = doc.name || doc.full_name || 'Dr. Sarah Mitchell';
  const docSpecialty = doc.specialty || 'Gynaecologist & Obstetrician';
  const docQual = doc.qualification || doc.qualifications || 'MBBS, MD (OBG)';
  const docReg = doc.regNo || doc.registration_no || doc.mci_number || 'NMC Verified • Reg: 15201';
  const consultFee = doc.consultFee || doc.fee || 799;
  const docCurrency = doc.currency || 'INR';

  // Real doctor photo resolution
  const resolvePhoto = (d) => {
    if (d?.avatar_url) return d.avatar_url;
    if (d?.image) return d.image;
    if (d?.profile_pic) return d.profile_pic;
    const nameStr = (d?.name || d?.full_name || '').toLowerCase();
    if (nameStr.includes('ananya')) return '/generated/doc1.webp';
    if (nameStr.includes('ritu')) return '/generated/doc2.webp';
    if (nameStr.includes('shreya')) return '/generated/doc3.webp';
    return '/generated/doc4.webp';
  };

  const [selectedPhoto, setSelectedPhoto] = useState(() => resolvePhoto(doc));

  useEffect(() => {
    setSelectedPhoto(resolvePhoto(doc));
  }, [doc]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://healnari.care';
  const publicProfileUrl = `${origin}/dr/${docId}`;
  const qrImageUrl = generateQrUrl(publicProfileUrl, 450);

  const photoPresets = [
    { label: 'Dr. Sarah Mitchell', src: '/generated/doc4.webp' },
    { label: 'Dr. Ananya Mehta', src: '/generated/doc1.webp' },
    { label: 'Dr. Ritu Khanna', src: '/generated/doc2.webp' },
    { label: 'Dr. Shreya Verma', src: '/generated/doc3.webp' },
  ];

  const handleCustomPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedPhoto(uploadEvent.target.result);
        toast('Doctor photo updated for print templates!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text, type = 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2500);
      }
      toast('Link copied to clipboard!', 'success');
    }).catch(() => {
      toast('Failed to copy. Please select and copy manually.', 'error');
    });
  };

  const whatsappMessage = encodeURIComponent(
    `Hello! You can view my verified clinical profile and book a direct video consultation with me (${docName} — ${docSpecialty}) on HealNari here:\n\n${publicProfileUrl}\n\n• NMC Verified & HIPAA Compliant\n• Fee: ${formatCurrency(consultFee, docCurrency || 'INR')}\n• Direct digital prescription & follow-up care`
  );

  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  const embedCode = `<a href="${publicProfileUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#6B46C1;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;font-family:sans-serif;font-weight:bold;font-size:14px;box-shadow:0 4px 14px rgba(107,70,193,0.3);">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
  Book Consultation with ${docName}
</a>`;

  const handlePrintTemplate = (templateType = posterTemplate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Please allow popups to print clinical template', 'error');
      return;
    }

    const doctorPhotoUrl = selectedPhoto.startsWith('data:') ? selectedPhoto : `${origin}${selectedPhoto}`;
    const logoFullUrl = `${origin}/brand/logo-full.jpg`;
    const logoIconUrl = `${origin}/brand/logo-icon.jpg`;

    let templateHtml = '';

    if (templateType === 'desk') {
      // ─── TEMPLATE 1: DESK ACRYLIC STAND (A5 / Tabletop) ───
      templateHtml = `
        <div class="desk-container">
          <div class="desk-card">
            
            <!-- HealNari Brand Header -->
            <div class="header-strip">
              <div class="brand-row">
                <img src="${logoIconUrl}" class="logo-mark" alt="Logo" onerror="this.style.display='none'" />
                <span class="brand-title">Heal<span>Nari</span></span>
              </div>
              <div class="verified-pill">● VERIFIED CLINIC</div>
            </div>

            <!-- Doctor Hero with Official Photo -->
            <div class="doc-hero">
              <div class="avatar-box">
                <img src="${doctorPhotoUrl}" class="avatar-img" alt="${docName}" />
                <div class="tick-badge">✓</div>
              </div>
              <h1 class="doc-name">${docName}</h1>
              <p class="doc-qual">${docQual}</p>
              <div class="doc-spec-badge">${docSpecialty}</div>
              <p class="doc-reg">${docReg}</p>
            </div>

            <!-- Scannable QR Frame -->
            <div class="qr-wrapper">
              <div class="qr-box">
                <img src="${qrImageUrl}" class="qr-code" alt="Scan to book appointment" />
              </div>
              <p class="scan-instruction">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B46C1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Scan with Phone Camera to Book
              </p>
              <p class="sub-text">Instant HD video consultation • Digital prescription</p>
            </div>

            <!-- Clinical Trust Safeguards -->
            <div class="trust-grid">
              <div class="trust-item">
                <strong>NMC Verified</strong>
                <span>Direct Specialist Care</span>
              </div>
              <div class="trust-item">
                <strong>HIPAA Aligned</strong>
                <span>256-Bit TLS Video</span>
              </div>
              <div class="trust-item">
                <strong>Instant Token</strong>
                <span>WhatsApp Updates</span>
              </div>
            </div>

            <!-- Footer Practice Link -->
            <div class="footer-url">
              <span>Online Practice:</span>
              <strong>healnari.care/dr/${docId}</strong>
            </div>

          </div>
        </div>
      `;
    } else if (templateType === 'wall') {
      // ─── TEMPLATE 2: WAITING ROOM WALL POSTER (A4) ───
      templateHtml = `
        <div class="wall-container">
          <div class="wall-poster">
            
            <div class="wall-top">
              <div class="brand-row">
                <img src="${logoIconUrl}" class="logo-mark" alt="Logo" onerror="this.style.display='none'" />
                <span class="brand-title">Heal<span>Nari</span> Care Network</span>
              </div>
              <span class="wall-tag">OFFICIAL CLINICAL BOOKING POINT</span>
            </div>

            <div class="wall-hero">
              <h2>Skip the Queue &amp; Book Direct</h2>
              <p class="wall-sub">Schedule your follow-up or online video consultation with your specialist</p>
            </div>

            <div class="wall-doctor-banner">
              <div class="flex items-center gap-4">
                <div class="wall-avatar-box">
                  <img src="${doctorPhotoUrl}" class="avatar-img" alt="${docName}" />
                  <div class="tick-badge-sm">✓</div>
                </div>
                <div class="wall-doc-info">
                  <h3>${docName}</h3>
                  <p class="spec">${docSpecialty}</p>
                  <p class="creds">${docQual} • ${docReg}</p>
                </div>
              </div>
              <div class="fee-badge">
                <span class="fee-label">Consultation Fee</span>
                <span class="fee-val">${formatCurrency(consultFee, docCurrency || 'INR')}</span>
              </div>
            </div>

            <div class="wall-main-grid">
              <div class="steps-column">
                <h4>How to Book in 30 Seconds:</h4>
                <div class="step-card">
                  <div class="step-num">1</div>
                  <div>
                    <strong>Open Phone Camera</strong>
                    <p>No app download needed. Point camera at the QR code.</p>
                  </div>
                </div>
                <div class="step-card">
                  <div class="step-num">2</div>
                  <div>
                    <strong>Choose Date &amp; Slot</strong>
                    <p>Pick a time that fits your schedule.</p>
                  </div>
                </div>
                <div class="step-card">
                  <div class="step-num">3</div>
                  <div>
                    <strong>Instant Confirmation</strong>
                    <p>Receive video room link &amp; reminder on WhatsApp.</p>
                  </div>
                </div>
              </div>

              <div class="qr-column">
                <div class="wall-qr-box">
                  <img src="${qrImageUrl}" class="wall-qr-img" alt="QR Code" />
                </div>
                <p class="wall-scan-label">SCAN HERE TO PROCEED</p>
              </div>
            </div>

            <div class="wall-footer">
              <div>
                <strong>Confidential &amp; Secure Telemedicine</strong>
                <p>Digital Prescriptions • Lab Test Reviews • Cycle-Synced Care</p>
              </div>
              <div class="wall-url">healnari.care/dr/${docId}</div>
            </div>

          </div>
        </div>
      `;
    } else {
      // ─── TEMPLATE 3: PATIENT TAKEAWAY CARDS (4 Cards per A4 Sheet) ───
      const renderCard = () => `
        <div class="mini-card">
          <div class="mini-top">
            <span class="brand-title" style="font-size: 14px;">Heal<span style="color:#d946ef;">Nari</span></span>
            <span class="mini-badge">Doctor Direct</span>
          </div>
          <div class="mini-doc-row">
            <img src="${doctorPhotoUrl}" class="mini-avatar" alt="${docName}" />
            <div class="mini-doc">
              <h4>${docName}</h4>
              <p class="mini-spec">${docSpecialty}</p>
              <p class="mini-reg">${docQual}</p>
            </div>
          </div>
          <div class="mini-qr-box">
            <img src="${qrImageUrl}" class="mini-qr" alt="QR Code" />
          </div>
          <p class="mini-cta">Scan with Camera to Book</p>
          <div class="mini-footer">
            <span>${formatCurrency(consultFee, docCurrency || 'INR')} / consult</span>
            <span>dr/${docId}</span>
          </div>
        </div>
      `;

      templateHtml = `
        <div class="cards-sheet">
          <p class="cut-instructions">✂ Cut along dashed lines to hand over to patients</p>
          <div class="cards-grid">
            ${renderCard()}
            ${renderCard()}
            ${renderCard()}
            ${renderCard()}
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clinic Display Print - ${docName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
            
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              margin: 0;
              padding: 24px;
              background: #FAF7FC;
              color: #1E1035;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }

            /* ─── TEMPLATE 1: DESK ACRYLIC STAND ─── */
            .desk-container { width: 100%; max-width: 450px; }
            .desk-card {
              background: #ffffff;
              border: 3px solid #6B46C1;
              border-radius: 36px;
              padding: 34px 30px;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(42, 22, 71, 0.18);
              position: relative;
            }
            .header-strip {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #FAF7FC;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .brand-row {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo-mark {
              width: 26px;
              height: 26px;
              border-radius: 999px;
              object-fit: cover;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #2A1647;
              letter-spacing: -0.5px;
            }
            .brand-title span { color: #d946ef; }
            .verified-pill {
              font-size: 9.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              background: #ecfdf5;
              color: #065f46;
              padding: 4px 10px;
              border-radius: 999px;
              border: 1px solid #a7f3d0;
            }
            .avatar-box {
              position: relative;
              width: 88px;
              height: 88px;
              margin: 0 auto 12px;
              border-radius: 30px;
              background: #FAF7FC;
              border: 3px solid #6B46C1;
              box-shadow: 0 10px 20px rgba(107, 70, 193, 0.15);
            }
            .avatar-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 27px;
              display: block;
            }
            .tick-badge {
              position: absolute;
              bottom: -3px;
              right: -3px;
              width: 24px;
              height: 24px;
              background: #10b981;
              border: 2.5px solid #ffffff;
              border-radius: 999px;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .doc-name {
              font-size: 22px;
              font-weight: 900;
              margin: 0 0 3px 0;
              color: #1E1035;
            }
            .doc-qual {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              margin: 0 0 6px 0;
            }
            .doc-spec-badge {
              display: inline-block;
              background: #FAF5FF;
              color: #6B46C1;
              border: 1px solid #E9D5FF;
              padding: 4px 14px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 800;
              margin-bottom: 4px;
            }
            .doc-reg {
              font-size: 10px;
              color: #94a3b8;
              margin: 0 0 16px 0;
            }
            .qr-wrapper {
              background: #FAF7FC;
              border: 2px solid #E9D5FF;
              border-radius: 28px;
              padding: 20px 18px;
              margin-bottom: 18px;
            }
            .qr-box {
              background: #ffffff;
              padding: 12px;
              border-radius: 20px;
              display: inline-block;
              box-shadow: 0 4px 14px rgba(0,0,0,0.06);
            }
            .qr-code { width: 190px; height: 190px; display: block; }
            .scan-instruction {
              font-size: 13px;
              font-weight: 800;
              color: #1E1035;
              margin: 12px 0 2px 0;
            }
            .sub-text { font-size: 11px; color: #64748b; margin: 0; }
            .trust-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              border-top: 1px solid #FAF7FC;
              padding-top: 14px;
              margin-bottom: 14px;
              text-align: center;
            }
            .trust-item strong { display: block; font-size: 10px; color: #1E1035; font-weight: 800; }
            .trust-item span { font-size: 9px; color: #94a3b8; }
            .footer-url {
              font-size: 11px;
              color: #64748b;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
            }
            .footer-url strong { color: #6B46C1; }

            /* ─── TEMPLATE 2: WAITING ROOM WALL POSTER (A4) ─── */
            .wall-container { width: 100%; max-width: 680px; }
            .wall-poster {
              background: #ffffff;
              border: 2px solid #cbd5e1;
              border-radius: 32px;
              padding: 40px 36px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.06);
            }
            .wall-top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #FAF7FC;
              padding-bottom: 14px;
            }
            .wall-tag {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1px;
              background: #f1f5f9;
              color: #475569;
              padding: 4px 12px;
              border-radius: 999px;
            }
            .wall-hero { margin: 24px 0 18px 0; }
            .wall-hero h2 {
              font-size: 26px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 4px 0;
              letter-spacing: -0.5px;
            }
            .wall-sub { font-size: 13px; color: #64748b; margin: 0; }
            .wall-doctor-banner {
              background: #FAF7FC;
              border: 2px solid #E9D5FF;
              border-radius: 20px;
              padding: 16px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
            }
            .wall-avatar-box {
              position: relative;
              width: 58px;
              height: 58px;
              border-radius: 20px;
              border: 2px solid #6B46C1;
              flex-shrink: 0;
            }
            .tick-badge-sm {
              position: absolute;
              bottom: -2px;
              right: -2px;
              width: 18px;
              height: 18px;
              background: #10b981;
              border: 2px solid #ffffff;
              border-radius: 999px;
              color: #ffffff;
              font-size: 9px;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .wall-doc-info h3 { margin: 0 0 2px 0; font-size: 18px; font-weight: 800; color: #1E1035; }
            .wall-doc-info .spec { font-size: 12px; font-weight: 700; color: #6B46C1; margin: 0 0 2px 0; }
            .wall-doc-info .creds { font-size: 10px; color: #64748b; margin: 0; }
            .fee-badge {
              text-align: right;
              background: #ffffff;
              padding: 8px 14px;
              border-radius: 14px;
              border: 1px solid #e2e8f0;
            }
            .fee-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block; }
            .fee-val { font-size: 16px; font-weight: 900; color: #047857; }
            .wall-main-grid {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 20px;
              align-items: center;
              margin-bottom: 24px;
            }
            .steps-column h4 { font-size: 14px; font-weight: 800; margin: 0 0 14px 0; color: #1E1035; }
            .step-card {
              display: flex;
              gap: 12px;
              margin-bottom: 12px;
              align-items: flex-start;
            }
            .step-num {
              width: 26px;
              height: 26px;
              background: #6B46C1;
              color: #ffffff;
              border-radius: 999px;
              font-weight: 800;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .step-card strong { font-size: 12px; color: #0f172a; display: block; }
            .step-card p { font-size: 11px; color: #64748b; margin: 2px 0 0 0; line-height: 1.4; }
            .qr-column { text-align: center; }
            .wall-qr-box {
              background: #ffffff;
              border: 3px solid #6B46C1;
              padding: 14px;
              border-radius: 20px;
              display: inline-block;
              box-shadow: 0 8px 20px rgba(107, 70, 193, 0.1);
            }
            .wall-qr-img { width: 170px; height: 170px; display: block; }
            .wall-scan-label {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #6B46C1;
              margin: 8px 0 0 0;
            }
            .wall-footer {
              border-top: 2px solid #FAF7FC;
              padding-top: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10.5px;
            }
            .wall-footer strong { color: #0f172a; display: block; }
            .wall-footer p { color: #94a3b8; margin: 2px 0 0 0; }
            .wall-url { font-weight: 800; color: #6B46C1; }

            /* ─── TEMPLATE 3: 4-PER-PAGE CARDS ─── */
            .cards-sheet { width: 100%; max-width: 680px; }
            .cut-instructions {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              margin: 0 0 14px 0;
              font-weight: 600;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .mini-card {
              background: #ffffff;
              border: 2px dashed #cbd5e1;
              border-radius: 18px;
              padding: 16px;
              text-align: center;
            }
            .mini-top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .mini-badge { font-size: 8px; font-weight: 800; text-transform: uppercase; background: #f3e8ff; color: #6B46C1; padding: 2px 6px; border-radius: 6px; }
            .mini-doc-row {
              display: flex;
              align-items: center;
              gap: 8px;
              text-align: left;
              margin-bottom: 8px;
            }
            .mini-avatar { width: 38px; height: 38px; border-radius: 12px; object-fit: cover; border: 1.5px solid #6B46C1; }
            .mini-doc h4 { font-size: 12px; font-weight: 800; margin: 0; color: #0f172a; }
            .mini-spec { font-size: 10px; font-weight: 700; color: #6B46C1; margin: 0; }
            .mini-reg { font-size: 8.5px; color: #94a3b8; margin: 0; }
            .mini-qr-box {
              background: #FAF7FC;
              border: 1px solid #E9D5FF;
              border-radius: 12px;
              padding: 6px;
              display: inline-block;
              margin-bottom: 4px;
            }
            .mini-qr { width: 90px; height: 90px; display: block; }
            .mini-cta { font-size: 9.5px; font-weight: 800; color: #1E1035; margin: 0 0 6px 0; }
            .mini-footer {
              border-top: 1px solid #FAF7FC;
              padding-top: 4px;
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
              color: #64748b;
              font-weight: 700;
            }

            @media print {
              body { background: transparent; padding: 0; min-height: auto; }
              .desk-card, .wall-poster { box-shadow: none; border-width: 2px; }
              @page { size: auto; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${templateHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    fetch(qrImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dr-${docId}-qr-code.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast('QR Code downloaded!', 'success');
      })
      .catch(() => {
        window.open(qrImageUrl, '_blank');
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Doctor Profile &amp; QR Print Studio" size="lg">
      <div className="space-y-6">
        
        {/* Doctor Summary Banner */}
        <div className="bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-950 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="relative w-12 h-12 rounded-xl bg-aubergine-700/80 border border-aubergine-500/40 text-white font-bold text-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img src={selectedPhoto} alt={docName} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-bold">✓</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-white text-sm truncate">{docName}</h4>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                  NMC VERIFIED
                </span>
              </div>
              <p className="text-xs text-aubergine-200 truncate">{docSpecialty} • {formatCurrency(consultFee, docCurrency || 'INR')} / consult</p>
            </div>
          </div>

          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 transition-all shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <i className="fas fa-arrow-up-right-from-square text-[10px]"></i> View Public Profile
          </a>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold overflow-x-auto hide-scrollbar sm:grid sm:grid-cols-4">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'qr' ? 'bg-white text-aubergine-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-qrcode text-aubergine-600"></i> QR Print Studio
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'link' ? 'bg-white text-aubergine-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-link text-aubergine-600"></i> Direct Link
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'whatsapp' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fab fa-whatsapp text-emerald-600"></i> WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex-1 sm:flex-none py-2 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'embed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-code text-slate-600"></i> Website Button
          </button>
        </div>

        {/* TAB: QR Print Studio */}
        {activeTab === 'qr' && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Format Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Choose Print Template:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPosterTemplate('desk')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    posterTemplate === 'desk'
                      ? 'border-aubergine-600 bg-aubergine-50/50 shadow-sm ring-1 ring-aubergine-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fas fa-id-card-clip text-aubergine-700 text-sm"></i>
                    <strong className="text-xs text-slate-900 font-extrabold">Desk Acrylic Stand</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    A5 portrait stand with official HealNari branding &amp; doctor photo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterTemplate('wall')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    posterTemplate === 'wall'
                      ? 'border-aubergine-600 bg-aubergine-50/50 shadow-sm ring-1 ring-aubergine-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fas fa-newspaper text-aubergine-700 text-sm"></i>
                    <strong className="text-xs text-slate-900 font-extrabold">Waiting Room Poster</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Full A4 wall poster with 1-2-3 patient scan instructions.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterTemplate('cards')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    posterTemplate === 'cards'
                      ? 'border-aubergine-600 bg-aubergine-50/50 shadow-sm ring-1 ring-aubergine-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fas fa-address-card text-aubergine-700 text-sm"></i>
                    <strong className="text-xs text-slate-900 font-extrabold">Takeaway Cards</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    4-per-page referral cards to hand over to patients.
                  </p>
                </button>
              </div>
            </div>

            {/* Doctor Photo Picker */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <i className="fas fa-camera text-aubergine-600"></i> Doctor Portrait for Stand:
                </span>
                <label className="text-[11px] font-bold text-aubergine-700 hover:text-aubergine-900 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-aubergine-200 shadow-2xs">
                  <i className="fas fa-upload mr-1"></i> Upload Custom Photo
                  <input type="file" accept="image/*" onChange={handleCustomPhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar pt-1">
                {photoPresets.map((preset) => (
                  <button
                    key={preset.src}
                    type="button"
                    onClick={() => setSelectedPhoto(preset.src)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedPhoto === preset.src
                        ? 'border-aubergine-600 ring-2 ring-aubergine-400 scale-105 shadow-sm'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.src} alt={preset.label} className="w-full h-full object-cover" />
                    {selectedPhoto === preset.src && (
                      <div className="absolute inset-0 bg-aubergine-900/30 flex items-center justify-center text-white text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Template Preview Container (Matching Real Print Output in HealNari Theme) */}
            <div className="bg-[#FAF7FC] border border-purple-200 rounded-3xl p-4 sm:p-6 text-center flex flex-col items-center">
              
              <div className="bg-white border-2 border-aubergine-300 rounded-3xl p-6 shadow-md max-w-sm w-full space-y-4 text-center relative overflow-hidden">
                
                {/* Header with Original HealNari Logo */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/brand/logo-icon.jpg"
                      alt="HealNari Logo"
                      className="w-7 h-7 rounded-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="font-semibold text-sm tracking-tight text-aubergine-950 font-serif">
                      Heal<span className="text-magenta-600">Nari</span>
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ● VERIFIED CLINIC
                  </span>
                </div>

                {/* Doctor Photo & Identity */}
                <div className="space-y-2">
                  <div className="relative w-18 h-18 rounded-2xl mx-auto border-2 border-aubergine-600 shadow-md bg-slate-100">
                    <img
                      src={selectedPhoto}
                      alt={docName}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 text-base">{docName}</h5>
                    <p className="text-[11px] text-slate-500 font-semibold">{docQual}</p>
                    <div className="inline-block bg-purple-50 text-aubergine-700 border border-purple-200 px-3 py-0.5 rounded-full text-[10.5px] font-bold mt-1">
                      {docSpecialty}
                    </div>
                    <p className="text-[9.5px] text-slate-400 mt-1">{docReg}</p>
                  </div>
                </div>

                {/* QR Box in HealNari Frame */}
                <div className="p-3.5 bg-[#FAF7FC] border-2 border-purple-200 rounded-2xl inline-block shadow-2xs">
                  <div className="bg-white p-2 rounded-xl shadow-2xs">
                    <img
                      src={qrImageUrl}
                      alt={`QR Code for ${docName}`}
                      className="w-36 h-36 rounded-lg object-contain mx-auto"
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-2 flex items-center justify-center gap-1">
                    <i className="fas fa-camera text-aubergine-600"></i> Scan with Phone Camera to Book
                  </p>
                  <p className="text-[10px] text-slate-500">Instant HD video consultation &amp; prescription</p>
                </div>

                {/* Trust Pills */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center">
                  <div>
                    <strong className="text-[10px] text-slate-800 block font-bold">NMC Verified</strong>
                    <span className="text-[8.5px] text-slate-400">Direct Care</span>
                  </div>
                  <div>
                    <strong className="text-[10px] text-slate-800 block font-bold">HIPAA Aligned</strong>
                    <span className="text-[8.5px] text-slate-400">256-Bit Video</span>
                  </div>
                  <div>
                    <strong className="text-[10px] text-slate-800 block font-bold">Instant Token</strong>
                    <span className="text-[8.5px] text-slate-400">WhatsApp Alert</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-[10px] text-slate-500">
                  <span>Online Practice</span>
                  <strong className="text-aubergine-700 font-mono">healnari.care/dr/{docId}</strong>
                </div>

              </div>

            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handlePrintTemplate(posterTemplate)}
                className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-aubergine-200 active:scale-95"
              >
                <i className="fas fa-print"></i> Print Professional Template
              </button>

              <button
                onClick={handleDownloadQr}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <i className="fas fa-download"></i> Download QR Image (PNG)
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Print format is calibrated with margins for acrylic stands, A4 frames, and standard card stock.
            </p>
          </div>
        )}

        {/* TAB: Direct Link */}
        {activeTab === 'link' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Your Public Profile &amp; Booking URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicProfileUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 font-mono select-all focus:outline-none focus:border-aubergine-500"
                />
                <button
                  onClick={() => copyToClipboard(publicProfileUrl, 'link')}
                  className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95"
                >
                  <i className={`fas ${copiedLink ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Patients who click this link land directly on your verified profile with your booking engine pre-selected.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Consultation with ${docName}`)}&body=${encodeURIComponent(`Hi,\n\nYou can book an online consultation with ${docName} (${docSpecialty}) on HealNari using this link:\n${publicProfileUrl}\n\nBest regards.`)}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-envelope text-slate-500"></i> Share via Email
                </a>
                <a
                  href={`sms:?body=${encodeURIComponent(`Book an appointment with ${docName} on HealNari: ${publicProfileUrl}`)}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-comment-sms text-slate-500"></i> SMS
                </a>
              </div>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${docName} - HealNari Clinical Practice`,
                      text: `Book an online consultation with ${docName} (${docSpecialty}) on HealNari:`,
                      url: publicProfileUrl,
                    }).catch(() => {});
                  } else {
                    copyToClipboard(publicProfileUrl, 'link');
                  }
                }}
                className="text-xs font-bold text-aubergine-700 hover:text-aubergine-900 flex items-center gap-1"
              >
                <i className="fas fa-share-nodes"></i> Native Share
              </button>
            </div>
          </div>
        )}

        {/* TAB: WhatsApp */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-2">
                <i className="fab fa-whatsapp text-emerald-600 text-base"></i> Pre-formatted WhatsApp Message
              </div>
              <div className="bg-white border border-emerald-100 rounded-xl p-3.5 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line shadow-xs">
                {`Hello! You can view my verified clinical profile and book a direct video consultation with me (${docName} — ${docSpecialty}) on HealNari here:

${publicProfileUrl}

• NMC Verified & HIPAA Compliant
• Fee: ${formatCurrency(consultFee, docCurrency || 'INR')}
• Direct digital prescription & follow-up care`}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 text-center"
              >
                <i className="fab fa-whatsapp text-base"></i> Open in WhatsApp &amp; Send to Patient
              </a>
              <button
                onClick={() => copyToClipboard(decodeURIComponent(whatsappMessage), 'link')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="fas fa-copy"></i> Copy Text
              </button>
            </div>
          </div>
        )}

        {/* TAB: Website Embed */}
        {activeTab === 'embed' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Embed "Book with Doctor" Button on Your Personal Website:
              </label>
              <textarea
                readOnly
                rows={4}
                value={embedCode}
                className="w-full bg-slate-900 text-slate-100 text-xs font-mono p-3.5 rounded-xl border border-slate-700 select-all focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Live Button Preview:
              </div>
              <button
                onClick={() => copyToClipboard(embedCode, 'embed')}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
              >
                <i className={`fas ${copiedEmbed ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                <span>{copiedEmbed ? 'Copied HTML!' : 'Copy Embed Code'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center">
              <div dangerouslySetInnerHTML={{ __html: embedCode }} />
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}

export default DoctorShareModal;
