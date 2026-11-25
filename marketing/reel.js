// The Reel / Short: real video clips of the trip, full screen. It opens with the place and the length of the
// trip, then shows a clip for each day with "Day 1" and the place over it, and ends with the price and our
// contact details. Clips are stock footage, so Claude looks at frames from every one and only accepts clips
// that really show that place. A scene without a clip gets a photo of the place; without either it is left out.
// 1080x1920 (9:16), up to 30 seconds. The apps' own buttons cover the top ~220px, the bottom ~430px and the
// lower right edge, so the text stays in the upper middle.
import fs from 'node:fs';
import path from 'node:path';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import sharp from 'sharp';
import { z } from 'zod';
import { download, ffmpeg, hasKey, searchPhotos, searchVideos } from './media.js';
import { CONTACT, SANS, SERIF, SHADOW, brand, contactFont, draw, fit, loadLogo, logo, paletteFor, pattern } from './styles.js';

const W = 1080, H = 1920;
const TITLE = 3, SCENE = 3, END = 3.6; // seconds
export const MAX_SCENES = 8;
const PER_SCENE = 5; // candidates Claude looks at for each scene

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

// options: [[candidates for scene 0], ...]. Returns the chosen candidate of each scene, or undefined.
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

For each scene choose the best item listed under it, or leave the scene out if none is right. Use an item once only. An item must clearly show the place in the scene's label, or an unmistakable example of what the label says in that same region (for "Munnar tea gardens", tea hills in Kerala). A similar-looking place elsewhere is not acceptable, and neither is an item whose tags name a different place. The title scene can be any striking view of the trip. The picture is cropped to a tall 9:16 frame around its centre, so the subject should be near the middle. Reject animation, AI-generated or heavily filtered pictures, watermarks, text, logos, flags, close-up recognisable faces, children as the main subject, and dark or shaky footage. Leaving a scene out is far better than a misleading picture.` });
  const res = await client.beta.messages.parse({
    model, max_tokens: 6000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(Picks) },
    messages: [{ role: 'user', content }],
  });
  const out = [], taken = new Set();
  for (const { scene, item } of res.parsed_output?.picks || []) {
    const c = shown[item - 1];
    if (c && options[scene]?.includes(c) && !out[scene] && !taken.has(c.id)) { out[scene] = c; taken.add(c.id); }
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
// without a picture is simply left out. Returns [title, ...scenes], each { label, place, clip?, photo? }.
export async function findFootage(client, model, post, used, dir) {
  const scenes = [{ title: true, place: post.place || post.topic, query: post.photo_queries[0] },
    ...post.scenes.slice(0, MAX_SCENES).map(s => ({ ...s }))];
  if (!hasKey()) return scenes;
  try {
    const options = await candidates(scenes, searchVideos, used, 'Video');
    const picks = await choose(client, model, post, scenes, options, 'Clip', dir);
    for (const [i, c] of picks.entries()) {
      if (!c) continue;
      try { scenes[i].clip = { ...c, file: await download(c.files[0].url, path.join(dir, `clip-${i}.mp4`)) }; scenes[i].done = true; }
      catch (err) { console.log(`  ${c.url}: download failed: ${err.message}`); }
    }
  } catch (err) { console.log(`Choosing clips failed: ${err.message}`); }
  try {
    if (scenes.slice(1).some(s => !s.done)) {
      const options = await candidates(scenes, searchPhotos, used, 'Photo');
      const picks = await choose(client, model, post, scenes, options, 'Photo', dir);
      for (const [i, c] of picks.entries()) {
        if (!c) continue;
        const r = await fetch(c.image);
        if (r.ok) { scenes[i].photo = { ...c, buffer: Buffer.from(await r.arrayBuffer()) }; scenes[i].done = true; }
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

async function titleText(t, accent, p) {
  const big = await fit(t.big, { font: SERIF, weight: 700, lh: 1.02 }, 920, 3, t.big.length > 18 ? 130 : 190, 60);
  const small = await fit(t.small, { font: SANS, weight: 700 }, 860, 2, 64, 34), price = await fit(t.price || '', { font: SANS, weight: 700, lh: 1.2 }, 780, 2, 44, 28);
  let y = 350;
  const a = draw(big, C, y, accent, mid); y += big.h + 22;
  const b = draw(small, C, y, '#fff', mid); y += small.h + 44;
  const w = Math.max(0, ...(price.ws || [])) + 80;
  const c = price.lines.length ? `<rect x="${C - w / 2}" y="${y}" width="${w}" height="${price.h + 36}" rx="${(price.h + 36) / 2 > 46 ? 46 : (price.h + 36) / 2}" fill="${p.deep}"/>${draw(price, C, y + 18, '#fff', { anchor: 'middle' })}` : '';
  return { base: shade, text: a + b + c };
}

async function sceneText(s, accent) {
  const l = await fit(s.label || '', { font: SERIF, italic: true }, 800, 1, 92, 50), b = await fit(s.place, { font: SANS, weight: 700, lh: 1.1 }, 900, 3, 88, 46);
  return { base: shade, text: draw(l, C, 380, '#fff', mid) + draw(b, C, 380 + l.h + (l.h ? 8 : 0), accent, mid) };
}

async function endText(t, accent, p) {
  const big = await fit(t.big, { font: SERIF, weight: 700, lh: 1.05 }, 900, 2, 110, 56), price = await fit(t.price || '', { font: SANS, weight: 700, lh: 1.2 }, 860, 2, 56, 30);
  const cta = await fit(t.cta, { font: SANS, weight: 700 }, 720, 1, 44, 28), name = await fit('Hyderabad Holidays Co.', brand, 860, 1, 58, 40), line = await fit(CONTACT, contactFont, 900, 1, 38, 24);
  let y = 690;
  const a = draw(big, C, y, accent, mid); y += big.h + 14;
  const b = draw(price, C, y, '#fff', mid); y += price.h + 40;
  const w = cta.ws[0] + 90, c = `<rect x="${C - w / 2}" y="${y}" width="${w}" height="${cta.h + 44}" rx="${(cta.h + 44) / 2}" fill="${p.deep}"/>${draw(cta, C, y + 22, '#fff', { anchor: 'middle' })}`; y += cta.h + 100;
  return { base: `<rect width="${W}" height="${H}" fill="#000" fill-opacity="0.55"/>`, text: `${logo(C, 520, 130)}${a}${b}${c}${draw(name, C, y, '#fff', mid)}${draw(line, C, y + name.h + 10, '#fff', mid)}` };
}

// ---- Video ----

// scenes: from findFootage. title: { big, small, price, cta }.
export async function renderReel({ title, scenes, look: turn, music, dir, out }) {
  await loadLogo();
  const p = paletteFor(turn), accent = ACCENTS[turn % ACCENTS.length];
  const plain = await sharp(pattern(W, H, p)).png().toBuffer();
  const pic = s => (s.clip ? { clip: s.clip } : s.photo ? { photo: s.photo.buffer } : null);
  let days = scenes.slice(1).filter(pic);
  if (days.length < 2) days = scenes.slice(1); // too little footage: keep the plan and use the plain pattern
  // The opening and closing shots borrow a day's picture if they have none of their own.
  const own = pic(scenes[0]), borrow = days.map(pic).filter(Boolean);
  const first = own || borrow[borrow.length - 1] || { photo: plain }, last = own || borrow[0] || { photo: plain };
  const shots = [
    { ...first, seconds: TITLE, text: await titleText(title, accent, p) },
    ...await Promise.all(days.map(async s => ({ ...(pic(s) || { photo: plain }), seconds: SCENE, text: await sceneText(s, accent) }))),
    { ...last, seconds: END, late: true, text: await endText(title, accent, p) },
  ];
  const handle = await fit('hydholidays.com', { font: SANS, weight: 700 }, 600, 1, 34, 24);

  const inputs = [], f = [], total = shots.reduce((t, s) => t + s.seconds, 0);
  for (const [i, s] of shots.entries()) {
    const d = s.seconds, base = path.join(dir, `base-${i}.png`), text = path.join(dir, `text-${i}.png`), k = i * 3;
    fs.writeFileSync(base, await svg(s.text.base + (s.late ? '' : draw(handle, C, 1400, '#fff', { anchor: 'middle', extra: 'opacity="0.55"' }))));
    fs.writeFileSync(text, await svg(s.text.text));
    const tail = `trim=duration=${d},setpts=PTS-STARTPTS,setsar=1,format=yuv420p`;
    if (s.clip) {
      // Slow a short clip down a little rather than freezing it. The closing shot uses the end of its clip.
      const slow = Math.min(1.5, Math.max(1, d / s.clip.duration)), room = Math.max(0, s.clip.duration - d / slow - 0.2);
      inputs.push('-ss', (room * (s.late ? 0.9 : 0.3)).toFixed(2), '-t', (d / slow + 0.2).toFixed(2), '-i', s.clip.file);
      f.push(`[${k}:v]setpts=(PTS-STARTPTS)*${slow.toFixed(3)},scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=30,tpad=stop_mode=clone:stop_duration=${d},${tail}[p${i}]`);
    } else {
      const file = path.join(dir, `shot-${i}.jpg`), frames = Math.ceil(d * 30);
      fs.writeFileSync(file, await sharp(s.photo).rotate().resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer());
      inputs.push('-i', file);
      f.push(`[${k}:v]scale=2160:3840,zoompan=z='${i % 2 ? `1.1-0.1*on/${frames}` : `1+0.1*on/${frames}`}':x='iw/2*(1-1/zoom)':y='ih/2*(1-1/zoom)':d=${frames}:s=${W}x${H}:fps=30,${tail}[p${i}]`);
    }
    for (const file of [base, text]) inputs.push('-loop', '1', '-framerate', '30', '-t', String(d), '-i', file);
    f.push(`[${k + 1}:v]format=rgba[b${i}];[${k + 2}:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1[t${i}];` +
      `[p${i}][b${i}]overlay=0:0:eof_action=repeat[q${i}];[q${i}][t${i}]overlay=x=0:y='45*pow(max(0,1-t/0.4),3)':eof_action=repeat,trim=duration=${d},setpts=PTS-STARTPTS,settb=1/30,format=yuv420p[c${i}]`);
  }
  inputs.push(...(music ? ['-stream_loop', '-1', '-i', music] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']));
  f.push(`${shots.map((_, i) => `[c${i}]`).join('')}concat=n=${shots.length}:v=1:a=0,fade=t=out:st=${total - 0.4}:d=0.4,format=yuv420p[v]`,
    `[${shots.length * 3}:a]afade=t=in:st=0:d=0.3,afade=t=out:st=${total - 2.5}:d=2.5[a]`);
  ffmpeg([...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', String(total), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
  return out;
}
