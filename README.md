# Hyderabad Holidays Co. website

Static HTML site with one serverless function, `api/enquiry.js`, that emails
enquiries from the package popup, the home search bar and the Contact page to
contact@hydholidays.com through Zoho Mail SMTP.

## Deploy on Vercel
1. Import this GitHub repo in Vercel (Framework preset: **Other**, no build command, output directory: root).
2. In **Project → Settings → Environment Variables**, add every variable from `.env.example`
   with real values. `SMTP_PASS` is a Zoho **app-specific password**, not your login password.
3. Deploy, then open the site and send a test enquiry.

The function is served at `/api/enquiry`. If emails don't arrive, check
**Vercel → Deployments → Functions → Logs** for the error message.

## Zoho checklist
- Enquiries are sent from and to `contact@hydholidays.com`. To send from another address (e.g. `noreply@`), create it as an alias of that mailbox in Zoho first, then change `MAIL_FROM`.
- If sending fails with an authentication error, check that SMTP access is enabled for the mailbox in the Zoho Mail Admin Console.
- Add SPF and DKIM records for hydholidays.com from Zoho Admin → Domains so emails don't land in spam.

## Other hosts
`api/enquiry.js` is a standard Node handler `(req, res)`. To use it on Express, mount it
with `app.post('/api/enquiry', express.json(), handler)` and add `res.status`/`res.json` (built into Express).
On Netlify or AWS Lambda it needs a small wrapper; ask before switching.

## Current setup
hydholidays.com is served from AWS (S3 + CloudFront) and deploys automatically when `main` is pushed
to GitHub; only the enquiry function runs on Vercel (https://hydholidays-website.vercel.app), and
`app.js` posts to that absolute URL. Every site that posts enquiries must be listed in
`ALLOWED_ORIGINS` on Vercel.

## Travel assistant
`travel-assistant.html` is a chat page where Claude (Haiku 5.5) answers visitors' questions about our packages
and latest Offers posts, helps plan trips, and, once a visitor gives a name and phone number and agrees, emails the
enquiry with the chat to `MAIL_TO` (same Zoho settings as the enquiry form). A "Continue on WhatsApp" button opens a
chat with +91 70750 40406 with the visitor's questions filled in.
- The page (`travel-assistant.js`) posts to the Vercel function `api/agent.js`, like the enquiry form.
- What it knows comes from the `P` list in `app.js` and the Offers posts in `blog/posts.json`, so it updates on
  every deploy. `vercel.json` makes Vercel include those files.
- Setup: add `ANTHROPIC_API_KEY` in Vercel → Project → Settings → Environment Variables (optional `AGENT_MODEL`),
  then redeploy. Without the key the page says the assistant is not set up yet.
- Limits: 20 visitor messages per chat, 40 messages per hour per visitor (best effort). Each message costs a fraction
  of a rupee with Haiku. Links in replies are checked against real pages before they're shown.

## Social media agent
A daily GitHub Actions job researches, writes, designs and posts travel content (package ideas, travel news) to Facebook, Instagram, X and YouTube Shorts.
Setup: `marketing/README.md`.

## Package pages
Each holiday package has its own page (`kashmir-tour-package.html`, `kerala-tour-package.html`, …) generated
from the package list in `app.js` plus the copy in `scripts/build-package-pages.js`. After changing a price,
itinerary or adding a package, run `node scripts/build-package-pages.js`; it rebuilds those pages and `sitemap.xml`.

## Services we don't offer
We don't offer visa assistance, flight booking or travel insurance, and the site doesn't mention them.
- `scripts/build-package-pages.js` refuses to build a package page that mentions visas, flights or insurance.
- The blog, social media and WhatsApp agents in `marketing/` are told never to write about them
  (`NOT_OFFERED_NOTE` in `marketing/offer.js`), and airfare-only supplier offers are skipped.
- The old visa pages, the Dubai, Bali and Vietnam packages, `flights-hotels.html` (now `hotels.html`) and the old
  visa and flight blog posts were removed. The Amplify build (`scripts/retired-pages.js`) publishes their old
  addresses as redirects to live pages, so old links and search results still work.
- Everything removed is in the git history, in the commit before "Remove visa, flight and insurance services".
