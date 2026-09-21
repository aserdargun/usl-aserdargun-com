import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { lessons, weeks, quiz, ui, glossary, routeSurfaces } from "../app/atlas-data.ts";
import { flashcards, tokenizerSamples, paperReadings, citationKit, conceptDepth, attentionDemos } from "../app/atlas-extras.ts";

export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const labIds = ["context-budget", "effective-batch", "lora-scale", "tokenizer-measurement", "dataset-mix", "weighted-benchmark", "masking-checklist", "hardware-planning"].map((id) => `lab-${id}`);
export const visualIds = ["tokenizer", "vram", "loss", "attention"].map((id) => `viz-${id}`);
const pathways = JSON.parse(readFileSync(new URL("../content/learning-pathways.json", import.meta.url), "utf8"));

export function currentReview(locale) {
  const collections = [lessons, weeks, quiz, flashcards, tokenizerSamples, paperReadings, citationKit];
  const ids = [...collections.flatMap((collection) => collection[locale].map(({ id }) => id)), ...labIds, ...visualIds, "assessment-mixed", "portfolio-pathways", ...pathways.links.map(({ id }) => id), ...["dashboard", ...routeSurfaces].map((id) => `surface-${id}`)];
  const content = { collections: collections.map((collection) => collection[locale]), ui: ui[locale], glossary: glossary[locale], depth: Object.fromEntries(Object.entries(conceptDepth).map(([id, depth]) => [id, depth[locale]])), attention: attentionDemos[locale], pathways: pathways.links.map((link) => ({ id: link.id, url: link.url, ...link[locale] })) };
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate content IDs: ${locale}`);
  for (const link of pathways.links) {
    if (!link[locale]?.title?.trim() || !link[locale]?.description?.trim()) throw new Error(`Missing pathway translation: ${link.id}/${locale}`);
    if (!/^https:\/\/[a-z]{3}\.aserdargun\.com\/$/.test(link.url)) throw new Error(`Invalid pathway URL: ${link.id}`);
  }
  for (const collection of collections) {
    for (const record of collection[locale]) {
      const text = record[locale] ?? record;
      if (!Object.values(text).some((value) => typeof value === "string" && value.trim())) throw new Error(`Empty translation: ${record.id}/${locale}`);
    }
  }
  return { ids, digest: digest(JSON.stringify(content)) };
}

export function validateIntegrity(snapshot, manifest, parity) {
  if (parity.schemaVersion !== 2) throw new Error("Locale review schema must be v2");
  const sourceDigest = digest(snapshot.records.map(({ sourceHash }) => sourceHash).join(""));
  if (parity.sourceDigest !== sourceDigest) throw new Error("Source digest changed; translation review required");
  for (const record of snapshot.records) {
    const entry = manifest.entries.find(({ recordId }) => recordId === record.id);
    if (!entry || record.publicHash !== digest(record.body) || entry.publicHash !== record.publicHash || entry.sourceHash !== record.sourceHash) throw new Error(`Snapshot/manifest integrity failed: ${record.id}`);
  }
  for (const locale of ["tr", "en"]) {
    const review = currentReview(locale);
    if (JSON.stringify(parity.translations[locale]) !== JSON.stringify(review.ids)) throw new Error(`Stale ${locale} content IDs`);
    if (parity.reviewedContentDigests?.[locale] !== review.digest) throw new Error(`Unreviewed ${locale} content changes`);
  }
}
