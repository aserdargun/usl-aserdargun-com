import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { lessons } from "../app/atlas-data.ts";
import { citationKit, paperReadings, vramEstimate } from "../app/atlas-extras.ts";

const root = new URL("../", import.meta.url);

test("all lesson records carry the current verification date", () => {
  for (const lesson of [...lessons.tr, ...lessons.en]) {
    assert.equal(lesson.verifiedAt, "2026-09-04", `${lesson.locale}/${lesson.slug}`);
  }
});

test("gradient checkpointing lowers the activation-memory estimate", () => {
  const input = {
    paramsB: 4,
    quantizationBits: 4,
    adapterRank: 8,
    adapterMatrices: 7,
    hiddenDim: 2560,
    contextLength: 2048,
    microBatch: 1,
    budget: 16,
  };
  const enabled = vramEstimate({ ...input, gradientCheckpointing: true });
  const disabled = vramEstimate({ ...input, gradientCheckpointing: false });
  assert.ok(enabled.activations < disabled.activations);
  assert.ok(enabled.total < disabled.total);
});

test("research summaries and citation snippets keep their evidence boundaries", () => {
  const trQalora = paperReadings.tr.find((paper) => paper.id === "qlora-paper");
  assert.ok(trQalora);
  assert.match(trQalora.tr.takeaway, /garanti etmez/);
  assert.doesNotMatch(trQalora.tr.takeaway, /16 GB sınıfında çalışmasının nedeni budur/);

  const trTokens = citationKit.tr.find((citation) => citation.id === "cit-3");
  assert.ok(trTokens);
  assert.match(trTokens.tr.text, /gerçek tokenizer/);
  assert.doesNotMatch(trTokens.tr.text, /1\.5-2×/);
});

test("responsive rules prevent page-level overflow and preserve touch targets", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(css, /\.brand\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.site-header nav a\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(css, /footer a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.site-header nav::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.lesson-page[^}]*min-width:\s*0/s);
  assert.match(css, /\.viz-card[^}]*min-width:\s*0/s);
});

test("new learning controls do not use emoji as interface assets", async () => {
  const sources = await Promise.all([
    readFile(new URL("app/components/flashcards-page.tsx", root), "utf8"),
    readFile(new URL("app/components/learning-extras.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /[🌱🎓🔬💡😣👍✨]/u);
});
