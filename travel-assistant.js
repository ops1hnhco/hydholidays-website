// Travel assistant chat on travel-assistant.html. Talks to the /api/agent function on Vercel (api/agent.js).
(function () {
  const $ = s => document.querySelector(s);
  const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? '/api/agent' : 'https://hydholidays-website.vercel.app/api/agent';
  const WA_NUMBER = '917075040406';
  const STORE = 'hh-assistant-chat';
  const log = $('#chat-log'), form = $('#chat-form'), input = $('#chat-input'), send = $('#chat-send');
  const greeting = log.innerHTML;

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-40))); } catch { /* private mode */ } };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Only our own pages, WhatsApp, phone and email links are made clickable.
  const safeUrl = u => /^([a-z0-9-]+\.html(#[\w-]+)?|blog\/[\w.-]+\.html|https:\/\/(www\.)?hydholidays\.com\/[^\s]*|https:\/\/wa\.me\/\d+[^\s]*|tel:\+?\d+|mailto:[\w.+-]+@[\w.-]+)$/i.test(u);
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
        const u = url.replace(/&amp;/g, '&');
        if (!safeUrl(u)) return text;
        const ext = /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${esc(u)}"${ext}>${text}</a>`;
      });
  }
  // Paragraphs, "- " lists and **bold** / [links](page.html) from the assistant's reply.
  function render(text) {
    const out = [];
    let list = null;
    for (const line of String(text).split('\n')) {
      const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (item) { (list = list || []).push(`<li>${inline(item[1])}</li>`); continue; }
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
      if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
    }
    if (list) out.push(`<ul>${list.join('')}</ul>`);
    return out.join('');
  }

  function add(role, text, extra) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'me' : 'bot'}${extra ? ' ' + extra : ''}`;
    div.innerHTML = role === 'user' ? `<p>${esc(text).replace(/\n/g, '<br>')}</p>` : render(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function updateWhatsApp() {
    const asked = history.filter(m => m.role === 'user').map(m => m.content).join(' | ');
    const text = asked
      ? `Hi Hyderabad Holidays, I was chatting with your website assistant. ${asked}`.slice(0, 900)
      : 'Hi Hyderabad Holidays, I would like help planning a trip.';
    $('#chat-wa').href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function restore() {
    log.innerHTML = greeting;
    for (const m of history) add(m.role, m.content);
    $('#chat-suggest').hidden = history.length > 0;
    updateWhatsApp();
  }

  let busy = false;
  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    $('#chat-suggest').hidden = true;
    history.push({ role: 'user', content: text });
    save();
    const mine = add('user', text);
    updateWhatsApp();
    const typing = add('assistant', '…', 'typing');
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, page: location.pathname }),
      });
      const data = await r.json().catch(() => ({}));
      typing.remove();
      if (!r.ok || !data.ok) throw new Error(data.error || 'The assistant is unavailable right now.');
      history.push(data.enquirySent ? { role: 'assistant', content: data.reply, enquirySent: true } : { role: 'assistant', content: data.reply });
      save();
      add('assistant', data.reply);
      if (data.enquirySent && window.gtag) gtag('event', 'generate_lead', { form_name: 'travel_assistant', page_path: location.pathname });
    } catch (e) {
      typing.remove();
      history.pop(); // let the visitor send it again
      mine.remove();
      save();
      add('assistant', `${e.message && !/fetch/i.test(e.message) ? e.message : 'Could not reach the assistant. Check your connection and try again.'} You can also message us on [WhatsApp](https://wa.me/${WA_NUMBER}).`, 'error');
      input.value = text;
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    input.style.height = '';
    ask(text);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener('input', () => { input.style.height = ''; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; });
  $('#chat-suggest').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); });
  $('#chat-reset').addEventListener('click', () => { history = []; save(); restore(); input.focus(); });

  restore();
})();
