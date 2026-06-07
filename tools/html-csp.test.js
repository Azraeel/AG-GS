const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

["site/index.html", "site/admin/index.html"].forEach((relativePath) => {
  test(`${relativePath} allows Cloudflare analytics under the CSP`, () => {
    const html = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

    assert.match(html, /script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);
    assert.match(html, /connect-src[^;]*https:\/\/cloudflareinsights\.com/);
  });

  test(`${relativePath} allows and loads the Avantpedia importer before the wiki view`, () => {
    const html = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

    assert.match(html, /connect-src[^;]*https:\/\/avantpedia\.miraheze\.org/);
    assert.match(html, /wikiImport\.js\?v=/);
    assert.ok(html.indexOf("wikiImport.js") < html.indexOf("wikiView.js"));
  });

  test(`${relativePath} exposes the wiki through the top call-to-action only`, () => {
    const html = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

    assert.match(html, /data-tab-jump="wiki"[^>]*>Avant Wiki<\/button>/);
    assert.doesNotMatch(html, /class="tab"[^>]*data-tab="wiki"/);
  });
});

test("wiki focus mode hides the ledger chrome and is toggled by app render", () => {
  const baseCss = fs.readFileSync(path.join(ROOT, "site/css/base.css"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT, "site/app.js"), "utf8");

  assert.match(baseCss, /body\.is-wiki-focus\s+\.topbar/);
  assert.match(baseCss, /body\.is-wiki-focus\s+\.tabs/);
  assert.match(baseCss, /body\.is-wiki-focus\s+\.footer/);
  assert.match(appJs, /classList\.toggle\("is-wiki-focus",\s*state\.tab === "wiki"\)/);
});

test("dedicated wiki articles use a wide text column and side rail", () => {
  const wikiCss = fs.readFileSync(path.join(ROOT, "site/css/wiki.css"), "utf8");

  assert.match(wikiCss, /\.wiki-article-layout\s*{/);
  assert.match(wikiCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(280px,\s*360px\)/);
  assert.match(wikiCss, /\.wiki-article-main\s+\.wiki-body p,\s*\.wiki-article-main\s+\.wiki-body ul\s*{[\s\S]*max-width:\s*112ch/);
  assert.match(wikiCss, /\.wiki-article-rail\s*{[\s\S]*position:\s*sticky/);
});

test("saved wiki page edits use a wide direct editor", () => {
  const wikiCss = fs.readFileSync(path.join(ROOT, "site/css/wiki.css"), "utf8");

  assert.match(wikiCss, /\.wiki-editor-shell\s*{[\s\S]*width:\s*min\(1680px,\s*calc\(100vw - 48px\)\)/);
  assert.match(wikiCss, /\.wiki-source-editor-direct\s*{/);
  assert.match(wikiCss, /\.wiki-source-editor-direct\s+\.wiki-editor-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(wikiCss, /\.wiki-source-editor-direct\s+textarea\[data-wiki-field="body"\]\s*{[\s\S]*min-height:\s*520px/);
});
