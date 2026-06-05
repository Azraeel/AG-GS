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

function valueAddedFixture() {
  return {
    meta: {
      title: "AG-GS Value Added Test Ledger",
      currentYear: 2023,
      tradeFormulaVersion: "trade2028",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026",
      worldEconomicHealth: "Expansion"
    },
    nations: [
      { id: "solara", name: "Solara" },
      { id: "aurendale", name: "Aurendale" },
      { id: "xanaqu", name: "Xanaqu" },
      { id: "low_value_importer", name: "Low Value Importer" }
    ],
    national: {
      solara: {
        governmentalStability: 89,
        corruption: 36,
        developmentLevel: 18,
        budgetCapacity: 42080,
        budgetExpenditure: 43328,
        budgetBalance: -1793,
        debt: 16.2,
        economicHealth: "Prosperity",
        taxRate: 0.02,
        budgetAdjustment: 3184,
        treasuryReserve: 0
      },
      aurendale: {
        governmentalStability: 84,
        corruption: 10,
        developmentLevel: 18,
        budgetCapacity: 85902,
        budgetExpenditure: 76479,
        budgetBalance: 9423,
        debt: 10,
        economicHealth: "Expansion",
        taxRate: 0.22,
        budgetAdjustment: 0,
        treasuryReserve: 0
      },
      xanaqu: {
        governmentalStability: 82,
        corruption: 12,
        developmentLevel: 18,
        budgetCapacity: 177783,
        budgetExpenditure: 169069,
        budgetBalance: 8558,
        debt: 12,
        economicHealth: "Expansion",
        taxRate: 0.22,
        budgetAdjustment: 0,
        treasuryReserve: 0
      },
      low_value_importer: {
        governmentalStability: 52,
        corruption: 58,
        developmentLevel: 8,
        budgetCapacity: 42080,
        budgetExpenditure: 43328,
        budgetBalance: -1793,
        debt: 16.2,
        economicHealth: "Recovery",
        taxRate: 0.02,
        budgetAdjustment: 3184,
        treasuryReserve: 0
      }
    },
    trade: {
      solara: {
        tradeCapacity: 89971,
        autarkyIndex: 57,
        tradeBalance: 452266,
        tradeFlow: 9864235,
        importReliance: 179,
        exportReliance: 133,
        economicTradeDiversity: 135,
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
        economicTradeDiversity: 120,
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
        economicTradeDiversity: 118,
        autarkyIndex: 22,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 3
      },
      low_value_importer: {
        tradeCapacity: 89971,
        autarkyIndex: 57,
        tradeBalance: 452266,
        tradeFlow: 9864235,
        importReliance: 179,
        exportReliance: 133,
        economicTradeDiversity: 30,
        tradePolicy: "Free Trade",
        sanctionsLevel: "None",
        tariffRate: 2
      }
    },
    industrial: {
      solara: { mobilizationLevel: "None", militaryFactories: 112, civilianFactories: 768, shipyards: 90 },
      aurendale: { mobilizationLevel: "None", civilianFactories: 560, militaryFactories: 150, shipyards: 82 },
      xanaqu: { mobilizationLevel: "None", civilianFactories: 590, militaryFactories: 165, shipyards: 88 },
      low_value_importer: { mobilizationLevel: "None", militaryFactories: 50, civilianFactories: 140, shipyards: 8 }
    },
    military: {
      solara: { mobilizationLevel: "None" },
      aurendale: { mobilizationLevel: "None" },
      xanaqu: { mobilizationLevel: "None" },
      low_value_importer: { mobilizationLevel: "None" }
    },
    population: {
      solara: { values: { 2023: 179148715 } },
      aurendale: { values: { 2023: 54000000 } },
      xanaqu: { values: { 2023: 58000000 } },
      low_value_importer: { values: { 2023: 179148715 } }
    },
    populationColumns: [{ key: "2023", label: "Population (2023)" }],
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

test("Trade V4 value-added strength lets advanced import-heavy economies profit without a baseline", () => {
  const Engine = loadEngine();
  const data = valueAddedFixture();

  Engine.recalculateAll(data);

  assert.ok(
    data.trade.solara.tradeBalance >= 325000,
    `expected value-added Solara trade balance to be strongly profitable, got ${data.trade.solara.tradeBalance}`
  );
  assert.ok(
    data.national.solara.budgetCapacity >= 85000 && data.national.solara.budgetCapacity <= 95000,
    `expected Solara BC near the old value, got ${data.national.solara.budgetCapacity}`
  );
  assert.ok(
    data.trade.low_value_importer.tradeBalance < 0,
    `expected weak import-heavy economy to stay in deficit, got ${data.trade.low_value_importer.tradeBalance}`
  );
  assert.ok(
    data.national.low_value_importer.budgetCapacity < data.national.solara.budgetCapacity / 3,
    `expected value-added economy to outperform weak importer; got ${data.national.low_value_importer.budgetCapacity} vs ${data.national.solara.budgetCapacity}`
  );
});

test("Trade V4 recalculation settles trade and budget feedback in one call", () => {
  const Engine = loadEngine();
  const data = valueAddedFixture();

  Engine.recalculateAll(data);
  const first = {
    solaraBudget: data.national.solara.budgetCapacity,
    solaraTradeBalance: data.trade.solara.tradeBalance,
    xanaquBudget: data.national.xanaqu.budgetCapacity,
    xanaquTradeBalance: data.trade.xanaqu.tradeBalance
  };

  Engine.recalculateAll(data);
  const second = {
    solaraBudget: data.national.solara.budgetCapacity,
    solaraTradeBalance: data.trade.solara.tradeBalance,
    xanaquBudget: data.national.xanaqu.budgetCapacity,
    xanaquTradeBalance: data.trade.xanaqu.tradeBalance
  };

  assert.deepEqual(second, first);
});

test("Trade V4 fiscal normalization clamps stale already-migrated budget balances once", () => {
  const Engine = loadEngine();
  const data = valueAddedFixture();

  Object.assign(data.national.xanaqu, {
    budgetCapacity: 447274,
    budgetExpenditure: 187932,
    budgetBalance: 259244
  });
  Object.assign(data.national.aurendale, {
    budgetCapacity: 204264,
    budgetExpenditure: 137984,
    budgetBalance: 66280
  });
  Object.assign(data.national.low_value_importer, {
    budgetCapacity: 29364,
    budgetExpenditure: 56095,
    budgetBalance: -26731
  });

  Engine.recalculateAll(data);

  assert.equal(data.meta.tradeV4FiscalBalanceVersion, "pre-v4-balance-20260604");
  assert.equal(data.meta.tradeV4BudgetBalanceTargets, undefined);
  assert.equal(data.meta.tradeV4BudgetBalanceTargetMode, undefined);
  assert.equal(data.meta.tradeV4BudgetBalanceExactTargets, undefined);

  for (const id of ["xanaqu", "aurendale", "low_value_importer"]) {
    const national = data.national[id];
    const maxBalance = Math.max(10000, Math.round(national.budgetCapacity * 0.08));
    assert.ok(
      Math.abs(national.budgetBalance) <= maxBalance + 1,
      `expected ${id} balance ${national.budgetBalance} to be within ${maxBalance} of BC ${national.budgetCapacity}`
    );
  }

  const first = Object.fromEntries(
    ["xanaqu", "aurendale", "low_value_importer"].map((id) => [
      id,
      {
        budgetCapacity: data.national[id].budgetCapacity,
        budgetExpenditure: data.national[id].budgetExpenditure,
        budgetBalance: data.national[id].budgetBalance
      }
    ])
  );

  Engine.recalculateAll(data);

  const second = Object.fromEntries(
    ["xanaqu", "aurendale", "low_value_importer"].map((id) => [
      id,
      {
        budgetCapacity: data.national[id].budgetCapacity,
        budgetExpenditure: data.national[id].budgetExpenditure,
        budgetBalance: data.national[id].budgetBalance
      }
    ])
  );

  assert.deepEqual(second, first);
});

test("Trade V4 fiscal normalization carries pre-V4 budget balances for known live nations", () => {
  const Engine = loadEngine();
  const data = valueAddedFixture();

  function renameNation(fromId, toId, name) {
    const nation = data.nations.find((row) => row.id === fromId);
    if (nation) {
      nation.id = toId;
      nation.name = name;
    }
    for (const bucket of ["national", "trade", "industrial", "military", "population"]) {
      data[bucket][toId] = data[bucket][fromId];
      delete data[bucket][fromId];
    }
  }

  renameNation("xanaqu", "people_s_federation_of_xanaqu", "People's Federation of Xanaqu");
  renameNation("aurendale", "republic_of_aurendale", "Republic of Aurendale");

  Object.assign(data.national.solara, {
    budgetCapacity: 95104,
    budgetExpenditure: 89143,
    budgetBalance: 5807
  });
  Object.assign(data.national.people_s_federation_of_xanaqu, {
    budgetCapacity: 447274,
    budgetExpenditure: 187932,
    budgetBalance: 259244
  });
  Object.assign(data.national.republic_of_aurendale, {
    budgetCapacity: 204264,
    budgetExpenditure: 137984,
    budgetBalance: 66280
  });

  Engine.recalculateAll(data);

  const expectedBalances = {
    solara: 2236,
    people_s_federation_of_xanaqu: 7059,
    republic_of_aurendale: 10719
  };
  for (const [id, expectedBalance] of Object.entries(expectedBalances)) {
    assert.ok(
      Math.abs(data.national[id].budgetBalance - expectedBalance) <= 1,
      `expected ${id} balance ${data.national[id].budgetBalance} to carry pre-V4 target ${expectedBalance}`
    );
  }
  assert.equal(data.meta.tradeV4FiscalBalanceVersion, "pre-v4-balance-20260604");

  Engine.recalculateAll(data);

  for (const [id, expectedBalance] of Object.entries(expectedBalances)) {
    assert.ok(
      Math.abs(data.national[id].budgetBalance - expectedBalance) <= 1,
      `expected ${id} second recalc balance ${data.national[id].budgetBalance} to stay near ${expectedBalance}`
    );
  }
});
