import { DEFAULT_BASE_URL, normalizeBaseUrl } from "./url.js";

const STORAGE_KEYS = ["baseUrl", "token"];

export function normalizeSettings(settings) {
  const normalized = {
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    token: String(settings.token || "").trim()
  };

  if (!normalized.token) {
    throw new Error("Enter an API token.");
  }

  return normalized;
}

export async function loadSettings(storage = chrome.storage.local) {
  const stored = await storage.get(STORAGE_KEYS);

  return {
    baseUrl: normalizeBaseUrl(stored.baseUrl || DEFAULT_BASE_URL),
    token: typeof stored.token === "string" ? stored.token.trim() : ""
  };
}

export async function saveSettings(settings, storage = chrome.storage.local) {
  const normalized = normalizeSettings(settings);

  await storage.set(normalized);
  return normalized;
}
