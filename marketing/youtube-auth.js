// One-time YouTube sign-in. Prints the refresh token to save as the YT_REFRESH_TOKEN secret.
//
//   cd marketing
//   YT_CLIENT_ID=... YT_CLIENT_SECRET=... node youtube-auth.js
//
// Open the link it prints, sign in with the Google account that owns the YouTube channel,
// pick the channel and allow access. The OAuth client must be of type "Desktop app".
import http from 'node:http';

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/`;
const { YT_CLIENT_ID: id, YT_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET first (Google Cloud → APIs & Services → Credentials).');
  process.exit(1);
}

const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/youtube.upload',
  access_type: 'offline',
  prompt: 'consent',
});

const server = http.createServer(async (req, res) => {
  const q = new URL(req.url, REDIRECT).searchParams;
  if (!q.get('code')) { res.end(q.get('error') || 'Waiting for Google...'); return; }
  const tok = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code: q.get('code'), client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  })).json();
  if (tok.refresh_token) {
    res.end('Done. Go back to the terminal and copy the refresh token.');
    console.log(`\nSave this as the GitHub secret YT_REFRESH_TOKEN:\n\n${tok.refresh_token}\n`);
  } else {
    const why = [tok.error, tok.error_description].filter(Boolean).join(': ') || JSON.stringify(tok);
    const hint = tok.error === 'invalid_client' ? '\n\nThe client secret is wrong: make a new one in Google Cloud (Clients > Social agent > Add secret) and run again with it.'
      : tok.error === 'invalid_grant' ? '\n\nThis sign-in code was already used or expired: run node youtube-auth.js again and use the new link.' : '';
    res.end(`Google did not return a refresh token.\n\nGoogle says: ${why}${hint}`);
    console.error('No refresh token:', why);
  }
  server.close();
});

server.listen(PORT, '127.0.0.1', () => console.log(`Open this link in the browser where you can sign in to the channel's Google account:\n\n${url}\n`));
