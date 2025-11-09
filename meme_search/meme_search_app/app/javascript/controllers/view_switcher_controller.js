import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["listView", "gridView", "masonryView", "toggleButton"];

  connect() {
    // Restore view mode from sessionStorage
    this.viewMode = sessionStorage.getItem("viewMode") || "list";
    this.updateView();
  }

  get viewMode() {
    return this.data.get("viewMode") || "list";
  }

  set viewMode(mode) {
    this.data.set("viewMode", mode);
    sessionStorage.setItem("viewMode", mode);
  }

  toggleView() {
    // Cycle through: list → grid → masonry → list
    const modes = ["list", "grid", "masonry"];
    const currentIndex = modes.indexOf(this.viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.viewMode = modes[nextIndex];
    this.updateView();
  }

  updateView() {
    if (this.hasListViewTarget && this.hasGridViewTarget && this.hasMasonryViewTarget) {
      // Hide all views first
      this.listViewTarget.classList.toggle("hidden", this.viewMode !== "list");
      this.gridViewTarget.classList.toggle("hidden", this.viewMode !== "grid");
      this.masonryViewTarget.classList.toggle("hidden", this.viewMode !== "masonry");

      // Update button text and colors
      if (this.hasToggleButtonTarget) {
        const labels = {
          list: "Switch to Grid View",
          grid: "Switch to Masonry View",
          masonry: "Switch to List View"
        };
        const colors = {
          list: { bg: "bg-cyan-700", hover: "hover:bg-cyan-600" },
          grid: { bg: "bg-purple-700", hover: "hover:bg-purple-600" },
          masonry: { bg: "bg-fuchsia-700", hover: "hover:bg-fuchsia-600" }
        };

        this.toggleButtonTarget.textContent = labels[this.viewMode];

        // Remove all color classes
        this.toggleButtonTarget.classList.remove("bg-cyan-700", "bg-purple-700", "bg-fuchsia-700");
        this.toggleButtonTarget.classList.remove("hover:bg-cyan-600", "hover:bg-purple-600", "hover:bg-fuchsia-600");

        // Add current color classes
        const currentColors = colors[this.viewMode];
        this.toggleButtonTarget.classList.add(currentColors.bg, currentColors.hover);
      }
    } else {
      console.error("🚨 Error: View targets missing in DOM!");
    }
  }
}
