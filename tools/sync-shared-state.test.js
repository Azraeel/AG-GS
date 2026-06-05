const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadSyncController(fetchImpl) {
  const context = {
    console,
    clearTimeout: () => {},
    document: {
      activeElement: null,
      addEventListener: () => {},
      hidden: false
    },
    fetch: fetchImpl,
    setInterval: () => 1,
    setTimeout: () => 1
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "site/js/app/sync.js"), "utf8"), context, { filename: "site/js/app/sync.js" });
  return context.window.AGGS_APP_MODULES.createSyncController;
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload)
  };
}

test("shared sync applies published live state without recalculating it on fetch", async () => {
  let data = null;
  let recalculateCalls = 0;
  const createSyncController = loadSyncController(async () => jsonResponse({
    ok: true,
    revision: 756,
    updatedAt: "2026-06-05T00:17:37.034Z",
    data: {
      meta: { tradeFormulaVersion: "trade2028" },
      national: {
        solara: { budgetCapacity: 95116, budgetExpenditure: 92572, budgetBalance: 2236 }
      },
      tradeNetwork: {}
    }
  }));

  const controller = createSyncController({
    getData: () => data,
    setData: (nextData) => { data = nextData; },
    baseData: {},
    Engine: {
      clone: (value) => JSON.parse(JSON.stringify(value)),
      normalizeState: (value) => value,
      recalculateAll: () => {
        recalculateCalls++;
      },
      save: () => {}
    },
    TradeMap: { ensureGeography: () => {} },
    sharedSync: {
      enabled: true,
      endpoint: "/api/state",
      metaEndpoint: "/api/state/meta",
      revision: 0,
      status: "connecting"
    },
    state: {},
    isAdmin: false,
    updateSourceNote: () => {},
    render: () => {},
    ensureSelectedNation: () => {},
    populateNationSelect: () => {},
    clearPendingChanges: () => {}
  });

  await controller.fetchSharedState();

  assert.equal(recalculateCalls, 0);
  assert.equal(data.national.solara.budgetCapacity, 95116);
  assert.equal(data.national.solara.budgetExpenditure, 92572);
  assert.equal(data.national.solara.budgetBalance, 2236);
});
