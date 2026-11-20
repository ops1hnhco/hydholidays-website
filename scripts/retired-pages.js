// Run by the Amplify build (amplify.yml) after the site is copied to site/. Pages we have removed get a
// short page in their place that sends visitors on and tells search engines not to list it, so old links
// and search results don't end on an error page.
//   node scripts/retired-pages.js site
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || 'site');

const TO = {
  'packages.html': ['visa.html', 'visa-australia.html', 'visa-canada.html', 'visa-malaysia.html', 'visa-schengen.html',
    'visa-singapore.html', 'visa-thailand.html', 'visa-uae.html', 'visa-uk.html', 'visa-usa.html', 'visa-vietnam.html',
    'dubai-tour-package.html', 'bali-tour-package.html', 'vietnam-tour-package.html'],
  'hotels.html': ['flights-hotels.html'],
  'blog.html': ['blog/2026-10-31-china-visa-hyderabad-apply-embassy-new-delhi.html',
    'blog/2026-11-04-mea-advisory-indians-france-italy-protests.html',
    'blog/2026-11-05-digi-yatra-international-trial-hyderabad-airport.html',
    'blog/2026-11-07-mha-id-rules-nepal-bhutan-travel.html',
    'blog/2026-11-10-new-aviation-rules-airfare-transparency-2027.html',
    'blog/2026-11-11-hyderabad-airport-runway-09r-cat-iii-fog.html',
    'blog/2026-11-13-saudi-flight-suspensions-extended-hyderabad.html'],
};
const TEXT = { 'packages.html': 'See our holiday packages', 'hotels.html': 'See our hotel bookings', 'blog.html': 'See our latest travel news' };

const page = to => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hyderabad Holidays Co.</title><meta name="robots" content="noindex">
<link rel="canonical" href="https://www.hydholidays.com/${to}"><meta http-equiv="refresh" content="0;url=/${to}">
</head><body><p>This page has moved. <a href="/${to}">${TEXT[to]}</a>.</p></body></html>
`;

let n = 0;
for (const [to, old] of Object.entries(TO)) for (const f of old) {
  const file = path.join(dir, f);
  if (fs.existsSync(file)) continue; // never overwrite a real page
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(to));
  n++;
}
console.log(`Wrote ${n} redirect pages.`);
