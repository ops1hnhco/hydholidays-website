// Services the site currently offers on their own. SERVICES PAUSED: visa assistance, flight booking and
// travel insurance are hidden for now. Packages that include a visa or flights in their price are unchanged.
// To bring them back: set paused to [], delete the [paused] rules at the end of style.css, then run
//   node scripts/build-package-pages.js
// (rebuilds package pages and sitemap.xml). Amplify reads this file too (scripts/pause-pages.js).
module.exports = { paused: ['visa', 'flights', 'insurance'] };
