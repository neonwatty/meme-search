import { Application } from "@hotwired/stimulus";
import {
  Alert,
  Dropdown,
  Slideover,
} from "tailwindcss-stimulus-components";

const application = Application.start();
application.register("alert", Alert);
application.register("slideover", Slideover);
application.register("dropdown", Dropdown);

// Configure Stimulus development experience
application.debug = false;
window.Stimulus = application;

export { application };
