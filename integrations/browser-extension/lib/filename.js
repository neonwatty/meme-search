export function safeFilename(value) {
  const basename = String(value || "meme")
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/^\.+/, "")
    .trim();

  return basename || "meme";
}
