// File type by content, not by extension or Content-Type header.
// Only plain images and video are allowed as comps. Executables, archives,
// documents, HTML and unknown types are refused.

const sig = (buf, bytes, offset = 0) => buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf, start, end) => (buf.length >= end ? buf.toString("latin1", start, end) : "");

export const ALLOWED_TYPES = new Set(["png", "jpeg", "gif", "webp", "avif", "mp4", "webm", "svg"]);

export function sniff(buf) {
  if (!buf || !buf.length) return { type: "empty", danger: false };
  // Dangerous first: these are refused even when the header says image/*.
  if (sig(buf, [0x4d, 0x5a])) return { type: "windows-executable", danger: true };
  if (sig(buf, [0x7f, 0x45, 0x4c, 0x46])) return { type: "elf-executable", danger: true };
  for (const m of [[0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf], [0xce, 0xfa, 0xed, 0xfe], [0xcf, 0xfa, 0xed, 0xfe], [0xca, 0xfe, 0xba, 0xbe]]) {
    if (sig(buf, m)) return { type: "macho-or-java-binary", danger: true };
  }
  if (sig(buf, [0x23, 0x21])) return { type: "script-with-shebang", danger: true };
  if (sig(buf, [0x50, 0x4b, 0x03, 0x04]) || sig(buf, [0x50, 0x4b, 0x05, 0x06])) return { type: "zip-archive", danger: true };
  if (sig(buf, [0x1f, 0x8b])) return { type: "gzip-archive", danger: true };
  if (ascii(buf, 0, 4) === "Rar!" || sig(buf, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return { type: "archive", danger: true };
  if (sig(buf, [0x25, 0x50, 0x44, 0x46])) return { type: "pdf", danger: true };
  if (sig(buf, [0xd0, 0xcf, 0x11, 0xe0])) return { type: "office-document", danger: true };
  if (ascii(buf, 0, 5) === "koly" || ascii(buf, 0, 4) === "xar!") return { type: "installer-image", danger: true };

  if (sig(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { type: "png", mime: "image/png", ext: "png" };
  if (sig(buf, [0xff, 0xd8, 0xff])) return { type: "jpeg", mime: "image/jpeg", ext: "jpg" };
  if (ascii(buf, 0, 6) === "GIF87a" || ascii(buf, 0, 6) === "GIF89a") return { type: "gif", mime: "image/gif", ext: "gif" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return { type: "webp", mime: "image/webp", ext: "webp" };
  if (sig(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { type: "webm", mime: "video/webm", ext: "webm" };
  if (ascii(buf, 4, 8) === "ftyp") {
    const size = Math.min(buf.readUInt32BE(0) || 0, 256, buf.length);
    const brands = [];
    for (let o = 8; o + 4 <= size; o += 4) brands.push(ascii(buf, o, o + 4));
    if (brands.some((b) => b === "avif" || b === "avis")) return { type: "avif", mime: "image/avif", ext: "avif" };
    if (brands.some((b) => ["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash"].includes(b))) {
      return { type: "mp4", mime: "video/mp4", ext: "mp4" };
    }
    return { type: "unknown-iso-media", danger: false };
  }
  const head = buf.subarray(0, 4096).toString("utf8").replace(/^\uFEFF/, "").trimStart().toLowerCase();
  if (head.startsWith("<svg") || ((head.startsWith("<?xml") || head.startsWith("<!--")) && head.includes("<svg"))) {
    return { type: "svg", mime: "image/svg+xml", ext: "svg" };
  }
  if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.includes("<script")) return { type: "html", danger: true };
  return { type: "unknown", danger: false };
}

const SVG_CHECKS = [
  [/<script\b/i, "script element"],
  [/<foreignObject\b/i, "foreignObject (can embed HTML)"],
  [/\son[a-z]+\s*=/i, "event-handler attribute"],
  [/javascript\s*:/i, "javascript: URL"],
  [/data\s*:\s*text\/html/i, "data:text/html URL"],
  [/<(iframe|embed|object)\b/i, "embedded document"],
  [/\b(xlink:)?href\s*=\s*["']?\s*(https?:|\/\/|file:)/i, "external reference"],
  [/<!ENTITY/i, "XML entity (XXE)"],
  [/<!DOCTYPE[^>]*\[/i, "internal DTD"],
  [/@import\b/i, "CSS @import"],
  [/url\(\s*["']?\s*(https?:|\/\/|file:)/i, "external CSS url()"],
  [/<\?xml-stylesheet/i, "xml-stylesheet instruction"],
  [/<(set|animate)\b[^>]*attributeName\s*=\s*["']?(xlink:)?href/i, "animated href"],
];

/** Refuse, never "clean": a rejected SVG is screenshotted as PNG instead. */
export function svgSafety(buf) {
  const s = Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
  const problems = SVG_CHECKS.filter(([re]) => re.test(s)).map(([, label]) => label);
  return { safe: problems.length === 0, problems };
}
