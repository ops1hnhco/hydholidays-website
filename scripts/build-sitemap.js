// Rewrites sitemap.xml from the pages on disk: top-level pages (except the legal ones) and blog posts.
// Run by build-package-pages.js and by the daily blog job (marketing/blog.js).
//   node scripts/build-sitemap.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://www.hydholidays.com/';
const skip = /^(credits|disclaimer|privacy|terms|refund|shipping)\.html$/;
const today = new Date().toISOString().slice(0, 10);

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html') && !skip.test(f))
  .sort((a, b) => (b === 'index.html') - (a === 'index.html') || a.localeCompare(b));
const blogDir = path.join(root, 'blog');
const posts = fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).sort().reverse().map(f => 'blog/' + f) : [];

const urls = [...pages, ...posts].map(f => `  <url><loc>${f === 'index.html' ? SITE : SITE + f}</loc><lastmod>${today}</lastmod></url>`);
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Sitemap: ${urls.length} URLs (${posts.length} blog posts).`);
