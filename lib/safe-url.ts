/**
 * Returns the input if it's an http(s) URL we'd be willing to render as a
 * link target, otherwise an empty string. Use both when ingesting URLs
 * from third-party feeds and just before binding to `<a href>` (defense
 * in depth).
 *
 * Rejects javascript:, data:, vbscript:, blob:, file:, mailto:, tel:,
 * relative paths, and malformed input.
 */
export function safeHref(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}
