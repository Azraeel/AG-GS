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
      title: "Tariff Test Ledger",
      currentYear: 2021,
      worldEconomicHealth: "Expansion",
      budgetFormulaVersion: "tax2026",
      archivedNationIds: [],
      lastSimulationLog: [],
      changeHistory: []
    },
    nations: [
      { id: "solara", name: "Solara", color: "#f6ca32" },
      { id: "ledostrov", name: "Duchy of Ledostrov", color: "#65d1c8" }
    ],
    national: {
      solara: {
        governmentalStability: 94,
        publicUnrest: 0,
        warSupport: 90,
        corruption: 33,
        developmentLevel: 18,
        budgetExpenditure: 40897,
        debt: 15,
        interestRateAdjustment: 0,
        economicHealth: "Prosperity",
        immigrationRate: 2,
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
      solara: {
        importReliance: 179,
        exportReliance: 133,
        economicTradeDiversity: 135,
        autarkyIndex: 57,
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
        tariffRate: 30
      }
    },
    industrial: {
      solara: { mobilizationLevel: "None", civilianFactories: 772, militaryFactories: 104, shipyards: 87 },
      ledostrov: { mobilizationLevel: "None", civilianFactories: 40, militaryFactories: 8, shipyards: 2 }
    },
    population: {
      solara: { mandatoryChildPolicy: "No Policy", values: { 2021: 176979249 } },
      ledostrov: { mandatoryChildPolicy: "No Policy", values: { 2021: 65000000 } }
    },
    populationColumns: [{ key: "2021", label: "Population (2021)" }],
    military: {
      solara: { mobilizationLevel: "None", militarySupply: 144, equipmentComplexity: 10 },
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
Engine.recalculateAll(source, { budgetFormulaVersion: "tax2026", tariffFormulaVersion: "legacy" });
const beforeSerialized = JSON.stringify(source);
const beforeBalances = Object.fromEntries(
  Engine.visibleNationIds(source).map((id) => [id, source.national[id].budgetBalance])
);

assert.strictEqual(source.meta.tariffFormulaVersion, "legacy");

const solaraTariff = Engine.calculateTariffRevenueForNation(source, "solara");
assert.ok(solaraTariff.tariffRevenue > 10000, `expected Solara tariff revenue to matter, got ${solaraTariff.tariffRevenue}`);
assert.ok(solaraTariff.tariffRevenue < 50000, `expected Solara tariff revenue to stay calibrated, got ${solaraTariff.tariffRevenue}`);

const legacyTariffBudget = Engine.calculateBudgetForNation(source, "solara", { version: "tax2026", tariffFormulaVersion: "legacy" });
const modeledTariffBudget = Engine.calculateBudgetForNation(source, "solara", { version: "tax2026", tariffFormulaVersion: "tariff2026" });
assert.ok(modeledTariffBudget - legacyTariffBudget >= solaraTariff.tariffRevenue - 2);

const preview = Engine.previewTariffRebalance(source);
assert.strictEqual(JSON.stringify(source), beforeSerialized, "tariff preview should not mutate live data");
assert.strictEqual(preview.fromTariffFormulaVersion, "legacy");
assert.strictEqual(preview.tariffFormulaVersion, "tariff2026");
assert.strictEqual(preview.rows.length, 2);
assert.ok(preview.totals.modeledBudgetCapacity > preview.totals.currentBudgetCapacity);
assert.ok(preview.rows.every((row) => Number.isFinite(row.newBudgetExpenditure)));

const ledostrovPreview = preview.rows.find((row) => row.id === "ledostrov");
assert.ok(ledostrovPreview.tariffWarnings.some((warning) => warning.includes("High tariff")));

const applied = Engine.applyTariffRebalance(source);
assert.strictEqual(source.meta.tariffFormulaVersion, "tariff2026");
assert.strictEqual(applied.rows.length, 2);
for (const id of Engine.visibleNationIds(source)) {
  assert.ok(
    Math.abs(source.national[id].budgetBalance - beforeBalances[id]) <= 2,
    `${id} budget balance should remain near ${beforeBalances[id]}, got ${source.national[id].budgetBalance}`
  );
}
assert.ok(source.meta.lastTariffRebalance?.appliedAt, "apply should store a tariff rebalance audit marker");

console.log("engine tariff rebalance tests passed");
