const nodemailer = require('nodemailer');

const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for 587/STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('⚠️ SMTP not configured — email sending disabled (set SMTP_HOST/SMTP_USER/SMTP_PASS)');
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!transporter) {
    throw new Error('Email is not configured on this server');
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

module.exports = { sendEmail, smtpConfigured };
