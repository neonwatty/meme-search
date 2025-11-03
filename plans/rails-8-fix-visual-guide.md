# Rails 8 Unit Test Fix - Visual Guide

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RAILS 8 TEST FIX STRATEGY                        │
│                         26 Failing Tests                            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │         PHASE 1: Quick Wins (69%)           │
         │              30-45 minutes                   │
         └─────────────────────────────────────────────┘
                        │                    │
           ┌────────────┴────────┐    ┌──────┴──────────┐
           │   Add Gem (5 min)   │    │  Fix URLs       │
           │  rails-controller-  │    │  (15 min)       │
           │  testing            │    │                 │
           │                     │    │  13 tests fixed │
           │  5 tests fixed      │    └─────────────────┘
           └─────────────────────┘
                                   │
                                   ▼
                    ✅ 18/26 tests passing (69%)
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │    PHASE 2: Stubbing Migration (81%)        │
         │              2-3 hours                       │
         └─────────────────────────────────────────────┘
                                   │
      ┌────────────┬───────────────┼───────────────┬─────────┐
      │            │               │               │         │
  ┌───▼──┐    ┌───▼──┐       ┌────▼───┐      ┌───▼──┐  ┌──▼──┐
  │ 2.1  │    │ 2.2  │       │  2.4   │      │ 2.5  │  │ 2.6 │
  │any_  │    │stub_ │       │ActionC.│      │ActionC│  │rate │
  │inst. │    │any_  │       │channels│      │contr. │  │limit│
  │      │    │inst. │       │        │      │       │  │     │
  │2 fix │    │2 fix │       │2 fix   │      │2 fix  │  │1 fix│
  └──────┘    └──────┘       └────────┘      └───────┘  └─────┘
                                   │
                                   ▼
                    ✅ 24/26 tests passing (92%)
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │      PHASE 3: Private Methods (100%)        │
         │              15-20 minutes                   │
         └─────────────────────────────────────────────┘
                                   │
                            ┌──────┴──────┐
                            │  Fix private│
                            │  method tests│
                            │             │
                            │  2 tests fix│
                            └─────────────┘
                                   │
                                   ▼
                    ✅ 26/26 tests passing (100%)
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │        PHASE 4: Verification (100%)         │
         │              30-45 minutes                   │
         └─────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               ┌────▼───┐    ┌────▼───┐    ┌─────▼────┐
               │ Local  │    │Coverage│    │    CI    │
               │ Tests  │    │  Test  │    │   Test   │
               │        │    │        │    │          │
               │All pass│    │No regr.│    │All green │
               └────────┘    └────────┘    └──────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │      PHASE 5: Documentation (100%)          │
         │              20-30 minutes                   │
         └─────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               ┌────▼───┐    ┌────▼───┐    ┌─────▼────┐
               │CLAUDE  │    │Migration│   │   Test   │
               │  .md   │    │  Guide  │    │  README  │
               └────────┘    └─────────┘    └──────────┘
                                   │
                                   ▼
                        ✨ READY TO MERGE ✨
```

---

## Issue Category Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│                    26 FAILING TESTS BY CATEGORY                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ███████████████ Missing rails-controller-testing (5)      19% │
│  ██████████████████████████ URL helpers wrong (13)         50% │
│  ████ any_instance.stub deprecated (2)                      8% │
│  ████ stub_any_instance deprecated (2)                      8% │
│  ████ ActionCable.server.stub - channels (2)                8% │
│  ████ ActionCable.server.stub - controllers (2)             8% │
│  ██ Rate limiting API (1)                                   4% │
│  ████ Private method testing (2)                            8% │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Impact Map

```
test/
├── controllers/
│   ├── image_cores_controller_test.rb
│   │   ├── 🔴 Line 19: assigns() - needs gem
│   │   ├── 🔴 Line 109: any_instance.stub - needs fix
│   │   ├── 🔴 Line 149: stub_any_instance - needs fix
│   │   ├── 🔴 Lines 160,166,183,196,206: URL helpers - needs rename
│   │   ├── 🔴 Lines 233,273,290: Net::HTTP.stub - verify
│   │   ├── 🔴 Lines 313,347: ActionCable.server.stub - needs fix
│   │   ├── 🔴 Line 331: any_instance.stub - needs fix
│   │   └── 🔴 Line 366: rate_limit_options - needs fix
│   │
│   └── settings/
│       ├── image_to_texts_controller_test.rb
│       │   ├── 🔴 Lines 31,43: assigns() - needs gem
│       │   ├── 🔴 Lines 49,69,80,94,106,115,128,165+: URL helpers
│       │   ├── 🔴 Line 197: private method test - needs fix
│       │   └── 🔴 Line 200: strong params test - needs fix
│       │
│       ├── tag_names_controller_test.rb
│       │   └── 🔴 Line 18: assigns() - needs gem
│       │
│       └── image_paths_controller_test.rb
│           ├── 🔴 Line 18: assigns() - needs gem
│           └── 🔴 Line 145: stub_any_instance - needs fix
│
└── channels/
    ├── image_description_channel_test.rb
    │   └── 🔴 Line 45: stub_connection.stub - needs fix
    │
    └── image_status_channel_test.rb
        └── 🔴 Line 45: stub_connection.stub - needs fix
```

**Legend**: 🔴 Failing test location

---

## Dependency Graph

```
                   ┌──────────────────┐
                   │   Phase 1.1      │
                   │   Add Gem        │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ Bundle Install   │ ← Required before testing
                   └────────┬─────────┘
                            │
                   ┌────────┴─────────┐
                   │                  │
          ┌────────▼────────┐  ┌─────▼──────────┐
          │   Phase 1.2     │  │   Phase 2      │
          │   Fix URLs      │  │   Fix Stubs    │
          └────────┬────────┘  └─────┬──────────┘
                   │                 │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Phase 3       │
                   │   Private Meth. │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Phase 4       │
                   │   Verify All    │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Phase 5       │
                   │   Document      │
                   └─────────────────┘
```

**Critical Path**: Phase 1.1 → Bundle Install → All other phases

**Parallel Work Possible**:
- Phase 1.2 and Phase 3 can run independently after 1.1
- Phase 2 sub-phases can be done in any order
- Phase 5 documentation can start anytime

---

## Risk Heat Map

```
┌────────────────────────────────────────────────────────────┐
│                      RISK ASSESSMENT                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Phase 1.1 (Add Gem)                    🟢 Low Risk       │
│  Phase 1.2 (URL Helpers)                🟢 Low Risk       │
│  Phase 2.1 (any_instance.stub)          🟡 Medium Risk    │
│  Phase 2.2 (stub_any_instance)          🟡 Medium Risk    │
│  Phase 2.3 (Net::HTTP.stub)             🟡 Medium Risk    │
│  Phase 2.4 (ActionCable - channels)     🟡 Medium Risk    │
│  Phase 2.5 (ActionCable - controllers)  🟡 Medium Risk    │
│  Phase 2.6 (Rate limiting)              🟡 Medium Risk    │
│  Phase 3 (Private methods)              🟢 Low Risk       │
│  Phase 4 (Verification)                 🟢 Low Risk       │
│  Phase 5 (Documentation)                🟢 Low Risk       │
│                                                            │
│  Overall Production Risk:               🟢 ZERO           │
│  (All changes are test-only)                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Legend**:
- 🟢 Low Risk: Simple search/replace or additive changes
- 🟡 Medium Risk: Requires understanding of mocking patterns
- 🔴 High Risk: None! All changes are test-only

---

## Time Allocation

```
Total Time: 4-5 hours
═══════════════════════════════════════════════════════════

Phase 1 (Quick Wins)          ████████░░░░░░░░░░  30-45 min (15%)
Phase 2 (Stubbing Migration)  ████████████████░░  2-3 hours (60%)
Phase 3 (Private Methods)     ███░░░░░░░░░░░░░░░  15-20 min  (7%)
Phase 4 (Verification)        ████████░░░░░░░░░░  30-45 min (15%)
Phase 5 (Documentation)       ████░░░░░░░░░░░░░░  20-30 min  (8%)

Recommended Split:
─────────────────
Day 1: Phases 1 + 3  → 77% tests fixed in 1-2 hours
Day 2: Phase 2       → 100% tests fixed in 2-3 hours
Day 3: Phases 4 + 5  → Full verification + docs in 1 hour
```

---

## Success Progression

```
Current State:
  Controllers: 78 runs, 24 errors, 2 failures
  Channels:    17 runs, 2 errors
  Total:       26 failing tests
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0% passing

After Phase 1 (45 min):
  18 tests fixed
  ━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░ 69% passing

After Phase 2 (3 hours):
  24 tests fixed
  ━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░ 92% passing

After Phase 3 (4 hours):
  26 tests fixed
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% passing ✨

After Phase 4 (4.5 hours):
  CI green, all verifications pass
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% verified ✅

After Phase 5 (5 hours):
  Documentation complete, ready to merge
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% complete 🎉
```

---

## Test Categories Before/After

```
BEFORE: 26 Failing Tests
┌─────────────────────────────────┐
│  Models      ✅ Passing          │
│  Controllers ❌ 24 errors, 2 fail│
│  Channels    ❌ 2 errors         │
│  Playwright  ✅ 16/16 passing    │
└─────────────────────────────────┘

AFTER: All Tests Passing
┌─────────────────────────────────┐
│  Models      ✅ Passing          │
│  Controllers ✅ 78 runs, 0 errors│
│  Channels    ✅ 17 runs, 0 errors│
│  Playwright  ✅ 16/16 passing    │
└─────────────────────────────────┘

Total: ~110+ tests all passing
```

---

## Quick Decision Tree

```
                    Start Here
                        │
                        ▼
           ┌────────────────────────┐
           │ Do you have 45 min?    │
           └────────┬───────────────┘
                    │
         ┌──────────┴──────────┐
         │ YES                 │ NO
         ▼                     ▼
    Do Phase 1          Come back later
    (18 tests fixed)          │
         │                     └──> Schedule 2-3 hour block
         ▼
    ┌────────────────────────┐
    │ Do you have 2-3 hours? │
    └────────┬───────────────┘
             │
  ┌──────────┴──────────┐
  │ YES                 │ NO
  ▼                     ▼
Do Phase 2        Stop at Phase 1
(all stubs)       (69% done)
  │                     │
  ▼                     └──> Commit & continue later
Phase 3 (15 min)
  │
  ▼
Phase 4 (45 min)
  │
  ▼
Phase 5 (30 min)
  │
  ▼
🎉 DONE!
```

---

## Verification Checkpoints

```
✓ Checkpoint 1: After Phase 1.1 (Add Gem)
  └─> Run: mise exec -- bundle list | grep rails-controller-testing
      Expected: rails-controller-testing (1.x.x)

✓ Checkpoint 2: After Phase 1.2 (URL Helpers)
  └─> Run: mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb:160
      Expected: Test passes (not NameError)

✓ Checkpoint 3: After Phase 2 (Stubbing)
  └─> Run: mise exec -- bin/rails test test/controllers
      Expected: 0 errors about "undefined method `stub'"

✓ Checkpoint 4: After Phase 3 (Private Methods)
  └─> Run: mise exec -- bin/rails test test/controllers/settings/image_to_texts_controller_test.rb:195
      Expected: Test passes

✓ Checkpoint 5: After Phase 4 (Full Verification)
  └─> Run: mise exec -- bin/rails test
      Expected: All tests passing, 0 errors, 0 failures

✓ Checkpoint 6: CI Green
  └─> Push to GitHub
      Expected: All GitHub Actions workflows pass
```

---

## Common Gotchas

```
⚠️ GOTCHA #1: Forgot to run bundle install
   Solution: Always run after modifying Gemfile

⚠️ GOTCHA #2: Using wrong URL helper name
   Solution: Check with: mise exec -- rails routes

⚠️ GOTCHA #3: Stubbing still not working
   Solution: Check if using .stub() vs .stub_any_instance()
             Only stub_any_instance was removed!

⚠️ GOTCHA #4: Tests pass locally but fail in CI
   Solution: Check Gemfile.lock is committed
             Ensure mise is activated in CI

⚠️ GOTCHA #5: WebMock blocking legitimate requests
   Solution: Configure allow_localhost in test_helper.rb

⚠️ GOTCHA #6: Private method tests failing
   Solution: Use .private_methods.include?(:method_name)
             Or delete the test (best practice)
```

---

## Files at a Glance

```
📁 plans/
  ├── 📄 rails-8-unit-test-fix-plan.md       (39K, 1,429 lines - MAIN GUIDE)
  ├── 📄 rails-8-fix-summary.md              (7.7K - QUICK REFERENCE)
  └── 📄 rails-8-fix-visual-guide.md         (THIS FILE - VISUAL AIDS)

📁 meme_search_pro/meme_search_app/
  ├── 📄 Gemfile                              (TO MODIFY - add 1-2 gems)
  ├── 📄 Gemfile.lock                         (AUTO-UPDATE after bundle)
  └── 📁 test/
      ├── 📄 test_helper.rb                   (TO MODIFY - add Webmock config)
      ├── 📁 controllers/
      │   ├── 📄 image_cores_controller_test.rb        (13 tests to fix)
      │   └── 📁 settings/
      │       ├── 📄 image_to_texts_controller_test.rb (10 tests to fix)
      │       ├── 📄 tag_names_controller_test.rb      (1 test to fix)
      │       └── 📄 image_paths_controller_test.rb    (2 tests to fix)
      └── 📁 channels/
          ├── 📄 image_description_channel_test.rb     (1 test to fix)
          └── 📄 image_status_channel_test.rb          (1 test to fix)

📁 docs/ (TO CREATE)
  └── 📄 rails-8-migration-notes.md           (Migration guide)
```

---

## Ready to Start?

1. **Read this visual guide** - You just did! ✅
2. **Skim the summary** - `/plans/rails-8-fix-summary.md` (5 min)
3. **Follow the main plan** - `/plans/rails-8-unit-test-fix-plan.md` (detailed steps)

**Start with Phase 1** and watch 69% of failures disappear in 45 minutes!

```
┌─────────────────────────────────────────────────────────┐
│  💡 TIP: Commit after each phase to track progress      │
│                                                         │
│  git add .                                              │
│  git commit -m "Fix Rails 8 tests: Phase X complete"   │
└─────────────────────────────────────────────────────────┘
```

Good luck! 🚀
