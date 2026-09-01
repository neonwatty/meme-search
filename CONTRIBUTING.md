# Contributing to Meme Search

Thanks for helping improve Meme Search. Bug reports, documentation fixes, tests, and focused feature pull requests are welcome.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security-sensitive findings privately using the process in [SECURITY.md](SECURITY.md).

## Before opening an issue

- Search existing [issues](https://github.com/meme-search/meme-search/issues) and [discussions](https://github.com/meme-search/meme-search/discussions).
- Use the bug report form for reproducible defects and include the Meme Search version, host platform, Docker/Compose version, relevant logs, and provider/model.
- Remove API keys, private paths, image contents, and other sensitive information from logs.
- Use Discussions for support questions and early feature ideas.

## Development setup

Fork and clone the repository, then create a focused branch:

```sh
git clone https://github.com/YOUR_USERNAME/meme-search.git
cd meme-search
git checkout -b fix/short-description
```

The project uses Ruby 3.4.2, Python 3.12, Node.js 20, and PostgreSQL 17 with pgvector. [mise](https://mise.jdx.dev/) can install the language runtimes:

```sh
mise install
```

PostgreSQL normally runs through Docker. See [CLAUDE.md](CLAUDE.md) for the current service-specific development commands while the neutral development guide is expanded.

## Tests

Run the repository's CI-equivalent checks:

```sh
bash scripts/run_all_ci_tests.sh
```

For a focused Rails change:

```sh
cd meme_search/meme_search_app
bundle exec rails test
bin/rubocop
bin/brakeman -w3 --no-pager
```

For a focused image-to-text service change:

```sh
cd meme_search/image_to_text_generator
python -m pytest tests/unit tests/test_app.py
ruff check app tests
```

Changes to Docker, persistence, cross-service communication, or the image-processing pipeline must also run the Docker E2E suite:

```sh
npm ci
npm run test:e2e:docker
```

The Docker E2E suite is resource intensive and does not currently run in GitHub Actions, so include its result in the pull request description.

## Pull requests

- Keep the change focused and explain the user-visible behavior.
- Add or update tests for behavior changes and bug fixes.
- Update README, configuration examples, and release notes when the user workflow changes.
- Avoid drive-by formatting or unrelated dependency changes.
- Complete the pull request checklist and link the issue being resolved.

A maintainer will review the pull request and may ask for changes. Please keep the branch available until the review is complete.
