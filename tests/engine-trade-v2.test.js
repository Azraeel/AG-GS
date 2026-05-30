const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadEngine() {
  const context = {
    window: {},
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    console
  };
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  vm.createContext(context);
  for (const file of ["site/js/engine/fiscal.js", "site/js/engine/trade.js", "site/engine.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.AGGS_ENGINE;
}

function fixture() {
  return {
    meta: {
      title: "Trade v2 Test Ledger",
      currentYear: 2021,
      worldEconomicHealth: "Expansion",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026",
      archivedNationIds: [],
      lastSimulationLog: [],
      changeHistory: []
    },
    nations: [
      { id: "aurendale", name: "Republic of Aurendale", color: "#6aa3f8" },
      { id: "xanaqu", name: "People's Federation of Xanaqu", color: "#b31b74" },
      { id: "solara", name: "Solara", color: "#f6ca32" },
      { id: "orinian", name: "Orinian Empire", color: "#b5aa56" }
    ],
    national: {
      aurendale: {
        governmentalStability: 91,
        publicUnrest: 0,
        warSupport: 72,
        corruption: 41,
        developmentLevel: 18,
        budgetCapacity: 78709,
        budgetExpenditure: 72562,
        budgetBalance: 6147,
        debt: 0,
        interestRateAdjustment: 0,
        economicHealth: "Prosperity",
        immigrationRate: 1,
        taxRate: 0.26,
        budgetAdjustment: 8411
      },
      xanaqu: {
        governmentalStability: 97,
        publicUnrest: 0,
        warSupport: 1,
        corruption: 13,
        developmentLevel: 20,
        budgetCapacity: 164144,
        budgetExpenditure: 163371,
        budgetBalance: 716,
        debt: 1.723,
        interestRateAdjustment: 0,
        economicHealth: "Prosperity",
        immigrationRate: 3,
        taxRate: 0.42,
        budgetAdjustment: 6602
      },
      solara: {
        governmentalStability: 94,
        publicUnrest: 0,
        warSupport: 90,
        corruption: 33,
        developmentLevel: 18,
        budgetCapacity: 43984,
        budgetExpenditure: 40897,
        budgetBalance: 3022,
        debt: 14.86,
        interestRateAdjustment: 0,
        economicHealth: "Prosperity",
        immigrationRate: 2,
        taxRate: 0.02,
        budgetAdjustment: 3184
      },
      orinian: {
        governmentalStability: 80,
        publicUnrest: 0,
        warSupport: 83,
        corruption: 35,
        developmentLevel: 15,
        budgetCapacity: 31610,
        budgetExpenditure: 22951,
        budgetBalance: 8659,
        debt: 0,
        interestRateAdjustment: 0,
        economicHealth: "Prosperity",
        immigrationRate: 1,
        taxRate: 0.07,
        budgetAdjustment: 2407
      }
    },
    trade: {
      aurendale: {
        tradeCapacity: 24374,
        tradeEfficiency: 100,
        autarkyIndex: 50,
        tradeBalance: 115440,
        tradeFlow: 2367272,
        tradePower: 99061,
        importReliance: 117,
        exportReliance: 142,
        economicTradeDiversity: 185,
        tradePolicy: "Free Trade",
        sanctionsLevel: "None",
        tariffRate: 2,
        economicImpactScore: 306,
        adjustments: { tradeFlow: 436632, tradePower: -1323, tradeBalance: 2898 }
      },
      xanaqu: {
        tradeCapacity: 14596,
        tradeEfficiency: 88,
        autarkyIndex: 5,
        tradeBalance: 5475,
        tradeFlow: 2322558,
        tradePower: 158081,
        importReliance: 276,
        exportReliance: 239,
        economicTradeDiversity: 76,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 2,
        economicImpactScore: 319,
        adjustments: { tradeFlow: 130979, tradePower: -138, tradeBalance: -4384 }
      },
      solara: {
        tradeCapacity: 21614,
        tradeEfficiency: 100,
        autarkyIndex: 57,
        tradeBalance: 61648,
        tradeFlow: 1821810,
        tradePower: 76071,
        importReliance: 179,
        exportReliance: 133,
        economicTradeDiversity: 135,
        tradePolicy: "Free Trade",
        sanctionsLevel: "None",
        tariffRate: 2,
        economicImpactScore: 318,
        adjustments: { tradeFlow: 273857, tradePower: -362, tradeBalance: 1573 }
      },
      orinian: {
        tradeCapacity: 10689,
        tradeEfficiency: 91,
        autarkyIndex: 21,
        tradeBalance: 52422,
        tradeFlow: 664859,
        tradePower: 68994,
        importReliance: 198,
        exportReliance: 176,
        economicTradeDiversity: 138,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 2,
        economicImpactScore: 394,
        adjustments: { tradeFlow: 143667, tradePower: -346, tradeBalance: 433 }
      }
    },
    industrial: {
      aurendale: { mobilizationLevel: "None", civilianFactories: 766, militaryFactories: 98, shipyards: 97 },
      xanaqu: { mobilizationLevel: "None", civilianFactories: 1032, militaryFactories: 43, shipyards: 64 },
      solara: { mobilizationLevel: "None", civilianFactories: 772, militaryFactories: 104, shipyards: 87 },
      orinian: { mobilizationLevel: "None", civilianFactories: 401, militaryFactories: 61, shipyards: 44 }
    },
    population: {
      aurendale: { mandatoryChildPolicy: "No Policy", values: { 2021: 278481378 } },
      xanaqu: { mandatoryChildPolicy: "No Policy", values: { 2021: 462064891 } },
      solara: { mandatoryChildPolicy: "No Policy", values: { 2021: 176979249 } },
      orinian: { mandatoryChildPolicy: "No Policy", values: { 2021: 231684474 } }
    },
    populationColumns: [{ key: "2021", label: "Population (2021)" }],
    military: {
      aurendale: { mobilizationLevel: "None", militarySupply: 147.2, equipmentComplexity: 10.4 },
      xanaqu: { mobilizationLevel: "None", militarySupply: 165.6, equipmentComplexity: 10.7 },
      solara: { mobilizationLevel: "None", militarySupply: 143.5, equipmentComplexity: 10.75 },
      orinian: { mobilizationLevel: "None", militarySupply: 196.5, equipmentComplexity: 9.6 }
    },
    intelligence: {},
    naval: {},
    equipmentDesigns: {},
    equipmentCosts: [],
    eraMultipliers: [],
    costAdditionModifiers: [],
    costReductionModifiers: [],
    eclipse: {},
    elections: {}
  };
}

const Engine = loadEngine();
const source = Engine.normalizeState(fixture());
Engine.recalculateAll(source);
const beforeSerialized = JSON.stringify(source);

assert.strictEqual(source.meta.tradeFormulaVersion, "legacy");

const aurendaleLegacy = Engine.calculateTradeForNation(source, "aurendale", { tradeFormulaVersion: "legacy" });
const aurendaleV2 = Engine.calculateTradeForNation(source, "aurendale", { tradeFormulaVersion: "trade2026" });
assert.ok(aurendaleV2.tradeFlow > aurendaleLegacy.tradeFlow * 3, "Trade v2 should materially widen top-tier trade flow");
assert.strictEqual(aurendaleV2.tradeFormulaVersion, "trade2026");
assert.strictEqual(aurendaleV2.tradeTier, "Superpower");

const changedAdjustment = Engine.clone(source);
changedAdjustment.trade.aurendale.adjustments.tradeFlow = 999999999;
const adjustedV2 = Engine.calculateTradeForNation(changedAdjustment, "aurendale", { tradeFormulaVersion: "trade2026" });
assert.strictEqual(adjustedV2.tradeFlow, aurendaleV2.tradeFlow, "Trade v2 must not include legacy adjustments or hidden calibration");

const preview = Engine.previewTradeRebalance(source);
assert.strictEqual(JSON.stringify(source), beforeSerialized, "trade preview should not mutate live data");
assert.strictEqual(preview.tradeFormulaVersion, "trade2026");
assert.ok(preview.totals.modeledTradeFlow > preview.totals.currentTradeFlow * 3);

const topThree = preview.rows
  .slice()
  .sort((left, right) => left.modeledRank - right.modeledRank)
  .slice(0, 3)
  .map((row) => row.id);
assert.deepStrictEqual([...topThree], ["aurendale", "xanaqu", "solara"]);

const applied = Engine.applyTradeRebalance(source);
assert.strictEqual(source.meta.tradeFormulaVersion, "trade2026");
assert.strictEqual(applied.rows.length, 4);
assert.ok(source.trade.aurendale.tradeFlow > source.trade.orinian.tradeFlow * 3);
assert.ok(source.national.aurendale.budgetCapacity > 100000, "Trade v2 should let superpower trade strength widen BC separation");
assert.ok(source.meta.lastTradeRebalance?.appliedAt, "apply should store a trade rebalance audit marker");

console.log("engine trade v2 tests passed");
