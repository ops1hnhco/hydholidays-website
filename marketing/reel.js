// The Reel / Short: real video clips of the trip, full screen. It opens with the place and the length of the
// trip, then shows one or two clips for each day with "Day 1", the place and what you do there over them, and
// ends with the price and our contact details. Cuts fall on the beat of the music. Clips are stock footage, so
// Claude looks at frames from every one and only accepts clips that really show that place. A scene without a
// clip gets a photo of the place; without either it is left out.
// 1080x1920 (9:16), up to about 30 seconds. The apps' own buttons cover the top ~220px, the bottom ~430px and
// the lower right edge, so the text stays in the upper middle.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { z } from 'zod';
import { download, ffmpeg, hasKey, searchPhotos, searchVideos } from './media.js';
import { CONTACT, SANS, SERIF, SHADOW, brand, contactFont, draw, fit, loadLogo, logo, paletteFor, pattern } from './styles.js';

const W = 1080, H = 1920;
const CUT = 0.3; // seconds a transition takes
export const MAX_SCENES = 8;
const PER_SCENE = 6; // candidates Claude looks at for each scene

// ---- Finding clips and photos ----

const Picks = z.object({
  reason: z.string().describe('One sentence on the choice'),
  picks: z.array(z.object({ scene: z.number().int(), item: z.number().int().describe('Number of the chosen clip or photo') })),
});

// Three frames of a clip side by side, or the photo, as a small JPEG.
async function look(c, dir) {
  const file = path.join(dir, 'preview'), strip = path.join(dir, 'strip.jpg');
  await download(c.preview, file);
  if (c.files) ffmpeg(['-i', file, '-vf', `fps=3/${Math.max(1, c.duration)},scale=300:-2,tile=3x1`, '-frames:v', '1', strip]);
  return (await sharp(fs.readFileSync(c.files ? strip : file)).resize(900, 600, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()).toString('base64');
}

// options: [[candidates for scene 0], ...]. Returns up to two chosen candidates for each scene.
async function choose(client, model, post, scenes, options, what, dir) {
  const shown = [], content = [];
  for (const [i, list] of options.entries()) {
    if (!list?.length) continue;
    content.push({ type: 'text', text: `SCENE ${i}: ${describe(scenes[i])}` });
    for (const c of list) {
      try {
        const data = await look(c, dir);
        shown.push(c);
        content.push({ type: 'text', text: `${what} ${shown.length} (tags: ${c.tags || 'none'})` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
      } catch (err) { console.log(`  ${c.url}: preview failed: ${err.message}`); }
    }
  }
  if (!shown.length) return [];
  content.push({ type: 'text', text: `These are candidate stock ${what === 'Clip' ? 'video clips (three frames from each)' : 'photos'} for a short travel Reel by an Indian travel agency about: ${post.topic}. Each scene's label is shown over it, so viewers believe they are looking at that place.

For each scene choose the one or two best items listed under it, best first; two only if they are clearly different views. Leave the scene out if none is right. Use an item once only. Prefer bright, lively footage with movement: water, boats, people walking, drone views. An item must clearly show the place in the scene's label, or an unmistakable example of what the label says in that same region (for "Munnar tea gardens", tea hills in Kerala). A similar-looking place elsewhere is not acceptable, and neither is an item whose tags name a different place. The title scene can be any striking view of the trip. The picture is cropped to a tall 9:16 frame around its centre, so the subject should be near the middle. Reject animation, AI-generated or heavily filtered pictures, watermarks, text, logos, flags, close-up recognisable faces, children as the main subject, and dark or shaky footage. Leaving a scene out is far better than a misleading picture.` });
  const res = await client.beta.messages.parse({
    model, max_tokens: 6000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(Picks) },
    messages: [{ role: 'user', content }],
  });
  const out = [], taken = new Set();
  for (const { scene, item } of res.parsed_output?.picks || []) {
    const c = shown[item - 1];
    if (c && options[scene]?.includes(c) && (out[scene]?.length || 0) < 2 && !taken.has(c.id)) { (out[scene] ||= []).push(c); taken.add(c.id); }
  }
  console.log(`  ${shown.length} ${what.toLowerCase()}s checked, Claude chose ${out.filter(Boolean).length} for ${scenes.length} scenes: ${res.parsed_output?.reason || res.stop_reason}`);
  return out;
}

const describe = s => (s.title ? `the opening shot, any striking view of ${s.place}` : [s.label, s.place].filter(Boolean).join(': '));

// Candidates for each scene, each used under one scene only.
async function candidates(scenes, search, skip, name) {
  const seen = new Set(skip), options = [];
  for (const [i, s] of scenes.entries()) {
    if (s.done || !s.query) continue;
    try {
      const list = (await search(s.query)).filter(c => !seen.has(c.id)).slice(0, PER_SCENE);
      list.forEach(c => seen.add(c.id));
      console.log(`${name} search "${s.query}": ${list.length} candidates`);
      options[i] = list;
    } catch (err) { console.log(`${name} search "${s.query}" failed: ${err.message}`); }
  }
  return Array.from({ length: scenes.length }, (_, i) => options[i]);
}

// Fills the title and each scene with a downloaded clip or a photo where one fits. Never throws: a scene
// without a picture is simply left out. Returns [title, ...scenes], each { label, place, detail, clips, photos }.
export async function findFootage(client, model, post, used, dir) {
  const scenes = [{ title: true, place: post.place || post.topic, query: post.photo_queries[0] },
    ...post.scenes.slice(0, MAX_SCENES)].map(s => ({ ...s, clips: [], photos: [] }));
  if (!hasKey()) return scenes;
  try {
    const options = await candidates(scenes, searchVideos, used, 'Video');
    const picks = await choose(client, model, post, scenes, options, 'Clip', dir);
    for (const [i, list] of picks.entries()) for (const [n, c] of (list || []).entries()) {
      try { scenes[i].clips.push({ ...c, file: await download(c.files[0].url, path.join(dir, `clip-${i}-${n}.mp4`)) }); scenes[i].done = true; }
      catch (err) { console.log(`  ${c.url}: download failed: ${err.message}`); }
    }
  } catch (err) { console.log(`Choosing clips failed: ${err.message}`); }
  try {
    if (scenes.slice(1).some(s => !s.done)) {
      const options = await candidates(scenes, searchPhotos, used, 'Photo');
      const picks = await choose(client, model, post, scenes, options, 'Photo', dir);
      for (const [i, list] of picks.entries()) for (const c of list || []) {
        const r = await fetch(c.image);
        if (r.ok) { scenes[i].photos.push({ ...c, buffer: Buffer.from(await r.arrayBuffer()) }); scenes[i].done = true; }
      }
    }
  } catch (err) { console.log(`Choosing photos failed: ${err.message}`); }
  return scenes;
}

// ---- Text ----

// One bright colour a day for the place names, so a feed of Reels doesn't look the same.
const ACCENTS = ['#ffe14d', '#7df0e0', '#ffb45c', '#ffffff'];
const glow = 'filter="url(#deep)"';
const DEEP = '<filter id="deep" x="-10%" y="-30%" width="120%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="3"/><feComponentTransfer><feFuncA type="linear" slope="0.85"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
const SHADE = '<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.6"/><stop offset="0.6" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>';
const svg = s => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${SHADOW}${DEEP}${SHADE}</defs>${s}</svg>`)).png().toBuffer();
const mid = { anchor: 'middle', extra: glow };
const C = W / 2;
const shade = `<rect width="${W}" height="1050" fill="url(#top)"/>`;

// Each text function returns { base, layers }: base is still, each layer comes in on its own at `at` seconds.
async function titleText(t, accent, p) {
  const big = await fit(t.big, { font: SERIF, weight: 700, lh: 1.02 }, 920, 3, t.big.length > 18 ? 130 : 200, 60);
  const small = await fit(t.small, { font: SANS, weight: 700 }, 860, 2, 68, 34), price = await fit(t.price || '', { font: SANS, weight: 700, lh: 1.2 }, 780, 2, 46, 28);
  let y = 350;
  const a = draw(big, C, y, accent, mid); y += big.h + 22;
  const b = draw(small, C, y, '#fff', mid); y += small.h + 44;
  const w = Math.max(0, ...(price.ws || [])) + 80, h = price.h + 36;
  const c = price.lines.length ? `<rect x="${C - w / 2}" y="${y}" width="${w}" height="${h}" rx="${Math.min(46, h / 2)}" fill="${p.deep}"/>${draw(price, C, y + 18, '#fff', { anchor: 'middle' })}` : '';
  return { base: shade, layers: [{ s: a, at: 0, move: 'zoom' }, { s: b, at: 0.35, move: 'up' }, ...(c ? [{ s: c, at: 0.75, move: 'up' }] : [])] };
}

async function sceneText(s, accent, n, total) {
  const l = await fit(s.label || '', { font: SERIF, italic: true }, 800, 1, 96, 50), b = await fit(s.place, { font: SANS, weight: 700, lh: 1.08 }, 900, 3, 92, 46);
  const d = await fit(s.detail || '', { font: SANS, weight: 700, lh: 1.25 }, 760, 2, 44, 28);
  const y = 360, yb = y + l.h + (l.h ? 8 : 0), yd = yb + b.h + 30, w = Math.max(0, ...(d.ws || [])) + 110, x = C - w / 2, h = d.h + 34;
  // A bar at the top shows how far along the trip we are.
  const gap = 10, seg = (880 - gap * (total - 1)) / total;
  const bar = Array.from({ length: total }, (_, i) => `<rect x="${100 + i * (seg + gap)}" y="268" width="${seg}" height="8" rx="4" fill="${i <= n ? accent : '#ffffff'}" fill-opacity="${i <= n ? 1 : 0.4}"/>`).join('');
  const pin = `<path transform="translate(${x + 28} ${yd + h / 2 - 22})" d="M16 0C7 0 0 7 0 16c0 12 16 28 16 28s16-16 16-28C32 7 25 0 16 0zm0 22a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" fill="${accent}"/>`;
  return { base: shade + bar, layers: [
    ...(l.lines.length ? [{ s: draw(l, C, y, '#fff', mid), at: 0.1, move: 'left' }] : []),
    { s: draw(b, C, yb, accent, mid), at: 0.25, move: 'zoom' },
    ...(d.lines.length ? [{ s: `<rect x="${x}" y="${yd}" width="${w}" height="${h}" rx="${Math.min(40, h / 2)}" fill="#000" fill-opacity="0.55"/>${pin}${draw(d, x + 78 + (w - 110) / 2, yd + 17, '#fff', { anchor: 'middle' })}`, at: 0.6, move: 'up' }] : []),
  ] };
}

async function endText(t, accent, p) {
  const big = await fit(t.big, { font: SERIF, weight: 700, lh: 1.05 }, 900, 2, 110, 56), price = await fit(t.price || '', { font: SANS, weight: 700, lh: 1.2 }, 860, 2, 56, 30);
  const cta = await fit(t.cta, { font: SANS, weight: 700 }, 720, 1, 44, 28), name = await fit('Hyderabad Holidays Co.', brand, 860, 1, 58, 40), line = await fit(CONTACT, contactFont, 900, 1, 38, 24);
  let y = 690;
  const a = draw(big, C, y, accent, mid); y += big.h + 14;
  const b = draw(price, C, y, '#fff', mid); y += price.h + 40;
  const w = cta.ws[0] + 90, c = `<rect x="${C - w / 2}" y="${y}" width="${w}" height="${cta.h + 44}" rx="${(cta.h + 44) / 2}" fill="${p.deep}"/>${draw(cta, C, y + 22, '#fff', { anchor: 'middle' })}`; y += cta.h + 100;
  return { base: `<rect width="${W}" height="${H}" fill="#000" fill-opacity="0.55"/>`, layers: [
    { s: logo(C, 520, 130) + a, at: 0, move: 'zoom' }, { s: b, at: 0.35, move: 'up' }, { s: c, at: 0.65, move: 'up' },
    { s: draw(name, C, y, '#fff', mid) + draw(line, C, y + name.h + 10, '#fff', mid), at: 0.9, move: 'up' }] };
}

// ---- Music ----

// Finds the beat of a track and where its liveliest stretch starts: { start, beat } in seconds.
export function musicBeat(file, length = 30) {
  const rate = 11025, hop = 128, dt = hop / rate;
  const pcm = execFileSync(ffmpegPath, ['-loglevel', 'error', '-i', file, '-t', '120', '-ac', '1', '-ar', String(rate), '-f', 's16le', '-'], { maxBuffer: 1e8 });
  const x = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2)), n = Math.floor(x.length / hop);
  const e = Array.from({ length: n }, (_, i) => { let t = 0; for (let k = i * hop; k < (i + 1) * hop; k++) t += x[k] * x[k]; return Math.log(1 + t / hop); });
  const on = e.map((v, i) => (i < 4 ? 0 : Math.max(0, v - e[i - 4]))), mean = on.reduce((a, b) => a + b, 0) / (n || 1), o = on.map(v => v - mean);
  let best = [-Infinity, 0.5];
  for (let lag = Math.round(0.4 / dt); lag <= Math.round(0.8 / dt); lag++) { // 75-150 beats a minute
    let t = 0;
    for (let i = lag * 2; i < n; i++) t += o[i] * (o[i - lag] + 0.5 * o[i - lag * 2]);
    if (t / (n - lag * 2) > best[0]) best = [t / (n - lag * 2), lag * dt];
  }
  const beat = best[1], step = beat / dt;
  let phase = [-Infinity, 0];
  for (let p = 0; p < step; p++) { let t = 0; for (let i = p; i < n; i += step) t += on[Math.round(i)] || 0; if (t > phase[0]) phase = [t, p]; }
  // The loudest stretch of the needed length, starting on a beat.
  const sum = [0]; for (const v of e) sum.push(sum[sum.length - 1] + v);
  const need = Math.round(length / dt);
  let at = [-Infinity, phase[1]];
  for (let i = phase[1]; i + need < n; i += step) { const k = Math.round(i), v = sum[k + need] - sum[k]; if (v > at[0]) at = [v, i]; }
  return { start: at[1] * dt, beat };
}

// ---- Video ----

const TRANSITIONS = ['smoothleft', 'smoothdown', 'slideup', 'smoothright', 'circleopen', 'smoothup', 'wipeleft', 'slideleft'];
const GRADE = 'eq=contrast=1.06:saturation=1.16,unsharp=5:5:0.4';

// scenes: from findFootage. title: { big, small, price, cta }.
export async function renderReel({ title, scenes, look: turn, music, dir, out }) {
  await loadLogo();
  const p = paletteFor(turn), accent = ACCENTS[turn % ACCENTS.length];
  const plain = { photo: await sharp(pattern(W, H, p)).png().toBuffer() };
  const pics = s => [...s.clips.map(clip => ({ clip })), ...s.photos.map(x => ({ photo: x.buffer }))].slice(0, 2);
  let days = scenes.slice(1).filter(s => pics(s).length);
  if (days.length < 2) days = scenes.slice(1); // too little footage: keep the plan and use the plain pattern
  // The opening and closing shots borrow a day's picture if they have none of their own.
  const own = pics(scenes[0]), borrowed = days.flatMap(pics);
  const first = own.length ? own : borrowed.slice(-2).reverse(), last = own.length ? own[own.length - 1] : borrowed[0];

  // Scene lengths are whole beats, near 3 seconds; two shots in a scene swap on a beat.
  let start = 0, beat = 0.5;
  if (music) try { ({ start, beat } = musicBeat(music)); } catch (err) { console.log(`Music beat not found: ${err.message}`); }
  const beats = sec => Math.max(2, Math.round(sec / beat / 2) * 2) * beat;
  const parts = [
    { pics: first.length ? first : [plain], seconds: beats(3), text: await titleText(title, accent, p) },
    ...await Promise.all(days.map(async (s, i) => ({ pics: pics(s).length ? pics(s) : [plain], seconds: beats(3), text: await sceneText(s, accent, i, days.length) }))),
    { pics: [last || plain], seconds: beats(3.8), late: true, text: await endText(title, accent, p) },
  ];
  const total = parts.reduce((t, s) => t + s.seconds, 0);
  const handle = draw(await fit('hydholidays.com', { font: SANS, weight: 700 }, 600, 1, 34, 24), C, 1400, '#fff', { anchor: 'middle', extra: 'opacity="0.55"' });

  const inputs = [], f = [];
  let k = 0, image = 0;
  const still = async s => { const file = path.join(dir, `layer-${image++}.png`); fs.writeFileSync(file, await svg(s)); return file; };
  for (const [i, part] of parts.entries()) {
    const full = part.seconds + (i < parts.length - 1 ? CUT : 0), n = part.pics.length;
    for (const [j, s] of part.pics.entries()) {
      const d = n === 1 ? full : j ? full - part.seconds / 2 : part.seconds / 2;
      const tail = `trim=duration=${d.toFixed(3)},setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=1/30`;
      if (s.clip) {
        // Slow a short clip down a little rather than freezing it. Each shot starts with a quick push back.
        const slow = Math.min(1.5, Math.max(1, d / s.clip.duration)), room = Math.max(0, s.clip.duration - d / slow - 0.2);
        inputs.push('-ss', (room * (part.late ? 0.9 : 0.3)).toFixed(2), '-t', (d / slow + 0.2).toFixed(2), '-i', s.clip.file);
        const z = '(1+0.1*pow(max(0,1-t/0.45),2))';
        f.push(`[${k++}:v]setpts=(PTS-STARTPTS)*${slow.toFixed(3)},fps=30,scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},tpad=stop_mode=clone:stop_duration=${full},` +
          `scale=w='2*ceil(${W}*${z}/2)':h='2*ceil(${H}*${z}/2)':eval=frame,crop=${W}:${H},${GRADE},${tail}[s${i}_${j}]`);
      } else {
        const file = path.join(dir, `shot-${i}-${j}.jpg`), frames = Math.ceil(d * 30) + 2, m = (i + j) % 3;
        fs.writeFileSync(file, await sharp(s.photo).rotate().resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer());
        inputs.push('-i', file);
        const move = m === 0 ? `z='1+0.16*on/${frames}':x='iw/2*(1-1/zoom)':y='ih/2*(1-1/zoom)'` : m === 1 ? `z='1.16':x='(iw-iw/zoom)*on/${frames}':y='ih/2*(1-1/zoom)'` : `z='1.16-0.14*on/${frames}':x='iw/2*(1-1/zoom)':y='ih/2*(1-1/zoom)'`;
        f.push(`[${k++}:v]scale=2160:3840,zoompan=${move}:d=${frames}:s=${W}x${H}:fps=30,${GRADE},${tail}[s${i}_${j}]`);
      }
    }
    f.push(`${part.pics.map((_, j) => `[s${i}_${j}]`).join('')}concat=n=${n}:v=1:a=0[v${i}]`);
    let cur = `v${i}`;
    const add = (file, filter, pos) => {
      inputs.push('-loop', '1', '-framerate', '30', '-t', full.toFixed(3), '-i', file);
      f.push(`[${k}:v]format=rgba${filter}[l${k}];[${cur}][l${k}]overlay=${pos}:eof_action=repeat[w${k}]`);
      cur = `w${k++}`;
    };
    add(await still(part.text.base + (part.late ? '' : handle)), '', '0:0');
    for (const layer of part.text.layers) {
      const at = layer.at + (i ? CUT * 0.6 : 0), u = `max(0,1-max(0,t-${at})/0.4)`;
      const fade = layer.at === 0 && !i ? '' : `,fade=t=in:st=${at}:d=0.2:alpha=1`;
      if (layer.move === 'zoom') add(await still(layer.s), `${fade},scale=w='2*ceil(${W}*(1+0.12*pow(${u},3))/2)':h=-2:eval=frame`, `x='(W-w)/2':y='(H-h)*0.27'`);
      else add(await still(layer.s), fade, layer.move === 'left' ? `x='-140*pow(${u},3)':y=0` : `x=0:y='60*pow(${u},3)'`);
    }
    f.push(`[${cur}]trim=duration=${full.toFixed(3)},setpts=PTS-STARTPTS,fps=30,settb=1/30,format=yuv420p[c${i}]`);
  }
  let last2 = 'c0', t = 0;
  for (let i = 1; i < parts.length; i++) {
    t += parts[i - 1].seconds;
    f.push(`[${last2}][c${i}]xfade=transition=${TRANSITIONS[(turn + i) % TRANSITIONS.length]}:duration=${CUT}:offset=${t.toFixed(3)}[x${i}]`);
    last2 = `x${i}`;
  }
  inputs.push(...(music ? ['-stream_loop', '-1', '-ss', start.toFixed(2), '-i', music] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']));
  f.push(`[${last2}]fade=t=out:st=${(total - 0.4).toFixed(3)}:d=0.4,format=yuv420p[v]`, `[${k}:a]afade=t=in:st=0:d=0.1,afade=t=out:st=${(total - 2).toFixed(3)}:d=2[a]`);
  ffmpeg([...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', total.toFixed(3), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out]);
  return out;
}
