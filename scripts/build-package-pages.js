// Builds one static page per holiday package (e.g. kashmir-tour-package.html) so each trip
// can rank in search and serve as a Google Ads landing page.
// Package names, prices, tags and itineraries come from the P list in app.js; the extra copy
// (intro, best time, visa notes) lives below. Re-run after changing either:
//   node scripts/build-package-pages.js
// It also rewrites sitemap.xml (scripts/build-sitemap.js). Header and footer are copied from packages.html.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://www.hydholidays.com/';

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const P = Function('return ' + app.match(/const P=(\[[\s\S]*?\]);/)[1])();
// Same optional fields as app.js: s = page name, img = photo in images/ (false = no photo, gradient only).
const slug = x => (x.s || x.n.toLowerCase()) + '-tour-package.html';
const imgPath = x => x.img === false ? null : `images/${x.img || x.n.toLowerCase()}.jpg`;
const photo = x => imgPath(x) ? `url(${imgPath(x)}),` : '';

// Optional per-package overrides in EXTRA: incl / excl (lists replacing the defaults), visaFact
// (the short "Visa" fact), visaName (visa guide link text), dates (departures), indicative (the
// day-by-day plan is an outline, not the supplier's).
const EUROPE = {
  place: 'Europe',
  best: 'December brings Christmas markets and winter scenery; days are short and cold, so pack warm. January is quieter and often cheaper.',
  visa: 'Indians need a Schengen visa; one visa covers every country on this route. We prepare the file and book your VFS appointment. Apply at least 6–8 weeks before travel.',
  visaPage: 'visa-schengen.html', visaName: 'Schengen', visaFact: 'Schengen visa needed', indicative: true,
  excl: ['Flights from Hyderabad (quoted separately)', 'Schengen visa fee and travel insurance (we can arrange both)'],
};
const europeIncl = n => [`${n} nights' hotel stay`, 'Travel between the cities on the route', 'On-ground support during the tour'];

const EXTRA = {
  Kashmir: { title: 'Kashmir tour package from Hyderabad',
    intro: 'Houseboats on Dal Lake, the meadows of Gulmarg and Pahalgam, and a day in Sonamarg, planned as one trip from Hyderabad with a private vehicle throughout.',
    best: 'March to October for gardens and meadows; December to February for snow in Gulmarg.',
    visa: 'No visa or permit is needed for Indian citizens. Carry a government photo ID.' },
  Dubai: { title: 'Dubai tour package from Hyderabad',
    intro: 'The Burj Khalifa, a desert safari with BBQ dinner, a dhow cruise and a day in Abu Dhabi, with your UAE tourist visa filed by our visa desk.',
    best: 'November to March, when days are warm rather than hot.',
    visa: 'Indians need a UAE visa. This package includes the 30-day tourist e-visa.', visaPage: 'visa-uae.html' },
  Kerala: { title: 'Kerala tour package from Hyderabad',
    intro: 'Tea estates in Munnar, spice gardens in Thekkady and a night on an Alleppey houseboat, finishing with Fort Kochi.',
    best: 'September to March. The June–August monsoon is quieter and greener, good for Ayurveda stays.',
    visa: 'No visa needed for Indian citizens.' },
  Bali: { title: 'Bali tour package from Hyderabad',
    intro: 'Rice terraces and temples around Ubud, the Kintamani volcano, an Uluwatu sunset and a day on Nusa Penida, with flights included.',
    best: 'April to October, the dry season.',
    visa: 'Indian passport holders can get an Indonesian visa on arrival or e-VOA. We confirm the current rule and fee before you travel.' },
  Andaman: { title: 'Andaman tour package from Hyderabad',
    intro: 'Port Blair and the Cellular Jail, Radhanagar beach on Havelock, snorkelling at Elephant beach and a day on Neil Island, with inter-island ferries booked for you.',
    best: 'October to May, when the sea is calm for ferries and snorkelling.',
    visa: 'No visa needed for Indian citizens. Carry a government photo ID for ferries and hotels.' },
  Vietnam: { title: 'Vietnam tour package from Hyderabad',
    intro: 'Hanoi’s Old Quarter, an overnight cruise on Ha Long Bay, the Golden Bridge at Ba Na Hills, Hoi An and Ho Chi Minh City, north to south in eight days.',
    best: 'February to April suits the whole north-to-south route.',
    visa: 'Indians need a Vietnam e-visa. This package includes it.', visaPage: 'visa-vietnam.html' },
  Goa: { title: 'Goa tour package from Hyderabad',
    intro: 'A short break covering the beaches and forts of North Goa, the churches of Old Goa and an evening cruise on the Mandovi.',
    best: 'November to February. Monsoon (June–September) is lush but many beach shacks close.',
    visa: 'No visa needed for Indian citizens.' },
  Thailand: { title: 'Thailand tour package from Hyderabad',
    intro: 'Pattaya with a Coral Island speedboat trip and the Alcazar show, then Bangkok’s temples, Safari World and Marine Park.',
    best: 'November to March, the cool and dry season.',
    visa: 'Indians can visit Thailand visa-free for 30 days. Fill in the TDAC arrival card before you land.', visaPage: 'visa-thailand.html' },
  Himachal: { title: 'Shimla Manali tour package from Hyderabad',
    intro: 'Shimla’s Mall Road and Kufri, then Manali with Solang valley, the Atal Tunnel and Sissu, starting and ending at Chandigarh.',
    best: 'March to June for sightseeing; December to February for snow (the Atal Tunnel can close after heavy snowfall).',
    visa: 'No visa needed for Indian citizens.' },
  Singapore: { title: 'Singapore tour package from Hyderabad',
    intro: 'Universal Studios, Sentosa with the cable car and the domes at Gardens by the Bay, plus a city tour and private airport transfers, over four nights.',
    best: 'All year. February to April is usually the driest; November to January is the wetter monsoon season.',
    visa: 'Indians need a Singapore visa, filed through an authorised agent such as us. Fill in the SG Arrival Card before you land.',
    visaPage: 'visa-singapore.html', visaName: 'Singapore', visaFact: 'e-Visa needed', indicative: true,
    incl: ["4 nights' hotel stay with daily breakfast", 'Airport pickup and drop', 'Singapore city tour', 'Universal Studios Singapore tickets with transfers', 'Sentosa with one-way cable car', 'Gardens by the Bay: Flower Dome and Cloud Forest'],
    excl: ['Flights from Hyderabad (quoted separately)', 'Singapore visa fee (we can file it for you)'] },
  'Bali Pool Villa': { place: 'Bali', title: 'Bali pool villa honeymoon package from Hyderabad',
    intro: 'Four nights in a deluxe hotel and two in a private pool villa with a floating breakfast, plus water sports, an ATV ride, the Gates of Heaven, Ubud and the Kecak dance at Uluwatu.',
    best: 'April to October, the dry season.',
    visa: 'Indian passport holders can get an Indonesian visa on arrival or e-VOA. We confirm the current rule and fee before you travel.',
    visaFact: 'On arrival / e-VOA', indicative: true,
    incl: ["4 nights in a deluxe hotel and 2 nights in a private pool villa, daily breakfast", 'One floating breakfast at the villa', 'Jet ski, parasailing and banana boat', 'Tandem ATV ride and Aloha swing', 'Gates of Heaven, Besakih, Tirta Gangga, Ubud, Kintamani, Tegenungan, Uluwatu, GWK and Kecak dance', 'Airport, inter-hotel and sightseeing transfers by private vehicle'],
    excl: ['Flights from Hyderabad (quoted separately)', 'Indonesia visa on arrival fee'] },
  'Europe Highlights': { ...EUROPE, title: 'Europe tour package from Hyderabad: Paris to Budapest',
    intro: 'Paris, Munich, Salzburg, Ljubljana and Budapest in eight days, a winter route through five countries with travel between the cities arranged for you.',
    dates: '16–23 Dec 2026 from ₹86,499; 10–17 Jan 2027 from ₹91,500 per adult.', incl: europeIncl(7) },
  'Central Europe': { ...EUROPE, title: 'Central Europe tour package from Hyderabad',
    intro: 'Munich, Salzburg, Ljubljana and Budapest in a week: Bavarian beer halls, Mozart’s hometown, Slovenia’s riverside capital and the Danube at Budapest.',
    dates: '13–19 Jan 2027 from ₹1,02,499; 4–10 Dec 2026 from ₹1,09,000 per adult.', incl: europeIncl(6) },
  'Europe Grand Tour': { ...EUROPE, title: 'Europe grand tour package from Hyderabad: Paris, Zurich to Budapest',
    intro: 'Ten days from Paris through Switzerland, Munich, Salzburg and Ljubljana to Budapest, covering six countries on one Schengen visa.',
    dates: '10–19 Jan 2027 from ₹1,19,500; 1–10 Dec 2026 from ₹1,26,000 per adult.', incl: europeIncl(9) },
  'Paris Swiss Italy': { ...EUROPE, title: 'Paris, Switzerland and Italy tour package from Hyderabad',
    intro: 'Paris, Zurich, Milan, Venice and Rome in ten days: the classic first trip to Europe, ending with the Vatican and the Colosseum.',
    dates: '10–19 Dec 2026 from ₹1,65,499; 10–19 Jan 2027 from ₹1,67,000 per adult.', incl: europeIncl(9) },
};

const tpl = fs.readFileSync(path.join(root, 'packages.html'), 'utf8');
const head = tpl.slice(0, tpl.indexOf('<main id="top">'));
const foot = tpl.slice(tpl.indexOf('</main>'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const nights = d => d.match(/(\d+)N/)[1];

const card = x => `<a class="pkg pkg-link" href="${slug(x)}"><div class="art" style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55)),${photo(x)}${x.g}"><span class="code">${x.c}</span><span>${x.d} · ${x.r === 'in' ? 'India' : 'International'}</span></div><div class="body"><h3>${x.n}</h3><div class="foot"><div class="price"><small>from, per person</small><b>₹${x.p}</b></div><span class="more">View trip →</span></div></div></a>`;

for (const x of P) {
  const e = EXTRA[x.n];
  if (!e) throw new Error('Add EXTRA copy for ' + x.n);
  const file = slug(x), url = SITE + file, intl = x.r === 'intl';
  const flights = x.t.includes('Flights'), visaIncl = x.t.some(t => /visa/i.test(t)) && intl;
  const title = `${e.title.replace(/^./, c => c.toUpperCase())} · ${x.d} from ₹${x.p}`;
  const desc = `${x.d} ${x.n} package from Hyderabad from ₹${x.p} per person: ${x.i.slice(0, 3).join(', ').toLowerCase()} and more. Day-by-day itinerary, hotels in writing${flights ? ', flights included' : ', flights from HYD on request'}.`;
  const place = e.place || x.n;
  const faqs = [
    [`How much does a ${x.n} trip from Hyderabad cost?`, `This ${x.d} package starts at ₹${x.p} per person on twin sharing. The final price depends on your dates, hotel category and ${flights ? 'flight availability' : 'whether you add flights from Hyderabad'}; we send a written quote before you pay.`],
    [`Are flights from Hyderabad included?`, flights ? 'Yes, return flights are included in this package. We share the flight timings with your quote.' : 'Not in the starting price. We quote flights from Hyderabad (HYD) separately, so you can see the fare and pick timings.'],
    [`What is the best time to visit ${place}?`, e.best],
    [`Do I need a visa for ${place}?`, e.visa],
    ['Can I change the itinerary?', 'Yes. You can add or drop nights, upgrade hotels, or travel as a private family or group departure. Tell us your dates and we rebuild the plan.'],
  ];
  const related = P.filter(o => o !== x && o.r === x.r).slice(0, 3);

  let h = head
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · Hyderabad Holidays Co.</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:image" content=")[^"]*/, `$1${SITE}${imgPath(x) || 'logo.png'}`)
    .replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">');
  h = h.replace('</head>', [
    ld({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: `${x.n} ${x.d} tour package from Hyderabad`, description: e.intro, url,
      image: SITE + (imgPath(x) || 'logo.png'), touristType: ['Families', 'Couples', 'Groups'],
      itinerary: { '@type': 'ItemList', itemListElement: x.i.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: `Day ${i + 1}: ${d}` })) },
      offers: { '@type': 'Offer', price: x.p.replace(/,/g, ''), priceCurrency: 'INR', url, availability: 'https://schema.org/InStock' },
      provider: { '@type': 'TravelAgency', name: 'Hyderabad Holidays Co.', url: SITE, telephone: '+91-70750-40406' } }),
    ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }),
    ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', SITE], ['Packages', SITE + 'packages.html'], [x.n, url]].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) }),
  ].join('\n') + '\n</head>');

  const wa = 'https://wa.me/917075040406?text=' + encodeURIComponent(`Hello Hyderabad Holidays Co., I'm interested in the ${x.n} ${x.d} package (from ₹${x.p} pp).`);
  const main = `<main id="top">
<div class="pagehead pk-head"><div class="wrap">
  <div>
    <div class="crumb"><a href="./">Home</a> / <a href="packages.html">Packages</a> / ${x.n}</div>
    <span class="eyebrow" style="display:block;margin-top:14px">${x.d} · ${intl ? 'International' : 'India'} · from Hyderabad</span>
    <h1>${esc(e.title.replace(/^./, c => c.toUpperCase()))}</h1>
    <p>${esc(e.intro)}</p>
    <div class="pk-price"><div><small>from, per person</small><b>₹${x.p}</b></div><ul class="pk-tags">${x.t.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px"><button type="button" class="btn" data-enq="${x.n}">Get a free quote</button><a class="btn wa-go" href="${wa}" target="_blank" rel="noopener">WhatsApp us</a></div>
  </div>
  <div class="pk-img" style="background-image:${photo(x)}${x.g}" role="img" aria-label="${x.n}"></div>
</div></div>
<section style="padding-block:40px 0"><div class="wrap">
  <div class="vfacts"><div class="vf"><small>Duration</small><b>${x.d.replace('N/', ' nights / ').replace('D', ' days')}</b></div><div class="vf"><small>Starting price</small><b>₹${x.p} per person</b></div><div class="vf"><small>Best time</small><b>${esc(e.best.split(/[;.]/)[0])}</b></div><div class="vf"><small>${intl ? 'Visa' : 'Flights'}</small><b>${intl ? (e.visaFact || (visaIncl ? 'Included' : x.n === 'Thailand' ? 'Visa-free for Indians' : 'On arrival')) : 'Quoted from HYD'}</b></div></div>
</div></section>
<section><div class="wrap legal-wrap pk-body">
  <article class="prose" style="max-width:none">
    <h2 id="itinerary" style="margin-top:0">Day-by-day itinerary</h2>
    ${e.indicative ? '<p style="color:var(--muted);margin:-4px 0 16px">An outline of the route. The exact day-by-day plan and hotel names are confirmed in your written quote.</p>' : ''}
    <ol class="pk-days">${x.i.map((d, i) => `<li><b>Day ${i + 1}</b><span>${esc(d)}</span></li>`).join('')}</ol>
    <h2>What's included</h2>
    <div class="two">
      <div class="card"><h3 style="margin-top:0">Included</h3><ul class="check">${e.incl ? e.incl.map(i => `<li>${esc(i)}</li>`).join('') : `<li>${nights(x.d)} nights' hotel stay on twin sharing with daily breakfast</li><li>Airport transfers and sightseeing by private vehicle</li><li>Entry tickets listed in the itinerary</li>${flights ? '<li>Return flights</li>' : ''}${visaIncl ? '<li>Tourist visa fee and travel insurance</li>' : ''}`}</ul></div>
      <div class="card"><h3 style="margin-top:0">Not included</h3><ul>${(e.excl || [flights ? 'Visa on arrival fee' : 'Flights from Hyderabad (quoted separately)']).map(i => `<li>${esc(i)}</li>`).join('')}<li>Lunch, dinner and personal expenses</li><li>Optional activities, tips and porterage</li><li>GST${intl ? ' and TCS' : ''} as applicable</li></ul></div>
    </div>
    <h2>Good to know</h2>
    <ul>${e.dates ? `<li><b>Departures:</b> ${esc(e.dates)}</li>` : ''}<li><b>Best time to visit:</b> ${esc(e.best)}</li><li><b>Visa:</b> ${esc(e.visa)}${e.visaPage ? ` See our <a href="${e.visaPage}">${e.visaName || (x.n === 'Dubai' ? 'UAE' : x.n)} visa guide</a>.` : ''}</li><li><b>Customise it:</b> add nights, upgrade hotels or make it a private trip for your family or group.</li></ul>
    <h2>Frequently asked questions</h2>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    <p style="font-size:14px;color:var(--muted);margin-top:24px">Prices are per person on twin sharing and change with travel dates and hotel availability. The final price is the one on your written quote. See <a href="pricing.html">Pricing</a> and <a href="refund.html">Cancellation &amp; Refund</a>.</p>
  </article>
  <aside class="pk-side"><div class="card"><small>${x.n} · ${x.d}</small><b>₹${x.p}</b><span>per person, from</span><button type="button" class="btn" data-enq="${x.n}">Get a free quote</button><a class="btn ghost" href="tel:+917075040406">Call +91 70750 40406</a><p>We reply within one working day.</p></div></aside>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <div class="head"><div><span class="eyebrow">You may also like</span><h2>More ${intl ? 'international' : 'India'} packages</h2></div><a class="btn ghost" href="packages.html">All packages</a></div>
  <div class="pkgs">${related.map(card).join('')}</div>
</div></section>
`;
  const page = h.replace('<a href="packages.html">Packages</a></li>', '<a href="packages.html" aria-current="page">Packages</a></li>') + main + foot;
  fs.writeFileSync(path.join(root, file), page);
}

console.log(`Built ${P.length} package pages.`);
require('./build-sitemap');
