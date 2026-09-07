require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE !== undefined && process.env.SMTP_SECURE !== ''
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;
  const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  const from =
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    'HealNari <palprashant90.ai@gmail.com>';

  console.log('--- HealNari SMTP Diagnostic Test ---');
  console.log(`Host: ${host}`);
  console.log(`Port: ${port} (secure: ${secure})`);
  console.log(`User: ${user ? user.slice(0, 3) + '***' : '(empty)'}`);
  console.log(`From: ${from}`);

  if (!host || !user || !pass) {
    console.error('ERROR: Missing required SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    dnsTimeout: 5000,
    tls: { rejectUnauthorized: false },
  });

  try {
    console.log('\n1. Verifying SMTP connection & TLS handshake...');
    await transporter.verify();
    console.log('   ✓ SMTP connection and authentication verified successfully!');

    const targetRecipient = process.argv[2] || user;
    console.log(`\n2. Sending test email to ${targetRecipient}...`);
    const info = await transporter.sendMail({
      from,
      to: targetRecipient,
      subject: 'HealNari Production SMTP Verification',
      text: `This email verifies that your SMTP transport is correctly configured and operational. Sent to: ${targetRecipient}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; max-width: 520px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #2A1647 0%, #6B46C1 100%); color: #ffffff; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">HealNari SMTP Delivery Verification</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your HealNari production SMTP service is successfully connected and delivering messages to <strong>${targetRecipient}</strong>.
          </p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #475569;">
            <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p style="margin: 4px 0 0 0;"><strong>Sender:</strong> ${from}</p>
          </div>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">HealNari Telemedicine Platform</p>
        </div>
      `,
    });
    console.log('   ✓ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
  } catch (err) {
    console.error('\n✗ SMTP Test Failed!');
    console.error(`  Code: ${err.code || 'N/A'}`);
    console.error(`  Message: ${err.message}`);
    if (err.code === 'ETIMEDOUT' || (err.message && err.message.includes('Connection timeout'))) {
      console.error('\n  [DIAGNOSIS: CONNECTION TIMEOUT]');
      console.error('  Outbound connections on SMTP ports 25, 465, and 587 are blocked on Render Free Tier.');
      console.error('  Solution: Upgrade Render to Starter tier ($7/mo) or deploy to an SMTP-compatible environment.');
    } else if (err.responseCode === 535 || (err.message && err.message.includes('Username and Password not accepted'))) {
      console.error('\n  [DIAGNOSIS: AUTHENTICATION FAILED]');
      console.error('  If using Gmail, verify you are using a 16-character Google App Password (not your account password).');
    }
    process.exit(1);
  }
}

testEmail();
