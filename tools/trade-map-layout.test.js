const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("trade map inspector sits outside the clickable map stage", () => {
  const source = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const layoutIndex = source.indexOf('<div class="trade-map-layout">');
  const stageIndex = source.indexOf('<div class="trade-map-stage">', layoutIndex);
  const svgCloseIndex = source.indexOf("</svg>", stageIndex);
  const stageCloseIndex = source.indexOf("</div>", svgCloseIndex);
  const inspectorIndex = source.indexOf('<div class="trade-map-inspector">', stageCloseIndex);
  const selectedIndex = source.indexOf('<div class="trade-map-selected"', inspectorIndex);
  const partnersIndex = source.indexOf('<div class="trade-map-route-list"', inspectorIndex);
  const detailIndex = source.indexOf('tradeMapRouteDetailsHtml(rows)', partnersIndex);

  assert.notEqual(layoutIndex, -1);
  assert.notEqual(stageIndex, -1);
  assert.notEqual(svgCloseIndex, -1);
  assert.notEqual(stageCloseIndex, -1);
  assert.notEqual(inspectorIndex, -1);
  assert.ok(stageIndex < svgCloseIndex, "the SVG should render inside the stage");
  assert.ok(stageCloseIndex < inspectorIndex, "the inspector should start after the stage closes");
  assert.ok(inspectorIndex < selectedIndex, "selected territory details should render inside the inspector");
  assert.ok(inspectorIndex < partnersIndex, "partner controls should render inside the inspector");
  assert.ok(partnersIndex < detailIndex, "route detail should continue the inspector after major partners");
});

test("trade map inspector panels are not overlay-positioned", () => {
  const source = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");
  const panelRule = source.match(/\.trade-map-selected,\s*\.trade-map-route-list,\s*\.trade-map-route-detail,\s*\.trade-map-asset-note\s*\{[^}]+\}/);
  assert.ok(panelRule, "shared trade map panel rule should exist");
  assert.match(panelRule[0], /position:\s*relative/);
  assert.doesNotMatch(panelRule[0], /position:\s*absolute/);
  assert.match(source, /\.trade-map-inspector\s*\{/);
});

test("trade map nation clicks preserve page scroll", () => {
  const source = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const clickStart = source.indexOf('const mapNation = event.target.closest("[data-trade-map-nation]");');
  const clickEnd = source.indexOf('const nationButton = event.target.closest("[data-nation]");', clickStart);
  const clickBlock = source.slice(clickStart, clickEnd);
  const keyStart = source.indexOf('app.addEventListener("keydown"', clickEnd);
  const keyEnd = source.indexOf('app.addEventListener("change"', keyStart);
  const keyBlock = source.slice(keyStart, keyEnd);

  assert.match(source, /function renderPreservingPageScroll\(\)/);
  assert.match(clickBlock, /renderPreservingPageScroll\(\)/);
  assert.doesNotMatch(clickBlock, /scrollToPageTop\(\)/);
  assert.match(keyBlock, /renderPreservingPageScroll\(\)/);
  assert.doesNotMatch(keyBlock, /scrollToPageTop\(\)/);
});

test("trade map chrome stays compact instead of rendering filled dead space", () => {
  const source = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");
  const commandRule = source.match(/\.trade-map-command\s*\{[^}]+\}/);
  const modebarRule = source.match(/\.trade-map-modebar\s*\{[^}]+\}/);
  const inspectorRule = source.match(/\.trade-map-inspector\s*\{[^}]+\}/);

  assert.ok(commandRule, "trade map command rule should exist");
  assert.ok(modebarRule, "trade map modebar rule should exist");
  assert.ok(inspectorRule, "trade map inspector rule should exist");
  assert.match(commandRule[0], /display:\s*flex/);
  assert.match(modebarRule[0], /flex-wrap:\s*nowrap/);
  assert.match(inspectorRule[0], /background:\s*transparent/);
  assert.match(source, /:root\[data-theme="light"\]\s+\.trade-map-selected h2/);
  assert.match(source, /:root\[data-theme="light"\]\s+\.trade-map-route-list button/);
  assert.match(source, /:root\[data-theme="light"\]\s+\.trade-map-route-focus strong/);
  assert.match(source, /\.trade-map-route-split-track \.import/);
});
