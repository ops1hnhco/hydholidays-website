// Run by the Amplify build (amplify.yml) after the site is copied to site/. While services are paused
// (scripts/services.js), each published visa page, and each blog post from before the pause, is replaced
// with a short page that sends visitors on (packages.html or blog.html) and tells search engines not to
// list it. The originals in the repo are untouched, so un-pausing brings them back on the next deploy.
//   node scripts/pause-pages.js site
const fs = require('fs'), path = require('path');
const { paused, hiddenPost } = require('./services');
const dir = path.resolve(process.argv[2] || 'site');

const stub = (to, title, text) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Hyderabad Holidays Co.</title><meta name="robots" content="noindex">
<link rel="canonical" href="https://www.hydholidays.com/${to}"><meta http-equiv="refresh" content="0;url=/${to}">
</head><body><p>This page is not available right now. <a href="/${to}">${text}</a>.</p></body></html>
`;

const visa = paused.includes('visa') ? fs.readdirSync(dir).filter(f => /^visa(-[a-z]+)?\.html$/.test(f)) : [];
for (const f of visa) fs.writeFileSync(path.join(dir, f), stub('packages.html', 'Holiday packages', 'See our holiday packages'));

const blogDir = path.join(dir, 'blog');
const posts = fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && hiddenPost(f)) : [];
for (const f of posts) fs.writeFileSync(path.join(blogDir, f), stub('blog.html', 'Blog', 'See our latest travel updates'));

console.log(`Paused ${visa.length} visa pages and ${posts.length} blog posts.`);
