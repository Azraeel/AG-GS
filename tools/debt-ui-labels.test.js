const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("debt UI exposes service rate as Interest Rate and keeps risk rate internal", () => {
  const statusTables = read("site/js/app/statusTables.js");
  const editorView = read("site/js/app/editorView.js");
  const app = read("site/app.js");

  assert.match(statusTables, /key:\s*"debtServiceRate",\s*label:\s*"Interest Rate"/);
  assert.match(editorView, /fieldControl\("national",\s*"debtServiceRate",\s*"Interest Rate %"/);
  assert.doesNotMatch(editorView, /fieldControl\("national",\s*"interestRate"/);
  assert.match(app, /"national\.interestRate"/);
  assert.match(app, /function visibleChangeImpacts\(entry\)/);
  assert.match(editorView, /const impacts = visibleChangeImpacts\(entry\)\.slice\(0,\s*3\);/);
  assert.match(editorView, /impacts\.map\(renderChangeBadge\)/);
  assert.doesNotMatch(editorView, /\(entry\.changes\s*\|\|\s*entry\.deltas\s*\|\|\s*\[\]\)\.slice\(0,\s*3\)\.map\(renderChangeBadge\)/);
});
