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
