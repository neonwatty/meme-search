# frozen_string_literal: true

module BulkGenerationTestHelpers
  # Create test images for bulk generation testing
  def setup_bulk_test_images(count: 3, with_descriptions: false, status: 0, path_name: nil, tag_names: [])
    images = []
    count.times do |i|
      path = path_name ? ImagePath.find_by(name: path_name) : image_paths(:one)

      image = ImageCore.create!(
        name: "bulk_test_#{i}_#{Time.current.to_i}.jpg",
        image_path: path,
        status: status,
        description: with_descriptions ? "Test description #{i}" : nil
      )

      # Add tags if specified
      tag_names.each do |tag_name|
        tag = TagName.find_or_create_by!(name: tag_name)
        ImageTag.create!(image_core: image, tag_name: tag)
      end

      images << image
    end
    images
  end

  # Mock successful HTTP requests to Python service
  def mock_python_service_success
    stub_request(:post, %r{http://image_to_text_generator:8000/add_job})
      .to_return(status: 200, body: '{"status": "queued"}', headers: { "Content-Type" => "application/json" })
    stub_request(:post, %r{http://image_to_text_generator:8000/remove_job})
      .to_return(status: 200, body: '{"status": "cancelled"}', headers: { "Content-Type" => "application/json" })
    stub_request(:delete, %r{http://image_to_text_generator:8000/remove_job/\d+})
      .to_return(status: 200, body: '{"status": "cancelled"}', headers: { "Content-Type" => "application/json" })
    yield
    WebMock.reset!
  end

  # Mock failed HTTP requests to Python service
  def mock_python_service_failure
    stub_request(:post, %r{http://image_to_text_generator:8000/add_job})
      .to_return(status: 503, body: '{"error": "Service unavailable"}', headers: { "Content-Type" => "application/json" })
    yield
    WebMock.reset!
  end

  # Mock connection error to Python service
  def mock_python_service_connection_error
    stub_request(:post, %r{http://image_to_text_generator:8000/add_job})
      .to_raise(Errno::ECONNREFUSED)
    yield
    WebMock.reset!
  end

  # Verify session has correct structure and data types
  def assert_session_structure(session_data)
    assert_not_nil session_data, "Session data should exist"
    assert_instance_of Hash, session_data

    # In tests, controller sets symbol keys which remain as symbols in test session
    # In production, ActionDispatch::Session converts to strings
    # Use flexible access for both
    total_count = session_data[:total_count] || session_data["total_count"]
    started_at = session_data[:started_at] || session_data["started_at"]
    image_ids = session_data[:image_ids] || session_data["image_ids"]
    filter_params = session_data[:filter_params] || session_data["filter_params"]

    # Check data types
    assert_instance_of Integer, total_count
    assert_instance_of Integer, started_at
    assert_instance_of Array, image_ids
    assert_instance_of Hash, filter_params
  end

  # Verify image status is in_queue
  def assert_image_queued(image_core)
    image_core.reload
    assert_equal "in_queue", image_core.status, "Image should be in_queue"
  end

  # Verify image status is done
  def assert_image_done(image_core)
    image_core.reload
    assert_equal "done", image_core.status, "Image should be done"
  end

  # Build session data structure for passing to GET/POST requests
  # Use this to create session data that you pass to requests via session: parameter
  def build_bulk_session_data(image_ids:, total_count: nil, filter_params: {})
    {
      bulk_operation: {
        total_count: total_count || image_ids.length,
        started_at: Time.current.to_i,
        image_ids: image_ids,
        filter_params: {
          selected_tag_names: filter_params[:selected_tag_names] || "",
          selected_path_names: filter_params[:selected_path_names] || "",
          has_embeddings: filter_params[:has_embeddings] || ""
        }
      }
    }
  end

  # Get status counts from response JSON
  def parse_status_response(response)
    JSON.parse(response.body)
  end

  # Verify status counts match expected values
  def assert_status_counts(response, expected)
    data = parse_status_response(response)
    status_counts = data["status_counts"]

    expected.each do |key, value|
      assert_equal value, status_counts[key.to_s], "#{key} count mismatch"
    end
  end

  private

  def successful_http_response
    Net::HTTPSuccess.new("1.1", "200", "OK").tap do |response|
      response.define_singleton_method(:body) { '{"status": "queued"}' }
    end
  end

  def failed_http_response
    Net::HTTPServiceUnavailable.new("1.1", "503", "Service Unavailable").tap do |response|
      response.define_singleton_method(:body) { '{"error": "Service unavailable"}' }
    end
  end
end
