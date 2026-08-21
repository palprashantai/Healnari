import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { generateQrUrl } from '../lib/qrCode.js';

export function PatientCarePassModal({ isOpen, onClose, patient, doctorName }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'share' | 'doctor'

  const p = patient || {};
  const patientName = p.name || 'Priya Sharma';
  const mrn = p.mrn || 'HN-88219';
  const age = p.age || 28;
  const bloodGroup = p.bloodGroup || 'B+';
  const condition = p.alert || p.condition || 'PCOS (Insulin Resistant Phenotype)';
  const allergies = Array.isArray(p.allergies) && p.allergies.length > 0 ? p.allergies.join(', ') : 'No Known Drug Allergies (NKDA)';
  const emergencyContact = p.emergencyContact || p.phone || '+91 98765 43210';
  const primaryDoctor = doctorName || 'Dr. Sarah Mitchell';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://healnari.care';
  // Secure health summary URL (viewable by emergency caregivers or clinical staff)
  const healthCardUrl = `${origin}/patient-dashboard?view=care-pass&mrn=${mrn}`;
  const qrImageUrl = generateQrUrl(`HEALNARI EMERGENCY CARE PASS\nPatient: ${patientName}\nMRN: ${mrn}\nBlood: ${bloodGroup}\nAllergies: ${allergies}\nEmergency: ${emergencyContact}\nDoctor: ${primaryDoctor}`, 350);

  const copyCarePassText = () => {
    const text = `🏥 HealNari Emergency Health Pass\nPatient: ${patientName} (${age}F)\nMRN: ${mrn}\nBlood Group: ${bloodGroup}\nAllergies: ${allergies}\nCondition: ${condition}\nConsulting Doctor: ${primaryDoctor}\nEmergency Contact: ${emergencyContact}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast('Emergency health pass copied!', 'success');
    });
  };

  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Please allow popups to print your Health Card', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Emergency Care Pass - ${patientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              margin: 0;
              padding: 30px;
              background: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .card-wrapper {
              width: 100%;
              max-width: 440px;
            }
            .care-card {
              background: linear-gradient(135deg, #1E1035 0%, #2A1647 60%, #170B28 100%);
              color: #ffffff;
              border-radius: 28px;
              padding: 28px;
              box-shadow: 0 20px 40px rgba(42, 22, 71, 0.25);
              position: relative;
              overflow: hidden;
            }
            .top-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid rgba(255,255,255,0.15);
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .logo {
              font-size: 20px;
              font-weight: 900;
              color: #ffffff;
            }
            .logo span { color: #f472b6; }
            .badge {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              background: rgba(16, 185, 129, 0.2);
              color: #6ee7b7;
              border: 1px solid rgba(16, 185, 129, 0.4);
              padding: 3px 8px;
              border-radius: 999px;
            }
            .patient-hero {
              display: flex;
              gap: 16px;
              align-items: center;
              margin-bottom: 18px;
            }
            .avatar {
              width: 56px;
              height: 56px;
              background: #6B46C1;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: 900;
              color: #ffffff;
              flex-shrink: 0;
            }
            .p-name { font-size: 18px; font-weight: 900; margin: 0 0 2px 0; }
            .p-mrn { font-size: 11px; color: #cbd5e1; font-family: monospace; }
            .vitals-strip {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.1);
              padding: 10px;
              border-radius: 16px;
              margin-bottom: 16px;
              text-align: center;
            }
            .v-item strong { display: block; font-size: 13px; font-weight: 800; color: #ffffff; }
            .v-item span { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
            .info-section {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              padding: 12px 14px;
              margin-bottom: 16px;
              font-size: 11px;
            }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .info-row:last-child { margin-bottom: 0; }
            .info-label { color: #94a3b8; font-weight: 600; }
            .info-val { color: #f8fafc; font-weight: 700; text-align: right; }
            .alert-val { color: #fca5a5; font-weight: 800; }
            .qr-center {
              background: #ffffff;
              padding: 12px;
              border-radius: 20px;
              display: flex;
              align-items: center;
              gap: 14px;
              color: #0f172a;
            }
            .qr-img { width: 80px; height: 80px; display: block; flex-shrink: 0; border-radius: 8px; }
            .qr-text h5 { margin: 0 0 2px 0; font-size: 12px; font-weight: 800; }
            .qr-text p { margin: 0; font-size: 10px; color: #64748b; line-height: 1.3; }
            @media print {
              body { background: transparent; padding: 0; min-height: auto; }
              .care-card { box-shadow: none; }
              @page { size: auto; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="card-wrapper">
            <div class="care-card">
              <div class="top-bar">
                <div class="logo">Heal<span>Nari</span></div>
                <div class="badge">● Emergency Care Pass</div>
              </div>

              <div class="patient-hero">
                <div class="avatar">${patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div>
                  <div class="p-name">${patientName}</div>
                  <div class="p-mrn">MRN: ${mrn} • Age: ${age}F</div>
                </div>
              </div>

              <div class="vitals-strip">
                <div class="v-item">
                  <strong>${bloodGroup}</strong>
                  <span>Blood Group</span>
                </div>
                <div class="v-item">
                  <strong>${age} yrs</strong>
                  <span>Age / Gender</span>
                </div>
                <div class="v-item">
                  <strong>Active</strong>
                  <span>Status</span>
                </div>
              </div>

              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">Primary Care:</span>
                  <span class="info-val">${condition}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Drug Allergies:</span>
                  <span class="info-val alert-val">${allergies}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Doctor:</span>
                  <span class="info-val">${primaryDoctor}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Emergency:</span>
                  <span class="info-val">${emergencyContact}</span>
                </div>
              </div>

              <div class="qr-center">
                <img src="${qrImageUrl}" class="qr-img" alt="Health QR" />
                <div class="qr-text">
                  <h5>Emergency Medical QR</h5>
                  <p>Scan with any camera for instant clinical details and verified allergies.</p>
                </div>
              </div>
            </div>
          </div>
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

  const shareViaWhatsApp = () => {
    const msg = encodeURIComponent(
      `🏥 My HealNari Emergency Health Pass:\n\n• Patient: ${patientName} (${age}F)\n• MRN: ${mrn}\n• Blood Group: ${bloodGroup}\n• Known Allergies: ${allergies}\n• Consulting Doctor: ${primaryDoctor}\n• Emergency Contact: ${emergencyContact}\n\nVerified on HealNari Telehealth Platform`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Digital Health Pass &amp; Care Card" size="lg">
      <div className="space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'card' ? 'bg-white text-aubergine-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-id-card text-aubergine-600"></i> My Health Pass
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'share' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fab fa-whatsapp text-emerald-600"></i> Share with Family
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'doctor' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-heart text-pink-500"></i> Recommend Doctor
          </button>
        </div>

        {/* TAB 1: Digital Health Pass Card */}
        {activeTab === 'card' && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Visual Digital Health Card */}
            <div className="bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#160B28] text-white rounded-3xl p-6 shadow-xl border border-purple-500/20 relative overflow-hidden space-y-4">
              
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-base tracking-tight font-display">Heal<span className="text-pink-400">Nari</span></span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">
                    DIGITAL CARE PASS
                  </span>
                </div>
                <span className="text-xs font-mono text-purple-300 font-bold">{mrn}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-aubergine-600 border border-aubergine-400/40 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white truncate">{patientName}</h3>
                  <p className="text-xs text-purple-200">{age} yrs • Female • Blood Group: <strong className="text-white">{bloodGroup}</strong></p>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 border border-white/10 p-2.5 rounded-2xl text-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Blood Group</span>
                  <strong className="text-white font-extrabold text-sm">{bloodGroup}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Specialist</span>
                  <strong className="text-white font-extrabold text-xs truncate block">{primaryDoctor.split(' ')[0]}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span>
                  <strong className="text-emerald-400 font-extrabold text-xs">Active Care</strong>
                </div>
              </div>

              {/* Medical Highlights */}
              <div className="space-y-1.5 text-xs bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Condition:</span>
                  <span className="font-bold text-slate-200">{condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Drug Allergies:</span>
                  <span className="font-bold text-rose-300">{allergies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Emergency Helpline:</span>
                  <span className="font-mono text-emerald-300 font-bold">{emergencyContact}</span>
                </div>
              </div>

              {/* QR Mini Banner */}
              <div className="bg-white rounded-2xl p-3 flex items-center gap-3 text-slate-900 shadow-sm">
                <img src={qrImageUrl} alt="QR" className="w-16 h-16 rounded-lg shrink-0 object-contain" />
                <div className="min-w-0 text-left">
                  <h6 className="font-extrabold text-xs text-slate-900">Scannable Emergency Health QR</h6>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Instant access to your verified vital medical history and allergy list for doctors.
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handlePrintCard}
                className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-aubergine-200 active:scale-95"
              >
                <i className="fas fa-print"></i> Print Wallet Health Card
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <i className="fab fa-whatsapp"></i> Share Pass on WhatsApp
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: Share with Family */}
        {activeTab === 'share' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-2">
                <i className="fab fa-whatsapp text-emerald-600 text-base"></i> Emergency Summary for Family &amp; Caregiver
              </div>
              <div className="bg-white border border-emerald-100 rounded-xl p-3.5 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line shadow-xs">
                {`🏥 HealNari Emergency Health Pass:

• Patient: ${patientName} (${age}F)
• MRN: ${mrn}
• Blood Group: ${bloodGroup}
• Known Allergies: ${allergies}
• Care Plan: ${condition}
• Consulting Doctor: ${primaryDoctor}
• Emergency Contact: ${emergencyContact}

Verified on HealNari Women's Telehealth`}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp text-base"></i> Send to Family via WhatsApp
              </button>
              <button
                onClick={copyCarePassText}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <i className={`fas ${copied ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Recommend Doctor to Friend */}
        {activeTab === 'doctor' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-aubergine-50 border border-pink-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-aubergine-900 mb-2">
                <i className="fas fa-heart text-pink-500 text-base"></i> Recommend Your Specialist to Friends &amp; Sisters
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Help a friend or family member get root-cause treatment for PCOS, irregular cycles, or hormonal health.
              </p>

              <div className="bg-white border border-purple-100 rounded-xl p-3.5 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line shadow-xs">
                {`Hi! I've been consulting with ${primaryDoctor} on HealNari for women's hormonal health and PCOS care, and had a wonderful experience.

You can view her verified clinical profile and book an online consultation here:
${origin}/dr/${primaryDoctor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Hi! I've been consulting with ${primaryDoctor} on HealNari for women's hormonal health and PCOS care, and had a wonderful experience.\n\nYou can view her verified clinical profile and book an online video consultation here:\n${origin}/dr/${primaryDoctor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp"></i> Share on WhatsApp
              </a>

              <button
                onClick={() => {
                  const url = `${origin}/dr/${primaryDoctor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast('Doctor booking link copied!', 'success');
                  });
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="fas fa-copy"></i> Copy Link
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}

export default PatientCarePassModal;
