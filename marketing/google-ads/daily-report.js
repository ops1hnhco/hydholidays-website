// Google Ads Script: daily email report for Hyderabad Holidays Co.
// Install: Google Ads → Tools → Bulk actions → Scripts → + → paste this file → Authorise →
// Save → Frequency: Daily, 8 AM. It only reads the account and sends an email; it changes nothing.
//
// The email has: yesterday and month-to-date per campaign (spend, clicks, enquiries, cost per
// enquiry), searches that cost money without an enquiry (candidates for blocked words), and
// warnings (disapproved ads, live campaigns with no impressions, spend above the monthly budget).

const EMAIL = 'ops1.hnhco@gmail.com';
const WASTE_MIN_RUPEES = 100;   // list searches that cost at least this in 7 days with no enquiry
const MONTH_BUDGET = 30400;     // ₹1,000/day × 30.4, the account's planned monthly maximum

function main() {
  const tz = AdsApp.currentAccount().getTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'd MMM yyyy');
  const rupees = micros => Number(micros || 0) / 1e6;
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

  // Per-campaign totals for a date range.
  function campaigns(range) {
    const out = {};
    const rows = AdsApp.search(
      `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
       FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'`);
    while (rows.hasNext()) {
      const r = rows.next();
      out[r.campaign.name] = {
        status: r.campaign.status, cost: rupees(r.metrics.costMicros), clicks: Number(r.metrics.clicks || 0),
        impressions: Number(r.metrics.impressions || 0), conversions: Number(r.metrics.conversions || 0),
      };
    }
    return out;
  }

  // Every campaign that isn't removed, with its status: reports leave out campaigns with no
  // activity, and those are exactly the ones a warning should catch.
  const status = {};
  const all = AdsApp.search(`SELECT campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'`);
  while (all.hasNext()) { const c = all.next(); status[c.campaign.name] = c.campaign.status; }

  const yesterday = campaigns('YESTERDAY');
  const month = campaigns('THIS_MONTH');
  const names = Object.keys(status).sort();

  const row = (name, d) => {
    const cpe = d.conversions ? fmt(d.cost / d.conversions) : '–';
    return `<tr><td>${name}</td><td>${fmt(d.cost)}</td><td>${d.clicks}</td><td>${d.conversions.toFixed(0)}</td><td>${cpe}</td></tr>`;
  };
  const table = (title, data) => {
    const empty = { cost: 0, clicks: 0, conversions: 0 };
    const total = names.reduce((t, n) => {
      const d = data[n] || empty;
      return { cost: t.cost + d.cost, clicks: t.clicks + d.clicks, conversions: t.conversions + d.conversions };
    }, { cost: 0, clicks: 0, conversions: 0 });
    return `<h3>${title}</h3><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:13px">
      <tr style="background:#e2f0ee"><th>Campaign</th><th>Spend</th><th>Clicks</th><th>Enquiries</th><th>Cost / enquiry</th></tr>
      ${names.map(n => row(n, data[n] || empty)).join('')}
      <tr style="font-weight:bold">${row('Total', total).slice(4)}</table>`;
  };

  // Searches that cost money in the last 7 days without an enquiry.
  const waste = [];
  const terms = AdsApp.search(
    `SELECT search_term_view.search_term, campaign.name, metrics.cost_micros, metrics.clicks
     FROM search_term_view
     WHERE segments.date DURING LAST_7_DAYS AND metrics.conversions = 0 AND metrics.cost_micros >= ${WASTE_MIN_RUPEES * 1e6}
     ORDER BY metrics.cost_micros DESC LIMIT 25`);
  while (terms.hasNext()) {
    const t = terms.next();
    waste.push(`<li>“${t.searchTermView.searchTerm}”: ${fmt(rupees(t.metrics.costMicros))}, ${t.metrics.clicks} clicks (${t.campaign.name})</li>`);
  }

  // Warnings.
  const warnings = [];
  const disapproved = AdsApp.search(
    `SELECT campaign.name, ad_group.name FROM ad_group_ad
     WHERE ad_group_ad.policy_summary.approval_status = 'DISAPPROVED' AND ad_group_ad.status = 'ENABLED' AND campaign.status = 'ENABLED'`);
  while (disapproved.hasNext()) {
    const d = disapproved.next();
    warnings.push(`Ad disapproved by Google in ${d.campaign.name} / ${d.adGroup.name}. Open Google Ads → Ads to see why.`);
  }
  names.forEach(n => {
    if (status[n] === 'ENABLED' && !(yesterday[n] && yesterday[n].impressions > 0)) warnings.push(`${n} is switched on but showed no ads yesterday (check balance, approvals and bids).`);
  });
  const monthSpend = names.reduce((s, n) => s + (month[n] ? month[n].cost : 0), 0);
  if (monthSpend > MONTH_BUDGET) warnings.push(`This month's spend (${fmt(monthSpend)}) is above the planned ${fmt(MONTH_BUDGET)}.`);
  const anyLive = names.some(n => status[n] === 'ENABLED');
  if (!anyLive) warnings.push('All campaigns are paused, so no ads are running.');

  const html = `<div style="font-family:Arial;font-size:14px">
    <h2 style="color:#0f6b6b">Google Ads daily report: ${today}</h2>
    ${warnings.length ? `<p style="color:#b3261e"><b>Needs attention:</b></p><ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : '<p>No problems found.</p>'}
    ${table('Yesterday', yesterday)}
    ${table('This month so far', month)}
    <h3>Searches that cost money without an enquiry (last 7 days)</h3>
    ${waste.length ? `<ul>${waste.join('')}</ul><p>If any of these aren't what you sell, add them to the "Travel agency - blocked searches" list.</p>` : '<p>None above ' + fmt(WASTE_MIN_RUPEES) + '.</p>'}
    <p style="color:#5b6468;font-size:12px">"Enquiries" are the conversions Google Ads tracks (enquiry forms, WhatsApp taps, calls once set up). Balance warnings come from the Google Ads app.</p>
  </div>`;

  MailApp.sendEmail({
    to: EMAIL,
    subject: `Google Ads ${today}: ${fmt(names.reduce((s, n) => s + (yesterday[n] ? yesterday[n].cost : 0), 0))} spent yesterday${warnings.length ? ' · ' + warnings.length + ' warning(s)' : ''}`,
    htmlBody: html,
  });
}
