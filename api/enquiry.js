// Vercel serverless function: POST /api/enquiry
// Sends website enquiries to MAIL_TO through Zoho Mail SMTP.
// All credentials come from environment variables (see .env.example).
const nodemailer = require('nodemailer');

const env = (k, d) => (process.env[k] ?? d);
const MAX_LEN = 2000;
const hits = new Map(); // best-effort rate limit per warm instance

const FIELD_LABELS = {
  enquiry: 'Enquiry', summary: 'Summary', name: 'Name', phone: 'Phone', email: 'Email',
  service: 'Service', destination: 'Destination', travel_month: 'Travel month',
  travellers: 'Travellers', details: 'Details', page: 'Sent from page',
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = s => String(s ?? '').replace(/\r/g, '').trim().slice(0, MAX_LEN);
const oneLine = s => clean(s).replace(/[\n\t]+/g, ' ');

function transport() {
  if (env('MAIL_DRY_RUN') === '1') return nodemailer.createTransport({ jsonTransport: true });
  const port = Number(env('SMTP_PORT', '465'));
  return nodemailer.createTransport({
    host: env('SMTP_HOST', 'smtppro.zoho.in'),
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });
}

function allowedOrigin(origin) {
  const list = env('ALLOWED_ORIGINS', '').split(',').map(s => s.trim()).filter(Boolean);
  return !origin || list.length === 0 || list.includes(origin);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (origin && allowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!allowedOrigin(origin)) return res.status(403).json({ ok: false, error: 'Origin not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot: real visitors never fill the hidden "company" field.
  if (clean(body.company)) return res.status(200).json({ ok: true });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: 'Too many enquiries, please try again later' });
  hits.set(ip, [...recent, now]);

  const name = oneLine(body.name), phone = oneLine(body.phone), email = oneLine(body.email);
  if (!name || phone.replace(/\D/g, '').length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Name, a 10-digit phone number and a valid email are required' });
  }

  const rows = Object.keys(FIELD_LABELS)
    .filter(k => clean(body[k]) && clean(body[k]) !== '-')
    .map(k => [FIELD_LABELS[k], clean(body[k])]);
  const subject = oneLine(body.subject || `Website enquiry: ${body.enquiry || body.service || name}`).slice(0, 150);

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><th align="left" style="background:#f2f4f3;border:1px solid #dfe4e3;vertical-align:top">${esc(k)}</th><td style="border:1px solid #dfe4e3;white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join('')}</table>`;

  try {
    const info = await transport().sendMail({
      from: { name: env('MAIL_FROM_NAME', 'Hyderabad Holidays Co. Website'), address: env('MAIL_FROM', 'contact@hydholidays.com') },
      to: env('MAIL_TO', 'contact@hydholidays.com'),
      replyTo: { name, address: email },
      subject, text, html,
    });
    if (env('MAIL_DRY_RUN') === '1') console.log(info.message.toString());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry email failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Could not send email' });
  }
};
