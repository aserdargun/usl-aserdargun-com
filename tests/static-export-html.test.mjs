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
