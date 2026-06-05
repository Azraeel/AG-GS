const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

test("Trade V4 source does not keep one-time fiscal handoff scaffolding", () => {
  const files = [
    "site/engine.js",
    "site/js/engine/fiscal.js",
    "site/js/app/sync.js"
  ];
  const forbidden = [
    "PRE_TRADE_V4_BUDGET_BALANCE_TARGETS",
    "tradeV4FiscalBalanceVersion",
    "tradeV4BudgetBalanceTargets",
    "tradeV4BudgetBalanceTargetMode",
    "tradeV4BudgetBalanceExactTargets",
    "budgetBalanceMigrationTarget",
    "applyBudgetBalanceTarget",
    "normalizeBudgetBalanceTarget",
    "Published Trade V4 budget balance handoff"
  ];

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const marker of forbidden) {
      assert.equal(source.includes(marker), false, `${relativePath} still contains ${marker}`);
    }
  }
});
