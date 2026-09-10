import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readExportedPage(path) {
  return readFile(new URL(`out/${path}/index.html`, root), "utf8");
}

test("uses the site name as the browser title on every exported page type", async () => {
  const pages = await Promise.all([
    readExportedPage("en"),
    readExportedPage("tr"),
    readExportedPage("en/labs"),
    readExportedPage("tr/learn/models"),
  ]);

  for (const html of pages) {
    assert.match(html, /<title>USL - [^<]+<\/title>/);
  }
});

test("publishes canonical and source links for the usl deployment contract", async () => {
  const pages = await Promise.all([
    readExportedPage("en"),
    readExportedPage("tr"),
  ]);

  for (const html of pages) {
    assert.match(html, /https:\/\/usl\.aserdargun\.com/);
    assert.doesNotMatch(html, /https:\/\/unsloth\.aserdargun\.com/);
    assert.match(html, /https:\/\/github\.com\/aserdargun\/usl-aserdargun-com/);
  }
});

test("publishes the current sitemap verification date", async () => {
  const sitemap = await readFile(new URL("out/sitemap.xml", root), "utf8");
  assert.match(sitemap, /2026-09-04/);
  assert.doesNotMatch(sitemap, /2026-08-10/);
});

test("every exported internal link resolves to an artifact", async () => {
  const { readdir, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const exportRoot = fileURLToPath(new URL("out/", root));
  const files = await readdir(exportRoot, { recursive: true });
  const targets = new Set();
  for (const file of files.filter((name) => name.endsWith(".html"))) {
    const html = await readFile(join(exportRoot, file), "utf8");
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)[^"]*"/g)) {
      if (!href.startsWith("//")) targets.add(href);
    }
  }
  assert.ok(targets.size > 30);
  for (const target of targets) {
    const path = join(exportRoot, decodeURIComponent(target));
    const item = await stat(path).catch(() => null);
    assert.ok(item, `Missing internal link target: ${target}`);
    if (item.isDirectory()) await readFile(join(path, "index.html"));
  }
});
