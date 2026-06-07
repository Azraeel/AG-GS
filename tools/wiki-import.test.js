const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadImporter() {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  [
    "site/js/app/wikiImport.js"
  ].forEach((relativePath) => {
    const file = path.join(ROOT, relativePath);
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  });
  return context.AGGS_APP_MODULES.WikiImport;
}

test("miraheze converter turns a conflict article into an AG-GS wiki draft", () => {
  const WikiImport = loadImporter();
  const source = `{{Infobox military conflict
| conflict = Solaran-Khalindarian War
| place = Continent of [[Alberion|Alberion]]
| result = Inconclusive
| date = 1990-1994
| combatant1 = [[File:SolaraFlag.png|25px]][[Solara|Solara]]
| combatant2 = [[Empire of Khalindar|Empire of Khalindar]]
| commander1 = [[Mason Williams|Marshal Mason Williams]]
| casualties1 = Military dead:
Over 500,000
}}

== Pre-War Tensions ==
==== Historical Grievances ====
[[File:Harbor.png|thumb|A harbor under attack]]
'''Solara''' and ''[[Empire of Khalindar|Khalindar]]'' clashed after the [[Avant Great War]].
* Naval raids expanded the conflict.

===== Key Battles within Congrave =====
====== Government District: ======
The district fell after street fighting.
`;

  const draft = WikiImport.convertMirahezeWikitext({
    title: "Solara-Khalindar War",
    sourceUrl: "https://avantpedia.miraheze.org/wiki/Solara-Khalindar_War",
    wikitext: source
  });

  assert.equal(draft.title, "Solara-Khalindar War");
  assert.equal(draft.category, "Conflict");
  assert.equal(draft.status, "draft");
  assert.equal(draft.yearStart, "1990");
  assert.equal(draft.yearEnd, "1994");
  assert.match(draft.aliases, /Solaran-Khalindarian War/);
  assert.match(draft.tags, /Solara/);
  assert.match(draft.tags, /Khalindar/);
  assert.match(draft.facts, /Conflict: Solaran-Khalindarian War/);
  assert.match(draft.facts, /Place: Continent of \[\[Alberion\]\]/);
  assert.match(draft.facts, /Combatants: \[\[Solara\]\]; \[\[Empire of Khalindar\]\]/);
  assert.match(draft.facts, /Commanders: \[\[Mason Williams\|Marshal Mason Williams\]\]/);
  assert.match(draft.facts, /Source: https:\/\/avantpedia\.miraheze\.org\/wiki\/Solara-Khalindar_War/);
  assert.match(draft.summary, /1990-1994 conflict/);
  assert.match(draft.body, /## Pre-War Tensions/);
  assert.match(draft.body, /### Historical Grievances/);
  assert.match(draft.body, /#### Key Battles within Congrave/);
  assert.match(draft.body, /##### Government District:/);
  assert.match(draft.body, /\*\*Solara\*\*/);
  assert.match(draft.body, /\*\[\[Khalindar\]\]\*/);
  assert.match(draft.body, /- Naval raids expanded the conflict\./);
  assert.match(draft.body, /\[\[Khalindar\]\]/);
  assert.doesNotMatch(draft.body, /File:/);
});

test("miraheze URL helper extracts page titles", () => {
  const WikiImport = loadImporter();

  assert.equal(
    WikiImport.pageTitleFromInput("https://avantpedia.miraheze.org/wiki/Solara-Khalindar_War"),
    "Solara-Khalindar War"
  );
  assert.equal(WikiImport.pageTitleFromInput("Solara-Khalindar War"), "Solara-Khalindar War");
});
