import { test } from "node:test";
import assert from "node:assert/strict";
import { cutout, borderStats, trimBox, parseHex, composite } from "../lib/cutout.mjs";
import { checkSource } from "../cutout.mjs";

function photo(w, h, bg, box, fg = [40, 30, 20], noise = 0) {
  const d = Buffer.alloc(w * h * 4);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; const inBox = x >= box[0] && y >= box[1] && x < box[0] + box[2] && y < box[1] + box[3];
    const c = inBox ? fg : bg.map((v) => Math.max(0, Math.min(255, v + rnd() * noise)));
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return d;
}

test("cream background around a dark product is removed and trimmed", () => {
  const img = photo(40, 40, [240, 230, 210], [10, 8, 20, 24], [40, 30, 20], 3);
  const r = cutout(img, 40, 40);
  assert.equal(r.ok, true, r.reason);
  assert.ok(r.removed > 0.6 && r.removed < 0.75, String(r.removed));
  assert.deepEqual(trimBox(r.rgba, 40, 40), { x: 10, y: 8, w: 20, h: 24 });
  assert.equal(r.rgba[3], 0, "corner is transparent");
  const prev = composite(r.rgba, 40, 40, parseHex("#1b1b1b"));
  assert.deepEqual([...prev.subarray(0, 3)], [27, 27, 27]);
});

test("refuses busy backgrounds, tiny removals and products that blend in", () => {
  assert.match(cutout(photo(40, 40, [128, 128, 128], [10, 10, 20, 20], [40, 30, 20], 120), 40, 40).reason, /not uniform/);
  assert.match(cutout(photo(400, 400, [240, 230, 210], [6, 6, 388, 388]), 400, 400).reason, /only \d+%/);
  assert.match(cutout(photo(40, 40, [240, 230, 210], [1, 1, 38, 38]), 40, 40).reason, /not uniform/, "product touching the edge");
  assert.match(cutout(photo(40, 40, [240, 230, 210], [18, 18, 2, 2]), 40, 40).reason, /would be removed/);
  assert.ok(borderStats(photo(20, 20, [240, 230, 210], [7, 7, 6, 6]), 20, 20).spread < 1);
});

test("never reference media; only brief/ or public/images/", () => {
  assert.throws(() => checkSource("research/peers/ref/assets/hero.jpg"), /never cut out/);
  assert.throws(() => checkSource("public/_peer/hero.jpg"), /never cut out/);
  assert.throws(() => checkSource("src/hero.jpg"), /under brief/);
  assert.equal(checkSource("brief/photos/honey.jpg"), "brief/photos/honey.jpg");
  assert.throws(() => parseHex("red"), /hex/);
});
