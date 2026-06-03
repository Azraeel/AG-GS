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

test("generated trade route mesh exposes map-derived sea and strait nodes", () => {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  loadScript("site/js/app/tradeZones.js", sandbox);
  loadScript("site/js/app/tradeRouteMesh.js", sandbox);

  const mesh = sandbox.AGGS_TRADE_ROUTE_MESH;
  assert.equal(mesh.version, "map-derived-overlay-v1");
  assert.equal(mesh.sourceAsset, "assets/ag-trade-zones.png");
  assert.equal(mesh.width, 8800);
  assert.equal(mesh.height, 5806);
  assert.equal(mesh.nodes.length, 21);
  assert.ok(mesh.edges.length >= 60, "route mesh should connect each zone to nearby zones");

  const nodesById = Object.fromEntries(mesh.nodes.map((node) => [node.id, node]));
  assert.equal(nodesById["zone:sea_of_xanaqu"].type, "sea_zone");
  assert.equal(nodesById["zone:vesperan_strait"].type, "strait");
  assert.equal(nodesById["zone:vesperan_strait"].chokepoint, true);
  assert.ok(nodesById["zone:sea_of_xanaqu"].x > 0 && nodesById["zone:sea_of_xanaqu"].x < 100);
  assert.ok(nodesById["zone:sea_of_xanaqu"].y > 0 && nodesById["zone:sea_of_xanaqu"].y < 100);
  assert.ok(nodesById["zone:azagorian"].sampleCount > 100000, "large exact-color zones should be sampled from the overlay");
  assert.ok(["overlay-color", "fallback-anchor"].includes(nodesById["zone:the_storm_expanse"].source));
});

test("route mesh is loaded before trade map helpers in both entrypoints", () => {
  const publicHtml = fs.readFileSync(path.join(root, "site", "index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "site", "admin", "index.html"), "utf8");

  const publicMesh = publicHtml.indexOf("js/app/tradeRouteMesh.js?v=20260603-map-route-mesh");
  const publicMap = publicHtml.indexOf("js/app/tradeMap.js?v=20260603-map-route-mesh");
  const adminMesh = adminHtml.indexOf("../js/app/tradeRouteMesh.js?v=20260603-map-route-mesh");
  const adminMap = adminHtml.indexOf("../js/app/tradeMap.js?v=20260603-map-route-mesh");

  assert.ok(publicMesh > 0, "public page should load the generated route mesh");
  assert.ok(adminMesh > 0, "admin page should load the generated route mesh");
  assert.ok(publicMesh < publicMap, "public route mesh must load before tradeMap.js");
  assert.ok(adminMesh < adminMap, "admin route mesh must load before tradeMap.js");
});

test("trade map helper copies the generated route mesh into trade network geography", () => {
  global.window = global;
  require("../site/data.js");
  require("../site/js/app/tradeMapShapes.js");
  require("../site/js/app/tradeZones.js");
  require("../site/js/app/tradeRouteMesh.js");
  require("../site/js/app/tradeMap.js");

  const data = JSON.parse(JSON.stringify(global.AGGS_DATA));
  const geography = global.AGGS_TRADE_MAP.ensureGeography(data);

  assert.ok(geography.solara, "nation geography should still be returned");
  assert.equal(data.tradeNetwork.geography.routeMesh.version, "map-derived-overlay-v1");
  assert.equal(data.tradeNetwork.geography.routeMesh.nodes.length, 21);
  assert.ok(data.tradeNetwork.geography.routeMesh.edges.length >= 60);
});
