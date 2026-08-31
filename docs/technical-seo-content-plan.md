# Technical SEO content plan

The GitHub Pages site intentionally remains a focused, single-page project overview. The following supporting pages are candidates only when there is enough original material to answer a distinct search intent; thin copies of README sections should not be published.

## Priorities

1. **Local AI meme search guide** — Explain the indexing pipeline, semantic versus keyword search, privacy boundaries, and the path from an image to a result. Link to the relevant source modules for readers who want implementation detail.
2. **Vision model comparison** — Compare the supported Florence-2, SmolVLM, and Moondream variants using maintained hardware requirements, expected tradeoffs, and a reproducible selection rubric. Keep model facts synchronized with the application and README.
3. **Security and privacy architecture** — Document what stays local, what leaves the host when an optional OpenAI-compatible provider is enabled, and safe patterns for remote access. Link to `SECURITY.md` and the configuration reference.
4. **Release highlights** — Add a durable, user-oriented release index only if it can be generated or routinely maintained from release notes without duplicating the changelog.

## Guardrails

- Do not create NAS-specific deployment content here; that belongs to the separate NAS initiative.
- Do not create translated or Chinese-language documentation here; that belongs to the separate localization initiative.
- Every published page must have a unique title, description, canonical URL, social metadata, and a sitemap entry on the custom-domain origin.
- Add reciprocal, descriptive links between the landing page and each supporting page.
- Publish only content with a named maintainer or a reliable synchronization check; stale model and deployment details are worse than a smaller site.

## GitHub Pages deployment note

The custom domain publishes `site/robots.txt` at the origin-level `/robots.txt`, where the Robots Exclusion Protocol discovers it. It allows the full site and advertises the custom-domain sitemap. The landing page also carries explicit page-level indexing directives.
