// Draws every post design (see styles.js) with sample text, to check them by eye. Posts nothing.
//   node preview-styles.js [photo.jpg] [--colours] [--long] [--plain]
//     --colours: all three colour sets   --long: the longest allowed text   --plain: no photo
// Writes out/styles-feed.jpg and out/styles-reel.jpg (contact sheets) and out/style-<name>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { STYLE_NAMES, layers, lookName } from './styles.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, 'out');
const args = process.argv.slice(2), has = a => args.includes(a);
const file = args.find(a => !a.startsWith('--')) || path.join(HERE, '..', 'images', 'raj-udaipur.jpg');
const photo = has('--plain') ? null : { buffer: fs.readFileSync(file) };
const card = has('--long')
  ? { kicker: 'International holiday idea', headline: 'Switzerland, Liechtenstein & Austria: 12 unforgettable days', subline: 'Interlaken, Jungfraujoch, Innsbruck, Salzburg, Hallstatt and Vienna at an easy pace' }
  : { kicker: 'Winter escape', headline: 'Udaipur: 4 days by the lakes', subline: 'City Palace, Lake Pichola and Kumbhalgarh fort' };

fs.mkdirSync(OUT, { recursive: true });
const count = STYLE_NAMES.length * (has('--colours') ? 3 : 1);
for (const [name, H] of [['feed', 1350], ['reel', 1920]]) {
  const w = 480, h = Math.round(w * H / 1080), tiles = [];
  for (let look = 0; look < count; look++) {
    const l = await layers(card, photo, look, H);
    const img = await sharp(l.bg).composite([{ input: l.frame }, { input: l.text }]).jpeg({ quality: 90 }).toBuffer();
    if (name === 'feed' && look < STYLE_NAMES.length) fs.writeFileSync(path.join(OUT, `style-${STYLE_NAMES[look]}.jpg`), img);
    tiles.push({ input: await sharp(img).resize(w, h).toBuffer(), left: (look % 4) * (w + 20) + 20, top: Math.floor(look / 4) * (h + 20) + 20 });
    if (name === 'feed') console.log(`${look + 1}. ${lookName(look)}`);
  }
  await sharp({ create: { width: 4 * (w + 20) + 20, height: Math.ceil(count / 4) * (h + 20) + 20, channels: 3, background: '#cfd4d4' } })
    .composite(tiles).jpeg({ quality: 85 }).toFile(path.join(OUT, `styles-${name}.jpg`));
}
