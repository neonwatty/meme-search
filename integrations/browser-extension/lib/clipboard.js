import { convertToPng } from "./image-conversion.js";

export function writePngToClipboard(pngPromise, dependencies = {}) {
  const clipboard = dependencies.clipboard ?? globalThis.navigator?.clipboard;
  const ClipboardItemConstructor =
    dependencies.ClipboardItemConstructor ?? globalThis.ClipboardItem;

  if (!clipboard?.write || typeof ClipboardItemConstructor !== "function") {
    throw new Error("Image copying is not available in this browser.");
  }

  const item = new ClipboardItemConstructor({ "image/png": pngPromise });
  return clipboard.write([item]);
}

export function copyOriginalToClipboard(
  session,
  loadBlob,
  dependencies = {}
) {
  const convert = dependencies.convertToPng ?? convertToPng;
  const pngPromise = session.runOriginal(
    loadBlob,
    (blob, signal) => convert(blob, signal)
  );
  return writePngToClipboard(pngPromise, dependencies);
}
