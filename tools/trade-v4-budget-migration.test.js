const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadEngine() {
  const context = {
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
  context.window = context;
  vm.createContext(context);
  [
    "site/js/engine/fiscal.js",
    "site/js/engine/tradePolicy.js",
    "site/js/engine/trade.js",
    "site/engine.js"
  ].forEach((relativePath) => {
    const file = path.join(ROOT, relativePath);
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  });
  return context.AGGS_ENGINE;
}

function migrationFixture() {
  return {
    meta: {
      title: "AG-GS Test Ledger",
      currentYear: 2028,
      tradeFormulaVersion: "trade2027",
      budgetFormulaVersion: "legacy",
      tariffFormulaVersion: "legacy"
    },
    nations: [
      { id: "solara", name: "Solara" },
      { id: "aurendale", name: "Aurendale" },
      { id: "xanaqu", name: "Xanaqu" }
    ],
    national: {
      solara: {
        budgetCapacity: 87920,
        budgetExpenditure: 89143,
        budgetBalance: -1793,
        debt: 18,
        treasuryReserve: 0,
        developmentLevel: 19,
        governmentalStability: 88,
        corruption: 8,
        economicHealth: "Prosperity",
        taxRate: 0.24
      },
      aurendale: {
        budgetCapacity: 76000,
        budgetExpenditure: 74000,
        budgetBalance: 2000,
        debt: 10,
        treasuryReserve: 0,
        developmentLevel: 18,
        governmentalStability: 84,
        corruption: 10,
        economicHealth: "Expansion",
        taxRate: 0.22
      },
      xanaqu: {
        budgetCapacity: 83000,
        budgetExpenditure: 81000,
        budgetBalance: 2000,
        debt: 12,
        treasuryReserve: 0,
        developmentLevel: 18,
        governmentalStability: 82,
        corruption: 12,
        economicHealth: "Expansion",
        taxRate: 0.22
      }
    },
    trade: {
      solara: {
        tradeCapacity: 98000,
        tradeBalance: 452266,
        tradeFlow: 9000000,
        importReliance: 179,
        exportReliance: 133,
        economicTradeDiversity: 76,
        autarkyIndex: 18,
        tradePolicy: "Free Trade",
        sanctionsLevel: "None",
        tariffRate: 2
      },
      aurendale: {
        tradeCapacity: 91000,
        tradeBalance: 120000,
        tradeFlow: 8500000,
        importReliance: 92,
        exportReliance: 124,
        economicTradeDiversity: 72,
        autarkyIndex: 24,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 3
      },
      xanaqu: {
        tradeCapacity: 94000,
        tradeBalance: 175000,
        tradeFlow: 8700000,
        importReliance: 85,
        exportReliance: 128,
        economicTradeDiversity: 74,
        autarkyIndex: 22,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 3
      }
    },
    industrial: {
      solara: { civilianFactories: 640, militaryFactories: 180, shipyards: 96 },
      aurendale: { civilianFactories: 560, militaryFactories: 150, shipyards: 82 },
      xanaqu: { civilianFactories: 590, militaryFactories: 165, shipyards: 88 }
    },
    military: {
      solara: { mobilizationLevel: "None" },
      aurendale: { mobilizationLevel: "None" },
      xanaqu: { mobilizationLevel: "None" }
    },
    population: {
      solara: { values: { 2028: 62000000 } },
      aurendale: { values: { 2028: 54000000 } },
      xanaqu: { values: { 2028: 58000000 } }
    },
    populationColumns: [{ key: "2028", label: "Population (2028)" }],
    tradeNetwork: {}
  };
}

test("Trade V4 migration preserves displayed budget balance by adjusting expenditure once", () => {
  const Engine = loadEngine();
  const data = migrationFixture();
  const previousBalance = data.national.solara.budgetBalance;
  const previousExpenditure = data.national.solara.budgetExpenditure;

  Engine.recalculateAll(data);

  assert.equal(data.meta.tradeFormulaVersion, "trade2028");
  assert.equal(data.meta.tradeV4BudgetBalanceTargets, undefined);
  assert.ok(data.national.solara.budgetCapacity > 0);
  assert.notEqual(data.national.solara.budgetExpenditure, previousExpenditure);
  assert.ok(
    Math.abs(data.national.solara.budgetBalance - previousBalance) <= 1,
    `expected ${data.national.solara.budgetBalance} to stay near ${previousBalance}`
  );

  Engine.recalculateAll(data);

  assert.ok(
    Math.abs(data.national.solara.budgetBalance - previousBalance) <= 1,
    `expected a second recalc to keep ${data.national.solara.budgetBalance} near ${previousBalance}`
  );
});
