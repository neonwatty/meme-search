import assert from "node:assert/strict";
import test from "node:test";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { MediaWorkSession } from "../lib/media-work-session.js";

test("popup has no automatic preview or viewport media path", async () => {
  const popupPath = fileURLToPath(new URL("../popup.js", import.meta.url));
  const popupHtmlPath = fileURLToPath(new URL("../popup.html", import.meta.url));
  const [source, html] = await Promise.all([
    readFile(popupPath, "utf8"),
    readFile(popupHtmlPath, "utf8")
  ]);

  assert.doesNotMatch(source, /loadPreview|IntersectionObserver|previewLoader/);
  assert.doesNotMatch(html, /preview-frame|<img/i);
  assert.match(html, /Media loads only after Copy or Download/);
});

test("cancels stale original actions", async () => {
  const session = new MediaWorkSession();
  let copyActionRan = false;
  let downloadActionRan = false;
  const abortableLoader = (signal) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(
      new DOMException("cancelled", "AbortError")
    ), { once: true });
  });

  const copy = session.runOriginal(
    abortableLoader,
    async () => {
      copyActionRan = true;
    }
  );
  const download = session.runOriginal(
    abortableLoader,
    async () => {
      downloadActionRan = true;
    }
  );

  session.cancel();

  await assert.rejects(copy, { name: "AbortError" });
  await assert.rejects(download, { name: "AbortError" });
  assert.equal(copyActionRan, false);
  assert.equal(downloadActionRan, false);
  assert.equal(session.signal.aborted, true);
});

test("revokes every action object URL on rerender or unload", async () => {
  const created = [];
  const revoked = [];
  const session = new MediaWorkSession({
    createObjectURL(blob) {
      const url = `blob:${created.length + 1}`;
      created.push({ blob, url });
      return url;
    },
    revokeObjectURL(url) {
      revoked.push(url);
    }
  });

  const firstActionUrl = session.retainObjectUrl(new Blob(["download-one"]));
  const secondActionUrl = session.retainObjectUrl(new Blob(["download-two"]));
  assert.deepEqual([firstActionUrl, secondActionUrl], ["blob:1", "blob:2"]);

  session.cancel();

  assert.deepEqual(revoked.sort(), ["blob:1", "blob:2"]);
  assert.equal(session.objectUrls.size, 0);
});

test("original loader runs only inside an explicit action", async () => {
  const session = new MediaWorkSession();
  let fetchCount = 0;
  const loadOriginal = async () => {
    fetchCount += 1;
    return new Blob(["selected"]);
  };

  const resultLoaders = Array.from({ length: 20 }, () => loadOriginal);
  assert.equal(fetchCount, 0, "rendering 20 metadata cards must not fetch media");

  await session.runOriginal(resultLoaders[13], async () => {});
  assert.equal(fetchCount, 1, "one explicit action fetches only its selected result");
});
