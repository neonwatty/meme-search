import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["listView", "gridView", "toggleButton"];

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
    this.viewMode = this.viewMode === "list" ? "grid" : "list";
    this.updateView();
  }

  updateView() {
    if (this.hasListViewTarget && this.hasGridViewTarget) {
      const isListView = this.viewMode === "list";
      this.listViewTarget.classList.toggle("hidden", !isListView);
      this.gridViewTarget.classList.toggle("hidden", isListView);

      if (this.hasToggleButtonTarget) {
        this.toggleButtonTarget.textContent = isListView
          ? "Switch to Grid View"
          : "Switch to List View";
      }

      // ✅ Toggle button color
      this.toggleButtonTarget.classList.toggle("bg-cyan-700", isListView);
      this.toggleButtonTarget.classList.toggle("bg-purple-700", !isListView);
      this.toggleButtonTarget.classList.toggle("hover:bg-cyan-600", isListView);
      this.toggleButtonTarget.classList.toggle(
        "hover:bg-purple-600",
        !isListView
      );
    } else {
      console.error("🚨 Error: Targets missing in DOM!");
    }
  }
}
