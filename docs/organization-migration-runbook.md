# GitHub organization migration runbook

This runbook prepares the transfer of `neonwatty/meme-search` to the standalone
[`meme-search`](https://github.com/meme-search) organization. It is a plan, not
authorization to transfer the repository.

## Invariants

- Keep the repository name `meme-search` during the transfer.
- Do not recreate `neonwatty/meme-search` after the transfer. Reusing the old
  location permanently removes GitHub's repository redirects.
- Preserve existing public container pull paths until an explicit compatibility
  and deprecation policy is published.
- Establish a stable custom domain for the project site before changing the
  GitHub Pages owner namespace.
- Change one public identity layer at a time and monitor it before proceeding.

## Current public entry points

- Repository: `https://github.com/neonwatty/meme-search`
- Legacy project site: `https://neonwatty.github.io/meme-search/` (permanently
  redirects to the custom domain)
- Canonical project site: `https://meme-search.neonwatty.com/` (valid HTTPS
  certificate, HTTPS enforcement enabled, and canonical metadata deployed)
- Rails image: `ghcr.io/neonwatty/meme_search`
- Generator image: `ghcr.io/neonwatty/image_to_text_generator`
- Releases, issues, pull requests, discussions, forks, stars, and watchers are
  attached to the core repository.

The public packages currently linked to the repository are classified as follows:

- Supported and actively published: `ghcr.io/neonwatty/meme_search` and
  `ghcr.io/neonwatty/image_to_text_generator`. Both track the current release
  series and are referenced by the current Compose file and publishing workflows.
- Legacy compatibility only: `ghcr.io/neonwatty/meme_search_pro` and
  `ghcr.io/neonwatty/meme-search`. Neither is referenced by the current runtime or
  publishing configuration. Keep both public and pullable during migration, but
  do not reproduce them in the organization namespace or advertise them as
  supported images.

## Preflight snapshot

Recorded before transfer and refreshed on August 31, 2026:

- The public repository has 12 releases, 15 tags, 719 stars, 27 forks, 3
  watchers, Discussions, and a workflow-published Pages site.
- All 12 Actions workflows are enabled. The repository permits all actions and
  does not require full-length commit SHA pinning.
- One repository Actions secret exists: `OPENAI_API_KEY`. There are no repository
  variables.
- The `github-pages` environment has a custom branch policy and no environment
  secrets or variables.
- The default branch is governed by one active ruleset. It blocks deletion and
  non-fast-forward pushes and requires pull requests, but currently requires no
  approving reviews or code-owner review.
- Secret scanning and push protection are enabled. Dependabot security updates
  are disabled.
- There are no webhooks or deploy keys. The only direct collaborator and
  assignable user is `neonwatty`.
- Four public Container registry packages are linked to the repository:
  `meme_search`, `image_to_text_generator`, `meme_search_pro`, and `meme-search`.
  The supported images both have `latest` and `v2.3.2` multi-architecture tags
  for `linux/amd64` and `linux/arm64`.
- The destination organization contains `.github` and `meme-search-unraid`. Its
  default repository permission is `none`, member repository creation is
  disabled, and `neonwatty` is currently its only member.
- The destination organization enables Actions for all repositories and permits
  all actions and reusable workflows. Full-length commit SHA pinning is not
  required, standard hosted runners are enabled, and first-time contributors
  require workflow approval.
- The organization's default `GITHUB_TOKEN` permission is read-only for contents
  and packages, and Actions cannot create or approve pull requests by default.
  Existing workflows already request job-level write scopes where needed.
- The target repository name `meme-search/meme-search` is available. There are no
  destination organization teams, GitHub App installations, or Container
  registry packages.
- The source repository has no webhooks or deploy keys. Its `github-pages`
  environment permits deployments from `main` and `landing-page`.
- The source repository's only Actions secret is `OPENAI_API_KEY`. The Discord
  release workflow references `DISCORD_RELEASE_WEBHOOK_URL`, but that secret is
  not configured and the latest successful run skipped the notification.
- The destination organization must not verify `meme-search.neonwatty.com`
  before the repository transfer. A pre-transfer verification test caused GitHub
  to detach the hostname from the personal repository and was removed. The TXT
  challenge remains published in Cloudflare so verification can be repeated
  immediately after the repository belongs to the organization.
- The repository and organization profile website fields still use the legacy
  Pages URL. Update both to the custom domain before the transfer window.

## Gate 1: stable website identity

Choose a custom domain controlled independently of a GitHub user or organization
name. Before transferring the repository:

1. Configure the custom domain on the existing Pages deployment.
2. Replace the current Pages URL in canonical metadata, Open Graph metadata,
   JSON-LD identifiers, the sitemap, robots references, internal links, release
   documentation, and site validation.
3. Verify the old and new properties in Google Search Console.
4. Submit the new sitemap.
5. Confirm that the old Pages URL permanently redirects to the custom domain.
6. Monitor indexing and organic traffic until the custom domain is the stable
   canonical location.

As of August 31, 2026, steps 1 through 5 are complete. Google Search Console has
processed `https://meme-search.neonwatty.com/sitemap.xml`, discovered the
homepage, and placed an explicit indexing request in its priority crawl queue.
The page is currently reported as "Discovered - currently not indexed," so step
6 remains open.

Do not transfer the repository while search engines still treat the account-bound
Pages URL as canonical.

Do not verify the Pages hostname under the destination organization while the
repository still belongs to the personal account. GitHub restricts a verified
hostname to repositories owned by the verifying account, so doing this early
automatically detaches the hostname and serves a Pages 404. The current DNS-only
CNAME points to `neonwatty.github.io`. During the cutover, transfer the repository
first, verify the hostname for the organization, change the CNAME to
`meme-search.github.io`, reattach the custom domain, and dispatch the Pages
workflow. GitHub redirects repository and Git URLs after a transfer, but does not
redirect the Pages site itself.

## Gate 2: container publishing continuity

GitHub Container Registry packages are account-scoped and do not automatically
change owners with a repository transfer. For the Container registry, the
packages remain under `neonwatty`, their repository link is removed, and the
transferred repository's workflows lose package access until it is explicitly
restored. Before transferring:

1. Record each linked package, visibility, repository link, Actions access, and
   active tags. Run `scripts/inventory_ghcr_packages.sh neonwatty` immediately
   before transfer and retain its output with the transfer record.
2. Confirm the supported-versus-legacy classification above still matches the
   repository's runtime and publishing configuration.
3. Grant the transferred repository explicit Actions access to the active
   `neonwatty` packages, or configure a narrowly scoped compatibility credential.
4. Test an authenticated staging publication with the same mechanism the release
   workflow will use after transfer.
5. Decide whether organization-scoped image names will be introduced in parallel.
6. If new names are introduced, publish both names for a documented compatibility
   period; do not silently break existing Compose installations.

The preferred long-term shape is dual publication to the existing personal
namespace and `ghcr.io/meme-search/...`, followed by a separately announced
deprecation period. Existing Compose files must continue pulling the personal
namespace until the organization packages have been exercised in a real release.

The current build and release workflows derive the image namespace from
`github.repository_owner`. After transfer they will therefore target the new
organization namespace, while `docker-compose.yml` will continue pulling the
supported personal namespace. Do not transfer until a staging publication proves
that the organization images can be published and the compatibility publication
path for the personal images is authenticated and working.

## Gate 3: repository and organization readiness

Before the transfer:

- Keep at least one verified owner with recovery access to the organization.
- Prefer a second recovery owner before enforcing organization-wide two-factor
  authentication.
- Confirm organization Actions policy permits every action used by current
  workflows.
- Confirm the `OPENAI_API_KEY` repository secret is still present after transfer
  without exposing or rotating its value unnecessarily.
- Confirm Pages, Discussions, private vulnerability reporting, branch rules,
  environments, secrets, webhooks, deploy keys, and installed GitHub Apps.
- Export or record the current settings needed for comparison after transfer.
- Announce a short maintenance window and avoid merging unrelated release changes
  during it.

## Current go/no-go status

Status on August 31, 2026: **NO-GO for transfer; preflight is otherwise healthy.**

Open gates:

1. Google has discovered but not yet indexed the custom-domain homepage or
   selected it as canonical.
2. GHCR dual-publication or another tested compatibility mechanism is not yet in
   place for the supported personal image paths.

Non-blocking follow-ups:

- Change the repository homepage and organization website to
  `https://meme-search.neonwatty.com/`.
- Decide whether to configure `DISCORD_RELEASE_WEBHOOK_URL` or formally keep
  Discord release notifications disabled.
- Add a second recovery owner before enabling organization-wide two-factor
  authentication.
- Update current-code repository links after the transfer redirects have been
  verified; historical release notes may remain unchanged.

## Transfer procedure

1. Re-run the current test and site-validation suites on `main`.
2. Verify the custom domain and all active GHCR images immediately before transfer.
3. Transfer `neonwatty/meme-search` to `meme-search` without renaming it.
4. Confirm `https://github.com/neonwatty/meme-search` redirects to
   `https://github.com/meme-search/meme-search`.
5. Verify `meme-search.neonwatty.com` in the destination organization's Pages
   settings using the TXT challenge already published in Cloudflare.
6. Change the DNS-only CNAME for `meme-search.neonwatty.com` from
   `neonwatty.github.io` to `meme-search.github.io`.
7. Reconfigure Pages immediately while retaining the custom domain, enforce
   HTTPS, and dispatch the Pages workflow.
8. Restore or grant Actions access to every active package and run the staged
   compatibility publication.
9. Compare the transferred repository against the preflight snapshot above.
10. Update local remotes and the repository's internal links after redirect
   verification.

## Post-transfer verification

Verify all of the following from an unauthenticated session where applicable:

- old and new repository URLs;
- clone and fetch through the old Git URL;
- releases, issues, pull requests, discussions, forks, stars, and watchers;
- organization and repository profile links;
- custom-domain Pages deployment, HTTPS, canonical metadata, sitemap, and assets;
- Actions permissions, environments, secrets, and scheduled workflows;
- anonymous pulls of all supported container tags;
- a staging image publication from the transferred repository;
- Dependabot, security advisories, and private vulnerability reporting;
- external documentation, badges, package metadata, and application UI links.

Monitor repository referrals, Pages analytics, Search Console indexing, release
downloads, image pulls, and support reports after the transfer.

## Deferred updates

Hard-coded `neonwatty/meme-search` repository links continue to work through
GitHub redirects and should be updated after the transfer is verified. Historical
release notes may remain unchanged when preserving their original context is more
useful than rewriting them.
