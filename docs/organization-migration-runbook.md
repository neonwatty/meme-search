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
- Existing canonical project site: `https://neonwatty.github.io/meme-search/`
- Configured custom domain: `https://meme-search.neonwatty.com/` (certificate
  issuance and canonical cutover are still pending)
- Rails image: `ghcr.io/neonwatty/meme_search`
- Generator image: `ghcr.io/neonwatty/image_to_text_generator`
- Releases, issues, pull requests, discussions, forks, stars, and watchers are
  attached to the core repository.

Additional public packages currently linked to the repository must be classified
before transfer:

- `ghcr.io/neonwatty/meme_search_pro`
- `ghcr.io/neonwatty/meme-search`

## Preflight snapshot

Recorded before transfer on August 29, 2026:

- The public repository has 12 releases, 15 tags, 29 forks, Discussions, and a
  workflow-published Pages site.
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
- The destination organization contains `.github` and `meme-search-unraid`. Its
  default repository permission is `none`, member repository creation is
  disabled, and `neonwatty` is currently its only member.
- Organization Actions policy could not be read with the current API token and
  must be confirmed in the organization settings before transfer.

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

Do not transfer the repository while search engines still treat the account-bound
Pages URL as canonical.

## Gate 2: container publishing continuity

GitHub Container Registry packages are account-scoped and do not automatically
change owners with a repository transfer. For the Container registry, the
packages remain under `neonwatty`, their repository link is removed, and the
transferred repository's workflows lose package access until it is explicitly
restored. Before transferring:

1. Record each linked package, visibility, repository link, Actions access, and
   active tags.
2. Classify the two legacy or special-purpose packages listed above.
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

## Transfer procedure

1. Re-run the current test and site-validation suites on `main`.
2. Verify the custom domain and all active GHCR images immediately before transfer.
3. Transfer `neonwatty/meme-search` to `meme-search` without renaming it.
4. Confirm `https://github.com/neonwatty/meme-search` redirects to
   `https://github.com/meme-search/meme-search`.
5. Reconfigure Pages immediately while retaining the custom domain.
6. Restore or grant Actions access to every active package.
7. Compare the transferred repository against the preflight snapshot above.
8. Update local remotes and the repository's internal links after redirect
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
