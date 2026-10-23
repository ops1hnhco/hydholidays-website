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
- `noreply@hydholidays.com` must exist as a mailbox, or as an alias of the mailbox in `SMTP_USER`.
- If sending fails with an authentication error, check that SMTP access is enabled for the mailbox in the Zoho Mail Admin Console.
- Add SPF and DKIM records for hydholidays.com from Zoho Admin → Domains so emails don't land in spam.

## Other hosts
`api/enquiry.js` is a standard Node handler `(req, res)`. To use it on Express, mount it
with `app.post('/api/enquiry', express.json(), handler)` and add `res.status`/`res.json` (built into Express).
On Netlify or AWS Lambda it needs a small wrapper; ask before switching.
