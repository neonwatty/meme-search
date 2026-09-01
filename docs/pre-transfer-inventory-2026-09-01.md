# Pre-transfer inventory — September 1, 2026

This snapshot records the final state of `neonwatty/meme-search` before its
planned transfer to `meme-search/meme-search`. It contains secret names but no
secret values.

## Repository

- Public, unarchived repository with default branch `main`.
- 719 stars, 27 forks, 3 watchers, 12 releases, and 15 tags.
- Issues, Projects, Wiki, and Discussions are enabled.
- Repository homepage field: `https://neonwatty.github.io/meme-search/`.
- Custom-domain project site: `https://meme-search.neonwatty.com/`.
- No webhooks or deploy keys.
- Twelve Actions workflows are enabled.
- Repository Actions allow all actions; the default `GITHUB_TOKEN` permission is
  write, but Actions cannot approve pull-request reviews.
- Actions secrets: `OPENAI_API_KEY` and `GHCR_COMPAT_TOKEN`.
- No repository Actions variables.
- The `github-pages` environment restricts deployment through a custom branch
  policy.

## Protection and security

- Active `main protection` ruleset targets the default branch.
- Branch deletion and non-fast-forward pushes are blocked.
- Pull requests are required; zero approving reviews and no code-owner review
  are currently required.
- Secret scanning and push protection are enabled.
- Dependabot security updates are disabled.
- Private vulnerability reporting is disabled.

## Pages and search identity

- Pages build type: GitHub Actions workflow.
- Custom domain: `meme-search.neonwatty.com`.
- HTTPS is enforced and the current Pages deployment is built.
- `https://neonwatty.github.io/meme-search/` returns a permanent redirect to
  `https://meme-search.neonwatty.com/`.
- The custom-domain page declares itself canonical.
- Google Search Console reports the custom-domain URL indexed. Both the
  user-declared and Google-selected canonical are the inspected custom-domain
  URL.
- `https://meme-search.neonwatty.com/sitemap.xml` was submitted and successfully
  read on August 31, 2026, with one discovered page.

## Destination organization

- Organization: `meme-search`.
- Existing repositories: `.github` and `meme-search-unraid`.
- Default repository permission is `none`; member repository creation is
  disabled.
- Organization-wide two-factor authentication is not enforced.
- Target repository name `meme-search/meme-search` is available.

## Container registry

Supported personal-namespace packages:

| Package | Visibility | Active tags | Current digest | Platforms |
| --- | --- | --- | --- | --- |
| `ghcr.io/neonwatty/meme_search` | public | `latest`, `v2.3.2` | `sha256:e303174bbdcd8cdefb6a9f22d82f14acafa91cbf0719ebae20f33a82a3ecb136` | `linux/amd64`, `linux/arm64` |
| `ghcr.io/neonwatty/image_to_text_generator` | public | `latest`, `v2.3.2` | `sha256:ea1b4d1fa0d37aa2f23d10de32d0538e33b7fd7703dd7b8682ea7c1425884296` | `linux/amd64`, `linux/arm64` |

Both remain linked to `neonwatty/meme-search`. The legacy public packages
`meme_search_pro` and `meme-search` remain pullable but are not reproduced in
the organization namespace.

Seeded destination packages:

| Package | Visibility | Seeded tags | Verified digest |
| --- | --- | --- | --- |
| `ghcr.io/meme-search/meme_search` | public | `latest`, `v2.3.2` | `sha256:e303174bbdcd8cdefb6a9f22d82f14acafa91cbf0719ebae20f33a82a3ecb136` |
| `ghcr.io/meme-search/image_to_text_generator` | public | `latest`, `v2.3.2` | `sha256:ea1b4d1fa0d37aa2f23d10de32d0538e33b7fd7703dd7b8682ea7c1425884296` |

Anonymous inspection of all four seeded tags succeeded. Post-transfer workflows
will publish to the organization namespace and conditionally preserve the
personal namespace using `GHCR_COMPAT_TOKEN`. That token expires November 29,
2026 and must be rotated or removed by then.

## Final validation

- The complete hosted Rails workflow passed on September 1, 2026:
  [Actions run 33509324640](https://github.com/neonwatty/meme-search/actions/runs/33509324640).
- All eight jobs passed, including the PostgreSQL-backed model, controller,
  service, API contract, migration, channel, and Rake task suites and the full
  Playwright end-to-end suite.
- Local Python validation passed 8 integration tests and 123 unit tests with
  87.42% coverage.
- Local validation also passed Brakeman, importmap audit, RuboCop, site metadata,
  OpenAPI 3.1, root dependency audit, TypeScript, Discord link, Compose database
  and persistence checks, CI database wiring, 24 CLI tests, and 23 browser
  extension tests plus static checks.
- `git diff --check` passed for the migration documentation changes.

## Cutover boundary

This inventory and the GO status do not authorize the transfer. Obtain explicit
approval immediately before transferring ownership, then perform the Pages,
domain-verification, DNS, Actions, and package checks in the migration runbook
without delay.
