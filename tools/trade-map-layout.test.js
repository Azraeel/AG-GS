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

  assert.notEqual(layoutIndex, -1);
  assert.notEqual(stageIndex, -1);
  assert.notEqual(svgCloseIndex, -1);
  assert.notEqual(stageCloseIndex, -1);
  assert.notEqual(inspectorIndex, -1);
  assert.ok(stageIndex < svgCloseIndex, "the SVG should render inside the stage");
  assert.ok(stageCloseIndex < inspectorIndex, "the inspector should start after the stage closes");
  assert.ok(inspectorIndex < selectedIndex, "selected territory details should render inside the inspector");
  assert.ok(inspectorIndex < partnersIndex, "partner controls should render inside the inspector");
});

test("trade map inspector panels are not overlay-positioned", () => {
  const source = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");
  const panelRule = source.match(/\.trade-map-selected,\s*\.trade-map-route-list,\s*\.trade-map-asset-note\s*\{[^}]+\}/);
  assert.ok(panelRule, "shared trade map panel rule should exist");
  assert.match(panelRule[0], /position:\s*relative/);
  assert.doesNotMatch(panelRule[0], /position:\s*absolute/);
  assert.match(source, /\.trade-map-inspector\s*\{/);
});
