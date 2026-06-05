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
      { id: "streak_depression", name: "Streak Depression" },
      { id: "peacetime_boom", name: "Peacetime Boom" },
      { id: "low_support_mobilized", name: "Low Support Mobilized" },
      { id: "high_support_mobilized", name: "High Support Mobilized" }
    ],
    national: {
      fresh_boom: { ...nationalBase, economicHealth: "Prosperity" },
      streak_boom: { ...nationalBase, economicHealth: "Prosperity", industrialHealthStatus: "Prosperity", industrialHealthYears: 4 },
      fresh_depression: { ...nationalBase, economicHealth: "Depression" },
      streak_depression: { ...nationalBase, economicHealth: "Depression", industrialHealthStatus: "Depression", industrialHealthYears: 4 },
      peacetime_boom: { ...nationalBase, economicHealth: "Prosperity", warSupport: 98 },
      low_support_mobilized: { ...nationalBase, economicHealth: "Prosperity", warSupport: 35 },
      high_support_mobilized: { ...nationalBase, economicHealth: "Prosperity", warSupport: 98 }
    },
    trade: {
      fresh_boom: { ...tradeBase },
      streak_boom: { ...tradeBase },
      fresh_depression: { ...tradeBase, tradeBalance: -22000 },
      streak_depression: { ...tradeBase, tradeBalance: -22000 },
      peacetime_boom: { ...tradeBase },
      low_support_mobilized: { ...tradeBase },
      high_support_mobilized: { ...tradeBase }
    },
    industrial: {
      fresh_boom: { ...industrialBase },
      streak_boom: { ...industrialBase },
      fresh_depression: { ...industrialBase },
      streak_depression: { ...industrialBase },
      peacetime_boom: { ...industrialBase },
      low_support_mobilized: { ...industrialBase, mobilizationLevel: "Full" },
      high_support_mobilized: { ...industrialBase, mobilizationLevel: "Full" }
    },
    military: {
      fresh_boom: { mobilizationLevel: "None" },
      streak_boom: { mobilizationLevel: "None" },
      fresh_depression: { mobilizationLevel: "None" },
      streak_depression: { mobilizationLevel: "None" },
      peacetime_boom: { mobilizationLevel: "None" },
      low_support_mobilized: { mobilizationLevel: "Full" },
      high_support_mobilized: { mobilizationLevel: "Full" }
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

test("yearly military factory growth requires war support and mobilization", () => {
  const Engine = loadEngine();
  const data = industryFixture();

  const peacetime = Engine.advanceIndustry(data, "peacetime_boom", 1);
  const lowSupport = Engine.advanceIndustry(data, "low_support_mobilized", 1);
  const highSupport = Engine.advanceIndustry(data, "high_support_mobilized", 1);

  assert.ok(peacetime.civilianFactories > 0, `expected peacetime prosperity to still grow civilian industry, got ${peacetime.civilianFactories}`);
  assert.equal(peacetime.militaryFactories, 0, "expected high prosperity without mobilization to produce no military factories");
  assert.equal(lowSupport.militaryFactories, 0, "expected full mobilization without war support to produce no military factories");
  assert.ok(highSupport.militaryFactories > 0, `expected high war support plus full mobilization to produce military factories, got ${highSupport.militaryFactories}`);
});
