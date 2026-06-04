const assert = require("node:assert/strict");
const test = require("node:test");

const Parser = require("../site/js/app/recordsParser.js");

test("roster parser treats naval headings as subcategories, not equipment records", () => {
  const parsed = Parser.parseRoster(`
    Solara Equipment
    Navy
    Frigates
    Oliver Hazard Perry-class frigate,
    Submarines
    Los Angeles-class submarine
    Capital ship
    Iowa-Class
  `);

  assert.deepEqual(parsed.items.map((item) => item.name), [
    "Oliver Hazard Perry-class frigate",
    "Los Angeles-class submarine",
    "Iowa-Class"
  ]);
  assert.deepEqual(parsed.items.map((item) => item.subcategory), ["Frigates", "Submarines", "Capital ship"]);
});

test("roster parser skips placeholder item lines", () => {
  const parsed = Parser.parseRoster(`
    Karkalnadag Equipment
    Small Arms
    ATR/RPG
    N/A
    -
    RPG-7,
  `);

  assert.deepEqual(parsed.items.map((item) => item.name), ["RPG-7"]);
});

test("roster parser omits empty optional record fields", () => {
  const parsed = Parser.parseRoster(`
    Solara Equipment
    Navy
    Custom vessel
  `);

  const [item] = parsed.items;
  assert.equal(Object.hasOwn(item, "subcategory"), false);
  assert.equal(Object.hasOwn(item, "role"), false);
  assert.equal(Object.hasOwn(item, "notes"), false);
});
