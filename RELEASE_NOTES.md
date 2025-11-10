# Meme Search 2.0.0 Release Notes

**Release Date**: November 3, 2025

This is a major release featuring Rails 8 upgrade, complete E2E testing migration to Playwright, and significant infrastructure improvements.

## Overview

Version 2.0.0 represents a major modernization of the Meme Search application, upgrading core dependencies and completely overhauling the testing infrastructure. This release focuses on stability, developer experience, and long-term maintainability.

## Breaking Changes

### Rails 8.0.4 Upgrade
- Upgraded from Rails 7.2.x to Rails 8.0.4
- **Impact**: Deployment configurations may need updates for Rails 8 compatibility
- **Migration**: Review `config/` directory changes and update production environments accordingly

### Ruby 3.4.2 Required
- Minimum Ruby version is now 3.4.2 (previously 3.3.x)
- **Impact**: Deployment environments must upgrade Ruby version
- **Migration**: Use mise, rbenv, or rvm to install Ruby 3.4.2

### Capybara Removed
- Completely removed Capybara and Selenium WebDriver dependencies
- All system tests migrated to Playwright
- **Impact**: No functional changes for users; developers must use Playwright for E2E testing
- **Migration**: See `playwright/README.md` for testing documentation

## Major Features

### 🎭 Playwright E2E Testing Framework
Complete migration from Capybara to Playwright with significant improvements:

**Test Coverage**:
- 16 E2E tests (100% passing rate)
- +1 test vs Capybara (enhanced filter coverage)
- 0% flakiness rate (vs 13% with Capybara)
- Zero timeout issues

**Developer Experience**:
- Time-travel debugging with traces
- Interactive UI mode for test development
- Built-in code generator (`npx playwright codegen`)
- Full TypeScript support with type safety

**Test Organization**:
- Page Object Model pattern for maintainability
- Centralized test utilities in `playwright/utils/`
- Dedicated page objects in `playwright/pages/`
- CI/CD integration with browser caching

**Test Files**:
- `playwright/tests/image-to-texts.spec.ts` - Model selection (3 tests)
- `playwright/tests/tag-names.spec.ts` - Tag CRUD (1 test)
- `playwright/tests/image-paths.spec.ts` - Directory management (1 test)
- `playwright/tests/image-cores.spec.ts` - Image operations (2 tests)
- `playwright/tests/search.spec.ts` - Search functionality (3 tests)
- `playwright/tests/index-filter.spec.ts` - Filter UI (6 tests)

### 🔧 Development Environment with Mise
New standardized development environment setup:

**Version Management**:
- Automatic tool version switching on directory change
- Ruby 3.4.2, Python 3.12, Node.js 20 LTS
- Consistent versions across all developers
- Eliminates "works on my machine" issues

**Configuration**:
- `.mise.toml` - Main configuration file
- `.tool-versions` - Backward compatibility with asdf
- Automatic activation when entering project directory

**Commands**:
```bash
mise install              # Install all required tools
mise doctor              # Verify setup
mise exec -- command     # Run command with mise tools
```

### 📊 Enhanced Test Infrastructure

**Rails Test Utilities**:
- New rake tasks: `db:test:reset_and_seed`, `db:test:seed`, `db:test:clean`
- Automated database isolation between E2E tests
- Test fixtures for all models
- Coverage reporting with SimpleCov

**Python Test Suite**:
- 4 new unit test files covering core functionality
- Comprehensive mocking for external dependencies
- pytest-cov integration with 70% coverage threshold
- HTML coverage reports in `htmlcov/`

**CI/CD Improvements**:
- Playwright browser caching (saves 1-2 minutes per run)
- Parallel test execution where possible
- Asset precompilation in CI pipeline
- PostgreSQL connection fixes for CI environment

## Technical Improvements

### Code Quality
- **Removed**: 614 lines of Capybara/Selenium code
- **Added**: 2,310 lines of Playwright test infrastructure
- **Net Result**: More maintainable, type-safe test code

### Performance
- Faster E2E test execution (Playwright > Capybara)
- CI pipeline optimization with browser caching
- Reduced flakiness leading to fewer re-runs

### Documentation
- Comprehensive `playwright/README.md` (100+ lines)
- Updated `CLAUDE.md` with Playwright patterns
- Test coverage comparison documentation
- Rails 8 upgrade notes archived in `/plans`

## Test Statistics

### Overall Coverage
- **Rails**: 20+ unit tests (models, controllers, channels)
- **Python**: 8+ integration/unit tests
- **E2E**: 16 Playwright tests (100% passing)
- **Docker E2E**: 7 smoke tests (85% passing)

### E2E Test Comparison
| Metric | Capybara | Playwright | Change |
|--------|----------|------------|--------|
| Total Tests | 15 | 16 | +1 ✅ |
| Passing | 13 | 16 | +3 ✅ |
| Flaky | 2 (13%) | 0 (0%) | -2 ✅ |
| Timeout Issues | Yes | No | ✅ |
| Debugging | Limited | Excellent | ✅ |

## Migration Guide

### For Developers

**1. Install Mise**:
```bash
# macOS
brew install mise

# Add to shell profile (~/.zshrc or ~/.bashrc)
eval "$(mise activate zsh)"
```

**2. Install Project Tools**:
```bash
cd /path/to/meme-search
mise trust
mise install
```

**3. Verify Setup**:
```bash
mise doctor
ruby --version   # Should show 3.4.2
python --version # Should show 3.12.x
node --version   # Should show 20.x
```

**4. Run E2E Tests**:
```bash
# Install Playwright browsers (one-time)
npx playwright install --with-deps chromium

# Run tests
npm run test:e2e         # Headless mode
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug   # Step-through debugging
```

### For Deployment

**1. Update Ruby Version**:
- Update Dockerfile or deployment config to Ruby 3.4.2
- Rebuild Docker images

**2. Update Rails**:
- Rails 8.0.4 is backward compatible for most use cases
- Review `config/application.rb` and `config/environments/` for new defaults
- Test thoroughly in staging environment

**3. Database**:
- No schema changes required
- PostgreSQL with pgvector extension still required

**4. Environment Variables**:
- No new environment variables required
- Existing `.env` configuration still works

## Known Issues

### Docker E2E Tests
- 1 failing test out of 7 smoke tests (85% passing)
- Issue: Python worker initialization timing
- Workaround: Tests run successfully on retry
- Tracking: See `playwright-docker/README.md` for status

### CI Environment
- First Playwright run downloads browsers (~200MB)
- Subsequent runs use cache (fast)
- Ensure sufficient disk space in CI runners

## Upgrade Path

### From 1.x to 2.0.0

**Required Steps**:
1. Upgrade Ruby to 3.4.2
2. Run `bundle update rails` (will update to 8.0.4)
3. Run `rails app:update` to update configuration files
4. Review and merge configuration changes
5. Run full test suite to verify compatibility
6. Deploy to staging for testing
7. Deploy to production

**Optional Steps**:
1. Install mise for consistent development environment
2. Set up Playwright for local E2E testing
3. Review new test patterns in `playwright/` directory

## Contributors

This release was made possible by extensive testing and iteration to ensure a smooth Rails 8 upgrade path while modernizing the testing infrastructure.

## Support

- **Documentation**: See `README.md`, `CLAUDE.md`, and `playwright/README.md`
- **Issues**: https://github.com/neonwatty/meme-search/issues
- **Discussions**: https://github.com/neonwatty/meme-search/discussions

## What's Next

### Version 2.1.0 (Planned)
- Enhanced search algorithms
- Additional vision-language models
- Performance optimizations

### Future Releases
- GraphQL API
- Mobile app support
- Enhanced Docker E2E testing

---

**Full Changelog**: See `CHANGELOG.md` for detailed change history
