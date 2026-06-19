# Video Downloader (Static UI)

Simple static website (HTML/CSS/JS) that validates a video URL and prepares a request to a backend downloader service.

## What it can/can’t do
- ✅ Lets users choose a site (YouTube/TikTok/etc) and paste a URL
- ✅ Validates the URL in the browser
- ❌ Real downloading from YouTube/TikTok/etc generally requires a **server-side** downloader
  (due to CORS/anti-bot/terms and because browsers can’t fetch direct media reliably)

## Backend integration (optional)
If you have a backend, configure an endpoint here in `app.js`:

- `POST /api/download`
- Request body: `{ "url": "<video url>", "site": "<youtube|tiktok|...>" }`
- Response (example): `{ "downloadUrl": "https://..." }` (or `{ "fileUrl": "https://..." }`)

If the backend isn’t present, the UI will show an error explaining what to add.

## Run locally
Just open the page in your browser:
- `video-downloader-site/index.html`

For better behavior with `fetch`, you can also serve it with any static server, for example:
- `npx serve video-downloader-site`  
  (requires `serve` installed via npm)
