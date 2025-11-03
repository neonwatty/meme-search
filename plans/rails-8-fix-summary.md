# Rails 8 Unit Test Fix - Quick Reference

**Plan**: `/plans/rails-8-unit-test-fix-plan.md` (comprehensive 1,429 line guide)
**Created**: 2025-11-03
**Status**: Ready to Execute

---

## Current State

- **Rails Version**: 8.0.4
- **Playwright E2E**: ✅ 16/16 passing (100%)
- **Rails Unit Tests**: ❌ 26/~100 failing
  - Controllers: 24 errors, 2 failures
  - Channels: 2 errors

---

## Quick Start (Phase 1 - 30-45 min)

Phase 1 fixes **69% of failures** (18/26 tests) with minimal risk.

### Step 1: Add Missing Gem (5 tests fixed)

```bash
cd meme_search_pro/meme_search_app

# Edit Gemfile - add to test group:
group :test do
  gem "simplecov", require: false
  gem "rails-controller-testing"  # ← ADD THIS
end

# Install
mise exec -- bundle install
```

### Step 2: Fix URL Helpers (13 tests fixed)

**File 1**: `test/controllers/image_cores_controller_test.rb`
```ruby
# Find and replace (5 occurrences):
search_url → search_image_cores_url
search_items_url → search_items_image_cores_url
```

**File 2**: `test/controllers/settings/image_to_texts_controller_test.rb`
```ruby
# Find and replace (8 occurrences):
settings_update_current_image_to_texts_url → update_current_settings_image_to_texts_url
```

### Step 3: Verify Phase 1

```bash
# Test assigns() fixes (5 tests)
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb:19
mise exec -- bin/rails test test/controllers/settings/image_paths_controller_test.rb:18
mise exec -- bin/rails test test/controllers/settings/image_to_texts_controller_test.rb:31
mise exec -- bin/rails test test/controllers/settings/image_to_texts_controller_test.rb:43
mise exec -- bin/rails test test/controllers/settings/tag_names_controller_test.rb:18

# Test URL helper fixes (13 tests)
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb:160
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb:166
mise exec -- bin/rails test test/controllers/settings/image_to_texts_controller_test.rb:49

# Or run all controller tests
mise exec -- bin/rails test test/controllers

# Expected: 18/26 failures resolved
```

---

## Issue Breakdown

| Issue Type | Count | Complexity | Phase |
|------------|-------|------------|-------|
| Missing `rails-controller-testing` | 5 | ⭐ Easy | 1.1 |
| URL helper names wrong | 13 | ⭐ Easy | 1.2 |
| `any_instance.stub` deprecated | 2 | ⭐⭐ Medium | 2.1 |
| `stub_any_instance` deprecated | 2 | ⭐⭐ Medium | 2.2 |
| `Net::HTTP.stub` issues | 3 | ⭐⭐ Medium | 2.3 |
| `ActionCable.server.stub` deprecated | 4 | ⭐⭐ Medium | 2.4-2.5 |
| Rate limiting API changed | 1 | ⭐⭐ Medium | 2.6 |
| Private method testing | 2 | ⭐ Easy | 3 |
| **Total** | **26** | | |

---

## Recommended Execution Order

### Day 1 (1-2 hours)
1. ✅ Phase 1.1: Add gem (5 min)
2. ✅ Phase 1.2: Fix URL helpers (15 min)
3. ✅ Verify Phase 1 (10 min)
4. ✅ Commit Phase 1 (5 min)
5. ✅ Phase 3: Fix private method tests (20 min)
6. ✅ Verify Phase 3 (5 min)

**Progress**: 20/26 tests fixed (77%)

### Day 2 (2-3 hours)
1. ✅ Phase 2.1: Fix `any_instance.stub` (30 min)
2. ✅ Phase 2.2: Add Webmock + fix HTTP stubs (45 min)
3. ✅ Phase 2.4-2.5: Fix ActionCable stubs (30 min)
4. ✅ Phase 2.6: Fix rate limiting test (15 min)
5. ✅ Verify all tests (15 min)

**Progress**: 26/26 tests fixed (100%)

### Day 3 (30-60 min)
1. ✅ Phase 4: CI verification (30 min)
2. ✅ Phase 5: Documentation (30 min)
3. ✅ Final review and merge

---

## Critical Commands

### Verify Current State
```bash
cd meme_search_pro/meme_search_app

# Count failures
mise exec -- bin/rails test 2>&1 | grep -E "errors|failures"

# Expected now: 78 runs, 24 errors, 2 failures (controllers)
#               17 runs, 2 errors (channels)
```

### Verify Routes
```bash
# Check correct URL helper names
mise exec -- rails routes | grep -E "search|update_current"

# Expected:
# search_image_cores GET /image_cores/search
# search_items_image_cores POST /image_cores/search_items
# update_current_settings_image_to_texts POST /settings/image_to_texts/update_current
```

### Run Specific Tests
```bash
# Single test by line number
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb:160

# All controller tests
mise exec -- bin/rails test test/controllers

# All channel tests
mise exec -- bin/rails test test/channels

# Full suite
mise exec -- bin/rails test
```

### Check Test Coverage
```bash
COVERAGE=true mise exec -- bin/rails test
open coverage/index.html  # View coverage report
```

---

## Key Rails 8 Changes

### 1. Controller Testing
```ruby
# Now requires gem
gem "rails-controller-testing"

# Then can use assigns()
assigns(:image_cores)
```

### 2. Stubbing API
```ruby
# ❌ REMOVED
Net::HTTP.stub_any_instance(:request, mock)
ImageCore.any_instance.stub(:method, value)

# ✅ USE INSTEAD
stub_request(:post, url).to_return(...)  # Webmock
instance.define_singleton_method(:method) { ... }
```

### 3. URL Helpers
```ruby
# ❌ WRONG (Rails 7 style)
search_url
settings_update_current_image_to_texts_url

# ✅ CORRECT (Rails 8)
search_image_cores_url
update_current_settings_image_to_texts_url

# Always verify with: rails routes
```

### 4. Rate Limiting
```ruby
# ❌ REMOVED
Controller.rate_limit_options

# ✅ USE INSTEAD
Controller._rate_limiters
```

---

## Success Metrics

**Before**:
- 26 failing unit tests
- Controllers: 78 runs, 24 errors, 2 failures
- Channels: 17 runs, 2 errors

**After (Target)**:
- 0 failing unit tests
- Controllers: 78 runs, 0 errors, 0 failures
- Channels: 17 runs, 0 errors
- Playwright: 16/16 passing (unchanged)
- Coverage: No regression

---

## Rollback Plan

All changes are test-only. To rollback:

```bash
# Rollback Gemfile
git checkout HEAD -- Gemfile Gemfile.lock

# Rollback test files
git checkout HEAD -- test/

# Reinstall original gems
mise exec -- bundle install
```

No production code is affected. Zero deployment risk.

---

## Files to Modify

### Phase 1 (18 tests)
- `Gemfile` - Add gem
- `test/controllers/image_cores_controller_test.rb` - Fix 5 URL helpers
- `test/controllers/settings/image_to_texts_controller_test.rb` - Fix 8 URL helpers

### Phase 2 (21 tests)
- `Gemfile` - Add Webmock (optional)
- `test/test_helper.rb` - Configure Webmock
- `test/controllers/image_cores_controller_test.rb` - Fix 8 stub tests
- `test/controllers/settings/image_paths_controller_test.rb` - Fix 1 stub test
- `test/channels/image_description_channel_test.rb` - Fix 1 stub test
- `test/channels/image_status_channel_test.rb` - Fix 1 stub test

### Phase 3 (2 tests)
- `test/controllers/settings/image_to_texts_controller_test.rb` - Fix 2 private method tests

### Phase 5 (Documentation)
- `CLAUDE.md` - Add Rails 8 notes
- `docs/rails-8-migration-notes.md` - Create guide
- `test/README.md` - Update patterns

**Total**: 10 files modified

---

## Quick Win Path (1 hour)

If you need immediate progress:

1. **5 min**: Add `rails-controller-testing` to Gemfile + `bundle install`
2. **10 min**: Fix URL helpers (search + replace in 2 files)
3. **5 min**: Run `mise exec -- bin/rails test test/controllers`
4. **Result**: 18/26 tests fixed (69%)

Then tackle Phase 2 (stubs) when you have 2-3 hours available.

---

## Support Resources

- **Full Plan**: `/plans/rails-8-unit-test-fix-plan.md` (1,429 lines, detailed code examples)
- **Rails 8 Release Notes**: https://edgeguides.rubyonrails.org/8_0_release_notes.html
- **Webmock Docs**: https://github.com/bblimke/webmock
- **Controller Testing Gem**: https://github.com/rails/rails-controller-testing

---

## Questions?

See the comprehensive plan for:
- Detailed before/after code examples
- Alternative approaches for each fix
- Verification commands for each phase
- CI/CD integration steps
- Complete migration guide

**Ready to start?** Begin with Phase 1 in the main plan document.
