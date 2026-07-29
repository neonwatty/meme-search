import assert from "node:assert/strict";
import test from "node:test";

import { convertToPng } from "../lib/image-conversion.js";

test("converts an animated GIF preview to one still PNG frame", async () => {
  let bitmapClosed = false;
  let drawnBitmap;
  const png = new Blob(["still frame"], { type: "image/png" });
  const bitmap = {
    width: 320,
    height: 200,
    close() {
      bitmapClosed = true;
    }
  };
  const canvas = {
    getContext() {
      return {
        drawImage(value) {
          drawnBitmap = value;
        }
      };
    },
    toBlob(callback, type) {
      assert.equal(type, "image/png");
      callback(png);
    }
  };

  const result = await convertToPng(
    new Blob(["GIF89a"], { type: "image/gif" }),
    new AbortController().signal,
    {
      createImageBitmap: async () => bitmap,
      createCanvas: () => canvas
    }
  );

  assert.equal(result, png);
  assert.equal(drawnBitmap, bitmap);
  assert.equal(canvas.width, 320);
  assert.equal(canvas.height, 200);
  assert.equal(bitmapClosed, true);
});

test("closes decoded preview resources when cancellation wins", async () => {
  const controller = new AbortController();
  let bitmapClosed = false;
  const bitmap = {
    width: 1,
    height: 1,
    close() {
      bitmapClosed = true;
    }
  };

  const conversion = convertToPng(
    new Blob(["GIF89a"], { type: "image/gif" }),
    controller.signal,
    {
      createImageBitmap: async () => {
        controller.abort();
        return bitmap;
      },
      createCanvas: () => assert.fail("cancelled conversion must not allocate a canvas")
    }
  );

  await assert.rejects(conversion, { name: "AbortError" });
  assert.equal(bitmapClosed, true);
});
