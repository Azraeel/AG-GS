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
      title: "Test Ledger",
      currentYear: 2021,
      worldEconomicHealth: "Expansion",
      archivedNationIds: [],
      lastSimulationLog: [],
      changeHistory: []
    },
    nations: [
      { id: "aurendale", name: "Republic of Aurendale", color: "#6aa3f8" },
      { id: "ledostrov", name: "Duchy of Ledostrov", color: "#65d1c8" }
    ],
    national: {
      aurendale: {
        governmentalStability: 90,
        publicUnrest: 0,
        warSupport: 70,
        corruption: 20,
        developmentLevel: 16,
        budgetExpenditure: 41000,
        debt: 20,
        interestRateAdjustment: 0,
        economicHealth: "Expansion",
        immigrationRate: 1,
        taxRate: 0.02
      },
      ledostrov: {
        governmentalStability: 60,
        publicUnrest: 2,
        warSupport: 40,
        corruption: 35,
        developmentLevel: 5,
        budgetExpenditure: 6000,
        debt: 80,
        interestRateAdjustment: 0,
        economicHealth: "Slowdown",
        immigrationRate: 0,
        taxRate: 0.27
      }
    },
    trade: {
      aurendale: {
        importReliance: 115,
        exportReliance: 140,
        economicTradeDiversity: 180,
        autarkyIndex: 50,
        tradePolicy: "Free Trade",
        sanctionsLevel: "None",
        tariffRate: 2
      },
      ledostrov: {
        importReliance: 82,
        exportReliance: 4,
        economicTradeDiversity: 20,
        autarkyIndex: 5,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 2
      }
    },
    industrial: {
      aurendale: { mobilizationLevel: "None", civilianFactories: 760, militaryFactories: 96, shipyards: 90 },
      ledostrov: { mobilizationLevel: "None", civilianFactories: 40, militaryFactories: 8, shipyards: 2 }
    },
    population: {
      aurendale: { mandatoryChildPolicy: "No Policy", values: { 2021: 278481378 } },
      ledostrov: { mandatoryChildPolicy: "No Policy", values: { 2021: 65000000 } }
    },
    populationColumns: [{ key: "2021", label: "Population (2021)" }],
    military: {
      aurendale: { mobilizationLevel: "None", militarySupply: 140, equipmentComplexity: 10 },
      ledostrov: { mobilizationLevel: "None", militarySupply: 95, equipmentComplexity: 6 }
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
const beforeBalances = Object.fromEntries(
  Engine.visibleNationIds(source).map((id) => [id, source.national[id].budgetBalance])
);

assert.strictEqual(source.meta.budgetFormulaVersion, "legacy");

const lowDevelopmentLegacy = Engine.calculateBudgetForNation(source, "ledostrov", { version: "legacy" });
const lowDevelopmentReform = Engine.calculateBudgetForNation(source, "ledostrov", { version: "tax2026" });
assert.ok(
  lowDevelopmentReform > lowDevelopmentLegacy * 1.5,
  `expected 27% tax to materially increase low-dev BC, got legacy ${lowDevelopmentLegacy} vs reform ${lowDevelopmentReform}`
);

const preview = Engine.previewBudgetRebalance(source);
assert.strictEqual(JSON.stringify(source), beforeSerialized, "preview should not mutate live data");
assert.strictEqual(preview.formulaVersion, "tax2026");
assert.strictEqual(preview.rows.length, 2);
assert.ok(preview.totals.modeledBudgetCapacity > preview.totals.currentBudgetCapacity);
assert.ok(preview.rows.every((row) => Number.isFinite(row.newBudgetExpenditure)));

const applied = Engine.applyBudgetRebalance(source);
assert.strictEqual(source.meta.budgetFormulaVersion, "tax2026");
assert.strictEqual(applied.rows.length, 2);
for (const id of Engine.visibleNationIds(source)) {
  assert.ok(
    Math.abs(source.national[id].budgetBalance - beforeBalances[id]) <= 2,
    `${id} budget balance should remain near ${beforeBalances[id]}, got ${source.national[id].budgetBalance}`
  );
}
assert.ok(source.meta.lastBudgetRebalance?.appliedAt, "apply should store a rebalance audit marker");

console.log("engine budget rebalance tests passed");
