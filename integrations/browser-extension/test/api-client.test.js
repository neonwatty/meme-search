import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  fetchMemeContent,
  searchMemes,
  validateSearchResponse
} from "../lib/api-client.js";
import { safeFilename } from "../lib/filename.js";
import { loadSettings, normalizeSettings, saveSettings } from "../lib/settings.js";
import {
  hostPermissionPattern,
  normalizeBaseUrl,
  resolveApiUrl
} from "../lib/url.js";

const conformanceFixtures = JSON.parse(
  await readFile(
    new URL("../../shared/search-response-conformance.json", import.meta.url),
    "utf8"
  )
);

test("shared search response conformance fixtures", () => {
  for (const fixture of conformanceFixtures.valid) {
    assert.doesNotThrow(
      () => validateSearchResponse(fixture.payload, "http://127.0.0.1:3000"),
      fixture.name
    );
  }

  for (const fixture of conformanceFixtures.invalid) {
    assert.throws(
      () => validateSearchResponse(fixture.payload, "http://127.0.0.1:3000"),
      /unexpected response|unsafe media URL/,
      fixture.name
    );
  }
});

test("normalizes supported loopback origins", () => {
  assert.equal(normalizeBaseUrl(" http://127.0.0.1:3000/ "), "http://127.0.0.1:3000");
  assert.equal(normalizeBaseUrl("http://localhost:3100"), "http://localhost:3100");
  assert.equal(hostPermissionPattern("http://127.0.0.1:3000"), "http://127.0.0.1/*");
});

test("rejects non-loopback, HTTPS, credentials, and paths", () => {
  assert.throws(() => normalizeBaseUrl("http://192.168.1.5:3000"), /only connects/);
  assert.throws(() => normalizeBaseUrl("https://localhost:3000"), /only connects/);
  assert.throws(() => normalizeBaseUrl("http://person:secret@localhost:3000"), /cannot include/);
  assert.throws(() => normalizeBaseUrl("http://localhost:3000/app"), /without a path/);
});

test("keeps server-provided media URLs on the configured API origin", () => {
  assert.equal(
    resolveApiUrl("http://127.0.0.1:3000", "/api/v1/memes/7/content").href,
    "http://127.0.0.1:3000/api/v1/memes/7/content"
  );
  assert.throws(
    () => resolveApiUrl("http://127.0.0.1:3000", "https://example.com/meme.jpg"),
    /unsafe media URL/
  );
  assert.throws(
    () => resolveApiUrl("http://127.0.0.1:3000", "/admin/export"),
    /unexpected media URL/
  );
  assert.throws(
    () => resolveApiUrl(
      "http://127.0.0.1:3000",
      "/api/v1/memes/7/content?next=https://example.com"
    ),
    /unexpected media URL/
  );
});

test("search sends a bearer token and bounded query parameters", async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({
      data: [{
        id: 7,
        filename: "incident.jpg",
        description: "An incident",
        tags: ["work"],
        media_type: "image/jpeg",
        content_url: "/api/v1/memes/7/content"
      }],
      meta: {
        query: "production incident",
        mode: "keyword",
        tags: [],
        limit: 4,
        count: 1
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await searchMemes({
    baseUrl: "http://127.0.0.1:3000",
    token: "ms_example",
    query: " production incident ",
    mode: "keyword",
    limit: 4
  }, fakeFetch);

  assert.equal(captured.options.headers.Authorization, "Bearer ms_example");
  assert.equal(captured.options.headers.Accept, "application/json");
  assert.equal(captured.options.redirect, "error");
  assert.equal(captured.url.searchParams.get("q"), "production incident");
  assert.equal(captured.url.searchParams.get("mode"), "keyword");
  assert.equal(captured.url.searchParams.get("limit"), "4");
  assert.equal(response.data[0].id, 7);
});

test("search validates inputs before making a request", async () => {
  const neverFetch = () => assert.fail("fetch should not be called");

  await assert.rejects(
    searchMemes({ baseUrl: "http://localhost:3000", token: "x", query: "", limit: 8 }, neverFetch),
    /Enter a search query/
  );
  await assert.rejects(
    searchMemes({ baseUrl: "http://localhost:3000", token: "x", query: "hi", limit: 21 }, neverFetch),
    /between 1 and 20/
  );
});

test("content requests remain authenticated and require an image response", async () => {
  let capturedOptions;
  const imageFetch = async (_url, options) => {
    capturedOptions = options;
    return new Response(new Blob(["image"], { type: "image/png" }), {
      status: 200,
      headers: { "Content-Type": "image/png" }
    });
  };

  const blob = await fetchMemeContent({
    baseUrl: "http://127.0.0.1:3000",
    token: "ms_media",
    contentUrl: "/api/v1/memes/9/content"
  }, imageFetch);

  assert.equal(capturedOptions.headers.Authorization, "Bearer ms_media");
  assert.equal(capturedOptions.headers.Accept, "image/*,application/octet-stream");
  assert.equal(capturedOptions.redirect, "error");
  assert.equal(blob.type, "image/png");

  await assert.rejects(
    fetchMemeContent({
      baseUrl: "http://127.0.0.1:3000",
      token: "ms_media",
      contentUrl: "/api/v1/memes/9/content"
    }, async () => new Response("no", { status: 200, headers: { "Content-Type": "text/plain" } })),
    /non-image/
  );
});

test("API errors use a safe status-specific message", async () => {
  await assert.rejects(
    searchMemes({
      baseUrl: "http://127.0.0.1:3000",
      token: "bad",
      query: "hello",
      mode: "keyword",
      limit: 8
    }, async () => new Response("", { status: 401 })),
    /token is missing or invalid/
  );
});

test("API errors redact reflected tokens and reject redirects", async () => {
  await assert.rejects(
    searchMemes({
      baseUrl: "http://127.0.0.1:3000",
      token: "ms_reflected_secret",
      query: "hello",
      mode: "keyword",
      limit: 8
    }, async () => new Response(JSON.stringify({
      error: { message: "bad token ms_reflected_secret" }
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })),
    (error) => {
      assert.match(error.message, /\[REDACTED\]/);
      assert.doesNotMatch(error.message, /ms_reflected_secret/);
      return true;
    }
  );

  await assert.rejects(
    searchMemes({
      baseUrl: "http://127.0.0.1:3000",
      token: "ms_token",
      query: "hello",
      mode: "keyword",
      limit: 8
    }, async () => ({ ok: true, redirected: true })),
    /unexpected redirect/
  );
});

test("search and media fetches preserve abort cancellation", async () => {
  const controller = new AbortController();
  const abortingFetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(
      new DOMException("cancelled", "AbortError")
    ), { once: true });
  });

  const search = searchMemes({
    baseUrl: "http://127.0.0.1:3000",
    token: "ms_token",
    query: "hello",
    signal: controller.signal
  }, abortingFetch);
  const media = fetchMemeContent({
    baseUrl: "http://127.0.0.1:3000",
    token: "ms_token",
    contentUrl: "/api/v1/memes/7/content",
    signal: controller.signal
  }, abortingFetch);

  controller.abort();

  await assert.rejects(search, { name: "AbortError" });
  await assert.rejects(media, { name: "AbortError" });
});

test("search rejects invalid JSON, invalid fields, and unsafe content URLs", async () => {
  const input = {
    baseUrl: "http://127.0.0.1:3000",
    token: "ms_token",
    query: "hello",
    mode: "keyword",
    limit: 8
  };

  await assert.rejects(
    searchMemes(input, async () => new Response("{bad", { status: 200 })),
    /invalid JSON/
  );
  await assert.rejects(
    searchMemes(input, async () => new Response(JSON.stringify({
      data: [{ id: "seven" }],
      meta: {}
    }), { status: 200, headers: { "Content-Type": "application/json" } })),
    /unexpected response/
  );
  await assert.rejects(
    searchMemes(input, async () => new Response(JSON.stringify({
      data: [{
        id: 7,
        filename: "incident.jpg",
        description: null,
        tags: [],
        media_type: "image/jpeg",
        content_url: "https://attacker.example/steal"
      }],
      meta: {
        query: "hello",
        mode: "keyword",
        tags: [],
        limit: 8,
        count: 1
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } })),
    /unsafe media URL/
  );
});

test("settings validate before storage and round trip only the expected keys", async () => {
  assert.throws(
    () => normalizeSettings({ baseUrl: "http://127.0.0.1:3000", token: "" }),
    /Enter an API token/
  );

  const values = {};
  const storage = {
    async get(keys) {
      assert.deepEqual(keys, ["baseUrl", "token"]);
      return values;
    },
    async set(update) {
      Object.assign(values, update);
    }
  };

  const saved = await saveSettings({
    baseUrl: "http://localhost:3000/",
    token: " ms_local "
  }, storage);
  assert.deepEqual(saved, {
    baseUrl: "http://localhost:3000",
    token: "ms_local"
  });
  assert.deepEqual(await loadSettings(storage), saved);
});

test("download filenames cannot escape directories or become dot entries", () => {
  assert.equal(safeFilename("../../secret.gif"), "secret.gif");
  assert.equal(safeFilename(".."), "meme");
  assert.equal(safeFilename("bad/name\u0000.gif"), "name_.gif");
});
