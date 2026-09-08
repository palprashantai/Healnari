import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';
import { generateQrUrl } from '../../lib/qrCode.js';

const MOCK_DOCTOR = {
  name: 'Dr. Ananya Mehta',
  specialty: 'Gynaecologist & Endocrinologist',
  qual: 'MBBS, MD (OBG)',
  reg: 'NMC Verified • Reg: 12305',
  fee: '₹799',
  photo: '/generated/doc1.webp',
  slug: 'dr-ananya-mehta',
};

const TABS = [
  { id: 'qr',        icon: 'fa-qrcode',        label: 'QR Print Studio' },
  { id: 'link',      icon: 'fa-link',           label: 'Direct Link' },
  { id: 'whatsapp',  icon: 'fa-whatsapp fa-brands', label: 'WhatsApp' },
  { id: 'embed',     icon: 'fa-code',           label: 'Website Button' },
];

const PRINT_TEMPLATES = [
  { id: 'desk',  icon: 'fa-desktop',          label: 'Desk Stand',    sub: 'A5 Tabletop' },
  { id: 'wall',  icon: 'fa-newspaper',         label: 'Wall Poster',   sub: 'A4 Vertical' },
  { id: 'cards', icon: 'fa-address-card',      label: 'Care Cards',    sub: '6 per sheet' },
];

function RealQrGraphic({ size = 112 }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const qrUrl = generateQrUrl(`https://healnari.care/dr/${MOCK_DOCTOR.slug}`, 300);

  return (
    <div className="relative flex items-center justify-center bg-white rounded-xl overflow-hidden p-1 shadow-xs" style={{ width: size, height: size }}>
      {/* High-fidelity Vector SVG QR Matrix (0ms instant render & offline guaranteed) */}
      <svg viewBox="0 0 33 33" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
        <rect width="33" height="33" fill="#ffffff" />
        
        {/* Top-Left Finder Pattern */}
        <rect x="2" y="2" width="7" height="7" fill="#4A154B" rx="1" />
        <rect x="3" y="3" width="5" height="5" fill="#ffffff" />
        <rect x="4" y="4" width="3" height="3" fill="#4A154B" rx="0.5" />
        
        {/* Top-Right Finder Pattern */}
        <rect x="24" y="2" width="7" height="7" fill="#4A154B" rx="1" />
        <rect x="25" y="3" width="5" height="5" fill="#ffffff" />
        <rect x="26" y="4" width="3" height="3" fill="#4A154B" rx="0.5" />
        
        {/* Bottom-Left Finder Pattern */}
        <rect x="2" y="24" width="7" height="7" fill="#4A154B" rx="1" />
        <rect x="3" y="25" width="5" height="5" fill="#ffffff" />
        <rect x="4" y="26" width="3" height="3" fill="#4A154B" rx="0.5" />

        {/* Alignment Pattern Bottom-Right */}
        <rect x="22" y="22" width="5" height="5" fill="#4A154B" rx="0.5" />
        <rect x="23" y="23" width="3" height="3" fill="#ffffff" />
        <rect x="24" y="24" width="1" height="1" fill="#4A154B" />

        {/* Timing Lines */}
        {[10, 12, 14, 16, 18, 20, 22].map(x => <rect key={`th-${x}`} x={x} y="5" width="1" height="1" fill="#4A154B" />)}
        {[10, 12, 14, 16, 18, 20, 22].map(y => <rect key={`tv-${y}`} x="5" y={y} width="1" height="1" fill="#4A154B" />)}

        {/* Data Pattern Modules */}
        {[
          [10,2],[12,2],[13,2],[15,2],[17,2],[19,2],[21,2],
          [11,3],[14,3],[16,3],[18,3],[20,3],[22,3],
          [10,4],[13,4],[15,4],[17,4],[21,4],
          [11,6],[14,6],[16,6],[18,6],[20,6],[22,6],
          [10,7],[12,7],[15,7],[17,7],[19,7],[21,7],
          [10,8],[11,8],[13,8],[14,8],[16,8],[18,8],[20,8],[22,8],
          [2,10],[4,10],[6,10],[8,10],[10,10],[12,10],[14,10],[16,10],[18,10],[20,10],[22,10],[24,10],[26,10],[28,10],[30,10],
          [3,11],[5,11],[7,11],[9,11],[11,11],[13,11],[15,11],[17,11],[19,11],[21,11],[23,11],[25,11],[27,11],[29,11],
          [2,12],[4,12],[8,12],[10,12],[12,12],[14,12],[18,12],[20,12],[22,12],[26,12],[28,12],[30,12],
          [3,13],[5,13],[7,13],[11,13],[13,13],[17,13],[19,13],[23,13],[25,13],[27,13],[29,13],
          [2,14],[6,14],[8,14],[10,14],[12,14],[20,14],[22,14],[24,14],[26,14],[30,14],
          [3,15],[5,15],[7,15],[9,15],[11,15],[21,15],[23,15],[25,15],[27,15],[29,15],
          [2,16],[4,16],[6,16],[8,16],[10,16],[12,16],[20,16],[22,16],[24,16],[26,16],[28,16],[30,16],
          [3,17],[5,17],[7,17],[9,17],[11,17],[21,17],[23,17],[25,17],[27,17],[29,17],
          [2,18],[4,18],[8,18],[10,18],[12,18],[20,18],[22,18],[24,18],[26,18],[30,18],
          [3,19],[5,19],[7,19],[11,19],[13,19],[17,19],[19,19],[23,19],[25,19],[27,19],[29,19],
          [2,20],[6,20],[8,20],[10,20],[12,20],[14,20],[16,20],[18,20],[20,20],[28,20],[30,20],
          [3,21],[5,21],[7,21],[9,21],[11,21],[13,21],[15,21],[17,21],[19,21],[27,21],[29,21],
          [10,22],[12,22],[14,22],[16,22],[18,22],[28,22],[30,22],
          [11,23],[13,23],[15,23],[17,23],[19,23],[21,23],[27,23],[29,23],
          [10,24],[12,24],[14,24],[16,24],[18,24],[20,24],[28,24],[30,24],
          [11,25],[13,25],[15,25],[17,25],[19,25],[21,25],[27,25],[29,25],
          [10,26],[12,26],[14,26],[16,26],[18,26],[20,26],[28,26],[30,26],
          [11,27],[13,27],[15,27],[17,27],[19,27],[21,27],[27,27],[29,27],
          [10,28],[12,28],[14,28],[16,28],[18,28],[20,28],[28,28],[30,28],
          [11,29],[13,29],[15,29],[17,29],[19,29],[21,29],[27,29],[29,29],
          [10,30],[12,30],[14,30],[16,30],[18,30],[20,30],[28,30],[30,30]
        ].map(([x, y], idx) => (
          <rect key={`d-${idx}`} x={x} y={y} width="1" height="1" fill="#4A154B" />
        ))}
      </svg>

      {/* Live Generated QR image overlay */}
      {!imgError && (
        <img
          src={qrUrl}
          alt="Scan QR code to book consultation"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Center Medical Stethoscope Badge */}
      <div className="absolute w-7 h-7 rounded-full bg-white shadow-md border border-purple-200 flex items-center justify-center z-10 pointer-events-none">
        <i className="fas fa-stethoscope text-purple-700 text-[10px]" />
      </div>
    </div>
  );
}

function QRMockup() {
  const [activeTemplate, setActiveTemplate] = useState('desk');

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-xs mx-auto transition-all duration-300">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-aubergine-700 to-indigo-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <i className="fas fa-heart-pulse text-pink-300 text-xs" />
          <span className="text-white font-black text-sm tracking-wide">HealNari</span>
        </div>
        <span className="text-[9px] text-emerald-300 font-bold border border-emerald-400/40 bg-emerald-950/50 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ● VERIFIED CLINIC
        </span>
      </div>

      {/* Template View: Desk, Wall, Cards */}
      {activeTemplate === 'desk' && (
        <>
          {/* Doctor card */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
            <img src={MOCK_DOCTOR.photo} alt={MOCK_DOCTOR.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-aubergine-200 shadow" onError={e => { e.target.style.display='none'; }} />
            <div>
              <p className="font-black text-slate-900 text-sm">{MOCK_DOCTOR.name}</p>
              <p className="text-[10px] text-slate-500">{MOCK_DOCTOR.qual}</p>
              <span className="text-[10px] font-bold bg-aubergine-50 text-aubergine-700 border border-aubergine-200 px-2 py-0.5 rounded-full">{MOCK_DOCTOR.specialty}</span>
            </div>
          </div>

          {/* QR block */}
          <div className="px-5 py-4 flex flex-col items-center gap-2.5">
            <div className="border-2 border-aubergine-300 rounded-2xl p-2 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 shadow-inner">
              <RealQrGraphic size={112} />
            </div>
            <p className="text-[10px] font-semibold text-slate-600 text-center flex items-center gap-1">
              <i className="fas fa-camera text-aubergine-600" /> Scan with Phone Camera to Book
            </p>
            <p className="text-[9px] text-slate-400 font-mono text-center">healnari.care/dr/{MOCK_DOCTOR.slug}</p>
          </div>
        </>
      )}

      {activeTemplate === 'wall' && (
        <div className="p-5 text-center space-y-3">
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
            A4 Clinic Poster
          </span>
          <h4 className="text-sm font-black text-slate-900">{MOCK_DOCTOR.name}</h4>
          <p className="text-[10px] text-slate-500">{MOCK_DOCTOR.specialty}</p>
          <div className="flex justify-center my-2">
            <div className="border-2 border-aubergine-300 rounded-2xl p-2 bg-purple-50 shadow-md">
              <RealQrGraphic size={116} />
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-2">
            <p className="text-[10px] font-bold text-emerald-800">Scan for Instant Video Consultations</p>
          </div>
        </div>
      )}

      {activeTemplate === 'cards' && (
        <div className="p-5 text-center space-y-3">
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
            Pocket Care Cards (6-per-sheet)
          </span>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 text-left">
            <RealQrGraphic size={76} />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{MOCK_DOCTOR.name}</p>
              <p className="text-[9px] text-slate-500">{MOCK_DOCTOR.specialty}</p>
              <span className="inline-block text-[8px] font-bold text-aubergine-700 bg-aubergine-100 px-1.5 py-0.5 rounded mt-1">
                Scan for follow-up booking
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400">Hand to patients after clinic consultations</p>
        </div>
      )}

      {/* Trust row */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-2">
        {['NMC Verified', 'HIPAA Aligned', 'Mon Payouts'].map(t => (
          <div key={t} className="text-center bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-1">
            <i className="fas fa-check-circle text-emerald-500 text-xs mb-0.5 block" />
            <span className="text-[9px] font-semibold text-slate-600 leading-tight block">{t}</span>
          </div>
        ))}
      </div>

      {/* Template selector */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex gap-1.5 justify-center">
        {PRINT_TEMPLATES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTemplate(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border text-center transition-all ${
              activeTemplate === t.id
                ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-sm scale-102'
                : 'bg-white text-slate-700 border-slate-200 hover:border-aubergine-300'
            }`}
          >
            <i className={`fas ${t.icon} text-xs ${activeTemplate === t.id ? 'text-white' : 'text-aubergine-600'}`} />
            <span className="text-[8px] font-bold leading-none">{t.label}</span>
            <span className={`text-[7px] leading-none ${activeTemplate === t.id ? 'text-purple-200' : 'text-slate-400'}`}>{t.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DirectLinkMockup() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-xs mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-aubergine-700 px-5 py-3">
        <p className="text-white font-black text-sm">Your Booking Link</p>
        <p className="text-indigo-200 text-[10px]">Share anywhere — WhatsApp, email, social media</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* URL bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <i className="fas fa-link text-aubergine-500 text-xs shrink-0" />
          <span className="text-xs text-slate-700 font-mono truncate">healnari.care/dr/{MOCK_DOCTOR.slug}</span>
          <span className="ml-auto bg-aubergine-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shrink-0 cursor-pointer hover:bg-aubergine-700">Copy</span>
        </div>

        {/* Live profile preview thumbnail */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-16 bg-gradient-to-br from-aubergine-700 to-indigo-700 flex items-end px-3 pb-2">
            <span className="text-[9px] text-white/70 font-mono">healnari.care/dr/{MOCK_DOCTOR.slug}</span>
          </div>
          <div className="px-3 py-3 flex items-center gap-3">
            <img src={MOCK_DOCTOR.photo} alt="" className="w-10 h-10 rounded-xl object-cover border border-aubergine-200" onError={e => { e.target.style.display='none'; }} />
            <div>
              <p className="text-xs font-black text-slate-800">{MOCK_DOCTOR.name}</p>
              <p className="text-[9px] text-slate-500">{MOCK_DOCTOR.specialty}</p>
            </div>
            <div className="ml-auto bg-aubergine-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg">Book</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          {[['Public', 'Patients can find you'], ['Verified', 'NMC badge displayed'], ['Bookable', '1-click appointment']].map(([h, s]) => (
            <div key={h} className="bg-aubergine-50 border border-aubergine-100 rounded-xl py-2 px-1">
              <i className="fas fa-check text-emerald-500 mb-0.5 block text-[9px]" />
              <p className="font-bold text-aubergine-800 text-[9px]">{h}</p>
              <p className="text-[8px] text-slate-500 leading-snug">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppMockup() {
  const msg = `Hello! Book a video consultation with me:\n\n${MOCK_DOCTOR.name}\n${MOCK_DOCTOR.specialty}\nFee: ${MOCK_DOCTOR.fee}\n\nhealnari.care/dr/${MOCK_DOCTOR.slug}`;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-xs mx-auto">
      {/* WhatsApp header */}
      <div className="bg-[#25D366] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <i className="fa-brands fa-whatsapp text-white text-lg" />
        </div>
        <div>
          <p className="text-white font-black text-xs">Share on WhatsApp</p>
          <p className="text-white/70 text-[9px]">Pre-filled professional message</p>
        </div>
      </div>

      {/* Chat bubble preview */}
      <div className="bg-[#ECE5DD] px-4 py-5 min-h-[120px]">
        <div className="bg-white rounded-xl rounded-tl-sm shadow p-3 max-w-[85%] ml-auto">
          <p className="text-[10px] text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">{msg}</p>
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className="text-[8px] text-slate-400">Now</span>
            <i className="fas fa-check-double text-[#53BDEB] text-[8px]" />
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="px-4 py-3 flex gap-2 justify-center flex-wrap">
        {[['fa-whatsapp fa-brands', 'WhatsApp', '#25D366'], ['fa-envelope', 'Email', '#6366F1'], ['fa-twitter fa-brands', 'Twitter', '#1DA1F2']].map(([ico, label, color]) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer hover:border-aubergine-300 transition-colors">
            <i className={`${ico} text-xs`} style={{ color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbedMockup() {
  const snippetShort = `<a href="healnari.care/dr/${MOCK_DOCTOR.slug}"
  style="background:#6B46C1;color:#fff;
  padding:12px 20px;border-radius:12px;
  font-weight:bold;">
  🩺 Book with ${MOCK_DOCTOR.name}
</a>`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-xs mx-auto">
      <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-slate-400 text-[9px] font-mono ml-1">embed.html</span>
      </div>
      {/* Code */}
      <div className="bg-slate-950 px-4 py-4">
        <pre className="text-[9px] text-emerald-300 leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap">{snippetShort}</pre>
      </div>
      {/* Copy bar */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
        <span className="text-[9px] text-slate-400">Ready to paste on any website</span>
        <span className="bg-aubergine-600 text-white text-[8px] font-bold px-2 py-1 rounded-lg cursor-pointer">Copy Code</span>
      </div>
      {/* Live preview */}
      <div className="px-4 py-4 border-t border-slate-100">
        <p className="text-[9px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Live Preview</p>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-aubergine-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-aubergine-300/30 cursor-pointer hover:bg-aubergine-700 transition-colors">
            <i className="fas fa-stethoscope text-[10px]" />
            Book with {MOCK_DOCTOR.name}
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCKUPS = { qr: QRMockup, link: DirectLinkMockup, whatsapp: WhatsAppMockup, embed: EmbedMockup };

const TAB_DETAILS = {
  qr: {
    headline: 'Print-Ready QR Codes for Your Clinic',
    sub: 'Patients scan — you get booked. No typing, no searching.',
    bullets: [
      { icon: 'fa-print', color: 'text-aubergine-600', text: '3 professional print templates — Desk Stand, Wall Poster & Business Cards' },
      { icon: 'fa-qrcode', color: 'text-indigo-600', text: 'QR auto-links to your verified live profile for instant 1-click booking' },
      { icon: 'fa-camera', color: 'text-emerald-600', text: 'Works with any phone camera — no app required for patients to scan' },
      { icon: 'fa-palette', color: 'text-rose-600', text: 'Your photo, credentials & NMC badge auto-included on every template' },
    ],
    cta: 'Print Clinic Materials',
    ctaIcon: 'fa-print',
  },
  link: {
    headline: 'Your Personal Verified Booking URL',
    sub: 'One shareable link. Hundreds of patients. Zero middlemen.',
    bullets: [
      { icon: 'fa-link', color: 'text-indigo-600', text: 'Unique URL: healnari.care/dr/your-name — yours forever, fully branded' },
      { icon: 'fa-id-card-clip', color: 'text-aubergine-600', text: 'Auto-displays your photo, NMC badge, ratings, specialties & live slot availability' },
      { icon: 'fa-bolt', color: 'text-amber-500', text: '1-click booking directly from your link — patients pay & confirm instantly' },
      { icon: 'fa-share-nodes', color: 'text-emerald-600', text: 'Share on Instagram bio, email signatures, business cards or clinic website' },
    ],
    cta: 'Get Your Booking Link',
    ctaIcon: 'fa-link',
  },
  whatsapp: {
    headline: 'One-Tap WhatsApp Referral Messages',
    sub: 'Send a professional pre-filled booking message in seconds.',
    bullets: [
      { icon: 'fa-message', color: 'text-green-600', text: 'Pre-written professional message with your name, specialty, fee & profile link' },
      { icon: 'fa-users', color: 'text-aubergine-600', text: 'Works for direct patient referrals — send to existing patients for follow-ups' },
      { icon: 'fa-share', color: 'text-indigo-600', text: 'Also share via Email, Twitter, Instagram — all with a single button tap' },
      { icon: 'fa-shield-halved', color: 'text-emerald-600', text: 'Message includes NMC Verified & HIPAA compliance badges automatically' },
    ],
    cta: 'Share on WhatsApp',
    ctaIcon: 'fa-whatsapp',
  },
  embed: {
    headline: '"Book with Me" Button for Your Website',
    sub: 'Place a branded booking button on your personal site in 30 seconds.',
    bullets: [
      { icon: 'fa-code', color: 'text-slate-600', text: 'Copy-paste one line of HTML — works on any website or WordPress blog' },
      { icon: 'fa-wand-magic-sparkles', color: 'text-aubergine-600', text: 'Button auto-styles with your branding — no design skills needed' },
      { icon: 'fa-arrow-pointer', color: 'text-indigo-600', text: 'Patients click → land on your HealNari profile → book & pay instantly' },
      { icon: 'fa-chart-line', color: 'text-emerald-600', text: 'Every booking tracked in your dashboard with source attribution' },
    ],
    cta: 'Copy Embed Code',
    ctaIcon: 'fa-code',
  },
};

function DoctorShareShowcase({ onApply }) {
  const [activeTab, setActiveTab] = useState('qr');
  const detail = TAB_DETAILS[activeTab];
  const MockupComponent = MOCKUPS[activeTab];

  return (
    <section id="share-link" className="py-20 md:py-28 scroll-mt-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* Section header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-4 py-1.5 rounded-full border border-aubergine-100 shadow-xs">
            <i className="fas fa-share-nodes text-aubergine-500" />
            Share Your Booking Link
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight font-display">
            Your Practice — Everywhere<br />
            <span className="bg-gradient-to-r from-aubergine-600 to-indigo-600 bg-clip-text text-transparent">Your Patients Can Find You</span>
          </h2>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed font-normal">
            HealNari gives every verified doctor a complete <strong>Digital Marketing Toolkit</strong> — a scannable QR code, a shareable booking URL, a WhatsApp referral message, and a website embed button. No developer required.
          </p>
        </Reveal>

        {/* Tab selector */}
        <Reveal className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-lg shadow-aubergine-300/25 scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-700'
              }`}
            >
              <i className={`fas ${tab.icon} text-xs`} />
              {tab.label}
            </button>
          ))}
        </Reveal>

        {/* Main content: mockup + details */}
        <Reveal>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left: phone/card mockup */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-aubergine-200/50 to-indigo-200/50 rounded-[3rem] blur-2xl pointer-events-none" />
                <div className="relative transition-all duration-300">
                  <MockupComponent />
                </div>
                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                  <i className="fas fa-check-circle text-white text-[9px]" />
                  Free for All Doctors
                </div>
              </div>
            </div>

            {/* Right: feature details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2 font-display">
                  {detail.headline}
                </h3>
                <p className="text-slate-500 text-base leading-relaxed">{detail.sub}</p>
              </div>

              <ul className="space-y-4">
                {detail.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3.5 group">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      b.color.includes('aubergine') ? 'bg-aubergine-50 border-aubergine-200' :
                      b.color.includes('indigo')    ? 'bg-indigo-50 border-indigo-200' :
                      b.color.includes('emerald')   ? 'bg-emerald-50 border-emerald-200' :
                      b.color.includes('amber')     ? 'bg-amber-50 border-amber-200' :
                      b.color.includes('rose')      ? 'bg-rose-50 border-rose-200' :
                      b.color.includes('green')     ? 'bg-green-50 border-green-200' :
                                                      'bg-slate-50 border-slate-200'
                    } group-hover:scale-105 transition-transform`}>
                      <i className={`fas ${b.icon} ${b.color} text-sm`} />
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed pt-1.5">{b.text}</p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={onApply}
                  className="flex items-center justify-center gap-2 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-aubergine-300/30 hover:scale-105 text-sm"
                >
                  <i className={`fas ${detail.ctaIcon} text-xs`} />
                  {detail.cta} — Join Free
                </button>
                <span className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                  <i className="fas fa-check-circle text-emerald-500" />
                  Available from Day 1 · No extra setup
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bottom stats strip */}
        <Reveal className="mt-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: 'fa-qrcode',      color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-200', stat: '3 Templates',    label: 'Print-Ready Clinic Materials' },
              { icon: 'fa-link',        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',          stat: '1 Click',        label: 'Patient Booking from Your Link' },
              { icon: 'fa-share-nodes', color: 'text-emerald-600 bg-emerald-50 border-emerald-200',       stat: '4 Channels',     label: 'QR · Link · WhatsApp · Embed' },
              { icon: 'fa-code',        color: 'text-rose-600 bg-rose-50 border-rose-200',                stat: '30 Seconds',     label: 'Website Button Setup Time' },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 text-center hover:shadow-md hover:border-aubergine-200 transition-all duration-200 group">
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center border mb-3 ${item.color} group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${item.icon} text-sm`} />
                </div>
                <p className="font-black text-slate-900 text-lg">{item.stat}</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

      </div>
    </section>
  );
}

export default DoctorShareShowcase;
