import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { conditionsData } from './src/landing/data/conditions.js';
import { guidesData } from './src/data/guidesData.js';
import { glossaryData } from './src/landing/data/glossary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const BASE_URL = 'https://healnari.vercel.app';

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateHeadMeta(html, { title, description, canonicalUrl, schemaJson }) {
  let updated = html;

  // Replace Title
  updated = updated.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);

  // Replace Canonical
  updated = updated.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace Meta Description
  updated = updated.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // Replace OpenGraph Title & Description & URL
  updated = updated.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  updated = updated.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  updated = updated.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // Replace Twitter Title & Description
  updated = updated.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  updated = updated.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  // Insert Schema right before </head>
  if (schemaJson) {
    const schemaTag = `\n    <!-- Page Specific Structured Data -->\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaJson, null, 2)}\n    </script>\n  `;
    updated = updated.replace('</head>', `${schemaTag}</head>`);
  }

  // Ensure lcp-shell is NOT hidden by the inline deep-link script on pre-rendered pages
  updated = updated.replace(
    /var lcp = document\.getElementById\('lcp-shell'\);\s*if \(lcp\) lcp\.style\.display = 'none';/g,
    '// Keep pre-rendered shell visible until React hydrates and removes it'
  );

  return updated;
}

function renderConditionShell(condition, canonicalUrl) {
  const symptomsHtml = condition.keySymptoms && condition.keySymptoms.length > 0
    ? `
      <section style="margin-top:40px;background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:28px 24px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
        <h2 style="font-size:1.3rem;font-weight:800;color:#0F172A;margin:0 0 16px;font-family:Georgia,serif;">
          Key Symptoms &amp; Concerns Evaluated
        </h2>
        <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.8;font-size:0.95rem;">
          ${condition.keySymptoms.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </section>
    `
    : '';

  const carePathwayHtml = condition.carePathway && condition.carePathway.length > 0
    ? `
      <section style="margin-top:36px;background:#FAF8F5;border:1px solid #E2E8F0;border-radius:20px;padding:28px 24px;">
        <h2 style="font-size:1.3rem;font-weight:800;color:#0F172A;margin:0 0 16px;font-family:Georgia,serif;">
          Our 4-Step Clinical Care Protocol
        </h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
          ${condition.carePathway.map(cp => `
            <div style="background:#fff;border:1px solid #CBD5E1;border-radius:14px;padding:16px;">
              <strong style="color:#6B46C1;font-size:0.9rem;display:block;margin-bottom:6px;">${escapeHtml(cp.step)}</strong>
              <p style="margin:0;font-size:0.85rem;color:#64748B;line-height:1.5;">${escapeHtml(cp.desc)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `
    : '';

  const diagnosticsHtml = condition.diagnostics && condition.diagnostics.length > 0
    ? `
      <section style="margin-top:36px;background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:28px 24px;">
        <h2 style="font-size:1.3rem;font-weight:800;color:#0F172A;margin:0 0 16px;font-family:Georgia,serif;">
          Recommended Diagnostic Lab Roadmap
        </h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${condition.diagnostics.map(d => `
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">
              ${escapeHtml(d)}
            </span>
          `).join('')}
        </div>
      </section>
    `
    : '';

  const faqsHtml = condition.faqs && condition.faqs.length > 0
    ? `
      <section style="margin-top:36px;background:#FAF8F5;border:1px solid #E2E8F0;border-radius:20px;padding:28px 24px;">
        <h2 style="font-size:1.3rem;font-weight:800;color:#0F172A;margin:0 0 16px;font-family:Georgia,serif;">
          Frequently Asked Questions
        </h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${condition.faqs.map(faq => `
            <details style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;cursor:pointer;">
              <summary style="font-weight:700;color:#1E293B;font-size:0.95rem;">${escapeHtml(faq.q)}</summary>
              <p style="margin:10px 0 0;font-size:0.9rem;color:#64748B;line-height:1.6;">${escapeHtml(faq.a)}</p>
            </details>
          `).join('')}
        </div>
      </section>
    `
    : '';

  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <!-- Pre-rendered Condition Header -->
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <nav style="display:flex;align-items:center;gap:16px;">
            <a href="/#conditions" style="color:#475569;font-size:0.85rem;font-weight:600;text-decoration:none;">All Specialties</a>
            <a href="#consult" style="background:linear-gradient(to right,#7C3AED,#DB2777);color:#fff;font-weight:800;padding:8px 18px;border-radius:12px;font-size:0.75rem;text-decoration:none;">
              Book ₹799 Consult
            </a>
          </nav>
        </div>
      </header>

      <!-- Main Condition Content -->
      <main style="padding:32px 16px 80px;max-width:960px;margin:0 auto;">
        
        <!-- Breadcrumbs -->
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:20px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <a href="/#conditions" style="color:#6B46C1;text-decoration:none;">Specialties</a> &gt; 
          <span style="color:#64748B;">${escapeHtml(condition.title)}</span>
        </nav>

        <!-- Condition Hero -->
        <div style="text-align:left;background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 6px 24px rgba(0,0,0,0.04);">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <span style="background:#FDF2F8;border:1px solid #FBCFE8;color:#BE185D;font-size:0.75rem;font-weight:800;padding:4px 12px;border-radius:999px;">
              ${escapeHtml(condition.badge || 'Clinical Specialty')}
            </span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:999px;">
              45-Min Video Call
            </span>
            <span style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:999px;">
              Verified Doctors
            </span>
          </div>

          <h1 style="font-size:2rem;line-height:1.25;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:0 0 16px;">
            ${escapeHtml(condition.title)}
          </h1>

          <p style="color:#475569;font-size:1.05rem;line-height:1.7;margin:0 0 24px;">
            ${escapeHtml(condition.subtitle)}
          </p>

          <div style="background:#FAF8F5;border-left:4px solid #7C3AED;padding:12px 18px;border-radius:0 12px 12px 0;margin-bottom:28px;">
            <strong style="color:#1E293B;font-size:0.85rem;display:block;">Consulting Specialists:</strong>
            <span style="color:#64748B;font-size:0.85rem;">${escapeHtml(condition.specialistRole)}</span>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
            <a href="#consult" style="display:inline-block;background:linear-gradient(to right,#7C3AED,#DB2777,#4F46E5);color:#fff;font-weight:800;padding:14px 28px;border-radius:12px;font-size:0.9rem;text-decoration:none;box-shadow:0 8px 24px rgba(124,58,237,0.3);">
              Book ₹799 Specialist Consult
            </a>
            <span style="font-size:0.8rem;color:#64748B;">Includes 14-day follow-up chat &amp; digital Rx</span>
          </div>
        </div>

        ${symptomsHtml}
        ${carePathwayHtml}
        ${diagnosticsHtml}
        ${faqsHtml}

        <!-- Clinical Governance Note -->
        <footer style="margin-top:40px;padding:20px;border-top:1px solid #E2E8F0;text-align:center;font-size:0.75rem;color:#94A3B8;">
          <p style="margin:0 0 6px;">
            <strong>HealNari Clinical Governance:</strong> All consultations and protocols are conducted by NMC-registered medical specialists adhering to Telemedicine Practice Guidelines.
          </p>
          <p style="margin:0;">&copy; 2026 HealNari. All rights reserved.</p>
        </footer>

      </main>
    </div>
  `;
}

function renderGuideShell(guide, canonicalUrl) {
  const sectionsHtml = guide.sections && guide.sections.length > 0
    ? guide.sections.map(s => `
      <section style="margin-top:28px;">
        <h2 style="font-size:1.25rem;font-weight:800;color:#0F172A;margin:0 0 12px;font-family:Georgia,serif;">
          ${escapeHtml(s.heading)}
        </h2>
        <p style="color:#475569;line-height:1.75;font-size:0.95rem;margin:0;">
          ${escapeHtml(s.content)}
        </p>
      </section>
    `).join('')
    : '';

  const bulletsHtml = guide.bullets && guide.bullets.length > 0
    ? `
      <div style="margin-top:28px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:20px;">
        <h3 style="font-size:1rem;font-weight:800;color:#1E293B;margin:0 0 10px;">Key Clinical Takeaways:</h3>
        <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.7;font-size:0.9rem;">
          ${guide.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <a href="/#conditions" style="color:#6B46C1;font-weight:700;font-size:0.85rem;text-decoration:none;">View All Guides</a>
        </div>
      </header>

      <main style="padding:32px 16px 80px;max-width:820px;margin:0 auto;">
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:18px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <span style="color:#64748B;">Clinical Guides</span> &gt; 
          <span style="color:#475569;">${escapeHtml(guide.title)}</span>
        </nav>

        <article style="background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <span style="background:#EEF2FF;border:1px solid #C7D2FE;color:#4338CA;font-size:0.75rem;font-weight:800;padding:4px 10px;border-radius:999px;">
              ${escapeHtml(guide.tag || 'Clinical Guide')}
            </span>
            <span style="background:#F1F5F9;color:#64748B;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:999px;">
              ${escapeHtml(guide.readTime || '5 min read')}
            </span>
          </div>

          <h1 style="font-size:1.9rem;line-height:1.3;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:0 0 16px;">
            ${escapeHtml(guide.title)}
          </h1>

          <p style="color:#475569;font-size:1.05rem;line-height:1.75;margin:0 0 24px;border-bottom:1px solid #F1F5F9;padding-bottom:20px;">
            ${escapeHtml(guide.summary)}
          </p>

          <div style="background:#FAF8F5;border-radius:14px;padding:14px 18px;margin-bottom:28px;display:flex;align-items:center;gap:12px;">
            <div>
              <strong style="color:#1E293B;font-size:0.85rem;display:block;">${escapeHtml(guide.author?.name || 'HealNari Clinical Team')}</strong>
              <span style="color:#64748B;font-size:0.75rem;">${escapeHtml(guide.author?.role || 'Medical Review Board')} • Evidence-Based</span>
            </div>
          </div>

          ${sectionsHtml}
          ${bulletsHtml}

          <div style="margin-top:36px;padding-top:24px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <span style="font-size:0.8rem;color:#94A3B8;">Evidence: ${escapeHtml(guide.evidenceBasis || 'Peer-Reviewed Clinical Guidelines')}</span>
            <a href="/#consult" style="background:#6B46C1;color:#fff;font-weight:700;padding:10px 20px;border-radius:10px;font-size:0.85rem;text-decoration:none;">
              Consult a Specialist
            </a>
          </div>
        </article>
      </main>
    </div>
  `;
}

function renderGlossaryShell(term, canonicalUrl) {
  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <a href="/" style="color:#6B46C1;font-weight:700;font-size:0.85rem;text-decoration:none;">Home</a>
        </div>
      </header>

      <main style="padding:32px 16px 80px;max-width:820px;margin:0 auto;">
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:18px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <span style="color:#64748B;">Medical Glossary</span> &gt; 
          <span style="color:#475569;">${escapeHtml(term.title)}</span>
        </nav>

        <article style="background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.75rem;font-weight:800;padding:4px 10px;border-radius:999px;">
            Diagnostic &amp; Clinical Definition
          </span>

          <h1 style="font-size:1.9rem;line-height:1.3;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:12px 0 16px;">
            ${escapeHtml(term.title)}
          </h1>

          <p style="color:#475569;font-size:1rem;line-height:1.75;margin:0 0 24px;border-bottom:1px solid #F1F5F9;padding-bottom:16px;">
            ${escapeHtml(term.seoDescription)}
          </p>

          <div style="color:#334155;line-height:1.8;font-size:0.95rem;">
            ${term.content || ''}
          </div>

          <div style="margin-top:36px;padding:16px;background:#F8FAFC;border-radius:12px;font-size:0.8rem;color:#64748B;">
            <strong>Medical Review:</strong> ${escapeHtml(term.reviewedBy?.name || 'HealNari Advisory Board')} (${escapeHtml(term.reviewedBy?.credentials || 'MD')}). Last reviewed: ${escapeHtml(term.lastReviewed || '2026')}.
          </div>
        </article>
      </main>
    </div>
  `;
}

function renderCheckSymptomsShell(canonicalUrl) {
  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <a href="/" style="color:#6B46C1;font-weight:700;font-size:0.85rem;text-decoration:none;">Home</a>
        </div>
      </header>

      <main style="padding:32px 16px 80px;max-width:860px;margin:0 auto;">
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:18px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <span style="color:#64748B;">Check Symptoms</span>
        </nav>

        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <span style="background:#FDF2F8;border:1px solid #FBCFE8;color:#BE185D;font-size:0.75rem;font-weight:800;padding:4px 10px;border-radius:999px;">
            Free Clinical Triage • 2 Minutes
          </span>

          <h1 style="font-size:2rem;line-height:1.25;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:14px 0 16px;">
            Check Your Symptoms — Guided Clinical Navigation
          </h1>

          <p style="color:#475569;font-size:1.05rem;line-height:1.7;margin:0 0 24px;">
            Select the symptoms you are experiencing to receive evidence-based insights into possible hormonal, metabolic, or physical patterns, and connect directly with verified medical specialists.
          </p>

          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;">
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Irregular Periods</span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Period Pain &amp; Cramps</span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Hormonal Acne</span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Hair Fall &amp; Thinning</span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Thyroid &amp; Fatigue</span>
            <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.8rem;font-weight:700;padding:6px 14px;border-radius:999px;">Stubborn Weight</span>
          </div>

          <div style="background:#FAF8F5;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #E2E8F0;">
            <strong style="color:#1E293B;font-size:0.9rem;display:block;margin-bottom:8px;">How HealNari Clinical Triage Works:</strong>
            <ol style="margin:0;padding-left:20px;color:#475569;line-height:1.7;font-size:0.85rem;">
              <li>Select your primary concerns and timeline.</li>
              <li>Answer 2-3 focused clinical context questions.</li>
              <li>Review possible root-cause patterns (hormonal, nutritional, lifestyle).</li>
              <li>Match with council-registered doctors for a private video consultation.</li>
            </ol>
          </div>

          <div style="padding:14px;background:#F8FAFC;border-radius:12px;font-size:0.75rem;color:#94A3B8;text-align:center;">
            <strong>HealNari Clinical Care Notice:</strong> This assessment tool provides educational health navigation and is not an automated medical diagnosis. All treatment decisions are made by licensed medical doctors.
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderForDoctorsShell(canonicalUrl) {
  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <a href="#apply" style="background:#6B46C1;color:#fff;font-weight:700;padding:8px 18px;border-radius:12px;font-size:0.75rem;text-decoration:none;">Apply as Doctor</a>
        </div>
      </header>

      <main style="padding:32px 16px 80px;max-width:960px;margin:0 auto;">
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:18px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <span style="color:#64748B;">For Doctors</span>
        </nav>

        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <span style="background:#F5F3FF;border:1px solid #DDD6FE;color:#6D28D9;font-size:0.75rem;font-weight:800;padding:4px 10px;border-radius:999px;">
            Healthcare Provider Network
          </span>

          <h1 style="font-size:2rem;line-height:1.25;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:14px 0 16px;">
            Join HealNari as a Specialist Doctor — Telemedicine &amp; Practice Suite
          </h1>

          <p style="color:#475569;font-size:1.05rem;line-height:1.7;margin:0 0 24px;">
            Connect with patients seeking dedicated root-cause care across Gynaecology, Endocrinology, PCOS, Dermatology, Trichology, and Clinical Nutrition. Built with integrated EMR, digital Rx vault, and fast weekly payouts.
          </p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px;">
            <div style="background:#FAF8F5;border:1px solid #E2E8F0;border-radius:14px;padding:16px;">
              <strong style="color:#1E293B;font-size:0.9rem;display:block;margin-bottom:6px;">High-Intent Patients</strong>
              <p style="margin:0;font-size:0.85rem;color:#64748B;line-height:1.5;">Pre-triaged patient histories, symptom patterns, and lab roadmaps ready before the video call.</p>
            </div>
            <div style="background:#FAF8F5;border:1px solid #E2E8F0;border-radius:14px;padding:16px;">
              <strong style="color:#1E293B;font-size:0.9rem;display:block;margin-bottom:6px;">Practice Anywhere</strong>
              <p style="margin:0;font-size:0.85rem;color:#64748B;line-height:1.5;">Set your own consultation schedule and availability with high-definition secure WebRTC video.</p>
            </div>
            <div style="background:#FAF8F5;border:1px solid #E2E8F0;border-radius:14px;padding:16px;">
              <strong style="color:#1E293B;font-size:0.9rem;display:block;margin-bottom:6px;">Zero Hidden Fees</strong>
              <p style="margin:0;font-size:0.85rem;color:#64748B;line-height:1.5;">Transparent remuneration with verified direct bank deposits within 24-48 business hours.</p>
            </div>
          </div>

          <div style="text-align:center;">
            <a href="#apply" style="display:inline-block;background:linear-gradient(to right,#7C3AED,#DB2777);color:#fff;font-weight:800;padding:14px 32px;border-radius:12px;font-size:0.9rem;text-decoration:none;">
              Apply to Join the Medical Panel
            </a>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderLegalShell(title, canonicalUrl) {
  return `
    <div id="lcp-shell" style="position:absolute;top:0;left:0;width:100%;min-height:100vh;background-color:#FDFBF7;z-index:9999;">
      <header style="position:sticky;top:0;z-index:50;padding:14px 0;background-color:rgba(253,251,247,0.98);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;">
          <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;font-weight:900;color:#6B46C1;font-family:Georgia,serif;">Heal<span style="color:#E23E8C;">Nari</span></span>
          </a>
          <a href="/" style="color:#6B46C1;font-weight:700;font-size:0.85rem;text-decoration:none;">Home</a>
        </div>
      </header>

      <main style="padding:32px 16px 80px;max-width:820px;margin:0 auto;">
        <nav aria-label="Breadcrumb" style="font-size:0.8rem;color:#94A3B8;margin-bottom:18px;">
          <a href="/" style="color:#6B46C1;text-decoration:none;">Home</a> &gt; 
          <span style="color:#64748B;">Legal &amp; Clinical Governance</span> &gt; 
          <span style="color:#475569;">${escapeHtml(title)}</span>
        </nav>

        <article style="background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:36px 28px;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <h1 style="font-size:2rem;line-height:1.25;font-weight:800;color:#0F172A;font-family:Georgia,serif;margin:0 0 16px;">
            ${escapeHtml(title)}
          </h1>
          <p style="color:#64748B;font-size:0.85rem;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
            HealNari Clinical Care Platform • Telemedicine &amp; Healthcare Compliance Standard
          </p>
          <p style="color:#475569;line-height:1.8;font-size:0.95rem;">
            Loading official clinical governance policy and terms...
          </p>
        </article>
      </main>
    </div>
  `;
}

function writeHtmlFile(targetDir, htmlContent) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetFile = path.join(targetDir, 'index.html');
  fs.writeFileSync(targetFile, htmlContent, 'utf-8');
}

export function prerender() {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[Prerender] Error: ${indexHtmlPath} does not exist. Run 'vite build' first.`);
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  let count = 0;

  console.log('[Prerender] Starting static pre-rendering...');

  // 1. Pre-render 10 Condition Pages
  for (const [slug, condition] of Object.entries(conditionsData)) {
    const canonicalUrl = `${BASE_URL}/conditions/${slug}`;
    const title = condition.seoTitle || `${condition.title} | HealNari`;
    const description = condition.seoDescription || condition.subtitle;

    // Structured Data Schema
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalWebPage",
          "@id": `${canonicalUrl}#webpage`,
          "url": canonicalUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@type": "WebSite",
            "@id": `${BASE_URL}/#website`,
            "name": "HealNari",
            "url": BASE_URL
          },
          "about": {
            "@type": condition.schemaType || "MedicalCondition",
            "name": condition.schemaDisease || condition.title,
            "possibleTreatment": [
              {
                "@type": "TherapeuticProcedure",
                "name": "Specialist Video Medical Consultation"
              },
              {
                "@type": "DietarySupplement",
                "name": "Personalized Nutrition & Lifestyle Protocol"
              }
            ]
          },
          "professionallyReviewedBy": {
            "@type": "MedicalOrganization",
            "name": "HealNari Clinical Advisory Board",
            "url": BASE_URL
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
            { "@type": "ListItem", "position": 2, "name": "Specialties", "item": `${BASE_URL}/#conditions` },
            { "@type": "ListItem", "position": 3, "name": condition.title, "item": canonicalUrl }
          ]
        }
      ]
    };

    if (condition.faqs && condition.faqs.length > 0) {
      schema["@graph"].push({
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        "mainEntity": condition.faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
          }
        }))
      });
    }

    let pageHtml = updateHeadMeta(baseHtml, {
      title,
      description,
      canonicalUrl,
      schemaJson: schema
    });

    const shellHtml = renderConditionShell(condition, canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'conditions', slug), pageHtml);
    count++;
    console.log(`  [OK] /conditions/${slug}`);
  }

  // 2. Pre-render 8 Clinical Guide Pages
  for (const guide of guidesData) {
    const slug = guide.slug || guide.id;
    const canonicalUrl = `${BASE_URL}/guide/${slug}`;
    const title = `${guide.title} | HealNari Clinical Guides`;
    const description = guide.summary;

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": `${canonicalUrl}#article`,
          "headline": guide.title,
          "description": guide.summary,
          "url": canonicalUrl,
          "author": {
            "@type": "Person",
            "name": guide.author?.name || "HealNari Clinical Team",
            "jobTitle": guide.author?.role || "Medical Specialist"
          },
          "publisher": {
            "@type": "Organization",
            "name": "HealNari",
            "url": BASE_URL,
            "logo": {
              "@type": "ImageObject",
              "url": `${BASE_URL}/brand/logo.svg`
            }
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
            { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${BASE_URL}/#care-discovery` },
            { "@type": "ListItem", "position": 3, "name": guide.title, "item": canonicalUrl }
          ]
        }
      ]
    };

    let pageHtml = updateHeadMeta(baseHtml, {
      title,
      description,
      canonicalUrl,
      schemaJson: schema
    });

    const shellHtml = renderGuideShell(guide, canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'guide', slug), pageHtml);
    count++;
    console.log(`  [OK] /guide/${slug}`);
  }

  // 3. Pre-render 4 Medical Glossary / Learn Pages
  for (const [slug, term] of Object.entries(glossaryData)) {
    const canonicalUrl = `${BASE_URL}/learn/${slug}`;
    const title = term.seoTitle || `${term.title} | HealNari Medical Learn`;
    const description = term.seoDescription;

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalWebPage",
          "@id": `${canonicalUrl}#webpage`,
          "name": term.title,
          "description": term.seoDescription,
          "url": canonicalUrl,
          "publisher": {
            "@type": "Organization",
            "name": "HealNari",
            "url": BASE_URL
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
            { "@type": "ListItem", "position": 2, "name": "Learn", "item": `${BASE_URL}/#care-discovery` },
            { "@type": "ListItem", "position": 3, "name": term.title, "item": canonicalUrl }
          ]
        }
      ]
    };

    let pageHtml = updateHeadMeta(baseHtml, {
      title,
      description,
      canonicalUrl,
      schemaJson: schema
    });

    const shellHtml = renderGlossaryShell(term, canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'learn', slug), pageHtml);
    count++;
    console.log(`  [OK] /learn/${slug}`);
  }

  // 4. Pre-render /check-symptoms
  {
    const canonicalUrl = `${BASE_URL}/check-symptoms`;
    const title = 'Free Online Symptom Checker & Specialist Triage | HealNari';
    const description = 'Check your symptoms online in 2 minutes. Free clinical triage for irregular periods, hormonal acne, hair loss, thyroid, and fatigue with specialist care recommendations.';

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalWebPage",
          "@id": `${canonicalUrl}#webpage`,
          "url": canonicalUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@type": "WebSite",
            "@id": `${BASE_URL}/#website`,
            "name": "HealNari",
            "url": BASE_URL
          },
          "about": {
            "@type": "MedicalSpecialty",
            "name": "Clinical Symptom Assessment & Telemedicine Triage"
          },
          "professionallyReviewedBy": {
            "@type": "MedicalOrganization",
            "name": "HealNari Clinical Advisory Board",
            "url": BASE_URL
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
            { "@type": "ListItem", "position": 2, "name": "Check Symptoms", "item": canonicalUrl }
          ]
        }
      ]
    };

    let pageHtml = updateHeadMeta(baseHtml, {
      title,
      description,
      canonicalUrl,
      schemaJson: schema
    });

    const shellHtml = renderCheckSymptomsShell(canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'check-symptoms'), pageHtml);
    count++;
    console.log('  [OK] /check-symptoms');
  }

  // 5. Pre-render /for-doctors
  {
    const canonicalUrl = `${BASE_URL}/for-doctors`;
    const title = 'Join as a Specialist Doctor | Telemedicine Practice Suite | HealNari';
    const description = 'Join HealNari medical panel. Deliver 45-min video consultations across Gynaecology, Endocrinology, Dermatology, and Nutrition with integrated EMR, digital Rx vault, and fast payouts.';

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${canonicalUrl}#webpage`,
          "url": canonicalUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@type": "WebSite",
            "@id": `${BASE_URL}/#website`,
            "name": "HealNari",
            "url": BASE_URL
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
            { "@type": "ListItem", "position": 2, "name": "For Doctors", "item": canonicalUrl }
          ]
        }
      ]
    };

    let pageHtml = updateHeadMeta(baseHtml, {
      title,
      description,
      canonicalUrl,
      schemaJson: schema
    });

    const shellHtml = renderForDoctorsShell(canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'for-doctors'), pageHtml);
    count++;
    console.log('  [OK] /for-doctors');
  }

  // 6. Pre-render 4 Legal Pages
  const legalPages = [
    { slug: 'terms', title: 'Terms of Service & Telemedicine Consultation Agreement | HealNari' },
    { slug: 'privacy', title: 'Privacy Policy & Clinical Data Protection | HealNari' },
    { slug: 'refund', title: 'Refund & Cancellation Policy | HealNari' },
    { slug: 'compliance', title: 'Global Healthcare Compliance & Telemedicine Standards | HealNari' }
  ];

  for (const page of legalPages) {
    const canonicalUrl = `${BASE_URL}/legal/${page.slug}`;
    const description = `${page.title} — HealNari Patient & Provider Clinical Governance Policy.`;

    let pageHtml = updateHeadMeta(baseHtml, {
      title: page.title,
      description,
      canonicalUrl
    });

    const shellHtml = renderLegalShell(page.title, canonicalUrl);
    pageHtml = pageHtml.replace(/<div id="lcp-shell".*?<\/div>\s*<script>/s, `${shellHtml}\n    <script>`);

    writeHtmlFile(path.join(DIST_DIR, 'legal', page.slug), pageHtml);
    count++;
    console.log(`  [OK] /legal/${page.slug}`);
  }

  console.log(`[Prerender] Successfully generated ${count} static HTML pages for SEO & crawlers!`);
}

// Auto-run if executed directly via node prerender.mjs
prerender();
