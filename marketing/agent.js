// Daily social media agent for Hyderabad Holidays Co.
// Each day Claude researches the web for something worth posting to Indian travellers
// in turn: a domestic package idea, a flight offer, an international package idea or travel news,
// checks what was posted recently, writes captions for each platform and the text for a
// branded image card. The agent renders the card and posts to Facebook, Instagram and X,
// and turns the card into a 12-second YouTube Short.
// Run by .github/workflows/social-post.yml. Credentials come from environment variables
// (see marketing/README.md). A platform without credentials is skipped.
//
//   node agent.js --dry-run                            research and write, post nothing
//   BRIEF="Winter trips from Hyderabad" node agent.js  steer today's post
//   KIND="flight offer" node agent.js                  choose the kind instead of today's turn
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { TwitterApi } from 'twitter-api-v2';
import { z } from 'zod';

const env = (k, d) => (process.env[k] || d);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = env('SITE_URL', 'https://www.hydholidays.com').replace(/\/$/, '');
const GRAPH = `https://graph.facebook.com/${env('GRAPH_API_VERSION', 'v23.0')}`;
const HISTORY_FILE = env('HISTORY_FILE', path.join(HERE, '.state', 'history.json'));
const OUT_DIR = path.join(HERE, 'out');
const LOGO = path.join(HERE, '..', 'logo.png');
const MODEL = env('CLAUDE_MODEL', 'claude-opus-5-5');
const WHATSAPP = '+91 70750 40406';
const DRY_RUN = process.argv.includes('--dry-run') || env('POST_DRY_RUN') === '1';
const X_LINK_LEN = 23; // X counts every link as 23 characters

// One kind a day, in this order. A flight offer day becomes travel news if no current offer is found.
const KINDS = ['domestic package', 'flight offer', 'international package', 'travel news'];
const kindFor = now => KINDS[Math.floor((now.getTime() + 5.5 * 3600e3) / 86400e3) % KINDS.length]; // by IST date

const KIND_GUIDE = {
  'domestic package': `A holiday idea in India that we can arrange from Hyderabad: a destination that is in season in the coming weeks, a suggested length (for example 4 nights / 5 days), the route and 3-5 highlights. Check the season, weather and highlights. Do not give a price; we quote every trip on request.`,
  'international package': `A holiday idea abroad that suits Indian travellers now: a destination that is in season, a suggested length, the route and 3-5 highlights, and the visa situation for Indian passport holders (visa-free, visa on arrival, e-visa or visa needed) only if an official or reliable source confirms it. Do not give a price; we quote every trip on request.`,
  'flight offer': `A current airline sale or fare offer that Indian travellers, ideally from Hyderabad (HYD), can book now. It must come from the airline's own announcement or established news from the last two weeks, with the airline, routes, booking window and travel period. Quote fares only exactly as the source gives them and say they are the airline's fares, subject to availability. We help customers book these flights. If you cannot find a genuine current offer, switch to an important travel news item instead and set KIND to travel news.`,
  'travel news': `Important, recent news that affects Indian travellers: visa and entry rule changes, new flights or routes (especially from Hyderabad), airport changes, travel advisories, new fees or arrival cards. From the last few weeks only, confirmed by official sources or established news outlets. Explain what it means for the traveller.`,
};

// ---- Memory: what was posted before ----

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}
function saveHistory(list) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(-120), null, 1));
}

// ---- Research and writing ----

const ABOUT = `Hyderabad Holidays Co. is a travel agency in Hyderabad, India. It plans holidays in India and abroad, books flights and hotels, and helps with visas. Its followers are mostly Indian travellers, many from Hyderabad and Telangana. Enquiries: WhatsApp ${WHATSAPP} or ${SITE}.`;

const RESEARCH_SYSTEM = `You are the social media manager for Hyderabad Holidays Co. ${ABOUT}

Every day you choose and research one post that goes live on Facebook, Instagram and X without anyone checking it first. You are told which kind of post today is. Your job in this step is to choose the topic and gather the facts for it.

Choosing:
- Think about the time of year in India: school holidays, festive and long-weekend travel, and which places are in season.
- Do not repeat a destination or story from the last 30 days.

Researching:
- Use web search to find candidates, then open the pages with web fetch and read them. A headline or search snippet alone does not confirm anything.
- Prefer official sources (governments, embassies, tourism boards, airlines, airports) and established news outlets.
- Do not state anything as fact unless a page you read supports it. Leave out details you could not confirm.
- If a story cannot be confirmed, pick a different topic of today's kind that can be. A smaller confirmed story beats a bigger unconfirmed one.
- Never invent prices, discounts or offers of our own. The only prices allowed are airline fares quoted exactly from a current airline offer.

Finish with a brief for the writer:
STATUS: READY if every fact below is confirmed from a page you read; otherwise NOT READY, with the reason
KIND: one of ${KINDS.join(', ')}
TOPIC: a few words
ANGLE: why this matters to our followers now
FACTS: the confirmed facts to use, each with its source URL
CAUTIONS: anything readers must check themselves, such as rules that change often`;

const WRITE_SYSTEM = `You write social media posts for Hyderabad Holidays Co. ${ABOUT}

You get a researched brief. Write today's post from it. If the brief is not marked READY, or it calls any fact you need unconfirmed, set ready to false; that post will not be published. Posts go live without review, so use only the facts in the brief, and never add prices, offers or claims of your own. If the brief mentions rules that change, say readers should check the latest before travelling. For visa topics, never imply that approval is guaranteed.

By kind:
- Domestic or international package: present it as a trip we can plan and customise from Hyderabad, and invite readers to ask for a quote. No prices.
- Flight offer: make clear it is the airline's offer (name the airline), quote fares exactly as the brief gives them with "subject to availability", give the booking window, and say we can book it for them.
- Travel news: explain plainly what changed and what travellers should do, then offer our help.

Voice: warm, clear and helpful, like a knowledgeable local travel agent. Plain Indian English. At most two or three emojis per post. No clickbait, no ALL CAPS, no urgency claims. End by inviting readers to plan the trip with us.

Platforms:
- Facebook: 60-120 words. Our website link is added after your text.
- Instagram: 60-120 words, then 6-10 relevant hashtags on their own line. Links are not clickable there, so ask readers to WhatsApp ${WHATSAPP} or tap the link in our bio.
- X: at most 230 characters including emojis and hashtags, without any link (our link is added after it).
- YouTube Short: a title of at most 80 characters (no hashtags; "#Shorts" is added), and a description of 60-150 words that ends with 3-5 hashtags. Our website and WhatsApp details are added after the description.
Write each platform's text separately so they do not read as copies.

The image is a branded card made from your card text: a 2-4 word kicker, a headline of at most 60 characters carrying the main point, and a supporting line of at most 90 characters (or empty).`;

const Post = z.object({
  ready: z.boolean().describe('true only if the brief is READY and every fact in the post is confirmed in it'),
  kind: z.enum(KINDS),
  topic: z.string().describe('What this post is about, in a few words'),
  card: z.object({
    kicker: z.string(),
    headline: z.string(),
    subline: z.string(),
  }),
  facebook: z.string(),
  instagram: z.string(),
  x: z.string(),
  youtube: z.object({ title: z.string(), description: z.string() }),
  sources: z.array(z.string()).describe('Source URLs from the brief that the post relies on'),
});

const textOf = msg => msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

function checkStop(res, step) {
  if (res.stop_reason === 'refusal') throw new Error(`Claude declined the ${step} step: ${res.stop_details?.explanation || 'no reason given'}`);
  if (res.stop_reason === 'max_tokens') throw new Error(`Claude ran out of tokens in the ${step} step`);
}

async function research(client, now, history) {
  const recent = history.slice(-30).map(h => `- ${h.date}: ${h.kind}, ${h.topic}`).join('\n') || '- nothing yet, this is the first post';
  const brief = env('BRIEF');
  const kind = env('KIND', kindFor(now));
  if (!KIND_GUIDE[kind]) throw new Error(`Unknown KIND "${kind}". Options: ${KINDS.join(', ')}`);
  const messages = [{
    role: 'user',
    content: `Today is ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })}.

Today's kind of post: ${kind}
${KIND_GUIDE[kind]}

Recent posts, oldest first:
${recent}
${brief ? `\nThe owner's brief for today, which takes priority: ${brief}\n` : ''}
Choose and research today's post.`,
  }];
  // Web search runs on Anthropic's side; a long search can pause the turn, so resume it.
  for (let i = 0; i < 5; i++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: RESEARCH_SYSTEM,
      tools: [
        {
          type: 'web_search_20260209', name: 'web_search', max_uses: 20,
          user_location: { type: 'approximate', city: 'Hyderabad', region: 'Telangana', country: 'IN', timezone: 'Asia/Kolkata' },
        },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10, max_content_tokens: 20000 },
      ],
      messages,
    });
    checkStop(res, 'research');
    if (res.stop_reason !== 'pause_turn') {
      const text = textOf(res);
      if (!text) throw new Error('Research step returned no brief');
      return text;
    }
    messages.push({ role: 'assistant', content: res.content });
  }
  throw new Error('Research step did not finish after 5 continuations');
}

async function write(client, brief) {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Post) },
    system: WRITE_SYSTEM,
    messages: [{ role: 'user', content: `Brief:\n\n${brief}` }],
  });
  checkStop(res, 'writing');
  if (!res.parsed_output) throw new Error(`Claude returned no post (stop reason: ${res.stop_reason})`);
  return res.parsed_output;
}

// ---- Image card ----

const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

function wrap(text, perLine) {
  const lines = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length <= perLine) lines[lines.length - 1] = last + ' ' + word;
    else lines.push(word);
  }
  return lines;
}

// Brand palettes (style.css), rotated by post kind so the feed doesn't look identical every day.
const THEMES = [
  { bg: '#151a1c', band: '#0f6b6b', head: '#f2f4f3', kicker: '#e0b453', sub: '#9aa6a8', bandFg: '#e2f0ee' },
  { bg: '#0f6b6b', band: '#151a1c', head: '#ffffff', kicker: '#e0b453', sub: '#e2f0ee', bandFg: '#9aa6a8' },
  { bg: '#f7f8f7', band: '#0f6b6b', head: '#151a1c', kicker: '#c9962b', sub: '#5b6468', bandFg: '#e2f0ee' },
];

// Card: kicker, headline, supporting line, logo, contact band. 1080x1350 (4:5) for the feeds,
// 1080x1920 (9:16) for the YouTube Short, with the text block centred in the extra height.
async function renderCard({ kicker, headline, subline }, kind, H = 1350) {
  const t = THEMES[Math.max(0, KINDS.indexOf(kind)) % THEMES.length];
  const W = 1080, X0 = 90;
  let size = 96, lines;
  do { lines = wrap(headline, Math.floor(900 / (size * 0.52))); } while (lines.length > 4 && (size -= 8) > 56);
  const sub = wrap(subline || '', 34).slice(0, 3);
  // In a Short, YouTube's own buttons cover the top-right corner and the bottom ~400px,
  // so the logo and contact band move inside that area there.
  const logoTop = H > 1350 ? 230 : 80, bandY = H > 1350 ? H - 640 : H - 210;
  const top = 560 + (H > 1350 ? 160 : 0) - (lines.length - 1) * size * 0.55;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <circle cx="${W - 165}" cy="${logoTop + 75}" r="88" fill="#ffffff"/>
  <rect y="${bandY}" width="${W}" height="210" fill="${t.band}"/>
  <rect x="${X0}" y="${top - size - 70}" width="90" height="6" fill="#c9962b"/>
  <text x="${X0}" y="${top - size - 20}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="34" font-weight="700" letter-spacing="4" fill="${t.kicker}">${xml(kicker.toUpperCase())}</text>
  ${lines.map((l, i) => `<text x="${X0}" y="${top + i * size * 1.12}" font-family="Georgia, 'DejaVu Serif', serif" font-size="${size}" fill="${t.head}">${xml(l)}</text>`).join('\n  ')}
  ${sub.map((l, i) => `<text x="${X0}" y="${top + lines.length * size * 1.12 + 40 + i * 52}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="40" fill="${t.sub}">${xml(l)}</text>`).join('\n  ')}
  <text x="${X0}" y="${bandY + 90}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="40" font-weight="700" fill="#ffffff">Hyderabad Holidays Co.</text>
  <text x="${X0}" y="${bandY + 144}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="32" fill="${t.bandFg}">hydholidays.com  ·  WhatsApp ${WHATSAPP}</text>
</svg>`;
  const logo = await sharp(LOGO).resize(150, 150).toBuffer();
  return sharp(Buffer.from(svg)).composite([{ input: logo, top: logoTop, left: W - 240 }]).jpeg({ quality: 90 }).toBuffer();
}

// 12-second 1080x1920 Short from the vertical card: slow zoom, fade in and out.
// Uses marketing/music.mp3 as the soundtrack if present (royalty-free only), otherwise silence.
async function renderShort(post) {
  const card = path.join(OUT_DIR, 'short.jpg'), video = path.join(OUT_DIR, 'short.mp4');
  fs.writeFileSync(card, await renderCard(post.card, post.kind, 1920));
  const music = path.join(HERE, 'music.mp3');
  const audio = fs.existsSync(music) ? ['-i', music] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'];
  execFileSync(ffmpegPath, [
    '-y', '-loop', '1', '-i', card, ...audio,
    '-filter_complex', "[0:v]scale=2160:3840,zoompan=z='min(zoom+0.00012,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1080x1920:fps=30,fade=t=in:st=0:d=0.6,fade=t=out:st=11.3:d=0.7[v];[1:a]afade=t=out:st=10.5:d=1.5[a]",
    '-map', '[v]', '-map', '[a]', '-t', '12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', video,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  return video;
}

// ---- Publishing ----

async function graph(pathname, params) {
  const body = new FormData();
  for (const [k, v] of Object.entries(params)) body.append(k, v instanceof Buffer ? new Blob([v], { type: 'image/jpeg' }) : v, v instanceof Buffer ? 'post.jpg' : undefined);
  const r = await fetch(`${GRAPH}/${pathname}`, { method: 'POST', body });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j;
}

// FB_PAGE_ACCESS_TOKEN can be the system user token from Business Suite: it is swapped for
// the Page's own token here (Pages only accept posts made with a Page token).
let pageToken;
async function getPageToken() {
  if (pageToken) return pageToken;
  const given = env('FB_PAGE_ACCESS_TOKEN');
  const r = await (await fetch(`${GRAPH}/${env('FB_PAGE_ID')}?fields=access_token&access_token=${encodeURIComponent(given)}`)).json();
  if (r.error) throw new Error(`Facebook token check failed: ${r.error.message}`);
  return (pageToken = r.access_token || given);
}

async function postFacebook(text, image) {
  const j = await graph(`${env('FB_PAGE_ID')}/photos`, { source: image, message: text, access_token: await getPageToken() });
  return j.post_id || j.id;
}

// Instagram only takes an image URL. Upload the image to the Page as an unpublished
// photo and hand Instagram that photo's address.
async function postInstagram(caption, image) {
  const token = await getPageToken(), ig = env('IG_USER_ID');
  const { id: photoId } = await graph(`${env('FB_PAGE_ID')}/photos`, { source: image, published: 'false', access_token: token });
  const photo = await (await fetch(`${GRAPH}/${photoId}?fields=images&access_token=${encodeURIComponent(token)}`)).json();
  const imageUrl = photo.images?.[0]?.source;
  if (!imageUrl) throw new Error(photo.error?.message || 'Could not get an image URL for Instagram');
  const { id } = await graph(`${ig}/media`, { image_url: imageUrl, caption, access_token: token });
  // Instagram fetches the image first; publishing before it finishes fails.
  for (let i = 0; i < 12; i++) {
    const s = await (await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`)).json();
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${s.status_code})`);
    await new Promise(r => setTimeout(r, 5000));
  }
  return (await graph(`${ig}/media_publish`, { creation_id: id, access_token: token })).id;
}

async function postX(text, image) {
  const client = new TwitterApi({
    appKey: env('X_API_KEY'), appSecret: env('X_API_SECRET'),
    accessToken: env('X_ACCESS_TOKEN'), accessSecret: env('X_ACCESS_SECRET'),
  });
  const mediaId = await client.v2.uploadMedia(image, { media_type: 'image/jpeg', media_category: 'tweet_image' });
  return (await client.v2.tweet({ text, media: { media_ids: [mediaId] } })).data.id;
}

// YouTube: swap the refresh token for an access token, then a resumable upload of the Short.
// Until Google approves the project's API audit, YouTube keeps API uploads private.
async function postYouTube({ title, description }, videoFile) {
  const auth = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env('YT_CLIENT_ID'), client_secret: env('YT_CLIENT_SECRET'), refresh_token: env('YT_REFRESH_TOKEN'), grant_type: 'refresh_token' }),
  })).json();
  if (!auth.access_token) throw new Error(`Google sign-in failed: ${auth.error_description || auth.error || 'no access token'}`);
  const video = fs.readFileSync(videoFile);
  const privacy = env('YT_PRIVACY', 'public');
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(video.length),
    },
    body: JSON.stringify({
      snippet: { title, description, categoryId: '19' }, // 19 = Travel & Events
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
    }),
  });
  if (!start.ok) throw new Error(`YouTube upload refused: ${(await start.json()).error?.message || `HTTP ${start.status}`}`);
  const r = await fetch(start.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: video });
  const j = await r.json();
  if (!r.ok || !j.id) throw new Error(j.error?.message || `HTTP ${r.status}`);
  const locked = j.status?.privacyStatus !== privacy ? `, ${j.status?.privacyStatus} until Google approves the API audit` : '';
  return `${j.id}, https://youtube.com/shorts/${j.id}${locked}`;
}

// Trim at a word boundary so text + space + link fits in 280 characters.
function fitX(text, link) {
  const max = 280 - X_LINK_LEN - 1;
  const chars = [...text]; // count emojis as one character, near enough for X
  if (chars.length <= max) return `${text} ${link}`;
  const cut = chars.slice(0, max - 1).join('');
  return `${cut.slice(0, cut.lastIndexOf(' ')).trimEnd()}… ${link}`;
}

// ---- Main ----

const now = new Date();
const history = loadHistory();
const client = new Anthropic();
// Nothing unconfirmed goes live: both the researcher and the writer must say the facts are confirmed.
// One retry with fresh research, then the day's post is held and the run fails so GitHub emails you.
const confirmed = b => (b.match(/STATUS\W*(NOT READY|READY)/i)?.[1] || '').toUpperCase() === 'READY';
let brief, post;
for (let attempt = 1; attempt <= 2; attempt++) {
  brief = await research(client, now, history);
  post = await write(client, brief);
  if (confirmed(brief) && post.ready) break;
  console.log(`Attempt ${attempt}: research not confirmed${attempt === 1 ? ', researching again' : ''}`);
}
const held = !(confirmed(brief) && post.ready);
console.log(`Today: ${post.kind} · ${post.topic}${DRY_RUN ? ' · DRY RUN' : ''}${held ? ' · HELD, facts not confirmed' : ''}\n\n--- Research brief ---\n${brief}`);

const image = await renderCard(post.card, post.kind);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'post.jpg'), image);
const short = await renderShort(post);

const link = `${SITE}/`;
const ytTitle = `${post.youtube.title.trim().slice(0, 90)} #Shorts`;
const out = {
  facebook: `${post.facebook.trim()}\n\n${link}`,
  instagram: post.instagram.trim(),
  x: fitX(post.x.trim(), link),
  youtube: { title: ytTitle, description: `${post.youtube.description.trim()}\n\nPlan your trip with Hyderabad Holidays Co.\nWhatsApp ${WHATSAPP} · ${link}` },
};
fs.writeFileSync(path.join(OUT_DIR, 'post.json'), JSON.stringify({ ...post, brief, final: out }, null, 2));

const platforms = [
  { name: 'Facebook', keys: ['FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN'], text: out.facebook, run: () => postFacebook(out.facebook, image) },
  { name: 'Instagram', keys: ['IG_USER_ID', 'FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN'], text: out.instagram, run: () => postInstagram(out.instagram, image) },
  { name: 'X', keys: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'], text: out.x, run: () => postX(out.x, image) },
  { name: 'YouTube', keys: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'], text: `${out.youtube.title}\n\n${out.youtube.description}`, run: () => postYouTube(out.youtube, short) },
];

const report = [];
let failed = 0, posted = 0;
for (const p of platforms) {
  let status;
  if (held) status = 'held, not posted: the research could not confirm the facts';
  else if (DRY_RUN) status = 'dry run, not posted';
  else if (p.keys.some(k => !env(k))) status = `skipped, missing ${p.keys.filter(k => !env(k)).join(', ')}`;
  else {
    try { status = `posted (id ${await p.run()})`; posted++; }
    catch (err) { failed++; status = `FAILED: ${err.message}`; }
  }
  console.log(`\n=== ${p.name}: ${status}\n${p.text}`);
  report.push(`### ${p.name}: ${status}\n\n${p.text.replace(/^/gm, '> ')}\n`);
}

if (posted) {
  history.push({ date: now.toISOString().slice(0, 10), kind: post.kind, topic: post.topic, sources: post.sources });
  saveHistory(history);
}
if (env('GITHUB_STEP_SUMMARY')) {
  fs.appendFileSync(env('GITHUB_STEP_SUMMARY'), [
    `## ${post.kind}: ${post.topic}${held ? ' (HELD: facts not confirmed, nothing posted)' : ''}`,
    `Image: download the run's "post" artifact.`,
    `Sources:\n${post.sources.map(s => `- ${s}`).join('\n') || '- none listed'}`,
    ...report,
    `<details><summary>Research brief</summary>\n\n${brief}\n\n</details>\n`,
  ].join('\n\n'));
}
if (failed || held) process.exit(1);
