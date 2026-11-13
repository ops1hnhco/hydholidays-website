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
// While visa or flight services are paused (scripts/services.js), pages say they're not included
// instead of offering to arrange them. Packages with a visa or flights in the price keep them.
const { paused } = require('./services');
const off = s => paused.includes(s);

// Optional per-package overrides in EXTRA: incl / excl (lists replacing the defaults), visaFact
// (the short "Visa" fact), visaName (visa guide link text), dates (departures), indicative (the
// day-by-day plan is an outline, not the supplier's).
const EUROPE = {
  place: 'Europe',
  best: 'December brings Christmas markets and winter scenery; days are short and cold, so pack warm. January is quieter and often cheaper.',
  visa: off('visa')
    ? 'Indians need a Schengen visa; one visa covers every country on this route. The visa is not included in this package. Apply at least 6–8 weeks before travel.'
    : 'Indians need a Schengen visa; one visa covers every country on this route. We prepare the file and book your VFS appointment. Apply at least 6–8 weeks before travel.',
  visaPage: 'visa-schengen.html', visaName: 'Schengen', visaFact: 'Schengen visa needed', indicative: true,
  excl: off('visa')
    ? ['Flights from Hyderabad', 'Schengen visa fee and travel insurance']
    : ['Flights from Hyderabad (quoted separately)', 'Schengen visa fee and travel insurance (we can arrange both)'],
};
const europeIncl = n => [`${n} nights' hotel stay`, 'Travel between the cities on the route', 'On-ground support during the tour'];
// Europamundo escorted coach tours: priced in euros (land only), weekly departures all season.
const EM = { ...EUROPE,
  best: 'April to October for long days and the full sightseeing programme. Winter departures cost less, with Christmas markets in December.' };
const emIncl = n => [`${n} nights' hotel stay`, 'Coach travel between cities with a tour escort', 'Arrival transfer to your hotel', 'Guided city sightseeing as per the itinerary'];

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
    visa: off('visa')
      ? 'Indians need a Singapore visa, filed through an authorised agent; it is not included in this package. Fill in the SG Arrival Card before you land.'
      : 'Indians need a Singapore visa, filed through an authorised agent such as us. Fill in the SG Arrival Card before you land.',
    visaPage: 'visa-singapore.html', visaName: 'Singapore', visaFact: 'e-Visa needed', indicative: true,
    incl: ["4 nights' hotel stay with daily breakfast", 'Airport pickup and drop', 'Singapore city tour', 'Universal Studios Singapore tickets with transfers', 'Sentosa with one-way cable car', 'Gardens by the Bay: Flower Dome and Cloud Forest'],
    excl: off('visa') ? ['Flights from Hyderabad', 'Singapore visa fee'] : ['Flights from Hyderabad (quoted separately)', 'Singapore visa fee (we can file it for you)'] },
  'Bali Pool Villa': { place: 'Bali', title: 'Bali pool villa honeymoon package from Hyderabad',
    intro: 'Four nights in a deluxe hotel and two in a private pool villa with a floating breakfast, plus water sports, an ATV ride, the Gates of Heaven, Ubud and the Kecak dance at Uluwatu.',
    best: 'April to October, the dry season.',
    visa: 'Indian passport holders can get an Indonesian visa on arrival or e-VOA. We confirm the current rule and fee before you travel.',
    visaFact: 'On arrival / e-VOA', indicative: true,
    incl: ["4 nights in a deluxe hotel and 2 nights in a private pool villa, daily breakfast", 'One floating breakfast at the villa', 'Jet ski, parasailing and banana boat', 'Tandem ATV ride and Aloha swing', 'Gates of Heaven, Besakih, Tirta Gangga, Ubud, Kintamani, Tegenungan, Uluwatu, GWK and Kecak dance', 'Airport, inter-hotel and sightseeing transfers by private vehicle'],
    excl: [off('flights') ? 'Flights from Hyderabad' : 'Flights from Hyderabad (quoted separately)', 'Indonesia visa on arrival fee'] },
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

  "Rhine, Amsterdam & Paris": { ...EM, title: "Rhine, Amsterdam & Paris escorted tour: Frankfurt to Paris",
    intro: "A 7-day escorted coach tour from Frankfurt to Paris, taking in Cologne, Amsterdam and Brussels. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Wednesdays from Frankfurt, through the 2026–27 season. Operated by Europamundo as \"From Frankfurt to Paris\"; we confirm open dates and the final price with your quote.", incl: emIncl(6) },
  "Italy & Vienna": { ...EM, title: "Italy & Vienna escorted tour: Rome to Vienna",
    intro: "An 8-day escorted coach tour from Rome to Vienna, taking in Florence, Venice, Innsbruck and Salzburg. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Sundays from Rome, through the 2026–27 season. Operated by Europamundo as \"Classical Symphony\"; we confirm open dates and the final price with your quote.", incl: emIncl(7) },
  "Prague to Paris": { ...EM, title: "Prague to Paris escorted tour: Prague to Paris",
    intro: "An 8-day escorted coach tour from Prague to Paris, taking in Pilsen, Rothenburg, Frankfurt, Cologne, Amsterdam and Brussels. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Mondays from Prague, through the 2026–27 season. Operated by Europamundo as \"From Prague to Paris\"; we confirm open dates and the final price with your quote.", incl: emIncl(7) },
  "Paris & Switzerland": { ...EM, title: "Paris & Switzerland escorted tour: Paris to Zurich",
    intro: "An 8-day escorted coach tour from Paris to Zurich, taking in Burgundy, Beaune, Lyon, Geneva and Lucerne. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Saturdays from Paris, through the 2026–27 season. Operated by Europamundo as \"French and Swiss Spirit\"; we confirm open dates and the final price with your quote.", incl: emIncl(7) },
  "Prague, Swiss Alps & Rome": { ...EM, title: "Prague, Swiss Alps & Rome escorted tour: Prague to Rome",
    intro: "A 9-day escorted coach tour from Prague to Rome, taking in Munich, Innsbruck, Zurich, Lucerne, Bellinzona and Como. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Mondays from Prague, through the 2026–27 season. Operated by Europamundo as \"Majestic Europe\"; we confirm open dates and the final price with your quote.", incl: emIncl(8) },
  "Amsterdam, Paris & Switzerland": { ...EM, title: "Amsterdam, Paris & Switzerland escorted tour: Amsterdam to Zurich",
    intro: "A 10-day escorted coach tour from Amsterdam to Zurich, taking in Brussels, Paris, Burgundy, Beaune, Lyon and Geneva. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Thursdays from Amsterdam, through the 2026–27 season. Operated by Europamundo as \"Desired Europe end Zurich\"; we confirm open dates and the final price with your quote.", incl: emIncl(9) },
  "Italy & Eastern Europe": { ...EM, title: "Italy & Eastern Europe escorted tour: Rome to Frankfurt",
    intro: "A 12-day escorted coach tour from Rome to Frankfurt, taking in Florence, Venice, Innsbruck, Salzburg, Vienna and Budapest. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Sundays from Rome, through the 2026–27 season. Operated by Europamundo as \"A Touch of Europe\"; we confirm open dates and the final price with your quote.", incl: emIncl(11) },
  "Italy, Switzerland & Paris": { ...EM, title: "Italy, Switzerland & Paris escorted tour: Rome to Paris",
    intro: "A 10-day escorted coach tour from Rome to Paris, taking in Florence, Venice, Innsbruck, Zurich, Lucerne and Strasbourg. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Sundays from Rome, through the 2026–27 season. Operated by Europamundo as \"A Time to Remember\"; we confirm open dates and the final price with your quote.", incl: emIncl(9) },
  "Switzerland, Italy & Austria": { ...EM, title: "Switzerland, Italy & Austria escorted tour: Zurich to Vienna",
    intro: "A 12-day escorted coach tour from Zurich to Vienna, taking in Lucerne, Bellinzona, Como, Milan, Pisa and Rome. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Wednesdays from Zurich, through the 2026–27 season. Operated by Europamundo as \"A European Odyssey\"; we confirm open dates and the final price with your quote.", incl: emIncl(11) },
  "London, Paris & Zurich": { ...EM, title: "London, Paris & Zurich escorted tour: London to Zurich",
    intro: "An 11-day escorted coach tour from London to Zurich, taking in Calais, Amiens, Paris, Burgundy, Beaune and Lyon. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Wednesdays from London, through the 2026–27 season. Operated by Europamundo as \"London, Paris and Zurich\"; we confirm open dates and the final price with your quote.", incl: emIncl(10) },
  "Prague to London": { ...EM, title: "Prague to London escorted tour: Prague to London",
    intro: "An 11-day escorted coach tour from Prague to London, taking in Munich, Innsbruck, Zurich, Lucerne, Strasbourg and Paris. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Mondays from Prague, through the 2026–27 season. Operated by Europamundo as \"Great European Cities\"; we confirm open dates and the final price with your quote.", incl: emIncl(10) },
  "Amsterdam, Berlin, Prague & Paris": { ...EM, title: "Amsterdam, Berlin, Prague & Paris escorted tour: Amsterdam to Paris",
    intro: "A 13-day escorted coach tour from Amsterdam to Paris, taking in Hamelin, Berlin, Dresden, Prague, Munich and Innsbruck. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Thursdays from Amsterdam, through the 2026–27 season. Operated by Europamundo as \"From Amsterdam to Paris\"; we confirm open dates and the final price with your quote.", incl: emIncl(12) },
  "Spain to Amsterdam": { ...EM, title: "Spain to Amsterdam escorted tour: Madrid to Amsterdam",
    intro: "A 15-day escorted coach tour from Madrid to Amsterdam, taking in Zaragoza, Poblet, Barcelona, Girona, Chambéry and Geneva. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Saturdays from Madrid, through the 2026–27 season. Operated by Europamundo as \"Essential Europe\"; we confirm open dates and the final price with your quote.", incl: emIncl(14) },
  "Rome to Berlin": { ...EM, title: "Rome to Berlin escorted tour: Rome to Berlin",
    intro: "A 16-day escorted coach tour from Rome to Berlin, taking in Florence, Venice, Innsbruck, Zurich, Lucerne and Strasbourg. Hotels, coach travel and a tour escort are arranged by the operator; we book it for you from Hyderabad.",
    dates: "Starts on Sundays from Rome, through the 2026–27 season. Operated by Europamundo as \"Around Europe\"; we confirm open dates and the final price with your quote.", incl: emIncl(15) },
  'Danube Christmas River Cruise': { ...EM, title: 'Danube Christmas market river cruise: Vienna, Budapest and Bratislava',
    intro: 'Four nights on the Danube aboard the MS Arena, sailing from Vienna to Budapest and Bratislava and back, timed for the Christmas markets. Meals on board are included from the first dinner to the last breakfast.',
    best: 'Late November and December, when the Christmas markets are open.',
    dates: 'Sails from Vienna on Mondays, Wednesdays and Saturdays in the Christmas market season. Operated by Europamundo as "Danube Christmas Markets - Superior - MS ARENA"; we confirm open dates, cabin deck and the final price with your quote.',
    incl: ['4 nights in an outside cabin on the MS Arena', 'Full board from dinner on day 1 to breakfast on day 5', 'Arrival transfer to the ship', 'Port taxes and travel assistance insurance', 'Porterage when boarding and leaving the ship'],
    excl: [off('flights') ? 'Flights from Hyderabad' : 'Flights from Hyderabad (quoted separately)', 'Schengen visa fee', 'Optional guided tours in Vienna, Budapest and Bratislava'] },
};

const tpl = fs.readFileSync(path.join(root, 'packages.html'), 'utf8');
const head = tpl.slice(0, tpl.indexOf('<main id="top">'));
const foot = tpl.slice(tpl.indexOf('</main>'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const money = x => (x.cur || '₹') + x.p;
const nights = d => d.match(/(\d+)N/)[1];

const card = x => `<a class="pkg pkg-link" href="${slug(x)}"><div class="art" style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55)),${photo(x)}${x.g}"><span class="code">${x.c}</span><span>${x.d} · ${x.r === 'in' ? 'India' : 'International'}</span></div><div class="body"><h3>${x.n}</h3><div class="foot"><div class="price"><small>from, per person</small><b>${money(x)}</b></div><span class="more">View trip →</span></div></div></a>`;

for (const x of P) {
  const e = EXTRA[x.n];
  if (!e) throw new Error('Add EXTRA copy for ' + x.n);
  const file = slug(x), url = SITE + file, intl = x.r === 'intl';
  const flights = x.t.includes('Flights'), visaIncl = x.t.some(t => /visa/i.test(t)) && intl;
  const title = `${e.title.replace(/^./, c => c.toUpperCase())} · ${x.d} from ${money(x)}`;
  const noFlights = !flights && off('flights');
  const desc = `${x.d} ${x.n} package from Hyderabad from ${money(x)} per person: ${x.i.slice(0, 3).join(', ').toLowerCase()} and more. Day-by-day itinerary, hotels in writing${flights ? ', flights included' : noFlights ? '' : ', flights from HYD on request'}.`;
  const place = e.place || x.n;
  const faqs = [
    [`How much does a ${x.n} trip from Hyderabad cost?`, `This ${x.d} package starts at ${money(x)} per person on twin sharing. The final price depends on your dates${flights ? ', hotel category and flight availability' : noFlights ? ' and hotel category' : ', hotel category and whether you add flights from Hyderabad'}; we send a written quote before you pay.`],
    [`Are flights from Hyderabad included?`, flights ? 'Yes, return flights are included in this package. We share the flight timings with your quote.' : noFlights ? `No. This is a land package: you book your own flights to ${place}, and everything from arrival is arranged for you.` : 'Not in the starting price. We quote flights from Hyderabad (HYD) separately, so you can see the fare and pick timings.'],
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
      offers: { '@type': 'Offer', price: x.p.replace(/,/g, ''), priceCurrency: x.cur === '€' ? 'EUR' : 'INR', url, availability: 'https://schema.org/InStock' },
      provider: { '@type': 'TravelAgency', name: 'Hyderabad Holidays Co.', url: SITE, telephone: '+91-70750-40406' } }),
    ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }),
    ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', SITE], ['Packages', SITE + 'packages.html'], [x.n, url]].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) }),
  ].join('\n') + '\n</head>');

  const wa = 'https://wa.me/917075040406?text=' + encodeURIComponent(`Hello Hyderabad Holidays Co., I'm interested in the ${x.n} ${x.d} package (from ${money(x)} pp).`);
  const main = `<main id="top">
<div class="pagehead pk-head"><div class="wrap">
  <div>
    <div class="crumb"><a href="./">Home</a> / <a href="packages.html">Packages</a> / ${x.n}</div>
    <span class="eyebrow" style="display:block;margin-top:14px">${x.d} · ${intl ? 'International' : 'India'} · from Hyderabad</span>
    <h1>${esc(e.title.replace(/^./, c => c.toUpperCase()))}</h1>
    <p>${esc(e.intro)}</p>
    <div class="pk-price"><div><small>from, per person</small><b>${money(x)}</b></div><ul class="pk-tags">${x.t.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px"><button type="button" class="btn" data-enq="${x.n}">Get a free quote</button><a class="btn wa-go" href="${wa}" target="_blank" rel="noopener">WhatsApp us</a></div>
  </div>
  <div class="pk-img" style="background-image:${photo(x)}${x.g}" role="img" aria-label="${x.n}"></div>
</div></div>
<section style="padding-block:40px 0"><div class="wrap">
  <div class="vfacts"><div class="vf"><small>Duration</small><b>${x.d.replace('N/', ' nights / ').replace('D', ' days')}</b></div><div class="vf"><small>Starting price</small><b>${money(x)} per person</b></div><div class="vf"><small>Best time</small><b>${esc(e.best.split(/[;.]/)[0])}</b></div><div class="vf"><small>${intl ? 'Visa' : 'Flights'}</small><b>${intl ? (e.visaFact || (visaIncl ? 'Included' : x.n === 'Thailand' ? 'Visa-free for Indians' : 'On arrival')) : noFlights ? 'Not included' : 'Quoted from HYD'}</b></div></div>
</div></section>
<section><div class="wrap legal-wrap pk-body">
  <article class="prose" style="max-width:none">
    <h2 id="itinerary" style="margin-top:0">Day-by-day itinerary</h2>
    ${e.indicative ? '<p style="color:var(--muted);margin:-4px 0 16px">An outline of the route. The exact day-by-day plan and hotel names are confirmed in your written quote.</p>' : ''}
    <ol class="pk-days">${x.i.map((d, i) => `<li><b>Day ${i + 1}</b><span>${esc(d)}</span></li>`).join('')}</ol>
    <h2>What's included</h2>
    <div class="two">
      <div class="card"><h3 style="margin-top:0">Included</h3><ul class="check">${e.incl ? e.incl.map(i => `<li>${esc(i)}</li>`).join('') : `<li>${nights(x.d)} nights' hotel stay on twin sharing with daily breakfast</li><li>Airport transfers and sightseeing by private vehicle</li><li>Entry tickets listed in the itinerary</li>${flights ? '<li>Return flights</li>' : ''}${visaIncl ? '<li>Tourist visa fee and travel insurance</li>' : ''}`}</ul></div>
      <div class="card"><h3 style="margin-top:0">Not included</h3><ul>${(e.excl || [flights ? 'Visa on arrival fee' : noFlights ? 'Flights from Hyderabad' : 'Flights from Hyderabad (quoted separately)']).map(i => `<li>${esc(i)}</li>`).join('')}<li>Lunch, dinner and personal expenses</li><li>Optional activities, tips and porterage</li><li>GST${intl ? ' and TCS' : ''} as applicable</li></ul></div>
    </div>
    <h2>Good to know</h2>
    <ul>${e.dates ? `<li><b>Departures:</b> ${esc(e.dates)}</li>` : ''}<li><b>Best time to visit:</b> ${esc(e.best)}</li><li><b>Visa:</b> ${esc(e.visa)}${e.visaPage && !off('visa') ? ` See our <a href="${e.visaPage}">${e.visaName || (x.n === 'Dubai' ? 'UAE' : x.n)} visa guide</a>.` : ''}</li><li><b>Customise it:</b> add nights, upgrade hotels or make it a private trip for your family or group.</li></ul>
    <h2>Frequently asked questions</h2>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    <p style="font-size:14px;color:var(--muted);margin-top:24px">${x.cur === '€' ? 'Euro prices are for the land tour only. ' : ''}Prices are per person on twin sharing and change with travel dates and hotel availability. The final price is the one on your written quote. See <a href="pricing.html">Pricing</a> and <a href="refund.html">Cancellation &amp; Refund</a>.</p>
  </article>
  <aside class="pk-side"><div class="card"><small>${x.n} · ${x.d}</small><b>${money(x)}</b><span>per person, from</span><button type="button" class="btn" data-enq="${x.n}">Get a free quote</button><a class="btn ghost" href="tel:+917075040406">Call +91 70750 40406</a><p>We reply within one working day.</p></div></aside>
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
