import { normalizeBaseUrl, resolveApiUrl } from "./url.js";

const SEARCH_MODES = new Set(["keyword", "vector"]);

function authorizationHeader(token) {
  const value = String(token || "").trim();
  if (!value) throw new Error("Add an API token in extension settings.");
  return `Bearer ${value}`;
}

function redactSecret(message, token) {
  const secret = String(token || "").trim();
  return secret ? message.replaceAll(secret, "[REDACTED]") : message;
}

async function responseError(response, token) {
  let serverMessage;

  try {
    const body = await response.json();
    serverMessage = body?.error?.message || body?.error;
  } catch {
    // An HTML proxy error or empty response should not leak into the popup.
  }

  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return redactSecret(serverMessage.trim(), token);
  }

  switch (response.status) {
    case 401:
      return "The API token is missing or invalid.";
    case 403:
      return "This token does not have the required permission.";
    case 429:
      return "Too many searches. Wait a moment and try again.";
    default:
      return `Meme Search returned HTTP ${response.status}.`;
  }
}

async function fetchAuthorized(url, token, fetchImpl, accept, signal) {
  let response;

  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: accept,
        Authorization: authorizationHeader(token)
      },
      redirect: "error",
      signal
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Could not reach Meme Search. Check that it is running and the URL is correct.");
  }

  if (response.redirected) {
    throw new Error("Meme Search returned an unexpected redirect.");
  }
  if (!response.ok) throw new Error(await responseError(response, token));
  return response;
}

export function validateSearchResponse(body, baseUrl) {
  if (!body || !Array.isArray(body.data) || !body.meta || typeof body.meta !== "object") {
    throw new Error("Meme Search returned an unexpected response.");
  }

  const { meta } = body;
  if (
    typeof meta.query !== "string"
    || !SEARCH_MODES.has(meta.mode)
    || !Array.isArray(meta.tags)
    || !meta.tags.every((tag) => typeof tag === "string")
    || !Number.isInteger(meta.limit)
    || meta.limit < 1
    || meta.limit > 20
    || !Number.isInteger(meta.count)
    || meta.count < 0
    || meta.count > 20
  ) {
    throw new Error("Meme Search returned an unexpected response.");
  }

  for (const meme of body.data) {
    if (
      !meme
      || !Number.isInteger(meme.id)
      || meme.id < 1
      || typeof meme.filename !== "string"
      || (meme.description !== null && typeof meme.description !== "string")
      || !Array.isArray(meme.tags)
      || !meme.tags.every((tag) => typeof tag === "string")
      || typeof meme.media_type !== "string"
      || typeof meme.content_url !== "string"
    ) {
      throw new Error("Meme Search returned an unexpected response.");
    }
    resolveApiUrl(baseUrl, meme.content_url);
  }
}

export async function searchMemes(
  { baseUrl, token, query, mode = "keyword", limit = 8, signal },
  fetchImpl = fetch
) {
  const trimmedQuery = String(query || "").trim();
  const parsedLimit = Number(limit);

  if (!trimmedQuery) throw new Error("Enter a search query.");
  if (trimmedQuery.length > 200) throw new Error("Search queries must be 200 characters or fewer.");
  if (!SEARCH_MODES.has(mode)) throw new Error("Choose a supported search mode.");
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
    throw new Error("Result limit must be between 1 and 20.");
  }

  const url = new URL("/api/v1/search", `${normalizeBaseUrl(baseUrl)}/`);
  url.searchParams.set("q", trimmedQuery);
  url.searchParams.set("mode", mode);
  url.searchParams.set("limit", String(parsedLimit));

  const response = await fetchAuthorized(
    url,
    token,
    fetchImpl,
    "application/json",
    signal
  );
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Meme Search returned invalid JSON.");
  }
  validateSearchResponse(body, baseUrl);

  return {
    data: body.data,
    meta: body.meta
  };
}

export async function fetchMemeContent(
  { baseUrl, token, contentUrl, signal },
  fetchImpl = fetch
) {
  const url = resolveApiUrl(baseUrl, contentUrl);
  const response = await fetchAuthorized(
    url,
    token,
    fetchImpl,
    "image/*,application/octet-stream",
    signal
  );
  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error("Meme Search returned a non-image file.");
  }

  return blob;
}
