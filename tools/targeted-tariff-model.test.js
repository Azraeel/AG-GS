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

function tariffFixture() {
  return {
    meta: {
      currentYear: 2023,
      tradeFormulaVersion: "trade2028",
      budgetFormulaVersion: "tax2026",
      tariffFormulaVersion: "tariff2026"
    },
    nations: [
      { id: "khalindar", name: "Khalindar" },
      { id: "xanaqu", name: "Xanaqu" },
      { id: "backup", name: "Backup Supplier" }
    ],
    national: {
      khalindar: {
        governmentalStability: 72,
        corruption: 25,
        developmentLevel: 12,
        budgetCapacity: 30000,
        budgetExpenditure: 24000,
        debt: 10,
        economicHealth: "Expansion",
        taxRate: 0.18,
        treasuryReserve: 0
      },
      xanaqu: {
        governmentalStability: 86,
        corruption: 10,
        developmentLevel: 18,
        budgetCapacity: 180000,
        budgetExpenditure: 170000,
        debt: 10,
        economicHealth: "Expansion",
        taxRate: 0.2,
        treasuryReserve: 0
      },
      backup: {
        governmentalStability: 70,
        corruption: 20,
        developmentLevel: 10,
        budgetCapacity: 25000,
        budgetExpenditure: 22000,
        debt: 10,
        economicHealth: "Recovery",
        taxRate: 0.18,
        treasuryReserve: 0
      }
    },
    trade: {
      khalindar: {
        tradeCapacity: 60000,
        tradeBalance: -50000,
        tradeFlow: 900000,
        importReliance: 185,
        exportReliance: 45,
        economicTradeDiversity: 55,
        autarkyIndex: 22,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 3
      },
      xanaqu: {
        tradeCapacity: 120000,
        tradeBalance: 150000,
        tradeFlow: 2500000,
        importReliance: 40,
        exportReliance: 220,
        economicTradeDiversity: 140,
        autarkyIndex: 15,
        tradePolicy: "Open Market",
        sanctionsLevel: "None",
        tariffRate: 3
      },
      backup: {
        tradeCapacity: 25000,
        tradeBalance: 2000,
        tradeFlow: 180000,
        importReliance: 70,
        exportReliance: 80,
        economicTradeDiversity: 40,
        autarkyIndex: 35,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 5
      }
    },
    industrial: {
      khalindar: { civilianFactories: 200, militaryFactories: 50, shipyards: 15, mobilizationLevel: "None" },
      xanaqu: { civilianFactories: 900, militaryFactories: 200, shipyards: 120, mobilizationLevel: "None" },
      backup: { civilianFactories: 90, militaryFactories: 20, shipyards: 5, mobilizationLevel: "None" }
    },
    military: {
      khalindar: { mobilizationLevel: "None" },
      xanaqu: { mobilizationLevel: "None" },
      backup: { mobilizationLevel: "None" }
    },
    population: {
      khalindar: { values: { 2023: 20000000 } },
      xanaqu: { values: { 2023: 100000000 } },
      backup: { values: { 2023: 10000000 } }
    },
    populationColumns: [{ key: "2023", label: "Population (2023)" }],
    tradeNetwork: { targetedTariffs: {} }
  };
}

function scenario(Engine, targetedRate = null) {
  const data = tariffFixture();
  if (targetedRate !== null) {
    data.tradeNetwork.targetedTariffs = {
      khalindar: { xanaqu: targetedRate }
    };
  }
  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data, { includeLanes: true, laneVisibility: "all" });
  const lane = network.lanes.find((row) => row.importerId === "khalindar" && row.exporterId === "xanaqu");
  assert.ok(lane, "expected Khalindar/Xanaqu lane to exist");
  return { data, network, lane };
}

test("targeted tariffs price dominant import lanes instead of making trade vanish", () => {
  const Engine = loadEngine();
  const neutral = scenario(Engine);
  const tariffed = scenario(Engine, 50);

  assert.ok(
    tariffed.lane.currentFlow >= neutral.lane.currentFlow * 0.6,
    `expected high tariff to retain most physical trade; got ${tariffed.lane.currentFlow} from neutral ${neutral.lane.currentFlow}`
  );
  assert.ok(
    tariffed.data.trade.khalindar.tradeFlow >= neutral.data.trade.khalindar.tradeFlow * 0.65,
    `expected national trade flow not to collapse; got ${tariffed.data.trade.khalindar.tradeFlow} from neutral ${neutral.data.trade.khalindar.tradeFlow}`
  );
  assert.ok(
    tariffed.lane.tariffRevenue >= neutral.lane.tariffRevenue * 6,
    `expected targeted tariff revenue to become meaningful; got ${tariffed.lane.tariffRevenue} from neutral ${neutral.lane.tariffRevenue}`
  );
  assert.ok(
    tariffed.lane.importCost >= tariffed.lane.tariffRevenue * 0.55,
    `expected import price shock to stay visible beside tariff revenue; got cost ${tariffed.lane.importCost} and revenue ${tariffed.lane.tariffRevenue}`
  );
});
