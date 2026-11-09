// Minimal PNG codec on node:zlib. Replaces ImageMagick for overlays, so no
// native image library parses files that came from the internet.
// Decodes 8-bit gray/RGB/RGBA/gray+alpha/palette and 16-bit gray/RGB/RGBA, non-interlaced.
import zlib from "node:zlib";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function decodePng(buf, { maxPixels = 60_000_000 } = {}) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) throw new Error("PNG: bad signature");
  let off = 8;
  let ihdr = null;
  let palette = null;
  let trns = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    const start = off + 8;
    const end = start + len;
    if (end + 4 > buf.length) throw new Error(`PNG: truncated ${type} chunk`);
    const data = buf.subarray(start, end);
    if (type === "IHDR") {
      ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] };
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off = end + 4;
  }
  if (!ihdr) throw new Error("PNG: missing IHDR");
  const { width, height, bitDepth, colorType, interlace } = ihdr;
  if (!width || !height || width * height > maxPixels) throw new Error(`PNG: ${width}x${height} is outside the allowed size`);
  if (interlace) throw new Error("PNG: interlaced images are not supported");
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`PNG: color type ${colorType} not supported`);
  const okDepth = bitDepth === 8 || (bitDepth === 16 && colorType !== 3);
  if (!okDepth) throw new Error(`PNG: bit depth ${bitDepth} not supported for color type ${colorType}`);
  if (colorType === 3 && !palette) throw new Error("PNG: palette image without PLTE");

  const bps = bitDepth / 8;
  const bpp = channels * bps;
  const stride = width * bpp;
  const expected = (stride + 1) * height;
  const raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: expected + 1024 });
  if (raw.length < expected) throw new Error("PNG: image data is truncated");

  const px = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = px.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`PNG: bad filter ${filter} on row ${y}`);
      cur[x] = v & 0xff;
    }
    prev = cur;
  }

  const rgba = Buffer.alloc(width * height * 4);
  const s = (o, k) => px[o + k * bps]; // high byte for 16-bit
  for (let i = 0, p = 0; i < width * height; i++) {
    const o = i * bpp;
    let r; let g; let b; let a = 255;
    if (colorType === 0) {
      r = g = b = s(o, 0);
      if (trns && trns.length >= 2 && bitDepth === 8 && px[o] === trns[1]) a = 0;
    } else if (colorType === 2) { r = s(o, 0); g = s(o, 1); b = s(o, 2); }
    else if (colorType === 3) {
      const idx = px[o];
      if (idx * 3 + 2 >= palette.length) throw new Error("PNG: palette index out of range");
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
      a = trns && idx < trns.length ? trns[idx] : 255;
    } else if (colorType === 4) { r = g = b = s(o, 0); a = s(o, 1); }
    else { r = s(o, 0); g = s(o, 1); b = s(o, 2); a = s(o, 3); }
    rgba[p++] = r; rgba[p++] = g; rgba[p++] = b; rgba[p++] = a;
  }
  return { width, height, data: rgba };
}

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

export function encodePng({ width, height, data }) {
  const pixels = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (pixels.length !== width * height * 4) throw new Error("encodePng: data must be RGBA, width*height*4 bytes");
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([PNG_SIG, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

export function blank(width, height, [r, g, b, a] = [0, 0, 0, 255]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; }
  return { width, height, data };
}

/** Copy a rectangle out of an image (clamped). */
export function crop(img, x, y, w, h) {
  const x0 = Math.max(0, Math.min(img.width, Math.round(x)));
  const y0 = Math.max(0, Math.min(img.height, Math.round(y)));
  const cw = Math.max(1, Math.min(img.width - x0, Math.round(w)));
  const ch = Math.max(1, Math.min(img.height - y0, Math.round(h)));
  const out = Buffer.alloc(cw * ch * 4);
  for (let row = 0; row < ch; row++) img.data.copy(out, row * cw * 4, ((y0 + row) * img.width + x0) * 4, ((y0 + row) * img.width + x0 + cw) * 4);
  return { width: cw, height: ch, data: out };
}

/** Stack images vertically (used to stitch tall band shots). */
export function stackVertical(images) {
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((sum, i) => sum + i.height, 0);
  const out = blank(width, height, [255, 255, 255, 255]);
  let y = 0;
  for (const img of images) {
    for (let row = 0; row < img.height; row++) img.data.copy(out.data, ((y + row) * width) * 4, row * img.width * 4, (row + 1) * img.width * 4);
    y += img.height;
  }
  return out;
}

/** Fraction of pixels equal to the most common colour (blank-shot detector). */
export function dominantShare(img, step = 4) {
  const counts = new Map();
  let total = 0;
  for (let i = 0; i < img.data.length; i += 4 * step) {
    const key = (img.data[i] >> 3) << 10 | (img.data[i + 1] >> 3) << 5 | (img.data[i + 2] >> 3);
    counts.set(key, (counts.get(key) || 0) + 1);
    total++;
  }
  return total ? Math.max(...counts.values()) / total : 1;
}
