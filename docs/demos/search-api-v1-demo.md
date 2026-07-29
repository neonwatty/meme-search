# Search API v1 demo package

This package demonstrates a real keyword search in the Meme Search web app and
the same repository-safe collection through the dependency-free CLI. The
terminal sequence in the video is a styled replay of the real commands and
captured output listed below; it is not a recording of a simulated API.

The source collection contains only the four sample images checked into the
test fixtures. The API server and database were disposable, loopback-only test
instances. The bearer token was supplied through the environment and never
displayed.

## Master and derivatives

- Master video: `search-api-v1-demo-master.mp4` (37.04 seconds, H.264,
  1280×720, 25 fps, silent). It is kept outside Git history and is intended for
  the GitHub v2.3.0 release and the launch Announcement Discussion.
- Short video: [`../assets/search-api/search-api-v1-demo-short.mp4`](../assets/search-api/search-api-v1-demo-short.mp4)
  (16.00 seconds, H.264, 1280×720, 25 fps, silent).
- App still: [`../assets/search-api/app-search-bunny.png`](../assets/search-api/app-search-bunny.png).
- CLI still: [`../assets/search-api/cli-search-fetch.png`](../assets/search-api/cli-search-fetch.png).

The optional experimental Chromium-extension beat is deliberately omitted from
this master. The app and CLI form a complete, reproducible API demonstration,
while an extension-management recording would add browser-profile chrome
without improving the API proof.

## Commands and captured output

Configure a dedicated token as described in the
[Search API guide](../search-api.md), then keep it out of shell history:

```bash
read -rsp "Meme Search token: " MEME_SEARCH_TOKEN
export MEME_SEARCH_TOKEN
export MEME_SEARCH_URL=http://127.0.0.1:3000
```

The demo ran these CLI commands against the disposable collection:

```bash
./integrations/cli/meme-search search 'bunny rabbit' --mode keyword --limit 3
./integrations/cli/meme-search fetch 3 --output ./no.jpg
```

Captured search output:

```text
1. [3] no.jpg
   This image contains a bunny rabbit saying the word 'no'.
   tags: tag_one, tag_two
   content: /api/v1/memes/3/content
```

Captured fetch output, with the disposable recording path replaced by the
portable path from the command above:

```text
Saved 37744 bytes to ./no.jpg
```

## Transcript

- 0:00–0:02 — The live app briefly shows the repository-safe sample library,
  including its checked-in cat fixture, before opening search.
- 0:02–0:09 — The live web app uses its default keyword mode, searches for
  “bunny rabbit,” and shows the checked-in Bugs Bunny result image.
- 0:09–0:11 — Section title: “The same collection, from the CLI.”
- 0:11–0:14 — The terminal enters
  `meme-search search 'bunny rabbit' --mode keyword --limit 3`. A note says the
  token is supplied by the environment and hidden.
- 0:14–0:19 — The CLI result displays item 3, `no.jpg`, its description, two
  sample tags, and `/api/v1/memes/3/content`.
- 0:19–0:22 — The terminal enters
  `meme-search fetch 3 --output ./no.jpg`.
- 0:22–0:28 — The terminal confirms that 37,744 bytes were saved and previews
  the repository sample image.
- 0:28–0:37 — Closing card: “Search API v1,” “Local-first,” “Read-only,” and
  “Build integrations without database access.”

The videos are silent, so this transcript contains all communicated
information.

## Alternative text

App still:

> Meme Search web app showing the “bunny rabbit” query in default keyword mode
> and the top of the repository’s Bugs Bunny “NO” sample result.

CLI still:

> Dark terminal-style panel showing the Meme Search CLI searching for “bunny
> rabbit,” returning sample item 3, then fetching that image to `./no.jpg`.
> A nearby preview shows the repository sample image. The token is marked as
> hidden.

Video:

> A short silent demonstration searches a repository-safe sample collection in
> the Meme Search web app, repeats the search with the local CLI, and fetches
> the selected image. It closes by describing Search API v1 as local-first and
> read-only and inviting integrations that do not access the database.

## Validation and provenance

All media rendered at 1280×720. Both MP4 files decode from start to finish with
FFmpeg, and both PNG files decode successfully. A contact sheet sampled the
master across its entire duration, and the recording source was audited so
every terminal line is allow-listed. Because the browser capture records only
the Playwright page viewport, desktop notifications and browser-profile chrome
cannot enter the recording. No raw token, private meme, personal filesystem
path, database credential, or public-network claim appears in any asset.

SHA-256 checksums:

```text
ce89731ecd8352fe9f9313766b1afef40c520e697261f7e557e9c1dbac754962  search-api-v1-demo-master.mp4
c63870181055dab00eb526e2175459f440aa35d28cc0a29f8ed17f562e352f96  search-api-v1-demo-short.mp4
b005d94076970ed1a644a3a06f096eb2daf3bdea54164c34e5641f53ff4505d6  app-search-bunny.png
931c907f19fa9dc3c4192be18934a6da001e589537e7e0c65c5906f778e9d2d7  cli-search-fetch.png
```
