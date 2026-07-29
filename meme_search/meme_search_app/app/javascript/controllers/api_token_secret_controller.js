import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["status", "token"];

  async copy() {
    const token = this.tokenTarget.textContent.trim();

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");

      await navigator.clipboard.writeText(token);
      this.statusTarget.textContent = "Token copied.";
    } catch {
      this.statusTarget.textContent = "Copy failed. Select the token above and copy it manually.";
      this.tokenTarget.focus();
    }
  }
}
