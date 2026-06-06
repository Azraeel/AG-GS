const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadRuntime() {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  [
    "site/js/engine/fiscal.js",
    "site/js/engine/tradePolicy.js",
    "site/js/engine/trade.js",
    "site/engine.js",
    "site/js/app/wikiRoute.js"
  ].forEach((relativePath) => {
    const file = path.join(ROOT, relativePath);
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  });
  return context;
}

function emptyState() {
  return {
    meta: { currentYear: 2027 },
    nations: [],
    national: {},
    trade: {},
    industrial: {},
    population: {},
    populationColumns: [],
    military: {},
    intelligence: {},
    naval: {},
    tradeNetwork: {}
  };
}

function routeFixture({ isAdmin = false } = {}) {
  const runtime = loadRuntime();
  const Engine = runtime.AGGS_ENGINE;
  const data = Engine.normalizeState(emptyState());
  const pushed = [];
  const route = runtime.AGGS_APP_MODULES.createWikiRoute({
    Engine,
    getData: () => data,
    isAdmin,
    pushHash: (hash) => pushed.push(hash)
  });
  return { Engine, data, route, pushed };
}

test("wiki route selects published pages by slug title or alias", () => {
  const { Engine, data, route } = routeFixture();
  Engine.saveWikiPage(data, {
    title: "River League",
    category: "Organization",
    status: "published",
    aliases: "The League"
  });
  const state = { tab: "overview", selectedWikiPageId: "" };

  assert.equal(route.applyHashToState(state, "#wiki/river-league"), true);
  assert.equal(state.tab, "wiki");
  assert.equal(state.selectedWikiPageId, "river-league");

  state.selectedWikiPageId = "";
  assert.equal(route.applyHashToState(state, "#wiki/The%20League"), true);
  assert.equal(state.selectedWikiPageId, "river-league");
});

test("public wiki route ignores draft pages while admin route can open them", () => {
  const publicFixture = routeFixture();
  publicFixture.Engine.saveWikiPage(publicFixture.data, {
    title: "Secret Crisis",
    category: "Event",
    status: "draft"
  });
  const publicState = { tab: "overview", selectedWikiPageId: "" };
  assert.equal(publicFixture.route.applyHashToState(publicState, "#wiki/secret-crisis"), true);
  assert.equal(publicState.tab, "wiki");
  assert.equal(publicState.selectedWikiPageId, "");

  const adminFixture = routeFixture({ isAdmin: true });
  adminFixture.Engine.saveWikiPage(adminFixture.data, {
    title: "Secret Crisis",
    category: "Event",
    status: "draft"
  });
  const adminState = { tab: "overview", selectedWikiPageId: "" };
  assert.equal(adminFixture.route.applyHashToState(adminState, "#wiki/secret-crisis"), true);
  assert.equal(adminState.selectedWikiPageId, "secret-crisis");
});

test("wiki route builds and pushes article hashes", () => {
  const { Engine, data, route, pushed } = routeFixture();
  const page = Engine.saveWikiPage(data, {
    title: "Whitewater Crisis",
    category: "Event",
    status: "published"
  });

  assert.equal(route.hashForPage(page), "#wiki/whitewater-crisis");
  route.pushPage(page);
  assert.deepEqual(pushed, ["#wiki/whitewater-crisis"]);
  route.pushHome();
  assert.deepEqual(pushed, ["#wiki/whitewater-crisis", "#wiki"]);
});
