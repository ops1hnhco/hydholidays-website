// Free, licensed stock photos and videos from Pixabay (PIXABAY_API_KEY) or Pexels (PEXELS_API_KEY).
// Photos: { id, image, preview, tags, credit, url }. Videos: { id, duration, tags, credit, site, url, preview,
// files }, files sorted sharpest first. Pixabay only returns items tagged with every word of the search, so a
// search that finds nothing is retried with its first words dropped ("Ha Long Bay Vietnam" -> "Vietnam").
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const MAX_BYTES = 150e6; // skip video files bigger than this
const keys = () => ({ pixabay: process.env.PIXABAY_API_KEY, pexels: process.env.PEXELS_API_KEY });
export const hasKey = () => Boolean(keys().pixabay || keys().pexels);
export const ffmpeg = args => execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1e8 });

async function json(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`${new URL(url).hostname} HTTP ${r.status}`);
  return r.json();
}

// Runs a Pixabay search, dropping first words until something is found. exact: keep every word.
async function pixabay(query, exact, run) {
  const words = query.split(/\s+/).filter(Boolean);
  for (let i = 0; i < (exact ? 1 : words.length); i++) {
    const hits = await run(words.slice(i).join(' '));
    if (hits.length) {
      if (i) console.log(`  "${query}" found nothing; using "${words.slice(i).join(' ')}"`);
      return hits;
    }
  }
  return [];
}

export async function searchPhotos(query, { exact = false } = {}) {
  const k = keys();
  if (k.pixabay) {
    const search = (q, orientation) => json(`https://pixabay.com/api/?${new URLSearchParams({ key: k.pixabay, q, image_type: 'photo', orientation, safesearch: 'true', min_width: '1080', per_page: '20' })}`);
    const hits = await pixabay(query, exact, async q => {
      let { hits = [] } = await search(q, 'vertical');
      if (hits.length < 4) ({ hits = [] } = await search(q, 'all'));
      return hits;
    });
    return hits.map(h => ({ id: `pixabay-${h.id}`, image: h.largeImageURL, preview: h.webformatURL, tags: h.tags, credit: `Photo: ${h.user} on Pixabay`, url: h.pageURL }));
  }
  const { photos = [] } = await json(`https://api.pexels.com/v1/search?${new URLSearchParams({ query, orientation: 'portrait', size: 'large', per_page: '15' })}`, { headers: { Authorization: k.pexels } });
  return photos.map(p => ({ id: p.id, image: `${p.src.original}?auto=compress&cs=tinysrgb&w=2160`, preview: p.src.medium, tags: p.alt, credit: `Photo: ${p.photographer} on Pexels`, url: p.url }));
}

// The sharpest file once cropped to 9:16, without being needlessly large.
export const cropHeight = f => Math.min(f.height, f.width * 16 / 9);
const bestFirst = files => files.filter(f => f.url && f.height && (!f.size || f.size < MAX_BYTES))
  .sort((a, b) => Math.min(cropHeight(b), 1920) - Math.min(cropHeight(a), 1920) || cropHeight(a) - cropHeight(b));

export async function searchVideos(query, { exact = false } = {}) {
  const k = keys();
  let found;
  if (k.pixabay) {
    const hits = await pixabay(query, exact, async q =>
      (await json(`https://pixabay.com/api/videos/?${new URLSearchParams({ key: k.pixabay, q, video_type: 'film', safesearch: 'true', per_page: '30' })}`)).hits || []);
    found = hits.map(h => ({ id: `pixabay-v${h.id}`, duration: h.duration, tags: h.tags, credit: h.user, site: 'Pixabay', url: h.pageURL, preview: h.videos?.tiny?.url || h.videos?.small?.url, files: bestFirst(Object.values(h.videos || {})) }));
  } else {
    const { videos = [] } = await json(`https://api.pexels.com/v1/videos/search?${new URLSearchParams({ query, per_page: '20' })}`, { headers: { Authorization: k.pexels } });
    found = videos.map(v => {
      const files = (v.video_files || []).filter(f => f.file_type === 'video/mp4' && f.height).map(f => ({ url: f.link, width: f.width, height: f.height }));
      const small = [...files].sort((a, b) => a.width - b.width)[0];
      return { id: `pexels-v${v.id}`, duration: v.duration, tags: (v.tags || []).join(', ') || v.url, credit: v.user?.name, site: 'Pexels', url: v.url, preview: small?.url, files: bestFirst(files) };
    });
  }
  // Long enough, and sharp enough for a full-screen crop; the sharpest first, otherwise in the site's order.
  return found.filter(c => c.preview && c.files.length && c.duration >= 4 && c.duration <= 120 && cropHeight(c.files[0]) >= 1000)
    .sort((a, b) => (cropHeight(b.files[0]) >= 1900) - (cropHeight(a.files[0]) >= 1900));
}

export async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (+r.headers.get('content-length') > MAX_BYTES) throw new Error('file too large');
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}
