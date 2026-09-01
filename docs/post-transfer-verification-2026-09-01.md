# Post-transfer verification — September 1, 2026

The `neonwatty/meme-search` repository was transferred without renaming it and
is now `meme-search/meme-search`.

## Repository identity

- `https://github.com/neonwatty/meme-search` returns a permanent redirect to
  `https://github.com/meme-search/meme-search`.
- Clone and fetch operations through both the old and new Git URLs resolve to
  commit `8d100a25ae08621ccf7b232a2005a957beaba23a`.
- The transferred repository remains public with 719 stars, 27 forks, 3
  subscribers, 12 releases, and Discussions enabled.
- The local `origin` remote now uses
  `https://github.com/meme-search/meme-search.git`.
- The repository homepage now uses the stable custom domain,
  `https://meme-search.neonwatty.com/`.
- Do not recreate `neonwatty/meme-search`; doing so would remove GitHub's
  transfer redirect.

## Pages and DNS

- Public Pages creation is enabled for the organization.
- `meme-search.neonwatty.com` is verified in the organization's Pages settings.
- The authoritative DNS-only CNAME points to `meme-search.github.io`.
- The Pages deployment is built, its certificate is approved, and HTTPS is
  enforced.
- `https://meme-search.neonwatty.com/` returns HTTP 200.
- Both account-bound Pages URLs redirect to the stable custom domain:
  `https://neonwatty.github.io/meme-search/` and
  `https://meme-search.github.io/meme-search/`.
- The new CNAME was confirmed through the authoritative nameserver, Cloudflare's
  public resolver, and Google's public resolver after the prior TTL expired.

## Preserved settings and packages

- Repository secrets `OPENAI_API_KEY` and `GHCR_COMPAT_TOKEN` are present.
- The `github-pages` environment and active `main protection` ruleset remain.
- Secret scanning and push protection, which GitHub disabled during transfer,
  were restored immediately.
- The organization enforces a read-only default `GITHUB_TOKEN`. Workflows that
  publish Pages, releases, or containers declare their required write
  permissions explicitly, so the more restrictive organization default is
  retained.
- The organization packages `meme_search` and `image_to_text_generator` remain
  public with `latest` and `v2.3.2` tags.
- Anonymous inspection succeeds for both organization images and both legacy
  personal-namespace images.
- The transferred repository has explicit write access to both organization
  packages.
- Post-transfer dual-publication completed successfully for the
  [Rails image](https://github.com/meme-search/meme-search/actions/runs/33521011746)
  and the
  [image-to-text service](https://github.com/meme-search/meme-search/actions/runs/33521015481).

## Follow-up monitoring

- Complete the Priority 1 referral corrections recorded in
  `docs/referral-outreach-inventory-2026-09-01.md`.
- Monitor repository referrals, Search Console indexing, Pages availability,
  release downloads, container pulls, and support reports.
