import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["expiry", "localExpiry"];

  connect() {
    this.localExpiryTarget.min = this.localDateTimeValue(new Date());
  }

  prepareExpiry() {
    const localValue = this.localExpiryTarget.value;
    this.expiryTarget.value = localValue ? new Date(localValue).toISOString() : "";
  }

  localDateTimeValue(date) {
    const pad = (value) => String(value).padStart(2, "0");

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
