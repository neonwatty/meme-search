// Import and register all your controllers from the importmap via controllers/**/*_controller
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading";
import { application } from "controllers/application";

eagerLoadControllersFrom("controllers", application);
