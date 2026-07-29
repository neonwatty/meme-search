import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8")
);

test("manifest is a narrow unpacked Chromium MV3 surface", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["clipboardWrite", "storage"]);
  assert.deepEqual(manifest.optional_host_permissions.sort(), [
    "http://127.0.0.1/*",
    "http://localhost/*"
  ]);
  assert.equal(
    manifest.content_security_policy.extension_pages,
    "script-src 'self'; object-src 'self'"
  );
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.update_url, undefined);
});
