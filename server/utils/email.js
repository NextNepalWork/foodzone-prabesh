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
    // Some hosts (Hostinger included) resolve to an IPv6 address that isn't
    // routable from certain container networks (e.g. Railway) — force IPv4.
    family: 4,
    // Never let a slow SMTP server hang an order/notification flow.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
} else {
  console.warn('⚠️ SMTP not configured — email sending disabled (set SMTP_HOST/SMTP_USER/SMTP_PASS)');
}

// Health state exposed via GET /api/admin/email-status so delivery failures
// are visible in the admin UI instead of only in server logs.
const emailStatus = {
  configured: smtpConfigured,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  sent: 0,
  failed: 0,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!transporter) {
    throw new Error('Email is not configured on this server');
  }
  const message = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
    replyTo,
  };

  // One retry with a short backoff — transient SMTP hiccups are common.
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await transporter.sendMail(message);
      emailStatus.lastSuccessAt = new Date().toISOString();
      emailStatus.sent += 1;
      return result;
    } catch (err) {
      lastError = err;
      console.error(`EMAIL_FAIL attempt ${attempt} → ${to} (${subject}):`, err.message);
      if (attempt === 1) await sleep(2000);
    }
  }
  emailStatus.lastErrorAt = new Date().toISOString();
  emailStatus.lastError = lastError.message;
  emailStatus.failed += 1;
  throw lastError;
}

function getEmailStatus() {
  return { ...emailStatus };
}

module.exports = { sendEmail, smtpConfigured, getEmailStatus };
