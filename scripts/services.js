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
// A blog post file (blog/YYYY-MM-DD-slug.html) that is hidden while services are paused.
module.exports.hiddenPost = f => {
  const d = (String(f).match(/(\d{4}-\d{2}-\d{2})-[^/]*\.html$/) || [])[1];
  return Boolean(d && module.exports.paused.length && d < module.exports.postsFrom);
};
