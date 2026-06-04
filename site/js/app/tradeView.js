(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createTradeView = function createTradeView(ctx) {
    const runtime = {
      ...ctx,
      get data() {
        return ctx.getData();
      }
    };

    with (runtime) {
  function tradeNetworkPartnerRows(selectedId, network) {
    return sortedNations()
      .filter((nation) => nation.id !== selectedId)
      .map((partner) => {
        const importLane = network.lanes.find((lane) => lane.importerId === selectedId && lane.exporterId === partner.id);
        const exportLane = network.lanes.find((lane) => lane.importerId === partner.id && lane.exporterId === selectedId);
        const override = data.tradeNetwork?.targetedTariffs?.[selectedId]?.[partner.id];
        const exportAnchor = data.tradeNetwork?.exportAnchors?.[selectedId]?.[partner.id];
        const importAnchor = data.tradeNetwork?.importAnchors?.[selectedId]?.[partner.id];
        const lanePolicy = data.tradeNetwork?.lanePolicies?.[selectedId]?.[partner.id] || {};
        const transitPolicy = data.tradeNetwork?.transitPolicies?.[selectedId]?.[partner.id] || "Open";
        const importFlow = Engine.number(importLane?.currentFlow, 0);
        const exportFlow = Engine.number(exportLane?.currentFlow, 0);
        const hasPinnedControl = override !== undefined
          || exportAnchor !== undefined
          || importAnchor !== undefined
          || lanePolicy.embargo === true
          || (lanePolicy.sanctionsLevel && lanePolicy.sanctionsLevel !== "None")
          || transitPolicy !== "Open";
        return {
          partner,
          importLane,
          exportLane,
          importFlow,
          exportFlow,
          activity: importFlow + exportFlow,
          flowDelta: Engine.number(importLane?.flowDelta, 0) + Engine.number(exportLane?.flowDelta, 0),
          override,
          exportAnchor,
          importAnchor,
          lanePolicy,
          transitPolicy,
          hasPinnedControl
        };
      })
      .filter((row) => row.activity > 0 || row.hasPinnedControl)
      .sort((left, right) => right.activity - left.activity);
  }

  function tradeNetworkRowShare(row, impact = {}) {
    const selectedTrade = Engine.number(impact.importFlow, 0) + Engine.number(impact.exportFlow, 0);
    return selectedTrade > 0 ? (Engine.number(row.activity, 0) / selectedTrade) * 100 : 0;
  }

  function tradeNetworkSizeTier(row, impact = {}) {
    const share = tradeNetworkRowShare(row, impact);
    if (share >= 5) return "major";
    if (share >= 1) return "standard";
    return "tiny";
  }

  function filterTradeNetworkRows(rows, impact = {}) {
    const direction = state.tradeNetworkDirectionFilter || "all";
    const size = state.tradeNetworkSizeFilter || "all";
    return rows.filter((row) => {
      if (direction === "imports" && Engine.number(row.importFlow, 0) <= 0) return false;
      if (direction === "exports" && Engine.number(row.exportFlow, 0) <= 0) return false;
      const tier = tradeNetworkSizeTier(row, impact);
      if (size === "major") return tier === "major";
      if (size === "standard") return tier === "major" || tier === "standard";
      if (size === "tiny") return tier === "tiny";
      return true;
    });
  }

  function tradeNetworkRouteLimit(rows) {
    return Math.min(72, Math.max(14, rows.length));
  }

  function laneUsesTransitNation(lane, nationId) {
    if (!lane || lane.importerId === nationId || lane.exporterId === nationId) return false;
    return (lane.transitPath || []).includes(nationId);
  }

  function laneHasLandlockedEndpoint(lane) {
    const geography = data.tradeNetwork?.geography?.nations || {};
    return geography[lane.importerId]?.landlocked === true || geography[lane.exporterId]?.landlocked === true;
  }

  function transitPathLabel(path = []) {
    return (path || [])
      .map((nationId) => byId(nationId)?.name || nationId)
      .filter(Boolean)
      .join(" -> ");
  }

  function transitRowsForNation(nationId, network) {
    return (network.lanes || [])
      .filter((lane) => Engine.number(lane.currentFlow, 0) > 0 && laneUsesTransitNation(lane, nationId))
      .map((lane) => ({
        lane,
        importer: byId(lane.importerId),
        exporter: byId(lane.exporterId),
        flow: Engine.number(lane.currentFlow, 0),
        pathLabel: transitPathLabel(lane.transitPath),
        landlocked: laneHasLandlockedEndpoint(lane)
      }))
      .sort((left, right) => right.flow - left.flow);
  }

  function routeInvestmentHtml(selected) {
    const investment = Engine.routeInvestmentFor?.(data, selected.id) || { portAccess: 0, transitCorridor: 0 };
    const portInputId = `route-investment-port-${selected.id}`.replace(/[^a-z0-9_-]/gi, "-");
    const corridorInputId = `route-investment-corridor-${selected.id}`.replace(/[^a-z0-9_-]/gi, "-");
    return `
      <div class="route-investment-band">
        <div class="route-investment-title">
          <span class="section-kicker">Route Upgrades</span>
          <strong>${safeText(selected.name)}</strong>
        </div>
        <div class="route-investment-readout">
          <div>
            <span>Port Access</span>
            <strong>${fmtNumber(investment.portAccess || 0)} / 10</strong>
          </div>
          <div>
            <span>Transit Corridors</span>
            <strong>${fmtNumber(investment.transitCorridor || 0)} / 10</strong>
          </div>
        </div>
        ${isAdmin ? `
          <div class="route-investment-controls">
            <label>
              <span>Port Access</span>
              <input id="${escapeHtml(portInputId)}" type="number" min="0" max="10" step="0.1" value="${escapeHtml(investment.portAccess || 0)}" inputmode="decimal" data-route-investment-input>
            </label>
            <label>
              <span>Transit Corridors</span>
              <input id="${escapeHtml(corridorInputId)}" type="number" min="0" max="10" step="0.1" value="${escapeHtml(investment.transitCorridor || 0)}" inputmode="decimal" data-route-investment-input>
            </label>
            <button class="command compact" type="button" data-action="set-route-investment" data-nation-id="${escapeHtml(selected.id)}" data-port-input-id="${escapeHtml(portInputId)}" data-corridor-input-id="${escapeHtml(corridorInputId)}">Apply</button>
            <button class="command compact" type="button" data-action="clear-route-investment" data-nation-id="${escapeHtml(selected.id)}" ${investment.portAccess || investment.transitCorridor ? "" : "disabled"}>Clear</button>
          </div>` : ""}
      </div>`;
  }

  function transitThroughHtml(selected, transitRows) {
    const shownRows = transitRows.slice(0, 10);
    const totalFlow = transitRows.reduce((total, row) => total + row.flow, 0);
    return `
      <div class="trade-transit-band">
        <div class="trade-transit-title">
          <span class="section-kicker">Transit Through You</span>
          <strong>${fmtNumber(transitRows.length)} lanes / ${fmtNumber(totalFlow)} flow</strong>
        </div>
        <div class="trade-transit-list">
          ${shownRows.length ? shownRows.map((row) => {
            const lane = row.lane;
            const routeBits = [
              lane.routeMode || lane.routeType || "route",
              lane.routeEfficiency === null || lane.routeEfficiency === undefined ? "" : `${fmtPercent(lane.routeEfficiency)} eff`,
              row.landlocked ? "landlocked endpoint" : ""
            ].filter(Boolean).join(" / ");
            return `
              <div class="trade-transit-row">
                <div>
                  <strong>${safeText(row.exporter?.name || lane.exporterId)} -> ${safeText(row.importer?.name || lane.importerId)}</strong>
                  <span>${safeText(row.pathLabel || selected.name)}</span>
                </div>
                <span>${fmtNumber(row.flow)}</span>
                <span>${safeText(routeBits)}</span>
              </div>`;
          }).join("") : `<div class="trade-transit-empty">No active foreign lanes are using this country for transit.</div>`}
          ${transitRows.length > shownRows.length ? `<div class="trade-transit-more">+${fmtNumber(transitRows.length - shownRows.length)} more active lanes</div>` : ""}
        </div>
      </div>`;
  }

  function targetedTariffControl(selectedId, partnerId, lane, override) {
    const inputId = `targeted-tariff-${selectedId}-${partnerId}`.replace(/[^a-z0-9_-]/gi, "-");
    const value = override !== undefined ? override : Engine.number(lane?.tariffRate, data.trade?.[selectedId]?.tariffRate ?? 0);
    if (!isAdmin) return `<span class="trade-network-rate">${fmtPercent(value)}</span>`;
    return `
      <div class="tariff-inline-control">
        <input id="${escapeHtml(inputId)}" type="number" min="0" max="50" step="0.1" value="${escapeHtml(value)}" inputmode="decimal" data-targeted-tariff-input>
        <button class="command compact" type="button" data-action="set-targeted-tariff" data-importer-id="${escapeHtml(selectedId)}" data-exporter-id="${escapeHtml(partnerId)}" data-input-id="${escapeHtml(inputId)}">Apply</button>
        <button class="command compact" type="button" data-action="clear-targeted-tariff" data-importer-id="${escapeHtml(selectedId)}" data-exporter-id="${escapeHtml(partnerId)}" ${override === undefined ? "disabled" : ""}>Clear</button>
      </div>`;
  }

  function exportAnchorControl(exporterId, importerId, share) {
    const inputId = `export-anchor-${exporterId}-${importerId}`.replace(/[^a-z0-9_-]/gi, "-");
    const value = share !== undefined ? share : "";
    if (!isAdmin) return share !== undefined ? `<span class="trade-network-rate">${fmtPercent(share)}</span>` : `<span class="muted-text">Auto</span>`;
    return `
      <div class="anchor-inline-control">
        <input id="${escapeHtml(inputId)}" type="number" min="0" max="95" step="1" value="${escapeHtml(value)}" placeholder="Auto" inputmode="decimal" data-export-anchor-input>
        <button class="command compact" type="button" data-action="set-export-anchor" data-exporter-id="${escapeHtml(exporterId)}" data-importer-id="${escapeHtml(importerId)}" data-input-id="${escapeHtml(inputId)}">Lock</button>
        <button class="command compact" type="button" data-action="clear-export-anchor" data-exporter-id="${escapeHtml(exporterId)}" data-importer-id="${escapeHtml(importerId)}" ${share === undefined ? "disabled" : ""}>Auto</button>
      </div>`;
  }

  function importAnchorControl(importerId, exporterId, share) {
    const inputId = `import-anchor-${importerId}-${exporterId}`.replace(/[^a-z0-9_-]/gi, "-");
    const value = share !== undefined ? share : "";
    if (!isAdmin) return share !== undefined ? `<span class="trade-network-rate">${fmtPercent(share)}</span>` : `<span class="muted-text">Auto</span>`;
    return `
      <div class="anchor-inline-control">
        <input id="${escapeHtml(inputId)}" type="number" min="0" max="95" step="1" value="${escapeHtml(value)}" placeholder="Auto" inputmode="decimal" data-import-anchor-input>
        <button class="command compact" type="button" data-action="set-import-anchor" data-importer-id="${escapeHtml(importerId)}" data-exporter-id="${escapeHtml(exporterId)}" data-input-id="${escapeHtml(inputId)}">Lock</button>
        <button class="command compact" type="button" data-action="clear-import-anchor" data-importer-id="${escapeHtml(importerId)}" data-exporter-id="${escapeHtml(exporterId)}" ${share === undefined ? "disabled" : ""}>Auto</button>
      </div>`;
  }

  function lanePolicyValue(policy = {}) {
    if (policy.embargo === true) return "Embargo";
    return policy.sanctionsLevel || "None";
  }

  function lanePolicyControl(importerId, exporterId, policy = {}) {
    const value = lanePolicyValue(policy);
    if (!isAdmin) return `<span class="trade-network-rate">${safeText(value)}</span>`;
    return `
      <select class="policy-inline-control" data-lane-policy-select data-importer-id="${escapeHtml(importerId)}" data-exporter-id="${escapeHtml(exporterId)}" aria-label="Lane policy">
        ${["None", "Light", "Moderate", "Heavy", "Total", "Embargo"].map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`).join("")}
      </select>`;
  }

  function transitPolicyControl(blockerId, targetId, mode = "Open") {
    const value = ["Open", "Block Land", "Block Maritime", "Block All"].includes(mode) ? mode : "Open";
    if (!isAdmin) return `<span class="trade-network-rate">${safeText(value)}</span>`;
    return `
      <select class="policy-inline-control" data-transit-policy-select data-blocker-id="${escapeHtml(blockerId)}" data-target-id="${escapeHtml(targetId)}" aria-label="Transit access">
        ${["Open", "Block Land", "Block Maritime", "Block All"].map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`).join("")}
      </select>`;
  }

  function routeFactsHtml(row) {
    const lane = row.importLane || row.exportLane;
    if (!lane) return `<span class="muted-text">No route</span>`;
    const mode = lane.routeMode || lane.routeType || "route";
    const miles = lane.routeDistanceMiles === null || lane.routeDistanceMiles === undefined
      ? "Unmapped"
      : `${fmtNumber(lane.routeDistanceMiles)} mi`;
    const efficiency = lane.routeEfficiency === null || lane.routeEfficiency === undefined
      ? ""
      : `${fmtPercent(lane.routeEfficiency)} eff`;
    const choke = Engine.number(lane.chokepointSeverity, 0) > 0
      ? `Strait -${fmtPercent(lane.chokepointSeverity)}`
      : "";
    const upgrade = Engine.number(lane.routeInvestmentBonus, 0) > 0
      ? `Upgrade +${fmtPercent(lane.routeInvestmentBonus)}`
      : "";
    return `
      <div class="route-inline-facts">
        <strong>${safeText(miles)}</strong>
        <span>${safeText([mode, efficiency, choke, upgrade].filter(Boolean).join(" / "))}</span>
      </div>`;
  }

  function tradeMapPartnerDistance(row) {
    const lane = row.importLane || row.exportLane;
    const miles = Engine.number(lane?.routeDistanceMiles, 0);
    if (miles <= 0) return "Route unmapped";
    const mode = lane?.routeMode || lane?.routeType || "route";
    return `${fmtNumber(Math.round(miles))} mi / ${safeText(mode)}`;
  }

  function tradeGeneratorPartnerOptions(selectedId, selectedValue = "") {
    return [
      `<option value="">Auto pick</option>`,
      ...sortedNations()
        .filter((nation) => nation.id !== selectedId)
        .map((nation) => `<option value="${escapeHtml(nation.id)}" ${nation.id === selectedValue ? "selected" : ""}>${safeText(nation.name)}</option>`)
    ].join("");
  }

  function tradeGeneratorSettingsFromValues(values = state.tradeGenerator) {
    const partner = (key, shareKey) => {
      const partnerId = values[key] || "";
      if (!partnerId) return null;
      return { partnerId, share: values[shareKey] };
    };
    return {
      pattern: values.pattern || "concentrated",
      importPartners: [partner("importPrimary", "importPrimaryShare"), partner("importSecondary", "importSecondaryShare")].filter(Boolean),
      exportPartners: [partner("exportPrimary", "exportPrimaryShare"), partner("exportSecondary", "exportSecondaryShare")].filter(Boolean)
    };
  }

  function readTradeGeneratorValues() {
    const values = { ...state.tradeGenerator };
    app.querySelectorAll("[data-trade-generator-input]").forEach((input) => {
      values[input.dataset.tradeGeneratorInput] = input.value;
    });
    return values;
  }

  function tradeGeneratorPreviewHtml(preview) {
    if (!preview?.changes?.length) return "";
    return `
      <div class="trade-generator-preview" aria-live="polite">
        <div class="trade-generator-preview-head">
          <span>${fmtNumber(preview.changes.length)} generated locks</span>
          <strong>${safeText(preview.patternLabel)}</strong>
        </div>
        <div class="trade-generator-preview-list">
          ${preview.changes.map((change) => `
            <div class="trade-generator-preview-row">
              <span>${change.type === "import_anchor" ? "Import from" : "Export to"}</span>
              <strong>${safeText(change.partnerName)}</strong>
              <em>${fmtPercent(change.beforeShare)} -> ${fmtPercent(change.afterShare)}</em>
            </div>`).join("")}
        </div>
      </div>`;
  }

  function tradeGeneratorHtml(selected) {
    if (!isAdmin) return "";
    const generator = state.tradeGenerator;
    const preview = state.tradeAnchorPreview?.countryId === selected.id ? state.tradeAnchorPreview : null;
    return `
      <div class="trade-generator-band">
        <div class="trade-generator-title">
          <span class="section-kicker">Trade Generator</span>
          <strong>${preview ? `${fmtNumber(preview.changes.length)} locks ready` : "Bulk-build lanes"}</strong>
        </div>
        <label class="trade-generator-field">
          <span>Pattern</span>
          <select data-trade-generator-input="pattern">
            ${[
              ["concentrated", "Concentrated"],
              ["balanced", "Balanced"],
              ["globalized", "Globalized"],
              ["isolated", "Isolated"],
              ["manual", "Manual only"]
            ].map(([value, label]) => `<option value="${value}" ${generator.pattern === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <div class="trade-generator-pair">
          <label class="trade-generator-field">
            <span>Import #1</span>
            <select data-trade-generator-input="importPrimary">${tradeGeneratorPartnerOptions(selected.id, generator.importPrimary)}</select>
          </label>
          <label class="trade-generator-share">
            <span>%</span>
            <input type="number" min="0" max="95" step="1" placeholder="Auto" value="${escapeHtml(generator.importPrimaryShare)}" data-trade-generator-input="importPrimaryShare">
          </label>
        </div>
        <div class="trade-generator-pair">
          <label class="trade-generator-field">
            <span>Import #2</span>
            <select data-trade-generator-input="importSecondary">${tradeGeneratorPartnerOptions(selected.id, generator.importSecondary)}</select>
          </label>
          <label class="trade-generator-share">
            <span>%</span>
            <input type="number" min="0" max="95" step="1" placeholder="Auto" value="${escapeHtml(generator.importSecondaryShare)}" data-trade-generator-input="importSecondaryShare">
          </label>
        </div>
        <div class="trade-generator-pair">
          <label class="trade-generator-field">
            <span>Export #1</span>
            <select data-trade-generator-input="exportPrimary">${tradeGeneratorPartnerOptions(selected.id, generator.exportPrimary)}</select>
          </label>
          <label class="trade-generator-share">
            <span>%</span>
            <input type="number" min="0" max="95" step="1" placeholder="Auto" value="${escapeHtml(generator.exportPrimaryShare)}" data-trade-generator-input="exportPrimaryShare">
          </label>
        </div>
        <div class="trade-generator-pair">
          <label class="trade-generator-field">
            <span>Export #2</span>
            <select data-trade-generator-input="exportSecondary">${tradeGeneratorPartnerOptions(selected.id, generator.exportSecondary)}</select>
          </label>
          <label class="trade-generator-share">
            <span>%</span>
            <input type="number" min="0" max="95" step="1" placeholder="Auto" value="${escapeHtml(generator.exportSecondaryShare)}" data-trade-generator-input="exportSecondaryShare">
          </label>
        </div>
        <div class="trade-generator-actions">
          <button class="command compact" type="button" data-action="preview-trade-generator">Preview</button>
          <button class="command compact" type="button" data-action="apply-trade-generator" ${preview ? "" : "disabled"}>Apply</button>
          <button class="command compact" type="button" data-action="clear-trade-generator-preview" ${preview ? "" : "disabled"}>Clear</button>
        </div>
      </div>
      ${tradeGeneratorPreviewHtml(preview)}`;
  }

  function coordinateText(point) {
    if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) return "Unmapped";
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    const latText = `${Math.abs(latitude).toFixed(1)}${latitude >= 0 ? "N" : "S"}`;
    const lonText = `${Math.abs(longitude).toFixed(1)}${longitude >= 0 ? "E" : "W"}`;
    return `${latText}, ${lonText}`;
  }

  function compactNeighborNames(ids = []) {
    const names = ids
      .map((id) => byId(id)?.name)
      .filter(Boolean);
    if (!names.length) return "Unmapped";
    const shown = names.slice(0, 3).join(", ");
    return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
  }

  function areaTextForGeography(geo = {}) {
    const sqMi = Engine.number(geo.areaSqMi, 0);
    if (sqMi <= 0) return "Unmapped";
    const share = Engine.number(geo.areaShare, 0);
    const shareText = share > 0 ? ` / ${Number(share.toFixed(2)).toLocaleString("en-US")}% world` : "";
    return `${fmtCompact(sqMi)} sq mi${shareText}`;
  }

  function geographyItemsFor(id) {
    const geo = data.tradeNetwork?.geography?.nations?.[id] || {};
    const coastText = geo.coastal
      ? `${geo.oceanZone || "Coastal"} / Port ${fmtNumber(geo.portStrength || 0)}`
      : "Landlocked";
    const items = [
      { label: "Capital", value: coordinateText(geo.capital) },
      { label: "Area", value: areaTextForGeography(geo) },
      { label: "Region", value: geo.regionLabel || geo.region || "Unmapped" },
      { label: "Continent", value: geo.continent || "Unmapped" },
      { label: "Coast", value: coastText },
      { label: "Borders", value: compactNeighborNames(geo.neighborIds || []) }
    ];
    if (geo.primaryPort) items.splice(4, 0, { label: "Port", value: coordinateText(geo.primaryPort) });
    return items;
  }

  function tradeMapLayerButton(value, label) {
    return `<button class="trade-map-mode ${state.tradeMapLayer === value ? "is-active" : ""}" type="button" data-trade-map-layer="${escapeHtml(value)}">${safeText(label)}</button>`;
  }

  function tradeNetworkFilterOption(value, label, currentValue) {
    return `<option value="${escapeHtml(value)}" ${value === currentValue ? "selected" : ""}>${safeText(label)}</option>`;
  }

  function tradeZoneOverlayConfig() {
    const manifest = TradeMap.tradeZones?.();
    if (!manifest?.assetPath) return null;
    const zones = Array.isArray(manifest.zones) ? manifest.zones : [];
    return {
      ...manifest,
      zones,
      straitCount: zones.filter((zone) => zone.type === "strait").length,
      seaZoneCount: zones.filter((zone) => zone.type === "sea_zone").length
    };
  }

  function tradeMapCanvasHtml(selected, rows, tradeMetrics, worldPool) {
    const mapConfig = TradeMap.mapConfig?.() || { hasRealSvg: false, assetPath: "assets/world-map.png", width: 100, height: 100, viewBox: "0 0 100 100", sourceTerritoryCount: 0 };
    const mapAssetHref = `${isAdmin ? "../" : ""}${mapConfig.assetPath}`;
    const tradeZoneOverlay = tradeZoneOverlayConfig();
    const showTradeZoneOverlay = Boolean(tradeZoneOverlay) && (state.tradeMapLayer === "seaZones" || state.tradeMapLayer === "ports");
    const activeMapHref = showTradeZoneOverlay ? `${isAdmin ? "../" : ""}${tradeZoneOverlay.assetPath}` : mapAssetHref;
    const worldSurfaceLabel = mapConfig.surfaceAreaSqMi ? `${fmtCompact(mapConfig.surfaceAreaSqMi)} sq mi` : "Unknown scale";
    const worldSurfaceTitle = mapConfig.equatorialCircumferenceMi
      ? `${fmtNumber(Math.round(mapConfig.surfaceAreaSqMi))} sq mi surface / ${fmtNumber(Math.round(mapConfig.equatorialCircumferenceMi))} mi circumference`
      : "World surface scale";
    const territories = TradeMap.territoriesForNations?.(sortedNations(), selected.id) || [];
    const routes = TradeMap.routesForRows?.(selected.id, rows, territories, tradeNetworkRouteLimit(rows)) || [];
    const maxRouteFlow = Math.max(1, ...routes.map((route) => route.totalFlow || 0));
    const topPartners = rows.slice(0, 4);
    const routeSummary = routes.length
      ? `${fmtNumber(routes.length)} direct routes shown`
      : "No direct routes visible";
    const worldPoolValue = fmtNumber(worldPool.currentTradeFlow || 0);
    const gridColumns = Array.from({ length: 10 }, (_, index) => Number((((index + 1) / 11) * mapConfig.width).toFixed(2)));
    const gridRows = Array.from({ length: 6 }, (_, index) => Number((((index + 1) / 7) * mapConfig.height).toFixed(2)));
    return `
      <div class="trade-map-shell" aria-label="Unified trade map">
        <div class="trade-map-command">
          <label class="select-shell trade-network-selector" for="tradeNetworkNationSelect">
            <span>Country</span>
            <select id="tradeNetworkNationSelect" data-nation-select>
              ${nationOptionsHtml(selected.id)}
            </select>
          </label>
          <div class="trade-network-filter-band" aria-label="Trade lane filters">
            <label class="select-shell trade-network-filter" for="tradeNetworkDirectionFilter">
              <span>Lane</span>
              <select id="tradeNetworkDirectionFilter" data-trade-network-direction-filter>
                ${[
                  ["all", "All"],
                  ["imports", "Imports"],
                  ["exports", "Exports"]
                ].map(([value, label]) => tradeNetworkFilterOption(value, label, state.tradeNetworkDirectionFilter || "all")).join("")}
              </select>
            </label>
            <label class="select-shell trade-network-filter" for="tradeNetworkSizeFilter">
              <span>Flow</span>
              <select id="tradeNetworkSizeFilter" data-trade-network-size-filter>
                ${[
                  ["all", "All Sizes"],
                  ["major", "Major"],
                  ["standard", "Major + Mid"],
                  ["tiny", "Tiny"]
                ].map(([value, label]) => tradeNetworkFilterOption(value, label, state.tradeNetworkSizeFilter || "all")).join("")}
              </select>
            </label>
          </div>
          <div class="trade-map-modebar" aria-label="Trade map layers">
            <span class="trade-map-scale" title="${escapeHtml(worldSurfaceTitle)}"><span>World Surface</span><strong>${safeText(worldSurfaceLabel)}</strong></span>
            ${tradeMapLayerButton("trade", "Trade")}
            ${tradeMapLayerButton("imports", "Imports")}
            ${tradeMapLayerButton("exports", "Exports")}
            ${tradeMapLayerButton("ports", "Ports")}
            ${tradeMapLayerButton("seaZones", "Sea Zones")}
            ${isAdmin ? `<span class="trade-map-mode admin">Admin edit</span>` : ""}
          </div>
        </div>
        <div class="trade-map-layout">
          <div class="trade-map-stage">
            <svg class="trade-map-svg ${mapConfig.hasRealSvg ? "has-real-map" : ""}" viewBox="${safeText(mapConfig.viewBox)}" role="img" aria-label="Clickable AG-GS trade territories">
            <defs>
              <filter id="tradeMapGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.45" result="blur"></feGaussianBlur>
                <feMerge>
                  <feMergeNode in="blur"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
            </defs>
            ${mapConfig.hasRealSvg ? `<image class="trade-map-basemap ${showTradeZoneOverlay ? "trade-map-zone-overlay" : ""}" href="${escapeHtml(activeMapHref)}" x="0" y="0" width="${mapConfig.width}" height="${mapConfig.height}" preserveAspectRatio="none">
              ${showTradeZoneOverlay ? `<title>${fmtNumber(tradeZoneOverlay.seaZoneCount)} sea zones / ${fmtNumber(tradeZoneOverlay.straitCount)} straits</title>` : ""}
            </image>` : ""}
            <g class="trade-map-grid" aria-hidden="true">
              ${gridColumns.map((x) => `<line x1="${x}" y1="${(mapConfig.height * 0.08).toFixed(2)}" x2="${x}" y2="${(mapConfig.height * 0.94).toFixed(2)}"></line>`).join("")}
              ${gridRows.map((y) => `<line x1="${(mapConfig.width * 0.04).toFixed(2)}" y1="${y}" x2="${(mapConfig.width * 0.96).toFixed(2)}" y2="${y}"></line>`).join("")}
            </g>
            <g class="trade-map-routes" aria-label="Trade routes">
              ${routes.map((route, index) => {
                const width = 0.24 + Math.sqrt((route.totalFlow || 0) / maxRouteFlow) * 0.72;
                const tone = state.tradeMapLayer === "imports" ? "import" : state.tradeMapLayer === "exports" ? "export" : route.exportFlow > route.importFlow ? "export" : "import";
                return `<path class="trade-map-route ${tone}" d="${escapeHtml(route.path)}" stroke-width="${width.toFixed(2)}">
                  <title>${safeText(selected.name)} / ${safeText(route.partnerName)} ${safeText(route.routeType)} route, ${fmtNumber(route.totalFlow)} flow</title>
                </path>`;
              }).join("")}
            </g>
            <g class="trade-map-territories" aria-label="Clickable territories">
              ${territories.map((territory) => {
                const transformAttr = territory.transform ? ` transform="${escapeHtml(territory.transform)}"` : "";
                return `
                <path class="trade-map-territory ${territory.selected ? "is-selected" : ""}"
                  d="${escapeHtml(territory.path)}"
                  ${transformAttr}
                  fill="${safeColor(territory.color)}"
                  style="--territory-color:${safeColor(territory.color)}"
                  tabindex="0"
                  role="button"
                  aria-label="${safeText(territory.name)}"
                  data-anchor-source="${escapeHtml(territory.anchorSource || "generated")}"
                  data-label-cluster-id="${escapeHtml(territory.labelClusterId || "")}"
                  data-source-territory-id="${escapeHtml(territory.sourceTerritoryId || "")}"
                  data-trade-map-nation="${escapeHtml(territory.nationId)}">
                  <title>${safeText(territory.name)}</title>
                </path>`;
              }).join("")}
            </g>
            ${mapConfig.hasRealSvg ? "" : `<g class="trade-map-labels" aria-hidden="true">
              ${territories
                .filter((territory) => territory.selected || topPartners.some((row) => row.partner.id === territory.nationId))
                .map((territory) => `<text x="${territory.centroid.x.toFixed(2)}" y="${Math.max(2.2, territory.centroid.y - 3.2).toFixed(2)}">${safeText(territory.name.split(" ").slice(0, 2).join(" "))}</text>`)
                .join("")}
            </g>`}
            </svg>
            <div class="trade-map-inspector" aria-label="Selected trade inspector">
              <div class="trade-map-selected" style="--selected-color:${safeColor(selected.color)}">
                <div class="trade-map-drag-head" data-trade-map-panel-drag title="Drag to reposition panel" aria-label="Drag trade inspector panel">
                  <span class="section-kicker">Selected Territory</span>
                  <h2>${safeText(selected.name)}</h2>
                  <p>${safeText(routeSummary)} · world pool ${safeText(worldPoolValue)}</p>
                </div>
                <div class="trade-map-geography">
                  ${geographyItemsFor(selected.id).map((item) => `
                    <div>
                      <span>${safeText(item.label)}</span>
                      <strong>${safeText(item.value)}</strong>
                    </div>`).join("")}
                </div>
                <div class="trade-map-statline">
                  ${tradeMetrics.slice(0, 6).map((metric) => `
                    <div>
                      <span>${safeText(metric.label)}</span>
                      <strong class="${metric.tone || ""}">${safeText(metric.value)}</strong>
                    </div>`).join("")}
                </div>
              </div>
              <div class="trade-map-route-list" aria-label="Shown trade partners">
                <span class="section-kicker">Shown Partners</span>
                ${topPartners.length ? topPartners.map((row) => `
                  <button type="button" data-trade-map-nation="${escapeHtml(row.partner.id)}">
                    <span class="trade-map-partner-copy">
                      <span>${safeText(row.partner.name)}</span>
                      <em class="trade-map-partner-meta">${tradeMapPartnerDistance(row)}</em>
                    </span>
                    <strong>${fmtNumber(row.activity)}</strong>
                  </button>`).join("") : `<p>No active direct partners.</p>`}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderTradeNetwork() {
    Engine.ensureTradeV3Migration(data);
    TradeMap.ensureGeography?.(data);
    const network = Engine.calculateTradeNetwork(data, { laneVisibility: "all" });
    const selected = byId(state.selectedNation) || sortedNations()[0];
    if (!selected) {
      app.innerHTML = `
        <section class="trade-network-workspace">
          <div class="trade-network-title">
            <div>
              <span class="section-kicker">Global Trade Network</span>
              <h2>No active nations</h2>
            </div>
          </div>
          <div class="empty">No trade network can be calculated.</div>
        </section>`;
      return;
    }
    if (selected.id !== state.selectedNation) state.selectedNation = selected.id;
    const national = data.national[selected.id] || {};
    const trade = data.trade[selected.id] || {};
    const impact = network.nations[selected.id] || {};
    const baseline = data.tradeNetwork?.baseline?.nations?.[selected.id] || {};
    const budgetDelta = Engine.number(national.budgetCapacity, 0) - Engine.number(baseline.budgetCapacity, national.budgetCapacity);
    const flowDelta = Engine.number(impact.tradeFlowDelta, 0);
    const worldPool = network.worldPool || {};
    const worldPoolDelta = Engine.number(worldPool.tradeFlowDelta, 0);
    const allRows = tradeNetworkPartnerRows(selected.id, network);
    const rows = filterTradeNetworkRows(allRows, impact);
    const transitRows = transitRowsForNation(selected.id, network);
    const activeTargets = allRows.filter((row) => row.override !== undefined).length;
    const tradeMetrics = [
      { label: "Partners", value: allRows.length === rows.length ? fmtNumber(rows.length) : `${fmtNumber(rows.length)} / ${fmtNumber(allRows.length)}` },
      activeTargets ? { label: "Targeted", value: fmtNumber(activeTargets), tone: "attention" } : null,
      Math.abs(budgetDelta) >= 1 ? { label: "Budget", value: fmtSigned(budgetDelta), tone: budgetDelta >= 0 ? "positive" : "negative" } : null,
      Math.abs(flowDelta) >= 1 ? { label: "Flow", value: fmtSigned(flowDelta), tone: flowDelta >= 0 ? "positive" : "negative" } : null,
      { label: "World Pool", value: Math.abs(worldPoolDelta) >= 1 ? fmtSigned(worldPoolDelta) : fmtNumber(worldPool.currentTradeFlow || 0), tone: worldPoolDelta ? worldPoolDelta >= 0 ? "positive" : "negative" : "" },
      { label: "Policy", value: trade.tradePolicy || "Balanced" },
      { label: "Tariff", value: fmtPercent(trade.tariffRate || 0) },
      { label: "Import", value: fmtNumber(trade.importReliance || 0) },
      { label: "Export", value: fmtNumber(trade.exportReliance || 0) },
      { label: "Autarky", value: fmtNumber(trade.autarkyIndex || 0) }
    ].filter(Boolean);

    app.innerHTML = `
      <section class="trade-network-workspace" style="--nation-color:${safeColor(selected.color)}">
        ${tradeMapCanvasHtml(selected, rows, tradeMetrics, worldPool)}
        ${transitThroughHtml(selected, transitRows)}
        ${routeInvestmentHtml(selected)}
        ${tradeGeneratorHtml(selected)}
        <div class="trade-network-table-wrap" data-table-scroll="tradeNetwork">
          <table class="trade-network-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th class="numeric">Imports From</th>
                <th class="numeric">Import Share</th>
                <th class="numeric">Exports To</th>
                <th class="numeric">Export Share</th>
                <th class="numeric">Lane Delta</th>
                <th>Route</th>
                <th>Import Policy</th>
                <th>Transit Access</th>
                <th class="numeric">Tariff Applied</th>
                <th class="numeric">Partner Tariff</th>
                <th>${isAdmin ? "Targeted Tariff" : "Targeted"}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const laneDeltaTone = row.flowDelta >= 0 ? "positive" : "negative";
                const rowClasses = [
                  `lane-size-${tradeNetworkSizeTier(row, impact)}`,
                  row.override !== undefined ? "has-targeted-tariff" : "",
                  row.exportAnchor !== undefined ? "has-export-anchor" : "",
                  row.importAnchor !== undefined ? "has-import-anchor" : "",
                  lanePolicyValue(row.lanePolicy) !== "None" ? "has-lane-policy" : "",
                  row.transitPolicy !== "Open" ? "has-transit-policy" : ""
                ].filter(Boolean).join(" ");
                return `
                  <tr class="${rowClasses}">
                    <td>${nationCell(row.partner.id)}</td>
                    <td class="numeric">${fmtNumber(row.importFlow)}</td>
                    <td>
                      <div class="relationship-control">
                        <span>${fmtPercent(row.importLane?.importerShare || 0)} actual</span>
                        ${importAnchorControl(selected.id, row.partner.id, row.importAnchor)}
                      </div>
                    </td>
                    <td class="numeric">${fmtNumber(row.exportFlow)}</td>
                    <td>
                      <div class="relationship-control">
                        <span>${fmtPercent(row.exportLane?.exporterShare || 0)} actual</span>
                        ${exportAnchorControl(selected.id, row.partner.id, row.exportAnchor)}
                      </div>
                    </td>
                    <td class="numeric"><span class="${laneDeltaTone}">${fmtSigned(row.flowDelta)}</span></td>
                    <td>${routeFactsHtml(row)}</td>
                    <td>${lanePolicyControl(selected.id, row.partner.id, row.lanePolicy)}</td>
                    <td>${transitPolicyControl(selected.id, row.partner.id, row.transitPolicy)}</td>
                    <td class="numeric">${fmtPercent(row.importLane?.tariffRate ?? trade.tariffRate ?? 0)}</td>
                    <td class="numeric">${fmtPercent(row.exportLane?.tariffRate ?? data.trade?.[row.partner.id]?.tariffRate ?? 0)}</td>
                    <td>${targetedTariffControl(selected.id, row.partner.id, row.importLane, row.override)}</td>
                  </tr>`;
              }).join("") : `<tr><td colspan="12" class="empty">No lanes match the current filters.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
    applyTradeMapPanelPosition();
    restoreTableScroll("tradeNetwork");
  }

      return {
        renderTradeNetwork,
        readTradeGeneratorValues,
        tradeGeneratorSettingsFromValues
      };
    }
  };
})();
