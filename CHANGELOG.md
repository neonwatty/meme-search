# Change Log

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-11-03

Testing infrastructure and quality improvements:

- **Playwright E2E Testing**: Complete migration from Capybara to Playwright
  - 16 E2E tests with 100% passing rate (vs 13/15 with Capybara)
  - Zero flakiness (vs 13% flakiness rate with Capybara)
  - Better debugging with traces and time-travel inspector
  - Page Object Model pattern for improved maintainability
  - Full CI/CD integration with browser caching
- **Rails 8 Upgrade**: Updated from Rails 7.2 to 8.0.4 with optimized configuration
- **Development Tools**: Added mise for consistent development environment (Ruby 3.4.2, Python 3.12, Node 20)
- **Testing Infrastructure**: New rake tasks for E2E test database management
- **Code Cleanup**: Removed Capybara and Selenium dependencies (614 lines of code removed)
- **Documentation**: Comprehensive testing documentation in `playwright/README.md` and `CLAUDE.md`

Technical improvements:
- Enhanced CI pipeline with Playwright browser caching (saves 1-2 minutes per run)
- Test database seeding for isolated E2E tests
- Detailed test coverage comparison documentation

## 2025-2-15

Quality of life updates to the Pro version including:

- you can now [customize hosts names and ports](https://github.com/neonwatty/meme-search/tree/main?tab=readme-ov-file#custom-hosts-and-ports) for easier usage with NAS, Portainer, Unraid, or if you just need to customize! 
- 4 new image to text new models added ranging in size from 200M to 2B parameters: florence-2-base (new default), florence-2-large, smolvlm-256, smolvlm-500
- new model selection panel added in the pro app Settings so you select or change your image-to-text model
- moondream2 to current revision
- new test database added to image-to-text service for more comprehensive testing
- new [local docker compose files added](https://github.com/neonwatty/meme-search/tree/main?tab=readme-ov-file#building-the-app-locally-with-docker) for easier local building and testing
- gh action test and build scripts refactored for easier (local) testing


## 2025-1-30

Quality of life updates to the Pro version of Meme Search, including:

- bugfixes in the image-to-text service that makes cancelling failed jobs more reliable
- new custom ports / hosts options to more easily run the pro app with tools like Unraid and Portainer, or if you need to run its services on different ports / hosts
- new local build compose file for building and testing locally `docker-compose-pro-local-build.yml`
- new `grid view` in both home and search pages for a broader view of your memes (see animation below)

<p align="center">
<img align="center" src="https://github.com/jermwatt/readme_gifs/blob/main/meme-search-grid-view-medium.webp" height="225">
</p>

Administrative updates including:

- new github actions for building and pushing the pro app and image-to-text module images to the github container registry
- weights have been removed from the image-to-text image for a smaller image size

## 2024-11-08

New Pro Version 1.0 Release!

The Pro version of Meme Search introduces the following new features:

1.  **Auto-Generate Meme Descriptions**

    Target specific memes for auto-description generation (instead of applying to your entire directory).

2.  **Manual Meme Description Editing**

    Edit or add descriptions manually for better search results, no need to wait for auto-generation if you don't want to.

3.  **Tags**

    Create, edit, and assign tags to memes for better organization and search filtering.

4.  **Faster Vector Search**

    Powered by Postgres and pgvector, enjoy faster keyword and vector searches with streamlined database transactions.

5.  **Keyword Search**

    Pro adds traditional keyword search in addition to semantic/vector search.

6.  **Directory Paths**

    Organize your memes across multiple subdirectories—no need to store everything in one folder.

7.  **New Organizational Tools**

    Filter by tags, directory paths, and description embeddings, plus toggle between keyword and vector search for more control.

## 2024-07-24

Version 1.1.3 released with a range of great updates to docker version of app

- Ability to use Nvidia GPU inside Docker Container added to compose file + other helpful cleanup from @thijsvanloef
- new action for docker build / docker-compose now pulls image from ghcr repo by default thanks to @jasonyang-ee
- docker build size roughly cut in half thanks to staged build commit by @StroescuTheo

## 2024-07-17

### Added

- Core tests added for query, imgs modules, add images re-indexing, remove image re-indexing

- A new "refresh index" button has been introduced to update the index when images are added or removed from the data/input image directory, affecting only the newly added or removed images.

<p align="center">
<img align="center" src="https://github.com/jermwatt/readme_gifs/blob/main/meme_search_refresh_button.gif" height="200">
</p>
