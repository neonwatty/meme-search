import consumer from "channels/consumer";

consumer.subscriptions.create("ImageDescriptionChannel", {
  connected() {
    // Called when the subscription is ready for use on the server
  },

  disconnected() {
    // Called when the subscription has been terminated by the server
  },

  received(data) {
    // Called when there's incoming data on the websocket for this channel
    const statusDiv = document.getElementById(data.div_id);
    if (statusDiv) {
      statusDiv.innerHTML = data.description;
    }
  },
});
