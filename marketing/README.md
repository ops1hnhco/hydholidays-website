# Social media agent

Every day at 19:30 IST, when Indian audiences are most active on social media,
`.github/workflows/social-post.yml` runs `agent.js`. It does not use the website's content. Each day it:

1. **Takes the next kind of post** in this four-day cycle:

   | Kind | What it posts |
   |---|---|
   | Domestic package | A trip idea in India that's in season: length, route, highlights. No price; readers ask for a quote |
   | Flight offer | A current airline sale (from Hyderabad where possible), quoted exactly from the airline, with the booking window. If no genuine offer is found, it posts travel news instead |
   | International package | A trip idea abroad that's in season, with the visa situation for Indians when confirmed. No price |
   | Travel news | Recent news that affects Indian travellers: visa and entry rules, new routes, airports, advisories |

2. **Researches on the web.** Claude searches official sources (airlines, governments, tourism boards)
   and established news outlets, and only keeps facts it could confirm. It also checks the list of
   recent posts so it doesn't repeat a destination or story within 30 days.
3. **Writes a separate caption** for Facebook, Instagram, X and YouTube, from those facts only, each
   opening with a hook line. It never invents prices or offers of its own.
4. **Designs the visuals.** It finds a free, licensed photo of the destination on Pixabay and puts the
   headline, logo, website and WhatsApp number over it: a 1080×1350 image and a 15-second vertical
   video (the photo slowly zooms, the text fades in, music plays). The photographer is credited in the
   captions. Without a photo key or a matching photo, it uses a plain brand-colour card instead.
5. **Posts** the video as a **Reel** on the Facebook Page and Instagram, as a **Short** on YouTube, and
   the image on X. If a Reel upload fails, that platform gets the image instead. Facebook and X posts
   link to www.hydholidays.com.

Posts go live without review. Each run's captions, sources, research notes and results are on
**GitHub → Actions → Daily social post → (run) → Summary**, and the image and video are in the run's
**post** artifact.

## One-time setup

Add each value below under **GitHub repo → Settings → Secrets and variables → Actions → New
repository secret**. A platform whose secrets are missing is skipped, so you can start with one.

| Secret | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys. Web search must be allowed for the organisation (Console → Settings → Privacy / Features) |
| `PIXABAY_API_KEY` | Sign up free at pixabay.com, then open pixabay.com/api/docs: your key is shown under **Parameters → key**. Photos are free for commercial use, no credit required |
| `PEXELS_API_KEY` | Optional alternative to Pixabay (pexels.com/api). Pexels paused new keys in October 2026; Pixabay is used when both are set |
| `FB_PAGE_ID` | `1460168273837936` (Hyderabad Holidays Co. Page, from Business Suite → Settings → Pages. Not the 61595522356835 in the Page's web address, which is its profile ID) |
| `FB_PAGE_ACCESS_TOKEN` | The "Holiday Poster" system user token (see "Meta token" below). Used for both Facebook and Instagram |
| `IG_USER_ID` | `17841475375430163` (@hydholidaysco, from Business Suite → Settings → Instagram accounts) |
| `X_API_KEY`, `X_API_SECRET` | developer.x.com → your app → Keys and tokens → Consumer keys |
| `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | Same page → Access Token and Secret (generate them *after* setting Read and write, below) |
| `YT_CLIENT_ID`, `YT_CLIENT_SECRET` | Google Cloud OAuth client (see "YouTube" below) |
| `YT_REFRESH_TOKEN` | From `node youtube-auth.js` (see "YouTube" below) |

### Meta token (Facebook + Instagram)
Already set up (25 October 2026) in the **Hyderabad Holidays Co.** business portfolio:
- Instagram **@hydholidaysco** is connected to the Page (Page → Settings → Linked accounts).
- Meta app **Hyderabad Holidays Poster** (app ID 1129902716747575), with the Instagram and Page use cases.
- System user **Holiday Poster** (Business Suite → Settings → System users), Employee role, with
  Content access to the Page and Instagram and Develop access to the app.

To make a new token (for example if the old one leaks or stops working): Business Suite → Settings →
System users → Holiday Poster → **Generate token** → app *Hyderabad Holidays Poster*, expiry **Never**,
permissions `business_management`, `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
`pages_manage_posts`, `pages_read_engagement`. Put it in the `FB_PAGE_ACCESS_TOKEN` secret. The agent
swaps it for the Page's own token on each run. **Revoke tokens** on the same screen cancels old ones.

Instagram needs the Facebook secrets too: it uses the Page's token, and for image posts the agent
uploads the image to the Page as an unpublished photo and gives Instagram that photo's address.

### X
1. At developer.x.com, use a plan that allows posting and media upload (check current pricing).
2. Your app → **User authentication settings** → App permissions **Read and write**.
3. Then generate the Access Token and Secret. Tokens generated before step 2 are read-only and fail.

### YouTube
1. At console.cloud.google.com, signed in with the Google account that owns the YouTube channel,
   create a project (e.g. "Hyderabad Holidays Poster").
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform): app name *Hyderabad Holidays
   Poster*, audience **External**, your email as support and developer contact. Under **Audience**,
   click **Publish app** so it is "In production". While it stays in "Testing", Google cancels the
   sign-in after 7 days and uploads stop.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Desktop app**.
   Copy the client ID and secret into `YT_CLIENT_ID` and `YT_CLIENT_SECRET`.
5. On your computer: `cd marketing`, then
   `YT_CLIENT_ID=... YT_CLIENT_SECRET=... node youtube-auth.js`. Open the link it prints, sign in, pick
   the Hyderabad Holidays channel and allow access. Google warns that the app isn't verified; click
   **Advanced → Go to Hyderabad Holidays Poster**, since it's your own app. Copy the refresh token it
   prints into `YT_REFRESH_TOKEN`.
6. **Make the Shorts public:** YouTube keeps videos uploaded by a new API project **private** until the
   project passes Google's audit. Submit the "YouTube API Services – Audit and Quota Extension" form
   (support.google.com/youtube/contact/yt_api_form) for the project. Until it's approved, each run
   uploads the Short as private, and the run Summary says so. You can make individual videos public
   by hand in YouTube Studio.

### Music
Put royalty-free `.mp3` tracks in `marketing/music/` and the videos take turns using them, one a day
(each fades in and out; tracks shorter than 15 seconds loop). Without any, the videos are silent.

- Only use music you're licensed to use. **Pixabay Music** (pixabay.com/music) is free for commercial
  use with no credit needed; search "travel", "upbeat" or "indian". Never use film or pop songs:
  YouTube and Instagram mute or block them, and they can bring copyright claims.
- To add tracks without a terminal: GitHub repo → **Code** → open the `marketing` folder → **Add file →
  Upload files**, and drop the files in a folder named `music` (type `music/` before the file name, or
  upload into `marketing/music` if it already exists). Then **Commit changes**.
- Keep each file under a few MB; a 30–60 second clip is plenty.

## Test it
GitHub → Actions → **Daily social post** → **Run workflow**. "Plan and write only" is ticked by
default, so the run researches, writes and designs the post without posting. Read the Summary and
download the **post** artifact to see the image. Untick it to post now.

- **Kind** picks the type of post instead of today's turn.
- **Brief** steers it, for example "Kashmir for Christmas" or "Any new flights from Hyderabad?".
  The agent still only posts facts it can confirm.
- **Platforms** posts to only some platforms, for example `facebook,instagram` after those failed.
  It researches and writes a new post, so it won't be identical to the one the others got.

Locally: `cd marketing && npm install`, set the same variables, then `npm run dry-run`. The image,
the video (`video.mp4`) and the full post are saved in `marketing/out/`. `KIND="flight offer"` and `BRIEF="..."` work the same way.

## Notes
- **Memory.** The list of past posts is kept in the GitHub Actions cache (the last 120). Only runs that
  actually posted are recorded. If the cache is cleared, the agent simply starts a new list.
- **GitHub pauses scheduled workflows after 60 days with no commits.** It emails a warning first;
  re-enable the workflow on the Actions tab, or push any commit.
- **Cost.** Claude: two Opus 5.5 requests with up to 20 web searches and 10 page reads a day, roughly 20-50 US cents a day (twice that on a day the research has to be redone).
  If Claude declines a request, the API retries it on a fallback model automatically
  (`fallbacks: "default"`).
- If a platform fails (for example, an expired token), the others still post, and the run is marked
  failed. GitHub emails you about failed runs.

## Growing the audience
The agent posts consistently, but new accounts' posts are shown to very few people until they have
some followers and engagement. What helps most:
- **Share the Page and Instagram** with your WhatsApp contacts, groups and past customers, and ask them
  to follow. Add the Instagram and Facebook links to your WhatsApp Business profile, email signature and
  the website.
- **Reply to every comment and message** within a few hours; the apps show posts with active
  conversations to more people.
- **Boost the best post each week** (Meta Business Suite → the post → Boost, ₹200–500, audience:
  Hyderabad, ages 25–55, interests travel). Boost posts that already do well rather than new ones.
- **Change Instagram's display name** from "Sam Reddy" to Hyderabad Holidays Co., and fill in the bio
  with the WhatsApp number and website.
- Check **Business Suite → Insights** once a week to see which kinds of post do best, and use the
  **Kind** and **Brief** options to post more of those.

# Daily blog

Every morning at 08:00 IST, `.github/workflows/daily-blog.yml` runs `blog.js`. Claude picks one recent
news item that matters to travellers from Hyderabad (visa and entry rules, new flights and routes,
airports, advisories), confirms it on official sources or established news sites, and writes a
350–600 word article with sources and a link to the most relevant page on our site. The article is
saved as `blog/<date>-<slug>.html`, listed on `blog.html`, added to the sitemap and committed to
`main`, which publishes it. If the facts can't be confirmed, nothing is published and the run fails
so you notice.

**WhatsApp Channel.** WhatsApp has no API for posting to Channels, so each run's **Summary** (GitHub →
Actions → Daily blog → run) contains a ready-made Channel update with the article link. Copy it into
the Channel from the WhatsApp Business app. Once the Channel exists, add its link as a repository
**variable** (not a secret) named `WHATSAPP_CHANNEL_URL`; the blog's "Follow" buttons then point to it.
Until then they open a WhatsApp chat with us.

Setup: the same `ANTHROPIC_API_KEY` secret as the social agent. To try it without publishing, run
**Actions → Daily blog → Run workflow** with "dry run" ticked. `node blog.js --index` rebuilds
`blog.html` and the sitemap after you delete or edit a post (and its entry in `blog/posts.json`).

# WhatsApp offers agent

`whatsapp.js` turns supplier offers shared in WhatsApp groups into blog posts and social posts,
after you approve each one on WhatsApp.

1. It stays logged in to WhatsApp Web as a **spare number** that is a member of your supplier
   groups, and saves the messages (text and posters) from the groups you list.
2. At 11:00 and 17:00 IST Claude reads the new messages, including the text on posters, and picks out
   complete offers. Repeats across groups are merged. It leaves out supplier names, phone numbers
   and links.
3. Each offer is sent to you on WhatsApp with **our price**: the supplier's price + 10%, rounded up
   to the next ₹100. Anything doubtful (other currencies, missing details) is marked ⚠️.
4. You reply:

   | Reply | What happens |
   |---|---|
   | `yes 12` | Publishes offer 12 at the price shown |
   | `yes 12 24999` | Publishes at ₹24,999 instead |
   | `yes 12 no price` | Publishes without a price ("ask for a quote") |
   | `no 12` | Skips it |
   | `list` | Shows offers waiting for a reply |
   | `check` | Reads the groups now instead of waiting for 11:00/17:00 |

5. On `yes`, it starts **Daily blog** and **Daily social post** on GitHub with the offer. They skip
   their web research and write an "Offers" blog article and the Facebook, Instagram, X and YouTube
   posts from the approved details only. Results are in GitHub → Actions as usual.

**Risk.** WhatsApp has no official way to read groups, so this uses Baileys, an unofficial WhatsApp
Web library. WhatsApp's terms do not allow it and it can ban the number. Use a spare SIM only, never
+91 70750 40406, and ask suppliers to add that number to their groups. Messages and posters stay on
the computer running the agent (`marketing/.state/whatsapp`, not committed) and are deleted once
read.

## Setup

1. **A computer that is always on.** The agent only reads messages while it runs. This PC works if it
   stays on; otherwise use a small always-on machine or server with Node 22+.
2. **GitHub token**: github.com → Settings → Developer settings → Fine-grained tokens → Generate:
   repository *hydholidays-website* only, permission **Actions: Read and write**. Copy it.
3. In `marketing/`, copy `.env.example` to `.env` and fill it in (Anthropic key, your number,
   GitHub token). Leave `PUBLISH_DRY_RUN=1` for now.
4. `npm install`, then `npm run whatsapp -- --groups`. Scan the QR code with the **spare phone**
   (WhatsApp → Settings → Linked devices → Link a device). It lists the groups and exits. Copy the
   supplier group names into `WA_GROUPS` in `.env`, separated by commas.
5. `npm run whatsapp` and leave it running. Send `check` from your number to the spare number to try
   it. With `PUBLISH_DRY_RUN=1`, `yes` runs the workflows as dry runs; check their Summary on GitHub.
   When the posts look right, set `PUBLISH_DRY_RUN=0` and restart.
6. To start it automatically on Windows: Task Scheduler → Create Task → trigger **At log on** →
   action *Start a program* `cmd.exe`, arguments `/c npm run whatsapp >> whatsapp.log 2>&1`, start in
   `C:\Projects\hyderabad-holidays-site\marketing`. On a Linux server, use pm2 or systemd.

If WhatsApp logs the device out, delete `marketing/.state/whatsapp/auth` and run it again to scan a
new QR code. If your replies are ignored, the log shows "Ignored a direct message from …": make sure
`WA_OWNER` is the number you reply from, with country code.
