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

function industryFixture() {
  const nationalBase = {
    governmentalStability: 84,
    corruption: 12,
    developmentLevel: 16,
    budgetCapacity: 80000,
    budgetExpenditure: 72000,
    debt: 8,
    taxRate: 0.18,
    treasuryReserve: 0
  };
  const industrialBase = {
    mobilizationLevel: "None",
    civilianFactories: 400,
    militaryFactories: 90,
    shipyards: 42
  };
  const tradeBase = {
    tradeBalance: 0,
    tradeFlow: 600000,
    tradeCapacity: 50000,
    economicImpactScore: 50,
    importReliance: 80,
    exportReliance: 90,
    tariffRate: 5
  };
  return {
    meta: { currentYear: 2023 },
    nations: [
      { id: "fresh_boom", name: "Fresh Boom" },
      { id: "streak_boom", name: "Streak Boom" },
      { id: "fresh_depression", name: "Fresh Depression" },
      { id: "streak_depression", name: "Streak Depression" }
    ],
    national: {
      fresh_boom: { ...nationalBase, economicHealth: "Prosperity" },
      streak_boom: { ...nationalBase, economicHealth: "Prosperity", industrialHealthStatus: "Prosperity", industrialHealthYears: 4 },
      fresh_depression: { ...nationalBase, economicHealth: "Depression" },
      streak_depression: { ...nationalBase, economicHealth: "Depression", industrialHealthStatus: "Depression", industrialHealthYears: 4 }
    },
    trade: {
      fresh_boom: { ...tradeBase },
      streak_boom: { ...tradeBase },
      fresh_depression: { ...tradeBase, tradeBalance: -22000 },
      streak_depression: { ...tradeBase, tradeBalance: -22000 }
    },
    industrial: {
      fresh_boom: { ...industrialBase },
      streak_boom: { ...industrialBase },
      fresh_depression: { ...industrialBase },
      streak_depression: { ...industrialBase }
    },
    military: {
      fresh_boom: { mobilizationLevel: "None" },
      streak_boom: { mobilizationLevel: "None" },
      fresh_depression: { mobilizationLevel: "None" },
      streak_depression: { mobilizationLevel: "None" }
    },
    population: {},
    populationColumns: [],
    tradeNetwork: {}
  };
}

test("yearly industrial growth scales with consecutive prosperity", () => {
  const Engine = loadEngine();
  const data = industryFixture();

  const fresh = Engine.advanceIndustry(data, "fresh_boom", 1);
  const streak = Engine.advanceIndustry(data, "streak_boom", 1);

  assert.ok(fresh.civilianFactories > 3, `expected fresh prosperity to beat old +3 fixed growth, got ${fresh.civilianFactories}`);
  assert.ok(streak.civilianFactories > fresh.civilianFactories, `expected prosperity streak growth above fresh growth, got ${streak.civilianFactories} vs ${fresh.civilianFactories}`);
  assert.equal(data.national.fresh_boom.industrialHealthYears, 1);
  assert.equal(data.national.streak_boom.industrialHealthYears, 5);
});

test("yearly industrial contraction scales with consecutive depression and trade drag", () => {
  const Engine = loadEngine();
  const data = industryFixture();

  const fresh = Engine.advanceIndustry(data, "fresh_depression", 1);
  const streak = Engine.advanceIndustry(data, "streak_depression", 1);

  assert.ok(fresh.civilianFactories < -3, `expected fresh depression to contract harder than old -3 fixed growth, got ${fresh.civilianFactories}`);
  assert.ok(streak.civilianFactories < fresh.civilianFactories, `expected depression streak contraction below fresh contraction, got ${streak.civilianFactories} vs ${fresh.civilianFactories}`);
  assert.equal(data.national.fresh_depression.industrialHealthYears, 1);
  assert.equal(data.national.streak_depression.industrialHealthYears, 5);
});
