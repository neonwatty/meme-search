function throwIfAborted(signal) {
  if (signal.aborted) throw new DOMException("Media work was cancelled.", "AbortError");
}

export async function convertToPng(blob, signal, dependencies = {}) {
  throwIfAborted(signal);
  if (blob.type === "image/png") return blob;

  const createBitmap = dependencies.createImageBitmap ?? globalThis.createImageBitmap;
  const createCanvas = dependencies.createCanvas ??
    (() => globalThis.document.createElement("canvas"));
  const bitmap = await createBitmap(blob);
  let canvas;
  try {
    throwIfAborted(signal);
    canvas = createCanvas();
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (pngBlob) => {
        try {
          throwIfAborted(signal);
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error("Could not prepare this image for copying."));
          }
        } catch (error) {
          reject(error);
        }
      },
      "image/png"
    );
  });
}
