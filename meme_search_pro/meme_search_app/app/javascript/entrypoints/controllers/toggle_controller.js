import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  toggle(event) {
    const selectedRadio = event.currentTarget;

    // Select all radio buttons with the same name and uncheck others
    document.querySelectorAll('input[name="current_id"]').forEach((radio) => {
      if (radio !== selectedRadio) {
        setTimeout(() => {
          radio.checked = false; // Delay ensures smooth animation
        }, 10);
      }
    });
  }
}
