# Playwright Migration & Rails 8 Upgrade - Next Steps

**Branch**: `rails-8-update-3`
**Status**: Phase 2 Complete - All Tests Migrated! 🎉
**Last Updated**: 2025-10-31

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

## ✅ Phase 1 Complete!

### Phase 1 Completion

#### 1. Update Documentation
- [x] Update `CLAUDE.md` with Playwright section
  - Add "Testing with Playwright" section
  - Document npm test scripts
  - Explain test structure and page object model pattern
  - Add troubleshooting guide
  - Document database seeding strategy

#### 2. Add GitHub Actions Playwright Workflow
- [x] Create or update `.github/workflows/pro-app-test.yml`
  - Add new job for Playwright tests
  - Install Node.js 20
  - Install Playwright browsers (`npx playwright install --with-deps chromium`)
  - Start Rails server in background with test database
  - Run `mise exec -- bin/rails db:test:reset_and_seed`
  - Execute `npm run test:e2e`
  - Upload test results and traces as artifacts
  - Keep existing Capybara test jobs running (incremental migration)

---

## 📋 Immediate Next Steps

🎉 **PHASE 2 COMPLETE!** All 16 system tests have been successfully migrated to Playwright!

**Next:** Proceed to Phase 3 - Cleanup & Optimization (optional)

---

## 🔄 Phase 2: Migrate Remaining System Tests

### Priority Order (Simplest → Most Complex)

#### Test 1: tag_names_test.rb → tag-names.spec.ts ✅
**Complexity**: Low
**Test Count**: 1 comprehensive test
**Coverage**: Tag CRUD operations in settings

- [x] Create `playwright/pages/settings/tag-names.page.ts`
- [x] Migrate test to `playwright/tests/tag-names.spec.ts`
- [x] Handle navigation, form fill, alerts/confirmations
- [x] Verify test passes

#### Test 2: image_paths_test.rb → image-paths.spec.ts ✅
**Complexity**: Low-Medium
**Test Count**: 1 comprehensive test
**Coverage**: Directory path management, validation

- [x] Create `playwright/pages/settings/image-paths.page.ts`
- [x] Migrate test to `playwright/tests/image-paths.spec.ts`
- [x] Handle form validation errors
- [x] Verify test passes

#### Test 3: image_cores_test.rb → image-cores.spec.ts ✅
**Complexity**: Medium
**Test Count**: 2 tests
**Coverage**: CRUD operations, tag management, description updates, deletion

- [x] Create `playwright/pages/image-cores.page.ts`
- [x] Migrate tests to `playwright/tests/image-cores.spec.ts`
- [x] Handle click interactions, form fills, DOM assertions
- [x] Verify tests pass

#### Test 4: search_test.rb → search.spec.ts ✅
**Complexity**: Medium-High
**Test Count**: 3 tests
**Coverage**: Keyword search, vector search, tag filtering

**Challenge**: Debounced search (300ms + 500ms wait)

- [x] Create `playwright/pages/search.page.ts`
- [x] Migrate tests to `playwright/tests/search.spec.ts`
- [x] Implement proper wait strategies for debounced input
- [x] Handle DOM counting assertions
- [x] Verify tests pass

#### Test 5: index_filter_test.rb → index-filter.spec.ts ✅
**Complexity**: High
**Test Count**: 6 tests
**Coverage**: Filter sidebar UX (tags, paths, embeddings)

**Challenge**: Modal interactions, escape key handling, checkbox states

- [x] Create `playwright/pages/index-filter.page.ts`
- [x] Migrate tests to `playwright/tests/index-filter.spec.ts`
- [x] Handle opening/closing modals
- [x] Implement keyboard interactions (Escape key)
- [x] Handle checkbox states
- [x] Verify tests pass

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
| `image_to_texts_test.rb` | 3 | ✅ Done | `image-to-texts.spec.ts` | Model selection UI |
| `tag_names_test.rb` | 1 | ✅ Done | `tag-names.spec.ts` | CRUD operations with dialog |
| `image_paths_test.rb` | 1 | ✅ Done | `image-paths.spec.ts` | Directory path CRUD |
| `image_cores_test.rb` | 2 | ✅ Done | `image-cores.spec.ts` | Edit, tags, delete |
| `search_test.rb` | 3 | ✅ Done | `search.spec.ts` | Keyword/vector/tag filtering |
| `index_filter_test.rb` | 6 | ✅ Done | `index-filter.spec.ts` | Modal/keyboard/filters |
| **Total** | **16** | **16/16** | **6 files** | **100% complete** |

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

### Phase 1 ✅ COMPLETE
- [x] Playwright infrastructure working
- [x] First test migrated and passing (image-to-texts)
- [x] Second test migrated and passing (tag-names)
- [x] Database seeding functional
- [x] CI integration implemented and working
- [x] Documentation updated in CLAUDE.md

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
