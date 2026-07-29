const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

export const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

export function normalizeBaseUrl(value) {
  let url;

  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error("Enter a valid Meme Search URL.");
  }

  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("The extension only connects to http://localhost or http://127.0.0.1.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("The Meme Search URL cannot include credentials, a query, or a fragment.");
  }

  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("Use the server origin only, without a path.");
  }

  return url.origin;
}

export function hostPermissionPattern(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl));
  return `${url.protocol}//${url.hostname}/*`;
}

export function resolveApiUrl(baseUrl, path) {
  const base = new URL(`${normalizeBaseUrl(baseUrl)}/`);
  const resolved = new URL(path, base);

  if (resolved.origin !== base.origin) {
    throw new Error("The server returned an unsafe media URL.");
  }

  if (
    resolved.search
    || resolved.hash
    || !/^\/api\/v1\/memes\/[1-9][0-9]*\/content$/.test(resolved.pathname)
  ) {
    throw new Error("The server returned an unexpected media URL.");
  }

  return resolved;
}
