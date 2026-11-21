(function(){
  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
  const m=$('#menu'), n=$('#nav');
  if(m&&n) m.addEventListener('click',()=>{const o=n.classList.toggle('open');m.setAttribute('aria-expanded',o)});

  const P=[
   {r:"in",n:"Kashmir",grp:"Kashmir",c:"SXR",d:"6N/7D",p:"16,900",t:["Gulmarg","Pahalgam","Shikara"],g:"linear-gradient(160deg,#5b8db8,#203a55)",i:["Arrive Srinagar, Dal Lake shikara ride","Gulmarg day trip, Gondola (optional)","Transfer to Pahalgam via saffron fields","Aru & Betaab valleys","Sonamarg day excursion","Srinagar Mughal gardens","Departure from Srinagar"]},
   {r:"in",n:"Kerala Highlights",grp:"Kerala",s:"kerala-4n5d",img:"kerala-munnar",c:"COK",d:"4N/5D",p:"13,770",t:["Munnar","Thekkady","Alleppey houseboat"],g:"linear-gradient(160deg,#4f9a6b,#1d4a35)",i:["Arrive Kochi, drive to Munnar past waterfalls and spice gardens","Munnar: Eravikulam National Park, tea museum, Mattupetty Dam and Echo Point","Drive to Thekkady: spice plantation walk, optional Periyar lake boat ride","Drive to Alleppey, board a private houseboat and cruise the backwaters","Leave the houseboat, drop at Kochi airport or railway station"]},
   {r:"in",n:"Kerala",grp:"Kerala",c:"COK",d:"5N/6D",p:"15,725",t:["Munnar","Alleppey houseboat"],g:"linear-gradient(160deg,#4f9a6b,#1d4a35)",i:["Arrive Kochi, transfer to Munnar","Tea gardens and Eravikulam","Transfer to Thekkady, spice plantation","Alleppey houseboat overnight","Kochi Fort and Marine Drive","Departure from Kochi"]},
   {r:"in",n:"Kerala with Kovalam",grp:"Kerala",s:"kerala-6n7d",img:"kerala-kovalam",c:"TRV",d:"6N/7D",p:"14,875",t:["Munnar","Thekkady","Alleppey houseboat","Kovalam"],g:"linear-gradient(160deg,#3f8fa0,#163f4a)",i:["Arrive Kochi, drive to Munnar past waterfalls and spice gardens","Munnar: Eravikulam National Park, tea museum, Mattupetty Dam and Echo Point","Drive to Thekkady: spice plantation walk, optional Periyar lake boat ride","Drive to Alleppey, board a private houseboat and cruise the backwaters","Drive to Kovalam, evening at Lighthouse beach","Kovalam and Thiruvananthapuram: Padmanabhaswamy temple, Napier Museum, beach time","Drop at Thiruvananthapuram airport or railway station"]},
   {r:"in",n:"Andaman",c:"IXZ",d:"5N/6D",p:"32,800",t:["Havelock","Neil Island","Ferries"],g:"linear-gradient(160deg,#2f8fc0,#0f3f5c)",i:["Arrive Port Blair, Cellular Jail light show","Ferry to Havelock, Radhanagar beach","Elephant beach snorkelling","Ferry to Neil Island","Return to Port Blair","Departure"]},
   {r:"in",n:"Goa Beach Break",grp:"Goa",s:"goa-4n5d",img:"goa-aguada",c:"GOI",d:"4N/5D",p:"10,160",t:["North Goa","Old Goa churches","Beaches"],g:"linear-gradient(160deg,#e08a4c,#7a3a18)",i:["Arrive in Goa, check in near Calangute, evening at Calangute and Baga beaches","North Goa: Fort Aguada, Sinquerim, Anjuna and Vagator beaches, Chapora Fort","Old Goa and Panjim: Basilica of Bom Jesus, Se Cathedral, Mangueshi temple, Dona Paula; optional evening Mandovi river cruise","Optional day trip to Dudhsagar falls and a spice plantation, or a free day for water sports at Baga","Check out and drop at the airport or railway station"]},
   {r:"in",n:"Goa North and South",grp:"Goa",s:"goa-5n6d",img:"goa-palolem",c:"GOI",d:"5N/6D",p:"11,475",t:["North Goa","South Goa","Old Goa churches","Palolem"],g:"linear-gradient(160deg,#e08a4c,#7a3a18)",i:["Arrive in Goa, check in near Calangute, evening at Calangute and Baga beaches","North Goa: Fort Aguada, Sinquerim, Anjuna and Vagator beaches, Chapora Fort","Old Goa and Panjim: Basilica of Bom Jesus, Se Cathedral, Mangueshi temple, Dona Paula; optional evening Mandovi river cruise","South Goa beaches: Colva and Benaulim, Cabo de Rama fort, Palolem","Optional day trip to Dudhsagar falls and a spice plantation, or a free day for water sports at Baga","Check out and drop at the airport or railway station"]},
   {r:"in",n:"Goa Long Stay",grp:"Goa",s:"goa-6n7d",img:"goa-colva",c:"GOI",d:"6N/7D",p:"15,045",t:["3 nights North Goa","3 nights South Goa","Dudhsagar (optional)"],g:"linear-gradient(160deg,#e08a4c,#7a3a18)",i:["Arrive in Goa, check in near Calangute, evening at Calangute and Baga beaches","North Goa: Fort Aguada, Sinquerim, Anjuna and Vagator beaches, Chapora Fort","Old Goa and Panjim: Basilica of Bom Jesus, Se Cathedral, Mangueshi temple, Dona Paula; optional evening Mandovi river cruise","Move to a South Goa hotel near Colva, afternoon at Colva and Benaulim beaches","South Goa: Cabo de Rama fort, Palolem beach, optional boat trip to Butterfly beach","Optional day trip to Dudhsagar falls and a spice plantation, or a free beach day","Check out and drop at the airport or railway station"]},
   {r:"intl",n:"Thailand",c:"BKK",d:"5N/6D",p:"15,900",t:["Pattaya","Bangkok","Coral Island"],g:"linear-gradient(160deg,#c3478a,#55173b)",i:["Arrive Bangkok, transfer to Pattaya","Coral Island speedboat tour","Alcazar show, transfer to Bangkok","Bangkok temple and city tour","Safari World and Marine Park","Departure"]},
   {r:"in",n:"Himachal",c:"IXC",d:"6N/7D",p:"9,600",t:["Shimla","Manali","Solang"],g:"linear-gradient(160deg,#6f7fb3,#272f55)",i:["Arrive Chandigarh, drive to Shimla","Kufri and Mall Road","Drive to Manali via Kullu","Solang valley","Atal Tunnel and Sissu","Manali local sightseeing","Return to Chandigarh, depart"]},
   {r:"in",n:"Kashmir Getaway",grp:"Kashmir",s:"kashmir-4n5d",img:"kashmir-gulmarg",c:"SXR",d:"4N/5D",p:"10,050",t:["Srinagar","Sonamarg","Pahalgam","Gulmarg"],g:"linear-gradient(160deg,#5b8db8,#203a55)",i:["Arrive Srinagar, transfer to hotel, Srinagar local sightseeing","Sonamarg day trip from Srinagar","Drive to Pahalgam, overnight in Pahalgam","Gulmarg day trip, then back to Srinagar for the night","Departure from Srinagar"]},
   {r:"intl",n:"Singapore",c:"SIN",d:"4N/5D",p:"47,499",t:["Universal Studios","Sentosa","Gardens by the Bay"],g:"linear-gradient(160deg,#d94f5c,#5a1a24)",i:["Arrive Singapore, private transfer to hotel","Singapore city tour, evening at Gardens by the Bay (Flower Dome, Cloud Forest)","Universal Studios Singapore","Sentosa Island with one-way cable car","Departure"]},
   {r:"intl",n:"Bali Pool Villa",s:"bali-pool-villa",img:"bali",c:"DPS",d:"6N/7D",p:"33,499",t:["Private pool villa","Floating breakfast","Water sports"],g:"linear-gradient(160deg,#3ca39b,#14504d)",i:["Arrive Bali, private transfer to hotel","Water sports: jet ski, parasailing, banana boat","Tandem ATV ride and Aloha swing","Gates of Heaven, Besakih temple and Tirta Gangga","Ubud, Kintamani volcano view and Tegenungan waterfall; check in to private pool villa","Floating breakfast; Uluwatu temple, GWK and Kecak dance at sunset","Departure"]},
   {r:"intl",n:"Europe Highlights",s:"europe-highlights",img:"europe-highlights",c:"CDG",d:"7N/8D",p:"86,499",t:["Paris","Salzburg","Budapest","Dec & Jan dates"],g:"linear-gradient(160deg,#4b5d9b,#1b2244)",i:["Arrive Paris","Paris sightseeing","Travel to Munich","Salzburg","Ljubljana","Travel to Budapest","Budapest sightseeing","Departure from Budapest"]},
   {r:"intl",n:"Central Europe",s:"central-europe",img:"central-europe",c:"MUC",d:"6N/7D",p:"1,02,499",t:["Munich","Salzburg","Ljubljana","Budapest"],g:"linear-gradient(160deg,#7a5c9e,#2e1f45)",i:["Arrive Munich","Munich sightseeing","Salzburg","Ljubljana","Travel to Budapest","Budapest sightseeing","Departure from Budapest"]},
   {r:"intl",n:"Europe Grand Tour",s:"europe-grand",img:"europe-grand",c:"ZRH",d:"9N/10D",p:"1,19,500",t:["Paris","Zurich","Munich","Budapest"],g:"linear-gradient(160deg,#3f7f9e,#13334a)",i:["Arrive Paris","Paris sightseeing","Travel to Zurich","Zurich and Switzerland","Travel to Munich","Salzburg","Ljubljana","Travel to Budapest","Budapest sightseeing","Departure from Budapest"]},
   {r:"intl",n:"Paris Swiss Italy",s:"paris-swiss-italy",img:"paris-swiss-italy",c:"FCO",d:"9N/10D",p:"1,65,499",t:["Paris","Zurich","Venice","Rome"],g:"linear-gradient(160deg,#b0623e,#4a2213)",i:["Arrive Paris","Paris sightseeing","Travel to Zurich","Zurich and Switzerland","Travel to Milan","Venice","Travel to Rome","Rome sightseeing","Vatican and Rome at leisure","Departure from Rome"]},
   // Europamundo escorted coach tours (2026-27 brochure). cur = price currency (default ₹).
   {r:"intl",n:"Rhine, Amsterdam & Paris",s:"europe-rhine-amsterdam-paris",img:false,c:"FRA",d:"6N/7D",p:"967",cur:"€",t:["Frankfurt","Amsterdam","Brussels","Paris","Escorted coach tour"],g:"linear-gradient(160deg,#4b5d9b,#1b2244)",i:["Arrive Frankfurt, transfer to hotel","Frankfurt to Amsterdam via Rhine cruise and Cologne","Amsterdam: guided sightseeing","Amsterdam to Paris via Brussels","Paris: guided sightseeing","Paris at leisure, optional excursions","Tour ends in Paris after breakfast"]},
   {r:"intl",n:"Italy & Vienna",s:"europe-italy-vienna",img:false,c:"FCO",d:"7N/8D",p:"1,143",cur:"€",t:["Rome","Florence","Venice","Vienna","Escorted coach tour"],g:"linear-gradient(160deg,#7a5c9e,#2e1f45)",i:["Arrive Rome, transfer to hotel","Rome: guided sightseeing","Rome to Florence","Florence to Venice","Venice to Salzburg via Innsbruck","Salzburg to Vienna via Lake Traunsee","Vienna: guided sightseeing","Tour ends in Vienna after breakfast"]},
   {r:"intl",n:"Prague to Paris",s:"europe-prague-to-paris",img:false,c:"PRG",d:"7N/8D",p:"1,187",cur:"€",t:["Prague","Rhine cruise","Amsterdam","Paris","Escorted coach tour"],g:"linear-gradient(160deg,#3f7f9e,#13334a)",i:["Arrive Prague, transfer to hotel","Prague: guided sightseeing","Prague to Frankfurt via Pilsen and Rothenburg","Frankfurt to Amsterdam via Rhine cruise and Cologne","Amsterdam: guided sightseeing","Amsterdam to Paris via Brussels","Paris: guided sightseeing","Tour ends in Paris after breakfast"]},
   {r:"intl",n:"Paris & Switzerland",s:"europe-paris-switzerland",img:false,c:"CDG",d:"7N/8D",p:"1,353",cur:"€",t:["Paris","Lyon","Geneva","Lucerne","Escorted coach tour"],g:"linear-gradient(160deg,#b0623e,#4a2213)",i:["Arrive Paris, transfer to hotel","Paris: guided sightseeing","Paris at leisure, optional excursions","Paris to Lyon via Burgundy and Beaune","Lyon to Zurich via Geneva","Zurich: guided sightseeing","Day trip from Zurich to Lucerne","Tour ends in Zurich after breakfast"]},
   {r:"intl",n:"Prague, Swiss Alps & Rome",s:"europe-prague-swiss-alps-rome",img:false,c:"PRG",d:"8N/9D",p:"1,359",cur:"€",t:["Prague","Innsbruck","Lucerne","Rome","Escorted coach tour"],g:"linear-gradient(160deg,#4f7a5a,#1c3424)",i:["Arrive Prague, transfer to hotel","Prague: guided sightseeing","Prague to Innsbruck via Munich","Innsbruck to Zurich","Day trip from Zurich to Lucerne","Zurich to Milan via Bellinzona and Como","Milan to Rome via Pisa","Rome: guided sightseeing","Tour ends in Rome after breakfast"]},
   {r:"intl",n:"Amsterdam, Paris & Switzerland",s:"europe-amsterdam-paris-switzerland",img:false,c:"AMS",d:"9N/10D",p:"1,633",cur:"€",t:["Amsterdam","Paris","Geneva","Lucerne","Escorted coach tour"],g:"linear-gradient(160deg,#9e4b5d,#3d1622)",i:["Arrive Amsterdam, transfer to hotel","Amsterdam: guided sightseeing","Amsterdam to Paris via Brussels","Paris: guided sightseeing","Paris at leisure, optional excursions","Paris to Lyon via Burgundy and Beaune","Lyon to Zurich via Geneva","Zurich: guided sightseeing","Day trip from Zurich to Lucerne","Tour ends in Zurich after breakfast"]},
   {r:"intl",n:"Italy & Eastern Europe",s:"europe-italy-eastern-europe",img:false,c:"FCO",d:"11N/12D",p:"1,652",cur:"€",t:["Rome","Venice","Vienna","Budapest","Escorted coach tour"],g:"linear-gradient(160deg,#5d6f8a,#1f2836)",i:["Arrive Rome, transfer to hotel","Rome: guided sightseeing","Rome to Florence","Florence to Venice","Venice to Salzburg via Innsbruck","Salzburg to Vienna via Lake Traunsee","Vienna: guided sightseeing","Vienna to Budapest","Budapest to Prague via Bratislava","Prague: guided sightseeing","Prague to Frankfurt via Pilsen and Rothenburg","Tour ends in Frankfurt after breakfast"]},
   {r:"intl",n:"Italy, Switzerland & Paris",s:"europe-italy-switzerland-paris",img:false,c:"FCO",d:"9N/10D",p:"1,653",cur:"€",t:["Rome","Venice","Lucerne","Paris","Escorted coach tour"],g:"linear-gradient(160deg,#4b5d9b,#1b2244)",i:["Arrive Rome, transfer to hotel","Rome: guided sightseeing","Rome to Florence","Florence to Venice","Venice to Zurich via Innsbruck","Day trip from Zurich to Lucerne","Zurich to Paris via Strasbourg","Paris: guided sightseeing","Paris at leisure, optional excursions","Tour ends in Paris after breakfast"]},
   {r:"intl",n:"Switzerland, Italy & Austria",s:"europe-switzerland-italy-austria",img:false,c:"ZRH",d:"11N/12D",p:"1,852",cur:"€",t:["Lucerne","Milan","Rome","Venice","Escorted coach tour"],g:"linear-gradient(160deg,#7a5c9e,#2e1f45)",i:["Arrive Zurich, transfer to hotel","Zurich: guided sightseeing","Day trip from Zurich to Lucerne","Zurich to Milan via Bellinzona and Como","Milan to Rome via Pisa","Rome: guided sightseeing","Rome to Florence","Florence to Venice","Venice to Salzburg via Innsbruck","Salzburg to Vienna via Lake Traunsee","Vienna: guided sightseeing","Tour ends in Vienna after breakfast"]},
   {r:"intl",n:"London, Paris & Zurich",s:"europe-london-paris-zurich",img:false,c:"LHR",d:"10N/11D",p:"1,888",cur:"€",t:["London","Paris","Geneva","Lucerne","Escorted coach tour"],g:"linear-gradient(160deg,#3f7f9e,#13334a)",i:["Arrive London, transfer to hotel","London: guided sightseeing","London at leisure, optional excursions","London to Paris via Calais and Amiens","Paris: guided sightseeing","Paris at leisure, optional excursions","Paris to Lyon via Burgundy and Beaune","Lyon to Zurich via Geneva","Zurich: guided sightseeing","Day trip from Zurich to Lucerne","Tour ends in Zurich after breakfast"]},
   {r:"intl",n:"Prague to London",s:"europe-prague-to-london",img:false,c:"PRG",d:"10N/11D",p:"1,940",cur:"€",t:["Prague","Munich","Lucerne","Paris","Escorted coach tour"],g:"linear-gradient(160deg,#b0623e,#4a2213)",i:["Arrive Prague, transfer to hotel","Prague: guided sightseeing","Prague to Innsbruck via Munich","Innsbruck to Zurich","Day trip from Zurich to Lucerne","Zurich to Paris via Strasbourg","Paris: guided sightseeing","Paris to Rouen","Rouen to London via English Channel crossing and Canterbury","London: guided sightseeing","Tour ends in London after breakfast"]},
   {r:"intl",n:"Amsterdam, Berlin, Prague & Paris",s:"europe-amsterdam-berlin-prague-paris",img:false,c:"AMS",d:"12N/13D",p:"2,003",cur:"€",t:["Amsterdam","Berlin","Prague","Lucerne","Escorted coach tour"],g:"linear-gradient(160deg,#4f7a5a,#1c3424)",i:["Arrive Amsterdam, transfer to hotel","Amsterdam: guided sightseeing","Amsterdam to Berlin via Hamelin","Berlin: guided sightseeing","Berlin to Prague via Dresden","Prague: guided sightseeing","Prague to Innsbruck via Munich","Innsbruck to Zurich","Day trip from Zurich to Lucerne","Zurich to Paris via Strasbourg","Paris: guided sightseeing","Paris at leisure, optional excursions","Tour ends in Paris after breakfast"]},
   {r:"intl",n:"Spain to Amsterdam",s:"europe-spain-to-amsterdam",img:false,c:"MAD",d:"14N/15D",p:"2,413",cur:"€",t:["Madrid","Barcelona","Lucerne","Paris","Escorted coach tour"],g:"linear-gradient(160deg,#9e4b5d,#3d1622)",i:["Arrive Madrid, transfer to hotel","Madrid: guided sightseeing","Madrid to Barcelona via Zaragoza and Poblet","Barcelona to Girona","Girona to Chambéry via Carrières de Lumières","Chambéry to Leysin via Geneva and Gruyeres","Leysin to Zurich via Interlaken and Lucerne","Zurich to Paris via Strasbourg","Paris: guided sightseeing","Paris to Rouen","Rouen to London via English Channel crossing and Canterbury","London: guided sightseeing","London to Colchester, overnight ferry to the Netherlands","Arrive by ferry, Volendam, then Amsterdam","Tour ends in Amsterdam after breakfast"]},
   {r:"intl",n:"Rome to Berlin",s:"europe-rome-to-berlin",img:false,c:"FCO",d:"15N/16D",p:"2,588",cur:"€",t:["Rome","Venice","Paris","London","Escorted coach tour"],g:"linear-gradient(160deg,#5d6f8a,#1f2836)",i:["Arrive Rome, transfer to hotel","Rome: guided sightseeing","Rome to Florence","Florence to Venice","Venice to Zurich via Innsbruck","Day trip from Zurich to Lucerne","Zurich to Paris via Strasbourg","Paris: guided sightseeing","Paris to Rouen","Rouen to London via English Channel crossing and Canterbury","London: guided sightseeing","London to Colchester, overnight ferry to the Netherlands","Arrive by ferry, Volendam, then Amsterdam","Amsterdam to Berlin via Hamelin","Berlin: guided sightseeing","Tour ends in Berlin after breakfast"]},
   {r:"intl",n:"Danube Christmas River Cruise",s:"danube-christmas-river-cruise",img:false,c:"VIE",d:"4N/5D",p:"969",cur:"€",t:["Vienna","Budapest","Bratislava","Full board","River cruise"],g:"linear-gradient(160deg,#2f6f8f,#102a3a)",i:["Arrive Vienna, transfer to the ship, welcome dinner on board","Vienna at leisure (optional city tour), sail for Budapest in the afternoon","Budapest (optional guided tour), sail for Bratislava","Bratislava (optional guided tour), sail back to Vienna","Disembark in Vienna after breakfast"]}];

  // Optional fields: s = page name (default: name in lower case), img = photo in images/ (default: same; false = no photo).
  const slug=x=>(x.s||x.n.toLowerCase())+'-tour-package.html', photo=x=>x.img===false?'':`url(images/${x.img||x.n.toLowerCase()}.jpg),`;

  // Packages with the same grp (destination) share one card with a duration switch.
  const card=(g,detail,k=0)=>{const x=g[k];return `<article class="pkg"${g.length>1?` data-grp="${x.grp}" data-detail="${detail?1:0}"`:''}><a class="art" href="${slug(x)}" aria-hidden="true" tabindex="-1" style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55)),${photo(x)}${x.g}"><span class="code">${x.c}</span><span>${x.d} · ${x.r==='in'?'India':'International'}</span></a><div class="body"><h3><a href="${slug(x)}">${x.grp||x.n}</a></h3>${g.length>1?`<div class="dur" role="group" aria-label="Choose duration">${g.map((v,j)=>`<button type="button" data-v="${j}" aria-pressed="${j===k}">${v.d}</button>`).join('')}</div>`:''}<ul>${x.t.map(t=>`<li>${t}</li>`).join('')}</ul>${detail?`<details class="itin"><summary>Day-by-day itinerary</summary><ol>${x.i.map(d=>`<li>${d}</li>`).join('')}</ol></details>`:''}<div class="foot"><div class="price"><small>from, per person</small><b>${x.cur||'₹'}${x.p}</b></div><button type="button" class="enq-btn" data-enq="${x.n}">Enquire →</button></div></div></article>`};
  const groups=list=>{const out=[],seen={};list.forEach(x=>{if(!x.grp)return out.push([x]);if(!seen[x.grp])out.push(seen[x.grp]=[]);seen[x.grp].push(x)});return out};
  const fill=(el,list)=>{const d=el.hasAttribute('data-detail'),lim=+el.dataset.limit||99;el.innerHTML=groups(list).slice(0,lim).map(g=>card(g,d)).join('')};
  document.addEventListener('click',e=>{const b=e.target.closest('.dur [data-v]');if(!b)return;const a=b.closest('.pkg');
    const g=P.filter(x=>x.grp===a.dataset.grp);const open=!!a.querySelector('details.itin[open]');
    const t=document.createElement('div');t.innerHTML=card(g,a.dataset.detail==='1',+b.dataset.v);const n=t.firstElementChild;
    if(open){const d=n.querySelector('details.itin');if(d)d.open=true}a.replaceWith(n);n.querySelector('.dur [aria-pressed="true"]').focus()});
  const box=$('#pkgs');
  if(box) fill(box,P);
  // Packages page: a Domestic and an International section, with search results above them
  $$('.pkgs[data-r]').forEach(el=>fill(el,P.filter(x=>x.r===el.dataset.r)));
  const sres=$('#sres');
  if(sres){
    // Search from the home page lands here as packages.html?r=in|intl&q=Kashmir
    const sp=new URLSearchParams(location.search), sr=sp.get('r'), sq=(sp.get('q')||'').trim();
    if(sq){
      const k=sq.toLowerCase().replace(/\(.*?\)/g,' ').split(/[^a-z]+/).filter(w=>w.length>2&&!['and','the','tour','trip'].includes(w));
      const text=x=>[x.n,x.s||'',...x.t,...x.i].join(' ').toLowerCase();
      const hit=x=>k.includes('europe')?(x.r==='intl'&&!/thailand|singapore|bali/i.test(x.n)):k.some(w=>text(x).includes(w));
      const found=P.filter(x=>(sr!=='in'&&sr!=='intl'||x.r===sr)&&hit(x)), place=sq.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
      $('#snote').innerHTML=found.length
        ?`<h2>Search results for ${place}</h2><p>${found.length} package${found.length>1?'s':''} found · <a href="packages.html">Clear search</a></p>`
        :`<h2>Search results for ${place}</h2><div class="card"><p style="margin:0 0 12px"><b>We don’t have a ready package for ${place} yet.</b> We can plan a custom trip with hotels and sightseeing for your dates.</p><button type="button" class="btn" data-enq="${place} holiday">Get a custom quote</button></div>`;
      fill($('#pkgs-res'),found);sres.hidden=false;
      const h=$('.pagehead h1');if(h)h.textContent=`${sq} holiday packages`;
    }
  }

  // Back-to-top arrow: shows after scrolling down
  const top=$('.mbar .totop');
  if(top){const t=()=>top.classList.toggle('show',scrollY>500);addEventListener('scroll',t,{passive:true});t();
    top.addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})})}

  const WA='https://wa.me/917075040406?text=';
  // Floating WhatsApp buttons open with a message naming the page, so the team knows what the visitor was reading.
  const h1=$('h1');
  $$('a.wa').forEach(a=>a.href=WA+encodeURIComponent('Hello Hyderabad Holidays Co., I found you on hydholidays.com'+(h1&&location.pathname.length>1&&!/index\.html$/.test(location.pathname)?' (page: '+h1.textContent.trim()+')':'')+'. I would like some help planning a trip.'));
  // Enquiries are emailed by the /api/enquiry function on Vercel (Zoho Mail SMTP).
  // Absolute URL so the form also works on hydholidays.com, which is hosted on AWS.
  const MAIL_API='https://hydholidays-website.vercel.app/api/enquiry';
  // Google Analytics events, imported into Google Ads as conversions: a sent enquiry
  // (generate_lead) and taps on WhatsApp or phone links.
  const track=(name,params)=>{if(typeof gtag==='function')gtag('event',name,Object.assign({transport_type:'beacon'},params))};
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    if(a.href.indexOf('wa.me/')>-1)track('whatsapp_click',{link_url:a.href.split('?')[0],page_path:location.pathname});
    else if(a.href.indexOf('tel:')===0)track('phone_click',{page_path:location.pathname})});
  const sendMail=data=>fetch(MAIL_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json().then(j=>r.ok&&j.ok===true)).catch(()=>false)
    .then(ok=>{if(ok)track('generate_lead',{form_name:data.service||data.enquiry||'enquiry',page_path:location.pathname});return ok});
  // ---- Enquiry popup ----
  const dlg=document.createElement('dialog');
  dlg.className='enq-dlg';dlg.setAttribute('aria-labelledby','dq-title');
  dlg.innerHTML=`<form id="dq-form" novalidate>
    <div class="dq-head"><div class="dq-art" id="dq-art"></div><div><span class="eyebrow">Package enquiry</span><h2 id="dq-title">Enquire</h2><p id="dq-sub"></p></div>
      <button type="button" class="dq-x" id="dq-close" aria-label="Close">✕</button></div>
    <div class="dq-body" id="dq-fields">
      <input class="hp" id="dq-company" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label>Full name<input id="dq-name" required autocomplete="name" placeholder="Your name"></label>
      <label>Phone / WhatsApp<input id="dq-phone" required inputmode="tel" autocomplete="tel" placeholder="+91 98765 43210"></label>
      <label class="full">Email (optional)<input id="dq-email" type="email" autocomplete="email" placeholder="you@example.com"></label>
      <label class="dq-trip">Travel month<input id="dq-month" type="month" value="2026-12"></label>
      <label class="dq-trip">Travellers<select id="dq-pax"><option>2 adults</option><option>2 adults, 1 child</option><option>2 adults, 2 children</option><option>1 adult</option><option>Group (6+)</option></select></label>
      <label class="full">Anything else?<textarea id="dq-msg" rows="3" placeholder="Hotel category, special requests"></textarea></label>
      <p class="dq-err full" id="dq-err" hidden>Please enter your name and a phone number with at least 10 digits. Check the email address if you added one.</p>
      <button class="btn full" type="submit" id="dq-send">Send enquiry</button>
      <p class="dq-note full">We reply within one working day. Prefer to call? <a href="tel:+917075040406"><b>+91 70750 40406</b></a></p>
    </div>
    <div class="dq-body dq-done" id="dq-done" hidden>
      <div class="full dq-ok" id="dq-ok"><b>Thanks, your enquiry has been sent.</b> We'll reply by email or phone within one working day.</div>
      <div class="full dq-fail" id="dq-fail" hidden><b>We couldn't send your enquiry.</b> Please check your connection and try again, or send it to us on WhatsApp instead.</div>
      <a class="btn ghost full" id="dq-wa" target="_blank" rel="noopener" href="#">Send on WhatsApp instead</a>
      <button type="button" class="btn full" id="dq-back">Close</button>
    </div></form>`;
  document.body.appendChild(dlg);
  const q=id=>dlg.querySelector('#'+id);
  const show=(fields)=>{q('dq-fields').hidden=!fields;q('dq-done').hidden=fields};
  let cur=null,curName='';
  const openEnq=(name,o)=>{o=o||{};cur=o.title?null:(P.find(x=>x.n===name)||null);curName=name||'';
    q('dq-title').textContent=cur?cur.n+' '+cur.d:(curName||'Plan my trip');
    q('dq-sub').textContent=cur?'From '+(cur.cur||'₹')+cur.p+' per person · '+cur.t.join(' · '):'Tell us where you want to go.';
    dlg.querySelector('.dq-head .eyebrow').textContent=cur?'Package enquiry':'Enquiry';
    if(o.title){q('dq-title').textContent=o.title;q('dq-sub').textContent=o.sub||'';dlg.querySelector('.dq-head .eyebrow').textContent=o.eyebrow||'Enquiry'}
    q('dq-msg').value=o.msg||'';
    dlg.querySelectorAll('.dq-trip').forEach(l=>l.hidden=!!o.title);
    q('dq-art').style.backgroundImage=cur?`${photo(cur)}${cur.g}`:'';
    q('dq-art').hidden=!cur;q('dq-err').hidden=true;show(true);
    dlg.showModal();setTimeout(()=>q('dq-name').focus(),30)};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-enq]');if(b){e.preventDefault();openEnq(b.dataset.enq)}});
  {const sp=new URLSearchParams(location.search);if(/^\d{4}-\d{2}$/.test(sp.get('m')||''))q('dq-month').value=sp.get('m');
   const pax=sp.get('pax');if(pax&&[...q('dq-pax').options].some(o=>o.text===pax))q('dq-pax').value=pax;}
  q('dq-close').addEventListener('click',()=>dlg.close());
  q('dq-back').addEventListener('click',()=>{if(q('dq-fail').hidden)dlg.close();else show(true)});
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
  q('dq-form').addEventListener('submit',e=>{e.preventDefault();
    const name=q('dq-name').value.trim(),ph=q('dq-phone').value.replace(/\D/g,'');
    const em=q('dq-email').value.trim();
    if(!name||ph.length<10||(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))){q('dq-err').hidden=false;return}
    const txt=['Hello Hyderabad Holidays Co., I would like a quote.',cur?`Package: ${cur.n} ${cur.d} (from ${cur.cur||'₹'}${cur.p} pp)`:(curName?`Enquiry: ${curName}`:''),`Name: ${name}`,`Phone: ${q('dq-phone').value.trim()}`,...(q('dq-month').closest('label').hidden?[]:[`Travel month: ${q('dq-month').value||'-'}`,`Travellers: ${q('dq-pax').value}`]),q('dq-msg').value.trim()?`Details:\n${q('dq-msg').value.trim()}`:''].filter(Boolean).join('\n');
    q('dq-wa').href=WA+encodeURIComponent(txt);
    const btn=q('dq-send');btn.disabled=true;btn.textContent='Sending…';
    sendMail({subject:'Website enquiry: '+q('dq-title').textContent,name,phone:q('dq-phone').value.trim(),email:em,enquiry:q('dq-title').textContent,summary:q('dq-sub').textContent,
      ...(q('dq-month').closest('label').hidden?{}:{travel_month:q('dq-month').value,travellers:q('dq-pax').value}),details:q('dq-msg').value.trim()||'-',page:location.pathname.split('/').pop()||'index.html',company:q('dq-company').value})
      .then(ok=>{q('dq-ok').hidden=!ok;q('dq-fail').hidden=ok;q('dq-wa').hidden=ok;q('dq-back').textContent=ok?'Close':'Try again';show(false);if(ok)q('dq-form').reset()})
      .finally(()=>{btn.disabled=false;btn.textContent='Send enquiry'})});

  // ---- Search bar: fields change with the selected tab ----
  const qs=$('#qs');
  if(qs){
    const pad=n=>String(n).padStart(2,'0');
    const mon=k=>{const d=new Date();d.setMonth(d.getMonth()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)};
    const opt=a=>a.map(x=>`<option>${x}</option>`).join('');
    const PAX=['2 adults','2 adults, 1 child','2 adults, 2 children','1 adult','Group (6+)'];
    const F={
      d:{label:'Domestic holiday',fields:[
        {id:'from',l:'From',t:'text',v:'Hyderabad (HYD)'},
        {id:'to',l:'Going to',t:'dest',ph:'Type the destination',req:1,o:['Kashmir','Kerala','Goa','Andaman','Himachal (Shimla & Manali)','Sikkim & Darjeeling']},
        {id:'month',l:'Travel month',t:'month',v:mon(2),min:mon(0)},
        {id:'pax',l:'Travellers',t:'select',o:PAX}]},
      i:{label:'International holiday',fields:[
        {id:'from',l:'From',t:'text',v:'Hyderabad (HYD)'},
        {id:'to',l:'Going to',t:'dest',ph:'Type the destination',req:1,o:['Thailand','Singapore','Bali','Europe']},
        {id:'month',l:'Travel month',t:'month',v:mon(2),min:mon(0)},
        {id:'pax',l:'Travellers',t:'select',o:PAX}]}
    };
    let tab='d';
    const box=$('#qs-fields');
    const render=()=>{const cfg=F[tab];qs.style.setProperty('--n',cfg.fields.length);
      box.innerHTML=cfg.fields.map(x=>`<label>${x.l}${x.t==='dest'?`<select id="qs-${tab}-${x.id}" data-ph="${x.ph}"><option value="">Select destination</option>${opt(x.o)}<option value="__other">Other destination…</option></select>`:x.t==='select'?`<select id="qs-${tab}-${x.id}">${opt(x.o)}</select>`:`<input id="qs-${tab}-${x.id}" type="${x.t}"${x.v?` value="${x.v}"`:''}${x.ph?` placeholder="${x.ph}"`:''}${x.min?` min="${x.min}"`:''}>`}</label>`).join('');
      box.querySelectorAll('select[data-ph]').forEach(sel=>sel.addEventListener('change',()=>{if(sel.value!=='__other')return;
        const inp=document.createElement('input');inp.type='text';inp.id=sel.id;inp.placeholder=sel.dataset.ph;sel.replaceWith(inp);inp.focus()}));
    };
    $$('[data-t]').forEach(b=>b.addEventListener('click',()=>{$$('[data-t]').forEach(o=>o.setAttribute('aria-pressed',o===b));tab=b.dataset.t;render()}));
    render();
    const fmt=v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const d=new Date(v+'T00:00');return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}if(/^\d{4}-\d{2}$/.test(v)){const d=new Date(v+'-01T00:00');return d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}return v};
    qs.addEventListener('submit',e=>{e.preventDefault();
      const el=$(`#qs-${tab}-to`), to=el.value.trim();
      if(!to||to==='__other'){el.focus();el.setAttribute('aria-invalid','true');el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>el.removeAttribute('aria-invalid'),{once:true});return}
      const u=new URLSearchParams({r:tab==='d'?'in':'intl',q:to,m:$(`#qs-${tab}-month`).value,pax:$(`#qs-${tab}-pax`).value});
      track('search',{search_term:to,page_path:location.pathname});
      location.href='packages.html?'+u.toString()});
  }

  const f=$('#enq');
  if(f) f.addEventListener('submit',e=>{e.preventDefault();if(!f.reportValidity())return;
    const v=id=>($('#'+id)||{}).value?.trim()||'';
    const txt=['Hello Hyderabad Holidays Co., I have an enquiry.',`Name: ${v('f-name')}`,`Phone: ${v('f-phone')}`,`Service: ${v('f-svc')}`,v('f-dest')?`Destination: ${v('f-dest')}`:'',v('f-msg')?`Details: ${v('f-msg')}`:''].filter(Boolean).join('\n');
    const a=$('#ok-wa');if(a)a.href=WA+encodeURIComponent(txt);
    const btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Sending…';
    sendMail({subject:'Website enquiry: '+v('f-svc')+(v('f-dest')?' – '+v('f-dest'):''),name:v('f-name'),phone:v('f-phone'),email:v('f-email'),service:v('f-svc'),destination:v('f-dest')||'-',details:v('f-msg')||'-',page:'contact.html',company:v('f-company')})
      .then(ok=>{$('#ok').hidden=!ok;$('#fail').hidden=ok;if(ok)f.reset()})
      .finally(()=>{btn.disabled=false;btn.textContent='Send enquiry'})});

  $$('.copy').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.c),t=el.textContent;
    const sel=()=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r)};
    try{navigator.clipboard.writeText(t).then(()=>b.textContent='Copied',sel)}catch(_){sel()}}));
})();
