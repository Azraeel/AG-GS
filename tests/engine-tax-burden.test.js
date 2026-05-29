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

function baseData(taxRate = 0.27, overrides = {}) {
  const national = {
    governmentalStability: 62,
    publicUnrest: 8,
    warSupport: 50,
    corruption: 45,
    developmentLevel: 10,
    budgetExpenditure: 18000,
    debt: 20,
    interestRateAdjustment: 0,
    economicHealth: "Slowdown",
    immigrationRate: 2,
    taxRate,
    ...overrides.national
  };
  return {
    meta: {
      title: "Tax Test Ledger",
      currentYear: 2021,
      worldEconomicHealth: "Expansion",
      archivedNationIds: [],
      lastSimulationLog: [],
      changeHistory: [],
      budgetFormulaVersion: "tax2026"
    },
    nations: [{ id: "khalindar", name: "Empire of Khalindar", color: "#a93316" }],
    national: { khalindar: national },
    trade: {
      khalindar: {
        importReliance: 110,
        exportReliance: 100,
        economicTradeDiversity: 150,
        autarkyIndex: 50,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 3
      }
    },
    industrial: {
      khalindar: { mobilizationLevel: "None", civilianFactories: 254, militaryFactories: 35, shipyards: 43 }
    },
    population: {
      khalindar: { mandatoryChildPolicy: "No Policy", values: { 2021: 966717622 } }
    },
    populationColumns: [{ key: "2021", label: "Population (2021)" }],
    military: {
      khalindar: { mobilizationLevel: "None", militarySupply: 97, equipmentComplexity: 9 }
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

const highTax = Engine.normalizeState(baseData());
Engine.recalculateAll(highTax);
const burden = Engine.calculateTaxBurdenForNation(highTax, "khalindar");
assert.strictEqual(burden.sustainableTaxRate, 16);
assert.ok(["Volatile", "Crisis"].includes(burden.tier), `expected serious burden tier, got ${burden.tier}`);
assert.ok(burden.suggestedUnrestChange > 0, "high tax should recommend unrest pressure");
assert.ok(burden.suggestedUnrestChange <= 2, "suggested unrest must respect 0-10 unrest ceiling");
assert.ok(burden.collectionMultiplier < 0.65, `expected strong collection drag, got ${burden.collectionMultiplier}`);
assert.ok(burden.industryGrowthMultiplier < 0.75, `expected investment drag, got ${burden.industryGrowthMultiplier}`);

const lowCorruption = Engine.normalizeState(baseData(0.27, { national: { corruption: 10 } }));
const highCorruption = Engine.normalizeState(baseData(0.27, { national: { corruption: 75 } }));
const lowCorruptionBurden = Engine.calculateTaxBurdenForNation(lowCorruption, "khalindar");
const highCorruptionBurden = Engine.calculateTaxBurdenForNation(highCorruption, "khalindar");
assert.ok(
  highCorruptionBurden.collectionMultiplier < lowCorruptionBurden.collectionMultiplier,
  "corruption should worsen high-tax collection losses"
);

const standardSuperpower = Engine.normalizeState(baseData(0.42, {
  national: {
    governmentalStability: 97,
    publicUnrest: 1,
    corruption: 13,
    developmentLevel: 20,
    economicHealth: "Prosperity",
    immigrationRate: 3,
    fiscalModel: "Standard"
  }
}));
const welfareSuperpower = Engine.normalizeState(baseData(0.42, {
  national: {
    governmentalStability: 97,
    publicUnrest: 1,
    corruption: 13,
    developmentLevel: 20,
    economicHealth: "Prosperity",
    immigrationRate: 3,
    fiscalModel: "Welfare State"
  }
}));
const standardSuperpowerBurden = Engine.calculateTaxBurdenForNation(standardSuperpower, "khalindar");
const welfareSuperpowerBurden = Engine.calculateTaxBurdenForNation(welfareSuperpower, "khalindar");
assert.strictEqual(welfareSuperpowerBurden.fiscalModel, "Welfare State");
assert.ok(
  welfareSuperpowerBurden.sustainableTaxRate > standardSuperpowerBurden.sustainableTaxRate,
  "welfare states should sustain a higher tax rate before pressure begins"
);
assert.ok(
  welfareSuperpowerBurden.collectionMultiplier > standardSuperpowerBurden.collectionMultiplier,
  "welfare states should collect high taxes more effectively than standard states"
);
assert.ok(
  welfareSuperpowerBurden.immigrationPenalty < standardSuperpowerBurden.immigrationPenalty,
  "welfare states should soften high-tax immigration penalties"
);
assert.ok(
  welfareSuperpowerBurden.industryGrowthMultiplier > standardSuperpowerBurden.industryGrowthMultiplier,
  "welfare states should protect long-term industry growth better than standard states"
);

const inferredSuperpower = Engine.normalizeState(baseData(0.42, {
  national: {
    governmentalStability: 97,
    publicUnrest: 1,
    corruption: 13,
    developmentLevel: 20,
    economicHealth: "Prosperity",
    immigrationRate: 3
  }
}));
inferredSuperpower.industrial.khalindar.civilianFactories = 1032;
const inferredBurden = Engine.calculateTaxBurdenForNation(inferredSuperpower, "khalindar");
assert.strictEqual(inferredBurden.fiscalModel, "Welfare State", "advanced high-capacity high-tax states should infer welfare-state handling");

const sustainable = Engine.normalizeState(baseData(0.12));
const highTaxPopulation = Engine.clone(highTax);
const sustainablePopulation = Engine.clone(sustainable);
const originalUnrest = highTaxPopulation.national.khalindar.publicUnrest;
const highGrowth = Engine.advancePopulation(highTaxPopulation, "khalindar", 2021, 2022);
const sustainableGrowth = Engine.advancePopulation(sustainablePopulation, "khalindar", 2021, 2022);
assert.ok(highGrowth.growthRate < sustainableGrowth.growthRate, "high tax should slow population growth and immigration");
assert.strictEqual(highTaxPopulation.national.khalindar.publicUnrest, originalUnrest, "tax burden warnings must not auto-edit GM unrest");

const highTaxIndustry = Engine.clone(highTax);
const sustainableIndustry = Engine.clone(sustainable);
Engine.advanceIndustry(highTaxIndustry, "khalindar", 1);
Engine.advanceIndustry(sustainableIndustry, "khalindar", 1);
assert.ok(
  highTaxIndustry.industrial.khalindar.civilianFactories <= sustainableIndustry.industrial.khalindar.civilianFactories,
  "high tax should slow civilian factory growth"
);

const legacyBudget = Engine.calculateBudgetForNation(highTax, "khalindar", { version: "legacy" });
const reformBudget = Engine.calculateBudgetForNation(highTax, "khalindar", { version: "tax2026" });
assert.ok(reformBudget > legacyBudget, "tax reform should still make tax matter");
assert.ok(reformBudget < legacyBudget * 2.6, `tax burden should prevent runaway BC jumps, got ${legacyBudget} -> ${reformBudget}`);

console.log("engine tax burden tests passed");
