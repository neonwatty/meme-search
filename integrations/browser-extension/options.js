import { loadSettings, normalizeSettings, saveSettings } from "./lib/settings.js";
import { hostPermissionPattern } from "./lib/url.js";

const form = document.querySelector("#settings-form");
const baseUrlInput = document.querySelector("#base-url");
const tokenInput = document.querySelector("#token");
const status = document.querySelector("#settings-status");

function setStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

async function initialize() {
  try {
    const settings = await loadSettings();
    baseUrlInput.value = settings.baseUrl;
    tokenInput.value = settings.token;
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Requesting local server access…");
  form.querySelector("button[type=submit]").disabled = true;

  try {
    const normalized = normalizeSettings({
      baseUrl: baseUrlInput.value,
      token: tokenInput.value
    });
    const requestedPattern = hostPermissionPattern(normalized.baseUrl);
    const alreadyGranted = await chrome.permissions.contains({
      origins: [requestedPattern]
    });
    if (!alreadyGranted) {
      const granted = await chrome.permissions.request({ origins: [requestedPattern] });
      if (!granted) throw new Error("Local server access was not granted.");
    }

    let previousPattern;
    try {
      const previous = await loadSettings();
      previousPattern = hostPermissionPattern(previous.baseUrl);
    } catch {
      // A valid save must be able to repair malformed legacy storage.
    }

    let settings;
    try {
      settings = await saveSettings(normalized);
    } catch (error) {
      if (!alreadyGranted) {
        await chrome.permissions.remove({ origins: [requestedPattern] });
      }
      throw error;
    }

    if (previousPattern && previousPattern !== requestedPattern) {
      await chrome.permissions.remove({ origins: [previousPattern] });
    }

    baseUrlInput.value = settings.baseUrl;
    setStatus("Connection saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    form.querySelector("button[type=submit]").disabled = false;
  }
});

initialize();
