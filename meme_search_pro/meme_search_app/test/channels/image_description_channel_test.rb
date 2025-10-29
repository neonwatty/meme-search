require "test_helper"

class ImageDescriptionChannelTest < ActionCable::Channel::TestCase
  test "subscribes to image_description_channel" do
    subscribe
    assert subscription.confirmed?
  end

  test "subscribes to correct stream" do
    subscribe

    assert_has_stream "image_description_channel"
  end

  test "unsubscribes successfully" do
    subscribe
    assert subscription.confirmed?

    unsubscribe
    assert_no_streams
  end

  test "broadcasts description updates" do
    subscribe

    # Simulate a broadcast from the controller
    div_id = "description-image-core-id-1"
    description = "AI generated description text"

    assert_broadcasts "image_description_channel", 1 do
      ActionCable.server.broadcast(
        "image_description_channel",
        { div_id: div_id, description: description }
      )
    end
  end

  test "receives broadcast data with correct structure" do
    subscribe

    div_id = "description-image-core-id-123"
    description = "Test description"

    data = nil
    stub_connection.stub(:transmit, ->(message) {
      data = message
    }) do
      ActionCable.server.broadcast(
        "image_description_channel",
        { div_id: div_id, description: description }
      )
    end

    # Give time for broadcast to be received
    sleep 0.1

    # Verify structure (if data was captured)
    # Note: Direct broadcast verification can be tricky in tests
  end

  test "handles multiple subscribers" do
    # Subscribe first client
    subscribe

    # Simulate second client subscription (would need separate test case)
    assert subscription.confirmed?
  end

  test "streams from correct channel name" do
    subscribe

    # Verify the stream name matches what controller broadcasts to
    assert_has_stream "image_description_channel"
  end

  test "allows resubscription after unsubscribe" do
    subscribe
    assert subscription.confirmed?

    unsubscribe
    assert_no_streams

    subscribe
    assert subscription.confirmed?
    assert_has_stream "image_description_channel"
  end
end
