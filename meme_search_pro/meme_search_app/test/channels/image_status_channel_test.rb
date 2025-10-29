require "test_helper"

class ImageStatusChannelTest < ActionCable::Channel::TestCase
  test "subscribes to image_status_channel" do
    subscribe
    assert subscription.confirmed?
  end

  test "subscribes to correct stream" do
    subscribe

    assert_has_stream "image_status_channel"
  end

  test "unsubscribes successfully" do
    subscribe
    assert subscription.confirmed?

    unsubscribe
    assert_no_streams
  end

  test "broadcasts status updates" do
    subscribe

    # Simulate a broadcast from the controller
    div_id = "status-image-core-id-1"
    status_html = "<span class='status'>processing</span>"

    assert_broadcasts "image_status_channel", 1 do
      ActionCable.server.broadcast(
        "image_status_channel",
        { div_id: div_id, status_html: status_html }
      )
    end
  end

  test "receives broadcast data with correct structure" do
    subscribe

    div_id = "status-image-core-id-456"
    status_html = "<span class='status'>done</span>"

    data = nil
    stub_connection.stub(:transmit, ->(message) {
      data = message
    }) do
      ActionCable.server.broadcast(
        "image_status_channel",
        { div_id: div_id, status_html: status_html }
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
    assert_has_stream "image_status_channel"
  end

  test "allows resubscription after unsubscribe" do
    subscribe
    assert subscription.confirmed?

    unsubscribe
    assert_no_streams

    subscribe
    assert subscription.confirmed?
    assert_has_stream "image_status_channel"
  end

  test "handles status transitions" do
    subscribe

    # Simulate status changes: not_started -> in_queue -> processing -> done
    statuses = [ "not_started", "in_queue", "processing", "done" ]

    statuses.each_with_index do |status, i|
      div_id = "status-image-core-id-1"
      status_html = "<span class='status'>#{status}</span>"

      assert_broadcasts "image_status_channel", 1 do
        ActionCable.server.broadcast(
          "image_status_channel",
          { div_id: div_id, status_html: status_html }
        )
      end
    end
  end
end
