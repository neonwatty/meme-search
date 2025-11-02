import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["color", "preview", "previewBadge", "hexDisplay"];

  connect() {
    // Initialize preview on page load
    this.update();
  }

  update() {
    const color = this.colorTarget.value;

    // Update the dot preview
    if (this.hasPreviewTarget) {
      this.previewTarget.style.backgroundColor = color;
    }

    // Update the preview badge
    if (this.hasPreviewBadgeTarget) {
      this.previewBadgeTarget.style.backgroundColor = color + "33"; // 33 for 20% opacity
      this.previewBadgeTarget.style.color = color;
      this.previewBadgeTarget.style.borderColor = color;
    }

    // Update the hex display
    if (this.hasHexDisplayTarget) {
      this.hexDisplayTarget.textContent = color;
    }
  }
}
