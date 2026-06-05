const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadSyncController({ fetchImpl, setTimeoutImpl }) {
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
    setTimeout: setTimeoutImpl
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

test("admin sync publishes live state after one-time fiscal migration", async () => {
  const published = [];
  let data = null;
  let pendingTimer = null;
  const createSyncController = loadSyncController({
    fetchImpl: async (url, options = {}) => {
      if (options.method === "PUT") {
        published.push(JSON.parse(options.body));
        return jsonResponse({ ok: true, revision: 754, updatedAt: "2026-06-04T23:00:00.000Z" });
      }
      if (String(url).includes("/snapshots")) return jsonResponse({ ok: true, snapshots: [] });
      return jsonResponse({
        ok: true,
        revision: 753,
        updatedAt: "2026-06-04T22:00:00.000Z",
        data: {
          meta: { tradeFormulaVersion: "trade2028" },
          national: {
            solara: { budgetCapacity: 95104, budgetExpenditure: 89143, budgetBalance: 5807 }
          },
          tradeNetwork: {}
        }
      });
    },
    setTimeoutImpl: (callback) => {
      pendingTimer = callback();
      return 1;
    }
  });

  const sharedSync = {
    enabled: true,
    endpoint: "/admin/api/state",
    metaEndpoint: "/admin/api/state/meta",
    revision: 0,
    status: "connecting",
    snapshots: []
  };
  const controller = createSyncController({
    getData: () => data,
    setData: (nextData) => { data = nextData; },
    baseData: {},
    Engine: {
      clone: (value) => JSON.parse(JSON.stringify(value)),
      normalizeState: (value) => value,
      recalculateAll: (nextData) => {
        nextData.meta.tradeV4FiscalBalanceVersion = "pre-v4-balance-20260604";
        nextData.national.solara.budgetExpenditure = 90074;
        nextData.national.solara.budgetBalance = 2236;
      },
      save: () => {}
    },
    TradeMap: { ensureGeography: () => {} },
    sharedSync,
    state: {},
    isAdmin: true,
    updateSourceNote: () => {},
    render: () => {},
    ensureSelectedNation: () => {},
    populateNationSelect: () => {},
    clearPendingChanges: () => {}
  });

  await controller.fetchSharedState();
  await pendingTimer;

  assert.equal(published.length, 1);
  assert.equal(published[0].revision, 753);
  assert.equal(published[0].data.meta.tradeV4FiscalBalanceVersion, "pre-v4-balance-20260604");
  assert.equal(published[0].data.national.solara.budgetBalance, 2236);
});
