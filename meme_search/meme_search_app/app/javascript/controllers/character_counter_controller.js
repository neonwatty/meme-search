import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["input", "count"];

  connect() {
    // Initialize count on page load
    this.update();
  }

  update() {
    const length = this.inputTarget.value.length;
    this.countTarget.textContent = length.toLocaleString();
  }
}
