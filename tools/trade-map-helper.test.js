const assert = require("node:assert/strict");
const test = require("node:test");

global.window = global;
require("../site/data.js");
require("../site/js/app/tradeMapShapes.js");
require("../site/js/app/tradeMap.js");

const TradeMap = global.AGGS_TRADE_MAP;
const data = global.AGGS_DATA;

test("trade map helper exposes the real SVG map manifest", () => {
  const config = TradeMap.mapConfig();

  assert.equal(config.hasRealSvg, true);
  assert.equal(config.assetPath, "assets/ag-political-map.svg");
  assert.equal(config.viewBox, "0 0 100 65.977273");
  assert.ok(config.sourceTerritoryCount >= 45);
  assert.equal(config.surfaceAreaSqMi, 236_400_000);
  assert.equal(Number(config.earthSurfaceScale.toFixed(1)), 1.2);
  assert.ok(config.equatorialCircumferenceMi > 27_200 && config.equatorialCircumferenceMi < 27_300);
  assert.ok(config.distancePerViewBoxUnitMi > 180 && config.distancePerViewBoxUnitMi < 200);
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
  assert.match(shapes[0].path, /^M\s*/);
  assert.ok(shapes[0].centroid.x < shapes[1].centroid.x, "Solara seed should sit west of Xanaqu");
  assert.ok(shapes[0].centroid.y <= TradeMap.mapConfig().height, "visual centroid should fit the real map viewBox");
  assert.ok(shapes[0].geography.x >= 0 && shapes[0].geography.x <= 100, "trade geography should stay in the 0-100 coordinate space");
  assert.ok(shapes[0].geography.y >= 0 && shapes[0].geography.y <= 100, "trade geography should stay in the 0-100 coordinate space");
  assert.equal(shapes[0].geography.capital.label, "Capital");
  assert.equal(shapes[0].geography.coastal, true);
  assert.equal(shapes[0].geography.oceanZone, "Western Ocean");
  assert.ok(shapes[0].geography.primaryPort.longitude < shapes[0].geography.capital.longitude, "western port should sit closer to the western ocean");
  assert.ok(Array.isArray(shapes[0].geography.neighborIds) && shapes[0].geography.neighborIds.length >= 1);
});

test("real SVG map uses territory-first click targets for every ledger nation", () => {
  const shapes = TradeMap.territoriesForNations(data.nations, "solara");
  const byId = Object.fromEntries(shapes.map((shape) => [shape.nationId, shape]));
  const reviewedTargetIds = new Set([
    "baathist_republic_of_volgastan",
    "federated_syndicates_of_veszprem",
    "republic_of_belcanto",
    "templar_of_saxonia",
    "xaojin_heavenly_kingdom",
    "zhensanovian_commonwealth"
  ]);

  assert.equal(shapes.length, 50);
  assert.equal(shapes.some((shape) => shape.anchorSource === "svg-label"), false);
  assert.equal(shapes.some((shape) => shape.anchorSource === "generated-fallback"), false);
  assert.equal(shapes.filter((shape) => shape.anchorSource === "reviewed-map-target").length, reviewedTargetIds.size);
  assert.equal(shapes.every((shape) => shape.anchorSource === "svg-territory" || reviewedTargetIds.has(shape.nationId)), true);
  assert.equal(shapes.every((shape) => shape.sourceBounds?.width > 0 && shape.sourceBounds?.height > 0), true);
  assert.equal(byId.astoria.anchorSource, "svg-territory");
  assert.equal(byId.astoria.sourceTerritoryId, "svg_path_15");
  assert.equal(byId.astoria.geography.coastal, true);
  assert.equal(byId.astoria.geography.oceanZone, "Western Ocean");
  assert.equal(byId.astoria.geography.capital.label, "Capital");
  assert.ok(byId.astoria.geography.neighborIds.includes("federation_of_vinterholm"));
  assert.ok(shapes.every((shape) => shape.geography.continent && shape.geography.regionLabel));
  assert.ok(shapes.every((shape) => Array.isArray(shape.geography.borderCandidates) && shape.geography.borderCandidates.length > 0));
  assert.equal(byId.people_s_federation_of_xanaqu.anchorSource, "svg-territory");
  assert.equal(byId.people_s_federation_of_xanaqu.sourceTerritoryId, "svg_path_14");
  assert.equal(byId.baechong_democratic_republic.anchorSource, "svg-territory");
  assert.equal(byId.baechong_democratic_republic.sourceTerritoryId, "svg_path_62");
  assert.equal(byId.pdr_of_hoshigoru.sourceTerritoryId, "svg_path_13");
  assert.equal(byId.butonian_state.anchorSource, "svg-territory");
  assert.equal(byId.butonian_state.sourceTerritoryId, "svg_path_43");
  assert.equal(byId.duchy_of_hoogeveen.sourceTerritoryId, "svg_path_86");
  assert.equal(byId.federation_of_vinterholm.sourceTerritoryId, "svg_path_29");
  assert.equal(byId.fengu_people_s_federation.sourceTerritoryId, "svg_path_109");
  assert.equal(byId.imperial_dynasty_of_saochai.anchorSource, "svg-territory");
  assert.equal(byId.imperial_dynasty_of_saochai.sourceTerritoryId, "svg_path_11");
  assert.equal(byId.empire_of_hanazuki.anchorSource, "svg-territory");
  assert.equal(byId.empire_of_hanazuki.sourceTerritoryId, "svg_path_40");
  assert.equal(byId.xaojin_heavenly_kingdom.anchorSource, "reviewed-map-target");
  assert.equal(byId.baathist_republic_of_volgastan.anchorSource, "reviewed-map-target");
  assert.ok(byId.people_s_federation_of_xanaqu.transform);
  assert.ok(byId.empire_of_hanazuki.transform);
  assert.ok(byId.astoria.centroid.x > 2.5 && byId.astoria.centroid.x < 4, "Astoria click target should sit inside the black Astoria territory");
  assert.ok(byId.astoria.centroid.y > 28 && byId.astoria.centroid.y < 30, "Astoria click target should sit inside the black Astoria territory");
  assert.ok(byId.people_s_federation_of_xanaqu.centroid.x > 33 && byId.people_s_federation_of_xanaqu.centroid.x < 37);
  assert.ok(byId.people_s_federation_of_xanaqu.centroid.y > 44 && byId.people_s_federation_of_xanaqu.centroid.y < 47);
  assert.ok(byId.baechong_democratic_republic.centroid.x > 52 && byId.baechong_democratic_republic.centroid.x < 55);
  assert.ok(byId.baechong_democratic_republic.centroid.y > 18 && byId.baechong_democratic_republic.centroid.y < 21);
  assert.ok(byId.butonian_state.centroid.x > 14 && byId.butonian_state.centroid.x < 17);
  assert.ok(byId.butonian_state.centroid.y > 42 && byId.butonian_state.centroid.y < 45);
  assert.ok(byId.duchy_of_hoogeveen.centroid.x > 12 && byId.duchy_of_hoogeveen.centroid.x < 15);
  assert.ok(byId.duchy_of_hoogeveen.centroid.y > 26 && byId.duchy_of_hoogeveen.centroid.y < 29);
  assert.ok(byId.imperial_dynasty_of_saochai.centroid.x > 36 && byId.imperial_dynasty_of_saochai.centroid.x < 39);
  assert.ok(byId.imperial_dynasty_of_saochai.centroid.y > 31 && byId.imperial_dynasty_of_saochai.centroid.y < 34);
  assert.ok(byId.empire_of_hanazuki.centroid.x > 40 && byId.empire_of_hanazuki.centroid.x < 43);
  assert.ok(byId.empire_of_hanazuki.centroid.y > 22 && byId.empire_of_hanazuki.centroid.y < 25);
  assert.ok(byId.xaojin_heavenly_kingdom.centroid.x > 33 && byId.xaojin_heavenly_kingdom.centroid.x < 35);
  assert.ok(byId.xaojin_heavenly_kingdom.centroid.y > 40 && byId.xaojin_heavenly_kingdom.centroid.y < 42);
  assert.ok(byId.baathist_republic_of_volgastan.centroid.x > 80 && byId.baathist_republic_of_volgastan.centroid.x < 87);
  assert.ok(byId.baathist_republic_of_volgastan.centroid.y > 38 && byId.baathist_republic_of_volgastan.centroid.y < 41);
  assert.equal(byId.fengu_people_s_federation.sourceTerritoryId, "svg_path_109");
  assert.ok(byId.fengu_people_s_federation.centroid.x > 47.5 && byId.fengu_people_s_federation.centroid.x < 49.5);
  assert.ok(byId.fengu_people_s_federation.centroid.y > 27 && byId.fengu_people_s_federation.centroid.y < 29);
  assert.equal(byId.vinraarabeise_people_s_republic.sourceTerritoryId, "svg_path_100");
  assert.ok(byId.vinraarabeise_people_s_republic.centroid.x > 41 && byId.vinraarabeise_people_s_republic.centroid.x < 43.5);
  assert.ok(byId.vinraarabeise_people_s_republic.centroid.y > 53.5 && byId.vinraarabeise_people_s_republic.centroid.y < 56);
  assert.equal(Math.round(byId.empire_of_khalindar.geography.areaSqMi), 7_260_000);
  assert.ok(byId.fengu_people_s_federation.geography.areaSqMi > 100_000);
  assert.ok(byId.vinraarabeise_people_s_republic.geography.areaSqMi > 150_000);
  assert.ok(byId.solara.centroid.x > 3 && byId.solara.centroid.x < 10, "Solara click target should sit on the visible bottom-left map label");
  assert.ok(byId.solara.centroid.y > 54 && byId.solara.centroid.y < 59, "Solara click target should sit on the visible bottom-left map label");
  assert.ok(byId.republic_of_aurendale.centroid.x > 47 && byId.republic_of_aurendale.centroid.x < 51);
  assert.ok(byId.republic_of_aurendale.centroid.y > 40 && byId.republic_of_aurendale.centroid.y < 43);
  assert.ok(byId.karkalnadag_kingdom.centroid.x > 82 && byId.karkalnadag_kingdom.centroid.x < 88);
  assert.ok(byId.karkalnadag_kingdom.centroid.y > 10 && byId.karkalnadag_kingdom.centroid.y < 15);
  assert.notEqual(byId.karkalnadag_kingdom.sourceBounds.x, byId.karkalnadag_kingdom.centroid.x);
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

test("trade map helper draws solved route polylines when lane path points exist", () => {
  const nations = [
    { id: "solara", name: "Solara", color: "#c2b72e" },
    { id: "people_s_federation_of_xanaqu", name: "People's Federation of Xanaqu", color: "#884b43" }
  ];
  const shapes = TradeMap.territoriesForNations(nations, "solara");
  const rows = [{
    partner: nations[1],
    importFlow: 1200,
    exportFlow: 400,
    importLane: {
      routeType: "ocean",
      routeDistance: 44,
      routePath: [
        { x: 8, y: 88 },
        { x: 24, y: 76 },
        { x: 39, y: 75 }
      ]
    },
    exportLane: {
      routeType: "ocean",
      routeDistance: 44,
      routePath: [
        { x: 39, y: 75 },
        { x: 24, y: 76 },
        { x: 8, y: 88 }
      ]
    }
  }];

  const routes = TradeMap.routesForRows("solara", rows, shapes);

  assert.equal(routes.length, 1);
  assert.match(routes[0].path, /^M /);
  assert.match(routes[0].path, / L /, "solved routes should render as polylines");
  assert.doesNotMatch(routes[0].path, / Q /, "solved routes should not use fallback quadratic arcs");
});

test("ensureGeography attaches the precision lane skeleton manifest", () => {
  const hadLaneSkeleton = Object.prototype.hasOwnProperty.call(global, "AGGS_TRADE_LANE_SKELETON");
  const previousLaneSkeleton = global.AGGS_TRADE_LANE_SKELETON;
  global.AGGS_TRADE_LANE_SKELETON = {
    version: "unit-test-lanes",
    nodes: [{ id: "lane:test", type: "lane", x: 20, y: 70 }],
    edges: []
  };
  const unitData = {
    nations: [{ id: "solara", name: "Solara", color: "#c2b72e" }],
    tradeNetwork: { geography: { nations: {} } }
  };

  try {
    TradeMap.ensureGeography(unitData);
  } finally {
    if (hadLaneSkeleton) {
      global.AGGS_TRADE_LANE_SKELETON = previousLaneSkeleton;
    } else {
      delete global.AGGS_TRADE_LANE_SKELETON;
    }
  }

  assert.equal(unitData.tradeNetwork.geography.laneSkeleton.version, "unit-test-lanes");
});
