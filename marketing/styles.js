// The look of the daily social post. Eight designs take turns, and each time round they use the next of
// three colour sets, so 24 posts in a row look different. agent.js keeps the turn in its history; set
// STYLE=<name> to force one. Preview them all with `node preview-styles.js`.
//
// A design is three layers: the photo (in the design's window, or full size), a fixed frame around it and
// the text. The still image combines them; in the video the photo moves slowly and the text comes in over it.
// Feed images are 1080x1350 (4:5). Reels and Shorts are 1080x1920 (9:16); there the apps' own buttons cover
// the top ~220px and the bottom ~430px, so everything that must be read stays between them.
// Text is measured with the fonts of the machine that draws it, so it fits with any of them.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const W = 1080;
const INK = '#151a1c', GOLD = '#e0b453', PAPER = '#f7f4ec';
const PALETTES = [ // deep: main colour, soft: light text on it
  { name: 'teal', deep: '#0f6b6b', soft: '#e2f0ee' },
  { name: 'indigo', deep: '#27406b', soft: '#e3e9f4' },
  { name: 'terracotta', deep: '#8f3b2a', soft: '#f8e6df' },
];
const SERIF = "Georgia, 'DejaVu Serif', serif", SANS = "Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif";
const CONTACT = 'hydholidays.com  ·  WhatsApp +91 70750 40406';

const LOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'logo.png');
let logoUri;
const loadLogo = async () => (logoUri ||= `data:image/png;base64,${(await sharp(LOGO).resize(320, 320).png().toBuffer()).toString('base64')}`);
const logo = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/><image href="${logoUri}" x="${cx - r * 0.86}" y="${cy - r * 0.86}" width="${r * 1.72}" height="${r * 1.72}"/>`;

// ---- Text ----

const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const attrs = f => `font-family="${f.font}" font-weight="${f.weight || 400}" font-style="${f.italic ? 'italic' : 'normal'}"`;

const widths = new Map();
// Width of a piece of text at 100px, without letter spacing.
async function width100(text, f) {
  const key = `${attrs(f)}|${text}`;
  if (!widths.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3200" height="200"><rect width="3200" height="200" fill="#fff"/><text x="20" y="130" ${attrs(f)} font-size="100">${xml(text)}</text></svg>`;
    // trim fails on an image with nothing in it (a character no font has); guess then
    const w = await sharp(Buffer.from(svg)).trim({ threshold: 20 }).toBuffer({ resolveWithObject: true }).then(r => r.info.width, () => 60 * text.length);
    widths.set(key, w);
  }
  return widths.get(key);
}

// The largest size (max down to min) at which the text fits in maxW and maxLines.
async function fit(text, f, maxW, maxLines, max, min) {
  const words = (f.upper ? text.toUpperCase() : text).split(/\s+/).filter(Boolean);
  if (!words.length) return { ...f, lines: [], size: 0, h: 0 };
  const space = (await width100('n n', f)) - (await width100('nn', f));
  const ws = [];
  for (const w of words) ws.push((await width100(w, f)) + 4);
  const set = (size, limit) => {
    const k = size / 100, lines = [];
    words.forEach((w, i) => {
      const own = ws[i] * k + (f.spacing || 0) * w.length, last = lines[lines.length - 1];
      const joined = last && last.w + space * k + (f.spacing || 0) + own;
      if (last && joined <= limit) { last.t += ' ' + w; last.w = joined; } else lines.push({ t: w, w: own });
    });
    return { lines, widest: Math.max(...lines.map(l => l.w)) };
  };
  let size = max, best = set(size, maxW);
  while (size > min && (best.lines.length > maxLines || best.widest > maxW)) best = set(size -= 2, maxW);
  // Even out the lines, so no word is left alone on the last one.
  for (let limit = maxW * 0.97; limit > maxW * 0.4; limit -= maxW * 0.03) {
    const next = set(size, limit);
    if (next.lines.length > best.lines.length || next.widest > maxW) break;
    best = next;
  }
  const lh = size * (f.lh || 1.14);
  return { ...f, size, lh, lines: best.lines.map(l => l.t), ws: best.lines.map(l => l.w), h: best.lines.length * lh };
}

// Draws fitted text with the top of its first line at y.
function draw(b, x, y, fill, { anchor = 'start', extra = '' } = {}) {
  return b.lines.map((l, i) => `<text x="${x}" y="${y + b.lh * i + b.size * 0.86 + (b.lh - b.size) / 2}" ${attrs(b)} font-size="${b.size}" letter-spacing="${b.spacing || 0}" text-anchor="${anchor}" fill="${fill}" ${extra}>${xml(l)}</text>`).join('\n');
}

const kickerFont = { font: SANS, weight: 700, spacing: 4, upper: true };
const contactFont = { font: SANS };
const brand = { font: SANS, weight: 700 };

const SHADOW = '<filter id="shadow" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="2"/><feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
const fade = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, a]) => `<stop offset="${o}" stop-color="#000" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

// Company name and contact line, left aligned or centred, with the top at y (about 100px high).
async function contact(c, x, y, head, sub, anchor = 'start', maxW = 900) {
  const a = await fit('Hyderabad Holidays Co.', brand, maxW, 1, 40, 24), b = await fit(CONTACT, contactFont, maxW, 1, 32, 20);
  return draw(a, x, y, head, { anchor }) + draw(b, x, y + 54, sub, { anchor });
}

// ---- Designs ----
// Each gets the card text and c = { H, tall, top, bottom, p } (top and bottom: the readable area) and
// returns { window, frame, text, motion, enter }. window: where the photo shows (default: everywhere).

const DESIGNS = {
  // Photo, dark fade, headline above a contact band.
  async classic(t, c) {
    const bandY = c.tall ? c.H - 640 : c.H - 210;
    const k = await fit(t.kicker, kickerFont, 900, 1, 34, 24), h = await fit(t.headline, { font: SERIF }, 900, 4, 96, 48), s = await fit(t.subline, { font: SANS, lh: 1.3 }, 900, 3, 40, 28);
    const y = bandY - 56 - s.h - (s.h && 26) - h.h, f = 'filter="url(#shadow)"', from = y - 420;
    return {
      motion: 'in', enter: 'fade',
      frame: `<defs>${fade('fade', [[0, 0], [0.35, 0.55], [1, 0.85]])}</defs><rect y="${from}" width="${W}" height="${c.H - from}" fill="url(#fade)"/><rect y="${bandY}" width="${W}" height="210" fill="${c.p.deep}"/>`,
      text: `<defs>${SHADOW}</defs>${logo(W - 165, c.top + 85, 88)}
        <rect x="90" y="${y - 86}" width="90" height="6" fill="${GOLD}"/>${draw(k, 90, y - 62, GOLD, { extra: f })}
        ${draw(h, 90, y, '#fff', { extra: f })}${draw(s, 90, y + h.h + 26, c.p.soft, { extra: f })}
        ${await contact(c, 90, bandY + 56, '#fff', c.p.soft)}`,
    };
  },

  // A postcard: photo on paper with a perforated stamp, message and contact strip below.
  async postcard(t, c) {
    const footY = c.tall ? 1330 : c.H - 150, x = 70, w = W - 140;
    const k = await fit(t.kicker, kickerFont, w, 1, 32, 22), h = await fit(t.headline, { font: SERIF, weight: 700 }, w, 3, 78, 44), s = await fit(t.subline, { font: SANS, lh: 1.3 }, w, 2, 38, 26);
    const textH = k.h + 14 + h.h + (s.h && 18 + s.h), y = footY - 44 - textH, photoTop = c.tall ? 120 : 70;
    const win = { x, y: photoTop, w, h: y - 44 - photoTop };
    const sx = W - 285, sy = photoTop + (c.tall ? 110 : 40), dots = [];
    for (let i = 0; i <= 9; i++) for (const [dx, dy] of [[i * 20, 0], [i * 20, 220], [0, i * 24.4], [180, i * 24.4]]) dots.push(`<circle cx="${sx + dx}" cy="${sy + dy}" r="7"/>`);
    return {
      window: win, motion: 'out', enter: 'up',
      frame: `<defs><mask id="m"><rect width="${W}" height="${c.H}" fill="#fff"/><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="10" fill="#000"/></mask></defs>
        <rect width="${W}" height="${c.H}" fill="${PAPER}" mask="url(#m)"/>
        <rect y="${footY}" width="${W}" height="${c.H - footY}" fill="${c.p.deep}"/><g transform="translate(0 ${footY - 8})">${Array.from({ length: 23 }, (_, i) => `<path d="M${i * 48 - 12} 0h24l-12 8h-24z" fill="${i % 2 ? GOLD : c.p.deep}"/>`).join('')}</g>`,
      text: `<g transform="rotate(4 ${sx + 90} ${sy + 110})"><g fill="#fff">${dots.join('')}</g><rect x="${sx}" y="${sy}" width="180" height="220" fill="#fff"/><rect x="${sx + 14}" y="${sy + 14}" width="152" height="192" fill="none" stroke="${c.p.deep}" stroke-width="3"/>${logo(sx + 90, sy + 110, 70)}</g>
        ${draw(k, x, y, c.p.deep)}${draw(h, x, y + k.h + 14, INK)}${draw(s, x, y + k.h + 14 + h.h + 18, '#4d5659')}
        ${await contact(c, x, footY + 28, '#fff', c.p.soft)}`,
    };
  },

  // A tilted instant photo taped to a coloured page.
  async snapshot(t, c) {
    const x = 90, w = W - 180, baseY = c.bottom - 100;
    const h = await fit(t.headline, { font: SERIF, italic: true }, w, 3, 76, 44), s = await fit(t.subline, { font: SANS, lh: 1.3 }, w, 2, 38, 26);
    const textH = h.h + (s.h && 16 + s.h), y = baseY - 46 - textH;
    const pt = c.tall ? 250 : 80, ph = y - 60 - pt, pw = Math.min(820, ph * 1.05), px = (W - pw) / 2; // the white card
    const k = await fit(t.kicker, { ...kickerFont, spacing: 3 }, pw - 220, 1, 32, 14);
    const cx = W / 2, cy = pt + ph / 2, rot = `rotate(-3.5 ${cx} ${cy})`, hole = { x: px + 34, y: pt + 34, w: pw - 68, h: ph - 148 };
    const pad = 40;
    return {
      window: { x: Math.round(hole.x - pad), y: Math.round(hole.y - pad), w: Math.round(hole.w + pad * 2), h: Math.round(hole.h + pad * 2) }, motion: 'in', enter: 'left',
      frame: `<defs><mask id="m"><rect width="${W}" height="${c.H}" fill="#fff"/><rect x="${hole.x}" y="${hole.y}" width="${hole.w}" height="${hole.h}" fill="#000" transform="${rot}"/></mask>${SHADOW}</defs>
        <g mask="url(#m)"><rect width="${W}" height="${c.H}" fill="${c.p.deep}"/><circle cx="${W}" cy="${c.tall ? 260 : 60}" r="330" fill="#fff" fill-opacity="0.06"/><circle cx="0" cy="${c.H - 260}" r="300" fill="#000" fill-opacity="0.12"/>
        <rect x="${px}" y="${pt}" width="${pw}" height="${ph}" fill="#000" fill-opacity="0.3" transform="translate(10 14) ${rot}"/><rect x="${px}" y="${pt}" width="${pw}" height="${ph}" fill="#fff" transform="${rot}"/></g>
        <rect x="${cx - 95}" y="${pt - 26}" width="190" height="52" fill="${GOLD}" fill-opacity="0.85" transform="${rot}"/>`,
      text: `<g transform="${rot}">${draw(k, cx - 50, pt + ph - 114 + (114 - k.h) / 2, c.p.deep, { anchor: 'middle' })}${logo(px + pw - 80, pt + ph - 62, 56)}</g>
        ${draw(h, cx, y, '#fff', { anchor: 'middle' })}${draw(s, cx, y + h.h + 16, c.p.soft, { anchor: 'middle' })}
        ${await contact(c, cx, baseY, GOLD, c.p.soft, 'middle')}`,
    };
  },

  // A travel magazine cover.
  async magazine(t, c) {
    const top = c.tall ? c.top : 64, x = 70;
    const mast = await fit('Holidays', { font: SERIF, weight: 700, upper: true, spacing: 6 }, W - 140, 1, 190, 90);
    const k = await fit(t.kicker, kickerFont, 620, 1, 32, 22), h = await fit(t.headline, { font: SERIF }, 800, 4, 84, 46), s = await fit(t.subline, { font: SANS, lh: 1.3 }, 780, 3, 38, 26);
    const contactY = c.bottom - 100, y = contactY - 46 - s.h - (s.h && 18) - h.h, f = 'filter="url(#shadow)"';
    const chipW = Math.max(...k.ws) + 56, chipY = y - k.h - 46;
    return {
      motion: 'right', enter: 'up',
      frame: `<defs>${fade('a', [[0, 0.62], [1, 0]])}${fade('b', [[0, 0], [0.4, 0.6], [1, 0.9]])}</defs><rect width="${W}" height="${top + 420}" fill="url(#a)"/><rect y="${chipY - 220}" width="${W}" height="${c.H - chipY + 220}" fill="url(#b)"/>`,
      text: `<defs>${SHADOW}</defs>${draw(await fit('Hyderabad', { ...kickerFont, spacing: 14 }, 600, 1, 30, 20), x, top, GOLD)}
        ${draw(mast, x - 4, top + 34, '#fff', { extra: f })}<rect x="${x}" y="${top + 34 + mast.h}" width="${W - 140}" height="3" fill="#fff" fill-opacity="0.8"/>
        <rect x="${x}" y="${chipY}" width="${chipW}" height="${k.h + 24}" fill="${c.p.deep}"/>${draw(k, x + 28, chipY + 12, '#fff')}
        ${draw(h, x, y, '#fff', { extra: f })}${draw(s, x, y + h.h + 18, '#eef1f0', { extra: f })}
        <rect x="${x}" y="${contactY - 22}" width="${W - 140}" height="2" fill="${GOLD}"/>${await contact(c, x, contactY, '#fff', '#eef1f0', 'start', 780)}${logo(W - 70 - 62, contactY + 54, 62)}`,
    };
  },

  // Photo above a slanted block of colour with a big capital headline.
  async slant(t, c) {
    const x = 80, contactY = c.bottom - 104;
    const k = await fit(t.kicker, kickerFont, 700, 1, 34, 24), h = await fit(t.headline, { font: SANS, weight: 700, upper: true, lh: 1.08 }, W - 160, 4, 92, 46), s = await fit(t.subline, { font: SANS, lh: 1.3 }, W - 160, 2, 38, 26);
    const y = contactY - 44 - s.h - (s.h && 20) - h.h - k.h - 14, left = y - 130, right = y - 290;
    return {
      window: { x: 0, y: 0, w: W, h: Math.round(left + 10) }, motion: 'out', enter: 'left',
      frame: `<path d="M0 ${left}L${W} ${right}V${c.H}H0z" fill="${c.p.deep}"/><path d="M0 ${left - 22}L${W} ${right - 22}V${right}L0 ${left}z" fill="${GOLD}"/>`,
      text: `${logo(W - 150, right + 40, 100)}${draw(k, x, y, GOLD)}${draw(h, x, y + k.h + 14, '#fff')}${draw(s, x, y + k.h + 14 + h.h + 20, c.p.soft)}
        <rect x="${x}" y="${contactY - 20}" width="120" height="5" fill="${GOLD}"/>${await contact(c, x, contactY, '#fff', c.p.soft)}`,
    };
  },

  // Photo inside a Deccan arch, centred text.
  async arch(t, c) {
    const cx = W / 2, footY = c.tall ? 1350 : c.H - 140, top = c.tall ? 130 : 50;
    const k = await fit(t.kicker, kickerFont, 860, 1, 30, 22), h = await fit(t.headline, { font: SERIF }, 900, 3, 74, 44), s = await fit(t.subline, { font: SANS, lh: 1.3 }, 860, 2, 36, 26);
    const y = footY - 40 - (k.h + 12 + h.h + (s.h && 16 + s.h));
    const bottom = y - 46, aw = 800, x0 = cx - aw / 2, x1 = cx + aw / 2, spring = top + (bottom - top) * 0.46;
    const shape = g => `M${x0 - g} ${bottom + g}V${spring}C${x0 - g} ${spring - (spring - top) * 0.55} ${cx - 150} ${top + 70 - g} ${cx} ${top - g * 1.3}C${cx + 150} ${top + 70 - g} ${x1 + g} ${spring - (spring - top) * 0.55} ${x1 + g} ${spring}V${bottom + g}z`;
    return {
      window: { x: Math.round(x0), y: Math.round(top), w: aw, h: Math.round(bottom - top) }, motion: 'in', enter: 'up',
      frame: `<defs><mask id="m"><rect width="${W}" height="${c.H}" fill="#fff"/><path d="${shape(0)}" fill="#000"/></mask></defs>
        <rect width="${W}" height="${c.H}" fill="${PAPER}" mask="url(#m)"/><path d="${shape(5)}" fill="none" stroke="${c.p.deep}" stroke-width="10"/><path d="${shape(24)}" fill="none" stroke="${GOLD}" stroke-width="4"/>
        <rect y="${footY}" width="${W}" height="${c.H - footY}" fill="${c.p.deep}"/>`,
      text: `${logo(x1 - 40, bottom - 60, 78)}${draw(k, cx, y, c.p.deep, { anchor: 'middle' })}${draw(h, cx, y + k.h + 12, INK, { anchor: 'middle' })}${draw(s, cx, y + k.h + 12 + h.h + 16, '#4d5659', { anchor: 'middle' })}
        ${await contact(c, cx, footY + 20, '#fff', c.p.soft, 'middle')}`,
    };
  },

  // Darkened photo, gold double border, everything centred.
  async royal(t, c) {
    const cx = W / 2, top = c.tall ? 215 : 50, bottom = c.tall ? 1500 : c.H - 50, b = bottom - top;
    const k = await fit(t.kicker, { ...kickerFont, spacing: 7 }, 760, 1, 32, 22), h = await fit(t.headline, { font: SERIF, italic: true, lh: 1.2 }, 800, 4, 88, 44), s = await fit(t.subline, { font: SANS, lh: 1.35 }, 760, 3, 38, 26);
    const textH = k.h + 70 + h.h + (s.h && 34 + s.h), y = top + 230 + Math.max(0, (b - 230 - 180 - textH) / 2);
    return {
      motion: 'in', enter: 'fade',
      frame: `<rect width="${W}" height="${c.H}" fill="#0b0f10" fill-opacity="0.6"/><rect x="50" y="${top}" width="${W - 100}" height="${b}" fill="none" stroke="${GOLD}" stroke-width="5"/><rect x="68" y="${top + 18}" width="${W - 136}" height="${b - 36}" fill="none" stroke="${GOLD}" stroke-width="2"/>
        ${[[50, top], [W - 50, top], [50, bottom], [W - 50, bottom]].map(([a, d]) => `<rect x="${a - 17}" y="${d - 17}" width="34" height="34" transform="rotate(45 ${a} ${d})" fill="${c.p.deep}" stroke="${GOLD}" stroke-width="4"/>`).join('')}`,
      text: `<defs>${SHADOW}</defs>${logo(cx, top + 130, 84)}${draw(k, cx, y, GOLD, { anchor: 'middle' })}
        <path d="M${cx - 110} ${y + k.h + 32}h86M${cx + 24} ${y + k.h + 32}h86" stroke="${GOLD}" stroke-width="3"/><rect x="${cx - 8}" y="${y + k.h + 24}" width="16" height="16" transform="rotate(45 ${cx} ${y + k.h + 32})" fill="${GOLD}"/>
        ${draw(h, cx, y + k.h + 70, '#fff', { anchor: 'middle', extra: 'filter="url(#shadow)"' })}${draw(s, cx, y + k.h + 70 + h.h + 34, '#eef1f0', { anchor: 'middle', extra: 'filter="url(#shadow)"' })}
        ${await contact(c, cx, bottom - 146, GOLD, '#eef1f0', 'middle', 820)}`,
    };
  },

  // Bright photo with each headline line on its own block of colour.
  async blocks(t, c) {
    const x = 70, contactY = c.bottom - 130;
    const k = await fit(t.kicker, kickerFont, 800, 1, 32, 22), h = await fit(t.headline, { font: SANS, weight: 700, lh: 1.42 }, W - 220, 4, 80, 44), s = await fit(t.subline, { font: SANS, weight: 700, lh: 1.45 }, W - 220, 2, 36, 26);
    const y = contactY - 50 - s.h - (s.h && 24) - h.h;
    const boxes = (b, yy, fill) => b.lines.map((l, i) => `<rect x="${x}" y="${yy + b.lh * i}" width="${b.ws[i] + 52}" height="${b.lh + 1}" fill="${fill}"/>`).join('');
    return {
      motion: 'up', enter: 'left',
      frame: `<defs>${fade('b', [[0, 0], [1, 0.55]])}</defs><rect y="${y - 200}" width="${W}" height="${c.H - y + 200}" fill="url(#b)"/>`,
      text: `${logo(W - 160, c.top + 90, 90)}<rect x="${x}" y="${y - k.h - 30}" width="${Math.max(...k.ws) + 52}" height="${k.h + 30}" fill="${INK}"/>${draw(k, x + 26, y - k.h - 15, GOLD)}
        ${boxes(h, y, GOLD)}${draw(h, x + 26, y, INK)}${boxes(s, y + h.h + 24, '#ffffff')}${draw(s, x + 26, y + h.h + 24, INK)}
        <rect x="${x}" y="${contactY}" width="${W - 140}" height="130" fill="${c.p.deep}"/>${await contact(c, x + 36, contactY + 18, '#fff', c.p.soft, 'start', W - 220)}`,
    };
  },
};

export const STYLE_NAMES = Object.keys(DESIGNS);

// The turn after the last post's (see history in agent.js), or today's if there is no history.
export function nextLook(history, now, forced) {
  if (forced && !STYLE_NAMES.includes(forced)) throw new Error(`Unknown STYLE "${forced}". Options: ${STYLE_NAMES.join(', ')}`);
  const last = history.map(h => h.look).filter(Number.isInteger).pop();
  const look = last === undefined ? Math.floor((now.getTime() + 5.5 * 3600e3) / 86400e3) : last + 1;
  if (!forced) return look;
  return look + (STYLE_NAMES.indexOf(forced) - (look % STYLE_NAMES.length) + STYLE_NAMES.length) % STYLE_NAMES.length;
}
export const lookName = look => `${STYLE_NAMES[look % STYLE_NAMES.length]}, ${palette(look).name}`;
const palette = look => PALETTES[Math.floor(look / STYLE_NAMES.length) % PALETTES.length];

// Stands in for the photo when none shows the subject: plain arcs in the day's colours.
const pattern = (w, h, p) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.deep}"/><stop offset="1" stop-color="${INK}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${[0.9, 0.74, 0.58, 0.42, 0.26].map((r, i) => `<circle cx="${w * 0.72}" cy="${h * 0.34}" r="${Math.min(w, h) * r}" fill="${i === 4 ? GOLD : 'none'}" fill-opacity="0.9" stroke="${GOLD}" stroke-opacity="${0.18 + i * 0.12}" stroke-width="4"/>`).join('')}</svg>`);

const full = H => ({ x: 0, y: 0, w: W, h: H });

// The three layers as image buffers, plus how the video moves (motion, enter, and the photo's centre as 0-1).
export async function layers(card, photo, look, H) {
  await loadLogo();
  const p = palette(look), tall = H > 1350;
  const c = { H, tall, top: tall ? 230 : 60, bottom: tall ? 1490 : H - 60, p };
  const d = await DESIGNS[STYLE_NAMES[look % STYLE_NAMES.length]]({ ...card, subline: card.subline || '' }, c);
  const win = Object.fromEntries(Object.entries(d.window || full(H)).map(([k, v]) => [k, Math.round(v)]));
  const pic = photo
    ? await sharp(photo.buffer).rotate().resize(win.w, win.h, { fit: 'cover', position: sharp.strategy.attention }).toBuffer()
    : await sharp(pattern(win.w, win.h, p)).png().toBuffer();
  const svg = s => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`)).png().toBuffer();
  return {
    bg: await sharp({ create: { width: W, height: H, channels: 3, background: p.deep } }).composite([{ input: pic, left: win.x, top: win.y }]).jpeg({ quality: 92 }).toBuffer(),
    frame: await svg(d.frame || ''), text: await svg(d.text),
    motion: d.motion, enter: d.enter, fx: (win.x + win.w / 2) / W, fy: (win.y + win.h / 2) / H,
  };
}

export async function stillImage(card, photo, look) {
  const l = await layers(card, photo, look, 1350);
  return sharp(l.bg).composite([{ input: l.frame }, { input: l.text }]).jpeg({ quality: 90 }).toBuffer();
}

// ffmpeg filter for the 15-second video. Inputs: 0 photo, 1 frame, 2 text, 3 music.
export function videoFilter({ motion, enter, fx, fy }) {
  const move = {
    in: `z='1+0.15*on/450':x='iw*${fx}*(1-1/zoom)':y='ih*${fy}*(1-1/zoom)'`,
    out: `z='1.15-0.15*on/450':x='iw*${fx}*(1-1/zoom)':y='ih*${fy}*(1-1/zoom)'`,
    right: `z='1.14':x='(iw-iw/zoom)*on/450':y='(ih-ih/zoom)/2'`,
    up: `z='1.14':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*(1-on/450)'`,
  }[motion];
  const ease = 'pow(max(0,1-t/1.3),3)';
  const slide = { fade: 'x=0:y=0', up: `x=0:y='90*${ease}'`, left: `x='-120*${ease}':y=0` }[enter];
  return `[0:v]scale=2160:3840,zoompan=${move}:d=450:s=1080x1920:fps=30[bg];` +
    '[1:v]format=rgba[frm];[bg][frm]overlay=0:0[base];' +
    '[2:v]format=rgba,fade=t=in:st=0.3:d=0.9:alpha=1[txt];' +
    `[base][txt]overlay=${slide},fade=t=out:st=14.2:d=0.8,format=yuv420p[v];` +
    '[3:a]afade=t=in:st=0:d=0.5,afade=t=out:st=12.5:d=2.5[a]';
}
