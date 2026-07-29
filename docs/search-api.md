# Search API and local integrations

Meme Search includes a versioned, read-only HTTP API for local tools and
community-built integrations. Clients search through the same service used by
the web UI and stream media through an authenticated endpoint. They never need
PostgreSQL credentials, Docker-network access, database schema knowledge, or
filesystem paths.

The API does not add authentication to the web UI. Official support is loopback-only for API v1 and the included clients; keep the default loopback
binding. Direct public exposure is unsupported. Proxy/VPN operation is advanced
and unsupported; its authentication, TLS, ingress, host-authorization, and
secret management are entirely the operator's responsibility.

Rails also enforces an exact Host-header allowlist to prevent DNS rebinding.
Loopback and required Docker-internal names work without configuration. An
advanced reverse proxy must set `MEME_SEARCH_ALLOWED_HOSTS` to a comma-separated
list of exact hostnames or IP addresses. Wildcards, URLs, ports, and CIDR ranges
are rejected. This setting does not authenticate the web UI or make remote
exposure supported.

## Create and revoke tokens

Open **Settings → API tokens** to create a named token, select one or both read
scopes, and optionally set a future expiry. The raw value appears only in the
immediate interactive response. Use **Copy token** or select it manually before
navigating away: refresh and back navigation do not redisplay it, and Meme
Search cannot recover it from the stored SHA-256 digest. The settings page also
lists safe prefixes, scopes,
creation/last-use/expiry timestamps and lifecycle state, and retains metadata
after revocation.

The settings page itself is not authenticated. Token-management mutations use
ordinary Rails CSRF protection, but the page must remain loopback-bound with the
rest of the web UI.

Rails tasks provide automation and recovery paths. For Docker:

```sh
docker compose exec meme_search bin/rails api_tokens:create \
  NAME="Local CLI" SCOPES="search:read,media:read"
```

For a native Rails checkout, run the same task from
`meme_search/meme_search_app`:

```sh
bin/rails api_tokens:create NAME="Local CLI" SCOPES="search:read,media:read"
```

Optional `EXPIRES_AT` must be an ISO-8601 timestamp with a timezone, such as
`2030-01-15T12:30:00-07:00`. Zone-less timestamps are rejected rather than
guessed. The browser settings form performs this conversion from the operator's
local time automatically. Manage existing tokens without revealing their
secrets:

```sh
# Docker
docker compose exec meme_search bin/rails api_tokens:list
docker compose exec meme_search bin/rails api_tokens:revoke PREFIX="ms_abcd1234"

# Native, from meme_search/meme_search_app
bin/rails api_tokens:list
bin/rails api_tokens:revoke PREFIX="ms_abcd1234"
```

Use a separate token per integration so one client can be revoked without
interrupting the others. Available v1 scopes are:

- `search:read` — search and retrieve one meme's metadata
- `media:read` — stream the original media bytes

There are no write, upload, tag-editing, settings, or administration scopes in
v1.

## Compatibility and read-only policy

`/api/v1` is a stable, additive contract. Clients must ignore unknown response
fields so optional fields can be added without breaking v1. Existing fields,
types, meanings, routes, bounds, scopes, and status semantics will not be
removed or incompatibly changed in v1; any such change requires `/api/v2`.

API v1 is permanently read-only. Upload, ingestion, tag mutation, deletion,
provider/settings changes, queue control, and description generation will not
be added to v1. Any future write API requires a separate owner decision and
security review rather than a new v1 scope.

## Search

```sh
curl --get http://127.0.0.1:3000/api/v1/search \
  --header "Authorization: Bearer $MEME_SEARCH_API_TOKEN" \
  --data-urlencode "q=production incident" \
  --data "mode=keyword" \
  --data "limit=5" \
  --data-urlencode "tag=reaction"
```

`q` is required and limited to 200 characters. `mode` is `keyword` (the
default) or `vector`. `tag` may be repeated and matches any selected tag.
Each repeated value is one exact tag; commas are not separators, so clients
must percent-encode commas that are part of a tag name.
`limit` must be from 1–20. Search is limited to 60 requests per token per
minute. Tag filtering happens before the result limit in both modes.
Clients must require the documented fields but ignore unknown response fields.
API v1 may add optional fields without a version change; removing or changing a
required field requires a new API version.

```json
{
  "data": [
    {
      "id": 42,
      "filename": "ship-it.gif",
      "description": "A celebratory reaction after a successful deploy",
      "tags": ["reaction", "work"],
      "media_type": "image/gif",
      "content_url": "/api/v1/memes/42/content"
    }
  ],
  "meta": {
    "query": "production incident",
    "mode": "keyword",
    "tags": ["reaction"],
    "limit": 5,
    "count": 1
  }
}
```

The relative `content_url` is deliberate. Fetch it from the same instance and
send the same bearer token:

```sh
curl http://127.0.0.1:3000/api/v1/memes/42/content \
  --header "Authorization: Bearer $MEME_SEARCH_API_TOKEN" \
  --output ship-it.gif
```

`GET /api/v1/memes/:id` returns the same metadata shape for a single result.
Content responses are private, use `X-Content-Type-Options: nosniff`, and
preserve the original bytes. Missing, unsafe, symlinked, or out-of-library
files return the common 404 JSON envelope rather than a filesystem path.
Unreadable files and files removed concurrently before streaming use the same
404 envelope.

Library rescans do not index or serve symlinked/unsafe entries. If an older
installation already has metadata for an unsafe-but-present entry, a rescan
preserves that record and its tags, embeddings, and generation history while
logging the unsafe name. A truly missing entry is still removed normally.

Errors use `{"error":{"code":"...","message":"..."}}`:

| Status | Meaning |
| --- | --- |
| `401` | bearer token is missing, invalid, expired, or revoked |
| `403` | valid token lacks `search:read` or `media:read` |
| `404` | meme or safely accessible media does not exist |
| `422` | query, mode, tag, or limit violates the documented contract |
| `429` | this authenticated token exceeded 60 searches per minute |

The machine-readable contract is available in
[`search-api-openapi.yml`](search-api-openapi.yml).
After installing root dependencies, validate the OpenAPI 3.1 document locally
without network access:

```sh
npm run contract:openapi
```

The CLI and extension test suites both consume
`integrations/shared/search-response-conformance.json`, including an
additive-field fixture, so their required-field checks stay aligned.

## Included clients

- [`integrations/cli`](../integrations/cli/README.md) provides dependency-free
  Python search and fetch commands. Downloads verify a declared content length,
  refuse concurrent no-force clobbers atomically, and replace atomically only
  when `--force` is explicit.
- [`integrations/browser-extension`](../integrations/browser-extension/README.md)
  provides a small unpacked Chromium popup for loopback search. Result cards
  remain metadata-only because API v1 has no bounded thumbnail representation.
  It fetches media only after an explicit copy or download and cancels stale
  action requests on a replacement search or popup unload.

Neither client is published to a package or extension store.

## Upgrade and migration

The API adds the `api_tokens` table. Back up the database before upgrading.

For Docker, pull the new images and recreate the app normally:

```sh
docker compose pull
docker compose up -d
docker compose exec meme_search bin/rails db:migrate:status
```

The web and job container entrypoints run `bin/rails db:prepare` before
starting, which applies the migration idempotently. `db:migrate:status` should
show `20260728000000 Create api tokens` as `up`.

For a native checkout:

```sh
cd meme_search/meme_search_app
bin/rails db:prepare
bin/rails db:migrate:status
```

A fresh database receives the same schema through `db:prepare`; an existing
database receives the forward-only `api_tokens` migration. The migration adds
no user/library ownership model and does not authenticate existing web routes.

## Relevance benchmark

The included `meme_search/meme_search_app/benchmark/search_relevance.yml` is a
replace-me template, not a canonical dataset or a search-quality claim. Copy it
outside the repository, set `template_only: false`, replace the samples with
stable IDs or normalized paths relative to `public/memes`, and run:

```yaml
version: 2
template_only: false
cases:
  - query: "production incident"
    mode: keyword
    expected:
      - path: "work/reactions/incident.gif"
      - id: 123
```

Each expected entry must contain exactly one positive `id` or one `path`.
Paths include the registered library directory and filename; bare filenames
and v1 datasets are rejected because different directories may contain the
same filename. Then run:

```sh
cd meme_search/meme_search_app
bin/rails search:relevance DATASET=/path/to/search_relevance.yml K=10
```

The JSON report contains per-query rankings plus hit rate, mean reciprocal rank
(MRR), and mean recall at K. Because the evaluator calls the shared query
service directly, it measures search behavior without Turbo, templates, or
browser state.

This tool is optional and non-gating in v1. The repository does not ship a
canonical relevance dataset, a regression threshold, or CI/release enforcement.
Choosing and maintaining canonical data and quality thresholds is explicitly
deferred to v2. Never commit filenames, descriptions, images, or embeddings
from a private collection.

## Local CI parity

From the repository root, `npm test` runs the required workflow suite families:
Rails security/static checks and model, controller, service, contract,
database, channel, and Rake-task tests; the Python service; the
OpenAPI validator; root dependency and TypeScript checks; CLI and extension
tests/static checks; and Playwright. It requires installed root/Ruby/Python
dependencies, Docker, and a Chromium available to Playwright. When
`DATABASE_URL` is unset, the runner starts its own ephemeral
`pgvector/pgvector:pg17` container, publishes its database only to
`127.0.0.1` on a Docker-assigned port, and points native Rails at that exact
endpoint. It removes only that runner-owned container on normal exit, failure,
or interruption. The production Compose database remains internal-only.

Set `DATABASE_URL` to use a caller-managed PostgreSQL 17 + pgvector test
server. The runner preserves that value, creates no database container, and
never stops the caller-managed server.

`npm run test:ci:skip-e2e` skips only Playwright. The `test:rails` and
`test:python` scripts are explicitly focused shortcuts and are not CI-parity
commands. Every required suite records its own failure, and the runner exits
nonzero if any required suite fails.

## Community integration contract

The API is the compatibility and security boundary:

- Versioned JSON decouples clients from Rails migrations and internal tables.
- Hashed, scoped, expiring, individually revocable tokens replace shared
  database credentials.
- Server-side validation and result/rate limits apply to every client.
- Media is streamed after authorization; local mount locations are never
  disclosed.
- Embeddings, provider settings, queue internals, and destructive operations
  are not part of the contract.

That makes small community clients practical: Raycast or Alfred commands,
Stream Deck buttons, shell/fzf pickers, Obsidian helpers, Home Assistant
actions, mobile shortcuts, MCP servers, and outbound bot companions can all
translate their user experience into the same search/content requests.

Community projects should pin to `/api/v1`, treat unknown response fields as
forward-compatible, keep tokens out of logs and command-line arguments, reject
cross-origin content URLs, and never follow authenticated redirects to another
origin. A platform bot should upload returned bytes to the conversation rather
than publish a local `/memes` URL.

Community integrations must remain read-only, use a separate least-privilege
token per client, honor result/rate bounds, and avoid direct database,
filesystem, Python-service, or Docker-network access. Do not ask users to make
the app public merely to connect a platform integration.

## Troubleshooting

- `401 unauthorized`: create a new token or check whether the current one
  expired or was revoked. The raw value cannot be recovered from its prefix.
- `403 forbidden`: add the needed read scope by creating a replacement token;
  scopes on an existing token are intentionally not mutated.
- `422 invalid_*`: compare query/mode/tags/limit to the bounds above and to the
  machine-readable contract.
- `429 rate_limited`: wait for the per-token minute window; do not share one
  token across clients to bypass attribution.
- `404 not_found` for media: rescan the configured library and verify the source
  is a regular non-symlinked file under `public/memes`.
- Connection refused: confirm the app is running at
  `http://127.0.0.1:3000`. Official support does not require changing the bind
  address.
- CLI or extension errors: follow their linked README and run their local
  contract tests. Interactive extension permission/clipboard/download behavior
  is covered by its manual smoke checklist, not claimed by Node tests.
