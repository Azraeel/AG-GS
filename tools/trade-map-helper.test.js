const assert = require("node:assert/strict");
const test = require("node:test");

global.window = global;
require("../site/js/app/tradeMapShapes.js");
require("../site/js/app/tradeMap.js");

const TradeMap = global.AGGS_TRADE_MAP;

test("trade map helper exposes the real SVG map manifest", () => {
  const config = TradeMap.mapConfig();

  assert.equal(config.hasRealSvg, true);
  assert.equal(config.assetPath, "assets/ag-political-map.svg");
  assert.equal(config.viewBox, "0 0 100 65.977273");
  assert.ok(config.sourceTerritoryCount >= 45);
});

test("trade map helper creates clickable territory shapes for nations", () => {
  const nations = [
    { id: "solara", name: "Solara", color: "#c2b72e" },
    { id: "people_s_federation_of_xanaqu", name: "People's Federation of Xanaqu", color: "#884b43" },
    { id: "republic_of_aurendale", name: "Republic of Aurendale", color: "#4f86d8" }
  ];

  const shapes = TradeMap.territoriesForNations(nations, "solara");

  assert.equal(shapes.length, 3);
  assert.equal(shapes[0].nationId, "solara");
  assert.equal(shapes[0].selected, true);
  assert.match(shapes[0].path, /^M /);
  assert.ok(shapes[0].centroid.x < shapes[1].centroid.x, "Solara seed should sit west of Xanaqu");
  assert.ok(shapes[0].centroid.y <= TradeMap.mapConfig().height, "visual centroid should fit the real map viewBox");
  assert.equal(shapes[0].geography.y, 88, "trade geography should stay in the legacy 0-100 coordinate space");
});

test("trade map helper turns partner rows into route overlays", () => {
  const nations = [
    { id: "solara", name: "Solara", color: "#c2b72e" },
    { id: "people_s_federation_of_xanaqu", name: "People's Federation of Xanaqu", color: "#884b43" }
  ];
  const shapes = TradeMap.territoriesForNations(nations, "solara");
  const rows = [{
    partner: nations[1],
    importFlow: 1200,
    exportFlow: 400,
    importLane: { routeType: "ocean", routeDistance: 44 },
    exportLane: { routeType: "ocean", routeDistance: 44 }
  }];

  const routes = TradeMap.routesForRows("solara", rows, shapes);

  assert.equal(routes.length, 1);
  assert.equal(routes[0].partnerId, "people_s_federation_of_xanaqu");
  assert.equal(routes[0].routeType, "ocean");
  assert.match(routes[0].path, /^M /);
});
