import assert from "node:assert/strict";
import test from "node:test";

import {
  copyOriginalToClipboard,
  writePngToClipboard
} from "../lib/clipboard.js";

test("starts the clipboard write before asynchronous PNG conversion resolves", async () => {
  const events = [];
  let resolvePng;
  const pngPromise = new Promise((resolve) => {
    resolvePng = resolve;
  });

  class FakeClipboardItem {
    constructor(data) {
      events.push("construct");
      this.data = data;
    }
  }

  const clipboard = {
    write(items) {
      events.push("write");
      assert.equal(items.length, 1);
      assert.equal(items[0].data["image/png"], pngPromise);
      return items[0].data["image/png"].then(() => {
        events.push("resolved");
      });
    }
  };

  const writePromise = writePngToClipboard(pngPromise, {
    clipboard,
    ClipboardItemConstructor: FakeClipboardItem
  });

  assert.deepEqual(events, ["construct", "write"]);

  resolvePng(new Blob(["png"], { type: "image/png" }));
  await writePromise;

  assert.deepEqual(events, ["construct", "write", "resolved"]);
});

test("fails clearly when image clipboard support is unavailable", () => {
  assert.throws(
    () => writePngToClipboard(Promise.resolve(new Blob()), {
      clipboard: {},
      ClipboardItemConstructor: undefined
    }),
    /Image copying is not available/
  );
});

test("starts clipboard permission work before explicit-action media fetch resolves", async () => {
  const events = [];
  let resolveOriginal;
  const originalPromise = new Promise((resolve) => {
    resolveOriginal = resolve;
  });
  const session = {
    signal: new AbortController().signal,
    async runOriginal(loadBlob, useBlob) {
      const blob = await loadBlob(this.signal);
      return useBlob(blob, this.signal);
    }
  };
  class FakeClipboardItem {
    constructor(data) {
      events.push("construct");
      this.data = data;
    }
  }
  const clipboard = {
    write(items) {
      events.push("write");
      return items[0].data["image/png"];
    }
  };

  const copy = copyOriginalToClipboard(
    session,
    async () => {
      events.push("fetch");
      return originalPromise;
    },
    {
      clipboard,
      ClipboardItemConstructor: FakeClipboardItem,
      convertToPng: async (blob) => {
        events.push("convert");
        return blob;
      }
    }
  );

  assert.deepEqual(events, ["fetch", "construct", "write"]);
  resolveOriginal(new Blob(["png"], { type: "image/png" }));
  await copy;
  assert.deepEqual(events, ["fetch", "construct", "write", "convert"]);
});
