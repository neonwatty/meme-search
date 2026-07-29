function abortError() {
  return new DOMException("Media work was cancelled.", "AbortError");
}

export class MediaWorkSession {
  constructor({
    createObjectURL = (blob) => URL.createObjectURL(blob),
    revokeObjectURL = (url) => URL.revokeObjectURL(url)
  } = {}) {
    this.createObjectURL = createObjectURL;
    this.revokeObjectURL = revokeObjectURL;
    this.controller = new AbortController();
    this.objectUrls = new Set();
    this.closed = false;
  }

  get signal() {
    return this.controller.signal;
  }

  async runOriginal(loadBlob, useBlob) {
    if (this.closed) throw abortError();

    const blob = await loadBlob(this.signal);
    if (this.closed || this.signal.aborted) throw abortError();
    const result = await useBlob(blob, this.signal);
    if (this.closed || this.signal.aborted) throw abortError();
    return result;
  }

  retainObjectUrl(blob) {
    if (this.closed) throw abortError();
    const objectUrl = this.createObjectURL(blob);
    this.objectUrls.add(objectUrl);
    return objectUrl;
  }

  releaseObjectUrl(objectUrl) {
    if (!this.objectUrls.delete(objectUrl)) return;
    this.revokeObjectURL(objectUrl);
  }

  cancel() {
    if (this.closed) return;

    this.closed = true;
    this.controller.abort();
    for (const objectUrl of this.objectUrls) this.revokeObjectURL(objectUrl);
    this.objectUrls.clear();
  }
}
