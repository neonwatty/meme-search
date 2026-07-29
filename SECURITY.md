# Security Policy

## Supported versions

Security fixes are applied to the latest released version. Users should upgrade to the newest GitHub release and corresponding container images before reporting an issue that may already be fixed.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's private **Report a vulnerability** form on the repository Security tab when it is available. If private reporting is unavailable, contact the maintainer through [neonwatty.com](https://neonwatty.com/about/) and include only enough information to establish a private channel.

Include:

- the affected version or commit;
- deployment details relevant to the finding;
- reproduction steps or a minimal proof of concept;
- the likely impact; and
- any suggested mitigation.

Remove real API keys, private images, database contents, and personal filesystem paths from the report.

## Deployment scope

The web UI and settings do not include user authentication. Official support
for API v1 is loopback-only. API bearer tokens protect only the versioned
`/api/v1` integration endpoints; they do not make the rest of the application
safe to expose. Direct public exposure is unsupported. Proxy/VPN operation is
advanced and unsupported; the operator owns its authentication, TLS, ingress,
host-authorization, and secret-management review.

Rails rejects unrecognized `Host` headers to prevent DNS rebinding. Loopback
addresses and the required Docker-internal service names are allowed by
default. An advanced reverse proxy must opt its exact hostname into
`MEME_SEARCH_ALLOWED_HOSTS`; wildcard domains, URLs, ports, and CIDR ranges are
rejected. Adding a hostname changes only Host authorization. It does not add
web authentication or make non-loopback exposure supported.

Create a separate, scoped API token for each client, revoke tokens that are no longer used, and avoid putting raw tokens in URLs, logs, shell history, or command-line arguments. Keep the Rails and Python services' Docker-internal ports private.

The official container currently includes the static development-grade
`SECRET_KEY_BASE=password`. Together with the unauthenticated web/settings
surface, this is an explicit blocker for supported remote exposure. Loopback
binding is the supported containment boundary; an operator who changes it must
replace the secret and perform an independent review of TLS, host authorization,
proxy authentication, cookies, callbacks, and provider settings.

Postgres and the Python image-description service are internal implementation
services, not integration APIs. Do not publish their ports. The Python service
does not provide end-user authentication, and provider settings can cause image
content to be sent to a configured OpenAI-compatible endpoint.

Meme files are served only after real-path containment, symlink, regular-file,
and readability checks. Rescans do not index unsafe entries. Existing metadata
for an unsafe-but-present legacy entry is preserved rather than destructively
deleted, but its content remains unavailable. Missing entries continue to be
removed.

API token records contain only SHA-256 digests and safe prefixes. If a raw token
may be compromised, revoke it immediately under **Settings → API tokens** or
with `api_tokens:revoke`, create a separate replacement, update only the
affected integration, and preserve the old revoked record for audit context.

The local description provider keeps image processing on the host. When an OpenAI-compatible provider is selected, images chosen for description generation are sent to the configured endpoint.
