const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const fiscalPath = path.join(__dirname, "..", "site", "js", "engine", "fiscal.js");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(fiscalPath, "utf8"), context, { filename: fiscalPath });

const DEBT_RULES = {
  baseInterestRate: 2,
  repaymentShare: 0.25,
  maxDebtPaydownRate: 0.1
};

const fiscal = context.window.AGGS_ENGINE_MODULES.createFiscal({
  number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
  roundCurrency(value) {
    return Math.round(Number(value) || 0);
  },
  roundPercent(value) {
    return Number((Number(value) || 0).toFixed(2));
  },
  DEBT_RULES,
  HEALTH_INTEREST_RISK: { Recovery: 0 },
  SANCTIONS_INTEREST_RISK: { None: 0 },
  MOBILIZATION_INTEREST_RISK: { None: 0 },
  calculateBudgetForNation(data, id) {
    return data.national[id]?.budgetCapacity ?? null;
  }
});

function stateFor(national) {
  return {
    national: {
      test: {
        governmentalStability: 100,
        economicHealth: "Recovery",
        corruption: 0,
        ...national
      }
    },
    trade: { test: { sanctionsLevel: "None", tradeBalance: 0 } },
    military: { test: { mobilizationLevel: "None" } },
    industrial: { test: { mobilizationLevel: "None" } }
  };
}

{
  const result = fiscal.calculateFiscalForNation(stateFor({
    budgetCapacity: 100000,
    budgetExpenditure: 70000,
    debt: 10,
    treasuryReserve: 500
  }), "test");

  assert.equal(result.debtRepayment, 1000);
  assert.equal(result.treasuryDeposit, 28900);
  assert.equal(result.treasuryDrawdown, 0);
  assert.equal(result.nextTreasuryReserve, 29400);
}

{
  const result = fiscal.calculateFiscalForNation(stateFor({
    budgetCapacity: 100000,
    budgetExpenditure: 120000,
    debt: 0,
    treasuryReserve: 12000
  }), "test");

  assert.equal(result.treasuryDeposit, 0);
  assert.equal(result.treasuryDrawdown, 12000);
  assert.equal(result.deficitBorrowing, 8000);
  assert.equal(result.nextTreasuryReserve, 0);
  assert.equal(result.nextDebtPrincipal, 8000);
}

{
  const data = stateFor({
    budgetCapacity: 100000,
    budgetExpenditure: 110000,
    debt: 0,
    treasuryReserve: 12000
  });

  fiscal.recalculateBudgets(data, { updateDebt: true });

  assert.equal(data.national.test.treasuryReserve, 2000);
  assert.equal(data.national.test.debt, 0);
}
