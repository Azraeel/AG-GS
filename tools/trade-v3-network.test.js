const assert = require("node:assert/strict");
const test = require("node:test");

global.window = global;
require("../site/js/engine/fiscal.js");
require("../site/js/engine/trade.js");
require("../site/engine.js");

const Engine = global.AGGS_ENGINE;

function buildTradeV3Scenario() {
  const currentYear = 2022;
  const ids = ["aurendale", "kolkelennan", "solara"];
  const nations = [
    { id: "aurendale", name: "Aurendale" },
    { id: "kolkelennan", name: "Kolkelennan" },
    { id: "solara", name: "Solara" }
  ];
  const national = {
    aurendale: {
      governmentalStability: 91,
      publicUnrest: 0,
      corruption: 18,
      developmentLevel: 18,
      budgetCapacity: 40000,
      budgetExpenditure: 36000,
      budgetBalance: 4000,
      primaryBalance: 4000,
      treasuryReserve: 0,
      debt: 4,
      economicHealth: "Prosperity",
      immigrationRate: 1,
      taxRate: 0.04,
      fiscalModel: "Standard",
      budgetAdjustment: 0
    },
    kolkelennan: {
      governmentalStability: 76,
      publicUnrest: 1,
      corruption: 22,
      developmentLevel: 12,
      budgetCapacity: 25000,
      budgetExpenditure: 22000,
      budgetBalance: 3000,
      primaryBalance: 3000,
      treasuryReserve: 0,
      debt: 8,
      economicHealth: "Expansion",
      immigrationRate: 0,
      taxRate: 0.035,
      fiscalModel: "Standard",
      budgetAdjustment: 0
    },
    solara: {
      governmentalStability: 94,
      publicUnrest: 0,
      corruption: 12,
      developmentLevel: 17,
      budgetCapacity: 45000,
      budgetExpenditure: 41000,
      budgetBalance: 4000,
      primaryBalance: 4000,
      treasuryReserve: 0,
      debt: 3,
      economicHealth: "Prosperity",
      immigrationRate: 1,
      taxRate: 0.04,
      fiscalModel: "Standard",
      budgetAdjustment: 0
    }
  };
  const trade = {
    aurendale: {
      tradeCapacity: 60000,
      tradeEfficiency: 120,
      autarkyIndex: 20,
      tradeBalance: 240000,
      tradeFlow: 1800000,
      tradePower: 120000,
      importReliance: 120,
      exportReliance: 100,
      economicTradeDiversity: 115,
      tradePolicy: "Balanced",
      sanctionsLevel: "None",
      tariffRate: 4
    },
    kolkelennan: {
      tradeCapacity: 42000,
      tradeEfficiency: 105,
      autarkyIndex: 25,
      tradeBalance: 90000,
      tradeFlow: 850000,
      tradePower: 78000,
      importReliance: 82,
      exportReliance: 118,
      economicTradeDiversity: 88,
      tradePolicy: "Open Market",
      sanctionsLevel: "None",
      tariffRate: 5
    },
    solara: {
      tradeCapacity: 68000,
      tradeEfficiency: 125,
      autarkyIndex: 18,
      tradeBalance: 260000,
      tradeFlow: 2100000,
      tradePower: 145000,
      importReliance: 105,
      exportReliance: 130,
      economicTradeDiversity: 120,
      tradePolicy: "Free Trade",
      sanctionsLevel: "None",
      tariffRate: 3
    }
  };
  return Engine.normalizeState({
    meta: {
      currentYear,
      worldEconomicHealth: "Expansion",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026",
      tradeFormulaVersion: "trade2026"
    },
    nations,
    national,
    trade,
    industrial: Object.fromEntries(ids.map((id, index) => [id, {
      civilianFactories: [220, 130, 260][index],
      militaryFactories: [30, 18, 34][index],
      shipyards: [20, 10, 30][index],
      mobilizationLevel: "None"
    }])),
    military: Object.fromEntries(ids.map((id) => [id, {
      militaryOrganization: 8,
      militarySupply: 120,
      mobilizationLevel: "None",
      equipmentComplexity: 7
    }])),
    population: Object.fromEntries(ids.map((id, index) => [id, {
      mandatoryChildPolicy: "No Policy",
      values: { [String(currentYear)]: [280000000, 80000000, 180000000][index] }
    }])),
    intelligence: Object.fromEntries(ids.map((id) => [id, {}])),
    naval: Object.fromEntries(ids.map((id) => [id, { total: 0, categories: [] }]))
  });
}

function buildLargeTradeV3Scenario(count = 100) {
  const currentYear = 2022;
  const nations = [];
  const national = {};
  const trade = {};
  const industrial = {};
  const military = {};
  const population = {};
  const intelligence = {};
  const naval = {};

  for (let index = 0; index < count; index++) {
    const id = `nation_${index}`;
    nations.push({ id, name: `Nation ${index}` });
    national[id] = {
      governmentalStability: 65 + (index % 30),
      publicUnrest: index % 4,
      corruption: 8 + (index % 28),
      developmentLevel: 8 + (index % 12),
      budgetCapacity: 12000 + index * 120,
      budgetExpenditure: 10000 + index * 100,
      budgetBalance: 2000,
      primaryBalance: 2000,
      treasuryReserve: 0,
      debt: index % 20,
      economicHealth: index % 3 ? "Expansion" : "Prosperity",
      immigrationRate: index % 2,
      taxRate: 0.04,
      fiscalModel: "Standard",
      budgetAdjustment: 0
    };
    trade[id] = {
      tradeCapacity: 30000 + index * 180,
      tradeEfficiency: 85 + (index % 40),
      autarkyIndex: 10 + (index % 60),
      tradeBalance: 45000 + index * 900,
      tradeFlow: 500000 + index * 6500,
      tradePower: 50000 + index * 350,
      importReliance: 60 + (index % 90),
      exportReliance: 55 + ((index * 7) % 100),
      economicTradeDiversity: 40 + ((index * 5) % 100),
      tradePolicy: ["Balanced", "Open Market", "Free Trade", "Protectionist"][index % 4],
      sanctionsLevel: "None",
      tariffRate: 3 + (index % 12)
    };
    industrial[id] = {
      civilianFactories: 60 + (index % 220),
      militaryFactories: 12 + (index % 60),
      shipyards: index % 40,
      mobilizationLevel: "None"
    };
    military[id] = {
      militaryOrganization: 8,
      militarySupply: 120,
      mobilizationLevel: "None",
      equipmentComplexity: 7
    };
    population[id] = {
      mandatoryChildPolicy: "No Policy",
      values: { [String(currentYear)]: 8000000 + index * 1200000 }
    };
    intelligence[id] = {};
    naval[id] = { total: 0, categories: [] };
  }

  return Engine.normalizeState({
    meta: {
      currentYear,
      worldEconomicHealth: "Expansion",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026",
      tradeFormulaVersion: "trade2026"
    },
    nations,
    national,
    trade,
    industrial,
    military,
    population,
    intelligence,
    naval
  });
}

function snapshotCore(data, id) {
  return {
    budgetCapacity: data.national[id].budgetCapacity,
    tradeFlow: data.trade[id].tradeFlow,
    tradeBalance: data.trade[id].tradeBalance
  };
}

test("Trade v3 migration keeps existing nation totals neutral", () => {
  const data = buildTradeV3Scenario();
  const before = Object.fromEntries(data.nations.map((nation) => [nation.id, snapshotCore(data, nation.id)]));

  Engine.recalculateAll(data);

  assert.equal(data.meta.tradeFormulaVersion, "trade2027");
  for (const nation of data.nations) {
    assert.equal(data.national[nation.id].budgetCapacity, before[nation.id].budgetCapacity);
    assert.equal(data.trade[nation.id].tradeFlow, before[nation.id].tradeFlow);
    assert.equal(data.trade[nation.id].tradeBalance, before[nation.id].tradeBalance);
  }
});

test("targeted tariffs reduce a specific partner lane and spill into other nations", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const beforeKolkelennan = snapshotCore(data, "kolkelennan");
  const baselineLane = baselineNetwork.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");

  Engine.setTargetedTariff(data, "aurendale", "kolkelennan", 24);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const changedLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");
  const solaraLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "solara");

  assert.ok(changedLane.currentFlow < baselineLane.currentFlow * 0.9, `${changedLane.currentFlow} should fall from ${baselineLane.currentFlow}`);
  assert.ok(solaraLane.currentFlow > solaraLane.baselineFlow, "Solara should pick up some redirected Aurendale import demand");
  assert.ok(data.trade.kolkelennan.tradeFlow < beforeKolkelennan.tradeFlow, "Kolkelennan should lose export flow after being targeted");
  assert.equal(network.nations.aurendale.targetedTariffCount, 1);
});

test("export anchors concentrate an exporter on a chosen importer", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const baselineLane = baselineNetwork.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");

  Engine.setExportAnchor(data, "kolkelennan", "aurendale", 80);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const anchoredLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");
  const exporterTotal = network.lanes
    .filter((lane) => lane.exporterId === "kolkelennan")
    .reduce((total, lane) => total + lane.currentFlow, 0);
  const exportShare = anchoredLane.currentFlow / exporterTotal;

  assert.ok(anchoredLane.currentFlow > baselineLane.currentFlow * 1.35, `${anchoredLane.currentFlow} should exceed ${baselineLane.currentFlow}`);
  assert.ok(exportShare >= 0.74 && exportShare <= 0.86, `anchored export share was ${exportShare}`);
  assert.equal(anchoredLane.exportAnchorShare, 80);
});

test("import anchors concentrate an importer on a chosen exporter", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const baselineLane = baselineNetwork.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");

  Engine.setImportAnchor(data, "aurendale", "kolkelennan", 70);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const anchoredLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");
  const importerTotal = network.lanes
    .filter((lane) => lane.importerId === "aurendale")
    .reduce((total, lane) => total + lane.currentFlow, 0);
  const importShare = anchoredLane.currentFlow / importerTotal;

  assert.ok(anchoredLane.currentFlow > baselineLane.currentFlow * 1.4, `${anchoredLane.currentFlow} should exceed ${baselineLane.currentFlow}`);
  assert.ok(importShare >= 0.64 && importShare <= 0.76, `anchored import share was ${importShare}`);
  assert.equal(anchoredLane.importAnchorShare, 70);
});

test("bulk trade generator previews automatic and manual anchor suggestions", () => {
  const data = buildLargeTradeV3Scenario(12);
  Engine.recalculateAll(data);

  const preview = Engine.previewTradeAnchorPlan(data, "nation_3", {
    pattern: "concentrated",
    importPartners: [{ partnerId: "nation_7", share: 62 }],
    exportPartners: [{ partnerId: "nation_9", share: 58 }]
  });

  assert.equal(preview.countryId, "nation_3");
  assert.equal(preview.pattern, "concentrated");
  assert.ok(preview.importAnchors.length >= 2, "Generator should fill import partners beyond the manual pick");
  assert.ok(preview.exportAnchors.length >= 2, "Generator should fill export partners beyond the manual pick");
  assert.equal(preview.importAnchors[0].exporterId, "nation_7");
  assert.equal(preview.importAnchors[0].share, 62);
  assert.equal(preview.exportAnchors[0].importerId, "nation_9");
  assert.equal(preview.exportAnchors[0].share, 58);
  assert.ok(preview.importAnchors.reduce((total, row) => total + row.share, 0) <= 95);
  assert.ok(preview.exportAnchors.reduce((total, row) => total + row.share, 0) <= 95);
  assert.equal(preview.changes.length, preview.importAnchors.length + preview.exportAnchors.length);
});

test("bulk trade generator apply writes anchors and updates unified lanes", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);

  const preview = Engine.previewTradeAnchorPlan(data, "aurendale", {
    pattern: "manual",
    importPartners: [{ partnerId: "kolkelennan", share: 70 }],
    exportPartners: [{ partnerId: "solara", share: 55 }]
  });
  const applied = Engine.applyTradeAnchorPlan(data, preview);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const importLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");
  const exportLane = network.lanes.find((lane) => lane.exporterId === "aurendale" && lane.importerId === "solara");

  assert.equal(applied.importCount, 1);
  assert.equal(applied.exportCount, 1);
  assert.equal(data.tradeNetwork.importAnchors.aurendale.kolkelennan, 70);
  assert.equal(data.tradeNetwork.exportAnchors.aurendale.solara, 55);
  assert.ok(importLane.importerShare >= 65 && importLane.importerShare <= 75, `Import share was ${importLane.importerShare}`);
  assert.ok(exportLane.exporterShare >= 50 && exportLane.exporterShare <= 60, `Export share was ${exportLane.exporterShare}`);
});

test("unified trade flow follows bilateral lane totals when lane policy changes", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineTradeFlow = data.trade.aurendale.tradeFlow;

  Engine.setLanePolicy(data, "aurendale", "kolkelennan", { embargo: true });
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const expectedTradeFlow = baselineTradeFlow + network.nations.aurendale.tradeFlowDelta;
  const embargoedLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");

  assert.ok(Math.abs(data.trade.aurendale.tradeFlow - expectedTradeFlow) <= 1, `${data.trade.aurendale.tradeFlow} should match ${expectedTradeFlow} within rounding`);
  assert.equal(embargoedLane.currentFlow, 0);
});

test("general tariffs shrink the import pool and unified trade flow", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const baselineImportFlow = baselineNetwork.nations.aurendale.importFlow;
  const baselineTradeFlow = data.trade.aurendale.tradeFlow;

  Engine.updateValue(data, "trade", "aurendale", "tariffRate", 25);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  assert.ok(network.nations.aurendale.importFlow < baselineImportFlow * 0.86, `${network.nations.aurendale.importFlow} should fall from ${baselineImportFlow}`);
  assert.ok(data.trade.aurendale.tradeFlow < baselineTradeFlow, `${data.trade.aurendale.tradeFlow} should fall from ${baselineTradeFlow}`);
});

test("Trade v3 world pool equals global trade flow at baseline", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const totalTradeFlow = Object.values(data.trade).reduce((total, row) => total + row.tradeFlow, 0);

  assert.equal(network.worldPool.currentTradeFlow, totalTradeFlow);
});

test("Trade v3 directional pools separate import-heavy and export-heavy economies", () => {
  const data = buildTradeV3Scenario();
  data.trade.aurendale.importReliance = 220;
  data.trade.aurendale.exportReliance = 60;
  data.trade.kolkelennan.importReliance = 55;
  data.trade.kolkelennan.exportReliance = 230;
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const aurendale = network.nations.aurendale;
  const kolkelennan = network.nations.kolkelennan;
  const worldImports = Object.values(network.nations).reduce((total, row) => total + row.importFlow, 0);
  const worldExports = Object.values(network.nations).reduce((total, row) => total + row.exportFlow, 0);

  assert.ok(aurendale.importFlow > aurendale.exportFlow * 1.18, `Aurendale imports ${aurendale.importFlow} should exceed exports ${aurendale.exportFlow}`);
  assert.ok(kolkelennan.exportFlow > kolkelennan.importFlow * 1.18, `Kolkelennan exports ${kolkelennan.exportFlow} should exceed imports ${kolkelennan.importFlow}`);
  assert.ok(Math.abs(worldImports - network.worldPool.currentTradeFlow) <= data.nations.length, `${worldImports} should balance to ${network.worldPool.currentTradeFlow}`);
  assert.ok(Math.abs(worldExports - network.worldPool.currentTradeFlow) <= data.nations.length, `${worldExports} should balance to ${network.worldPool.currentTradeFlow}`);
});

test("Trade v3 global pool makes demand compete instead of creating unlimited world flow", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const baselineWorldImportFlow = Object.values(baselineNetwork.nations).reduce((total, row) => total + row.importFlow, 0);
  const baselineImportFlow = baselineNetwork.nations.aurendale.importFlow;
  const baselineImportShare = baselineImportFlow / baselineWorldImportFlow;
  const snapshotImportReliance = data.tradeNetwork.baseline.nations.aurendale.importReliance;

  Engine.updateValue(data, "trade", "aurendale", "importReliance", 1200);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const worldImportFlow = Object.values(network.nations).reduce((total, row) => total + row.importFlow, 0);
  const importShare = network.nations.aurendale.importFlow / worldImportFlow;

  assert.equal(data.tradeNetwork.baseline.nations.aurendale.importReliance, snapshotImportReliance);
  assert.ok(importShare > baselineImportShare * 1.4, `Aurendale import share should rise from ${baselineImportShare} to ${importShare}`);
  assert.ok(worldImportFlow < baselineWorldImportFlow * 1.85, `${worldImportFlow} should stay inside the world pool from ${baselineWorldImportFlow}`);
});

test("Trade v3 concentrates automatic lanes around major trade hubs", () => {
  const data = buildLargeTradeV3Scenario(50);
  data.trade.nation_49.tradeFlow = 17700000;
  data.trade.nation_49.exportReliance = 175;
  data.trade.nation_49.tradePolicy = "Free Trade";
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const topTradeHub = "nation_49";
  const lanesByImporter = new Map();
  for (const lane of network.lanes) {
    if (!lanesByImporter.has(lane.importerId)) lanesByImporter.set(lane.importerId, new Set());
    lanesByImporter.get(lane.importerId).add(lane.exporterId);
  }
  const importerPartnerCounts = [...lanesByImporter.values()].map((partners) => partners.size);
  const topHubImporters = network.lanes
    .filter((lane) => lane.exporterId === topTradeHub)
    .map((lane) => lane.importerId);
  const nonHubImporterPartnerCounts = [...lanesByImporter.entries()]
    .filter(([importerId]) => importerId !== topTradeHub)
    .map(([, partners]) => partners.size);

  assert.ok(network.lanes.length < 50 * 49 * 0.35, `network should not create every pair; got ${network.lanes.length}`);
  assert.ok(Math.max(...nonHubImporterPartnerCounts) <= 18, `non-hub partner count should stay bounded: ${Math.max(...nonHubImporterPartnerCounts)}`);
  assert.ok(topHubImporters.length >= 32, `${topTradeHub} should be a trade hub for most importers, got ${topHubImporters.length}`);
});

test("Trade v3 balanced gravity gives active exporters buyers without showing a full mesh", () => {
  const data = buildLargeTradeV3Scenario(50);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const worldImports = Object.values(network.nations).reduce((total, row) => total + row.importFlow, 0);
  const worldExports = Object.values(network.nations).reduce((total, row) => total + row.exportFlow, 0);
  const zeroExporters = data.nations
    .map((nation) => ({
      id: nation.id,
      tradeFlow: data.trade[nation.id].tradeFlow,
      exportReliance: data.trade[nation.id].exportReliance,
      exportFlow: network.nations[nation.id]?.exportFlow || 0
    }))
    .filter((row) => row.tradeFlow >= 100000 && row.exportReliance >= 40 && row.exportFlow <= 0);

  assert.equal(zeroExporters.length, 0, `active exporters with no buyers: ${zeroExporters.map((row) => row.id).join(", ")}`);
  assert.ok(Math.abs(worldImports - network.worldPool.currentTradeFlow) <= data.nations.length, `${worldImports} should balance to ${network.worldPool.currentTradeFlow}`);
  assert.ok(Math.abs(worldExports - network.worldPool.currentTradeFlow) <= data.nations.length, `${worldExports} should balance to ${network.worldPool.currentTradeFlow}`);
  assert.ok(network.lanes.length < 50 * 49 * 0.45, `display lanes should stay sparse; got ${network.lanes.length}`);
});

test("Trade v4 direct lanes concentrate small countries instead of listing every global hub", () => {
  const data = buildLargeTradeV3Scenario(50);
  data.trade.nation_48.tradeFlow = 14500000;
  data.trade.nation_48.exportReliance = 160;
  data.trade.nation_48.tradePolicy = "Free Trade";
  data.trade.nation_49.tradeFlow = 17700000;
  data.trade.nation_49.exportReliance = 175;
  data.trade.nation_49.tradePolicy = "Free Trade";
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const smallImporters = data.nations
    .map((nation) => nation.id)
    .filter((id) => data.trade[id].tradeFlow < 750000);
  const smallPartnerRows = smallImporters.map((id) => {
    const directImportLanes = network.lanes.filter((lane) => lane.importerId === id);
    const directHubImports = directImportLanes.filter((lane) => ["nation_48", "nation_49"].includes(lane.exporterId));
    return { id, directCount: directImportLanes.length, directHubCount: directHubImports.length };
  });
  const smallCountriesListingBothHubs = smallPartnerRows.filter((row) => row.directHubCount >= 2);
  const concentratedSmallCountries = smallPartnerRows.filter((row) => row.directCount <= 4);

  assert.ok(smallCountriesListingBothHubs.length <= Math.ceil(smallImporters.length * 0.35), `${smallCountriesListingBothHubs.length} small countries listed both global hubs`);
  assert.ok(concentratedSmallCountries.length >= Math.floor(smallImporters.length * 0.7), `${concentratedSmallCountries.length} small countries had concentrated direct lanes`);
  assert.equal(Object.values(network.nations).filter((row) => row.exportFlow <= 0).length, 0);
});

test("Trade v4 visible lanes keep active exporters visible without collapsing to one hub", () => {
  const data = buildLargeTradeV3Scenario(50);
  data.trade.nation_48.tradeFlow = 14500000;
  data.trade.nation_48.exportReliance = 160;
  data.trade.nation_48.tradePolicy = "Free Trade";
  data.trade.nation_49.tradeFlow = 17700000;
  data.trade.nation_49.exportReliance = 175;
  data.trade.nation_49.tradePolicy = "Free Trade";
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const visibleExportCounts = {};
  const visibleImportCounts = {};
  for (const lane of network.lanes) {
    visibleExportCounts[lane.exporterId] = (visibleExportCounts[lane.exporterId] || 0) + 1;
    visibleImportCounts[lane.importerId] = (visibleImportCounts[lane.importerId] || 0) + 1;
  }
  const activeExporters = data.nations
    .map((nation) => nation.id)
    .filter((id) => data.trade[id].tradeFlow >= 100000 && data.trade[id].exportReliance >= 40 && (network.nations[id]?.exportFlow || 0) > 0);
  const hiddenActiveExporters = activeExporters.filter((id) => (visibleExportCounts[id] || 0) <= 0);
  const importerPartnerCounts = Object.values(visibleImportCounts).sort((a, b) => a - b);
  const largestExporterLaneCount = Math.max(...Object.values(visibleExportCounts));

  assert.ok(hiddenActiveExporters.length <= Math.ceil(activeExporters.length * 0.18), `${hiddenActiveExporters.length} active exporters had no visible buyers`);
  assert.ok(importerPartnerCounts[Math.floor(importerPartnerCounts.length / 2)] >= 2, "median importer should have at least two direct partners");
  assert.ok(largestExporterLaneCount < data.nations.length * 0.8, `one exporter dominates too many direct lanes: ${largestExporterLaneCount}`);
});

test("Trade map geography prioritizes nearby regional lanes over distant inland lanes", () => {
  const data = buildLargeTradeV3Scenario(8);
  for (const nation of data.nations) {
    data.national[nation.id].developmentLevel = 12;
    data.trade[nation.id].tradeFlow = 1000000;
    data.trade[nation.id].importReliance = 100;
    data.trade[nation.id].exportReliance = 100;
    data.trade[nation.id].economicTradeDiversity = 100;
    data.trade[nation.id].tradePolicy = "Balanced";
    data.trade[nation.id].tariffRate = 4;
    data.industrial[nation.id].shipyards = 0;
  }
  data.tradeNetwork = {
    geography: {
      nations: {
        nation_0: { x: 10, y: 10, region: "west", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_1: { x: 14, y: 11, region: "west", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_2: { x: 86, y: 82, region: "east", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_3: { x: 18, y: 15, region: "west", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_4: { x: 21, y: 18, region: "west", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_5: { x: 72, y: 78, region: "east", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_6: { x: 76, y: 84, region: "east", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
        nation_7: { x: 90, y: 88, region: "east", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const nearbyLane = network.lanes.find((lane) => lane.importerId === "nation_0" && lane.exporterId === "nation_1");
  const distantLane = network.lanes.find((lane) => lane.importerId === "nation_0" && lane.exporterId === "nation_2");

  assert.ok(nearbyLane, "nearby regional lane should be visible");
  assert.ok(distantLane, "distant comparison lane should be visible");
  assert.ok(nearbyLane.currentFlow > distantLane.currentFlow * 1.2, `${nearbyLane.currentFlow} should beat ${distantLane.currentFlow}`);
  assert.equal(nearbyLane.routeType, "regional");
  assert.ok(nearbyLane.routeDistance < distantLane.routeDistance, "nearby lane should report a shorter route");
});

test("Trade route network reports Khalindar-calibrated map miles", () => {
  const data = buildTradeV3Scenario();
  data.nations = [
    { id: "empire_of_khalindar", name: "Empire of Khalindar" },
    { id: "solara", name: "Solara" },
    { id: "aurendale", name: "Aurendale" }
  ];
  for (const id of ["empire_of_khalindar", "solara", "aurendale"]) {
    data.national[id] = structuredClone(data.national.aurendale);
    data.trade[id] = structuredClone(data.trade.aurendale);
    data.industrial[id] = structuredClone(data.industrial.aurendale);
    data.population[id] = structuredClone(data.population.aurendale);
    data.military[id] = {};
    data.intelligence[id] = {};
    data.naval[id] = {};
  }
  data.tradeNetwork = {
    geography: {
      map: {
        calibrationNationId: "empire_of_khalindar",
        calibrationAreaSqMi: 7260000
      },
      nations: {
        empire_of_khalindar: {
          x: 20,
          y: 80,
          areaUnits: 400,
          coastal: true,
          portStrength: 7,
          routeAccess: ["land", "ocean"],
          neighborIds: ["solara"],
          borderDistances: { solara: 0, aurendale: 60 }
        },
        solara: {
          x: 24,
          y: 80,
          areaUnits: 90,
          coastal: true,
          portStrength: 9,
          routeAccess: ["land", "ocean"],
          neighborIds: ["empire_of_khalindar"],
          borderDistances: { empire_of_khalindar: 0, aurendale: 55 }
        },
        aurendale: {
          x: 80,
          y: 30,
          areaUnits: 120,
          coastal: true,
          portStrength: 9,
          routeAccess: ["ocean"],
          borderDistances: { empire_of_khalindar: 60, solara: 55 }
        }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const landLane = network.lanes.find((lane) => lane.importerId === "solara" && lane.exporterId === "empire_of_khalindar");
  const oceanLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "empire_of_khalindar");

  assert.ok(landLane.routeDistanceMiles < 50, `border route should be near zero map miles, got ${landLane.routeDistanceMiles}`);
  assert.ok(oceanLane.routeDistanceMiles > 9000 && oceanLane.routeDistanceMiles < 12000, `calibrated ocean route should be map miles, got ${oceanLane.routeDistanceMiles}`);
  assert.equal(network.routeNetwork.scale.calibrationNationId, "empire_of_khalindar");
  assert.ok(network.routeNetwork.scale.milesPerMapUnit > 130 && network.routeNetwork.scale.milesPerMapUnit < 140);
});

test("Trade route network uses A* route mesh paths instead of direct ocean lines", () => {
  const data = buildLargeTradeV3Scenario(2);
  const [exporter, importer] = data.nations.map((nation) => nation.id);
  for (const id of [exporter, importer]) {
    data.trade[id].tradeFlow = 1000000;
    data.trade[id].importReliance = 100;
    data.trade[id].exportReliance = 100;
    data.trade[id].economicTradeDiversity = 100;
    data.trade[id].tradePolicy = "Free Trade";
    data.trade[id].tariffRate = 3;
  }
  data.trade[exporter].exportReliance = 220;
  data.trade[importer].importReliance = 220;
  data.tradeNetwork = {
    geography: {
      map: {
        squareMilesPerMapUnit: 10000
      },
      routeMesh: {
        version: "unit-test-route-mesh",
        nodes: [
          { id: "zone:west_sea", zoneId: "west_sea", type: "sea_zone", x: 20, y: 50 },
          { id: "zone:middle_sea", zoneId: "middle_sea", type: "sea_zone", x: 50, y: 40 },
          { id: "zone:east_sea", zoneId: "east_sea", type: "sea_zone", x: 80, y: 50 }
        ],
        edges: [
          { from: "zone:west_sea", to: "zone:east_sea", cost: 120 },
          { from: "zone:west_sea", to: "zone:middle_sea", cost: 24 },
          { from: "zone:middle_sea", to: "zone:east_sea", cost: 24 }
        ]
      },
      nations: {
        [exporter]: {
          x: 20,
          y: 50,
          coastal: true,
          portStrength: 8,
          routeAccess: ["ocean"],
          primaryPort: { x: 20, y: 50 }
        },
        [importer]: {
          x: 80,
          y: 50,
          coastal: true,
          portStrength: 8,
          routeAccess: ["ocean"],
          primaryPort: { x: 80, y: 50 }
        }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const lane = network.lanes.find((entry) => entry.importerId === importer && entry.exporterId === exporter);

  assert.equal(lane.routeMode, "maritime");
  assert.equal(lane.routeMeshVersion, "unit-test-route-mesh");
  assert.ok(lane.routeNodes.includes("zone:middle_sea"), `expected A* route through middle sea: ${lane.routeNodes.join(" > ")}`);
  assert.ok(lane.routePath.length >= 5, "route should include start, mesh nodes, and end points");
  assert.ok(lane.routeDistanceMiles < 6000, `A* should avoid the expensive direct edge, got ${lane.routeDistanceMiles}`);
});

test("Trade route network prefers precision lane skeleton over coarse route mesh", () => {
  const data = buildLargeTradeV3Scenario(2);
  const [exporter, importer] = data.nations.map((nation) => nation.id);
  for (const id of [exporter, importer]) {
    data.trade[id].tradeFlow = 1000000;
    data.trade[id].importReliance = 180;
    data.trade[id].exportReliance = 180;
    data.trade[id].economicTradeDiversity = 160;
    data.trade[id].tradePolicy = "Free Trade";
    data.trade[id].tariffRate = 3;
  }
  data.trade[exporter].exportReliance = 220;
  data.trade[importer].importReliance = 220;
  data.tradeNetwork = {
    geography: {
      map: {
        squareMilesPerMapUnit: 10000
      },
      laneSkeleton: {
        version: "unit-test-precision-lanes",
        nodes: [
          { id: "lane:west_gate", type: "lane", x: 20, y: 70, zones: ["west_sea"] },
          { id: "lane:south_trunk", type: "lane", x: 45, y: 82, zones: ["south_sea"] },
          { id: "lane:east_gate", type: "lane", x: 80, y: 70, zones: ["east_sea"] }
        ],
        edges: [
          {
            from: "lane:west_gate",
            to: "lane:south_trunk",
            cost: 28,
            zones: ["west_sea", "south_sea"],
            path: [{ x: 20, y: 70 }, { x: 32, y: 82 }, { x: 45, y: 82 }]
          },
          {
            from: "lane:south_trunk",
            to: "lane:east_gate",
            cost: 30,
            zones: ["south_sea", "east_sea"],
            path: [{ x: 45, y: 82 }, { x: 64, y: 82 }, { x: 80, y: 70 }]
          }
        ]
      },
      routeMesh: {
        version: "unit-test-coarse-mesh",
        nodes: [
          { id: "zone:west_sea", zoneId: "west_sea", type: "sea_zone", x: 20, y: 70 },
          { id: "zone:east_sea", zoneId: "east_sea", type: "sea_zone", x: 80, y: 70 }
        ],
        edges: [
          { from: "zone:west_sea", to: "zone:east_sea", cost: 30 }
        ]
      },
      nations: {
        [exporter]: {
          x: 18,
          y: 68,
          coastal: true,
          portStrength: 8,
          routeAccess: ["ocean"],
          primaryPort: { x: 18, y: 68 }
        },
        [importer]: {
          x: 82,
          y: 68,
          coastal: true,
          portStrength: 8,
          routeAccess: ["ocean"],
          primaryPort: { x: 82, y: 68 }
        }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const lane = network.lanes.find((entry) => entry.importerId === importer && entry.exporterId === exporter);

  assert.equal(lane.routeMode, "maritime");
  assert.equal(lane.routeMeshVersion, "unit-test-precision-lanes");
  assert.ok(lane.routeNodes.includes("lane:south_trunk"), `expected precision route through south trunk: ${lane.routeNodes.join(" > ")}`);
  assert.deepEqual(lane.routeZones, ["west_sea", "south_sea", "east_sea"]);
  assert.ok(lane.routePath.some((point) => point.y >= 80), "route should follow the southern precision trunk");
});

test("Trade route network reroutes landlocked trade when a transit country blocks access", () => {
  const data = buildLargeTradeV3Scenario(4);
  const [inland, primaryPort, alternatePort, buyer] = data.nations.map((nation) => nation.id);
  for (const id of [inland, primaryPort, alternatePort, buyer]) {
    data.trade[id].tradeFlow = 1000000;
    data.trade[id].importReliance = 100;
    data.trade[id].exportReliance = 100;
    data.trade[id].economicTradeDiversity = 100;
    data.trade[id].tradePolicy = "Open Market";
    data.trade[id].tariffRate = 4;
  }
  data.trade[inland].exportReliance = 180;
  data.trade[buyer].importReliance = 180;
  data.tradeNetwork = {
    geography: {
      map: {
        calibrationNationId: "empire_of_khalindar",
        calibrationAreaSqMi: 7260000,
        squareMilesPerMapUnit: 1
      },
      nations: {
        [inland]: {
          x: 20,
          y: 20,
          areaUnits: 10,
          landlocked: true,
          coastal: false,
          portStrength: 0,
          routeAccess: ["land"],
          neighborIds: [primaryPort, alternatePort],
          borderDistances: { [primaryPort]: 0, [alternatePort]: 0 }
        },
        [primaryPort]: {
          x: 70,
          y: 20,
          areaUnits: 10,
          coastal: true,
          portStrength: 9,
          routeAccess: ["land", "ocean"],
          neighborIds: [inland],
          oceanZone: "west_ocean",
          borderDistances: { [inland]: 0 }
        },
        [alternatePort]: {
          x: 35,
          y: 20,
          areaUnits: 10,
          coastal: true,
          portStrength: 4,
          routeAccess: ["land", "ocean"],
          neighborIds: [inland],
          oceanZone: "west_ocean",
          borderDistances: { [inland]: 0 }
        },
        [buyer]: {
          x: 80,
          y: 20,
          areaUnits: 10,
          coastal: true,
          portStrength: 8,
          routeAccess: ["ocean"],
          oceanZone: "west_ocean"
        }
      }
    }
  };

  Engine.recalculateAll(data);
  const baseline = Engine.calculateTradeNetwork(data);
  const baselineLane = baseline.lanes.find((lane) => lane.importerId === buyer && lane.exporterId === inland);
  assert.ok(baselineLane.transitPath.includes(primaryPort), `baseline should use primary port path: ${baselineLane.transitPath.join(" > ")}`);

  Engine.setTransitPolicy(data, primaryPort, inland, "Block All");
  Engine.recalculateAll(data);
  const blocked = Engine.calculateTradeNetwork(data);
  const reroutedLane = blocked.lanes.find((lane) => lane.importerId === buyer && lane.exporterId === inland);

  assert.equal(reroutedLane.transitBlocked, false);
  assert.ok(reroutedLane.transitPath.includes(alternatePort), `blocked primary path should reroute through alternate port: ${reroutedLane.transitPath.join(" > ")}`);
  assert.ok(reroutedLane.routeEfficiency < baselineLane.routeEfficiency, `${reroutedLane.routeEfficiency} should be less efficient than ${baselineLane.routeEfficiency}`);
  assert.ok(blocked.nations[primaryPort].transitFlowLoss > 0, "blocking transit should cost the blocker some transit flow");
});

test("Vesperan Strait targeted disruption penalizes only lanes involving targeted countries", () => {
  const data = buildLargeTradeV3Scenario(4);
  const [targetedExporter, neutralExporter, importer, port] = data.nations.map((nation) => nation.id);
  for (const id of [targetedExporter, neutralExporter, importer, port]) {
    data.trade[id].tradeFlow = 1200000;
    data.trade[id].importReliance = 90;
    data.trade[id].exportReliance = 120;
    data.trade[id].economicTradeDiversity = 100;
    data.trade[id].tradePolicy = "Free Trade";
    data.trade[id].tariffRate = 3;
    data.industrial[id].shipyards = 30;
  }
  data.trade[importer].importReliance = 200;
  data.trade[targetedExporter].exportReliance = 180;
  data.trade[neutralExporter].exportReliance = 180;
  data.tradeNetwork = {
    chokepoints: {
      vesperan_strait: {
        status: "Open",
        targeted: {
          [targetedExporter]: { status: "Disrupted", severity: 70 }
        }
      }
    },
    geography: {
      map: {
        calibrationNationId: "empire_of_khalindar",
        calibrationAreaSqMi: 7260000,
        squareMilesPerMapUnit: 1
      },
      nations: {
        [targetedExporter]: { x: 10, y: 50, coastal: true, portStrength: 8, routeAccess: ["ocean"], oceanZone: "west_ocean" },
        [neutralExporter]: { x: 12, y: 55, coastal: true, portStrength: 8, routeAccess: ["ocean"], oceanZone: "west_ocean" },
        [port]: { x: 55, y: 50, coastal: true, portStrength: 9, routeAccess: ["ocean"], oceanZone: "vesperan_strait" },
        [importer]: { x: 90, y: 50, coastal: true, portStrength: 9, routeAccess: ["ocean"], oceanZone: "east_ocean" }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const targetedLane = network.lanes.find((lane) => lane.importerId === importer && lane.exporterId === targetedExporter);
  const neutralLane = network.lanes.find((lane) => lane.importerId === importer && lane.exporterId === neutralExporter);

  assert.ok(targetedLane.chokepoints.includes("vesperan_strait"), "targeted lane should route through Vesperan Strait");
  assert.equal(targetedLane.chokepointSeverity, 70);
  assert.equal(neutralLane.chokepointSeverity, 0);
  assert.ok(targetedLane.routeEfficiency < neutralLane.routeEfficiency * 0.75, `${targetedLane.routeEfficiency} should be far below ${neutralLane.routeEfficiency}`);
});

test("Trade v3 shipyard expansion grows the global trade pool", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineNetwork = Engine.calculateTradeNetwork(data);
  const baselineWorldImportFlow = Object.values(baselineNetwork.nations).reduce((total, row) => total + row.importFlow, 0);
  const baselineSolaraExport = baselineNetwork.nations.solara.exportFlow;

  Engine.updateValue(data, "industrial", "solara", "shipyards", 240);
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const worldImportFlow = Object.values(network.nations).reduce((total, row) => total + row.importFlow, 0);

  assert.ok(worldImportFlow > baselineWorldImportFlow * 1.08, `${worldImportFlow} should grow from ${baselineWorldImportFlow}`);
  assert.ok(network.worldPool.currentTradeFlow > baselineNetwork.worldPool.currentTradeFlow * 1.08, "World pool summary should show the logistics expansion");
  assert.ok(network.nations.solara.exportFlow > baselineSolaraExport, "Solara should capture more export flow after adding shipyards");
});

test("embargoed bilateral lanes are forced to zero and reduce the exporter", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const beforeKolkelennan = snapshotCore(data, "kolkelennan");

  Engine.setLanePolicy(data, "aurendale", "kolkelennan", { embargo: true });
  Engine.recalculateAll(data);

  const network = Engine.calculateTradeNetwork(data);
  const embargoedLane = network.lanes.find((lane) => lane.importerId === "aurendale" && lane.exporterId === "kolkelennan");

  assert.equal(embargoedLane.currentFlow, 0);
  assert.equal(embargoedLane.embargoed, true);
  assert.ok(data.trade.kolkelennan.tradeFlow < beforeKolkelennan.tradeFlow, "Kolkelennan should lose export flow after Aurendale embargoes it");
});

test("Trade v3 budget uses baseline deltas for export gains and losses", () => {
  const data = buildTradeV3Scenario();
  Engine.recalculateAll(data);
  const baselineBudget = data.national.aurendale.budgetCapacity;

  Engine.updateValue(data, "trade", "aurendale", "exportReliance", 106);
  Engine.recalculateAll(data);
  assert.ok(data.national.aurendale.budgetCapacity > baselineBudget, `${data.national.aurendale.budgetCapacity} should exceed ${baselineBudget}`);

  Engine.updateValue(data, "trade", "aurendale", "exportReliance", 94);
  Engine.recalculateAll(data);
  assert.ok(data.national.aurendale.budgetCapacity < baselineBudget, `${data.national.aurendale.budgetCapacity} should be below ${baselineBudget}`);
});

test("Trade v3 recalculation reuses one network snapshot for large worlds", () => {
  const data = buildLargeTradeV3Scenario();
  const started = performance.now();

  Engine.recalculateAll(data);

  const duration = performance.now() - started;
  assert.ok(duration < 1200, `large world recalc took ${Math.round(duration)}ms`);
});
