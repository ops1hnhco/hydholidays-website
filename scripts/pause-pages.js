// Run by the Amplify build (amplify.yml) after the site is copied to site/. While visa services are
// paused (scripts/services.js), each published visa page is replaced with a short page that sends
// visitors to packages.html and tells search engines not to list it. The originals in the repo are
// untouched, so un-pausing brings them back on the next deploy.
//   node scripts/pause-pages.js site
const fs = require('fs'), path = require('path');
const { paused } = require('./services');
const dir = path.resolve(process.argv[2] || 'site');

const stub = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Holiday packages · Hyderabad Holidays Co.</title><meta name="robots" content="noindex">
<link rel="canonical" href="https://www.hydholidays.com/packages.html"><meta http-equiv="refresh" content="0;url=/packages.html">
</head><body><p>This page is not available right now. <a href="/packages.html">See our holiday packages</a>.</p></body></html>
`;

const pages = paused.includes('visa') ? fs.readdirSync(dir).filter(f => /^visa(-[a-z]+)?\.html$/.test(f)) : [];
for (const f of pages) fs.writeFileSync(path.join(dir, f), stub);
console.log(pages.length ? `Paused ${pages.length} visa pages (redirect to packages.html).` : 'No pages paused.');
