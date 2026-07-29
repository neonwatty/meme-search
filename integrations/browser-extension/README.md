# Meme Search Local browser extension

This is a small, unpacked Chromium extension for searching a Meme Search
collection without opening the web app. Result cards show metadata and can copy
or download the selected meme.

Search and scrolling fetch no media. API v1 has no bounded thumbnail
representation, so the popup intentionally avoids automatic previews instead
of downloading full originals in the background. **Copy image** fetches only
the selected original and converts it to PNG for broad clipboard
compatibility. For an animated GIF, copy is a still frame; use **Download** to
fetch and preserve the original animation.

## Prerequisites

- Meme Search running locally at `http://127.0.0.1:3000` (the default) or an `http://localhost` URL.
- A read-only API token with the `search:read` and `media:read` scopes.

Create a token from **Settings → API tokens**. Select both read scopes and copy
the one-time value immediately.

For Docker, the equivalent task is:

```sh
docker compose exec meme_search bin/rails api_tokens:create \
  NAME="Browser extension" SCOPES="search:read,media:read"
```

For a native checkout, run from `meme_search/meme_search_app`:

```sh
bin/rails api_tokens:create NAME="Browser extension" SCOPES="search:read,media:read"
```

The raw token is shown once. Do not commit or paste it into logs.

## Load the unpacked extension

1. Open `chrome://extensions` in Chrome, Chromium, Brave, or Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `integrations/browser-extension` directory.
4. Open the extension's settings, enter the local server URL and token, and choose **Save connection**.
5. Pin the extension, open its popup, and search.

The extension is an MVP for local installation. It is not packaged or
published to an extension store. Official support is Chromium-only and
loopback-only.

## Security boundary

- Host access is optional and limited to `http://127.0.0.1/*` and `http://localhost/*`. The extension cannot be configured for LAN or internet hosts.
- The host prompt is required because Chromium extensions need explicit permission to call the selected local origin. No blanket web access is requested.
- The bearer token is stored unencrypted in `chrome.storage.local` in the current browser profile. Other people or software with access to that profile may be able to recover it. It is never placed in a query string or an image URL.
- Search results expose relative API URLs. The extension accepts only the configured origin's `/api/v1/memes/:id/content` route. It makes no media request while rendering or scrolling results; copy and download authenticate and fetch only after the explicit button action.
- Authenticated fetches reject redirects, cross-origin URLs, query-bearing content URLs, malformed result shapes, and non-image responses.
- Keep the token read-only and revoke it if the browser profile or computer is compromised.
- The token secures API routes only. It does not make the unauthenticated Meme Search web interface safe to expose on a network; continue using the project's loopback-only deployment defaults.
- The extension includes no telemetry, analytics, remote service, or update server.

## Revoke, rotate, or repair settings

Revoke a lost token from **Settings → API tokens**. You can also use:

```sh
# Docker
docker compose exec meme_search bin/rails api_tokens:list
docker compose exec meme_search bin/rails api_tokens:revoke PREFIX="ms_abcd1234"

# Native, from meme_search/meme_search_app
bin/rails api_tokens:list
bin/rails api_tokens:revoke PREFIX="ms_abcd1234"
```

Create a replacement before revoking an active token, save it on the extension
settings page, then reload the extension from `chrome://extensions`. If an
invalid legacy URL was saved, the settings page still opens and lets you
replace it.

## Limitations

- Unpacked Chromium browsers only; no Chrome Web Store, Firefox, Safari, mobile,
  or managed-enterprise distribution support.
- Loopback HTTP only; LAN hosts, public hosts, HTTPS origins, and remote proxies
  are rejected.
- Search supports keyword and semantic modes plus result limits. Tag selection
  remains available in the web UI and CLI.
- Result cards are metadata-only. **Copy image** converts to PNG, so an
  animated GIF copies as a still frame; **Download** preserves the original
  bytes and animation.
- Clipboard and optional-host permission behavior depends on the browser and
  must be confirmed in an interactively loaded extension.

## Manual smoke checklist

After loading or changing the extension:

1. Open settings, save `http://127.0.0.1:3000` and a token with both scopes,
   and accept only the loopback host prompt.
2. Search once in Keyword mode and once in Semantic mode without opening the
   web app; confirm metadata cards appear and no media requests occur.
3. Copy a PNG/JPEG and paste it into a local editor. For a GIF, confirm copy is
   a still PNG and Download preserves the animated `.gif`.
4. Download a result and confirm its safe filename and original bytes.
5. Replace the token with an invalid value and confirm the popup gives a
   concise 401 error without displaying the token.
6. Revoke the valid token in Meme Search and confirm subsequent searches fail.
7. Correct the saved token, reload the extension, and confirm search recovers.

## Development

No install step or third-party dependency is required. Node.js 20 can run the contract tests and syntax checks:

```sh
npm test
npm run check
```

After editing extension files, use the reload button for this extension on `chrome://extensions`.
