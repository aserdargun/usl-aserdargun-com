import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateIntegrity } from "./content-contract.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const snapshot = JSON.parse(await readFile(resolve(root, "content/public-snapshot.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(root, "content/source-manifest.json"), "utf8"));
const parity = JSON.parse(await readFile(resolve(root, "content/locale-parity.json"), "utf8"));

const fail = (message) => { throw new Error(message); };
if (snapshot.sourceCount !== 50 || snapshot.records.length !== 50) fail("Public snapshot must contain 50 source records");
if (manifest.expected !== 50 || manifest.covered !== 50 || manifest.entries.length !== 50) fail("Source manifest coverage must be 50/50");
if (manifest.unresolvedLinks !== 0 || manifest.entries.some((entry) => entry.brokenLinks.length)) fail("Unresolved public wiki links must be zero");
if (new Set(manifest.entries.map((entry) => entry.sourcePath)).size !== 50) fail("Source paths are not unique");
if (new Set(manifest.entries.map((entry) => entry.recordId)).size !== 50) fail("Record IDs are not unique");

const serialized = JSON.stringify({ snapshot, manifest, parity });
const banned = [
  [/\/(?:Users|home)\//i, "absolute local path"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "email address"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, "UUID"],
  [/\.obsidian[\\/]plugins/i, "Obsidian plugin path"],
  [/source_task\s*:/i, "source task metadata"],
];
for (const [pattern, label] of banned) if (pattern.test(serialized)) fail(`Sanitization failed: ${label}`);

if (parity.stale.length) fail(`Stale translations: ${parity.stale.join(", ")}`);
if (JSON.stringify(parity.translations.tr) !== JSON.stringify(parity.translations.en)) fail("TR/EN stable content IDs are not identical");
validateIntegrity(snapshot, manifest, parity);

console.log("Content validation passed: 50/50 sources, 0 unresolved links, sanitization clean, TR/EN parity complete.");
