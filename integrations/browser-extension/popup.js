import { fetchMemeContent, searchMemes } from "./lib/api-client.js";
import { copyOriginalToClipboard } from "./lib/clipboard.js";
import { safeFilename } from "./lib/filename.js";
import { convertToPng } from "./lib/image-conversion.js";
import { MediaWorkSession } from "./lib/media-work-session.js";
import { loadSettings } from "./lib/settings.js";
import { hostPermissionPattern } from "./lib/url.js";

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const modeInput = document.querySelector("#mode");
const limitInput = document.querySelector("#limit");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const template = document.querySelector("#result-template");
const settingsButton = document.querySelector("#open-settings");
let activeSession;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function clearResults() {
  activeSession?.cancel();
  activeSession = undefined;
  results.replaceChildren();
}

async function ensureHostPermission(baseUrl) {
  const origins = [hostPermissionPattern(baseUrl)];
  if (await chrome.permissions.contains({ origins })) return true;
  return chrome.permissions.request({ origins });
}

function downloadBlob(blob, filename, session) {
  const url = session.retainObjectUrl(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.click();
  setTimeout(() => session.releaseObjectUrl(url), 1_000);
}

function mediaLoader(meme, settings) {
  return (signal) => fetchMemeContent({
    baseUrl: settings.baseUrl,
    token: settings.token,
    contentUrl: meme.content_url,
    signal
  });
}

function renderMeme(meme, settings, session) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".result-card");
  const title = fragment.querySelector(".result-title");
  const description = fragment.querySelector(".result-description");
  const tags = fragment.querySelector(".result-tags");
  const copyButton = fragment.querySelector(".copy-button");
  const downloadButton = fragment.querySelector(".download-button");

  title.textContent = meme.filename || `Meme ${meme.id}`;
  description.textContent = meme.description || "No description";
  const tagNames = Array.isArray(meme.tags) ? meme.tags.map(String) : [];
  tags.textContent = tagNames.length ? tagNames.map((tag) => `#${tag}`).join(" ") : "No tags";

  copyButton.addEventListener("click", async () => {
    copyButton.disabled = true;
    try {
      await copyOriginalToClipboard(session, mediaLoader(meme, settings));
      setStatus(`Copied ${safeFilename(meme.filename)}.`, "success");
    } catch (error) {
      if (error.name !== "AbortError" && activeSession === session) {
        setStatus(error.message, "error");
      }
    } finally {
      if (activeSession === session) copyButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", async () => {
    downloadButton.disabled = true;
    try {
      await session.runOriginal(
        mediaLoader(meme, settings),
        (blob) => downloadBlob(blob, meme.filename, session)
      );
      setStatus(`Downloaded ${safeFilename(meme.filename)}.`, "success");
    } catch (error) {
      if (error.name !== "AbortError" && activeSession === session) {
        setStatus(error.message, "error");
      }
    } finally {
      if (activeSession === session) downloadButton.disabled = false;
    }
  });

  results.append(card);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResults();
  const session = new MediaWorkSession();
  activeSession = session;
  setStatus("Searching…");
  form.querySelector("button[type=submit]").disabled = true;

  try {
    const settings = await loadSettings();
    if (!settings.token) {
      chrome.runtime.openOptionsPage();
      throw new Error("Add an API token in extension settings.");
    }

    if (!(await ensureHostPermission(settings.baseUrl))) {
      throw new Error("Local server access was not granted.");
    }

    const response = await searchMemes({
      baseUrl: settings.baseUrl,
      token: settings.token,
      query: queryInput.value,
      mode: modeInput.value,
      limit: Number(limitInput.value),
      signal: session.signal
    });

    if (activeSession !== session) return;
    if (response.data.length === 0) {
      setStatus("No matching memes found.");
      return;
    }

    for (const meme of response.data) renderMeme(meme, settings, session);
    setStatus(`${response.data.length} result${response.data.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    if (error.name !== "AbortError" && activeSession === session) {
      setStatus(error.message, "error");
    }
  } finally {
    if (activeSession === session) {
      form.querySelector("button[type=submit]").disabled = false;
    }
  }
});

settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
window.addEventListener("unload", clearResults);
