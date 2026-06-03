const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadScript(relativePath, sandbox) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInNewContext(source, sandbox, { filename: relativePath });
  return source;
}

test("precision trade lane skeleton manifest exposes major corridor nodes and edges", () => {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;

  loadScript("site/js/app/tradeLaneSkeleton.js", sandbox);

  const skeleton = sandbox.AGGS_TRADE_LANE_SKELETON;
  assert.equal(skeleton.version, "precision-lane-skeleton-v1");
  assert.ok(Array.isArray(skeleton.nodes));
  assert.ok(Array.isArray(skeleton.edges));
  assert.ok(skeleton.nodes.length >= 12, "major shipping corridors need enough waypoints to bend around continents");
  assert.ok(skeleton.edges.length >= 14, "lane graph should have connected corridor edges");
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:southern_solara_gate"));
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:central_southern_trunk"));
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:eastern_orinian_approach"));
  assert.ok(
    skeleton.edges.some(
      (edge) => edge.from === "lane:southern_solara_gate" && edge.to === "lane:southwest_khalindar_trunk"
    )
  );
  assert.ok(
    skeleton.edges.some((edge) => Array.isArray(edge.path) && edge.path.length >= 2),
    "edges should carry draw paths, not only endpoints"
  );
});

test("precision trade lane skeleton loads before trade map on public and admin pages", () => {
  const publicHtml = fs.readFileSync(path.join(root, "site", "index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "site", "admin", "index.html"), "utf8");

  const publicSkeleton = publicHtml.indexOf("js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes");
  const publicMap = publicHtml.indexOf("js/app/tradeMap.js?");
  const adminSkeleton = adminHtml.indexOf("../js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes");
  const adminMap = adminHtml.indexOf("../js/app/tradeMap.js?");

  assert.ok(publicSkeleton >= 0, "public page should load precision lane skeleton");
  assert.ok(adminSkeleton >= 0, "admin page should load precision lane skeleton");
  assert.ok(publicSkeleton < publicMap, "public skeleton must load before trade map");
  assert.ok(adminSkeleton < adminMap, "admin skeleton must load before trade map");
});
