const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing Email Configuration...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verify connection configuration
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Server is ready to take our messages');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Sending to yourself for testing
      subject: 'HealNari - Test Email',
      text: 'This is a test email to verify the HealNari SMTP configuration is working correctly.',
      html: '<b>This is a test email to verify the HealNari SMTP configuration is working correctly.</b>',
    });

    console.log('✅ Message sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nPlease check your inbox at:', process.env.SMTP_USER);
  } catch (error) {
    console.error('❌ Failed to send email.');
    console.error('Error Details:', error.message);
    if (error.code === 'EAUTH') {
      console.log('\n💡 Hint: If using Gmail, make sure you are using an "App Password" rather than your normal account password, or that Less Secure Apps is enabled.');
    }
  }
}

testEmail();
