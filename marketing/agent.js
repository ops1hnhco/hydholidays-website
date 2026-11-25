// Daily social media agent for Hyderabad Holidays Co.
// Each day Claude researches the web for something worth posting to Indian travellers
// in turn: a domestic package idea, an international package idea or travel news,
// checks what was posted recently, writes captions for each platform and the text for a
// branded image, whose design changes every post (styles.js). It makes that image with a Pixabay (or Pexels)
// photo of the destination and a 15-second video from real clips of it (reel.js), and posts Reels to Facebook
// and Instagram, a Short to YouTube, and the image to X.
// Run by .github/workflows/social-post.yml. Credentials come from environment variables
// (see marketing/README.md). A platform without credentials is skipped. With OFFER set (an offer
// approved on WhatsApp, see whatsapp.js), it posts that offer instead of researching a topic.
//
//   node agent.js --dry-run                            research and write, post nothing
//   BRIEF="Winter trips from Hyderabad" node agent.js  steer today's post
//   KIND="travel news" node agent.js                   choose the kind instead of today's turn
//   STYLE=postcard node agent.js                       choose the design instead of its turn
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import sharp from 'sharp';
import { TwitterApi } from 'twitter-api-v2';
import { z } from 'zod';
import { NOT_OFFERED_NOTE, OFFER_GUIDE, offerBrief, readOffer } from './offer.js';
import { findClips, renderReel } from './reel.js';
import { lookName, nextLook, stillImage } from './styles.js';

const env = (k, d) => (process.env[k] || d);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = env('SITE_URL', 'https://www.hydholidays.com').replace(/\/$/, '');
const GRAPH = `https://graph.facebook.com/${env('GRAPH_API_VERSION', 'v23.0')}`;
const HISTORY_FILE = env('HISTORY_FILE', path.join(HERE, '.state', 'history.json'));
const OUT_DIR = path.join(HERE, 'out');
const MODEL = env('CLAUDE_MODEL', 'claude-sonnet-5-5');
const WHATSAPP = '+91 70750 40406';
const DRY_RUN = process.argv.includes('--dry-run') || env('POST_DRY_RUN') === '1';
const X_LINK_LEN = 23; // X counts every link as 23 characters

// One kind a day, in this order.
const KINDS = ['domestic package', 'international package', 'travel news'];
const kindFor = now => KINDS[Math.floor((now.getTime() + 5.5 * 3600e3) / 86400e3) % KINDS.length]; // by IST date

const KIND_GUIDE = {
  'domestic package': `A holiday idea in India that we can arrange from Hyderabad: a destination that is in season in the coming weeks, a suggested length (for example 4 nights / 5 days), the route and 3-5 highlights. Check the season, weather and highlights. Do not give a price; we quote every trip on request.`,
  'international package': `A holiday idea abroad that suits Indian travellers now: a destination that is in season, a suggested length, the route and 3-5 highlights. Do not give a price; we quote every trip on request.`,
  'travel news': `Important, recent news that affects Indian travellers: travel advisories, destination openings or closures, new attractions, festivals and events, and entry fees at sights. From the last few weeks only, confirmed by official sources or established news outlets. Explain what it means for the traveller.`,
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

const ABOUT = `Hyderabad Holidays Co. is a travel agency in Hyderabad, India. It plans holidays in India and abroad and books hotels and transfers. Its followers are mostly Indian travellers, many from Hyderabad and Telangana. Enquiries: WhatsApp ${WHATSAPP} or ${SITE}.`;

const RESEARCH_SYSTEM = `You are the social media manager for Hyderabad Holidays Co. ${ABOUT}

Every day you choose and research one post that goes live on Facebook, Instagram, X and YouTube without anyone checking it first. You are told which kind of post today is. Your job in this step is to choose the topic and gather the facts for it.

Choosing:
- Think about the time of year in India: school holidays, festive and long-weekend travel, and which places are in season.
- Do not repeat a destination or story from the last 30 days.

Researching:
- Use web search to find candidates, then open the pages with web fetch and read them. A headline or search snippet alone does not confirm anything.
- Prefer official sources (governments, tourism boards, the attractions themselves) and established news outlets.
- Do not state anything as fact unless a page you read supports it. Leave out details you could not confirm.
- If a story cannot be confirmed, pick a different topic of today's kind that can be. A smaller confirmed story beats a bigger unconfirmed one.
- Never invent prices, discounts or offers of our own.
${NOT_OFFERED_NOTE}

Finish with a brief for the writer:
STATUS: READY if every fact below is confirmed from a page you read; otherwise NOT READY, with the reason
KIND: one of ${KINDS.join(', ')}
TOPIC: a few words
ANGLE: why this matters to our followers now
FACTS: the confirmed facts to use, each with its source URL
CAUTIONS: anything readers must check themselves, such as rules that change often`;

const WRITE_SYSTEM = `You write social media posts for Hyderabad Holidays Co. ${ABOUT}

You get a researched brief. Write today's post from it. If the brief is not marked READY, or it calls any fact you need unconfirmed, set ready to false; that post will not be published. Posts go live without review, so use only the facts in the brief, and never add prices, offers or claims of your own. If the brief mentions rules that change, say readers should check the latest before travelling.

By kind:
- Domestic or international package: present it as a trip we can plan and customise from Hyderabad, and invite readers to ask for a quote. No prices, except in our own offers (below).
- Travel news: explain plainly what changed and what travellers should do, then offer our help.

Voice: warm, clear and helpful, like a knowledgeable local travel agent. Plain Indian English. At most two or three emojis per post. No clickbait, no ALL CAPS, no urgency claims. End by inviting readers to plan the trip with us.

The first line is the only part people see before they decide to keep reading, so open every caption with a hook of at most 12 words: a question to the reader, a surprising fact from the brief, or what changes for them. Never start with our company name or "Good news".

Platforms:
- Facebook: 60-120 words. Our website link is added after your text.
- Instagram: 60-120 words, then 6-10 relevant hashtags on their own line. Links are not clickable there, so ask readers to WhatsApp ${WHATSAPP} or tap the link in our bio.
- X: at most 230 characters including emojis and hashtags, without any link (our link is added after it).
- YouTube Short: a title of at most 80 characters (no hashtags; "#Shorts" is added), and a description of 60-150 words that ends with 3-5 hashtags. Our website and WhatsApp details are added after the description.
Write each platform's text separately so they do not read as copies.

Facebook and Instagram get a 15-second Reel and YouTube a Short: real video clips of the destination, with your card text over them: the kicker and headline first, then the supporting line. The same text goes on the still image. Card text: a 2-4 word kicker, a headline of at most 60 characters carrying the main point, and a supporting line of at most 90 characters (or empty).

photo_queries are 3 stock searches of 1-3 words each, used for both a photo and video clips: beautiful, recognisable views of the place the post is about, from most specific to more general but always the same place, e.g. ["Rann of Kutch", "Kutch", "Gujarat"] or ["Halong Bay", "Hanoi", "Vietnam"]. The photo library only returns photos tagged with every word, so keep searches short, use the most common spelling (including one-word forms like "Halong"), and end with the country or state on its own. Stock libraries know famous names better than local ones, so use the best-known landmark or region name. For news without one place, describe a fitting travel scene, e.g. ["mountain road trip", "beach sunset"]. Never ask for people's faces, flags or logos.

Our own offers: ${OFFER_GUIDE} Put the price, if any, in the card's subline. sources is empty.${NOT_OFFERED_NOTE}`;

const Post = z.object({
  ready: z.boolean().describe('true only if the brief is READY and every fact in the post is confirmed in it'),
  kind: z.enum(KINDS),
  topic: z.string().describe('What this post is about, in a few words'),
  card: z.object({
    kicker: z.string(),
    headline: z.string(),
    subline: z.string(),
  }),
  photo_queries: z.array(z.string()),
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
  if (!KINDS.includes(kind)) throw new Error(`Unknown KIND "${kind}". Options: ${KINDS.join(', ')}`);
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

// ---- Photo ----

// A free, licensed photo of the post's subject from Pixabay (PIXABAY_API_KEY) or Pexels
// (PEXELS_API_KEY). Stock searches often return look-alikes (Death Valley for the Rann of Kutch),
// so Claude looks at the candidates and only accepts one that really shows the place. It tries the
// writer's searches from most specific to most general, skips photos used before, and falls back to
// the plain brand card if nothing fits. Searches return { id, image, preview, tags, credit, url }.
// Pixabay only returns photos tagged with every word of the search, so a search that finds nothing
// is retried with its first words dropped ("Ha Long Bay Vietnam" -> ... -> "Vietnam").
async function searchPixabay(query, key) {
  const search = (q, orientation) => fetch(`https://pixabay.com/api/?${new URLSearchParams({ key, q, image_type: 'photo', orientation, safesearch: 'true', min_width: '1080', per_page: '20' })}`).then(r => r.json());
  const words = query.split(/\s+/).filter(Boolean);
  let hits = [];
  for (let i = 0; i < words.length && !hits.length; i++) {
    const q = words.slice(i).join(' ');
    ({ hits = [] } = await search(q, 'vertical'));
    if (hits.length < 4) ({ hits = [] } = await search(q, 'all'));
    if (i && hits.length) console.log(`  "${query}" found nothing; using "${q}"`);
  }
  return hits.map(h => ({ id: `pixabay-${h.id}`, image: h.largeImageURL, preview: h.webformatURL, tags: h.tags, credit: `Photo: ${h.user} on Pixabay`, url: h.pageURL }));
}

async function searchPexels(query, key) {
  const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query, orientation: 'portrait', size: 'large', per_page: '15' })}`, { headers: { Authorization: key } });
  const { photos = [] } = await r.json();
  return photos.map(p => ({ id: p.id, image: `${p.src.original}?auto=compress&cs=tinysrgb&w=2160`, preview: p.src.medium, tags: p.alt, credit: `Photo: ${p.photographer} on Pexels`, url: p.url }));
}

const PhotoChoice = z.object({
  reason: z.string().describe('One sentence on why this photo, or why none fits'),
  photos: z.array(z.number().int()).describe('Numbers of the photos that fit, best first; empty if none fits'),
});

async function choosePhotos(client, post, candidates, want) {
  const shown = [], content = [];
  for (const c of candidates) {
    const r = await fetch(c.preview).catch(err => ({ ok: false, status: err.message }));
    if (!r.ok) { console.log(`  preview ${c.preview} failed: ${r.status}`); continue; }
    const jpg = await sharp(Buffer.from(await r.arrayBuffer())).resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
    shown.push(c);
    content.push({ type: 'text', text: `Photo ${shown.length} (tags: ${c.tags || 'none'})` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpg.toString('base64') } });
  }
  if (!shown.length) return [];
  content.push({ type: 'text', text: `These are candidate background photos for a social media post by an Indian travel agency.
Post: ${post.topic}
Headline on the image: ${post.card.headline}

Pick up to ${want} photos that suit the post, best first, showing different views. If the post is about a particular place, each photo must clearly show that place (or, failing that, an unmistakable part of the same region): someone who knows it should recognise it. A similar-looking place elsewhere is not acceptable, and neither is a photo whose tags name a different place. For general topics, any photo that fits the subject is fine. Prefer clear, attractive scenes without close-up faces, text, logos or flags. Choose none if none is right; we then use a plain design, which is far better than a misleading photo.` });
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(PhotoChoice) },
    messages: [{ role: 'user', content }],
  });
  const picks = [...new Set(res.parsed_output?.photos || [])].filter(n => n >= 1 && n <= shown.length).slice(0, want);
  console.log(`  ${shown.length} photos checked, Claude chose ${picks.join(', ') || 'none'}: ${res.parsed_output?.reason || res.stop_reason}`);
  return picks.map(n => shown[n - 1]);
}

async function findPhotos(client, post, used, want) {
  const pixabay = env('PIXABAY_API_KEY'), pexels = env('PEXELS_API_KEY');
  if (!(pixabay || pexels)) return [];
  for (const query of post.photo_queries.slice(0, 3)) {
    try {
      const found = (pixabay ? await searchPixabay(query, pixabay) : await searchPexels(query, pexels)).filter(x => !used.has(x.id)).slice(0, 8);
      console.log(`Photo search "${query}": ${found.length} results`);
      const photos = [];
      for (const p of found.length ? await choosePhotos(client, post, found, want) : []) {
        const img = await fetch(p.image);
        if (img.ok) photos.push({ id: p.id, buffer: Buffer.from(await img.arrayBuffer()), credit: p.credit, url: p.url, query });
        else console.log(`  photo ${p.url}: HTTP ${img.status}`);
      }
      if (photos.length) return photos;
      console.log(`Photo search "${query}": nothing that shows the subject`);
    } catch (err) {
      console.log(`Photo search "${query}" failed: ${err.message}`);
    }
  }
  return [];
}

// ---- Music ----

// Royalty-free tracks in marketing/music/*.mp3 take turns, one per day (or marketing/music.mp3).
function pickMusic(now) {
  const dir = path.join(HERE, 'music');
  const tracks = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.mp3$/i.test(f)).sort().map(f => path.join(dir, f)) : [];
  if (tracks.length) return tracks[Math.floor(now.getTime() / 86400e3) % tracks.length];
  const one = path.join(HERE, 'music.mp3');
  return fs.existsSync(one) ? one : null;
}

// ---- Publishing ----

async function graph(pathname, params) {
  const body = new FormData();
  for (const [k, v] of Object.entries(params)) {
    if (v instanceof Buffer) body.append(k, new Blob([v], { type: 'image/jpeg' }), 'post.jpg');
    else body.append(k, v);
  }
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

// Send a video file to Meta's upload server (used for both Facebook and Instagram Reels).
async function uploadVideo(url, token, video) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(video.length) }, body: video });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false || j.error) throw new Error(j.error?.message || j.debug_info?.message || `video upload HTTP ${r.status}`);
}

// Instagram processes a Reel or image before it can be published; wait for that.
async function waitForInstagram(id, token, what) {
  for (let i = 0; i < 40; i++) {
    const s = await (await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`)).json();
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`${what} processing failed (${s.status_code})`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`${what} still processing after 3 minutes`);
}

async function postFacebookReel(text, videoFile) {
  const token = await getPageToken(), page = env('FB_PAGE_ID'), video = fs.readFileSync(videoFile);
  const { video_id, upload_url } = await graph(`${page}/video_reels`, { upload_phase: 'start', access_token: token });
  await uploadVideo(upload_url, token, video);
  await graph(`${page}/video_reels`, { upload_phase: 'finish', video_id, video_state: 'PUBLISHED', description: text, access_token: token });
  return `reel ${video_id}`;
}

async function postFacebookPhoto(text, image) {
  const j = await graph(`${env('FB_PAGE_ID')}/photos`, { source: image, message: text, access_token: await getPageToken() });
  return `photo ${j.post_id || j.id}`;
}

async function postInstagramReel(caption, videoFile) {
  const token = await getPageToken(), ig = env('IG_USER_ID'), video = fs.readFileSync(videoFile);
  const c = await graph(`${ig}/media`, { media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', thumb_offset: '2500', access_token: token });
  await uploadVideo(c.uri || `https://rupload.facebook.com/ig-api-upload/${GRAPH.split('/').pop()}/${c.id}`, token, video);
  await waitForInstagram(c.id, token, 'Instagram Reel');
  return `reel ${(await graph(`${ig}/media_publish`, { creation_id: c.id, access_token: token })).id}`;
}

// Instagram only takes an image URL. Upload the image to the Page as an unpublished
// photo and hand Instagram that photo's address.
async function postInstagramPhoto(caption, image) {
  const token = await getPageToken(), ig = env('IG_USER_ID');
  const { id: photoId } = await graph(`${env('FB_PAGE_ID')}/photos`, { source: image, published: 'false', access_token: token });
  const photo = await (await fetch(`${GRAPH}/${photoId}?fields=images&access_token=${encodeURIComponent(token)}`)).json();
  const imageUrl = photo.images?.[0]?.source;
  if (!imageUrl) throw new Error(photo.error?.message || 'Could not get an image URL for Instagram');
  const { id } = await graph(`${ig}/media`, { image_url: imageUrl, caption, access_token: token });
  await waitForInstagram(id, token, 'Instagram image');
  return `photo ${(await graph(`${ig}/media_publish`, { creation_id: id, access_token: token })).id}`;
}

// Reels reach far more people than photos, so post a Reel; if that fails, post the photo instead.
async function reelOrPhoto(reel, photo) {
  try { return await reel(); }
  catch (err) { return `${await photo()} (Reel failed: ${err.message})`; }
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
// An approved offer is already confirmed by the owner, so it is written once without research.
const offer = readOffer(env('OFFER'));
let brief, post;
if (offer) {
  brief = offerBrief(offer);
  post = await write(client, brief);
}
for (let attempt = 1; !offer && attempt <= 2; attempt++) {
  brief = await research(client, now, history);
  post = await write(client, brief);
  if (confirmed(brief) && post.ready) break;
  console.log(`Attempt ${attempt}: research not confirmed${attempt === 1 ? ', researching again' : ''}`);
}
const held = !(confirmed(brief) && post.ready);
console.log(`Today: ${post.kind} · ${post.topic}${DRY_RUN ? ' · DRY RUN' : ''}${held ? ' · HELD, facts not confirmed' : ''}\n\n--- Research brief ---\n${brief}`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const used = new Set(history.flatMap(h => [h.photo, ...(h.media || [])]).filter(Boolean));
const clips = await findClips(client, MODEL, post, used, OUT_DIR);
const photos = await findPhotos(client, post, used, Math.max(1, 4 - clips.length)); // the image's photo, and any the video needs
const photo = photos[0];
console.log(`Clips: ${clips.map(c => c.url).join(', ') || 'none that show the subject'}`);
console.log(`Photo: ${photo ? `${photo.url} (search "${photo.query}")` : 'none that shows the subject, plain card'}`);
const look = nextLook(history, now, env('STYLE', ''));
console.log(`Design: ${lookName(look)}`);
const image = await stillImage(post.card, photo, look);
fs.writeFileSync(path.join(OUT_DIR, 'post.jpg'), image);
const video = await renderReel({ card: post.card, clips, photos, look, music: pickMusic(now), dir: OUT_DIR, out: path.join(OUT_DIR, 'video.mp4') });

const link = `${SITE}/`;
const names = [...new Set(clips.map(c => c.credit).filter(Boolean))];
const credit = [
  names.length && `🎥 Video: ${names.join(', ')} on ${clips[0].site}`,
  photo && `📷 ${[...new Set((clips.length >= 4 ? [photo] : photos).map(p => p.credit))].join('; ')}`,
].filter(Boolean).map((c, i) => `${i ? '\n' : '\n\n'}${c}`).join('');
const out = {
  facebook: `${post.facebook.trim()}\n\n${link}${credit}`,
  instagram: `${post.instagram.trim()}${credit}`,
  x: fitX(post.x.trim(), link),
  youtube: {
    title: `${post.youtube.title.trim().slice(0, 90)} #Shorts`,
    description: `${post.youtube.description.trim()}\n\nPlan your trip with Hyderabad Holidays Co.\nWhatsApp ${WHATSAPP} · ${link}${credit}`,
  },
};
fs.writeFileSync(path.join(OUT_DIR, 'post.json'), JSON.stringify({ ...post, design: lookName(look), photo: photo && { url: photo.url, credit: photo.credit }, clips: clips.map(c => ({ url: c.url, credit: c.credit })), brief, final: out }, null, 2));

const platforms = [
  { name: 'Facebook', keys: ['FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN'], text: out.facebook, run: () => reelOrPhoto(() => postFacebookReel(out.facebook, video), () => postFacebookPhoto(out.facebook, image)) },
  { name: 'Instagram', keys: ['IG_USER_ID', 'FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN'], text: out.instagram, run: () => reelOrPhoto(() => postInstagramReel(out.instagram, video), () => postInstagramPhoto(out.instagram, image)) },
  { name: 'X', keys: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'], text: out.x, run: () => postX(out.x, image) },
  { name: 'YouTube', keys: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'], text: `${out.youtube.title}\n\n${out.youtube.description}`, run: () => postYouTube(out.youtube, video) },
];

// PLATFORMS="facebook,instagram" posts to those only (for re-running after one platform failed).
const only = env('PLATFORMS', '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

const report = [];
let failed = 0, posted = 0;
for (const p of platforms) {
  let status;
  if (held) status = 'held, not posted: the research could not confirm the facts';
  else if (only.length && !only.includes(p.name.toLowerCase())) status = 'skipped, not selected for this run';
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
  history.push({ date: now.toISOString().slice(0, 10), kind: post.kind, topic: post.topic, sources: post.sources, photo: photo?.id, media: [...clips, ...photos].map(m => m.id), look });
  saveHistory(history);
}
if (env('GITHUB_STEP_SUMMARY')) {
  fs.appendFileSync(env('GITHUB_STEP_SUMMARY'), [
    `## ${post.kind}: ${post.topic}${held ? ' (HELD: facts not confirmed, nothing posted)' : ''}`,
    `Video clips: ${clips.map(c => c.url).join(', ') || 'none, made from photos'}. Photo: ${photo ? `${photo.url} (${photo.credit})` : 'none, plain brand card'}. Design: ${lookName(look)}. Image and video: download the run's "post" artifact.`,
    `Sources:\n${post.sources.map(s => `- ${s}`).join('\n') || '- none listed'}`,
    ...report,
    `<details><summary>Research brief</summary>\n\n${brief}\n\n</details>\n`,
  ].join('\n\n'));
}
if (failed || held) process.exit(1);
