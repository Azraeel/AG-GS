const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

test("trade zone overlay asset preserves the full AG map canvas", () => {
  const overlayPath = path.join(root, "site", "assets", "ag-trade-zones.png");
  assert.ok(fs.existsSync(overlayPath), "hand-drawn trade zone overlay should be committed as a site asset");

  const size = readPngSize(overlayPath);
  assert.equal(size.width, 8800);
  assert.equal(size.height, 5806);
});

test("trade zone manifest exposes player drawn sea zones and straits", () => {
  const source = fs.readFileSync(path.join(root, "site", "js", "app", "tradeZones.js"), "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);

  const manifest = sandbox.AGGS_TRADE_ZONES;
  assert.equal(manifest.version, "20260603-player-drawn-trade-zones");
  assert.equal(manifest.assetPath, "assets/ag-trade-zones.png");
  assert.equal(manifest.width, 8800);
  assert.equal(manifest.height, 5806);
  assert.equal(manifest.zones.length, 21);
  assert.equal(manifest.zones.filter((zone) => zone.type === "strait").length, 7);
  assert.equal(manifest.zones.filter((zone) => zone.type === "sea_zone").length, 14);

  const byId = Object.fromEntries(manifest.zones.map((zone) => [zone.id, zone]));
  assert.equal(byId.vesperan_strait.type, "strait");
  assert.equal(byId.boynak_canal.type, "strait");
  assert.equal(byId.ve_ulka_canal.color, "#cfd75c");
  assert.equal(byId.the_storm_expanse.type, "sea_zone");
});

test("trade map renders player drawn zone overlay instead of generated rectangles", () => {
  const appSource = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const publicHtml = fs.readFileSync(path.join(root, "site", "index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "site", "admin", "index.html"), "utf8");

  assert.match(appSource, /tradeZoneOverlayConfig/);
  assert.match(appSource, /trade-map-zone-overlay/);
  assert.match(appSource, /TradeMap\.tradeZones/);
  assert.doesNotMatch(appSource, /function tradeMapSeaZones/);
  assert.doesNotMatch(appSource, /tradeMapWaterMask/);
  assert.match(publicHtml, /js\/app\/tradeZones\.js\?v=20260603-map-route-mesh/);
  assert.match(adminHtml, /\.\.\/js\/app\/tradeZones\.js\?v=20260603-map-route-mesh/);
});
