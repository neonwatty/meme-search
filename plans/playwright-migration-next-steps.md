# Playwright Migration & Rails 8 Upgrade - Next Steps

**Branch**: `rails-8-update-3`
**Status**: Phase 1 Complete
**Last Updated**: 2025-10-30

---

## ✅ Completed in This Session

- [x] Fix Docker credential helper issue
- [x] Add mise configuration (Ruby 3.4.2, Python 3.12, Node 20)
- [x] Update Rails from 7.2.2.1 to 8.0.4
- [x] Update transformers from unpinned to 4.49.0
- [x] Initialize Playwright with TypeScript
- [x] Create test database seed script with all 5 models
- [x] Add Rails rake tasks for test database management
- [x] Create Playwright project structure (tests, pages, utils)
- [x] Migrate first test: image_to_texts_test.rb → image-to-texts.spec.ts
- [x] Verify all 3 tests passing
- [x] Commit and push Playwright infrastructure

---

## 📋 Immediate Next Steps

### Phase 1 Completion

#### 1. Update Documentation
- [ ] Update `CLAUDE.md` with Playwright section
  - Add "Testing with Playwright" section
  - Document npm test scripts
  - Explain test structure and page object model pattern
  - Add troubleshooting guide
  - Document database seeding strategy

#### 2. Add GitHub Actions Playwright Workflow
- [ ] Create or update `.github/workflows/pro-app-test.yml`
  - Add new job for Playwright tests
  - Install Node.js 20
  - Install Playwright browsers (`npx playwright install --with-deps chromium`)
  - Start Rails server in background with test database
  - Run `mise exec -- bin/rails db:test:reset_and_seed`
  - Execute `npm run test:e2e`
  - Upload test results and traces as artifacts
  - Keep existing Capybara test jobs running (incremental migration)

---

## 🔄 Phase 2: Migrate Remaining System Tests

### Priority Order (Simplest → Most Complex)

#### Test 1: tag_names_test.rb → tag-names.spec.ts
**Complexity**: Low
**Test Count**: 1 comprehensive test
**Coverage**: Tag CRUD operations in settings

- [ ] Create `playwright/pages/settings/tag-names.page.ts`
- [ ] Migrate test to `playwright/tests/tag-names.spec.ts`
- [ ] Handle navigation, form fill, alerts/confirmations
- [ ] Verify test passes

#### Test 2: image_paths_test.rb → image-paths.spec.ts
**Complexity**: Low-Medium
**Test Count**: 1 comprehensive test
**Coverage**: Directory path management, validation

- [ ] Create `playwright/pages/settings/image-paths.page.ts`
- [ ] Migrate test to `playwright/tests/image-paths.spec.ts`
- [ ] Handle form validation errors
- [ ] Verify test passes

#### Test 3: image_cores_test.rb → image-cores.spec.ts
**Complexity**: Medium
**Test Count**: 2 tests
**Coverage**: CRUD operations, tag management, description updates, deletion

- [ ] Create `playwright/pages/image-cores.page.ts`
- [ ] Migrate tests to `playwright/tests/image-cores.spec.ts`
- [ ] Handle click interactions, form fills, DOM assertions
- [ ] Verify tests pass

#### Test 4: search_test.rb → search.spec.ts
**Complexity**: Medium-High
**Test Count**: 3 tests
**Coverage**: Keyword search, vector search, tag filtering

**Challenge**: Debounced search (300ms + 500ms wait)

- [ ] Create `playwright/pages/search.page.ts`
- [ ] Migrate tests to `playwright/tests/search.spec.ts`
- [ ] Implement proper wait strategies for debounced input
- [ ] Handle DOM counting assertions
- [ ] Verify tests pass

#### Test 5: index_filter_test.rb → index-filter.spec.ts
**Complexity**: High
**Test Count**: 5 tests
**Coverage**: Filter sidebar UX (tags, paths, embeddings)

**Challenge**: Modal interactions, escape key handling, checkbox states

- [ ] Create `playwright/pages/index-filter.page.ts`
- [ ] Migrate tests to `playwright/tests/index-filter.spec.ts`
- [ ] Handle opening/closing modals
- [ ] Implement keyboard interactions (Escape key)
- [ ] Handle checkbox states
- [ ] Verify tests pass

---

## 🎯 Phase 3: Cleanup & Optimization

### Once All Tests Migrated

- [ ] Compare test coverage between Capybara and Playwright
- [ ] Ensure no regressions in test coverage
- [ ] Document any differences or limitations

### Remove Capybara (Optional)

**⚠️ Only after all tests migrated and verified**

- [ ] Remove `gem "capybara"` from Gemfile (test group)
- [ ] Remove `gem "selenium-webdriver"` from Gemfile (test group)
- [ ] Delete `test/system/` directory
- [ ] Delete `test/application_system_test_case.rb`
- [ ] Remove Capybara configuration from test helper
- [ ] Update GitHub Actions to remove Capybara test steps
- [ ] Run full test suite to ensure nothing broken
- [ ] Update documentation

---

## 🔧 Technical Debt & Improvements

### Test Infrastructure

- [ ] Add test data fixtures in JSON format for easier management
- [ ] Create reusable test helpers for common patterns
- [ ] Add visual regression testing (optional)
- [ ] Implement parallel test execution (requires DB strategy update)

### Database Management

- [ ] Consider using database transactions instead of full reset
- [ ] Optimize seed script for faster execution
- [ ] Add database snapshots for faster test setup

### CI/CD Optimization

- [ ] Cache Playwright browsers in GitHub Actions
- [ ] Cache node_modules
- [ ] Run Playwright tests in parallel (after DB strategy update)
- [ ] Add test sharding for faster CI runs

### Documentation

- [ ] Create video tutorial for Playwright test development
- [ ] Document Page Object Model best practices
- [ ] Add examples for common test scenarios
- [ ] Create migration guide for future tests

---

## 📊 Progress Tracking

### System Tests Migration Status

| Test File | Tests | Status | Playwright File | Notes |
|-----------|-------|--------|----------------|-------|
| `image_to_texts_test.rb` | 3 | ✅ Done | `image-to-texts.spec.ts` | Phase 1 complete |
| `tag_names_test.rb` | 1 | ⏳ Pending | `tag-names.spec.ts` | Next priority |
| `image_paths_test.rb` | 1 | ⏳ Pending | `image-paths.spec.ts` | Low complexity |
| `image_cores_test.rb` | 2 | ⏳ Pending | `image-cores.spec.ts` | Medium complexity |
| `search_test.rb` | 3 | ⏳ Pending | `search.spec.ts` | Debounce handling |
| `index_filter_test.rb` | 5 | ⏳ Pending | `index-filter.spec.ts` | Modal/keyboard |
| **Total** | **15** | **3/15** | **6 files** | **20% complete** |

---

## 🐛 Known Issues & Notes

### Current Limitations

1. **Database reset time**: ~2-3 seconds per test (acceptable for now)
2. **Sequential execution**: Required for database consistency
3. **Rails server**: Must be running on port 3000

### Deprecation Warnings

- Rails timezone warning: `to_time_preserves_timezone`
  - Low priority, will be required in Rails 8.1
  - Add to config when migrating to Rails 8.1

### Future Considerations

1. **Docker Compose Testing**: Consider running tests against Docker services
2. **Database Isolation**: Explore transaction-based test isolation
3. **Coverage Reporting**: Add code coverage for E2E tests (challenging with Rails)

---

## 📚 References

### Documentation
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

### Internal Docs
- `CLAUDE.md` - Project overview and testing patterns
- `playwright.config.ts` - Playwright configuration
- `playwright/README.md` - Testing guide (TODO: create)

### Related Issues
- N/A (first migration, no issues yet)

---

## ✨ Success Criteria

### Phase 1 (Current) ✅
- [x] Playwright infrastructure working
- [x] First test migrated and passing
- [x] Database seeding functional
- [x] CI integration planned (not implemented yet)

### Phase 2 (Next)
- [ ] All 15 system tests migrated
- [ ] All Playwright tests passing in CI
- [ ] Documentation updated
- [ ] Team trained on Playwright

### Phase 3 (Optional)
- [ ] Capybara removed
- [ ] Performance optimizations applied
- [ ] Visual regression tests added
- [ ] Parallel execution enabled

---

**Created**: 2025-10-30
**Last Modified**: 2025-10-30
**Maintainer**: Development Team
