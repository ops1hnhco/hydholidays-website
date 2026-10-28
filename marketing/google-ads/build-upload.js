// Builds google-ads-upload.csv (Google Ads Editor format) for Tools → Bulk actions → Uploads,
// from the campaigns in ../google-ads-plan.md. Every campaign and ad group is created PAUSED.
// Locations, ad schedule, call/lead form assets are set in the Google Ads screens afterwards.
//
//   node build-upload.js        writes google-ads-upload.csv, fails if any ad text is too long
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://www.hydholidays.com';
const BRAND = ['Hyderabad Holidays Co.', 'Travel Agent in KPHB', 'Get a Quote on WhatsApp', 'Talk to a Real Person'];

// Phrase and exact match for each keyword.
const kw = list => list.flatMap(k => [[k, 'Phrase'], [k, 'Exact']]);

const NEGATIVES = ['free', 'jobs', 'job', 'salary', 'career', 'course', 'pdf', 'form', 'status', 'appointment', 'slot',
  'embassy', 'consulate', 'vfs', 'passport', 'rejected', 'work visa', 'pr', 'immigration', 'h1b', 'b1', 'b2', 'student',
  'irctc', 'ksrtc', 'kstdc', 'ts tourism', 'tsrtc', 'ramoji', 'train', 'bus', 'makemytrip', 'make my trip', 'thomas cook',
  'veena world', 'sotc', 'yatra', 'website', 'app', 'cheap', 'meaning', 'wikipedia', 'wallpaper', 'photos', 'map', 'weather'];

// Ad groups: [name, max CPC ₹, landing page, keywords, headlines (≤30), descriptions (≤90), path1, path2]
const pkg = (place, nights, highlights, extra = []) => ({
  headlines: [`${place} Tour from Hyderabad`, `${nights} ${place} Package`, ...highlights, 'Customised to Your Dates',
    'Family & Honeymoon Trips', 'Add Flights from Hyderabad', ...extra, ...BRAND],
  descriptions: [
    `Plan ${place} with a Hyderabad travel agent: hotels, transfers and sightseeing.`,
    'Every trip customised: add nights, upgrade hotels, include flights. Ask for a quote today.',
    'Based in KPHB, Kukatpally. Talk to a real person on call or WhatsApp, 7 days a week.',
  ],
});

const CAMPAIGNS = [
  {
    name: 'Search | Domestic packages', budget: 450,
    groups: [
      { name: 'Kerala', cpc: 35, url: '/packages.html', path: ['packages', 'kerala'],
        keywords: kw(['kerala tour package', 'kerala tour package from hyderabad', 'munnar alleppey package', 'kerala honeymoon package']),
        ...pkg('Kerala', '5N/6D', ['Munnar, Thekkady & Alleppey', 'Alleppey Houseboat Stay']) },
      { name: 'Kashmir', cpc: 40, url: '/packages.html', path: ['packages', 'kashmir'],
        keywords: kw(['kashmir tour package', 'kashmir tour package from hyderabad', 'kashmir package', 'srinagar gulmarg package']),
        ...pkg('Kashmir', '6N/7D', ['Gulmarg, Pahalgam & Sonamarg', 'Dal Lake Shikara Ride']) },
      { name: 'Goa', cpc: 30, url: '/packages.html', path: ['packages', 'goa'],
        keywords: kw(['goa tour package from hyderabad', 'goa package from hyderabad', 'goa trip package']),
        ...pkg('Goa', '3N/4D', ['North & South Goa Tours', 'Mandovi Cruise Dinner']) },
      { name: 'Andaman', cpc: 35, url: '/packages.html', path: ['packages', 'andaman'],
        keywords: kw(['andaman tour package', 'andaman tour package from hyderabad', 'andaman package']),
        ...pkg('Andaman', '5N/6D', ['Havelock & Neil Island', 'Ferries Included']) },
      { name: 'Himachal', cpc: 35, url: '/packages.html', path: ['packages', 'himachal'],
        keywords: kw(['himachal tour package', 'manali tour package from hyderabad', 'shimla manali package']),
        ...pkg('Himachal', '6N/7D', ['Shimla, Manali & Solang', 'Atal Tunnel & Sissu']) },
      { name: 'General domestic', cpc: 25, url: '/packages.html', path: ['packages'],
        keywords: kw(['tour packages from hyderabad', 'holiday packages from hyderabad', 'honeymoon packages from hyderabad', 'family tour packages from hyderabad']),
        headlines: ['Tour Packages from Hyderabad', 'Holiday Packages Hyderabad', 'Kerala, Kashmir, Goa & More', 'Andaman & Himachal Trips',
          'Customised to Your Dates', 'Family & Honeymoon Trips', 'Add Flights from Hyderabad', ...BRAND],
        descriptions: ['Holiday packages from Hyderabad: Kerala, Kashmir, Goa, Andaman, Himachal and more.',
          'Every trip customised: add nights, upgrade hotels, include flights. Ask for a quote today.',
          'Based in KPHB, Kukatpally. Talk to a real person on call or WhatsApp, 7 days a week.'] },
    ],
  },
  {
    name: 'Search | International packages', budget: 400,
    groups: [
      { name: 'Dubai', cpc: 40, url: '/packages.html', path: ['packages', 'dubai'],
        keywords: kw(['dubai tour package', 'dubai tour package from hyderabad', 'dubai package from hyderabad']),
        ...pkg('Dubai', '5N/6D', ['Desert Safari & Burj Khalifa', 'Hotels & Transfers Arranged', 'Abu Dhabi Day Trip']) },
      { name: 'Thailand', cpc: 40, url: '/packages.html', path: ['packages', 'thailand'],
        keywords: kw(['thailand tour package', 'thailand tour package from hyderabad', 'bangkok pattaya package']),
        ...pkg('Thailand', '5N/6D', ['Bangkok, Pattaya & Coral Isle', 'Safari World & City Tour']) },
      { name: 'Vietnam', cpc: 35, url: '/packages.html', path: ['packages', 'vietnam'],
        keywords: kw(['vietnam tour package', 'vietnam package from hyderabad', 'hanoi tour package']),
        ...pkg('Vietnam', '7N/8D', ['Hanoi & Ha Long Bay Cruise', 'Hoi An & Golden Bridge']) },
      { name: 'Bali', cpc: 40, url: '/packages.html', path: ['packages', 'bali'],
        keywords: kw(['bali tour package', 'bali package from hyderabad', 'bali honeymoon package']),
        ...pkg('Bali', '6N/7D', ['Ubud & Nusa Penida', 'Uluwatu Sunset']) },
      { name: 'General international', cpc: 30, url: '/packages.html', path: ['packages'],
        keywords: kw(['international tour packages from hyderabad', 'foreign tour packages from hyderabad']),
        headlines: ['International Tour Packages', 'Foreign Trips from Hyderabad', 'Dubai, Thailand, Bali, Vietnam', 'Hotels & Transfers Arranged',
          'Customised to Your Dates', 'Family & Honeymoon Trips', 'Add Flights from Hyderabad', ...BRAND],
        descriptions: ['International holidays from Hyderabad: Dubai, Thailand, Bali, Vietnam and more.',
          'We arrange hotels, transfers and sightseeing. Add flights from Hyderabad. Get a quote.',
          'Based in KPHB, Kukatpally. Talk to a real person on call or WhatsApp, 7 days a week.'] },
    ],
  },
  // Visa services campaign removed (26 Oct 2026): Google disapproved the visa ads under its
  // Government documents and services policy (certificate required since 5 Oct 2026).
  {
    name: 'Search | Travel agent Hyderabad', budget: 150,
    groups: [
      { name: 'Travel agent', cpc: 30, url: '/', path: ['travel-agent'],
        keywords: kw(['travel agents in hyderabad', 'tours and travels in hyderabad', 'travel agency near me', 'travel agents near me',
          'travel agents in kukatpally', 'travel agency in kphb', 'travel agents in miyapur']),
        headlines: ['Travel Agent in KPHB', 'Tours & Travels Hyderabad', 'Holidays, Flights, Hotels', 'Domestic & International',
          'Customised Holiday Packages', 'Family & Honeymoon Trips', 'Visit Us in Kukatpally', 'Hyderabad Holidays Co.',
          'Get a Quote on WhatsApp', 'Talk to a Real Person'],
        descriptions: ['Your local travel agent in KPHB, Kukatpally: holiday packages, flights and hotels.',
          'Domestic and international packages, customised to your dates. Ask for a quote today.',
          'Talk to a real person on call or WhatsApp, 7 days a week.'] },
    ],
  },
];

// ---- Checks ----

const problems = [];
for (const c of CAMPAIGNS) for (const g of c.groups) {
  g.headlines = [...new Set(g.headlines)].slice(0, 15);
  for (const h of g.headlines) if ([...h].length > 30) problems.push(`${c.name} / ${g.name}: headline ${[...h].length} chars: ${h}`);
  for (const d of g.descriptions.slice(0, 4)) if ([...d].length > 90) problems.push(`${c.name} / ${g.name}: description ${[...d].length} chars: ${d}`);
  for (const p of g.path) if (p.length > 15) problems.push(`${c.name} / ${g.name}: path too long: ${p}`);
  if (g.headlines.length < 3 || g.descriptions.length < 2) problems.push(`${c.name} / ${g.name}: needs ≥3 headlines and ≥2 descriptions`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- CSV ----

const HEAD = ['Campaign', 'Campaign Type', 'Networks', 'Budget', 'Budget type', 'Bid Strategy Type', 'Campaign Status', 'Languages', 'EU political ads',
  'Ad Group', 'Max CPC', 'Ad Group Status', 'Keyword', 'Criterion Type', 'Status', 'Ad type', 'Final URL', 'Path 1', 'Path 2',
  ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`), ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`)];
const rows = [];
const row = cells => rows.push(HEAD.map(h => cells[h] ?? ''));

for (const c of CAMPAIGNS) {
  row({ Campaign: c.name, 'Campaign Type': 'Search', Networks: 'Google search', Budget: c.budget, 'Budget type': 'Daily',
    'Bid Strategy Type': 'Manual CPC', 'Campaign Status': 'Paused', Languages: 'en', 'EU political ads': 'No' });
  // Negative keywords go in a shared list in Google Ads (Tools → Shared library → Negative keyword lists).
  for (const g of c.groups) {
    row({ Campaign: c.name, 'Ad Group': g.name, 'Max CPC': g.cpc, 'Ad Group Status': 'Paused' });
    for (const [k, m] of g.keywords) row({ Campaign: c.name, 'Ad Group': g.name, Keyword: k, 'Criterion Type': m, Status: 'Enabled' });
    const ad = { Campaign: c.name, 'Ad Group': g.name, 'Ad type': 'Responsive search ad', Status: 'Enabled', 'Final URL': SITE + g.url,
      'Path 1': g.path[0] || '', 'Path 2': g.path[1] || '' };
    g.headlines.forEach((h, i) => { ad[`Headline ${i + 1}`] = h; });
    g.descriptions.slice(0, 4).forEach((d, i) => { ad[`Description ${i + 1}`] = d; });
    row(ad);
  }
}

const csv = [HEAD, ...rows].map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\r\n');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'google-ads-upload.csv');
fs.writeFileSync(out, csv);
const n = CAMPAIGNS.reduce((a, c) => ({ groups: a.groups + c.groups.length, keywords: a.keywords + c.groups.reduce((s, g) => s + g.keywords.length, 0) }), { groups: 0, keywords: 0 });
console.log(`Wrote ${out}: ${CAMPAIGNS.length} campaigns, ${n.groups} ad groups, ${n.keywords} keywords, ${NEGATIVES.length} negatives per campaign, ${rows.length} rows`);
