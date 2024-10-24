// app/javascript/controllers/multi_select_controller.js
import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="multi-select"
export default class extends Controller {
  static targets = ["dropdown", "select", "checkboxContainer"];

  connect() {
    const optionsData = this.selectTarget.dataset.options;
    this.options = optionsData.split(",").map((option) => option.trim());
    this.createCheckboxes(this.options);
  }

  createCheckboxes(options) {
    options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "flex items-center";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option;
      checkbox.className = "mr-2";

      checkbox.addEventListener("change", () => {
        this.updateButtonText();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(option));
      this.checkboxContainerTarget.appendChild(label);
    });
  }

  toggleDropdown() {
    this.dropdownTarget.classList.toggle("hidden");
  }

  updateButtonText() {
    const selectedOptions = Array.from(
      this.checkboxContainerTarget.querySelectorAll('input[type="checkbox"]')
    )
      .filter((i) => i.checked)
      .map((i) => i.value);

    this.selectTarget.value =
      selectedOptions.length > 0
        ? selectedOptions.join(", ")
        : "Select options";
  }

  closeDropdown(event) {
    if (
      !this.selectTarget.contains(event.target) &&
      !this.dropdownTarget.contains(event.target)
    ) {
      this.dropdownTarget.classList.add("hidden");
    }
  }
}