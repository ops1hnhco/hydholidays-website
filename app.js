(function(){
  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
  const m=$('#menu'), n=$('#nav');
  if(m&&n) m.addEventListener('click',()=>{const o=n.classList.toggle('open');m.setAttribute('aria-expanded',o)});

  const P=[
   {r:"in",n:"Kashmir",c:"SXR",d:"6N/7D",p:"28,900",t:["Gulmarg","Pahalgam","Shikara"],g:"linear-gradient(160deg,#5b8db8,#203a55)",i:["Arrive Srinagar, Dal Lake shikara ride","Gulmarg day trip, Gondola (optional)","Transfer to Pahalgam via saffron fields","Aru & Betaab valleys","Sonamarg day excursion","Srinagar Mughal gardens","Departure from Srinagar"]},
   {r:"intl",n:"Dubai",c:"DXB",d:"5N/6D",p:"54,500",t:["Visa","Desert safari","Burj Khalifa"],g:"linear-gradient(160deg,#d9a35b,#7a4a1f)",i:["Arrive Dubai, Marina dhow dinner","City tour and Burj Khalifa 124th floor","Desert safari with BBQ dinner","Abu Dhabi day trip","Free day for shopping","Departure"]},
   {r:"in",n:"Kerala",c:"COK",d:"5N/6D",p:"21,400",t:["Munnar","Alleppey houseboat"],g:"linear-gradient(160deg,#4f9a6b,#1d4a35)",i:["Arrive Kochi, transfer to Munnar","Tea gardens and Eravikulam","Transfer to Thekkady, spice plantation","Alleppey houseboat overnight","Kochi Fort and Marine Drive","Departure from Kochi"]},
   {r:"intl",n:"Bali",c:"DPS",d:"6N/7D",p:"62,900",t:["Ubud","Nusa Penida","Flights"],g:"linear-gradient(160deg,#3ca39b,#14504d)",i:["Arrive Bali, transfer to Ubud","Ubud swing, rice terraces, monkey forest","Kintamani volcano view","Transfer to Kuta, Uluwatu sunset","Nusa Penida island tour","Free day at the beach","Departure"]},
   {r:"in",n:"Andaman",c:"IXZ",d:"5N/6D",p:"32,800",t:["Havelock","Neil Island","Ferries"],g:"linear-gradient(160deg,#2f8fc0,#0f3f5c)",i:["Arrive Port Blair, Cellular Jail light show","Ferry to Havelock, Radhanagar beach","Elephant beach snorkelling","Ferry to Neil Island","Return to Port Blair","Departure"]},
   {r:"intl",n:"Vietnam",c:"SGN",d:"7N/8D",p:"68,500",t:["Hanoi","Ha Long Bay","e-Visa"],g:"linear-gradient(160deg,#b5534a,#4e1f1c)",i:["Arrive Hanoi, Old Quarter walk","Hanoi city tour","Ha Long Bay overnight cruise","Return to Hanoi, fly to Da Nang","Ba Na Hills and Golden Bridge","Hoi An ancient town","Fly to Ho Chi Minh City, Cu Chi tunnels","Departure"]},
   {r:"in",n:"Goa",c:"GOI",d:"3N/4D",p:"14,900",t:["North & South Goa","Cruise dinner"],g:"linear-gradient(160deg,#e08a4c,#7a3a18)",i:["Arrive Goa, evening at Baga","North Goa forts and beaches","South Goa churches, Mandovi cruise","Departure"]},
   {r:"intl",n:"Thailand",c:"BKK",d:"5N/6D",p:"39,900",t:["Pattaya","Bangkok","Coral Island"],g:"linear-gradient(160deg,#c3478a,#55173b)",i:["Arrive Bangkok, transfer to Pattaya","Coral Island speedboat tour","Alcazar show, transfer to Bangkok","Bangkok temple and city tour","Safari World and Marine Park","Departure"]},
   {r:"in",n:"Himachal",c:"IXC",d:"6N/7D",p:"24,600",t:["Shimla","Manali","Solang"],g:"linear-gradient(160deg,#6f7fb3,#272f55)",i:["Arrive Chandigarh, drive to Shimla","Kufri and Mall Road","Drive to Manali via Kullu","Solang valley","Atal Tunnel and Sissu","Manali local sightseeing","Return to Chandigarh, depart"]}];

  const box=$('#pkgs');
  if(box){
    const lim=+box.dataset.limit||99, detail=box.hasAttribute('data-detail');
    const draw=f=>{box.innerHTML=P.filter(x=>f==='all'||x.r===f).slice(0,lim).map(x=>`<article class="pkg"><div class="art" style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55)),url(images/${x.n.toLowerCase()}.jpg),${x.g}"><span class="code">${x.c}</span><span>${x.d} · ${x.r==='in'?'India':'International'}</span></div><div class="body"><h3>${x.n}</h3><ul>${x.t.map(t=>`<li>${t}</li>`).join('')}</ul>${detail?`<details class="itin"><summary>Day-by-day itinerary</summary><ol>${x.i.map(d=>`<li>${d}</li>`).join('')}</ol></details>`:''}<div class="foot"><div class="price"><small>from, per person</small><b>₹${x.p}</b></div><button type="button" class="enq-btn" data-enq="${x.n}">Enquire →</button></div></div></article>`).join('')};
    draw('all');
    $$('[data-f]').forEach(b=>b.addEventListener('click',()=>{$$('[data-f]').forEach(o=>o.setAttribute('aria-pressed',o===b));draw(b.dataset.f)}));
  }

  const WA='https://wa.me/917075040406?text=';
  // Enquiries are emailed by the /api/enquiry function on Vercel (Zoho Mail SMTP).
  // Absolute URL so the form also works on hydholidays.com, which is hosted on AWS.
  const MAIL_API='https://hydholidays-website.vercel.app/api/enquiry';
  const sendMail=data=>fetch(MAIL_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json().then(j=>r.ok&&j.ok===true)).catch(()=>false);
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
      <label class="full">Email<input id="dq-email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
      <label class="dq-trip">Travel month<input id="dq-month" type="month" value="2026-12"></label>
      <label class="dq-trip">Travellers<select id="dq-pax"><option>2 adults</option><option>2 adults, 1 child</option><option>2 adults, 2 children</option><option>1 adult</option><option>Group (6+)</option></select></label>
      <label class="full">Anything else?<textarea id="dq-msg" rows="3" placeholder="Hotel category, flights from Hyderabad, special requests"></textarea></label>
      <p class="dq-err full" id="dq-err" hidden>Please enter your name, a phone number with at least 10 digits and a valid email.</p>
      <button class="btn full" type="submit" id="dq-send">Send enquiry</button>
      <p class="dq-note full">We reply within one working day. Prefer to call? <b>+91 70750 40406</b></p>
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
    q('dq-sub').textContent=cur?'From ₹'+cur.p+' per person · '+cur.t.join(' · '):(curName?'We will check your documents and get back to you.':'Tell us where you want to go.');
    dlg.querySelector('.dq-head .eyebrow').textContent=cur?'Package enquiry':(curName?'Visa enquiry':'Enquiry');
    if(o.title){q('dq-title').textContent=o.title;q('dq-sub').textContent=o.sub||'';dlg.querySelector('.dq-head .eyebrow').textContent=o.eyebrow||'Enquiry'}
    q('dq-msg').value=o.msg||'';
    dlg.querySelectorAll('.dq-trip').forEach(l=>l.hidden=!!o.title);
    q('dq-art').style.backgroundImage=cur?`url(images/${cur.n.toLowerCase()}.jpg),${cur.g}`:'';
    q('dq-art').hidden=!cur;q('dq-err').hidden=true;show(true);
    dlg.showModal();setTimeout(()=>q('dq-name').focus(),30)};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-enq]');if(b){e.preventDefault();openEnq(b.dataset.enq)}});
  q('dq-close').addEventListener('click',()=>dlg.close());
  q('dq-back').addEventListener('click',()=>{if(q('dq-fail').hidden)dlg.close();else show(true)});
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
  q('dq-form').addEventListener('submit',e=>{e.preventDefault();
    const name=q('dq-name').value.trim(),ph=q('dq-phone').value.replace(/\D/g,'');
    const em=q('dq-email').value.trim();
    if(!name||ph.length<10||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){q('dq-err').hidden=false;return}
    const txt=['Hello Hyderabad Holidays Co., I would like a quote.',cur?`Package: ${cur.n} ${cur.d} (from ₹${cur.p} pp)`:(curName?`Enquiry: ${curName}`:''),`Name: ${name}`,`Phone: ${q('dq-phone').value.trim()}`,...(q('dq-month').closest('label').hidden?[]:[`Travel month: ${q('dq-month').value||'-'}`,`Travellers: ${q('dq-pax').value}`]),q('dq-msg').value.trim()?`Details:\n${q('dq-msg').value.trim()}`:''].filter(Boolean).join('\n');
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
    const day=k=>{const d=new Date();d.setDate(d.getDate()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
    const mon=k=>{const d=new Date();d.setMonth(d.getMonth()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)};
    const opt=a=>a.map(x=>`<option>${x}</option>`).join('');
    const VC=['UAE (Dubai)','United States','Thailand','Singapore','United Kingdom','Canada','Malaysia','Australia','Vietnam','Schengen (Europe)','Other country'];
    const F={
      h:{label:'Holiday',fields:[
        {id:'from',l:'From',t:'text',v:'Hyderabad (HYD)'},
        {id:'to',l:'Going to',t:'text',ph:'Bali, Kerala, Dubai…',req:1},
        {id:'month',l:'Travel month',t:'month',v:mon(2),min:mon(0)},
        {id:'pax',l:'Travellers',t:'select',o:['2 adults','2 adults, 1 child','2 adults, 2 children','1 adult','Group (6+)']}]},
      f:{label:'Flight',fields:[
        {id:'trip',l:'Trip',t:'select',o:['Return','One way']},
        {id:'from',l:'From',t:'text',v:'Hyderabad (HYD)'},
        {id:'to',l:'To',t:'text',ph:'City or airport',req:1},
        {id:'dep',l:'Depart',t:'date',v:day(14),min:day(0)},
        {id:'ret',l:'Return',t:'date',v:day(21),min:day(0)},
        {id:'pax',l:'Passengers & class',t:'select',o:['1 adult · Economy','2 adults · Economy','2 adults, 1 child · Economy','1 adult · Business','2 adults · Business','Group (10+)']}]},
      o:{label:'Hotel',fields:[
        {id:'city',l:'City or hotel',t:'text',ph:'Dubai, Goa, Kochi…',req:1},
        {id:'in',l:'Check-in',t:'date',v:day(14),min:day(0)},
        {id:'out',l:'Check-out',t:'date',v:day(17),min:day(1)},
        {id:'rooms',l:'Rooms & guests',t:'select',o:['1 room · 2 adults','1 room · 2 adults, 1 child','2 rooms · 4 adults','1 room · 1 adult','3+ rooms']}]},
      v:{label:'Visa',fields:[
        {id:'country',l:'Country',t:'select',o:VC},
        {id:'type',l:'Visa type',t:'select',o:['Tourist','Business','Visiting family / friends','Transit']},
        {id:'date',l:'Travel date',t:'date',v:day(30),min:day(0)},
        {id:'appl',l:'Applicants',t:'select',o:['1 applicant','2 applicants','3 applicants','4 applicants','5+ applicants']}]}
    };
    let tab='h';
    const box=$('#qs-fields');
    const render=()=>{const cfg=F[tab];qs.style.setProperty('--n',cfg.fields.length);
      box.innerHTML=cfg.fields.map(x=>`<label>${x.l}${x.t==='select'?`<select id="qs-${tab}-${x.id}">${opt(x.o)}</select>`:`<input id="qs-${tab}-${x.id}" type="${x.t}"${x.v?` value="${x.v}"`:''}${x.ph?` placeholder="${x.ph}"`:''}${x.min?` min="${x.min}"`:''}>`}</label>`).join('');
      if(tab==='f'){const t=$('#qs-f-trip'),r=$('#qs-f-ret');const sync=()=>{r.disabled=t.value==='One way';r.closest('label').classList.toggle('off',r.disabled)};t.addEventListener('change',sync);sync()}
    };
    $$('[data-t]').forEach(b=>b.addEventListener('click',()=>{$$('[data-t]').forEach(o=>o.setAttribute('aria-pressed',o===b));tab=b.dataset.t;render()}));
    render();
    const fmt=v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const d=new Date(v+'T00:00');return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}if(/^\d{4}-\d{2}$/.test(v)){const d=new Date(v+'-01T00:00');return d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}return v};
    qs.addEventListener('submit',e=>{e.preventDefault();const cfg=F[tab];
      const need=cfg.fields.find(x=>x.req&&!$(`#qs-${tab}-${x.id}`).value.trim());
      if(need){const el=$(`#qs-${tab}-${need.id}`);el.focus();el.setAttribute('aria-invalid','true');el.addEventListener('input',()=>el.removeAttribute('aria-invalid'),{once:true});return}
      const lines=cfg.fields.filter(x=>{const el=$(`#qs-${tab}-${x.id}`);return !el.disabled&&el.value.trim()}).map(x=>`${x.l}: ${fmt($(`#qs-${tab}-${x.id}`).value.trim())}`);
      const v=id=>fmt($(`#qs-${tab}-${id}`).value.trim());
      const title={h:()=>v('to')+' holiday',f:()=>v('from').replace(/\s*\(.*\)/,'')+' → '+v('to'),o:()=>'Hotel in '+v('city'),v:()=>v('country')+' visa'}[tab]();
      const sub={h:()=>v('month')+' · '+v('pax'),f:()=>v('trip')+' · '+v('dep')+(v('trip')==='Return'?' – '+v('ret'):'')+' · '+v('pax'),o:()=>v('in')+' – '+v('out')+' · '+v('rooms'),v:()=>v('type')+' · '+v('appl')+' · travelling '+v('date')}[tab]();
      openEnq(title,{title,sub,eyebrow:cfg.label+' enquiry',msg:lines.join('\n')})});
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
