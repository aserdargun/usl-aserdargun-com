import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (name) => JSON.parse(await readFile(new URL(`../content/${name}`, import.meta.url), "utf8"));

test("every canonical source maps to a public record", async () => {
  const manifest = await read("source-manifest.json");
  assert.equal(manifest.covered, 50);
  assert.equal(manifest.entries.length, 50);
  assert.equal(manifest.unresolvedLinks, 0);
  assert.ok(manifest.entries.every((entry) => entry.output.startsWith("/") && entry.recordId));
});

test("public snapshot excludes private provenance", async () => {
  const snapshot = JSON.stringify(await read("public-snapshot.json"));
  assert.doesNotMatch(snapshot, /\/(?:Users|home)\//i);
  assert.doesNotMatch(snapshot, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(snapshot, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
  assert.doesNotMatch(snapshot, /\.obsidian[\\/]plugins/i);
});

test("stable TR and EN content IDs remain identical", async () => {
  const parity = await read("locale-parity.json");
  assert.deepEqual(parity.translations.tr, parity.translations.en);
  assert.deepEqual(parity.stale, []);
});

test("content validation rejects edited snapshots, stale digests and missing surface IDs", async () => {
  const { validateIntegrity } = await import("../scripts/content-contract.mjs");
  const snapshot = await read("public-snapshot.json");
  const manifest = await read("source-manifest.json");
  const parity = await read("locale-parity.json");
  assert.doesNotThrow(() => validateIntegrity(snapshot, manifest, parity));
  const edited = structuredClone(snapshot);
  edited.records[0].body += "unreviewed edit";
  assert.throws(() => validateIntegrity(edited, manifest, parity), /integrity failed/);
  assert.throws(() => validateIntegrity(snapshot, manifest, { ...parity, sourceDigest: "stale" }), /Source digest/);
  assert.throws(() => validateIntegrity(snapshot, manifest, { ...parity, reviewedContentDigests: { tr: "stale", en: "stale" } }), /Unreviewed/);
  const missing = structuredClone(parity);
  missing.translations.en = missing.translations.en.filter((id) => id !== "viz-vram");
  assert.throws(() => validateIntegrity(snapshot, manifest, missing), /Stale en content IDs/);
});
