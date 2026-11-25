// The 15-second Reel / Short: up to four real video clips of the place (Pixabay, or Pexels), full screen,
// cut together with light captions. Clips are stock footage, so Claude looks at frames from each one and
// only accepts clips that really show the place. With too few clips, photos of the place fill the gaps;
// with neither, a plain pattern in the day's colours is used.
// 1080x1920 (9:16). The apps' own buttons cover the top ~220px, the bottom ~430px and the lower right edge.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { z } from 'zod';
import { CONTACT, GOLD, INK, SANS, SERIF, SHADOW, brand, contactFont, draw, fit, kickerFont, loadLogo, logo, paletteFor, pattern } from './styles.js';

const W = 1080, H = 1920, SECONDS = 15, FADE = 0.35, SHOTS = 4;
const MAX_BYTES = 150e6; // skip clip files bigger than this
const env = (k, d) => (process.env[k] || d);
const ffmpeg = args => execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1e8 });

// ---- Finding clips ----
// Searches return { id, duration, tags, credit, url, preview, files } with files sorted best first.

// The sharpest file once cropped to 9:16, without being needlessly large.
const cropHeight = f => Math.min(f.height, f.width * 16 / 9);
const bestFirst = files => files.filter(f => f.url && f.height && (!f.size || f.size < MAX_BYTES))
  .sort((a, b) => Math.min(cropHeight(b), 1920) - Math.min(cropHeight(a), 1920) || cropHeight(a) - cropHeight(b));

async function searchPixabay(query, key) {
  const words = query.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) { // like the photo search: drop first words until something is found
    const q = words.slice(i).join(' ');
    const r = await fetch(`https://pixabay.com/api/videos/?${new URLSearchParams({ key, q, video_type: 'film', safesearch: 'true', per_page: '30' })}`);
    if (!r.ok) throw new Error(`Pixabay videos HTTP ${r.status}`);
    const { hits = [] } = await r.json();
    if (hits.length) {
      return hits.map(h => {
        const files = bestFirst(Object.values(h.videos || {}));
        return { id: `pixabay-v${h.id}`, duration: h.duration, tags: h.tags, credit: h.user, site: 'Pixabay', url: h.pageURL, preview: h.videos?.tiny?.url || h.videos?.small?.url, files };
      });
    }
  }
  return [];
}

async function searchPexels(query, key) {
  const r = await fetch(`https://api.pexels.com/v1/videos/search?${new URLSearchParams({ query, per_page: '20' })}`, { headers: { Authorization: key } });
  if (!r.ok) throw new Error(`Pexels videos HTTP ${r.status}`);
  const { videos = [] } = await r.json();
  return videos.map(v => {
    const files = (v.video_files || []).filter(f => f.file_type === 'video/mp4' && f.height).map(f => ({ url: f.link, width: f.width, height: f.height }));
    const small = [...files].sort((a, b) => a.width - b.width)[0];
    return { id: `pexels-v${v.id}`, duration: v.duration, tags: (v.tags || []).join(', ') || v.url, credit: v.user?.name, site: 'Pexels', url: v.url, preview: small?.url, files: bestFirst(files) };
  });
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (+r.headers.get('content-length') > MAX_BYTES) throw new Error('file too large');
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

const ClipChoice = z.object({
  reason: z.string().describe('One sentence on the choice'),
  clips: z.array(z.number().int()).describe('Numbers of the chosen clips in the order to show them; empty if none fits'),
});

// Shows Claude three frames from each candidate.
async function chooseClips(client, model, post, candidates, want, dir) {
  const shown = [], content = [];
  for (const c of candidates) {
    try {
      const file = await download(c.preview, path.join(dir, 'preview.mp4')), strip = path.join(dir, 'strip.jpg');
      ffmpeg(['-i', file, '-vf', `fps=3/${Math.max(1, c.duration)},scale=400:-2,tile=3x1`, '-frames:v', '1', strip]);
      const data = (await sharp(fs.readFileSync(strip)).resize(1200, 700, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()).toString('base64');
      shown.push(c);
      content.push({ type: 'text', text: `Clip ${shown.length} (${c.duration}s, tags: ${c.tags || 'none'})` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
    } catch (err) { console.log(`  clip ${c.url}: preview failed: ${err.message}`); }
  }
  if (!shown.length) return [];
  content.push({ type: 'text', text: `These are candidate stock video clips (three frames from each) for a 15-second Reel by an Indian travel agency. Viewers should see what the place really looks like.
Post: ${post.topic}
Headline: ${post.card.headline}

Choose up to ${want} clips, in the order to show them, starting with the most striking view. If the post is about a particular place, every clip must clearly show that place (or, failing that, an unmistakable part of the same region). A similar-looking place elsewhere is not acceptable, and neither is a clip whose tags name a different place. Prefer different views: landscapes, landmarks, streets, food, people going about their day. The clip is cropped to a tall 9:16 frame around its centre, so the subject should be near the middle. Reject animation, AI-generated or heavily filtered footage, watermarks, text, logos, flags, close-up recognisable faces, children as the main subject, and shaky or dark footage. Choose fewer, or none, rather than a misleading clip.` });
  const res = await client.beta.messages.parse({
    model, max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(ClipChoice) },
    messages: [{ role: 'user', content }],
  });
  const picks = [...new Set(res.parsed_output?.clips || [])].filter(n => n >= 1 && n <= shown.length).slice(0, want);
  console.log(`  ${shown.length} clips checked, Claude chose ${picks.join(', ') || 'none'}: ${res.parsed_output?.reason || res.stop_reason}`);
  return picks.map(n => shown[n - 1]);
}

// Up to four downloaded clips of the post's subject, best first. Never throws: no clips just means photos.
export async function findClips(client, model, post, used, dir) {
  const pixabay = env('PIXABAY_API_KEY'), pexels = env('PEXELS_API_KEY'), clips = [], seen = new Set(used);
  if (!(pixabay || pexels)) return clips;
  for (const query of post.photo_queries.slice(0, 3)) {
    if (clips.length >= SHOTS) break;
    try {
      const found = (pixabay ? await searchPixabay(query, pixabay) : await searchPexels(query, pexels))
        .filter(c => c.preview && c.files.length && c.duration >= 5 && c.duration <= 90 && cropHeight(c.files[0]) >= 1000 && !seen.has(c.id));
      // Sharp enough for a full-screen crop first, otherwise in the site's own order.
      const top = found.sort((a, b) => (cropHeight(b.files[0]) >= 1900) - (cropHeight(a.files[0]) >= 1900)).slice(0, 8);
      top.forEach(c => seen.add(c.id));
      console.log(`Video search "${query}": ${found.length} results`);
      for (const c of top.length ? await chooseClips(client, model, post, top, SHOTS - clips.length, dir) : []) {
        try { clips.push({ ...c, file: await download(c.files[0].url, path.join(dir, `clip-${clips.length}.mp4`)) }); }
        catch (err) { console.log(`  clip ${c.url}: download failed: ${err.message}`); }
      }
    } catch (err) { console.log(`Video search "${query}" failed: ${err.message}`); }
  }
  return clips;
}

// ---- Captions ----
// Four plain caption styles take turns. Each gets the text and palette and returns SVG whose last line
// ends at y = BOTTOM, inside the area the apps leave free.
const BOTTOM = 1440, X = 80, MAXW = 820;
const glow = 'filter="url(#shadow)"';

const CAPTIONS = [
  // Serif headline, left.
  async (t, p, part) => {
    if (part === 'sub') { const s = await fit(t.subline, { font: SERIF, lh: 1.25 }, MAXW, 3, 58, 34); return draw(s, X, BOTTOM - s.h, '#fff', { extra: glow }); }
    const k = await fit(t.kicker, kickerFont, MAXW, 1, 34, 22), h = await fit(t.headline, { font: SERIF }, MAXW, 4, 92, 50), y = BOTTOM - h.h;
    return draw(k, X, y - k.h - 16, GOLD, { extra: glow }) + draw(h, X, y, '#fff', { extra: glow });
  },
  // White caption boxes, like the apps' own text.
  async (t, p, part) => {
    const main = part === 'sub' ? t.subline : t.headline;
    const b = await fit(main, { font: SANS, weight: 700, lh: 1.46 }, MAXW - 60, 4, part === 'sub' ? 50 : 70, 34), y = BOTTOM - b.h;
    return b.lines.map((l, i) => `<rect x="${X}" y="${y + b.lh * i}" width="${b.ws[i] + 56}" height="${b.lh + 1}" rx="16" fill="#fff"/>`).join('') + draw(b, X + 28, y, INK);
  },
  // Bold, centred.
  async (t, p, part) => {
    const main = part === 'sub' ? t.subline : t.headline;
    const b = await fit(main, { font: SANS, weight: 700, lh: 1.16 }, MAXW, 4, part === 'sub' ? 56 : 88, 36), k = await fit(part === 'sub' ? '' : t.kicker, kickerFont, MAXW, 1, 34, 22), y = BOTTOM - b.h;
    return draw(k, W / 2, y - k.h - 18, GOLD, { anchor: 'middle', extra: glow }) + draw(b, W / 2, y, '#fff', { anchor: 'middle', extra: glow });
  },
  // Coloured label and a gold bar beside the text.
  async (t, p, part) => {
    const main = part === 'sub' ? t.subline : t.headline;
    const b = await fit(main, { font: SANS, weight: 700, lh: 1.16 }, MAXW - 40, 4, part === 'sub' ? 54 : 78, 36), k = await fit(part === 'sub' ? '' : t.kicker, kickerFont, MAXW - 80, 1, 30, 20), y = BOTTOM - b.h;
    const label = k.lines.length ? `<rect x="${X}" y="${y - k.h - 56}" width="${k.ws[0] + 44}" height="${k.h + 26}" rx="8" fill="${p.deep}"/>${draw(k, X + 22, y - k.h - 43, '#fff')}` : '';
    return `${label}<rect x="${X}" y="${y}" width="8" height="${b.h}" fill="${GOLD}"/>${draw(b, X + 34, y, '#fff', { extra: glow })}`;
  },
];

const SHADE = `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.45" stop-color="#000" stop-opacity="0.6"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient>`;
const svg = s => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${SHADOW}${SHADE}</defs>${s}</svg>`)).png().toBuffer();

// [image, from, to] for each text, in seconds. The headline is on screen from the start for the cover.
async function captions(card, look) {
  await loadLogo();
  const t = { ...card, subline: card.subline || '' }, p = paletteFor(look), style = CAPTIONS[look % CAPTIONS.length];
  const shade = `<rect y="820" width="${W}" height="${H - 820}" fill="url(#shade)"/>`;
  const name = await fit('Hyderabad Holidays Co.', brand, 860, 1, 62, 40), line = await fit(CONTACT, contactFont, 900, 1, 38, 24), cta = await fit('Plan this trip with us', kickerFont, 800, 1, 36, 24);
  const end = `<rect width="${W}" height="${H}" fill="#000" fill-opacity="0.5"/>${logo(W / 2, 760, 150)}${draw(cta, W / 2, 960, GOLD, { anchor: 'middle', extra: glow })}${draw(name, W / 2, 1030, '#fff', { anchor: 'middle', extra: glow })}${draw(line, W / 2, 1122, '#fff', { anchor: 'middle', extra: glow })}`;
  const parts = [[await svg(shade + await style(t, p, 'head')), 0.2, t.subline ? 6 : 11.2]];
  if (t.subline) parts.push([await svg(shade + await style(t, p, 'sub')), 6.2, 11.2]);
  parts.push([await svg(end), 11.6, SECONDS + 1]);
  return { parts, corner: await svg(logo(W - 140, 310, 62)) };
}

// ---- Video ----

// clips: from findClips. photos: [{ buffer }], used to fill up to four shots.
export async function renderReel({ card, clips, photos, look, music, dir, out }) {
  let shots = [...clips.map(c => ({ ...c })), ...photos.slice(0, Math.max(0, SHOTS - clips.length)).map(p => ({ buffer: p.buffer }))];
  if (!shots.length) shots = [{ buffer: await sharp(pattern(W, H, paletteFor(look))).png().toBuffer() }];
  const n = shots.length, d = (SECONDS + (n - 1) * FADE) / n, inputs = [], f = [];
  for (const [i, s] of shots.entries()) {
    if (s.file) {
      // A clip shorter than its slot is slowed down a little, then holds its last frame if it must.
      const slow = Math.min(1.5, Math.max(1, d / s.duration)), start = Math.max(0, (s.duration - d) / 2);
      inputs.push('-ss', start.toFixed(2), '-t', (d / slow + 0.2).toFixed(2), '-i', s.file);
      f.push(`[${i}:v]setpts=(PTS-STARTPTS)*${slow.toFixed(3)},scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=${d.toFixed(2)},trim=duration=${d.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p,settb=1/30[s${i}]`);
    } else {
      const file = path.join(dir, `shot-${i}.jpg`), frames = Math.ceil(d * 30);
      fs.writeFileSync(file, await sharp(s.buffer).rotate().resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer());
      inputs.push('-i', file);
      const move = i % 2 ? `z='1.12-0.12*on/${frames}'` : `z='1+0.12*on/${frames}'`;
      f.push(`[${i}:v]scale=2160:3840,zoompan=${move}:x='iw/2*(1-1/zoom)':y='ih/2*(1-1/zoom)':d=${frames}:s=${W}x${H}:fps=30,trim=duration=${d.toFixed(3)},setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=1/30[s${i}]`);
    }
  }
  let last = 's0';
  for (let i = 1; i < n; i++) { f.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE}:offset=${(i * (d - FADE)).toFixed(3)}[m${i}]`); last = `m${i}`; }

  const { parts, corner } = await captions(card, look);
  const layers = [[corner, 0, 11.4], ...parts];
  layers.forEach(([png, from, to], i) => {
    const file = path.join(dir, `text-${i}.png`), k = n + i;
    fs.writeFileSync(file, png);
    inputs.push('-loop', '1', '-framerate', '30', '-t', String(SECONDS), '-i', file);
    f.push(`[${k}:v]format=rgba,fade=t=in:st=${from}:d=0.4:alpha=1,fade=t=out:st=${to - 0.4}:d=0.4:alpha=1[t${i}]`, `[${last}][t${i}]overlay=0:0:eof_action=pass[o${i}]`);
    last = `o${i}`;
  });
  const a = n + layers.length;
  inputs.push(...(music ? ['-stream_loop', '-1', '-i', music] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']));
  f.push(`[${last}]fade=t=out:st=14.5:d=0.5,format=yuv420p[v]`, `[${a}:a]afade=t=in:st=0:d=0.5,afade=t=out:st=12.5:d=2.5[a]`);
  ffmpeg([...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', String(SECONDS), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '14M', '-bufsize', '28M', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
  return out;
}
