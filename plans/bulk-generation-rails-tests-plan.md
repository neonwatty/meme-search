# Bulk Generation Rails Controller & Unit Tests - Implementation Plan

## Overview

This plan covers comprehensive Rails controller tests for the bulk description generation feature. The current implementation has excellent E2E coverage via Playwright but lacks unit tests for backend logic, which would have caught the recent session key mismatch and progress calculation bugs.

## Current State

### ✅ What We Have
- **E2E Tests**: 8 comprehensive Playwright tests covering user-facing behavior
- **Implementation**: 3 controller actions (`bulk_generate_descriptions`, `bulk_operation_status`, `bulk_operation_cancel`)
- **Features**: Session tracking, localStorage persistence, real-time polling, filter support

### ❌ What's Missing
- **Rails Controller Tests**: Zero coverage for bulk generation endpoints
- **Unit Tests**: No tests for session handling, status counting, image ID tracking
- **Edge Case Testing**: Error scenarios, empty states, filter combinations

## Test File Structure

```
meme_search/meme_search_app/test/controllers/
├── image_cores_controller_test.rb (existing - needs bulk tests added)
└── concerns/
    └── bulk_generation_test_helpers.rb (new - shared test utilities)
```

## Detailed Test Plan

### 1. Test Setup & Fixtures

**File**: `test/fixtures/image_cores.yml`

**Additions Needed**:
```yaml
# Images without descriptions for bulk testing
bulk_test_image_1:
  name: "bulk_test_1.jpg"
  image_path: test_path_1
  status: 0
  description: null

bulk_test_image_2:
  name: "bulk_test_2.jpg"
  image_path: test_path_1
  status: 0
  description: ""

# Images with descriptions (should be excluded)
bulk_test_image_3:
  name: "bulk_test_3.jpg"
  image_path: test_path_1
  status: 3
  description: "Already has description"

# Images for filter testing
bulk_test_tagged_1:
  name: "bulk_tagged_1.jpg"
  image_path: test_path_1
  status: 0
  description: null
  tags: [tag_1]

bulk_test_tagged_2:
  name: "bulk_tagged_2.jpg"
  image_path: test_path_2
  status: 0
  description: null
  tags: [tag_2]
```

**Test Helper Module** (`test/controllers/concerns/bulk_generation_test_helpers.rb`):
```ruby
module BulkGenerationTestHelpers
  def setup_bulk_test_images(count: 3, with_descriptions: false)
    # Create test images programmatically
  end

  def mock_python_service_success
    # Mock successful HTTP requests to Python service
  end

  def mock_python_service_failure
    # Mock failed HTTP requests
  end

  def assert_session_structure(session_data)
    # Verify session has correct structure and data types
  end

  def assert_image_queued(image_core)
    # Verify image status is in_queue and job was sent
  end
end
```

---

### 2. `bulk_generate_descriptions` Action Tests

**Location**: `test/controllers/image_cores_controller_test.rb`

#### Test Cases

**2.1 Basic Functionality**

```ruby
test "should queue all images without descriptions" do
  # Setup: 3 images without descriptions, 2 with descriptions
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Redirects to root_path
  #   - Session contains bulk_operation data
  #   - Session has correct structure (string keys!)
  #   - Session[:bulk_operation]["total_count"] == 3
  #   - Session[:bulk_operation]["image_ids"] == [ids of 3 images]
  #   - Only 3 images updated to status: 1 (in_queue)
  #   - HTTP requests sent to Python service (mock verify)
end

test "should initialize session with correct data types" do
  # Setup: 2 images without descriptions
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - session[:bulk_operation] is a Hash
  #   - session[:bulk_operation]["total_count"] is an Integer (not nil!)
  #   - session[:bulk_operation]["started_at"] is an Integer
  #   - session[:bulk_operation]["image_ids"] is an Array
  #   - session[:bulk_operation]["filter_params"] is a Hash
  # This test would have caught the string/symbol key bug!
end

test "should store image_ids in session for progress tracking" do
  # Setup: Create 4 specific images
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - session[:bulk_operation]["image_ids"] contains exactly 4 IDs
  #   - IDs match the created test images
  #   - Order is preserved (or consistent)
  # This test would have caught the progress bar bug!
end
```

**2.2 Filter Handling**

```ruby
test "should respect tag filter when queuing images" do
  # Setup: 3 images with tag_1, 2 images with tag_2
  # Action: POST bulk_generate_descriptions with selected_tag_names: "tag_1"
  # Assert:
  #   - session[:bulk_operation]["total_count"] == 3
  #   - session[:bulk_operation]["image_ids"] contains only tag_1 images
  #   - session[:bulk_operation]["filter_params"]["selected_tag_names"] == "tag_1"
  #   - Only 3 images updated to in_queue
end

test "should respect path filter when queuing images" do
  # Setup: 2 images in path_1, 3 images in path_2
  # Action: POST bulk_generate_descriptions with selected_path_names: "path_1"
  # Assert:
  #   - session[:bulk_operation]["total_count"] == 2
  #   - session[:bulk_operation]["image_ids"] contains only path_1 images
end

test "should respect has_embeddings filter correctly" do
  # Setup: 3 images with embeddings, 2 without
  # Action: POST with has_embeddings: "0" (no embeddings)
  # Assert:
  #   - Only queues 2 images without embeddings
  #   - session[:bulk_operation]["filter_params"]["has_embeddings"] == "0"
end

test "should handle empty string has_embeddings as no filter" do
  # Setup: 3 images with embeddings, 2 without
  # Action: POST with has_embeddings: ""
  # Assert:
  #   - Queues all 5 images (no filter applied)
  #   - This tests the bug fix from lines 432-447
end

test "should combine multiple filters correctly" do
  # Setup: Complex fixture with various tag/path/embedding combinations
  # Action: POST with tag_1 AND path_1 AND has_embeddings: "1"
  # Assert:
  #   - Only images matching ALL criteria are queued
  #   - Session contains all filter params
end
```

**2.3 Edge Cases**

```ruby
test "should handle zero images without descriptions" do
  # Setup: All images have descriptions
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Redirects successfully
  #   - session[:bulk_operation]["total_count"] == 0
  #   - session[:bulk_operation]["image_ids"] == []
  #   - No HTTP requests sent to Python service
end

test "should handle images with nil vs empty string descriptions" do
  # Setup: 2 images with description: nil, 2 with description: ""
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Queues all 4 images (both nil and "" count as "no description")
  #   - Matches logic at lines 126-129
end

test "should include status 0 images even with descriptions" do
  # Setup: Image with status: 0 but has description
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Image is queued (status=0 takes precedence)
  #   - Matches OR logic at line 127
end
```

**2.4 Python Service Integration**

```ruby
test "should send correct job data to Python service" do
  # Setup: 1 test image, mock HTTP
  # Action: POST bulk_generate_descriptions
  # Assert HTTP request contains:
  #   - image_core_id
  #   - image_path (path_name + "/" + image_name)
  #   - model (current ImageToText model name)
end

test "should handle Python service unavailable" do
  # Setup: Mock HTTP to raise connection error
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Image status remains 1 (in_queue) or set to 5 (failed)
  #   - Error is logged
  #   - Operation continues for other images
end

test "should handle Python service returning error" do
  # Setup: Mock HTTP to return 500 error
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - Error handling behavior
  #   - Session still initialized
end
```

**2.5 Session Management**

```ruby
test "should overwrite existing bulk_operation session" do
  # Setup: Start first bulk operation, then start second
  # Action: POST bulk_generate_descriptions twice
  # Assert:
  #   - Second session data overwrites first
  #   - New started_at timestamp
  #   - New image_ids list
end

test "should use current ImageToText model" do
  # Setup: Set specific model as current
  # Action: POST bulk_generate_descriptions
  # Assert:
  #   - HTTP request uses correct model name
  #   - Model name sent to Python service
end
```

---

### 3. `bulk_operation_status` Action Tests

**Location**: `test/controllers/image_cores_controller_test.rb`

#### Test Cases

**3.1 Session Retrieval**

```ruby
test "should return status when session exists" do
  # Setup: Initialize session with test data
  # Action: GET bulk_operation_status (JSON)
  # Assert:
  #   - Returns 200 OK
  #   - JSON contains status_counts, total, is_complete, started_at
  #   - total matches session["total_count"]
end

test "should access session with string keys not symbol keys" do
  # Setup: Create session with string keys
  # Action: GET bulk_operation_status
  # Assert:
  #   - total is NOT nil (tests the bug fix!)
  #   - started_at is NOT nil
  #   - Extracts data correctly
end

test "should return error when no session exists" do
  # Setup: No session data
  # Action: GET bulk_operation_status
  # Assert:
  #   - Returns 404
  #   - JSON contains error message
end

test "should handle missing image_ids in legacy sessions" do
  # Setup: Session without "image_ids" key (old format)
  # Action: GET bulk_operation_status
  # Assert:
  #   - Defaults to empty array []
  #   - Doesn't crash
  #   - Returns sensible counts
end
```

**3.2 Status Counting Logic**

```ruby
test "should count only images in image_ids array" do
  # Setup:
  #   - Session with image_ids: [1, 2, 3]
  #   - Image 1: status 3 (done)
  #   - Image 2: status 2 (processing)
  #   - Image 3: status 1 (in_queue)
  #   - Image 4: status 3 (done) but NOT in image_ids
  # Action: GET bulk_operation_status
  # Assert:
  #   - status_counts.done == 1 (only image 1, NOT image 4!)
  #   - status_counts.processing == 1
  #   - status_counts.in_queue == 1
  # This tests the progress bar fix!
end

test "should return correct status counts by status value" do
  # Setup: Session with 5 images in various states
  # Action: GET bulk_operation_status
  # Assert counts for:
  #   - not_started (status: 0)
  #   - in_queue (status: 1)
  #   - processing (status: 2)
  #   - done (status: 3)
  #   - failed (status: 5)
end

test "should calculate is_complete correctly" do
  # Setup: All images in session have status 3 or 5
  # Action: GET bulk_operation_status
  # Assert:
  #   - is_complete == true
  #   - active_count == 0
end

test "should not mark complete with remaining active images" do
  # Setup: 2 done, 1 processing, 1 in_queue
  # Action: GET bulk_operation_status
  # Assert:
  #   - is_complete == false
  #   - active_count == 2
end

test "should not mark complete with not_started images" do
  # Setup: 3 done, 1 not_started
  # Action: GET bulk_operation_status
  # Assert:
  #   - is_complete == false (has not_started)
end
```

**3.3 Session Cleanup**

```ruby
test "should clear session when operation complete" do
  # Setup: All images done/failed
  # Action: GET bulk_operation_status
  # Assert:
  #   - is_complete == true in response
  #   - session[:bulk_operation] is nil after request
end

test "should not clear session when operation incomplete" do
  # Setup: Mix of done and in_queue
  # Action: GET bulk_operation_status
  # Assert:
  #   - is_complete == false
  #   - session[:bulk_operation] still exists
end
```

**3.4 Filter Application**

```ruby
test "should apply stored filter params when counting" do
  # Setup:
  #   - Session with filter_params: {selected_tag_names: "tag_1"}
  #   - 3 images with tag_1 (2 in session image_ids, 1 not)
  #   - 2 images with tag_2 (not in session)
  # Action: GET bulk_operation_status
  # Assert:
  #   - Only counts 2 images (those in image_ids)
  #   - Filter params don't affect count (image_ids is source of truth)
end
```

---

### 4. `bulk_operation_cancel` Action Tests

**Location**: `test/controllers/image_cores_controller_test.rb`

#### Test Cases

**4.1 Basic Cancellation**

```ruby
test "should cancel pending jobs in Python service" do
  # Setup: 3 images in queue, mock HTTP
  # Action: POST bulk_operation_cancel
  # Assert:
  #   - Sends remove_job request for each image
  #   - Returns JSON with cancelled_count
  #   - Session cleared
end

test "should clear session after cancel" do
  # Setup: Active bulk operation
  # Action: POST bulk_operation_cancel
  # Assert:
  #   - session[:bulk_operation] is nil
  #   - Subsequent status request returns 404
end
```

**4.2 Edge Cases**

```ruby
test "should handle no active session gracefully" do
  # Setup: No session data
  # Action: POST bulk_operation_cancel
  # Assert:
  #   - Returns error or 0 cancelled_count
  #   - Doesn't crash
end

test "should handle Python service unavailable during cancel" do
  # Setup: Mock HTTP to fail
  # Action: POST bulk_operation_cancel
  # Assert:
  #   - Error logged
  #   - Session still cleared locally
  #   - Returns appropriate error response
end
```

---

### 5. Integration Tests

**Location**: `test/controllers/image_cores_controller_test.rb`

#### Test Cases

```ruby
test "full workflow: generate, poll status, complete" do
  # Setup: 2 test images
  # Actions:
  #   1. POST bulk_generate_descriptions
  #   2. GET bulk_operation_status (verify in_progress)
  #   3. Manually set images to status 3
  #   4. GET bulk_operation_status (verify complete + session cleared)
  # Assert: Full lifecycle works
end

test "full workflow: generate, poll, cancel" do
  # Setup: 3 test images
  # Actions:
  #   1. POST bulk_generate_descriptions
  #   2. GET bulk_operation_status (verify 3 queued)
  #   3. POST bulk_operation_cancel
  #   4. GET bulk_operation_status (verify 404)
  # Assert: Cancellation workflow works
end

test "concurrent sessions from different users" do
  # Setup: Two separate session contexts
  # Actions: Each user starts bulk operation
  # Assert:
  #   - Sessions are isolated
  #   - Each user only sees their own operation
end
```

---

### 6. Helper Method Tests

**Location**: `test/controllers/image_cores_controller_test.rb`

#### Test Cases

```ruby
test "get_filtered_image_cores applies filters correctly" do
  # Setup: Various images with different tags/paths
  # Action: Call get_filtered_image_cores with filter_params
  # Assert:
  #   - Returns correct filtered set
  #   - Respects all filter combinations
end

test "get_filtered_image_cores handles empty filters" do
  # Setup: All filters empty/nil
  # Action: Call get_filtered_image_cores({})
  # Assert:
  #   - Returns all images
end
```

---

## Test Execution Plan

### Phase 1: Core Functionality (Priority: High)
1. Session initialization and data types tests
2. Image queuing basic functionality
3. Status counting with image_ids
4. Session key handling (string vs symbol)

**Estimated time**: 4-6 hours

### Phase 2: Filter Handling (Priority: High)
1. Tag filter tests
2. Path filter tests
3. has_embeddings filter tests
4. Combined filter tests

**Estimated time**: 3-4 hours

### Phase 3: Edge Cases (Priority: Medium)
1. Empty state handling
2. Python service errors
3. Session edge cases
4. Nil vs empty string handling

**Estimated time**: 2-3 hours

### Phase 4: Integration & Workflow (Priority: Medium)
1. Full workflow tests
2. Cancellation workflow
3. Session cleanup verification

**Estimated time**: 2-3 hours

### Phase 5: Documentation & Cleanup (Priority: Low)
1. Test helper module
2. Fixture organization
3. Test documentation

**Estimated time**: 1-2 hours

**Total estimated time**: 12-18 hours

---

## Mock Patterns

### HTTP Mocking for Python Service

```ruby
# Success response
Net::HTTP.stub_any_instance(:request,
  Net::HTTPSuccess.new("1.1", "200", "OK").tap { |r|
    r.stub(:body, '{"status": "queued"}')
  }
) do
  # test code
end

# Failure response
Net::HTTP.stub_any_instance(:request,
  Net::HTTPServiceUnavailable.new("1.1", "503", "Service Unavailable")
) do
  # test code
end

# Connection error
Net::HTTP.stub_any_instance(:request) do
  raise Errno::ECONNREFUSED
end
```

### Session Mocking

```ruby
# Create session with proper structure
@request.session[:bulk_operation] = {
  "total_count" => 3,
  "started_at" => Time.current.to_i,
  "image_ids" => [1, 2, 3],
  "filter_params" => {
    "selected_tag_names" => "tag_1",
    "selected_path_names" => "",
    "has_embeddings" => ""
  }
}
```

---

## Success Criteria

### Coverage Goals
- **Line Coverage**: 100% for bulk generation methods
- **Branch Coverage**: 100% for filter logic and error paths
- **Test Count**: Minimum 35-40 tests

### Quality Gates
1. All tests pass independently
2. All tests pass when run together (no order dependencies)
3. Tests run in under 10 seconds total
4. No database pollution between tests
5. Mocks properly isolated

### Documentation
1. Each test has clear setup/action/assert structure
2. Comments explain the "why" not the "what"
3. Complex fixtures documented
4. Test helpers have usage examples

---

## Future Enhancements

### After Initial Implementation
1. **Performance Tests**: Bulk operations with 100+ images
2. **Concurrency Tests**: Multiple bulk operations simultaneously
3. **Race Condition Tests**: Status updates during polling
4. **Memory Tests**: Session size limits
5. **ActionCable Tests**: Real-time broadcast verification

### Test Utilities to Build
1. Factory pattern for test image creation
2. Shared examples for filter behavior
3. Custom assertions for session structure
4. VCR cassettes for Python service interactions (if needed)

---

## Notes

### Why These Tests Matter
1. **Caught Bugs**: Would have caught both recent bugs (session keys, progress calculation)
2. **Confidence**: Safe refactoring and feature additions
3. **Documentation**: Tests serve as living documentation
4. **Regression Prevention**: Automated safety net
5. **Faster Development**: Quick feedback on changes

### Testing Philosophy
- **Unit tests** verify individual method behavior
- **Integration tests** verify multi-step workflows
- **E2E tests** (existing Playwright) verify user experience
- All three layers create comprehensive coverage

### Maintenance Strategy
- Update tests when adding features
- Add regression tests for any bug fixes
- Keep test data minimal but realistic
- Prefer factories over fixtures for complex setup
