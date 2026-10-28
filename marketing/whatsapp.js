// WhatsApp offers agent for Hyderabad Holidays Co.
// Runs all the time on an always-on computer, logged in to WhatsApp Web as a spare number that is a
// member of our supplier groups. It saves the messages (text and posters) from the groups named in
// WA_GROUPS. At DIGEST_TIMES Claude reads the new ones, picks out complete holiday and fare offers,
// and leaves out supplier names, numbers and links. Each offer goes to the owner (WA_OWNER) on WhatsApp
// with our price: the supplier's price plus MARKUP_PERCENT. When the owner replies "yes <number>",
// it starts the Daily blog and Daily social post workflows on GitHub with that offer, which publish it.
//
// This uses Baileys, an unofficial WhatsApp Web library. WhatsApp's terms do not allow it and the
// number can be banned, so use a spare number, never +91 70750 40406. Setup: marketing/README.md
// ("WhatsApp offers agent").
//
//   npm run whatsapp                run (shows a QR code to scan on first start)
//   npm run whatsapp -- --groups    list the groups the number is in, then exit
//
// The owner can also send "check" (read the groups now) and "list" (offers waiting for a reply).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import makeWASocket, {
  DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, isJidGroup, jidNormalizedUser,
  normalizeMessageContent, useMultiFileAuthState,
} from 'baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { z } from 'zod';
import { OFFER_KINDS } from './offer.js';

const env = (k, d) => (process.env[k] || d);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, '.state', 'whatsapp');
const AUTH = path.join(STATE, 'auth');
const MEDIA = path.join(STATE, 'media');
const INBOX = path.join(STATE, 'inbox.jsonl');
const DB_FILE = path.join(STATE, 'db.json');
const MODEL = env('CLAUDE_MODEL', 'claude-opus-5-5');
const GROUPS = env('WA_GROUPS', '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const OWNER_JID = `${env('WA_OWNER', '').replace(/\D/g, '')}@s.whatsapp.net`;
const MARKUP = Number(env('MARKUP_PERCENT', '10'));
const DIGEST_TIMES = env('DIGEST_TIMES', '11:00,17:00').split(',').map(s => s.trim().padStart(5, '0')).filter(Boolean);
const REPO = env('GITHUB_REPO', 'ops1hnhco/hydholidays-website');
const PUBLISH_DRY_RUN = env('PUBLISH_DRY_RUN') === '1';
const LIST_GROUPS = process.argv.includes('--groups');
const BATCH = 40; // messages per Claude call
const MAX_IMAGE = 5e6; // bytes; larger posters are skipped

const missing = ['ANTHROPIC_API_KEY', 'WA_OWNER', 'WA_GROUPS', 'GITHUB_TOKEN'].filter(k => !env(k));
if (!LIST_GROUPS && missing.length) {
  console.error(`Missing ${missing.join(', ')}. Put them in marketing/.env (see .env.example).`);
  process.exit(1);
}
fs.mkdirSync(MEDIA, { recursive: true });

const ist = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); // "YYYY-MM-DD HH:MM"
const log = (...a) => console.log(ist(), ...a);

// Offers sent to the owner, how far the inbox has been read, and which digests have run.
const db = (() => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { next: 1, read: 0, drafts: [], ran: [] }; }
})();
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));

// ---- WhatsApp ----

const logger = pino({ level: 'error' });
const groupNames = new Map();
let sock, online = false;

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, logger, markOnlineOnConnect: false, syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', onConnection);
  sock.ev.on('messages.upsert', onMessages);
  sock.ev.on('groups.update', ups => ups.forEach(g => g.id && g.subject && groupNames.set(g.id, g.subject)));
}

async function onConnection({ connection, lastDisconnect, qr }) {
  if (qr) {
    console.log('\nOn the spare phone open WhatsApp → Settings → Linked devices → Link a device, and scan:\n');
    qrcode.generate(qr, { small: true });
  }
  if (connection === 'open') {
    online = true;
    const all = await sock.groupFetchAllParticipating();
    groupNames.clear();
    for (const [jid, g] of Object.entries(all)) groupNames.set(jid, g.subject);
    if (LIST_GROUPS) {
      console.log(`\nGroups (${groupNames.size}):\n${[...groupNames.values()].sort().map(n => `  ${n}`).join('\n')}`);
      process.exit(0);
    }
    const names = new Set([...groupNames.values()].map(n => n.toLowerCase()));
    const absent = GROUPS.filter(g => !names.has(g));
    log(`Connected. Watching ${GROUPS.length - absent.length} groups${absent.length ? `; not a member of: ${absent.join(', ')}` : ''}. Digests at ${DIGEST_TIMES.join(', ')} IST.`);
  }
  if (connection === 'close') {
    online = false;
    const code = lastDisconnect?.error?.output?.statusCode;
    if (code === DisconnectReason.loggedOut) {
      console.error('WhatsApp logged this device out. Delete marketing/.state/whatsapp/auth and start again to scan a new QR code.');
      process.exit(1);
    }
    log(`Disconnected (${code || lastDisconnect?.error?.message}), reconnecting`);
    setTimeout(connect, code === DisconnectReason.restartRequired ? 0 : 5000);
  }
}

const textOf = m => (m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption
  || m?.videoMessage?.caption || m?.documentMessage?.caption || '').trim();
const isOwner = key => [key.remoteJid, key.remoteJidAlt].some(j => j && jidNormalizedUser(j) === OWNER_JID);

async function onMessages({ messages, type }) {
  if (type !== 'notify') return; // skip history synced from the phone
  for (const msg of messages) {
    if (msg.key.fromMe || !msg.message) continue;
    const jid = msg.key.remoteJid;
    const m = normalizeMessageContent(msg.message);
    const text = textOf(m);
    if (!isJidGroup(jid)) {
      if (isOwner(msg.key)) await command(text).catch(err => log('Command failed:', err.message));
      else log(`Ignored a direct message from ${jid}${msg.key.remoteJidAlt ? ` (${msg.key.remoteJidAlt})` : ''}`);
      continue;
    }
    const group = groupNames.get(jid);
    if (!group || !GROUPS.includes(group.toLowerCase())) continue;
    let image = '';
    const img = m?.imageMessage;
    if (img && Number(img.fileLength || 0) <= MAX_IMAGE) {
      try {
        const buf = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
        image = `${msg.key.id}.${(img.mimetype || 'image/jpeg').split('/')[1].split(';')[0]}`;
        fs.writeFileSync(path.join(MEDIA, image), buf);
      } catch (err) { log(`Could not download a poster from ${group}: ${err.message}`); }
    }
    if (!text && !image) continue;
    const at = ist(new Date(Number(msg.messageTimestamp) * 1000 || Date.now()));
    fs.appendFileSync(INBOX, JSON.stringify({ id: msg.key.id, group, at, text, image }) + '\n');
  }
}

const tell = text => sock.sendMessage(OWNER_JID, { text });

// ---- Finding offers ----

const SYSTEM = `You read WhatsApp groups where travel suppliers (tour operators, destination management companies, airline ticket consolidators) share offers with travel agents. We are Hyderabad Holidays Co., a travel agency in Hyderabad, India, and we resell these offers to our customers. You pick out the offers worth showing the owner, who decides what to publish on our blog and social media.

Choosing:
- An offer needs a destination and at least a price or clear travel dates. Skip greetings, questions, requests from other agents, job posts, chit-chat and teasers without details.
- Many offers are only in the poster image, so read images carefully.
- Skip offers whose booking or travel dates are already over.
- The same offer is often posted several times or in several groups: return it once, with the ids of all the messages it came from. Skip offers that match one already sent to the owner.

Writing each offer:
- Use only what the messages say. Never guess prices, dates or inclusions; leave a field empty if it is not given.
- Never include supplier or agency names, people's names, phone numbers, emails, links, or agent commission and B2B terms in any field except for_owner. Customers will see everything else.
- kind: flight offer for airfares only; domestic package for trips within India; international package for trips abroad.
- title: short and specific, like "Bali 5N/6D with private pool villa".
- supplier_price: the price in Indian rupees as given, per person where stated (the lowest clearly stated one, with its basis, e.g. "per person, twin sharing", in price_basis). If the price is in another currency or unclear, use null and explain in for_owner.
- notes: anything else customers need (hotel category, minimum travellers, blackout dates).
- for_owner: what the owner should know before approving: other price options, currency, doubts, missing details. Empty if nothing.`;

const Offers = z.object({
  offers: z.array(z.object({
    kind: z.enum(OFFER_KINDS),
    title: z.string(),
    destination: z.string(),
    duration: z.string(),
    travel_dates: z.string(),
    valid_until: z.string().describe('Last booking date, e.g. 15 November 2026, or empty'),
    inclusions: z.array(z.string()),
    exclusions: z.array(z.string()),
    supplier_price: z.number().nullable(),
    price_basis: z.string(),
    notes: z.string(),
    for_owner: z.string(),
    from: z.array(z.string()).describe('ids of the messages this offer comes from'),
  })),
});

async function extract(client, batch) {
  const content = [];
  for (const r of batch) {
    content.push({ type: 'text', text: `[${r.id}] ${r.group} · ${r.at}\n${r.text || '(poster only)'}` });
    const file = r.image && path.join(MEDIA, r.image);
    if (file && fs.existsSync(file)) {
      const media_type = `image/${r.image.split('.').pop().replace('jpg', 'jpeg')}`;
      if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(media_type)) {
        content.push({ type: 'image', source: { type: 'base64', media_type, data: fs.readFileSync(file).toString('base64') } });
      }
    }
  }
  const sent = db.drafts.slice(-60).map(d => `- ${d.created.slice(0, 10)}: ${d.title}`).join('\n') || '- none yet';
  content.push({ type: 'text', text: `Today is ${ist().slice(0, 10)} (IST).\n\nOffers already sent to the owner:\n${sent}\n\nPick out the new offers in the messages above.` });
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Offers) },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new Error(`Claude declined: ${res.stop_details?.explanation || 'no reason given'}`);
  if (!res.parsed_output) throw new Error(`Claude returned no offers (stop reason: ${res.stop_reason})`);
  return res.parsed_output.offers;
}

const rupees = n => `₹${n.toLocaleString('en-IN')}`;

function draftText(d) {
  const price = d.supplier_price
    ? `Supplier ${rupees(d.supplier_price)} ${d.price_basis} → we show *${rupees(d.price)}* (+${MARKUP}%)`
    : 'No price: posts will invite readers to ask for a quote';
  return [
    `*Offer ${d.id}* · ${d.kind}`,
    `*${d.title}*`,
    [d.destination, d.duration].filter(Boolean).join(' · '),
    `Travel: ${d.travel_dates || 'not given'} · Book by: ${d.valid_until || 'not given'}`,
    d.inclusions.length && `Includes: ${d.inclusions.join('; ')}`,
    d.exclusions.length && `Excludes: ${d.exclusions.join('; ')}`,
    d.notes && `Notes: ${d.notes}`,
    price,
    d.for_owner && `⚠️ ${d.for_owner}`,
    `From: ${d.groups.join(', ') || 'the groups'}`,
  ].filter(Boolean).join('\n')
    + `\n\nReply *yes ${d.id}* to publish on the blog, Facebook, Instagram, X and YouTube, *yes ${d.id} 24999* for your own price, *yes ${d.id} no price*, or *no ${d.id}*.`;
}

let busy = false;
async function digest(manual) {
  if (busy) return manual && tell('Already checking, please wait.');
  busy = true;
  try {
    const lines = fs.existsSync(INBOX) ? fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean) : [];
    const fresh = lines.slice(db.read).map(l => JSON.parse(l));
    let found = 0;
    const client = new Anthropic();
    for (let i = 0; i < fresh.length; i += BATCH) {
      const batch = fresh.slice(i, i + BATCH);
      for (const o of await extract(client, batch)) {
        const price = o.supplier_price ? Math.ceil(o.supplier_price * (1 + MARKUP / 100) / 100) * 100 : null;
        const groups = [...new Set(batch.filter(r => o.from.includes(r.id)).map(r => r.group))];
        const d = { id: db.next++, status: 'waiting', created: ist(), ...o, groups, price };
        db.drafts = [...db.drafts, d].slice(-200);
        saveDb();
        await tell(draftText(d));
        found++;
      }
      db.read += batch.length;
      saveDb();
      for (const r of batch) if (r.image) fs.rmSync(path.join(MEDIA, r.image), { force: true });
    }
    // Start a fresh inbox, unless messages arrived while Claude was reading.
    if (lines.length && fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).length === db.read) {
      fs.writeFileSync(INBOX, '');
      db.read = 0;
      saveDb();
    }
    log(`Digest: ${fresh.length} new messages, ${found} offers sent to the owner`);
    if (manual && !found) await tell(`Checked ${fresh.length} new messages: no new offers.`);
  } catch (err) {
    log('Digest failed:', err.message);
    await tell(`The offers check failed: ${err.message}`).catch(() => {});
  } finally {
    busy = false;
  }
}

// ---- Owner's replies ----

const HELP = 'Reply "yes 12" to publish offer 12, "yes 12 24999" for your own price, "yes 12 no price", or "no 12". Send "list" for offers waiting, or "check" to read the groups now.';

async function command(text) {
  const t = text.toLowerCase();
  if (t === 'check') return digest(true);
  if (t === 'list') {
    const waiting = db.drafts.filter(d => d.status === 'waiting');
    return tell(waiting.length ? waiting.map(d => `${d.id}: ${d.title}${d.price ? ` · ${rupees(d.price)}` : ''}`).join('\n') : 'No offers waiting.');
  }
  const m = t.match(/^(yes|no)\s+#?(\d+)\s*(.*)$/);
  if (!m) return tell(HELP);
  const d = db.drafts.find(x => x.id === Number(m[2]));
  if (!d) return tell(`There is no offer ${m[2]}.`);
  if (d.status !== 'waiting') return tell(`Offer ${d.id} is already ${d.status}.`);
  if (m[1] === 'no') {
    d.status = 'skipped';
    saveDb();
    return tell(`Skipped offer ${d.id}.`);
  }
  if (/no price/.test(m[3])) d.price = null;
  else if (/\d/.test(m[3])) d.price = Number(m[3].replace(/\D/g, ''));
  const started = await publish(d);
  d.status = 'published';
  saveDb();
  await tell(`Publishing offer ${d.id}${d.price ? ` at ${rupees(d.price)}` : ''}${PUBLISH_DRY_RUN ? ' (dry run: nothing goes live)' : ''}. ${started}. Posts appear in about 10 minutes; see https://github.com/${REPO}/actions`);
}

// Starts the blog and social workflows with the offer. Returns what started; throws if either didn't.
async function publish(d) {
  const offer = JSON.stringify({
    kind: d.kind, title: d.title, destination: d.destination, duration: d.duration, travel_dates: d.travel_dates,
    valid_until: d.valid_until, inclusions: d.inclusions, exclusions: d.exclusions, notes: d.notes,
    price: d.price, price_basis: d.price_basis,
  });
  const done = [];
  for (const [wf, name] of [['daily-blog.yml', 'Blog'], ['social-post.yml', 'Social posts']]) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref: 'main', inputs: { dry_run: String(PUBLISH_DRY_RUN), offer } }),
    });
    if (!r.ok) {
      const why = `${name} could not start: GitHub said ${r.status} ${(await r.text()).slice(0, 200)}`;
      if (done.length) {
        d.status = `partly published (${done.join(', ')} only)`;
        saveDb();
      }
      await tell(`${done.length ? `${done.join(', ')} started, but ` : ''}${why}`);
      throw new Error(why);
    }
    done.push(name);
  }
  return `${done.join(' and ')} started`;
}

// ---- Schedule ----

setInterval(() => {
  if (!online || busy) return;
  const now = ist(), date = now.slice(0, 10), hm = now.slice(11);
  const due = DIGEST_TIMES.filter(t => t <= hm && !db.ran.includes(`${date} ${t}`));
  if (!due.length) return;
  db.ran = [...db.ran, ...due.map(t => `${date} ${t}`)].slice(-20);
  saveDb();
  digest(false);
}, 60e3);

await connect();
