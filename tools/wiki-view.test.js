const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadRuntime() {
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
    "site/engine.js",
    "site/js/app/wikiView.js"
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

function fakeEvent(selector, node) {
  return {
    target: {
      closest: (candidate) => candidate === selector ? node : null
    }
  };
}

function textFormat(value) {
  return String(value ?? "");
}

function createWikiView({ isAdmin = false } = {}) {
  const runtime = loadRuntime();
  const Engine = runtime.AGGS_ENGINE;
  const data = Engine.normalizeState(emptyState());
  const app = { innerHTML: "" };
  const state = {
    selectedWikiPageId: "",
    wikiQuery: "",
    wikiCategoryFilter: "all",
    wikiEraFilter: "all",
    wikiYearFilter: "",
    wikiStatusFilter: "all",
    wikiShowArchived: false,
    wikiDraft: null,
    notice: ""
  };
  const view = runtime.AGGS_APP_MODULES.createWikiView({
    getData: () => data,
    app,
    state,
    isAdmin,
    Engine,
    safeText: textFormat,
    escapeHtml: textFormat,
    safeStatus: (value) => `<span>${value}</span>`,
    fmtNumber: textFormat,
    fmtYear: textFormat,
    fmtDateTime: textFormat,
    saveWorkingState: (message) => {
      state.notice = message;
    },
    render: () => view.renderWiki()
  });
  return { Engine, data, app, state, view };
}

test("wiki view renders the Avant wiki shell for public readers", () => {
  const { app, view } = createWikiView();

  view.renderWiki();

  assert.match(app.innerHTML, /Avant World Wiki/);
  assert.match(app.innerHTML, /wiki-page-shell/);
  assert.match(app.innerHTML, /wiki-masthead/);
  assert.match(app.innerHTML, /wiki-document/);
  assert.doesNotMatch(app.innerHTML, /wiki-layout/);
  assert.match(app.innerHTML, /No Avant wiki pages/);
});

test("admin wiki view can create and save a page draft", () => {
  const { data, app, state, view } = createWikiView({ isAdmin: true });

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  assert.match(app.innerHTML, /wiki-editor/);

  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "title" }, value: "Timeline of Aurendale" }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "body" }, value: "A dated lore index." }));
  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-save" } }));

  assert.equal(state.selectedWikiPageId, "timeline-of-aurendale");
  assert.equal(data.wiki.pages["timeline-of-aurendale"].title, "Timeline of Aurendale");
  assert.match(state.notice, /Wiki page saved/);
});

test("wiki article shows outbound links backlinks and missing lore links", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    aliases: "The Crown"
  });
  Engine.saveWikiPage(data, {
    title: "River League",
    category: "Organization",
    status: "published",
    body: "The league backed [[The Crown|Aurendale]] during the [[Missing Treaty]]."
  });

  state.selectedWikiPageId = "river-league";
  view.renderWiki();
  assert.match(app.innerHTML, /Links/);
  assert.match(app.innerHTML, /Aurendale/);
  assert.match(app.innerHTML, /Missing/);
  assert.match(app.innerHTML, /Missing Treaty/);

  state.selectedWikiPageId = "aurendale";
  view.renderWiki();
  assert.match(app.innerHTML, /Linked From/);
  assert.match(app.innerHTML, /River League/);
});

test("wiki body keeps heading lines separate from following paragraph text", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Whitewater Crisis",
    category: "Event",
    status: "published",
    body: "Opening paragraph.\n\n## Background\nThe crisis began with disputed transit rights."
  });

  state.selectedWikiPageId = "whitewater-crisis";
  view.renderWiki();

  assert.match(app.innerHTML, /<h3>Background<\/h3>/);
  assert.match(app.innerHTML, /<p>The crisis began with disputed transit rights\.<\/p>/);
  assert.doesNotMatch(app.innerHTML, /Background\s*The crisis began/);
});

test("wiki article and editor support structured lore fact sheets", () => {
  const { Engine, data, app, state, view } = createWikiView({ isAdmin: true });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    facts: "Capital: Highcourt\nGovernment: Crowned republic"
  });

  state.selectedWikiPageId = "aurendale";
  view.renderWiki();
  assert.match(app.innerHTML, /Fact Sheet/);
  assert.match(app.innerHTML, /Capital/);
  assert.match(app.innerHTML, /Highcourt/);

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  view.handleChange(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "category" }, value: "Conflict" }));
  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-apply-fact-template" } }));

  assert.match(state.wikiDraft.facts, /Belligerents:/);
  assert.match(app.innerHTML, /data-wiki-field="facts"/);
});

test("admin wiki view renders content workbench without exposing it publicly", () => {
  const admin = createWikiView({ isAdmin: true });
  admin.Engine.saveWikiPage(admin.data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    aliases: "The Crown"
  });
  admin.Engine.saveWikiPage(admin.data, {
    title: "River League",
    category: "Organization",
    status: "published",
    body: "The league backed [[The Crown|Aurendale]] during the [[Missing Treaty]]."
  });
  admin.Engine.saveWikiPage(admin.data, {
    title: "Draft Crisis",
    category: "Event",
    status: "draft",
    body: "Draft notes mention [[Missing Treaty]] and [[Unmade Strait]]."
  });
  admin.Engine.saveWikiPage(admin.data, {
    title: "Lonely Region",
    category: "Region",
    status: "published"
  });

  admin.view.renderWiki();

  assert.match(admin.app.innerHTML, /Wiki Workbench/);
  assert.match(admin.app.innerHTML, /Drafts/);
  assert.match(admin.app.innerHTML, /Missing Links/);
  assert.match(admin.app.innerHTML, /Orphans/);
  assert.match(admin.app.innerHTML, /Draft Crisis/);
  assert.match(admin.app.innerHTML, /Missing Treaty/);
  assert.match(admin.app.innerHTML, /Lonely Region/);

  const publicView = createWikiView();
  publicView.Engine.saveWikiPage(publicView.data, {
    title: "Public Page",
    category: "Concept",
    status: "published",
    body: "Reader page."
  });
  publicView.view.renderWiki();

  assert.doesNotMatch(publicView.app.innerHTML, /Wiki Workbench/);
});
