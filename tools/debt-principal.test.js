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

function debtFixture() {
  return {
    meta: { currentYear: 2023 },
    nations: [{ id: "volgastan", name: "Volgastan" }],
    national: {
      volgastan: {
        governmentalStability: 57,
        corruption: 54,
        developmentLevel: 9,
        budgetCapacity: 6000,
        budgetExpenditure: 5000,
        debt: 350,
        debtPrincipal: 21000,
        economicHealth: "Expansion",
        taxRate: 0.26,
        treasuryReserve: 0
      }
    },
    trade: {
      volgastan: {
        tradeBalance: 0,
        tradeFlow: 100000,
        importReliance: 100,
        exportReliance: 100,
        economicTradeDiversity: 50,
        autarkyIndex: 40,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 5
      }
    },
    industrial: {
      volgastan: { civilianFactories: 100, militaryFactories: 25, shipyards: 8, mobilizationLevel: "None" }
    },
    military: {
      volgastan: { mobilizationLevel: "None" }
    },
    population: {
      volgastan: { values: { 2023: 10000000 } }
    },
    populationColumns: [{ key: "2023", label: "Population (2023)" }],
    tradeNetwork: {}
  };
}

test("budget capacity changes preserve stored debt principal and recompute debt percent", () => {
  const Engine = loadEngine();
  const data = debtFixture();

  const fiscal = Engine.calculateFiscalForNation(data, "volgastan", { budgetCapacity: 17000 });

  assert.equal(fiscal.debtPrincipal, 21000);
  assert.equal(fiscal.debtPercent, 123.53);
  assert.ok(fiscal.debtService < 21000 * 0.35, `expected debt service from fixed principal, got ${fiscal.debtService}`);
});

test("editing debt percent resets the nominal debt principal at current budget capacity", () => {
  const Engine = loadEngine();
  const data = debtFixture();

  Engine.updateValue(data, "national", "volgastan", "debt", 200);

  const fiscal = Engine.calculateFiscalForNation(data, "volgastan");

  assert.equal(data.national.volgastan.debt, 200);
  assert.equal(data.national.volgastan.debtPrincipal, 12000);
  assert.equal(data.national.volgastan.debtServiceRate, fiscal.interestRate);
});

test("budget capacity growth does not instantly reprice existing debt service", () => {
  const Engine = loadEngine();
  const data = debtFixture();
  data.national.volgastan.debtService = 7350;

  const fiscal = Engine.calculateFiscalForNation(data, "volgastan", { budgetCapacity: 17000 });

  assert.equal(fiscal.debtPrincipal, 21000);
  assert.equal(fiscal.debtPercent, 123.53);
  assert.equal(fiscal.debtServiceRate, 35);
  assert.ok(fiscal.interestRate < fiscal.debtServiceRate, `expected repricing target below locked service rate, got ${fiscal.interestRate} vs ${fiscal.debtServiceRate}`);
  assert.equal(fiscal.debtService, 7350);
});

test("annual debt update slowly reprices service rate toward the current repricing target", () => {
  const Engine = loadEngine();
  const data = debtFixture();
  data.national.volgastan.budgetCapacity = 17000;
  data.national.volgastan.budgetExpenditure = 5000;
  data.national.volgastan.debtService = 7350;

  const update = Engine.calculateAnnualDebtUpdate(data, "volgastan");
  const expectedNextRate = Number((35 + (update.interestRate - 35) * 0.2).toFixed(2));

  assert.equal(update.debtServiceRate, 35);
  assert.ok(update.interestRate < update.debtServiceRate, `expected lower repricing target, got ${update.interestRate} vs ${update.debtServiceRate}`);
  assert.equal(update.nextDebtServiceRate, expectedNextRate);
  assert.ok(update.nextDebtServiceRate > update.interestRate, `expected repricing to be gradual, got ${update.nextDebtServiceRate} vs ${update.interestRate}`);
});

test("normalizing live debt records backfills service rate from existing debt service", () => {
  const Engine = loadEngine();
  const data = debtFixture();
  data.national.volgastan.debtService = 7350;
  delete data.national.volgastan.debtServiceRate;

  Engine.normalizeState(data);

  assert.equal(data.national.volgastan.debtServiceRate, 35);
});
