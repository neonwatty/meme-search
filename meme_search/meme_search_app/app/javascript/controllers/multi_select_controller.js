import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["options", "selectedItems", "hiddenField"];
  static values = { autoSubmit: { type: Boolean, default: false } };

  connect() {
    document.addEventListener("click", this.handleOutsideClick.bind(this));
    // Initialize both display and hidden field on load (important for paths that start checked)
    this.updateSelection(false);
  }

  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick.bind(this));
  }

  toggle() {
    this.optionsTarget.classList.toggle("hidden");
  }

  updateDisplayOnly() {
    // Update only the display text based on current checkbox state
    // DO NOT update the hidden field value (preserves server-side value on initial load)
    const checkboxes = this.optionsTarget.querySelectorAll(
      "input[type='checkbox']"
    );
    const selected = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    this.selectedItemsTarget.textContent = selected.length
      ? selected.join(", ")
      : "Choose tags";
  }

  updateSelection(shouldSubmitArg) {
    // Handle both event objects and explicit boolean values
    // When called from Stimulus action (checkbox change), shouldSubmitArg will be an Event object
    // When called from connect(), shouldSubmitArg will be false
    // Only submit if: (1) not called during initialization AND (2) autoSubmit is enabled
    const isInitialization = shouldSubmitArg === false;

    const checkboxes = this.optionsTarget.querySelectorAll(
      "input[type='checkbox']"
    );
    const selected = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    // Update the display text
    this.selectedItemsTarget.textContent = selected.length
      ? selected.join(", ")
      : "Choose tags";

    // Update the hidden input value
    // Dynamically find the hidden field - works for both search forms and edit forms
    // Search forms use: name="selected_tag_names" or name="selected_path_names"
    // Edit forms use: name="image_core[selected_tag_names]"
    const hiddenField = this.element.querySelector("input[type='hidden'][name*='selected_']");

    if (hiddenField) {
      hiddenField.value = selected.length ? selected.join(", ") : "";
    }

    // Trigger form submission when tags change (but not on initial page load)
    // Only auto-submit if the autoSubmit value is true (default for search forms)
    if (!isInitialization && this.autoSubmitValue) {
      const form = this.element.closest("form");
      if (form) {
        form.requestSubmit();
      }
    }
  }

  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.optionsTarget.classList.add("hidden");
    }
  }
}
