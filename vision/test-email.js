require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER, // send to self
      subject: "Test Email from Healnari",
      text: "This is a test email to verify SMTP configuration.",
    });
    console.log("Email sent successfully: " + info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

testEmail();
