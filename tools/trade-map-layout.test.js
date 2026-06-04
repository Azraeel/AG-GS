const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("trade map inspector renders as a compact overlay inside the map stage", () => {
  const source = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const layoutIndex = source.indexOf('<div class="trade-map-layout">');
  const stageIndex = source.indexOf('<div class="trade-map-stage">', layoutIndex);
  const svgCloseIndex = source.indexOf("</svg>", stageIndex);
  const inspectorIndex = source.indexOf('<div class="trade-map-inspector"', svgCloseIndex);
  const dragHeadIndex = source.indexOf('data-trade-map-panel-drag', inspectorIndex);
  const selectedIndex = source.indexOf('<div class="trade-map-selected"', inspectorIndex);
  const partnersIndex = source.indexOf('<div class="trade-map-route-list"', inspectorIndex);

  assert.notEqual(layoutIndex, -1);
  assert.notEqual(stageIndex, -1);
  assert.notEqual(svgCloseIndex, -1);
  assert.notEqual(inspectorIndex, -1);
  assert.ok(stageIndex < svgCloseIndex, "the SVG should render inside the stage");
  assert.ok(svgCloseIndex < inspectorIndex, "the inspector should render after the map SVG inside the stage");
  assert.ok(inspectorIndex < dragHeadIndex, "the draggable handle should render inside the inspector");
  assert.ok(inspectorIndex < selectedIndex, "selected territory details should render inside the inspector");
  assert.ok(inspectorIndex < partnersIndex, "partner controls should render inside the inspector");
  assert.doesNotMatch(source, /tradeMapRouteDetailsHtml|trade-map-route-detail|trade-map-rail/);
});

test("trade map inspector is a bounded overlay card with no full-height rail", () => {
  const source = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");
  const panelRule = source.match(/\.trade-map-selected,\s*\.trade-map-route-list,\s*\.trade-map-asset-note\s*\{[^}]+\}/);
  const inspectorRule = source.match(/\.trade-map-inspector\s*\{[^}]+\}/);
  const dragHeadRule = source.match(/\.trade-map-drag-head\s*\{[^}]+\}/);
  assert.ok(panelRule, "shared trade map panel rule should exist");
  assert.ok(inspectorRule, "trade map inspector rule should exist");
  assert.ok(dragHeadRule, "trade map drag handle rule should exist");
  assert.match(panelRule[0], /position:\s*relative/);
  assert.doesNotMatch(panelRule[0], /position:\s*absolute/);
  assert.match(inspectorRule[0], /position:\s*absolute/);
  assert.match(inspectorRule[0], /max-height:\s*calc/);
  assert.match(inspectorRule[0], /overflow:\s*auto/);
  assert.match(inspectorRule[0], /border:\s*1px solid/);
  assert.match(dragHeadRule[0], /cursor:\s*grab/);
  assert.match(dragHeadRule[0], /touch-action:\s*none/);
  assert.doesNotMatch(source, /trade-map-rail/);
  assert.doesNotMatch(source, /trade-map-route-detail|trade-map-route-focus|trade-map-route-split|trade-map-route-facts/);
});

test("trade map nation clicks preserve page scroll", () => {
  const source = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const clickStart = source.indexOf('const mapNation = event.target.closest("[data-trade-map-nation]");');
  const clickEnd = source.indexOf('const nationButton = event.target.closest("[data-nation]");', clickStart);
  const clickBlock = source.slice(clickStart, clickEnd);
  const keyStart = source.indexOf('app.addEventListener("keydown"', clickEnd);
  const keyEnd = source.indexOf('app.addEventListener("change"', keyStart);
  const keyBlock = source.slice(keyStart, keyEnd);

  assert.match(source, /function renderPreservingPageScroll\(\)/);
  assert.match(clickBlock, /renderPreservingPageScroll\(\)/);
  assert.doesNotMatch(clickBlock, /scrollToPageTop\(\)/);
  assert.match(keyBlock, /renderPreservingPageScroll\(\)/);
  assert.doesNotMatch(keyBlock, /scrollToPageTop\(\)/);
});

test("trade map chrome stays compact instead of rendering filled dead space", () => {
  const source = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");
  const commandRule = source.match(/\.trade-map-command\s*\{[^}]+\}/);
  const layoutRule = source.match(/\.trade-map-layout\s*\{[^}]+\}/);
  const stageRule = source.match(/\.trade-map-stage\s*\{[^}]+\}/);
  const modebarRule = source.match(/\.trade-map-modebar\s*\{[^}]+\}/);
  const inspectorRule = source.match(/\.trade-map-inspector\s*\{[^}]+\}/);
  const tableWrapRule = source.match(/\.trade-network-table-wrap\s*\{[^}]+\}/);

  assert.ok(commandRule, "trade map command rule should exist");
  assert.ok(layoutRule, "trade map layout rule should exist");
  assert.ok(stageRule, "trade map stage rule should exist");
  assert.ok(modebarRule, "trade map modebar rule should exist");
  assert.ok(inspectorRule, "trade map inspector rule should exist");
  assert.ok(tableWrapRule, "trade network table wrap rule should exist");
  assert.match(commandRule[0], /display:\s*flex/);
  assert.match(commandRule[0], /min-height:\s*64px/);
  assert.match(layoutRule[0], /overflow:\s*hidden/);
  assert.doesNotMatch(layoutRule[0], /grid-template-columns/);
  assert.match(stageRule[0], /aspect-ratio:\s*8800\s*\/\s*5806/);
  assert.match(modebarRule[0], /flex-wrap:\s*nowrap/);
  assert.match(inspectorRule[0], /width:\s*min/);
  assert.match(tableWrapRule[0], /height:\s*clamp/);
  assert.doesNotMatch(tableWrapRule[0], /max-height/);
  assert.match(source, /:root\[data-theme="light"\]\s+\.trade-map-selected h2/);
  assert.match(source, /:root\[data-theme="light"\]\s+\.trade-map-route-list button/);
});

test("trade map inspector supports dragging with clamped local persistence", () => {
  const source = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  assert.match(source, /TRADE_MAP_PANEL_POSITION_KEY/);
  assert.match(source, /function clampTradeMapPanelPosition/);
  assert.match(source, /function setTradeMapPanelPosition/);
  assert.match(source, /function applyTradeMapPanelPosition/);
  assert.match(source, /localStorage\.setItem\(TRADE_MAP_PANEL_POSITION_KEY/);
  assert.match(source, /app\.addEventListener\("pointerdown"/);
  assert.match(source, /window\.addEventListener\("pointermove"/);
  assert.match(source, /window\.addEventListener\("pointerup"/);
  assert.match(source, /window\.addEventListener\("resize"/);
  assert.match(source, /panel\.style\.right\s*=\s*"auto"/);
  assert.match(source, /applyTradeMapPanelPosition\(\);\s*\n\s*restoreTableScroll\("tradeNetwork"\)/);
});

test("trade network UI exposes route-network controls without adding panel chrome", () => {
  const appSource = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");

  assert.match(appSource, /function transitPolicyControl/);
  assert.match(appSource, /data-transit-policy-select/);
  assert.match(appSource, /Engine\.setTransitPolicy/);
  assert.match(appSource, /routeDistanceMiles/);
  assert.match(appSource, /routeEfficiency/);
  assert.match(appSource, /tradeMapPartnerDistance/);
  assert.match(appSource, /areaSqMi/);
  assert.match(appSource, /data-trade-map-layer/);
  assert.match(appSource, /state\.tradeMapLayer/);
  assert.match(appSource, /tradeZoneOverlayConfig/);
  assert.match(appSource, /trade-map-zone-overlay/);
  assert.match(appSource, /TradeMap\.tradeZones/);
  assert.doesNotMatch(appSource, /<rect x="\$\{zone\.x\.toFixed\(2\)\}"/);
  assert.doesNotMatch(appSource, /tradeMapWaterMask/);
  assert.doesNotMatch(appSource, /trade-map-rail/);
  assert.match(styleSource, /\.trade-map-zone-overlay/);
  assert.match(styleSource, /\.trade-map-partner-meta/);
  assert.match(styleSource, /\.route-inline-facts/);
});

test("trade network UI exposes lane direction and flow-size filters", () => {
  const appSource = fs.readFileSync(path.join(root, "site", "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "site", "styles.css"), "utf8");

  assert.match(appSource, /tradeNetworkDirectionFilter/);
  assert.match(appSource, /tradeNetworkSizeFilter/);
  assert.match(appSource, /data-trade-network-direction-filter/);
  assert.match(appSource, /data-trade-network-size-filter/);
  assert.match(appSource, /filterTradeNetworkRows/);
  assert.match(appSource, /tradeNetworkRouteLimit/);
  assert.match(styleSource, /\.trade-network-filter-band/);
});
