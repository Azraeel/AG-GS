const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "site", "data.js");
const SEARCH_DIRS = ["site", "cloudflare", "tools"];

function loadData() {
  const context = { window: {}, globalThis: {} };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(DATA_FILE, "utf8"), context, { filename: DATA_FILE });
  return context.AGGS_DATA;
}

function walkFiles(dir) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) return walkFiles(path.relative(ROOT, filePath));
    if (!/\.(js|html|css|md|toml)$/i.test(entry.name)) return [];
    if (filePath === DATA_FILE) return [];
    return [filePath];
  });
}

function sourceText() {
  return SEARCH_DIRS
    .flatMap(walkFiles)
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}

function objectSize(value) {
  if (!value || typeof value !== "object") return 0;
  return Array.isArray(value) ? value.length : Object.keys(value).length;
}

function defaultishFields(rows) {
  const counts = new Map();
  for (const row of Object.values(rows || {})) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const [key, value] of Object.entries(row)) {
      const isDefault = value === "" || value === null || value === 0 || value === "None";
      if (isDefault) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 10)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ key, count }));
}

function main() {
  const data = loadData();
  const sources = sourceText();
  const metaKeys = Object.keys(data.meta || {});
  const unusedMetaKeys = metaKeys.filter((key) => !sources.includes(key));
  const topLevelSizes = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, objectSize(value)]));
  const emptyTopLevel = Object.entries(topLevelSizes).filter(([, size]) => size === 0).map(([key]) => key);
  const report = {
    nationCount: data.nations?.length || 0,
    topLevelSizes,
    emptyTopLevel,
    unusedMetaKeys,
    defaultishFields: {
      national: defaultishFields(data.national).slice(0, 20),
      trade: defaultishFields(data.trade).slice(0, 20),
      military: defaultishFields(data.military).slice(0, 20)
    }
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
