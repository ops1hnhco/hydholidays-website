// Daily travel and visa news blog for www.hydholidays.com.
// Each day Claude researches one recent news item that matters to travellers from Hyderabad
// (visa and entry rules, new flights and routes, airports, advisories), checks it against official
// sources or established news outlets, and writes a short article. The article is saved as
// blog/<date>-<slug>.html, listed on blog.html and added to sitemap.xml; the workflow then commits
// it to main, which publishes the site. It also writes a short WhatsApp Channel update to post by hand
// (WhatsApp has no API for Channel posts).
// Run by .github/workflows/daily-blog.yml. With OFFER set (an offer approved on WhatsApp, see
// whatsapp.js), it writes about that offer instead of researching the news.
//
//   node blog.js --dry-run              research and write, save nothing
//   BRIEF="UAE visa changes" node blog.js   steer today's article
//   node blog.js --index                rebuild blog.html and the sitemap from blog/posts.json only
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { OFFER_GUIDE, offerBrief, readOffer } from './offer.js';

const env = (k, d) => (process.env[k] || d);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const BLOG = path.join(ROOT, 'blog');
const POSTS_FILE = path.join(BLOG, 'posts.json');
const SITE = 'https://www.hydholidays.com/';
const MODEL = env('CLAUDE_MODEL', 'claude-opus-5-5');
const WHATSAPP = '+91 70750 40406';
const CHANNEL = env('WHATSAPP_CHANNEL_URL', ''); // e.g. https://whatsapp.com/channel/...; blank = link to our chat
const DRY_RUN = process.argv.includes('--dry-run');
const CATEGORIES = ['Visa news', 'Flights & airports', 'Destinations', 'Travel advisory', 'Offers'];

const loadPosts = () => (fs.existsSync(POSTS_FILE) ? JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')) : []);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const istDate = d => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const nice = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// Pages an article can point readers to for help (visa guides, packages).
const sitePages = fs.readdirSync(ROOT).filter(f => /^(visa(-[a-z]+)?|[a-z]+-tour-package|packages|flights-hotels)\.html$/.test(f)).sort();
const pageTitle = f => fs.readFileSync(path.join(ROOT, f), 'utf8').match(/<h1>(.*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '') || f;

// ---- Research and writing ----

const ABOUT = `Hyderabad Holidays Co. is a travel agency in KPHB, Hyderabad, India. It plans holidays in India and abroad, books flights and hotels, and helps with visas. Its readers are mostly Indian travellers from Hyderabad, Telangana and Andhra Pradesh. Enquiries: WhatsApp ${WHATSAPP} or ${SITE}.`;

const RESEARCH_SYSTEM = `You research the daily news article for the Hyderabad Holidays Co. blog. ${ABOUT}

The article is published on the website without anyone checking it first, so accuracy matters more than anything.

Choosing:
- One recent news item (ideally from the last 7 days, never older than 3 weeks) that matters to Indian travellers, especially from Hyderabad: visa and entry rule changes, new fees or arrival cards, new flights or routes from Hyderabad (HYD), airport changes, travel advisories, destination openings or closures.
- Do not repeat a story already covered in the recent articles you are given, unless there is a genuinely new development.

Researching:
- Use web search to find candidates, then open the pages with web fetch and read them. A headline or snippet alone does not confirm anything.
- Prefer official sources (governments, embassies, VFS, airlines, airports, tourism boards) and established news outlets. Use at least two sources when you can.
- Do not state anything as fact unless a page you read supports it. Leave out what you could not confirm.
- If a story cannot be confirmed, choose a different one that can.

Finish with a brief for the writer:
STATUS: READY if every fact below is confirmed from a page you read; otherwise NOT READY, with the reason
TOPIC: a few words
ANGLE: why this matters to travellers from Hyderabad now
FACTS: the confirmed facts, each with its source URL and the date the source was published
CAUTIONS: anything readers must check themselves`;

const WRITE_SYSTEM = `You write the daily news article for the Hyderabad Holidays Co. blog. ${ABOUT}

You get a researched brief. If it is not marked READY, or a fact you need is unconfirmed, set ready to false; nothing will be published. Use only the facts in the brief. Never add prices, offers or claims of your own, and never imply a visa is guaranteed. Where rules change often, tell readers to check the latest before travelling.

Article:
- title: at most 70 characters, specific and plain (what changed, for whom). No clickbait, no ALL CAPS.
- description: at most 155 characters, for search results.
- summary: 2 sentences: what happened and what it means for travellers from Hyderabad.
- sections: 2-4 sections with short headings; 350-600 words in total; plain Indian English; short paragraphs. Bullets only where they help (lists of documents, dates, fees). Do not repeat the summary.
- what_to_do: 2-4 practical steps for the reader.
- sources: the source pages used, with a short title for each.
- related: the one page on our website most useful to a reader of this article.
- channel_message: an update for our WhatsApp Channel, at most 450 characters, starting with one emoji and a short hook line, then the key point in 1-2 sentences. Do not include a link; it is added after your text.

${OFFER_GUIDE} For an offer, the category is Offers, sources is empty, the sections cover the trip, what is included, the dates and who it suits, and what_to_do explains how to book with us.`;

const Article = pages => z.object({
  ready: z.boolean().describe('true only if the brief is READY and every fact in the article is confirmed in it'),
  topic: z.string().describe('What the article is about, in a few words'),
  category: z.enum(CATEGORIES),
  title: z.string(),
  slug: z.string().describe('3-7 lowercase words joined by hyphens, from the title'),
  description: z.string(),
  summary: z.string(),
  sections: z.array(z.object({ heading: z.string(), paragraphs: z.array(z.string()), bullets: z.array(z.string()) })),
  what_to_do: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  related: z.enum(pages),
  channel_message: z.string(),
});

const textOf = msg => msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

function checkStop(res, step) {
  if (res.stop_reason === 'refusal') throw new Error(`Claude declined the ${step} step: ${res.stop_details?.explanation || 'no reason given'}`);
  if (res.stop_reason === 'max_tokens') throw new Error(`Claude ran out of tokens in the ${step} step`);
}

async function research(client, now, posts) {
  const recent = posts.slice(0, 30).map(p => `- ${p.date}: ${p.topic}`).join('\n') || '- none yet, this is the first article';
  const brief = env('BRIEF');
  const messages = [{
    role: 'user',
    content: `Today is ${now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })}.

Recent articles, newest first:
${recent}
${brief ? `\nThe owner's brief for today, which takes priority: ${brief}\n` : ''}
Choose and research today's article.`,
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
    output_config: { effort: 'medium', format: betaZodOutputFormat(Article(sitePages)) },
    system: WRITE_SYSTEM,
    messages: [{ role: 'user', content: `Brief:\n\n${brief}\n\nPages on our website you can choose for "related":\n${sitePages.map(f => `- ${f}: ${pageTitle(f)}`).join('\n')}` }],
  });
  checkStop(res, 'writing');
  if (!res.parsed_output) throw new Error(`Claude returned no article (stop reason: ${res.stop_reason})`);
  return res.parsed_output;
}

// ---- Pages ----

// Header and footer come from packages.html. Posts live in blog/, so they get <base href="/">.
const tpl = fs.readFileSync(path.join(ROOT, 'packages.html'), 'utf8');
const TOP = tpl.slice(0, tpl.indexOf('<main id="top">'));
const FOOT = tpl.slice(tpl.indexOf('</main>'));

function shell({ title, description, url, image, ld = [], inBlogDir }) {
  let h = TOP
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:image" content=")[^"]*/, `$1${image || SITE + 'logo.png'}`)
    .replace(/<meta property="og:type" content="website">/, inBlogDir ? '<meta property="og:type" content="article">' : '$&')
    .replace(' aria-current="page"', '')
    .replace('<a href="blog.html">', '<a href="blog.html" aria-current="page">');
  if (inBlogDir) h = h.replace('<head>', '<head><base href="/">');
  return h.replace('</head>', ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n') + '\n</head>');
}

const followLink = CHANNEL || `https://wa.me/917075040406?text=${encodeURIComponent('Hello Hyderabad Holidays Co., please add me to your travel updates.')}`;
const followCard = `<div class="cta-card"><div><h3>Travel updates on WhatsApp</h3><p>Visa rule changes, new flights from Hyderabad and our latest offers, a few times a week.</p></div><div class="ctas"><a class="btn wa-go" href="${followLink}" target="_blank" rel="noopener">${CHANNEL ? 'Follow our WhatsApp Channel' : 'Get updates on WhatsApp'}</a></div></div>`;

function renderPost(a, date) {
  const file = `blog/${date}-${a.slug}.html`, url = SITE + file;
  const body = a.sections.map(s => `<h2>${esc(s.heading)}</h2>${s.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}${s.bullets.length ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}`).join('\n    ');
  const ld = [
    { '@context': 'https://schema.org', '@type': a.category === 'Offers' ? 'Article' : 'NewsArticle', headline: a.title, description: a.description, datePublished: date, dateModified: date, url,
      author: { '@type': 'Organization', name: 'Hyderabad Holidays Co.', url: SITE }, publisher: { '@type': 'Organization', name: 'Hyderabad Holidays Co.', logo: { '@type': 'ImageObject', url: SITE + 'logo.png' } } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', SITE], ['Blog', SITE + 'blog.html'], [a.title, url]].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) },
  ];
  const html = shell({ title: `${a.title} · Hyderabad Holidays Co.`, description: a.description, url, ld, inBlogDir: true }) + `<main id="top"><div class="pagehead"><div class="wrap"><div class="crumb"><a href="./">Home</a> / <a href="blog.html">Blog</a> / ${esc(a.category)}</div><h1>${esc(a.title)}</h1><p>${esc(a.summary)}</p><p class="meta" style="margin-top:14px">${nice(date)} · ${esc(a.category)}</p></div></div>
<section><div class="wrap"><article class="prose">
    ${body}
    <h2>What to do</h2><ul class="check">${a.what_to_do.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    ${a.sources.length ? `<h2>Sources</h2><ul>${a.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.title)}</a></li>`).join('')}</ul>` : ''}
    <p style="font-size:14px;color:var(--muted)">Rules, fares and schedules change often; check the latest with the official source or with us before you travel. This article is general information, not legal advice.</p>
    <div class="cta-card"><div><h3>Need help with this?</h3><p>Our team in KPHB can check your plan, documents and bookings. We reply within one working day.</p></div><div class="ctas"><a class="btn" href="${a.related}">${esc(pageTitle(a.related))}</a><a class="btn wa-go" href="https://wa.me/917075040406?text=${encodeURIComponent(`Hello Hyderabad Holidays Co., I read "${a.title}" on your blog and need help.`)}" target="_blank" rel="noopener">WhatsApp us</a></div></div>
    ${followCard}
</article></div></section>
` + FOOT;
  return { file, html };
}

function renderIndex(posts) {
  const list = posts.length
    ? `<div class="blog-list">${posts.map(p => `<a class="blog-item" href="${p.file}"><span class="meta">${nice(p.date)} · ${esc(p.category)}</span><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p></a>`).join('')}</div>`
    : '<p class="notice">Our first update is on its way. Check back tomorrow.</p>';
  const html = shell({ title: 'Travel & Visa News for Hyderabad Travellers · Blog · Hyderabad Holidays Co.', description: 'Daily updates on visa rules, new flights from Hyderabad, airports and travel advisories, checked against official sources.', url: SITE + 'blog.html' })
    + `<main id="top"><div class="pagehead"><div class="wrap"><div class="crumb"><a href="./">Home</a> / Blog</div><h1>Travel &amp; visa news</h1><p>Visa rule changes, new flights from Hyderabad, airport updates and travel advisories, checked against official sources and explained for travellers from Hyderabad.</p></div></div>
<section><div class="wrap">${list}<div style="max-width:900px">${followCard}</div></div></section>
` + FOOT;
  fs.writeFileSync(path.join(ROOT, 'blog.html'), html);
}

function rebuildIndex(posts) {
  renderIndex(posts);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-sitemap.js')], { stdio: 'inherit' });
}

// ---- Run ----

const posts = loadPosts();
if (process.argv.includes('--index')) {
  rebuildIndex(posts);
  process.exit(0);
}

const client = new Anthropic();
const now = new Date();
const date = istDate(now);
const offer = readOffer(env('OFFER'));
if (posts.some(p => p.date === date) && !env('BRIEF') && !offer) {
  console.log(`An article for ${date} already exists; nothing to do.`);
  process.exit(0);
}

const brief = offer ? offerBrief(offer) : await research(client, now, posts);
const a = await write(client, brief);
a.slug = a.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'travel-update';
const { file, html } = renderPost(a, date);
const channel = `${a.channel_message.trim()}\n\nRead more: ${SITE}${file}`;

const summary = [
  `## ${a.ready ? '' : 'HELD (facts not confirmed, nothing published): '}${a.title}`,
  `${a.category} · ${SITE}${file}`,
  `### WhatsApp Channel update (copy and post)\n\n\`\`\`\n${channel}\n\`\`\``,
  `### Sources\n${a.sources.map(s => `- [${s.title}](${s.url})`).join('\n')}`,
  `<details><summary>Research brief</summary>\n\n${brief}\n\n</details>\n`,
].join('\n\n');
console.log(summary);
if (env('GITHUB_STEP_SUMMARY')) fs.appendFileSync(env('GITHUB_STEP_SUMMARY'), summary);

if (!a.ready) process.exit(1);
if (DRY_RUN) process.exit(0);

fs.mkdirSync(BLOG, { recursive: true });
fs.writeFileSync(path.join(ROOT, file), html);
posts.unshift({ date, file, title: a.title, description: a.description, category: a.category, topic: a.topic, sources: a.sources.map(s => s.url) });
fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + '\n');
rebuildIndex(posts);
console.log(`Published ${file}`);
