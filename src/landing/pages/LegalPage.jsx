import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const policies = {
  'terms': {
    title: 'Terms of Service',
    updated: 'August 18, 2026',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>Welcome to HealNari. These Terms of Service ("Terms") govern your access to and use of our telemedicine platform, services, and website. By creating an account or accessing our platform, you agree to be bound by these Terms.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">1. Medical Disclaimer (Not for Emergencies)</h3>
        <p><strong>CRITICAL:</strong> HealNari provides digital health consultations and structured wellness protocols. The content on this platform is for informational purposes only. Our services are <strong>NOT</strong> a substitute for emergency care or local emergency medical services. If you are experiencing acute pain, severe bleeding, or any medical emergency, please visit your nearest hospital immediately.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">2. Telemedicine Services & Consent to Treat</h3>
        <p>Consultations are provided by licensed medical professionals. By booking a consultation, you explicitly consent to receive medical care via telehealth technologies (video, audio, and secure messaging). You understand that telemedicine has limitations compared to in-person physical examinations.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">3. User Responsibilities & Account Security</h3>
        <p>You must be at least 18 years old to create an account. You are strictly responsible for maintaining the confidentiality of your account credentials. You must not share your login details with anyone. Any activity occurring under your account is your responsibility.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">4. Prescriptions & Lab Tests</h3>
        <p>Our physicians may prescribe medications or order lab tests based on their clinical judgment. There is no guarantee that a consultation will result in a prescription. We do not prescribe controlled substances or any medications prohibited by local telemedicine regulations in your jurisdiction.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">5. Payments & Billing</h3>
        <p>All fees for consultations must be paid in advance. By providing a payment method, you authorize our third-party payment gateway (Cashfree) to charge the applicable fees. Please refer to our Refund Policy for details on cancellations.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">6. Limitation of Liability</h3>
        <p>To the fullest extent permitted by law, HealNari shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the services.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">7. Governing Law</h3>
        <p>These terms are governed by the laws of the jurisdiction in which the treating clinic is registered, without regard to its conflict of law principles.</p>
      </div>
    )
  },
  'privacy': {
    title: 'Privacy Policy',
    updated: 'August 18, 2026',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>Your privacy is our highest priority. This policy outlines how HealNari collects, uses, and protects your personal and medical information in strict accordance with global compliance standards including HIPAA (USA), GDPR (EU/UK), and DHA (UAE).</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">1. Patient Health Information (PHI) & HIPAA Compliance</h3>
        <p>We treat all medical data, lab reports, and consultation notes as Protected Health Information (PHI). Your PHI is heavily siloed. Doctors are strictly prohibited from viewing your records unless they have a verified, active care relationship with you (e.g., an upcoming or past appointment). This is enforced via cryptographic boundaries in our backend.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">2. GDPR Compliance & Your Rights</h3>
        <p>If you reside in the UK or EU, you have the right to access, rectify, or request the erasure of your personal data ("Right to be Forgotten"). We implement Row-Level Security (RLS) and soft-deletion protocols to ensure your data is permanently inaccessible when requested, without corrupting clinical integrity.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">3. Data Security & Encryption</h3>
        <p>All data is encrypted both in transit and at rest. We utilize AES-256 bit encryption for our databases. For live telemedicine sessions, we use WebRTC with mandatory DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol) to ensure your video streams cannot be intercepted.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">4. Audit Trails & Accountability</h3>
        <p>Every time a clinician or administrator accesses your medical records, the action is immutably recorded in our PHI Audit Logs. This ledger tracks who accessed what data and when, ensuring full medical compliance and traceability.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">5. Third-Party Sharing</h3>
        <p>We do not sell your data. We only share necessary information with verified third-party partners (like diagnostic laboratories or payment gateways) strictly for the purpose of fulfilling your clinical care or processing your payments.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">6. Passwords & Authentication</h3>
        <p>We use Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) for temporary password generation and employ strict brute-force rate-limiting on all authentication endpoints to protect your account from unauthorized access.</p>
      </div>
    )
  },
  'refund': {
    title: 'Refund & Cancellation',
    updated: 'August 18, 2026',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>We strive to provide excellent and timely clinical service. This policy covers patient-initiated cancellations, doctor no-shows, and refund eligibility.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">1. Patient-Initiated Cancellations</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>More than 24 hours in advance:</strong> You may cancel or reschedule your appointment at no cost. A full 100% refund will be issued.</li>
          <li><strong>Between 12 to 24 hours in advance:</strong> Cancellations are subject to a 50% cancellation fee to compensate the clinician for the blocked time.</li>
          <li><strong>Less than 12 hours in advance (or No-Show):</strong> No refunds will be issued for last-minute cancellations or failure to join the consultation room.</li>
        </ul>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">2. Doctor No-Shows & Platform Cancellations</h3>
        <p>If a doctor fails to attend a scheduled appointment, our system will automatically flag the session as a "No-Show" by the provider. In this scenario, a <strong>full 100% refund</strong> will be immediately and automatically initiated to your original payment method. You will also be offered priority rescheduling.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">3. Technical Issues</h3>
        <p>If your consultation cannot be completed due to severe technical difficulties on our platform's end (e.g., video server outage), you are eligible for a full refund or a free reschedule. Issues caused by the patient's local internet connection do not qualify for a refund.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">4. Lab Tests & Prescriptions</h3>
        <p>Once a lab test has been dispatched or a sample has been collected, the fee is entirely non-refundable. Prescription fees are for the consultation time, not the medication itself, and are non-refundable once the consultation has concluded.</p>
        
        <h3 className="text-xl font-bold text-slate-900 mt-8 border-b pb-2">5. Refund Processing Timelines</h3>
        <p>Approved refunds are processed instantly by our system but may take <strong>5 to 7 business days</strong> to reflect on your bank or credit card statement, depending on your financial institution.</p>
      </div>
    )
  },
  'compliance': {
    title: 'Global Compliance & Security',
    updated: 'August 18, 2026',
    content: (
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <p className="text-lg">HealNari is architected from the ground up to meet the most stringent global healthcare data security standards. We employ cryptographic boundaries, immutable audit trails, and end-to-end encryption to protect your medical data.</p>
        
        <div className="grid gap-6 sm:grid-cols-2 mt-8">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
              <i className="fas fa-shield-virus text-emerald-600 text-xl"></i> HIPAA Compliant (USA)
            </h3>
            <p className="text-sm">We strictly enforce the "Minimum Necessary" rule. Doctors are cryptographically prevented from querying your Patient Health Information (PHI) unless a verified care relationship (appointment) exists. All data accesses are logged in an immutable PHI audit ledger.</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
              <i className="fas fa-user-lock text-blue-600 text-xl"></i> GDPR Ready (UK & EU)
            </h3>
            <p className="text-sm">We implement comprehensive Row-Level Security (RLS) to ensure absolute data isolation. You maintain full control over your data, including the right to erasure (soft-deletes) and the ability to selectively grant or revoke access via Care Connections.</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
              <i className="fas fa-certificate text-amber-600 text-xl"></i> DHA & GCC Aligned
            </h3>
            <p className="text-sm">Aligned with the Dubai Health Authority (DHA) and GCC standards for telemedicine. Authentication is hardened against brute-force attacks, and auto-generated patient passwords utilize Cryptographically Secure Pseudo-Random Number Generators (CSPRNG).</p>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
              <i className="fas fa-lock text-purple-600 text-xl"></i> 256-Bit Encrypted Video
            </h3>
            <p className="text-sm">Your live telemedicine consultations are fiercely protected. We leverage WebRTC with mandatory DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol) to guarantee end-to-end 256-bit encryption for all audio and video streams.</p>
          </div>
        </div>
      </div>
    )
  }
};

function LegalPage() {
  const { document } = useParams();
  const navigate = useNavigate();
  const policy = policies[document] || policies['privacy'];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [document]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header onOpenAuth={() => navigate('/')} />

      <div className="bg-aubergine-900 text-white py-12 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-black font-display">{policy.title}</h1>
          <p className="text-aubergine-200">Last Updated: {policy.updated}</p>
        </div>
      </div>

      <main className="flex-grow bg-white py-12 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {policy.content}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default LegalPage;
