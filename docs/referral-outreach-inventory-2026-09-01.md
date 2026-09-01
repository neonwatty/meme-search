# Referral and backlink outreach inventory — September 1, 2026

This inventory prepares external URL corrections for the transfer from
`https://github.com/neonwatty/meme-search` to
`https://github.com/meme-search/meme-search`. Do not request or publish these
changes until the transfer is complete and the old GitHub URL redirects.

## Recent referral evidence

GitHub's rolling referral report covers only the most recent 14 days. At capture
time, the leading sources were Google (44 visits), GitHub (25), Bing (12), Reddit
(11 across web and app referrals), Brave Search (6), the legacy Pages hostname
(5), ChatGPT (5), DuckDuckGo (1), and `blog.holtzweb.com` (1).

Search engines, ChatGPT, GitHub-internal traffic, and the legacy Pages hostname
do not need direct outreach. Google already indexes the stable custom domain as
canonical. Reddit links and normal GitHub links will continue through GitHub's
permanent repository redirect.

## Priority 1 — correct immediately after transfer

### Awesome Self-Hosted

- Public listing: `https://awesome-selfhosted.net`
- Source record:
  `https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/software/meme-search.yml`
- Current references: both `website_url` and `source_code_url` point to the old
  repository.
- Correction channel: submit a focused pull request to
  `awesome-selfhosted/awesome-selfhosted-data` changing both fields to the new
  repository URL. Its generated GitHub README and HTML site should then update
  from the source record.
- Do not contact downstream Awesome Self-Hosted mirrors individually; they are
  generated copies and should inherit the upstream correction.

Suggested pull-request title: `Update Meme Search repository URL`

Suggested description:

> Meme Search moved from a personal account to its project organization. This
> updates the website and source URLs to the new canonical repository. GitHub's
> redirect from the previous URL is active, and the project name and licensing
> are unchanged.

### selfh.st/apps

- Directory: `https://selfh.st/apps`
- Public data evidence:
  `https://github.com/selfhst/cdn/blob/main/directory/software.json`
- Current references: repository `github.com/neonwatty/meme-search` and legacy
  website `neonwatty.github.io/meme-search/`.
- Requested values: repository `github.com/meme-search/meme-search` and website
  `meme-search.neonwatty.com/`.
- Correction channel: `hello@selfh.st`, as documented by the directory's About
  page, or the contact page at `https://selfh.st/contact/`.
- The July 19, 2024 newsletter mention is historical content and does not need to
  be rewritten.

Suggested message:

> Hi Ethan — I'm the maintainer of Meme Search. We moved the repository from
> `github.com/neonwatty/meme-search` to
> `github.com/meme-search/meme-search`. Would you update the Meme Search entry in
> selfh.st/apps to use the new repository and
> `https://meme-search.neonwatty.com/` as its website? The old repository URL now
> redirects, and the project name and license are unchanged. Thanks!

### selfhost.directory

- Listing: `https://selfhost.directory/project/meme-search`
- Current references: its source link, structured data, and clone/install
  commands use the old repository; its project website still uses the legacy
  Pages URL.
- Requested values: new repository URL and
  `https://meme-search.neonwatty.com/` for the project website.
- Correction channel: use the listing's **Report an issue** control or the
  contact form in its footer. Its public repository is
  `https://github.com/turhobr/selfhost.directory` if an issue is preferable.

Suggested message:

> Hi — I'm the maintainer of Meme Search. The project has moved to
> `https://github.com/meme-search/meme-search`, and its stable website is
> `https://meme-search.neonwatty.com/`. Could you update the source link,
> structured metadata, and clone commands on the Meme Search listing? The old
> GitHub URL redirects and no install behavior changed. Thank you.

### Holtzweb blog

- Referring article source:
  `https://github.com/MarcusHoltz/marcusholtz.github.io/blob/main/_posts/2025-06-30-complete-immich-docker-setup-guide-configuration.md`
- Current reference: one `Meme-search` link points to the old repository.
- Why prioritized: `blog.holtzweb.com` appears in the current GitHub referral
  report rather than only in backlink search results.
- Correction channel: a one-line pull request to the public source repository,
  or an issue if the author prefers.

Suggested pull-request title: `Update Meme Search repository link`

Suggested description:

> Meme Search moved to its project organization. This replaces the old source
> link with the new canonical repository; the old URL remains redirected.

## Priority 2 — useful curated corrections

### DailyFOSS

- Source record:
  `https://github.com/dailyfoss/dailyfoss.github.io/blob/main/public/json/meme-search.json`
- Current references: `source_code`, `issues`, and `releases` use the old
  repository. The record also contains stale release and activity metadata.
- Correction channel: submit a pull request updating the three URL fields. Let
  the site's normal metadata process refresh version and activity fields unless
  its contribution instructions explicitly require them in the same change.

### DEV.co and SourcePulse

- Listings:
  `https://dev.co/ai/vector-databases/meme-search` and
  `https://www.sourcepulse.org/projects/1841681`.
- Both identify the project by its old GitHub owner and URL. They appear to be
  generated catalog pages and are not present in the current referral report.
- Action: recheck them after the transfer. Contact them only if the old identity
  remains after their next normal crawl; GitHub's redirect may update their
  source automatically.

## Redirect-only or no-outreach references

- Existing Reddit launch posts: preserve the historical posts. Their links will
  redirect, and Reddit is a modest but active referral source.
- `newreleases.io`, SourcePulse-style catalogs, star-list repositories, archived
  RSS captures, and repository-knowledge datasets: allow redirect/crawler
  refresh first.
- Awesome Self-Hosted HTML exports, translations, weekly snapshots, and forks:
  update the upstream data record rather than contacting every mirror.
- Third-party Docker Compose files using `ghcr.io/neonwatty/...`: these are image
  compatibility consumers, not repository backlink corrections. The migration's
  dual-publication plan covers them separately.

## Post-transfer tracking

For every Priority 1 target, record the date contacted, correction URL or pull
request, and completion date. Recheck the Priority 2 pages after seven days.
Keep the old GitHub repository URL unclaimed so GitHub's redirect remains intact.

| Target | Submitted | Correction | Status |
| --- | --- | --- | --- |
| Awesome Self-Hosted | — | Manual two-line source update required | Not submitted; its contribution rules prohibit machine/LLM-generated contributions |
| selfh.st/apps | 2026-09-01 | [selfhst/cdn issue #1](https://github.com/selfhst/cdn/issues/1) | Open |
| selfhost.directory | 2026-09-01 | [selfhost.directory issue #2](https://github.com/turhobr/selfhost.directory/issues/2) | Open |
| Holtzweb blog | 2026-09-01 | [marcusholtz.github.io PR #1](https://github.com/MarcusHoltz/marcusholtz.github.io/pull/1) | Open |
| DailyFOSS | 2026-09-01 | [dailyfoss.github.io PR #190](https://github.com/dailyfoss/dailyfoss.github.io/pull/190) | Open |
