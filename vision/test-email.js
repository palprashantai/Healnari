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

    console.log('\n2. Sending test email...');
    const info = await transporter.sendMail({
      from,
      to: user, // send to self
      subject: 'HealNari Production SMTP Verification',
      text: 'This email verifies that your SMTP transport is correctly configured and operational.',
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
