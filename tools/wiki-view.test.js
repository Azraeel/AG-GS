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

function createWikiView({ isAdmin = false, wikiPageUrl = null, setWikiRoute = null, setWikiEditorRoute = null, setWikiHomeRoute = null, setLedgerRoute = null, WikiImport = null } = {}) {
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
    wikiPageUrl,
    setWikiRoute,
    setWikiEditorRoute,
    setWikiHomeRoute,
    setLedgerRoute,
    WikiImport,
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
  assert.match(app.innerHTML, /wiki-focus-bar/);
  assert.match(app.innerHTML, /data-action="wiki-back-ledger"/);
  assert.match(app.innerHTML, /wiki-masthead/);
  assert.match(app.innerHTML, /wiki-document/);
  assert.doesNotMatch(app.innerHTML, /wiki-layout/);
  assert.match(app.innerHTML, /No Avant wiki pages/);
});

test("wiki home stays a focused home instead of auto-opening the first page", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Solara-Khalindar War",
    category: "Conflict",
    status: "published",
    body: "## Overview\nWar article."
  });

  view.renderWiki();

  assert.equal(state.selectedWikiPageId, "");
  assert.match(app.innerHTML, /wiki-page-shell/);
  assert.match(app.innerHTML, /wiki-masthead/);
  assert.match(app.innerHTML, /Solara-Khalindar War/);
  assert.doesNotMatch(app.innerHTML, /wiki-article-shell/);
  assert.doesNotMatch(app.innerHTML, /<h3[^>]*>Overview<\/h3>/);
});

test("wiki article route renders a dedicated full-page article shell", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Solara-Khalindar War",
    category: "Conflict",
    status: "published",
    summary: "A major war.",
    facts: "Conflict: Solaran-Khalindarian War\nSource: https://avantpedia.miraheze.org/wiki/Solara-Khalindar_War",
    body: "## Pre-War Tensions\nOpening.\n\n## Major Battles\nThe city fight."
  });

  state.selectedWikiPageId = "solara-khalindar-war";
  view.renderWiki();

  assert.match(app.innerHTML, /wiki-article-shell/);
  assert.match(app.innerHTML, /wiki-focus-bar/);
  assert.match(app.innerHTML, /data-action="wiki-back-ledger"/);
  assert.match(app.innerHTML, /data-action="wiki-home"/);
  assert.match(app.innerHTML, /Solara-Khalindar War/);
  assert.match(app.innerHTML, /wiki-article-layout/);
  assert.match(app.innerHTML, /wiki-article-main/);
  assert.match(app.innerHTML, /wiki-article-rail/);
  assert.match(app.innerHTML, /wiki-contents/);
  assert.match(app.innerHTML, /wiki-fact-sheet/);
  assert.doesNotMatch(app.innerHTML, /avantpedia\.miraheze/);
  assert.ok(app.innerHTML.indexOf("wiki-article-main") < app.innerHTML.indexOf("wiki-article-rail"));
  assert.ok(app.innerHTML.indexOf("wiki-body") < app.innerHTML.indexOf("wiki-contents"));
  assert.doesNotMatch(app.innerHTML, /wiki-masthead/);
  assert.doesNotMatch(app.innerHTML, /wiki-page-frame/);
  assert.doesNotMatch(app.innerHTML, /Wiki Workbench/);
});

test("wiki back to ledger action delegates to the app shell", () => {
  const routed = [];
  const { view } = createWikiView({
    setLedgerRoute: () => routed.push("ledger")
  });

  assert.equal(
    view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-back-ledger" } })),
    true
  );

  assert.deepEqual(routed, ["ledger"]);
});

test("admin wiki view can create and save a page draft", () => {
  const routed = [];
  const { data, app, state, view } = createWikiView({
    isAdmin: true,
    setWikiRoute: (page) => routed.push(page.slug)
  });

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  assert.match(app.innerHTML, /wiki-editor/);

  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "title" }, value: "Timeline of Aurendale" }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "body" }, value: "A dated lore index." }));
  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-save" } }));

  assert.equal(state.selectedWikiPageId, "timeline-of-aurendale");
  assert.equal(data.wiki.pages["timeline-of-aurendale"].title, "Timeline of Aurendale");
  assert.deepEqual(routed, ["timeline-of-aurendale"]);
  assert.match(state.notice, /Wiki page saved/);
});

test("admin wiki new page opens a dedicated editor route", () => {
  const routedEditors = [];
  const { app, view } = createWikiView({
    isAdmin: true,
    setWikiEditorRoute: (page, mode) => routedEditors.push({ page: page?.id || "", mode })
  });

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));

  assert.deepEqual(routedEditors, [{ page: "", mode: "new" }]);
  assert.match(app.innerHTML, /wiki-editor-shell/);
  assert.match(app.innerHTML, /wiki-editor-page/);
  assert.match(app.innerHTML, /wiki-editor/);
  assert.match(app.innerHTML, /data-action="wiki-back"/);
  assert.doesNotMatch(app.innerHTML, /No Avant wiki pages have been created yet/);
  assert.doesNotMatch(app.innerHTML, /wiki-masthead/);
  assert.doesNotMatch(app.innerHTML, /wiki-page-frame/);
  assert.doesNotMatch(app.innerHTML, /Wiki Workbench/);
});

test("admin wiki editor back returns to the selected article route", () => {
  const routedPages = [];
  const { Engine, data, app, state, view } = createWikiView({
    isAdmin: true,
    setWikiRoute: (page) => routedPages.push(page.slug)
  });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published"
  });

  state.selectedWikiPageId = "aurendale";
  view.renderWiki();
  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-edit" } }));
  assert.match(app.innerHTML, /wiki-editor-shell/);

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-back" } }));

  assert.equal(state.wikiDraft, null);
  assert.equal(state.wikiEditRoute, null);
  assert.deepEqual(routedPages, ["aurendale"]);
  assert.match(app.innerHTML, /wiki-article-shell/);
  assert.doesNotMatch(app.innerHTML, /wiki-masthead/);
  assert.match(app.innerHTML, /Aurendale/);
});

test("admin wiki editor route renders an existing page draft directly", () => {
  const { Engine, data, app, state, view } = createWikiView({ isAdmin: true });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "draft",
    body: "Draft lore."
  });

  state.wikiEditRoute = { mode: "edit", token: "aurendale" };
  view.renderWiki();

  assert.equal(state.selectedWikiPageId, "aurendale");
  assert.equal(state.wikiDraft.title, "Aurendale");
  assert.match(app.innerHTML, /wiki-editor-shell/);
  assert.match(app.innerHTML, /Editing Aurendale/);
  assert.match(app.innerHTML, /wiki-source-editor-direct/);
  assert.doesNotMatch(app.innerHTML, /wiki-review-article/);
  assert.doesNotMatch(app.innerHTML, /wiki-import-row/);
  assert.doesNotMatch(app.innerHTML, /<details class="wiki-source-editor"/);
  assert.ok(app.innerHTML.indexOf('data-wiki-field="body"') < app.innerHTML.indexOf('data-wiki-field="facts"'));
  assert.doesNotMatch(app.innerHTML, /wiki-masthead/);
});

test("admin wiki editor route does not edit the first page when the token is missing", () => {
  const { Engine, data, app, state, view } = createWikiView({ isAdmin: true });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published"
  });

  state.wikiEditRoute = { mode: "edit", token: "missing-treaty" };
  view.renderWiki();

  assert.equal(state.selectedWikiPageId, "");
  assert.equal(state.wikiDraft.title, "missing-treaty");
  assert.match(app.innerHTML, /wiki-editor-shell/);
  assert.doesNotMatch(app.innerHTML, /value="Aurendale"/);
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

  assert.match(app.innerHTML, /<h3[^>]*>Background<\/h3>/);
  assert.match(app.innerHTML, /<p>The crisis began with disputed transit rights\.<\/p>/);
  assert.doesNotMatch(app.innerHTML, /Background\s*The crisis began/);
});

test("wiki body renders nested headings from imported articles", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Solara-Khalindar War",
    category: "Conflict",
    status: "published",
    body: "## Pre-War Tensions\nOpening.\n\n### Historical Grievances\nOld claims.\n\n#### Key Battles within Congrave\nThe city fight."
  });

  state.selectedWikiPageId = "solara-khalindar-war";
  view.renderWiki();

  assert.match(app.innerHTML, /<h3[^>]*>Pre-War Tensions<\/h3>/);
  assert.match(app.innerHTML, /<h4[^>]*>Historical Grievances<\/h4>/);
  assert.match(app.innerHTML, /<h5[^>]*>Key Battles within Congrave<\/h5>/);
});

test("wiki article renders contents and rich inline formatting", () => {
  const { Engine, data, app, state, view } = createWikiView();
  Engine.saveWikiPage(data, {
    title: "Khalindar",
    category: "Nation",
    status: "published",
    body: "## Overview\nA major power."
  });
  Engine.saveWikiPage(data, {
    title: "Solara-Khalindar War",
    category: "Conflict",
    status: "published",
    summary: "A war involving [[Khalindar]] near [[Congrave]].",
    body: "## Pre-War Tensions\n**Solara** and *[[Khalindar]]* mobilized.\n\n### Historical Grievances\n* Naval raids expanded the conflict.\n\n## Major Battles\nThe war reached [[Congrave]]."
  });

  state.selectedWikiPageId = "solara-khalindar-war";
  view.renderWiki();

  assert.match(app.innerHTML, /wiki-contents/);
  assert.match(app.innerHTML, /Pre-War Tensions/);
  assert.match(app.innerHTML, /Major Battles/);
  assert.match(app.innerHTML, /<p class="wiki-article-summary">A war involving <button[^>]+>Khalindar<\/button> near <span class="wiki-missing-link">Congrave<\/span>\.<\/p>/);
  assert.match(app.innerHTML, /<strong>Solara<\/strong>/);
  assert.match(app.innerHTML, /<em><button[^>]+>Khalindar<\/button><\/em>/);
  assert.match(app.innerHTML, /<li>Naval raids expanded the conflict\.<\/li>/);
  assert.match(app.innerHTML, /id="wiki-heading-pre-war-tensions-0"/);
});

test("wiki article and editor support structured lore fact sheets", () => {
  const { Engine, data, app, state, view } = createWikiView({ isAdmin: true });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    facts: "Capital: Highcourt\nGovernment: Crowned republic\nAllies: Solara; Empire of Khalindar\nSource: https://avantpedia.miraheze.org/wiki/Aurendale"
  });

  state.selectedWikiPageId = "aurendale";
  view.renderWiki();
  assert.match(app.innerHTML, /Fact Sheet/);
  assert.match(app.innerHTML, /Capital/);
  assert.match(app.innerHTML, /Highcourt/);
  assert.match(app.innerHTML, /<ul class="wiki-fact-value-list"><li>Solara<\/li><li>Empire of Khalindar<\/li><\/ul>/);
  assert.doesNotMatch(app.innerHTML, /Solara; Empire of Khalindar/);
  assert.doesNotMatch(app.innerHTML, /avantpedia\.miraheze/);

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  view.handleChange(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "category" }, value: "Conflict" }));
  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-apply-fact-template" } }));

  assert.match(state.wikiDraft.facts, /Belligerents:/);
  assert.match(app.innerHTML, /data-wiki-field="facts"/);
});

test("admin wiki editor reviews the draft as an article before source fields", () => {
  const { app, view } = createWikiView({ isAdmin: true });

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "title" }, value: "Siege of Calblanca" }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "category" }, value: "Conflict" }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "summary" }, value: "A siege involving [[Aurendale]] and [[Unwritten Front]]." }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "facts" }, value: "Belligerents: Calblanca; Bingtau\nOutcome: Armistice" }));
  view.handleInput(fakeEvent("[data-wiki-field]", { dataset: { wikiField: "tags" }, value: "war, calblanca" }));
  view.handleInput(fakeEvent("[data-wiki-field]", {
    dataset: { wikiField: "body" },
    value: "Opening summary.\n\n## Background\nThe siege reshaped the frontier."
  }));

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-preview-draft" } }));

  assert.match(app.innerHTML, /wiki-review-article/);
  assert.match(app.innerHTML, /Article Review/);
  assert.match(app.innerHTML, /Siege of Calblanca/);
  assert.match(app.innerHTML, /<p class="wiki-review-summary">A siege involving <span class="wiki-missing-link">Aurendale<\/span> and <span class="wiki-missing-link">Unwritten Front<\/span>\.<\/p>/);
  assert.match(app.innerHTML, /<h3[^>]*>Background<\/h3>/);
  assert.match(app.innerHTML, /The siege reshaped the frontier\./);
  assert.match(app.innerHTML, /Belligerents/);
  assert.match(app.innerHTML, /Armistice/);
  assert.match(app.innerHTML, /war/);
  assert.match(app.innerHTML, /class="wiki-source-editor"/);
  assert.ok(app.innerHTML.indexOf("wiki-review-article") < app.innerHTML.indexOf("wiki-source-editor"));
});

test("admin wiki editor imports a Miraheze article into a draft", async () => {
  const importedUrl = "https://avantpedia.miraheze.org/wiki/Solara-Khalindar_War";
  const { app, state, view } = createWikiView({
    isAdmin: true,
    WikiImport: {
      fetchMirahezeWikitext: async (input) => {
        assert.equal(input, importedUrl);
        return {
          title: "Solara-Khalindar War",
          sourceUrl: importedUrl,
          wikitext: "source"
        };
      },
      convertMirahezeWikitext: (source) => ({
        id: "",
        title: source.title,
        category: "Conflict",
        status: "draft",
        era: "Modern Era",
        yearStart: "1990",
        yearEnd: "1994",
        summary: "Solara-Khalindar War was a 1990-1994 conflict.",
        body: "## Pre-War Tensions\nImported article body.",
        facts: `Source: ${source.sourceUrl}`,
        tags: "Solara, Khalindar",
        aliases: "Solaran-Khalindarian War",
        relatedPageIds: ""
      })
    }
  });

  view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-new" } }));
  assert.match(app.innerHTML, /data-wiki-import-source/);

  view.handleInput(fakeEvent("[data-wiki-import-source]", { value: importedUrl }));
  assert.equal(state.wikiImportSource, importedUrl);

  assert.equal(
    view.handleClick(fakeEvent("[data-action]", { dataset: { action: "wiki-import-miraheze" } })),
    true
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(state.wikiDraft.title, "Solara-Khalindar War");
  assert.equal(state.wikiDraft.category, "Conflict");
  assert.equal(state.wikiDraft.yearStart, "1990");
  assert.match(state.wikiDraft.body, /Pre-War Tensions/);
  assert.match(state.wikiDraft.facts, /avantpedia\.miraheze/);
  assert.match(app.innerHTML, /Imported Solara-Khalindar War/);
  assert.match(app.innerHTML, /wiki-review-article/);
  assert.match(app.innerHTML, /wiki-source-editor/);
  assert.ok(app.innerHTML.indexOf("wiki-review-article") < app.innerHTML.indexOf("wiki-source-editor"));
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

test("admin wiki missing link action starts a sourced draft", () => {
  const { Engine, data, app, state, view } = createWikiView({ isAdmin: true });
  Engine.saveWikiPage(data, {
    title: "River League",
    category: "Organization",
    status: "published",
    body: "The league backed the [[Missing Treaty]]."
  });

  view.renderWiki();

  assert.match(app.innerHTML, /data-action="wiki-start-missing"/);
  assert.match(app.innerHTML, /data-wiki-missing-title="Missing Treaty"/);

  view.handleClick(fakeEvent("[data-action]", {
    dataset: {
      action: "wiki-start-missing",
      wikiMissingTitle: "Missing Treaty"
    }
  }));

  assert.equal(state.wikiDraft.title, "Missing Treaty");
  assert.equal(state.wikiDraft.category, "Concept");
  assert.equal(state.wikiDraft.status, "draft");
  assert.equal(state.wikiDraft.relatedPageIds, "river-league");
  assert.match(state.wikiDraft.body, /\[\[River League\]\]/);
  assert.match(app.innerHTML, /value="Missing Treaty"/);
});

test("wiki articles expose permalinks and sync route on page navigation", () => {
  const routed = [];
  const { Engine, data, app, state, view } = createWikiView({
    wikiPageUrl: (page) => `#wiki/${page.slug}`,
    setWikiRoute: (page) => routed.push(page.slug)
  });
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published"
  });
  Engine.saveWikiPage(data, {
    title: "River League",
    category: "Organization",
    status: "published"
  });

  state.selectedWikiPageId = "aurendale";
  view.renderWiki();

  assert.match(app.innerHTML, /href="#wiki\/aurendale"/);
  assert.match(app.innerHTML, />Page Link<\/a>/);

  view.handleClick(fakeEvent("[data-wiki-page]", { dataset: { wikiPage: "river-league" } }));

  assert.equal(state.selectedWikiPageId, "river-league");
  assert.deepEqual(routed, ["river-league"]);
});
