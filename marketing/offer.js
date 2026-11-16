// An offer the owner approved on WhatsApp (see whatsapp.js), passed to blog.js and agent.js as the
// OFFER environment variable (JSON). It replaces their web research: the owner has checked these
// facts, so the brief is marked READY and the writers use them as given.

import { createRequire } from 'node:module';

// Services paused on the website (../scripts/services.js). While visa or flight services are paused, our
// posts and articles stay off visas and flights altogether, and airfare-only offers are not posted.
const services = createRequire(import.meta.url)('../scripts/services.js');
export const PAUSED = services.paused;
export const hiddenPost = services.hiddenPost;
export const NO_VISA_FLIGHTS = PAUSED.includes('visa') || PAUSED.includes('flights');
export const PAUSED_NOTE = NO_VISA_FLIGHTS ? `

For now we do not offer visa assistance, flight booking or travel insurance, and our posts stay off those topics. Do not write about visas, entry permits, flights, airlines, airfares, airports or travel insurance, and do not mention them at all, except to list an inclusion exactly as given in one of our own approved package offers. Never offer to book flights, file visas or sell insurance.` : '';

export const OFFER_KINDS = ['domestic package', 'international package', ...(PAUSED.includes('flights') ? [] : ['flight offer'])];

export function readOffer(json) {
  if (!json) return null;
  const o = JSON.parse(json);
  if (!OFFER_KINDS.includes(o.kind)) throw new Error(`OFFER has unknown kind "${o.kind}". Options: ${OFFER_KINDS.join(', ')}`);
  if (!o.title) throw new Error('OFFER has no title');
  return o;
}

const list = a => (a?.length ? a.map(s => `  - ${s}`).join('\n') : '  - not given');

export function offerBrief(o) {
  return `STATUS: READY (our own offer, approved by the owner; no web sources)
KIND: ${o.kind}
TOPIC: ${o.title}
ANGLE: a current offer from Hyderabad Holidays Co. that readers can book with us now
FACTS:
- Offer: ${o.title}
- Destination: ${o.destination || 'not given'}
- Duration: ${o.duration || 'not given'}
- Travel dates: ${o.travel_dates || 'not given'}
- Book by: ${o.valid_until || 'not given'}
- Price: ${o.price ? `₹${o.price.toLocaleString('en-IN')} ${o.price_basis || 'per person'}, our price, subject to availability` : 'none; readers ask us for a quote'}
- Includes:
${list(o.inclusions)}
- Does not include:
${list(o.exclusions)}
- Notes: ${o.notes || 'none'}
CAUTIONS: prices and availability can change until booked${NO_VISA_FLIGHTS ? '' : "; visa, if needed, is the traveller's own responsibility unless included above"}`;
}

export const OFFER_GUIDE = `If the brief says it is our own offer, approved by the owner, it has no web sources and that is expected: treat every fact in it as confirmed. Present it as a package or fare we can book now, use the price exactly as given with its basis and "subject to availability" (or no price if none is given), give the travel dates and the book-by date, and invite readers to WhatsApp us to book. Never mention suppliers, other agencies or where the offer came from, and never add inclusions, prices or dates that are not in the brief.`;
