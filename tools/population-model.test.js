const assert = require("node:assert/strict");
const test = require("node:test");

global.window = global;
require("../site/js/engine/fiscal.js");
require("../site/js/engine/trade.js");
require("../site/engine.js");

const Engine = global.AGGS_ENGINE;

function scenario(overrides = {}) {
  const id = "testland";
  const currentYear = 2022;
  const data = Engine.normalizeState({
    meta: {
      currentYear,
      worldEconomicHealth: "Expansion",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026",
      tradeFormulaVersion: "trade2026"
    },
    nations: [{ id, name: "Testland" }],
    national: {
      [id]: {
        governmentalStability: 70,
        publicUnrest: 1,
        corruption: 8,
        developmentLevel: 10,
        budgetCapacity: 10000,
        budgetExpenditure: 8000,
        debt: 0,
        economicHealth: "Expansion",
        immigrationRate: 0,
        taxRate: 0.04,
        fiscalModel: "Standard",
        treasuryReserve: 0,
        ...overrides.national
      }
    },
    trade: {
      [id]: {
        importReliance: 70,
        exportReliance: 70,
        economicTradeDiversity: 70,
        autarkyIndex: 20,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 0,
        tradeBalance: 0,
        tradeFlow: 0
      }
    },
    industrial: {
      [id]: {
        civilianFactories: 100,
        militaryFactories: 10,
        shipyards: 5,
        mobilizationLevel: "None"
      }
    },
    military: {
      [id]: {
        mobilizationLevel: "None",
        equipmentComplexity: 5
      }
    },
    population: {
      [id]: {
        mandatoryChildPolicy: overrides.childPolicy || "No Policy",
        values: {
          [String(currentYear)]: overrides.population || 25000000
        }
      }
    }
  });
  return Engine.advancePopulation(data, id, currentYear, currentYear + 1);
}

test("large developed prosperous nations grow slowly without immigration", () => {
  const result = scenario({
    population: 245107773,
    national: {
      governmentalStability: 79,
      publicUnrest: 1,
      corruption: 8,
      developmentLevel: 14,
      economicHealth: "Prosperity",
      immigrationRate: 0
    }
  });

  assert.ok(result.growthRate > 0, `expected positive growth, got ${result.growthRate}`);
  assert.ok(result.growthRate < 0.55, `expected slower growth, got ${result.growthRate}`);
});

test("developing stable nations can still outgrow mature giants", () => {
  const mature = scenario({
    population: 245107773,
    national: {
      governmentalStability: 79,
      publicUnrest: 1,
      corruption: 8,
      developmentLevel: 14,
      economicHealth: "Prosperity"
    }
  });
  const developing = scenario({
    population: 12000000,
    national: {
      governmentalStability: 72,
      publicUnrest: 1,
      corruption: 16,
      developmentLevel: 6,
      economicHealth: "Expansion"
    }
  });

  assert.ok(developing.growthRate > 1, `expected meaningful developing growth, got ${developing.growthRate}`);
  assert.ok(developing.growthRate > mature.growthRate * 2, `${developing.growthRate} should clearly exceed ${mature.growthRate}`);
});

test("child policies nudge growth instead of dominating the whole model", () => {
  const noPolicy = scenario({
    population: 20000000,
    national: {
      governmentalStability: 82,
      publicUnrest: 0,
      developmentLevel: 10,
      economicHealth: "Expansion"
    }
  });
  const fiveChildPolicy = scenario({
    population: 20000000,
    childPolicy: "5 Child Policy",
    national: {
      governmentalStability: 82,
      publicUnrest: 0,
      developmentLevel: 10,
      economicHealth: "Expansion"
    }
  });

  const policyGain = fiveChildPolicy.growthRate - noPolicy.growthRate;
  assert.ok(policyGain > 0.2, `expected policy to matter, got ${policyGain}`);
  assert.ok(policyGain < 0.8, `expected moderated policy impact, got ${policyGain}`);
});

test("advanced giant economies with immigration do not add millions casually", () => {
  const solaraLike = scenario({
    population: 178595070,
    national: {
      governmentalStability: 94,
      publicUnrest: 0,
      corruption: 33,
      developmentLevel: 18,
      economicHealth: "Prosperity",
      immigrationRate: 2
    }
  });
  const aurendaleLike = scenario({
    population: 280606191,
    national: {
      governmentalStability: 91,
      publicUnrest: 0,
      corruption: 40,
      developmentLevel: 18,
      economicHealth: "Prosperity",
      immigrationRate: 1
    }
  });
  const xanaquLike = scenario({
    population: 465668997,
    national: {
      governmentalStability: 97,
      publicUnrest: 0,
      corruption: 13,
      developmentLevel: 20,
      economicHealth: "Prosperity",
      immigrationRate: 3
    }
  });

  assert.ok(solaraLike.to - solaraLike.from < 700000, `Solara-like growth was ${solaraLike.to - solaraLike.from}`);
  assert.ok(aurendaleLike.to - aurendaleLike.from < 700000, `Aurendale-like growth was ${aurendaleLike.to - aurendaleLike.from}`);
  assert.ok(xanaquLike.to - xanaquLike.from < 1000000, `Xanaqu-like growth was ${xanaquLike.to - xanaquLike.from}`);
});
