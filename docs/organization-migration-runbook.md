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
- Project site: `https://neonwatty.github.io/meme-search/`
- Rails image: `ghcr.io/neonwatty/meme_search`
- Generator image: `ghcr.io/neonwatty/image_to_text_generator`
- Releases, issues, pull requests, discussions, forks, stars, and watchers are
  attached to the core repository.

Additional public packages currently linked to the repository must be classified
before transfer:

- `ghcr.io/neonwatty/meme_search_pro`
- `ghcr.io/neonwatty/meme-search`

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
change owners with a repository transfer. Before transferring:

1. Record each linked package, visibility, repository link, Actions access, and
   active tags.
2. Classify the two legacy or special-purpose packages listed above.
3. Verify how the transferred repository will retain write access to the active
   `neonwatty` packages.
4. Test an authenticated staging publication with the same mechanism the release
   workflow will use after transfer.
5. Decide whether organization-scoped image names will be introduced in parallel.
6. If new names are introduced, publish both names for a documented compatibility
   period; do not silently break existing Compose installations.

## Gate 3: repository and organization readiness

Before the transfer:

- Keep at least one verified owner with recovery access to the organization.
- Prefer a second recovery owner before enforcing organization-wide two-factor
  authentication.
- Confirm organization Actions policy permits every action used by current
  workflows.
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
7. Update local remotes and the repository's internal links after redirect
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
