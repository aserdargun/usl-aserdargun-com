import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders bilingual dashboards with source and visitor progress separated", async () => {
  const [trResponse, enResponse] = await Promise.all([render("/tr"), render("/en")]);
  assert.equal(trResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [tr, en] = await Promise.all([trResponse.text(), enResponse.text()]);
  assert.match(tr, /<html lang="tr"/);
  assert.match(en, /<html lang="en"/);
  assert.match(tr, /<title>USL - [^<]+<\/title>/);
  assert.match(en, /<title>USL - [^<]+<\/title>/);
  assert.doesNotMatch(`${tr}\n${en}`, /<title>[^<]*Unsloth Studio Learning Atlas<\/title>/);
  assert.match(tr, /50\/50/);
  assert.match(tr, /Kaynak ilerlemesi/);
  assert.match(tr, /Benim ilerlemem/);
  assert.match(en, /Source progress/);
  assert.match(en, /My progress/);
  assert.match(tr, /href="\/en\/?"/);
  assert.match(en, /href="\/tr\/?"/);
});

test("renders labs, evidence, lessons, and localized metadata", async () => {
  const [labs, evidence, lesson] = await Promise.all([render("/tr/labs"), render("/tr/evidence"), render("/en/learn/models")]);
  const [labsHtml, evidenceHtml, lessonHtml] = await Promise.all([labs.text(), evidence.text(), lesson.text()]);
  assert.equal(labs.status, 200);
  assert.equal(evidence.status, 200);
  assert.equal(lesson.status, 200);
  assert.match(labsHtml, /<title>USL - [^<]+<\/title>/);
  assert.match(evidenceHtml, /<title>USL - [^<]+<\/title>/);
  assert.match(lessonHtml, /<title>USL - [^<]+<\/title>/);
  assert.doesNotMatch(`${labsHtml}\n${evidenceHtml}\n${lessonHtml}`, /<title>[^<]*Unsloth Studio Learning Atlas<\/title>/);
  assert.match(labsHtml, /Bağlam bütçesi/);
  assert.match(labsHtml, /Simülasyon/);
  assert.match(evidenceHtml, /İşlem hattı geçti\. Kalite kazanımı kanıtlanmadı\./);
  assert.match(evidenceHtml, /en iyi değer değil/);
  assert.doesNotMatch(`${labsHtml}\n${evidenceHtml}`, /Context bütçesi|Maximum|Pipeline geçti|peak değil/);
  assert.match(lessonHtml, /Base, Instruct, and Reasoning/);
  assert.match(lessonHtml, /First thought/);
  assert.match(lessonHtml, /raw pretrained/);
  assert.doesNotMatch(lessonHtml, /ham ön-eğitim|talimatlara hizalı|adım adım düşünür/);
  assert.match(lessonHtml, /hreflang="tr"/i);
  assert.match(lessonHtml, /hreflang="en"/i);
});

test("renders the new Turkish learning surfaces without stray English UI", async () => {
  const [visualizeResponse, flashcardsResponse] = await Promise.all([
    render("/tr/visualize"),
    render("/tr/flashcards"),
  ]);
  assert.equal(visualizeResponse.status, 200);
  assert.equal(flashcardsResponse.status, 200);
  const [visualize, flashcards] = await Promise.all([
    visualizeResponse.text(),
    flashcardsResponse.text(),
  ]);

  assert.match(visualize, /GÖRSEL VE ETKİLEŞİMLİ/);
  assert.match(visualize, /Tokenizer Deneme Alanı/);
  assert.match(visualize, /Eğitim Kaybı Simülatörü/);
  assert.match(visualize, /Dikkat Isı Haritası/);
  assert.match(visualize, /type="range" min="5" max="50" value="40"/);
  assert.doesNotMatch(visualize, /GÖRSEL &amp; İNTERAKTİF|Eğitim Loss|Attention Heatmap|Base quantization|Context length|Micro batch/);

  assert.match(flashcards, /Tekrar Kartları/);
  assert.match(flashcards, /öğretici bir programdır; kişisel etki kanıtı değildir/);
  assert.doesNotMatch(flashcards, /Kalıcı öğrenme için kanıtlanmış yöntemdir|😣|👍|✨|💡/u);
});

test("ships SEO and AI-discovery assets and removes starter surfaces", async () => {
  const [robots, llms, full, staticConfig] = await Promise.all([
    readFile(new URL("public/robots.txt", root), "utf8").catch(() => "generated-by-next"),
    readFile(new URL("public/llms.txt", root), "utf8"),
    readFile(new URL("public/llms-full.txt", root), "utf8"),
    readFile(new URL("public/staticwebapp.config.json", root), "utf8"),
  ]);
  assert.match(robots, /generated-by-next|sitemap/i);
  assert.match(llms, /Evidence policy/);
  assert.match(full, /30\/30 steps/);
  assert.match(staticConfig, /Content-Security-Policy/);
  await access(new URL("public/og.png", root));
  await access(new URL("public/icon.png", root));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
