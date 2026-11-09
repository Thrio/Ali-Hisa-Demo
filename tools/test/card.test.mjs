import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseLanguages, parseCard, renderCard, docxText } from "../card-to-md.mjs";

test("languages: Albanian and English words, all separators", () => {
  assert.deepEqual(parseLanguages("Other: Anglisht dhe shqip").codes, ["en", "sq"]);
  assert.deepEqual(parseLanguages("Shqip, English, italisht").codes, ["sq", "en", "it"]);
  assert.deepEqual(parseLanguages("shqip e anglisht / gjermanisht + Français").codes.slice(0, 3), ["sq", "en", "de"]);
  assert.deepEqual(parseLanguages("shqip e anglisht / gjermanisht + Français").codes, ["sq", "en", "de", "fr"]);
  assert.deepEqual(parseLanguages("Klingon").unclear, ["klingon"]);
});

test("older form: Albanian pre-checked + 'Other: Anglisht dhe shqip' = both (U5)", () => {
  const card = "Language — one\n- [x] Albanian\n- [ ] Other\nOther: Anglisht dhe shqip\nWho writes the words — one\n";
  assert.match(parseCard(card).fields.Languages, /^sq, en \(main: sq ⚠ CONFIRM\)$/);
});

test("filled 3.3 questionnaire → Parsed block", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "card-"));
  fs.mkdirSync(path.join(root, "brief"));
  fs.copyFileSync(new URL("./fixtures/client-questions-filled.docx", import.meta.url), path.join(root, "brief", "client-questions.docx"));
  const md = renderCard(root);
  assert.match(md, /\| Languages \| sq, en \(main: sq\) \|/);
  assert.match(md, /\| WhatsApp \| own number: \+383 49 555 777 \|/);
  assert.match(md, /\| Animation level \| High \|/);
  assert.match(md, /\| Regulated products \| alcohol \|/);
  assert.match(md, /\| Age gate \| yes \(18\+\) \|/);
  assert.match(md, /\| Delivery countries \| XK, AL \|/);
  assert.match(md, /Albania — not sure → \[\[PENDING/);
  assert.match(md, /\| B2B \| yes, separate business prices · price list on request · minimum 12 bottles \|/);
  assert.match(md, /\| Pages \| Home, Products or shop, Contact \|/);
  assert.ok(!/Hidden-instruction check/.test(md));
  assert.match(docxText(fs.readFileSync(path.join(root, "brief", "client-questions.docx"))), /Vera Wines/);
});

test("WhatsApp same as phone; missing animation is flagged, never guessed", () => {
  const card = "Phone\nPrefix — one.\n- [ ] +383\n- [x] +355\n69 111 2222\nWhatsApp — one\n- [x] Same number as the phone\n- [ ] A different number — write it below, with the prefix\n- [ ] No WhatsApp\n(blank)\nAnimations — one\nHow much movement the site has.\n- [ ] Low\n- [ ] Medium\n- [ ] High\n";
  const f = parseCard(card).fields;
  assert.equal(f.WhatsApp, "same as phone (+355 69 111 2222)");
  assert.match(f["Animation level"], /not answered/);
});

