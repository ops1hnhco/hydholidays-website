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
4. **Designs the visuals.** It finds a free, licensed photo of the destination on Pexels and puts the
   headline, logo, website and WhatsApp number over it: a 1080×1350 image and a 15-second vertical
   video (the photo slowly zooms, the text fades in, music plays). The photographer is credited in the
   captions. Without a Pexels key or a matching photo, it uses a plain brand-colour card instead.
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
| `PEXELS_API_KEY` | pexels.com/api → sign up (free) → **Your API key**. Free for commercial use; 200 searches an hour is far more than needed |
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
