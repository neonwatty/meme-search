# Meme Search CLI

A dependency-free Python 3 client for searching a Meme Search collection and
downloading a result. It uses the authenticated, read-only `/api/v1` interface;
it never connects to PostgreSQL or the internal image-to-text service.

## Requirements

- Python 3.10 or newer
- A running Meme Search instance with the v1 API enabled
- An API token with `search:read`, plus `media:read` when using `fetch`

Official support is loopback-only. Keep the web app at its default loopback
binding: API tokens do not authenticate the web UI or settings, and direct
public exposure is unsupported. The CLI refuses to send a token over plain
HTTP to a non-loopback host.

## Setup

Create a token from **Settings → API tokens**, or use the Rails task.

For Docker, from the repository root:

```sh
docker compose exec meme_search bin/rails api_tokens:create \
  NAME="Local CLI" SCOPES="search:read,media:read"
```

For a native checkout:

```sh
cd meme_search/meme_search_app
bin/rails api_tokens:create \
  NAME="Local CLI" SCOPES="search:read,media:read"
cd ../..
```

Copy the raw token immediately; Meme Search stores only its digest. Then export
it from the shell in which you will run the CLI:

```sh
export MEME_SEARCH_API_TOKEN='ms_your_token_here'
export MEME_SEARCH_URL='http://127.0.0.1:3000' # optional; this is the default
```

The token is intentionally accepted only through the environment, not a
command-line flag, to keep it out of shell history and process listings.

## Search

```sh
./integrations/cli/meme-search search 'production incident'
./integrations/cli/meme-search search 'ship it' --mode vector --limit 5
./integrations/cli/meme-search search 'reaction' --tag work --tag favorite
./integrations/cli/meme-search search 'deploy' --json | jq '.data[].id'
```

Human-readable output includes each result's ID and `content_url`. `--json`
prints the complete API response for scripts and community-built tools.

For example, search with `jq` and fetch the first result:

```sh
meme_id="$(
  ./integrations/cli/meme-search search 'ship it' --json |
    jq -r '.data[0].id'
)"
./integrations/cli/meme-search fetch "$meme_id" --output ./ship-it.gif
```

## Fetch media

Pass either a numeric result ID or the relative `content_url` returned by
search:

```sh
./integrations/cli/meme-search fetch 42 --output ./ship-it.gif
./integrations/cli/meme-search fetch /api/v1/memes/42/content -o ./ship-it.gif
```

Downloads are streamed to a same-directory temporary file and, when the server
provides `Content-Length`, committed only after the received byte count matches.
Without `--force`, the final create-if-absent step is atomic, so a file created
by another process during the download is preserved. `--force` explicitly uses
an atomic replacement. Failed or truncated downloads remove their temporary
file, and symlink destinations are always rejected.

## Configuration

```text
MEME_SEARCH_API_TOKEN   Required bearer token
MEME_SEARCH_URL         Instance origin (default http://127.0.0.1:3000)
--url                   Override the instance origin for one invocation
--timeout               Request timeout in seconds (default 15)
```

Run `./integrations/cli/meme-search --help` or a subcommand's `--help` for the
complete command reference.

### Advanced networking is unsupported

`https://` instance origins are accepted so an operator can use an
authenticated TLS reverse proxy or private VPN, but that is advanced,
unsupported configuration. The operator owns TLS validation, proxy
authentication, ingress, host authorization, and secret handling. The CLI
never follows authenticated redirects. Official support and automated coverage
remain loopback-only.

## Revoke or rotate a token

List safe token prefixes and revoke one with either the settings page or Rails
tasks:

```sh
# Docker
docker compose exec meme_search bin/rails api_tokens:list
docker compose exec meme_search bin/rails api_tokens:revoke PREFIX="ms_abcd1234"

# Native, from meme_search/meme_search_app
bin/rails api_tokens:list
bin/rails api_tokens:revoke PREFIX="ms_abcd1234"
```

Create a replacement token before revoking an in-use client. The full raw token
cannot be recovered after creation.

## Troubleshooting

- `MEME_SEARCH_API_TOKEN is required`: export the one-time raw token in the
  current shell; do not pass it as a command-line flag.
- `HTTP 401`: the token is missing, invalid, expired, or revoked.
- `HTTP 403`: the token lacks `search:read` or `media:read` for that command.
- `could not connect`: confirm Meme Search is running at `MEME_SEARCH_URL` and
  remains reachable over loopback.
- `plain HTTP is only allowed for loopback`: use the default loopback URL.
  Remote HTTPS is an advanced, unsupported operator configuration.
- `output already exists`: choose another path or intentionally add `--force`.
- `unexpected search response` or `unexpected media type`: the server and CLI
  contracts do not match; verify both come from the same supported release.

## Tests

The tests use a loopback-only fake HTTP server and make no external requests:

```sh
cd integrations/cli
python3 -m unittest discover -v
python3 -m py_compile meme_search_cli.py meme-search
```

For a manual smoke test against disposable local data, create a dedicated token
and exercise: keyword and vector search; repeated `--tag`; `--json | jq`;
fetch by ID and exact returned `content_url`; overwrite refusal and intentional
`--force`; then revoke the token and confirm the next command returns 401. This
real-Rails walkthrough is an acceptance step, not part of the fake-server unit
suite.
