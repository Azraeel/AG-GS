const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  SOURCE_WIDTH,
  SOURCE_HEIGHT,
  MAP_WIDTH,
  MAP_HEIGHT,
  extractTerritoryCandidates,
  renderShapeManifestScript,
  readSvgMap
} = require("./trade-map-svg-extract.js");

const svgPath = path.join(__dirname, "..", "site", "assets", "ag-political-map.svg");

test("trade map SVG asset is available as vector geometry", () => {
  const svg = readSvgMap(svgPath);

  assert.equal(svg.width, SOURCE_WIDTH);
  assert.equal(svg.height, SOURCE_HEIGHT);
  assert.ok(svg.paths.length > 8000);
  assert.equal(svg.paths.some((entry) => entry.tag.includes("<image")), false);
});

test("extractor finds large colored territory candidates and normalizes them", () => {
  const svg = readSvgMap(svgPath);
  const candidates = extractTerritoryCandidates(svg);

  assert.ok(candidates.length >= 45, `expected many country-sized candidates, got ${candidates.length}`);
  assert.ok(candidates.length < 140, `expected labels/noise to be filtered, got ${candidates.length}`);
  assert.ok(candidates.every((candidate) => candidate.path.startsWith("M") || candidate.path.startsWith("m")));
  assert.ok(candidates.every((candidate) => candidate.centroid.x >= 0 && candidate.centroid.x <= MAP_WIDTH));
  assert.ok(candidates.every((candidate) => candidate.centroid.y >= 0 && candidate.centroid.y <= MAP_HEIGHT));
  assert.ok(candidates.every((candidate) => candidate.transform.startsWith("matrix(")));
  assert.ok(candidates.every((candidate) => candidate.bbox.width > 0 && candidate.bbox.height > 0));
});

test("manifest script exposes the extracted shapes for the browser map helper", () => {
  const svg = readSvgMap(svgPath);
  const candidates = extractTerritoryCandidates(svg);
  const script = renderShapeManifestScript(candidates, svg);

  assert.match(script, /AGGS_TRADE_MAP_SHAPES/);
  assert.match(script, /ag-political-map\.svg/);
  assert.match(script, new RegExp(`"height":\\s*${MAP_HEIGHT.toFixed(6).replace(".", "\\.")}`));
  assert.ok(script.length > 1000);
  assert.doesNotThrow(() => new Function("window", script)({}));
});

test("manifest script exposes clustered SVG label geometry", () => {
  const svg = readSvgMap(svgPath);
  const candidates = extractTerritoryCandidates(svg);
  const script = renderShapeManifestScript(candidates, svg);
  const sandbox = {};

  new Function("window", script)(sandbox);
  const manifest = sandbox.AGGS_TRADE_MAP_SHAPES;

  assert.ok(Array.isArray(manifest.labels));
  assert.ok(manifest.labels.length >= 100, `expected map labels, got ${manifest.labels.length}`);
  assert.equal(manifest.labels.every((label) => label.id.startsWith("svg_label_")), true);
  assert.equal(manifest.labels.every((label) => Array.isArray(label.sourcePathIndices) && label.sourcePathIndices.length > 0), true);
  assert.equal(manifest.labels.every((label) => label.bbox.width > 0 && label.bbox.height > 0), true);
  assert.ok(manifest.labels.some((label) => label.centroid.x > 82 && label.centroid.x < 87 && label.centroid.y > 10 && label.centroid.y < 13));
});

test("generated manifest file stays in sync with the SVG asset", () => {
  const generatedPath = path.join(__dirname, "..", "site", "js", "app", "tradeMapShapes.js");
  assert.equal(fs.existsSync(generatedPath), true, "run the SVG extractor to generate tradeMapShapes.js");

  const svg = readSvgMap(svgPath);
  const expected = renderShapeManifestScript(extractTerritoryCandidates(svg), svg);
  const actual = fs.readFileSync(generatedPath, "utf8");

  assert.equal(actual, expected);
});
