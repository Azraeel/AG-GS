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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("normalizing state creates the Avant wiki container", () => {
  const Engine = loadEngine();
  const data = emptyState();

  Engine.normalizeState(data);

  assert.equal(data.wiki.meta.title, "Avant World Wiki");
  assert.equal(data.wiki.meta.startYear, 0);
  assert.equal(data.wiki.meta.endYear, 2020);
  assert.deepEqual(plain(data.wiki.pages), {});
});

test("saving wiki pages creates stable slugs and normalized lore fields", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());

  const page = Engine.saveWikiPage(data, {
    title: "Aurendale Founding",
    category: "Nation",
    status: "published",
    era: "Classical Era",
    yearStart: 781,
    yearEnd: 802,
    summary: "The early formation of Aurendale.",
    body: "Aurendale consolidates river cities.",
    tags: "Aurendale, founding, river cities"
  });

  assert.equal(page.id, "aurendale-founding");
  assert.equal(page.slug, "aurendale-founding");
  assert.deepEqual(plain(page.tags), ["Aurendale", "founding", "river cities"]);
  assert.equal(data.wiki.pages["aurendale-founding"].yearEnd, 802);
});

test("wiki search finds title body tags and filters by category and year", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());
  Engine.saveWikiPage(data, {
    title: "Aurendale Founding",
    category: "Nation",
    status: "published",
    yearStart: 781,
    yearEnd: 802,
    body: "River cities form the early crown.",
    tags: ["Aurendale", "founding"]
  });
  Engine.saveWikiPage(data, {
    title: "Whitewater Strait Crisis",
    category: "Event",
    status: "draft",
    yearStart: 1912,
    body: "A naval standoff reshapes maritime law.",
    tags: ["strait", "navy"]
  });

  const founding = Engine.searchWikiPages(data, "river", { category: "Nation", year: 790 });
  const publicResults = Engine.searchWikiPages(data, "naval", { status: "published" });
  const adminResults = Engine.searchWikiPages(data, "naval", { includeDrafts: true });

  assert.deepEqual(plain(founding.map((page) => page.id)), ["aurendale-founding"]);
  assert.deepEqual(plain(publicResults.map((page) => page.id)), []);
  assert.deepEqual(plain(adminResults.map((page) => page.id)), ["whitewater-strait-crisis"]);
});

test("archived wiki pages stay out of normal page lists", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());
  const page = Engine.saveWikiPage(data, {
    title: "Old Placeholder",
    category: "Concept",
    status: "published",
    body: "Retired scratch article."
  });

  Engine.archiveWikiPage(data, page.id, true);

  assert.deepEqual(plain(Engine.wikiPages(data).map((item) => item.id)), []);
  assert.deepEqual(plain(Engine.wikiPages(data, { includeArchived: true }).map((item) => item.id)), ["old-placeholder"]);
});

test("wiki years stay inside the Avant canon range", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());

  const ancient = Engine.saveWikiPage(data, {
    title: "Before Calendar",
    category: "Era",
    status: "published",
    yearStart: -120,
    yearEnd: -30
  });
  const future = Engine.saveWikiPage(data, {
    title: "Post Canon Crisis",
    category: "Event",
    status: "published",
    yearStart: 2040,
    yearEnd: 2025
  });
  const reversed = Engine.saveWikiPage(data, {
    title: "Backwards War",
    category: "Conflict",
    status: "published",
    yearStart: 940,
    yearEnd: 920
  });

  assert.equal(ancient.yearStart, 0);
  assert.equal(ancient.yearEnd, 0);
  assert.equal(future.yearStart, 2020);
  assert.equal(future.yearEnd, 2020);
  assert.equal(reversed.yearStart, 920);
  assert.equal(reversed.yearEnd, 940);
});

test("wiki references resolve outbound links backlinks and missing links", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());
  Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    aliases: ["The Crown"]
  });
  Engine.saveWikiPage(data, {
    title: "River League",
    category: "Organization",
    status: "published",
    body: "The league backed [[The Crown|Aurendale]] during the [[Missing Treaty]].",
    relatedPageIds: "aurendale"
  });

  const aurendaleRefs = Engine.wikiPageReferences(data, "aurendale");
  const leagueRefs = Engine.wikiPageReferences(data, "river-league");

  assert.deepEqual(plain(aurendaleRefs.backlinks.map((page) => page.id)), ["river-league"]);
  assert.deepEqual(plain(leagueRefs.outbound.map((page) => page.id)), ["aurendale"]);
  assert.deepEqual(plain(leagueRefs.missingLinks), ["Missing Treaty"]);
});

test("wiki content audit summarizes drafts missing links orphans and categories", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());
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
  Engine.saveWikiPage(data, {
    title: "Draft Crisis",
    category: "Event",
    status: "draft",
    body: "The crisis draft references [[Missing Treaty]] and [[Unmade Strait]]."
  });
  Engine.saveWikiPage(data, {
    title: "Lonely Region",
    category: "Region",
    status: "published",
    body: "This is useful lore but nobody links to it yet."
  });
  const archived = Engine.saveWikiPage(data, {
    title: "Archived Scratch",
    category: "Concept",
    status: "published",
    body: "Old scratch page with [[Missing Treaty]]."
  });
  Engine.archiveWikiPage(data, archived.id, true);

  const audit = Engine.wikiContentAudit(data);

  assert.equal(audit.pageCount, 4);
  assert.equal(audit.publishedCount, 3);
  assert.equal(audit.draftCount, 1);
  assert.equal(audit.archivedCount, 1);
  assert.deepEqual(plain(audit.draftPages.map((page) => page.id)), ["draft-crisis"]);
  assert.deepEqual(plain(audit.missingLinks.map((link) => [link.title, link.count])), [
    ["Missing Treaty", 2],
    ["Unmade Strait", 1]
  ]);
  assert.deepEqual(plain(audit.missingLinks[0].from.map((page) => page.id)), ["draft-crisis", "river-league"]);
  assert.deepEqual(plain(audit.orphanPages.map((page) => page.id)), ["draft-crisis", "lonely-region", "river-league"]);
  assert.deepEqual(plain(audit.categoryCounts.map((item) => [item.category, item.count])), [
    ["Event", 1],
    ["Nation", 1],
    ["Organization", 1],
    ["Region", 1]
  ]);
});

test("wiki facts normalize into structured lore fact sheets", () => {
  const Engine = loadEngine();
  const data = Engine.normalizeState(emptyState());

  const nation = Engine.saveWikiPage(data, {
    title: "Aurendale",
    category: "Nation",
    status: "published",
    facts: {
      Capital: "Highcourt",
      Government: "Crowned republic",
      "Founded": 781
    }
  });
  const event = Engine.saveWikiPage(data, {
    title: "Whitewater Crisis",
    category: "Event",
    status: "published",
    facts: "Date: 1912\nLocation - Whitewater Strait\nOutcome = Maritime law reforms\nNo separator line"
  });

  assert.deepEqual(plain(nation.facts), [
    { label: "Capital", value: "Highcourt" },
    { label: "Government", value: "Crowned republic" },
    { label: "Founded", value: "781" }
  ]);
  assert.deepEqual(plain(event.facts), [
    { label: "Date", value: "1912" },
    { label: "Location", value: "Whitewater Strait" },
    { label: "Outcome", value: "Maritime law reforms" }
  ]);
});

test("wiki fact templates provide Avant-specific scaffolds by page category", () => {
  const Engine = loadEngine();

  assert.deepEqual(plain(Engine.wikiFactTemplate("Nation").map((fact) => fact.label)), [
    "Capital",
    "Government",
    "Founded",
    "Region",
    "Major cultures"
  ]);
  assert.deepEqual(plain(Engine.wikiFactTemplate("Conflict").map((fact) => fact.label)), [
    "Period",
    "Belligerents",
    "Theater",
    "Result",
    "Aftermath"
  ]);
  assert.deepEqual(plain(Engine.wikiFactTemplate("Unknown")), []);
});
