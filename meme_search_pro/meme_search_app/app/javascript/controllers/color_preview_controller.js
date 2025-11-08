import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["color", "preview", "previewBadge", "hexDisplay", "fullTagBadge", "fullTagDot"];

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
      this.previewBadgeTarget.style.border = `2px solid ${color}`;
    }

    // Update the full tag badge in the index grid (if present)
    if (this.hasFullTagBadgeTarget) {
      this.fullTagBadgeTarget.style.backgroundColor = color + "33"; // 33 for 20% opacity
      this.fullTagBadgeTarget.style.color = color;
      this.fullTagBadgeTarget.style.border = `2px solid ${color}`;
    }

    // Update the full tag dot in the index grid (if present)
    if (this.hasFullTagDotTarget) {
      this.fullTagDotTarget.style.backgroundColor = color;
    }

    // Update the hex display
    if (this.hasHexDisplayTarget) {
      this.hexDisplayTarget.textContent = color;
    }
  }
}
