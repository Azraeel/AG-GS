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
  for (const file of ["site/js/engine/fiscal.js", "site/engine.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window.AGGS_ENGINE;
}

function baseData(tariffRate = 2, overrides = {}) {
  return {
    meta: {
      title: "Tariff Test Ledger",
      currentYear: 2021,
      worldEconomicHealth: "Expansion",
      archivedNationIds: [],
      lastSimulationLog: [],
      changeHistory: [],
      budgetFormulaVersion: "tax2026"
    },
    nations: [{ id: "solara", name: "Solara", color: "#f4c430" }],
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
        taxRate: 0.02,
        ...overrides.national
      }
    },
    trade: {
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
        tariffRate,
        economicImpactScore: 318,
        ...overrides.trade
      }
    },
    industrial: {
      solara: { mobilizationLevel: "None", civilianFactories: 772, militaryFactories: 104, shipyards: 87 }
    },
    population: {
      solara: { mandatoryChildPolicy: "No Policy", values: { 2021: 176979249 } }
    },
    populationColumns: [{ key: "2021", label: "Population (2021)" }],
    military: {
      solara: { mobilizationLevel: "None", militarySupply: 144, equipmentComplexity: 10 }
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

const solara = Engine.normalizeState(baseData(2));
const tariff = Engine.calculateTariffRevenueForNation(solara, "solara");
assert.ok(tariff.tariffRevenue > 15000, `expected Solara to earn meaningful tariff revenue, got ${tariff.tariffRevenue}`);
assert.ok(tariff.tariffRevenue < 30000, `2% tariffs should not dominate Solara BC, got ${tariff.tariffRevenue}`);
assert.strictEqual(tariff.tier, "Stable");

const noTariff = Engine.normalizeState(baseData(0));
const withTariffBudget = Engine.calculateBudgetForNation(solara, "solara", { version: "tax2026" });
const noTariffBudget = Engine.calculateBudgetForNation(noTariff, "solara", { version: "tax2026" });
assert.ok(
  withTariffBudget - noTariffBudget >= 15000,
  `tariff revenue should directly increase BC, got ${noTariffBudget} -> ${withTariffBudget}`
);

const highTariff = Engine.normalizeState(baseData(50));
const highTariffRevenue = Engine.calculateTariffRevenueForNation(highTariff, "solara");
assert.ok(
  highTariffRevenue.tariffRevenue < tariff.tariffRevenue * 15,
  `extreme tariffs should have diminishing returns, got ${tariff.tariffRevenue} vs ${highTariffRevenue.tariffRevenue}`
);
assert.ok(highTariffRevenue.warnings.length > 0, "extreme tariffs should produce warnings");
assert.ok(["Friction", "Distortion", "Shock"].includes(highTariffRevenue.tier), `unexpected tariff tier ${highTariffRevenue.tier}`);

const lowImport = Engine.normalizeState(baseData(2, { trade: { importReliance: 25, exportReliance: 280 } }));
const lowImportRevenue = Engine.calculateTariffRevenueForNation(lowImport, "solara");
assert.ok(
  lowImportRevenue.tariffRevenue < tariff.tariffRevenue * 0.5,
  `low import reliance should sharply reduce tariff revenue, got ${lowImportRevenue.tariffRevenue} vs ${tariff.tariffRevenue}`
);

console.log("engine tariff revenue tests passed");
