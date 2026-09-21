import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

import { currentReview } from "./content-contract.mjs";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
if (!process.env.UNSLOTH_VAULT_PATH) throw new Error("Set UNSLOTH_VAULT_PATH to the canonical vault directory before running content:sync");
const vaultRoot = resolve(process.env.UNSLOTH_VAULT_PATH);
const outputRoot = join(projectRoot, "content");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (entry.name === ".obsidian" || entry.name === ".trash" || entry.name.startsWith(".")) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) paths.push(absolute);
  }
  return paths;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(value) {
  return value
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleFrom(markdown, path) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading ?? basename(path, ".md").replaceAll("-", " ");
}

function classify(path) {
  if (path.startsWith("01-Weeks/")) return { kind: "week", output: "roadmap" };
  if (path.startsWith("02-Experiments/")) return { kind: "experiment", output: "evidence" };
  if (path.startsWith("03-Datasets/") || path.startsWith("04-Evaluations/")) return { kind: "reference", output: "data-evaluation" };
  if (path.startsWith("Journal/")) return { kind: "journal", output: "journey" };
  if (path.startsWith("Templates/")) return { kind: "template", output: "labs" };
  if (path.startsWith("Concepts/") || path.startsWith("Summary/")) return { kind: "lesson", output: "learn" };
  if (path.startsWith("05-Reference/")) return { kind: "reference", output: path.includes("Data-Recipes") ? "data-evaluation" : "labs" };
  return { kind: "overview", output: "dashboard" };
}

function sanitize(markdown) {
  let text = markdown.replace(/\r\n/g, "\n");
  // Remove task/thread provenance while preserving the learning content.
  text = text.replace(/^source_task:\s*.*$/gim, "");
  text = text.replace(/^\s*(?:[-*]\s*)?(?:Kaynak görev|Source task|Task UUID|Görev UUID)\s*:\s*.*$/gim, "");
  text = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-id]");
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
  text = text.replace(/(?:\/Users|\/home)\/[^\s)`\]>]+/g, "[local-path-redacted]");
  text = text.replace(/\.obsidian\/plugins\/[^\s)`\]>]+/gi, "[plugin-path-redacted]");
  // Public-safe generalization of private operational names.
  text = text.replace(/\bSWAPP\s+(?:Atlas|Forge|Vitals)\b/gi, "industrial monitoring platform");
  text = text.replace(/\bSWAPP\b/g, "industrial monitoring platform");
  text = text.replace(/Serdar(?:'ın|’ın)?\s+kendi anlayışı(?:\s*\([^\n]*\))?/gi, "İlk düşünce");
  text = text.replace(/Serdar(?:'ın|’ın)?/gi, "Öğrencinin");
  text = text.replace(/Kendi cümlemle yazdığımda/gi, "İlk açıklamada");
  text = text.replace(/Kendimi test/gi, "Kavram kontrolü");
  // Two genuine split-note links are merged into the canonical combined concept.
  text = text.replace(/\[\[(?:\.\.\/Concepts\/)?CONCEPT-(?:Training-Validation-Loss|Overfitting-Catastrophic-Forgetting)(?:\|([^\]]+))?\]\]/g, (_, alias) => `[[CONCEPT-Loss-Overfitting-Catastrophic-Forgetting${alias ? `|${alias}` : ""}]]`);
  return text.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function journalCard(sourcePath) {
  if (sourcePath.endsWith("Week-01-Learning-Journal.md")) return `# Week 01 — Öğrenme kartları\n\n## İlk düşünce → düzeltme → karar kuralı\n\n- Model türü dataset satır sayısıyla seçilir → sabit satır eşiği yoktur → dar ve yapılandırılmış görevde önce Instruct checkpoint değerlendir.\n- QLoRA tüm modeli 4-bit eğitir → donmuş taban 4-bit saklanır, adaptörler eğitilir → kaliteyi bağımsız benchmark ile ölç.\n- Daha düşük loss daha iyi modeldir → loss yalnızca optimize edilen token hedefidir → domain, format, güvenlik ve retention metriklerini birlikte kullan.\n- Accumulation her micro-stepte ağırlığı günceller → gradientler birikir, optimizer bir kez ilerler → step kaydını optimizer step olarak tut.\n`;
  if (sourcePath.endsWith("Week-02-Learning-Journal.md")) return `# Week 02 — Öğrenme kartları\n\n## İlk düşünce → düzeltme → karar kuralı\n\n- Pipeline tamamlanınca model iyileşmiştir → çalışan eğitim hattı kalite kanıtı değildir → base ve adapted modeli aynı prompt, seed ve generation ayarlarıyla karşılaştır.\n- Anlık GPU kullanımı peak VRAM'dir → tek ekran görüntüsü peak ölçümü değildir → peak metriğini ayrı ölçüm aracıyla kaydet.\n- Train loss yeterli değerlendirmedir → bağımsız evaluation split gerekir → sabit test setini eğitimden önce dondur.\n- Token verimliliği tahmin edilebilir → parçalanma tokenizer'a özgüdür → aynı Türkçe corpus'u gerçek tokenizer'larla ölç.\n`;
  return `# Öğrenme günlüğü yöntemi\n\nHam günlük kayıtları yayımlamak yerine her gözlem şu yapıya dönüştürülür: **ilk düşünce → düzeltme → karar kuralı**. Kanıt seviyesi ayrıca verified, observed, planned, unknown veya simulation olarak işaretlenir.\n`;
}

function parseWikiTargets(markdown) {
  const targets = [];
  for (const match of markdown.matchAll(/\[\[([^\]]+)\]\]/g)) {
    // Obsidian tables escape the link alias separator as \|.
    const raw = match[1].replaceAll("\\|", "|");
    const target = raw.split("|")[0].split("#")[0].trim();
    if (target) targets.push(target);
  }
  return targets;
}

const files = (await walk(vaultRoot)).sort();
if (files.length !== 50) throw new Error(`Expected exactly 50 Markdown sources, found ${files.length}`);

const relativeFiles = files.map((path) => relative(vaultRoot, path).split(sep).join("/"));
const knownNotes = new Set(relativeFiles.flatMap((path) => [path.replace(/\.md$/, ""), basename(path, ".md")]));
const records = [];
const manifest = [];
const unresolved = [];

for (let index = 0; index < files.length; index += 1) {
  const absolute = files[index];
  const sourcePath = relativeFiles[index];
  const source = await readFile(absolute, "utf8");
  const { kind, output } = classify(sourcePath);
  const body = kind === "journal" ? journalCard(sourcePath) : sanitize(source);
  const title = titleFrom(body, sourcePath);
  const id = `source-${String(index + 1).padStart(2, "0")}-${slugify(basename(sourcePath, ".md"))}`;
  const sourceHash = sha256(source);
  const publicHash = sha256(body);
  const targets = parseWikiTargets(body);
  const brokenLinks = targets.filter((target) => !knownNotes.has(target.replace(/\.md$/, "")) && !knownNotes.has(basename(target.replace(/\.md$/, ""))));
  for (const target of brokenLinks) unresolved.push({ sourcePath, target });

  records.push({ id, locale: "tr", kind, slug: slugify(basename(sourcePath, ".md")), title, body, sourceHash, publicHash, output, links: targets });
  manifest.push({ sourcePath, sourceHash, publicHash, recordId: id, disposition: kind === "lesson" || kind === "journal" || sourcePath.endsWith("README.md") ? "merged" : "published", output: `/${output}`, brokenLinks });
}

if (unresolved.length) throw new Error(`Unresolved wiki links:\n${unresolved.map(({ sourcePath, target }) => `- ${sourcePath} -> ${target}`).join("\n")}`);

const sourceDigest = sha256(records.map(({ sourceHash }) => sourceHash).join(""));
const previousParity = JSON.parse(await readFile(join(outputRoot, "locale-parity.json"), "utf8"));
const stale = new Set(previousParity.stale ?? []);
if (previousParity.sourceDigest !== sourceDigest) stale.add("source-review-required");
for (const locale of ["tr", "en"]) {
  if (previousParity.reviewedContentDigests?.[locale] !== currentReview(locale).digest) stale.add(`${locale}-content-review-required`);
}
const generatedAt = new Date().toISOString();

await mkdir(outputRoot, { recursive: true });
await writeFile(join(outputRoot, "public-snapshot.json"), JSON.stringify({ schemaVersion: 1, generatedAt, sourceCount: records.length, records }, null, 2) + "\n");
await writeFile(join(outputRoot, "source-manifest.json"), JSON.stringify({ schemaVersion: 1, generatedAt, expected: 50, covered: manifest.length, unresolvedLinks: 0, entries: manifest }, null, 2) + "\n");
await writeFile(join(outputRoot, "locale-parity.json"), JSON.stringify({ ...previousParity, stale: [...stale] }, null, 2) + "\n");

console.log(`Synced ${manifest.length}/50 Markdown sources; unresolved wiki links: 0; pending translation reviews: ${stale.size}.`);
