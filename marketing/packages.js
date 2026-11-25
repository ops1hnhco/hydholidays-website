// Our own packages, for the daily posts: which one's turn it is, the facts from its page on the website
// (price, itinerary, inclusions), and a check that a post only uses that page's prices.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGION = { 'domestic package': 'in', 'international package': 'intl' };

// The same list the website shows (app.js), with each package's page and price as text.
export function loadPackages() {
  const list = Function('return ' + fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').match(/const P=(\[[\s\S]*?\]);/)[1])();
  return list.map(x => ({ name: x.n, region: x.r, group: x.grp || x.n, nights: x.d, price: (x.cur || '₹') + x.p, page: (x.s || x.n.toLowerCase()) + '-tour-package.html' }))
    .filter(x => fs.existsSync(path.join(ROOT, x.page)));
}

// Every package gets a turn before any gets a second one, and packages of the same destination are kept
// apart. Christmas trips are only posted from November to mid-December, and then they go first. Packages
// skipped in the last 30 days (their dates had passed, say) wait. Returns the best few, in order.
export function nextPackages(history, kind, now, forced) {
  const all = loadPackages().filter(x => x.region === REGION[kind]);
  if (forced) {
    const q = forced.trim().toLowerCase();
    const hit = loadPackages().find(x => [x.name.toLowerCase(), x.page, x.page.replace('-tour-package.html', '')].includes(q));
    if (!hit) throw new Error(`No package called "${forced}". Options: ${loadPackages().map(x => x.name).join('; ')}`);
    return [hit];
  }
  const posts = history.filter(h => h.package && !h.skipped);
  const since = new Date(now - 30 * 86400e3).toISOString().slice(0, 10), month = now.getMonth() + 1;
  const resting = new Set(history.filter(h => h.skipped && h.date >= since).map(h => h.package));
  const byPage = new Map(all.map(x => [x.page, x.group]));
  const christmas = x => /christmas/i.test(x.name), inSeason = month === 11 || (month === 12 && now.getDate() <= 15);
  const key = x => [posts.filter(h => h.package === x.page).length, christmas(x) ? 0 : 1, posts.findLastIndex(h => byPage.get(h.package) === x.group)];
  return all.map((x, i) => ({ x, k: [...key(x), i] }))
    .filter(({ x }) => !resting.has(x.page) && (inSeason || !christmas(x)))
    .sort((a, b) => a.k.map((v, i) => v - b.k[i]).find(Boolean) || 0).map(o => o.x).slice(0, 4);
}

// The page's visible text, without menus, our contact buttons or the other packages at the bottom.
export function pageText(page) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  return main.split(/<span class="eyebrow">You may also like/)[0].replace(/<(script|style|button|aside)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<\/(p|li|h\d|div|summary|tr|section|article)>/g, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

export const packageBrief = (x, kind, now) => `STATUS: READY (our own package; every fact is from its page on our website)
TODAY: ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long' })}
KIND: ${kind}
TOPIC: ${x.name}, ${x.nights}
OUR PRICE: from ${x.price} per person (see the page for what that depends on)
THE PAGE:
${pageText(x.page)}`;

export const PACKAGE_GUIDE = `If the brief says it is our own package, its facts come from our website and are confirmed; there are no web sources (sources is empty). Promote this package:
- Use only what the page says. Never add hotels, inclusions, sights, dates or prices that are not there, and do not name individual hotels, suppliers or tour operators.
- Give the starting price in the Facebook, Instagram and X posts and the YouTube description, exactly as in OUR PRICE, with "from" and "per person". Say what it depends on: "on twin sharing" if the page says so. If the page has a price by group size, always give the group size with every price (the lowest price is for the largest group). If prices differ by departure date, give the date with the price. Say euro prices are for the land tour only. Do not convert currencies and write amounts the way the page does.
- Say the price is subject to availability and that GST (and TCS abroad) is extra.
- Describe the route and highlights from the day-by-day plan. Call the plan an outline if the page does.
- Facebook, Instagram and the YouTube description may be up to 180 words here, and must include the day-by-day plan, one short line a day ("Day 1: Arrive Kochi, drive to Munnar"); for trips over 8 days, group the days. The Reel tells viewers the full plan is in the caption. Also give 2-4 main inclusions.
- The card: a 2-4 word kicker, the destination and length in the headline, and a subline that gives the price, such as "From ${'₹'}16,575 per person on twin sharing".
- If the page's departure dates or validity have all passed, the date OUR PRICE is for has passed, or the season it is for is over, set ready to false. Never mention dates that have passed.
- End by inviting readers to WhatsApp us for a quote. We plan and book the trip; we do not book the travel to the starting point.`;

const amounts = t => [...String(t).matchAll(/(?:₹|€|\bRs\.?|\bINR|\bEUR)\s*([\d,]+(?:\.\d+)?)(\s*(?:lakh|lac|k\b))?/gi)];
const plain = n => n.replace(/[,\s]/g, '').replace(/\.0+$/, '');

// What is wrong with a package post, as a list of problems (empty if it is fine).
export function checkPost(post, x) {
  const allowed = new Set(amounts(pageText(x.page)).map(m => m[0][0] + plain(m[1])));
  const bySize = pageText(x.page).includes('Price by group size'), days = +x.nights.match(/(\d+)D/)[1];
  const problems = [], texts = { card: Object.values(post.card).join(' '), facebook: post.facebook, instagram: post.instagram, x: post.x, youtube: `${post.youtube.title} ${post.youtube.description}` };
  for (const [where, text] of Object.entries(texts)) {
    for (const m of amounts(text)) if (m[2] || !allowed.has(m[0][0] + plain(m[1]))) problems.push(`${where}: "${m[0].trim()}" is not a price on the page (write prices exactly as the page does)`);
    if (!amounts(text).some(m => m[0][0] + plain(m[1]) === x.price[0] + plain(x.price.slice(1)))) problems.push(`${where}: the starting price ${x.price} is missing`);
    if (bySize && !/group|\d+\s*(\+\s*)?(people|travellers|persons|adults)/i.test(text)) problems.push(`${where}: give the group size with the price (the page prices by group size)`);
    const off = text.match(/\b(e-?visas?|visas?|flights?|airfares?|airlines?|insurance)\b/i);
    if (off) problems.push(`${where}: mentions "${off[0]}", which we don't offer`);
    if (/%\s*off|discount|limited (time|seats|offer)|hurry/i.test(text)) problems.push(`${where}: has a discount or urgency claim`);
  }
  const said = post.scenes.map(s => `${s.place} ${s.detail || ''}`).join(' ') + ` ${post.place || ''}`, bad = said.match(/\b(e-?visas?|visas?|flights?|airlines?|insurance)\b/i);
  if (bad) problems.push(`scenes: mentions "${bad[0]}", which we don't offer`);
  for (const s of post.scenes) {
    const m = s.label.match(/^Days? (\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!m || +(m[2] || m[1]) > days) problems.push(`scenes: label "${s.label}" is not a day of this ${days}-day trip`);
  }
  return problems;
}
