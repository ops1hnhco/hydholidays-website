// Services the site currently offers on their own. SERVICES PAUSED: visa assistance, flight booking and
// travel insurance are hidden for now. Packages that include a visa or flights in their price are unchanged.
// While paused, blog posts dated before postsFrom are hidden too (they are all visa and flight news), and the
// blog and social media agents in marketing/ stop writing about visas and flights.
// To bring them back: set paused to [], delete the [paused] rules at the end of style.css, then run
//   node scripts/build-package-pages.js
//   (cd marketing && node blog.js --index)
// (rebuilds package pages, blog.html and sitemap.xml). Amplify reads this file too (scripts/pause-pages.js).
module.exports = {
  paused: ['visa', 'flights', 'insurance'],
  postsFrom: '2026-11-16',
};
// Packages with a visa or flights in the price (Dubai, Bali, Vietnam: tagged Visa, e-Visa or Flights in
// app.js) can't be described without them, so they are hidden too while visa or flights are paused.
const fs = require('fs'), path = require('path');
const hideWords = () => module.exports.paused.some(s => s === 'visa' || s === 'flights');
module.exports.hideWords = hideWords;
module.exports.bundled = x => x.t.some(t => /visa|flights/i.test(t));
module.exports.loadPackages = root => Function('return ' + fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/const P=(\[[\s\S]*?\]);/)[1])();
module.exports.packageFile = x => (x.s || x.n.toLowerCase()) + '-tour-package.html';
module.exports.hiddenPackages = root => hideWords() ? module.exports.loadPackages(root).filter(module.exports.bundled).map(module.exports.packageFile) : [];
// A blog post file (blog/YYYY-MM-DD-slug.html) that is hidden while services are paused.
module.exports.hiddenPost = f => {
  const d = (String(f).match(/(\d{4}-\d{2}-\d{2})-[^/]*\.html$/) || [])[1];
  return Boolean(d && module.exports.paused.length && d < module.exports.postsFrom);
};
