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
