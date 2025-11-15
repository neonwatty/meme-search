# Webhook Controller Tests - Detailed Implementation Plan

## Status: 📋 PLANNING PHASE

**Current State**:
- Existing controller tests: 31 tests (393 lines) in `test/controllers/image_cores_controller_test.rb`
- **Webhook endpoints: 0% tested** (critical gap)
- Channel tests exist (17 tests) with `assert_broadcasts` examples

**Goal**: Add comprehensive tests for webhook endpoints that Python service calls

**Estimated Time**: 1-2 hours
**Estimated Tests**: 10-12 tests
**Estimated Lines**: ~150-200 lines

---

## Background: Webhook Architecture

### What Are Webhooks?
Webhooks are HTTP callbacks that allow the Python image-to-text service to notify the Rails app when:
1. **Description generation completes** → `description_receiver` endpoint
2. **Processing status changes** → `status_receiver` endpoint

### Why Critical?
- **Core integration point** between Rails and Python microservices
- **Real-time updates** via ActionCable broadcasts to all connected clients
- **Data synchronization** - keeps Rails database in sync with Python processing
- **Currently 0% tested** - biggest gap in controller coverage

### Data Flow
```
Python Service → POST /description_receiver → Rails Controller
                                            ↓
                                    Update ImageCore.description
                                            ↓
                                    Broadcast via ActionCable
                                            ↓
                                    Refresh embeddings (vector search)
                                            ↓
                                    All connected clients receive update
```

---

## Endpoint Analysis

### 1. `description_receiver` (Lines 25-43)

**Purpose**: Receives AI-generated image descriptions from Python service

**Request Format**:
```ruby
POST /description_receiver
Content-Type: application/json

{
  "data": {
    "image_core_id": 123,
    "description": "A funny cat meme with text overlay"
  }
}
```

**What It Does**:
1. Extracts `image_core_id` and `description` from params
2. Finds ImageCore by ID
3. Updates `description` field
4. **If save succeeds**:
   - Broadcasts description to `image_description_channel` via ActionCable
   - Calls `refresh_description_embeddings` (destroys old embeddings, creates new ones)
5. **If save fails**:
   - Logs error to console (Line 41: bug - uses undefined `image` variable instead of `image_core`)

**Security**:
- CSRF token bypass (Line 8: `skip_before_action :verify_authenticity_token`)
- No authentication/authorization (Python service is trusted)

**Side Effects**:
- ActionCable broadcast to all connected clients
- Deletes existing ImageEmbedding records
- Creates new ImageEmbedding records (384-dim vectors for semantic search)

---

### 2. `status_receiver` (Lines 10-23)

**Purpose**: Receives processing status updates from Python service

**Request Format**:
```ruby
POST /status_receiver
Content-Type: application/json

{
  "data": {
    "image_core_id": 123,
    "status": 2  # 0=not_started, 1=in_queue, 2=processing, 3=done, 4=removing, 5=failed
  }
}
```

**What It Does**:
1. Extracts `image_core_id` and `status` from params
2. Finds ImageCore by ID
3. Updates `status` enum
4. **If save succeeds**:
   - Renders status partial to HTML
   - Broadcasts status HTML to `image_status_channel` via ActionCable
5. **If save fails**:
   - No error handling (silent failure)

**Security**:
- CSRF token bypass (Line 8: `skip_before_action :verify_authenticity_token`)
- No authentication/authorization

**Side Effects**:
- ActionCable broadcast to all connected clients
- Status partial rendering (may be slow for large broadcasts)

---

## Code Issues to Consider

### Issue 1: Error Handling Bug in `description_receiver`
**Line 41**: `puts "Error updating description: #{image.errors.full_messages.join(", ")}"`
- Uses undefined variable `image` instead of `image_core`
- Bug is latent (never executed in practice because save rarely fails)
- **Should NOT fix during test implementation** (follow "read-only" approach unless critical)
- **Should TEST** to document the bug

### Issue 2: No Error Handling in `status_receiver`
**Lines 21-22**: Empty `else` block
- Silent failure if save fails
- Should log error or return error response
- **Should TEST** to document the behavior

### Issue 3: No Response Rendering
Both endpoints don't render any response:
- No success response (200 OK with body)
- No error response (4xx/5xx)
- Python service has no way to know if webhook succeeded
- **Should TEST** to document current behavior

### Issue 4: Missing Record Handling
Both endpoints use `ImageCore.find(id)`:
- Raises `ActiveRecord::RecordNotFound` if ID doesn't exist
- Should use `find_by` and return 404 instead
- **Should TEST** to verify current behavior (exception raised)

---

## Test Plan Structure

### File Structure
Tests will be added to existing `test/controllers/image_cores_controller_test.rb` (393 lines)

**New Section**:
```ruby
# Webhook Endpoints Tests (Lines ~394-550)
# ========================================
# Tests for description_receiver and status_receiver endpoints
# called by Python image-to-text service
```

### Test Organization (12 tests)

#### **Phase 1: `description_receiver` Success Cases (4 tests)**
1. ✅ Should update description with valid data
2. ✅ Should broadcast to image_description_channel
3. ✅ Should refresh embeddings (create new ImageEmbedding records)
4. ✅ Should skip CSRF token verification

#### **Phase 2: `description_receiver` Error Cases (3 tests)**
5. ✅ Should handle missing image_core_id
6. ✅ Should handle invalid image_core_id (record not found)
7. ✅ Should handle save failure (validation error)

#### **Phase 3: `status_receiver` Success Cases (3 tests)**
8. ✅ Should update status with valid data
9. ✅ Should broadcast to image_status_channel with rendered HTML
10. ✅ Should skip CSRF token verification

#### **Phase 4: `status_receiver` Error Cases (2 tests)**
11. ✅ Should handle missing image_core_id
12. ✅ Should handle invalid image_core_id (record not found)

---

## Test Implementation Details

### Pattern 1: Testing CSRF Token Bypass
```ruby
test "description_receiver should skip CSRF token verification" do
  image_core = image_cores(:one)

  # Post without CSRF token (would normally fail)
  post description_receiver_url, params: {
    data: {
      image_core_id: image_core.id,
      description: "Test description"
    }
  }, as: :json

  # Should succeed (not raise ActionController::InvalidAuthenticityToken)
  assert_response :success  # Or check that it doesn't raise exception
end
```

**Why Important**: Validates that Python service can call webhook without Rails session/CSRF token.

---

### Pattern 2: Testing ActionCable Broadcasts
```ruby
test "description_receiver should broadcast to image_description_channel" do
  image_core = image_cores(:one)
  description = "AI generated description"

  assert_broadcasts "image_description_channel", 1 do
    post description_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        description: description
      }
    }, as: :json
  end
end
```

**Why Important**: Validates real-time updates work correctly.

**Note**: Pattern already used in channel tests (`test/channels/image_description_channel_test.rb:30`).

---

### Pattern 3: Testing Embedding Refresh
```ruby
test "description_receiver should refresh description embeddings" do
  image_core = image_cores(:one)

  # Create initial embedding
  original_embedding = ImageEmbedding.create!(
    snippet: "old snippet",
    image_core: image_core,
    embedding: Array.new(384, 0.5)
  )

  original_embedding_id = original_embedding.id

  # Mock $embedding_model to avoid slow inference
  original_model = $embedding_model
  mock_model = Minitest::Mock.new
  mock_model.expect :call, Array.new(384, 0.3), [String]
  $embedding_model = mock_model

  post description_receiver_url, params: {
    data: {
      image_core_id: image_core.id,
      description: "A cat sitting on a laptop"  # Long enough to create embeddings
    }
  }, as: :json

  # Old embedding should be destroyed
  assert_nil ImageEmbedding.find_by(id: original_embedding_id)

  # New embeddings should be created
  new_embeddings = ImageEmbedding.where(image_core_id: image_core.id)
  assert new_embeddings.count > 0

  assert mock_model.verify
  $embedding_model = original_model
end
```

**Why Important**: Validates vector search embeddings stay in sync with descriptions.

**Complexity**: Requires mocking `$embedding_model` (pattern from `test/models/image_embedding_test.rb:93-113`).

---

### Pattern 4: Testing Error Handling (RecordNotFound)
```ruby
test "description_receiver should raise error for invalid image_core_id" do
  invalid_id = 999999

  assert_raises(ActiveRecord::RecordNotFound) do
    post description_receiver_url, params: {
      data: {
        image_core_id: invalid_id,
        description: "Test description"
      }
    }, as: :json
  end
end
```

**Why Important**: Documents current error behavior (raises exception instead of returning 404).

**Future Improvement** (not in this phase): Change to `find_by` and return 404 response.

---

### Pattern 5: Testing Status Broadcast with HTML Rendering
```ruby
test "status_receiver should broadcast rendered status HTML" do
  image_core = image_cores(:one)
  new_status = 2  # processing

  assert_broadcasts "image_status_channel", 1 do
    post status_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        status: new_status
      }
    }, as: :json
  end

  # Verify status was updated in database
  image_core.reload
  assert_equal "processing", image_core.status
end
```

**Why Important**: Validates status updates propagate to all clients.

---

### Pattern 6: Testing Missing Parameters
```ruby
test "description_receiver should handle missing image_core_id" do
  assert_raises(NoMethodError) do  # Or KeyError depending on Rails version
    post description_receiver_url, params: {
      data: {
        description: "Test description"
        # Missing image_core_id
      }
    }, as: :json
  end
end
```

**Why Important**: Documents current behavior (raises exception instead of validating params).

**Future Improvement** (not in this phase): Add parameter validation and return 400 Bad Request.

---

## Mocking Strategy

### Mock $embedding_model (Required)
**Why**: Embedding generation is slow (~100ms per snippet), tests would timeout

**Pattern** (from `test/models/image_embedding_test.rb`):
```ruby
setup do
  @original_embedding_model = $embedding_model
  @mock_embedding_model = Minitest::Mock.new
  @mock_embedding_model.expect :call, Array.new(384, 0.3), [String]
  $embedding_model = @mock_embedding_model
end

teardown do
  $embedding_model = @original_embedding_model
end
```

### DO NOT Mock ActionCable
**Why**: `assert_broadcasts` already handles testing broadcasts correctly
**Pattern**: Use `assert_broadcasts "channel_name", count do ... end`

### DO NOT Mock Net::HTTP
**Why**: Webhook tests don't make outbound HTTP requests (they receive requests)

---

## Database Setup

### Fixtures Required
- `image_cores(:one)` - Already exists in fixtures
- `image_paths(:one)` - Already exists (for ImageCore association)

### Cleanup Strategy
```ruby
setup do
  @image_core = image_cores(:one)

  # Clean up embeddings before each test
  ImageEmbedding.where(image_core_id: @image_core.id).destroy_all
end

teardown do
  # Optional: Clean up created records
  ImageEmbedding.where(image_core_id: @image_core.id).destroy_all
end
```

**Why**: Embedding refresh tests need clean state to verify old embeddings are destroyed.

---

## Testing Routes

### Route Verification
```bash
# Verify webhook routes exist
mise exec -- bin/rails routes | grep receiver
```

**Expected Output**:
```
description_receiver POST   /description_receiver(.:format)  image_cores#description_receiver
status_receiver      POST   /status_receiver(.:format)       image_cores#status_receiver
```

### URL Helpers
- `description_receiver_url` - URL helper for description_receiver
- `status_receiver_url` - URL helper for status_receiver

**Note**: These should already be defined in `routes.rb`. If tests fail with undefined method, check routes.

---

## Test Execution Plan

### Step 1: Add Tests to Existing File
Edit `test/controllers/image_cores_controller_test.rb`, add new section at end:
```ruby
  # ... existing tests end around line 393 ...

  # ========================================
  # WEBHOOK ENDPOINTS
  # ========================================
  # Tests for description_receiver and status_receiver
  # Called by Python image-to-text service

  # PHASE 1: description_receiver success cases
  test "description_receiver should update description with valid data" do
    # ...
  end

  # ... 11 more tests ...
end
```

### Step 2: Run Tests Individually
```bash
# Run just webhook tests (if we add a pattern)
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb -n /receiver/

# Or run full controller test file
mise exec -- bin/rails test test/controllers/image_cores_controller_test.rb
```

### Step 3: Fix Issues Incrementally
- Run tests, identify failures
- Fix test code (not application code unless critical bug)
- Re-run until all pass
- Document any application bugs found

### Step 4: Run Full Test Suite
```bash
# Verify no regressions
mise exec -- bin/rails test
```

---

## Success Criteria

### Test Coverage ✅
- ✅ Both webhook endpoints have comprehensive tests
- ✅ Success cases validated (database updates, broadcasts)
- ✅ Error cases documented (missing params, invalid IDs)
- ✅ CSRF bypass verified
- ✅ ActionCable integration tested

### Execution Performance ✅
- ✅ All webhook tests run in < 2 seconds total
- ✅ Mocking prevents slow operations (embedding generation)
- ✅ Suitable for CI/CD

### Documentation Value ✅
- ✅ Tests serve as living documentation
- ✅ Application bugs documented (even if not fixed)
- ✅ Integration patterns demonstrated

### No Regressions ✅
- ✅ Existing controller tests still pass
- ✅ Full test suite passes
- ✅ No application code changes (unless critical bug found)

---

## Detailed Test List (12 tests)

### PHASE 1: description_receiver Success Cases (4 tests)

#### Test 1: Should update description with valid data
**Validates**: Basic webhook functionality
```ruby
test "description_receiver should update description with valid data" do
  image_core = image_cores(:one)
  original_description = image_core.description
  new_description = "A cat sitting on a laptop with funny text"

  post description_receiver_url, params: {
    data: {
      image_core_id: image_core.id,
      description: new_description
    }
  }, as: :json

  image_core.reload
  assert_equal new_description, image_core.description
  assert_not_equal original_description, image_core.description
end
```

#### Test 2: Should broadcast to image_description_channel
**Validates**: Real-time updates via ActionCable
```ruby
test "description_receiver should broadcast to image_description_channel" do
  image_core = image_cores(:one)
  description = "AI generated description"

  assert_broadcasts "image_description_channel", 1 do
    post description_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        description: description
      }
    }, as: :json
  end
end
```

#### Test 3: Should refresh embeddings (create new ImageEmbedding records)
**Validates**: Vector search embeddings stay in sync
```ruby
test "description_receiver should refresh description embeddings" do
  image_core = image_cores(:one)

  # Create initial embedding
  original_embedding = ImageEmbedding.create!(
    snippet: "old snippet",
    image_core: image_core,
    embedding: Array.new(384, 0.5)
  )

  original_embedding_id = original_embedding.id

  # Mock $embedding_model
  original_model = $embedding_model
  mock_model = Minitest::Mock.new
  mock_model.expect :call, Array.new(384, 0.3), [String]
  $embedding_model = mock_model

  long_description = "A cat sitting on a laptop with funny text overlay showing a meme about programming"

  post description_receiver_url, params: {
    data: {
      image_core_id: image_core.id,
      description: long_description
    }
  }, as: :json

  # Old embedding should be destroyed
  assert_nil ImageEmbedding.find_by(id: original_embedding_id)

  # New embeddings should be created
  new_embeddings = ImageEmbedding.where(image_core_id: image_core.id)
  assert new_embeddings.count > 0

  assert mock_model.verify
  $embedding_model = original_model
end
```

#### Test 4: Should skip CSRF token verification
**Validates**: Python service can call without Rails session
```ruby
test "description_receiver should skip CSRF token verification" do
  image_core = image_cores(:one)

  # Post without CSRF token (would normally fail)
  assert_nothing_raised do
    post description_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        description: "Test description"
      }
    }, as: :json
  end

  # Verify it actually updated (didn't just skip due to error)
  image_core.reload
  assert_equal "Test description", image_core.description
end
```

---

### PHASE 2: description_receiver Error Cases (3 tests)

#### Test 5: Should handle missing image_core_id
**Validates**: Parameter validation behavior
```ruby
test "description_receiver should handle missing image_core_id" do
  # Current behavior: raises NoMethodError or KeyError
  # Future improvement: return 400 Bad Request

  assert_raises(NoMethodError) do
    post description_receiver_url, params: {
      data: {
        description: "Test description"
        # Missing image_core_id
      }
    }, as: :json
  end
end
```

#### Test 6: Should handle invalid image_core_id (record not found)
**Validates**: Missing record handling
```ruby
test "description_receiver should handle invalid image_core_id" do
  invalid_id = 999999

  # Current behavior: raises ActiveRecord::RecordNotFound
  # Future improvement: return 404 Not Found

  assert_raises(ActiveRecord::RecordNotFound) do
    post description_receiver_url, params: {
      data: {
        image_core_id: invalid_id,
        description: "Test description"
      }
    }, as: :json
  end
end
```

#### Test 7: Should handle save failure (validation error)
**Validates**: Error handling when save fails
```ruby
test "description_receiver should handle save failure" do
  image_core = image_cores(:one)

  # Create a scenario where save would fail (e.g., description too long)
  # Note: ImageCore validation allows any description length, so this is hypothetical
  # This test documents current error handling behavior

  # Mock save to return false
  ImageCore.stub_any_instance(:save, false) do
    # Current behavior: logs error to console (with bug: uses undefined 'image' variable)
    # No exception raised, no error response returned

    assert_nothing_raised do
      post description_receiver_url, params: {
        data: {
          image_core_id: image_core.id,
          description: "Test description"
        }
      }, as: :json
    end
  end
end
```

---

### PHASE 3: status_receiver Success Cases (3 tests)

#### Test 8: Should update status with valid data
**Validates**: Basic webhook functionality
```ruby
test "status_receiver should update status with valid data" do
  image_core = image_cores(:one)
  original_status = image_core.status
  new_status = 2  # processing

  post status_receiver_url, params: {
    data: {
      image_core_id: image_core.id,
      status: new_status
    }
  }, as: :json

  image_core.reload
  assert_equal "processing", image_core.status
  assert_not_equal original_status, image_core.status
end
```

#### Test 9: Should broadcast to image_status_channel with rendered HTML
**Validates**: Real-time status updates with partial rendering
```ruby
test "status_receiver should broadcast to image_status_channel with rendered HTML" do
  image_core = image_cores(:one)
  new_status = 3  # done

  assert_broadcasts "image_status_channel", 1 do
    post status_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        status: new_status
      }
    }, as: :json
  end

  # Verify status was updated in database
  image_core.reload
  assert_equal "done", image_core.status
end
```

#### Test 10: Should skip CSRF token verification
**Validates**: Python service can call without Rails session
```ruby
test "status_receiver should skip CSRF token verification" do
  image_core = image_cores(:one)

  # Post without CSRF token (would normally fail)
  assert_nothing_raised do
    post status_receiver_url, params: {
      data: {
        image_core_id: image_core.id,
        status: 2  # processing
      }
    }, as: :json
  end

  # Verify it actually updated
  image_core.reload
  assert_equal "processing", image_core.status
end
```

---

### PHASE 4: status_receiver Error Cases (2 tests)

#### Test 11: Should handle missing image_core_id
**Validates**: Parameter validation behavior
```ruby
test "status_receiver should handle missing image_core_id" do
  # Current behavior: raises NoMethodError or KeyError
  # Future improvement: return 400 Bad Request

  assert_raises(NoMethodError) do
    post status_receiver_url, params: {
      data: {
        status: 2
        # Missing image_core_id
      }
    }, as: :json
  end
end
```

#### Test 12: Should handle invalid image_core_id (record not found)
**Validates**: Missing record handling
```ruby
test "status_receiver should handle invalid image_core_id" do
  invalid_id = 999999

  # Current behavior: raises ActiveRecord::RecordNotFound
  # Future improvement: return 404 Not Found

  assert_raises(ActiveRecord::RecordNotFound) do
    post status_receiver_url, params: {
      data: {
        image_core_id: invalid_id,
        status: 2
      }
    }, as: :json
  end
end
```

---

## Implementation Steps

### Step 1: Verify Routes (5 min)
```bash
cd /Users/neonwatty/Desktop/meme-search/meme_search/meme_search_app
mise exec -- bin/rails routes | grep receiver
```

### Step 2: Add Test Setup (10 min)
Add to `test/controllers/image_cores_controller_test.rb`:
- Import `require "minitest/mock"` if not already present
- Add webhook test section comment
- Add shared setup for embedding model mocking

### Step 3: Implement Phase 1 Tests (20 min)
- Test 1-4: description_receiver success cases
- Run tests, fix any issues

### Step 4: Implement Phase 2 Tests (15 min)
- Test 5-7: description_receiver error cases
- Run tests, document behaviors

### Step 5: Implement Phase 3 Tests (15 min)
- Test 8-10: status_receiver success cases
- Run tests, fix any issues

### Step 6: Implement Phase 4 Tests (10 min)
- Test 11-12: status_receiver error cases
- Run tests, document behaviors

### Step 7: Verification (10 min)
- Run full controller test file
- Run full test suite
- Verify no regressions

**Total Estimated Time**: ~1.5 hours

---

## Expected Outcomes

### Test Count
- **Before**: 31 controller tests
- **After**: 43 controller tests (+12)
- **Total Rails Tests**: 273 (from 261)

### Coverage Impact
- **Webhook endpoints**: 0% → ~85% coverage
- **Critical integration points**: Fully tested
- **Error handling**: Documented

### Documentation Value
- Living documentation for webhook integration
- Examples for future webhook endpoints
- ActionCable broadcast testing patterns
- Error handling patterns

### Bugs Documented (Not Fixed)
1. **description_receiver Line 41**: Uses undefined `image` variable (should be `image_core`)
2. **Both endpoints**: No response rendering (Python service has no confirmation)
3. **Both endpoints**: No parameter validation (raises exceptions instead of returning error codes)
4. **status_receiver**: Silent failure on save error (empty else block)

---

## Future Improvements (Out of Scope)

### Phase 2: Fix Bugs
1. Fix `image` → `image_core` typo in error logging
2. Add parameter validation (return 400 Bad Request)
3. Change `find` to `find_by` (return 404 Not Found)
4. Add error response rendering
5. Add error handling in status_receiver else block

### Phase 3: Add Authentication
1. Add webhook signature verification (HMAC)
2. Add API token authentication
3. Add IP whitelist (only allow Python service)

### Phase 4: Performance Optimization
1. Move embedding refresh to background job (Sidekiq/Solid Queue)
2. Cache rendered status partial
3. Add request logging for debugging

### Phase 5: Monitoring
1. Add webhook failure alerts
2. Add performance monitoring (APM)
3. Add retry mechanism for failed webhooks

---

## Summary

**Goal**: Add 12 comprehensive tests for webhook endpoints

**Why Important**:
- Critical integration point (0% tested currently)
- Prevents regressions in Rails-Python communication
- Documents error handling behavior
- Validates real-time updates (ActionCable)

**What Will Be Tested**:
- ✅ Database updates (description, status)
- ✅ ActionCable broadcasts (real-time updates)
- ✅ Embedding refresh (vector search sync)
- ✅ CSRF token bypass (external service integration)
- ✅ Error handling (missing params, invalid IDs, save failures)

**Estimated Effort**: 1.5 hours, 12 tests, ~150-200 lines

**Next Steps**: Implement tests following the detailed test list above.
