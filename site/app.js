(function () {
  const baseData = window.AGGS_DATA;
  const Engine = window.AGGS_ENGINE;
  const AppConfig = window.AGGS_APP_CONFIG;
  const RecordsParser = window.AGGS_RECORDS_PARSER;
  const TradeMap = window.AGGS_TRADE_MAP || {};
  const Format = window.AGGS_APP_FORMAT(Engine);
  const {
    escapeHtml,
    safeText,
    safeColor,
    safeStatus,
    fmtNumber,
    fmtYear,
    fmtCompact,
    fmtDateTime,
    fmtPercent,
    fmtDecimalPercent,
    fmtSigned,
    fmtCost,
    fmtHistoryValue,
    fieldKey,
    isDecimalPercentField,
    editFieldValue,
    historyFieldValue,
    fmtHistoryChangeValue,
    fmtHistoryDelta
  } = Format;
  let data = Engine.load(baseData);
  TradeMap.ensureGeography?.(data);
  Engine.recalculateAll(data);
  const app = document.getElementById("app");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const sourceNote = document.getElementById("sourceNote");
  const sourcePill = document.querySelector(".source-pill");
  const themeToggle = document.getElementById("themeToggle");
  const isAdmin = document.body.dataset.appMode === "admin";
  const THEME_KEY = AppConfig.THEME_KEY;
  const adminOnlyTabs = new Set(AppConfig.adminOnlyTabs);
  const adminOnlyActions = new Set(AppConfig.adminOnlyActions);
  const forceLocalPreview = window.AGGS_DISABLE_SHARED_SYNC === true || location.hostname.endsWith(".pages.dev");
  const sharedSyncEndpoint = window.AGGS_API_URL || (isAdmin ? "/admin/api/state" : "/api/state");
  const sharedSync = {
    enabled: !forceLocalPreview && location.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1"].includes(location.hostname),
    endpoint: sharedSyncEndpoint,
    metaEndpoint: `${sharedSyncEndpoint.replace(/\/$/, "")}/meta`,
    pollMs: 3000,
    revision: null,
    status: "connecting",
    message: "",
    updatedAt: "",
    updatedBy: "",
    snapshots: [],
    snapshotsLoaded: false,
    isLoadingSnapshots: false,
    isPublishing: false,
    hasPendingLocalChange: false,
    publishQueued: false,
    pendingPublishMessage: "",
    publishTimer: null,
    pollTimer: null
  };
  const DISCORD_INVITE_URL = "https://discord.gg/baVd8qVgqB";
  const TRADE_MAP_PANEL_POSITION_KEY = "aggs:trade-map-panel-position:v1";

  const datasets = AppConfig.datasets;
  const viewOptions = AppConfig.viewOptions;
  const economicHealthOptions = AppConfig.economicHealthOptions;
  const statusTableKeys = new Set(AppConfig.statusTableKeys);

  const state = {
    tab: "overview",
    query: "",
    selectedNation: "solara",
    selectedEquipmentDesignId: "",
    equipmentCategoryFilter: "all",
    rosterImportText: "",
    rosterImportPreview: null,
    templateImportText: "",
    sort: {},
    tableScroll: {},
    tradeGenerator: {
      pattern: "concentrated",
      importPrimary: "",
      importPrimaryShare: "",
      importSecondary: "",
      importSecondaryShare: "",
      exportPrimary: "",
      exportPrimaryShare: "",
      exportSecondary: "",
      exportSecondaryShare: ""
    },
    tradeAnchorPreview: null,
    tradeMapLayer: "trade",
    tradeNetworkDirectionFilter: "all",
    tradeNetworkSizeFilter: "all",
    showDetails: false,
    notice: ""
  };
  let tradeMapPanelDrag = null;

  function canAccessTab(tabKey) {
    return isAdmin || !adminOnlyTabs.has(tabKey);
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function updateThemeToggle() {
    if (!themeToggle) return;
    const isDark = currentTheme() === "dark";
    const mode = isDark ? "Dark" : "Light";
    const label = isDark ? "Theme is dark. Switch to light mode." : "Theme is light. Switch to dark mode.";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
    const value = themeToggle.querySelector(".theme-toggle-value");
    if (value) value.textContent = mode;
  }

  function setTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      // Theme persistence is optional; the visual toggle should still work.
    }
    updateThemeToggle();
  }

  function syncLabel(short = false) {
    if (!sharedSync.enabled) return short ? "Local mode" : "Static fallback mode.";
    if (sharedSync.status === "online") {
      return short ? "Live sync online" : `Live sync online${sharedSync.revision ? `, revision ${sharedSync.revision}` : ""}.`;
    }
    if (sharedSync.status === "publishing") return short ? "Publishing" : "Publishing changes to the shared ledger.";
    if (sharedSync.status === "connecting") return short ? "Connecting sync" : "Connecting to the shared ledger.";
    if (sharedSync.status === "ready-empty") return short ? "Ready to publish" : "Shared ledger is ready; publish once from the admin workspace to initialize it.";
    if (sharedSync.status === "offline") return short ? "Sync offline" : "Shared sync is offline; this browser is using its local copy.";
    return short ? "Local mode" : "Local browser fallback.";
  }

  function updateSourceNote() {
    const modeNote = isAdmin
      ? "Admin workspace: edits publish to the live ledger."
      : "Public view: active data is loaded from the live ledger.";
    sourceNote.textContent = `${data.meta.title}. Working year: ${data.meta.currentYear}. ${modeNote} ${syncLabel()}`;
    if (sourcePill) sourcePill.textContent = isAdmin ? `Admin workspace · ${syncLabel(true)}` : `Read-only ledger · ${syncLabel(true)}`;
  }

  tabs.forEach((tab) => {
    tab.hidden = !canAccessTab(tab.dataset.tab);
  });

  updateThemeToggle();
  updateSourceNote();

  function byId(id) {
    return data.nations.find((nation) => nation.id === id);
  }

  function visibleNations() {
    return Engine.visibleNations(data);
  }

  function visibleIds() {
    return Engine.visibleNationIds(data);
  }

  function archivedNations() {
    return Engine.archivedNations(data).sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));
  }

  function isVisibleNation(id) {
    return visibleIds().includes(id);
  }

  function sortedNations() {
    return [...visibleNations()].sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));
  }

  function nationOptionsHtml(selectedId = state.selectedNation, includePlaceholder = false, placeholder = "Select country") {
    const options = includePlaceholder ? [`<option value="">${safeText(placeholder)}</option>`] : [];
    sortedNations().forEach((nation) => {
      options.push(`<option value="${escapeHtml(nation.id)}" ${nation.id === selectedId ? "selected" : ""}>${safeText(nation.name)}</option>`);
    });
    return options.join("");
  }

  function archivedNationOptionsHtml(selectedId = "", includePlaceholder = true, placeholder = "Select archived country") {
    const options = includePlaceholder ? [`<option value="">${safeText(placeholder)}</option>`] : [];
    archivedNations().forEach((nation) => {
      options.push(`<option value="${escapeHtml(nation.id)}" ${nation.id === selectedId ? "selected" : ""}>${safeText(nation.name)}</option>`);
    });
    return options.join("");
  }

  function syncNationSelects() {
    document.querySelectorAll("[data-nation-select]").forEach((select) => {
      if (select.value !== state.selectedNation) select.value = state.selectedNation;
    });
  }

  function scrollToPageTop() {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function renderPreservingPageScroll() {
    const left = window.scrollX || window.pageXOffset || 0;
    const top = window.scrollY || window.pageYOffset || 0;
    render();
    requestAnimationFrame(() => window.scrollTo(left, top));
  }

  function readTradeMapPanelPosition() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TRADE_MAP_PANEL_POSITION_KEY) || "null");
      if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) return parsed;
    } catch (error) {
      // Panel drag persistence is optional.
    }
    return null;
  }

  function writeTradeMapPanelPosition(position) {
    try {
      localStorage.setItem(TRADE_MAP_PANEL_POSITION_KEY, JSON.stringify({
        x: Math.round(position.x),
        y: Math.round(position.y)
      }));
    } catch (error) {
      // Panel drag persistence is optional.
    }
  }

  function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clampTradeMapPanelPosition(stage, panel, position) {
    const margin = 12;
    const maxX = Math.max(margin, stage.clientWidth - panel.offsetWidth - margin);
    const maxY = Math.max(margin, stage.clientHeight - panel.offsetHeight - margin);
    return {
      x: clampValue(position.x, margin, maxX),
      y: clampValue(position.y, margin, maxY)
    };
  }

  function setTradeMapPanelPosition(stage, panel, position, persist = false) {
    const clamped = clampTradeMapPanelPosition(stage, panel, position);
    panel.style.left = `${clamped.x}px`;
    panel.style.top = `${clamped.y}px`;
    panel.style.right = "auto";
    if (persist) writeTradeMapPanelPosition(clamped);
    return clamped;
  }

  function applyTradeMapPanelPosition() {
    const stage = app.querySelector(".trade-map-stage");
    const panel = app.querySelector(".trade-map-inspector");
    if (!stage || !panel) return;
    const saved = readTradeMapPanelPosition();
    if (!saved) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      return;
    }
    setTradeMapPanelPosition(stage, panel, saved, true);
  }

  function ensureSelectedNation() {
    const active = visibleNations();
    if (!active.some((nation) => nation.id === state.selectedNation)) {
      state.selectedNation = active[0]?.id || "";
    }
    syncNationSelects();
  }

  function populateNationSelect() {
    ensureSelectedNation();
  }

  function populationFor(id, year = data.meta.currentYear) {
    return Engine.getPopulation(data, id, year);
  }

  const syncController = window.AGGS_APP_MODULES.createSyncController({
    getData: () => data,
    setData: (nextData) => {
      data = nextData;
    },
    baseData,
    Engine,
    TradeMap,
    sharedSync,
    state,
    isAdmin,
    updateSourceNote,
    render,
    ensureSelectedNation,
    populateNationSelect,
    clearPendingChanges: () => {
      clearPendingEditDraft();
      pendingEdits.clear();
    }
  });
  const {
    persistenceSnapshot,
    saveLedger,
    saveWorkingState,
    resetWorkingState,
    downloadText,
    markSync,
    fetchSharedState,
    fetchSnapshots,
    revertSelectedSnapshot,
    exportSelectedSnapshot,
    scheduleSharedPublish,
    publishSharedState,
    startSharedSync
  } = syncController;

  function nationCell(id) {
    if (!id) return `<span class="nation-cell">Global Ledger</span>`;
    const nation = byId(id);
    if (!nation) return safeText(id);
    return `<span class="nation-cell"><span class="swatch" style="background:${safeColor(nation.color)}"></span>${safeText(nation.name)}</span>`;
  }

  function coverageFor(id) {
    return datasets.map((set) => ({
      ...set,
      hasData: Boolean(data[set.key] && data[set.key][id])
    }));
  }

  function coverageHtml(id) {
    return `<div class="coverage">${coverageFor(id)
      .map((set) => `<span class="${set.hasData ? "has-data" : ""}">${safeText(set.label)}</span>`)
      .join("")}</div>`;
  }

  function filteredNations() {
    const q = state.query.trim().toLowerCase();
    const active = visibleNations();
    if (!q) return active;
    if (["missing data", "coverage gaps", "incomplete"].some((term) => q.includes(term))) {
      return active.filter((nation) => coverageFor(nation.id).some((set) => !set.hasData));
    }
    return active.filter((nation) => {
      const haystack = [
        nation.name,
        `${coverageFor(nation.id).filter((set) => set.hasData).length}/${datasets.length}`,
        data.national[nation.id]?.economicHealth,
        data.trade[nation.id]?.tradePolicy,
        data.industrial[nation.id]?.mobilizationLevel,
        data.population[nation.id]?.mandatoryChildPolicy,
        data.eclipse[nation.id]?.eclipseStatus,
        data.elections[nation.id]?.leaderElections,
        data.elections[nation.id]?.parliamentElections
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function sumValues(object, getter) {
    return visibleIds().reduce((total, id) => {
      const row = object?.[id];
      if (!row) return total;
      return total + (Number(getter(row, id)) || 0);
    }, 0);
  }

  function activeMilitary(military) {
    if (!military) return null;
    return ["combatPersonnel", "supportPersonnel", "airForcePersonnel", "navalPersonnel", "paramilitaryIrregular"].reduce(
      (total, key) => total + (Number(military[key]) || 0),
      0
    );
  }

  function renderMetric(label, value, subtext) {
    return `<article class="metric"><span>${safeText(label)}</span><strong>${safeText(value)}</strong><small>${safeText(subtext)}</small></article>`;
  }

  function overviewFact(label, value) {
    return `<div class="overview-fact"><span>${safeText(label)}</span><strong>${safeText(value)}</strong></div>`;
  }

  function statusViewOptions() {
    return viewOptions
      .filter((view) => statusTableKeys.has(view.key) && (isAdmin || !view.adminOnly))
      .sort((left, right) => left.label.localeCompare(right.label, "en", { sensitivity: "base" }));
  }

  function renderContextToolbar() {
    if (state.query) state.query = "";
  }

  function statusViewSelectHtml(activeKey) {
    return `
      <label class="select-shell table-view-shell">
        <span>Status Table</span>
        <select data-view-select>
          ${statusViewOptions().map((view) => `<option value="${escapeHtml(view.key)}" ${view.key === activeKey ? "selected" : ""}>${safeText(view.label)}</option>`).join("")}
        </select>
      </label>`;
  }

  function renderOverviewHero(currentYear, active, totals) {
    const revision = sharedSync.revision ? `#${sharedSync.revision}` : syncLabel(true);

    return `
      <section class="overview-hero">
        <div class="overview-identity">
          <span class="section-kicker">Global Year State</span>
          <h2>${fmtYear(currentYear)}</h2>
          <p>${safeText(fmtNumber(active.length))} active nations / ${safeText(fmtCompact(totals.population))} population / ${safeText(fmtCompact(totals.tradeFlow))} trade flow</p>
        </div>
        <div class="overview-facts" aria-label="Ledger state">
          ${overviewFact("Revision", revision)}
          ${overviewFact("Updated", fmtDateTime(data.meta.updatedAt || sharedSync.updatedAt))}
          ${overviewFact("Fleet", fmtNumber(totals.fleet))}
          ${overviewFact("Personnel", fmtCompact(totals.activePersonnel))}
        </div>
        <aside class="community-card" aria-labelledby="community-title">
          <span class="section-kicker">Join the roleplay</span>
          <h2 id="community-title">Create a nation, follow global events, and join the AG-GS Discord.</h2>
          <p>The public ledger shows the world state. Discord is where diplomacy, claims, events, and nation planning happen.</p>
          <a class="community-card-link" href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener noreferrer">Join Discord</a>
        </aside>
      </section>`;
  }

  function sortLabel(sort, column) {
    if (sort.key !== column.key) return "";
    return `<span aria-hidden="true">${sort.dir === "asc" ? " ↑" : " ↓"}</span>`;
  }

  function topList(title, source, getter, formatter, limit = 6) {
    const rows = visibleNations()
      .map((nation) => ({ nation, value: getter(nation.id) }))
      .filter((row) => row.value !== null && row.value !== undefined)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>${safeText(title)}</h2>
            <p>${safeText(source)}</p>
          </div>
        </div>
        <div class="leaderboard-list">
          ${rows
            .map(
              ({ nation, value }, index) => `
                <div class="leaderboard-row" style="--nation-color:${safeColor(nation.color)}">
                  <span class="leaderboard-rank">${index + 1}</span>
                  <span class="leaderboard-name"><span class="leaderboard-label">${safeText(nation.name)}</span></span>
                  <span class="leaderboard-value">${safeText(formatter(value))}</span>
                </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  function renderOverview() {
    const currentYear = data.meta.currentYear;
    const active = visibleNations();
    const totalPopulation = active.reduce((total, nation) => total + populationFor(nation.id, currentYear), 0);
    const totalBudget = sumValues(data.national, (row) => row.budgetCapacity);
    const totalTradeFlow = sumValues(data.trade, (row) => row.tradeFlow);
    const totalActive = sumValues(data.military, (row) => activeMilitary(row));
    const totalFleet = sumValues(data.naval, (row) => row.total);
    const totals = {
      population: totalPopulation,
      budget: totalBudget,
      tradeFlow: totalTradeFlow,
      activePersonnel: totalActive,
      fleet: totalFleet
    };

    app.innerHTML = `
      ${renderOverviewHero(currentYear, active, totals)}
      <section class="dashboard-grid overview-metrics">
        ${renderMetric("Active Nations", fmtNumber(active.length), "Countries currently shown in the ledger")}
        ${renderMetric(`${currentYear} Population`, fmtCompact(totalPopulation), "Combined active population")}
        ${renderMetric("Budget Capacity", fmtNumber(totalBudget), "Combined national budget capacity")}
        ${renderMetric("Fleet Inventory", fmtNumber(totalFleet), "Tracked naval assets")}
        ${renderMetric("Trade Flow", fmtCompact(totalTradeFlow), "Aggregate active trade flow")}
        ${renderMetric("Active Personnel", fmtCompact(totalActive), "Combat, support, air, naval, irregular")}
        ${renderMetric("National Profiles", fmtNumber(active.filter((nation) => data.national[nation.id]).length), "Active records with national data")}
        ${renderMetric("Coverage Gaps", fmtNumber(auditRows().filter((row) => row.missing.length).length), "Active nations missing a dataset")}
      </section>
      <div class="overview-panels">
        ${topList("Largest Populations", `Population (${currentYear})`, dataId => populationFor(dataId, currentYear), fmtCompact)}
        ${topList("Budget Capacity", "National Status", dataId => data.national[dataId]?.budgetCapacity, fmtNumber)}
      </div>
      <div class="overview-panels">
        ${topList("Trade Flow", "Trade Status", dataId => data.trade[dataId]?.tradeFlow, fmtCompact)}
        ${topList("Active Military Personnel", "Military Status", dataId => activeMilitary(data.military[dataId]), fmtCompact)}
      </div>
    `;
  }

  function tablePanel(title, subtitle, rows, columns, id) {
    const isStatusTable = statusTableKeys.has(id);
    if (!rows.length) {
      app.innerHTML = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>${safeText(title)}</h2>
              <p>${safeText(subtitle)}</p>
            </div>
            ${isStatusTable ? `<div class="panel-actions">${statusViewSelectHtml(id)}</div>` : ""}
          </div>
          <div class="empty">No rows are available.</div>
        </section>`;
      return;
    }

    const hasSecondaryColumns = columns.some((column) => column.secondary);
    const visibleColumns = columns.filter((column) => !column.secondary || state.showDetails);
    let sort = state.sort[id] || { key: visibleColumns[0].key, dir: "asc" };
    if (!visibleColumns.some((column) => column.key === sort.key)) sort = { key: visibleColumns[0].key, dir: "asc" };
    const col = columns.find((column) => column.key === sort.key) || visibleColumns[0];
    const sortedRows = [...rows].sort((a, b) => {
      const left = col.raw ? col.raw(a) : a[col.key];
      const right = col.raw ? col.raw(b) : b[col.key];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left ?? "").localeCompare(String(right ?? ""));
      return sort.dir === "asc" ? result : -result;
    });

    app.innerHTML = `
      <section class="panel ${isStatusTable ? "status-table-panel" : ""}">
        <div class="panel-head">
          <div>
            <h2>${safeText(title)}</h2>
            <p>${safeText(subtitle)}</p>
          </div>
          <div class="panel-actions">
            ${isStatusTable ? statusViewSelectHtml(id) : ""}
            ${hasSecondaryColumns ? `<button class="command compact ${state.showDetails ? "is-active" : ""}" type="button" data-action="toggle-detail-columns">${state.showDetails ? "Focused Columns" : "Detailed Columns"}</button>` : ""}
            <span class="status">${fmtNumber(sortedRows.length)} rows</span>
          </div>
        </div>
        <div class="table-wrap ${isStatusTable ? "status-table-wrap" : ""}" data-table-scroll="${escapeHtml(id)}">
          <table>
            <thead>
              <tr>
                ${visibleColumns
                  .map(
                    (column) =>
                      `<th class="${column.numeric ? "numeric" : ""}" data-table="${escapeHtml(id)}" data-key="${escapeHtml(column.key)}">${safeText(column.label)}${sortLabel(sort, column)}</th>`
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${sortedRows
                .map(
                  (row) => `
                    <tr>
                      ${visibleColumns
                        .map((column) => {
                          const value = column.raw ? column.raw(row) : row[column.key];
                          const rendered = column.render ? column.render(value, row) : safeText(value);
                          return `<td class="${column.numeric ? "numeric" : ""}">${rendered}</td>`;
                        })
                        .join("")}
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${hasSecondaryColumns && !state.showDetails ? `<div class="table-note">Showing the most-used columns. Use Detailed Columns for the full ledger view.</div>` : ""}
      </section>
    `;
    restoreTableScroll(id);
  }

  function rememberTableScroll(id, element) {
    if (!id || !element) return;
    state.tableScroll[id] = {
      left: element.scrollLeft,
      top: element.scrollTop
    };
  }

  function rememberVisibleTableScroll() {
    const tableWrap = app.querySelector("[data-table-scroll]");
    if (tableWrap) rememberTableScroll(tableWrap.dataset.tableScroll, tableWrap);
  }

  function restoreTableScroll(id) {
    const saved = state.tableScroll[id];
    if (!saved) return;
    requestAnimationFrame(() => {
      const tableWrap = Array.from(app.querySelectorAll("[data-table-scroll]")).find((element) => element.dataset.tableScroll === id);
      if (!tableWrap) return;
      tableWrap.scrollLeft = saved.left || 0;
      tableWrap.scrollTop = saved.top || 0;
    });
  }

  function tableRowsFor(datasetKey) {
    return filteredNations()
      .filter((nation) => data[datasetKey][nation.id])
      .map((nation) => ({ id: nation.id, nation: nation.name, ...data[datasetKey][nation.id] }));
  }

  const statusTableViews = window.AGGS_APP_MODULES.createStatusTableViews({
    getData: () => data,
    filteredNations,
    tablePanel,
    tableRowsFor,
    nationCell,
    activeMilitary,
    safeText,
    safeStatus,
    fmtNumber,
    fmtPercent,
    fmtDecimalPercent,
    fmtSigned
  });
  const {
    renderNational,
    renderTrade,
    renderIndustrial,
    renderPopulation,
    renderMilitary,
    renderIntelligence,
    renderEclipse,
    renderElections
  } = statusTableViews;

  const tradeView = window.AGGS_APP_MODULES.createTradeView({
    getData: () => data,
    app,
    state,
    isAdmin,
    Engine,
    TradeMap,
    byId,
    sortedNations,
    nationOptionsHtml,
    applyTradeMapPanelPosition,
    restoreTableScroll,
    nationCell,
    safeText,
    safeColor,
    escapeHtml,
    fmtNumber,
    fmtPercent,
    fmtCompact,
    fmtSigned
  });
  const {
    renderTradeNetwork,
    readTradeGeneratorValues,
    tradeGeneratorSettingsFromValues
  } = tradeView;

  function pipelineStep(number, title, description) {
    return `
      <article class="pipeline-step">
        <span>${safeText(number)}</span>
        <div>
          <h3>${safeText(title)}</h3>
          <p>${safeText(description)}</p>
        </div>
      </article>`;
  }

  function taxBurdenTone(tier = "") {
    if (tier === "Crisis" || tier === "Volatile") return "negative";
    if (tier === "Agitated" || tier === "Strained") return "warning";
    return "positive";
  }

  function taxBurdenRows() {
    return visibleNations()
      .map((nation) => ({ nation, burden: Engine.calculateTaxBurdenForNation(data, nation.id) }))
      .filter((row) => row.burden)
      .sort((left, right) => Engine.number(right.burden.pressureScore, 0) - Engine.number(left.burden.pressureScore, 0));
  }

  function renderTaxBurdenWatchlist(rows) {
    const watchRows = rows
      .filter((row) => Engine.number(row.burden.taxPressure, 0) > 0 || Engine.number(row.burden.suggestedUnrestChange, 0) > 0)
      .slice(0, 6);
    return `
      <section class="panel tax-burden-watchlist gm-warning-center">
        <div class="tax-burden-watchlist-head">
          <div>
            <strong>GM Tax Burden Warnings</strong>
            <span>Public unrest remains GM-controlled. Apply recommendations per nation, capped at 10.</span>
          </div>
          <div class="tax-burden-actions">
            <span class="status ${watchRows.length ? "warning" : "positive"}">${watchRows.length ? `${fmtNumber(watchRows.length)} watch` : "Stable"}</span>
          </div>
        </div>
        ${watchRows.length ? `
          <div class="tax-burden-grid">
            ${watchRows.map(({ nation, burden }) => {
              const suggestedUnrest = Engine.number(burden.suggestedUnrestChange, 0);
              return `
                <article class="tax-burden-card">
                  <div class="tax-burden-title">
                    <span class="swatch" style="background:${safeColor(nation.color)}"></span>
                    <strong>${safeText(nation.name)}</strong>
                    ${safeStatus(burden.tier, taxBurdenTone(burden.tier))}
                  </div>
                  <dl>
                    <div><dt>Tax</dt><dd>${fmtPercent(burden.taxRatePercent)}</dd></div>
                    <div><dt>Sustainable</dt><dd>${fmtPercent(burden.sustainableTaxRate)}</dd></div>
                    <div><dt>GM unrest</dt><dd>${suggestedUnrest ? `+${fmtNumber(suggestedUnrest)}` : "Hold"}</dd></div>
                    <div><dt>Model</dt><dd>${safeText(burden.fiscalModel || "Standard")}</dd></div>
                  </dl>
                  <p>${safeText((burden.warnings || [])[0] || "No warning text recorded.")}</p>
                  <div class="tax-burden-card-actions">
                    <button class="command accent compact" type="button" data-action="apply-tax-unrest" data-nation-id="${safeText(nation.id)}" ${suggestedUnrest ? "" : "disabled"}>${suggestedUnrest ? `Apply +${fmtNumber(suggestedUnrest)}` : "No Action"}</button>
                  </div>
                </article>`;
            }).join("")}
          </div>` : `<div class="empty compact-empty">No active tax pressure warnings for the current ledger.</div>`}
      </section>`;
  }

  function applyRecommendedTaxUnrest(nationId = "") {
    const rows = taxBurdenRows()
      .filter((row) => !nationId || row.nation.id === nationId)
      .filter((row) => Engine.number(row.burden.suggestedUnrestChange, 0) > 0)
      .map((row) => {
        const national = data.national[row.nation.id] || {};
        const beforeValue = Engine.number(national.publicUnrest, 0);
        const delta = Engine.number(row.burden.suggestedUnrestChange, 0);
        return {
          nation: row.nation,
          beforeValue,
          afterValue: Math.min(10, beforeValue + delta),
          beforeSnapshot: nationSnapshot(data, row.nation.id)
        };
      })
      .filter((row) => row.afterValue > row.beforeValue);

    if (!rows.length) {
      state.notice = "No recommended unrest changes are pending.";
      render();
      return;
    }

    if (!nationId) {
      const ok = window.confirm(`Apply recommended unrest to ${fmtNumber(rows.length)} nations?`);
      if (!ok) return;
    }

    rows.forEach((row) => {
      data.national[row.nation.id].publicUnrest = row.afterValue;
    });
    Engine.recalculateAll(data);

    const changedAt = new Date().toISOString();
    const entries = rows.map((row) => {
      const changes = snapshotChanges(row.beforeSnapshot, nationSnapshot(data, row.nation.id));
      return {
        key: `tax-unrest:${row.nation.id}:${Date.now()}`,
        nationId: row.nation.id,
        nationName: row.nation.name,
        dataset: "national",
        field: "publicUnrest",
        label: "Applied Tax Burden Unrest",
        beforeValue: row.beforeValue,
        afterValue: row.afterValue,
        changedAt,
        changes,
        deltas: changes.filter((change) => change.numeric && change.delta !== 0)
      };
    });
    data.meta.changeHistory = [...entries, ...(data.meta.changeHistory || [])].slice(0, 60);
    saveWorkingState(nationId
      ? `Applied recommended unrest to ${rows[0].nation.name}.`
      : `Applied recommended unrest to ${fmtNumber(rows.length)} nations.`);
  }

  function renderSimulation() {
    const currentYear = Number(data.meta.currentYear) || 2021;
    const snapshot = Engine.snapshot(data, currentYear);
    const log = data.meta.lastSimulationLog || [];
    const targetYear = currentYear + 1;
    app.innerHTML = `
      <section class="panel simulation-cockpit">
        <div class="simulation-hero">
          <div>
            <span class="section-kicker">Simulation Cockpit</span>
            <h2><span class="sim-year" data-sim-current-year>${fmtYear(currentYear)}</span> <span class="sim-year-separator" aria-hidden="true">to</span> <span class="sim-year" data-sim-target-year>${fmtYear(targetYear)}</span></h2>
            <p>${fmtNumber(visibleNations().length)} active nations / <span data-sim-world-economy>${safeText(data.meta.worldEconomicHealth || "Expansion")}</span> world economy</p>
          </div>
          ${state.notice ? `<span class="status positive">${safeText(state.notice)}</span>` : ""}
        </div>
        <div class="simulation-grid">
          <div class="simulation-snapshot">
            ${dossierMetric("Population", fmtCompact(snapshot.totalPopulation), `Total in ${currentYear}`)}
            ${dossierMetric("Budget Capacity", fmtNumber(snapshot.budgetCapacity), "Current calculation")}
            ${dossierMetric("Trade Flow", fmtCompact(snapshot.tradeFlow), fmtNumber(snapshot.tradeFlow))}
            ${dossierMetric("Average Supply", fmtPercent(snapshot.militarySupplyAverage), "Military readiness")}
          </div>
          <div class="simulation-control-surface">
            <div class="simulation-control-head">
              <h3>Run Controls</h3>
            </div>
            <div class="simulation-control-grid">
              <label class="control-field">
                <span>Current Year</span>
                <input type="number" id="currentYearInput" value="${currentYear}" min="1">
              </label>
              <label class="control-field">
                <span>Target Year</span>
                <input type="number" id="targetYearInput" value="${targetYear}" min="${targetYear}">
              </label>
              <label class="control-field">
                <span>World Economy</span>
                <select id="worldHealthInput">
                  ${["Prosperity", "Expansion", "Recovery", "Slowdown", "Recession", "Depression"].map((option) => `<option ${data.meta.worldEconomicHealth === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="simulation-actions">
              <div class="simulation-action-group simulation-action-run">
                <button class="command primary" type="button" data-action="advance-one">Advance 1 Year</button>
                <button class="command primary" type="button" data-action="advance-target">Simulate To Target</button>
                <button class="command" type="button" data-action="recalculate">Recalculate Current Year</button>
              </div>
              <div class="simulation-action-group simulation-action-maintenance">
                <button class="command" type="button" data-action="publish-live-state">Publish Live State</button>
                <button class="command danger" type="button" data-action="reset-state">Reload Live State</button>
              </div>
              <div class="simulation-action-group simulation-action-export">
                <button class="command" type="button" data-action="export-json">Export JSON</button>
                <button class="command" type="button" data-action="export-data-js">Export data.js</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      ${renderTaxBurdenWatchlist(taxBurdenRows())}
      <section class="panel simulation-pipeline">
        <div class="panel-head compact-head">
          <div>
            <h2>Calculation Pipeline</h2>
            <p>Yearly updates run in order across the active ledger.</p>
          </div>
        </div>
        <div class="pipeline-grid">
          ${pipelineStep("01", "Population", "Demographics and child policy")}
          ${pipelineStep("02", "Trade", "Reliance, balance, flow, impact")}
          ${pipelineStep("03", "Industry", "Factories, shipyards, capacity")}
          ${pipelineStep("04", "Budget", "Capacity, expenditure, debt")}
          ${pipelineStep("05", "Supply", "Twelve monthly production passes")}
        </div>
      </section>
      <section class="panel simulation-log-panel">
        <div class="panel-head">
          <div>
            <h2>Simulation Log</h2>
            <p>${log.length ? `${fmtNumber(log.length)} yearly entries from the most recent run.` : "Current snapshot only."}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="simulation-log-table">
            <thead><tr><th class="numeric">Year</th><th class="numeric">Population</th><th class="numeric">Budget Capacity</th><th class="numeric">Trade Flow</th><th class="numeric">Avg Supply</th></tr></thead>
            <tbody>
              ${(log.length ? log : [snapshot]).map((row) => `<tr><td class="numeric">${fmtYear(row.year)}</td><td class="numeric">${fmtNumber(row.totalPopulation)}</td><td class="numeric">${fmtNumber(row.budgetCapacity)}</td><td class="numeric">${fmtNumber(row.tradeFlow)}</td><td class="numeric">${fmtPercent(row.militarySupplyAverage)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function updateSimulationPreview(sourceId = "") {
    if (state.tab !== "simulation") return;
    const currentInput = document.getElementById("currentYearInput");
    const targetInput = document.getElementById("targetYearInput");
    const worldHealthInput = document.getElementById("worldHealthInput");
    if (!currentInput || !targetInput) return;

    const currentYear = Math.max(1, Math.trunc(Engine.number(currentInput.value, data.meta.currentYear)));
    let targetYear = Math.trunc(Engine.number(targetInput.value, currentYear + 1));
    const minimumTarget = currentYear + 1;
    targetInput.min = String(minimumTarget);
    if (sourceId === "currentYearInput" && targetYear <= currentYear) {
      targetYear = minimumTarget;
      targetInput.value = String(targetYear);
    }

    const currentLabel = document.querySelector("[data-sim-current-year]");
    const targetLabel = document.querySelector("[data-sim-target-year]");
    const economyLabel = document.querySelector("[data-sim-world-economy]");
    if (currentLabel) currentLabel.textContent = fmtYear(currentYear);
    if (targetLabel) targetLabel.textContent = fmtYear(targetYear);
    if (economyLabel && worldHealthInput) economyLabel.textContent = worldHealthInput.value || "Expansion";
  }

  const editorView = window.AGGS_APP_MODULES.createEditorView({
    getData: () => data,
    app,
    state,
    Engine,
    isAdmin,
    datasets,
    economicHealthOptions,
    byId,
    visibleNations,
    archivedNations,
    coverageFor,
    nationOptionsHtml,
    archivedNationOptionsHtml,
    populationFor,
    ensureSelectedNation,
    populateNationSelect,
    updateSourceNote,
    saveLedger,
    scheduleSharedPublish,
    render,
    syncLabel,
    overviewFact,
    changeHistoryRows,
    renderChangeBadge,
    renderChangeHistoryPanel,
    detailItem,
    fieldKey,
    editFieldValue,
    safeText,
    safeColor,
    escapeHtml,
    fmtNumber,
    fmtPercent,
    fmtCompact,
    fmtSigned
  });
  const {
    renderEditor,
    createNationFromEditor,
    archiveSelectedNationFromEditor,
    restoreArchivedNationFromEditor,
    fieldControl
  } = editorView;

  function detailItem(label, value) {
    return `<div class="detail-item"><span>${safeText(label)}</span><strong>${safeText(value)}</strong></div>`;
  }

  function readFieldValue(source, dataset, id, path) {
    if (dataset === "population") {
      const row = source.population?.[id];
      return path === "mandatoryChildPolicy" ? row?.mandatoryChildPolicy : row?.values?.[path];
    }
    const row = source[dataset]?.[id];
    if (!row) return undefined;
    if (!path.includes(".")) return row[path];
    return path.split(".").reduce((target, segment) => target?.[segment], row);
  }

  function fieldLabel(dataset, path) {
    const labels = {
      budgetCapacity: "Budget Capacity",
      primaryBalance: "Primary Balance",
      budgetBalance: "Effective Balance",
      treasuryReserve: "Treasury Reserve",
      treasuryDeposit: "Treasury Reserve Deposit",
      deficitBeforeReserve: "Deficit Before Reserve",
      treasuryDrawdown: "Treasury Reserve Drawdown",
      treasuryChange: "Treasury Reserve Change",
      debtPrincipal: "Debt Principal",
      debtService: "Debt Service",
      computedInterestRate: "Modeled Interest",
      interestRateAdjustment: "Manual Interest Adjustment",
      interestRate: "Market Interest",
      debtServiceRate: "Debt Service Rate",
      debtRepayment: "Debt Repayment",
      deficitBorrowing: "Deficit Borrowing",
      debtChange: "Debt Change",
      projectedDebt: "Projected Debt",
      projectedDebtPrincipal: "Projected Debt Principal",
      projectedDebtServiceRate: "Projected Debt Service Rate",
      projectedTreasuryReserve: "Projected Treasury Reserve",
      maxDebtPaydown: "Debt Paydown Cap",
      repaymentShareLimit: "Surplus Repayment Limit",
      debtRisk: "Debt Risk",
      stabilityRisk: "Stability Risk",
      healthRisk: "Health Risk",
      corruptionRisk: "Corruption Risk",
      deficitRisk: "Deficit Risk",
      sanctionsRisk: "Trade Restriction Risk",
      mobilizationRisk: "Mobilization Risk",
      tradeBalanceRisk: "Trade Balance Risk",
      debtTrendRisk: "Debt Trend Risk",
      tradeBalance: "Trade Balance",
      tradeFlow: "Trade Flow",
      tradeCapacity: "Trade Capacity",
      economicImpactScore: "Economic Impact",
      governmentalStability: "Stability",
      publicUnrest: "Public Unrest",
      warSupport: "War Support",
      corruption: "Corruption",
      developmentLevel: "Development",
      fiscalModel: "Fiscal Model",
      budgetExpenditure: "Expenditure",
      debt: "Debt",
      economicHealth: "Economic Health",
      immigrationRate: "Immigration",
      taxRate: "Tax Rate",
      importReliance: "Import Reliance",
      exportReliance: "Export Reliance",
      economicTradeDiversity: "Diversity",
      autarkyIndex: "Autarky",
      tradePolicy: "Trade Policy",
      sanctionsLevel: "Legacy Trade Restriction",
      tariffRate: "Tariff",
      civilianFactories: "Civilian Factories",
      militaryFactories: "Military Factories",
      militarySupply: "Military Supply",
      militaryOrganization: "Military Organization",
      equipmentComplexity: "Equipment Complexity",
      cyberSecurity: "Cyber Security",
      combatPersonnel: "Combat Personnel",
      supportPersonnel: "Support Personnel",
      airForcePersonnel: "Air Force Personnel",
      navalPersonnel: "Naval Personnel",
      reserveForces: "Reserve Forces",
      paramilitaryIrregular: "Paramilitary",
      mobilizationLevel: "Mobilization",
      mandatoryChildPolicy: "Child Policy",
      humint: "HUMINT",
      sigint: "SIGINT",
      counterintelligence: "Counterintelligence",
      covertAction: "Covert Action",
      analysisDoctrine: "Analysis & Doctrine",
      globalReach: "Global Reach",
      internalSurveillance: "Internal Surveillance",
      secrecyDenial: "Secrecy & Denial",
      eclipseStatus: "Eclipse Status",
      leaderElections: "Leader Elections",
      parliamentElections: "Parliament Elections"
    };
    if (dataset === "population" && /^\d+$/.test(path)) return `Population (${path})`;
    return labels[path] || path.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  }

  function datasetLabel(dataset) {
    const labels = {
      national: "National",
      trade: "Trade",
      industrial: "Industrial",
      population: "Population",
      military: "Military",
      intelligence: "Intelligence",
      eclipse: "Eclipse",
      elections: "Elections",
      naval: "Naval"
    };
    return labels[dataset] || dataset;
  }

  function flattenRecord(value, prefix = "", output = {}) {
    if (value === null || value === undefined) {
      if (prefix) output[prefix] = value;
      return output;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => flattenRecord(item, prefix ? `${prefix}.${index}` : String(index), output));
      if (!value.length && prefix) output[prefix] = [];
      return output;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => flattenRecord(child, prefix ? `${prefix}.${key}` : key, output));
      if (!Object.keys(value).length && prefix) output[prefix] = {};
      return output;
    }
    output[prefix] = value;
    return output;
  }

  function nationSnapshot(source, id) {
    const datasetsToTrack = ["national", "trade", "industrial", "population", "military", "intelligence", "eclipse", "elections", "naval"];
    return datasetsToTrack.reduce((snapshot, dataset) => {
      const row = source[dataset]?.[id];
      if (row !== undefined) flattenRecord(row, dataset, snapshot);
      return snapshot;
    }, {});
  }

  const internalChangeKeys = new Set([
    "national.computedInterestRate",
    "national.interestRateAdjustment",
    "national.projectedDebtServiceRate",
    "national.debtRisk",
    "national.stabilityRisk",
    "national.healthRisk",
    "national.corruptionRisk",
    "national.deficitRisk",
    "national.sanctionsRisk",
    "national.mobilizationRisk",
    "national.tradeBalanceRisk",
    "national.debtTrendRisk",
    "national.repaymentShareLimit",
    "national.treasuryDeposit",
    "national.deficitBeforeReserve",
    "national.treasuryDrawdown",
    "national.treasuryChange",
    "national.projectedTreasuryReserve"
  ]);

  function valuesMatch(left, right) {
    if (left === right) return true;
    const leftNumber = Engine.number(left, NaN);
    const rightNumber = Engine.number(right, NaN);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return Math.abs(leftNumber - rightNumber) < 0.000001;
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function changeLabelForKey(key) {
    const [dataset, ...segments] = key.split(".");
    if (dataset === "population" && segments[0] === "values" && segments[1]) return `${datasetLabel(dataset)} / ${fieldLabel(dataset, segments[1])}`;
    return `${datasetLabel(dataset)} / ${fieldLabel(dataset, segments.join("."))}`;
  }

  function snapshotChanges(before, after) {
    return Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]))
      .filter((key) => !internalChangeKeys.has(key))
      .filter((key) => !valuesMatch(before?.[key], after?.[key]))
      .map((key) => {
        const beforeValue = before?.[key];
        const afterValue = after?.[key];
        const beforeNumber = Engine.number(beforeValue, NaN);
        const afterNumber = Engine.number(afterValue, NaN);
        const numeric = Number.isFinite(beforeNumber) && Number.isFinite(afterNumber);
        return {
          key,
          label: changeLabelForKey(key),
          before: beforeValue,
          after: afterValue,
          numeric,
          delta: numeric ? afterNumber - beforeNumber : null
        };
      });
  }

  function renderChangeBadge(change) {
    const beforeNumber = Engine.number(change.before, NaN);
    const afterNumber = Engine.number(change.after, NaN);
    const storedDelta = change.delta !== null && change.delta !== undefined && Number.isFinite(Number(change.delta))
      ? Number(change.delta)
      : null;
    const computedDelta = storedDelta ?? (Number.isFinite(beforeNumber) && Number.isFinite(afterNumber) ? afterNumber - beforeNumber : null);
    const signed = computedDelta !== null && computedDelta !== 0;
    const valueText = signed
      ? `${fmtHistoryDelta(change.key, computedDelta)} (${fmtHistoryChangeValue(change.key, change.before)} -> ${fmtHistoryChangeValue(change.key, change.after)})`
      : `${fmtHistoryChangeValue(change.key, change.before)} -> ${fmtHistoryChangeValue(change.key, change.after)}`;
    const tone = signed ? (computedDelta >= 0 ? "positive" : "negative") : "";
    return `<span class="status ${tone}">${escapeHtml(change.label)} ${escapeHtml(valueText)}</span>`;
  }

  function changeHistoryRows(idFilter = "", limit = 12) {
    return (data.meta.changeHistory || [])
      .filter((entry) => !idFilter || entry.nationId === idFilter)
      .slice(0, limit);
  }

  function historyTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function renderChangeHistoryPanel(idFilter = "", limit = 8) {
    const rows = changeHistoryRows(idFilter, limit);
    return `
      <section class="panel change-history-panel">
        <div class="panel-head">
          <div>
            <h2>Change History</h2>
            <p>Recent admin edits and visible outcomes after recalculation.</p>
          </div>
        </div>
        ${rows.length ? `
          <div class="history-list" role="table" aria-label="Change history">
            <div class="history-list-head" role="row">
              <span>Time</span>
              <span>Nation</span>
              <span>Edit</span>
              <span>Value</span>
              <span>Impact</span>
            </div>
            ${rows.map((entry) => {
              const impacts = (entry.changes || entry.deltas || []).filter((change) => !internalChangeKeys.has(change.key));
              return `
                <article class="history-list-row" role="row">
                  <div class="history-time" role="cell">${historyTime(entry.changedAt)}</div>
                  <div role="cell">${nationCell(entry.nationId)}</div>
                  <div class="history-edit" role="cell">${escapeHtml(entry.label || entry.field)}</div>
                  <div role="cell"><span class="history-value">${escapeHtml(fmtHistoryChangeValue(fieldKey(entry.dataset, entry.field), entry.beforeValue))}<span aria-hidden="true"> &rarr; </span>${escapeHtml(fmtHistoryChangeValue(fieldKey(entry.dataset, entry.field), entry.afterValue))}</span></div>
                  <div class="history-impact ${impacts.length ? "" : "is-empty"}" role="cell">${impacts.length ? impacts.map(renderChangeBadge).join("") : "No calculated impact"}</div>
                </article>`;
            }).join("")}
          </div>` : `<div class="empty">No changes recorded yet.</div>`}
      </section>`;
  }

  function renderSnapshotRecoveryPanel() {
    const snapshots = sharedSync.snapshots || [];
    const latest = snapshots[0];
    return `
      <section class="panel snapshot-recovery-panel">
        <div class="panel-head">
          <div>
            <h2>Revision Recovery</h2>
            <p>Previous live states saved automatically before each publish.</p>
          </div>
          <span class="status">${sharedSync.isLoadingSnapshots ? "Loading" : `${fmtNumber(snapshots.length)} snapshots`}</span>
        </div>
        <div class="snapshot-recovery-controls">
          <label class="control-field snapshot-select-field" for="snapshotSelect">
            <span>Snapshot</span>
            <select id="snapshotSelect" ${snapshots.length ? "" : "disabled"}>
              ${snapshots.length
                ? snapshots.map((snapshot) => `<option value="${escapeHtml(snapshot.revision)}">Revision #${safeText(snapshot.revision)} - ${safeText(fmtDateTime(snapshot.updatedAt))}</option>`).join("")
                : `<option value="">No snapshots yet</option>`}
            </select>
          </label>
          <button class="command" type="button" data-action="refresh-snapshots">Refresh</button>
          <button class="command" type="button" data-action="snapshot-export" ${snapshots.length ? "" : "disabled"}>Export JSON</button>
          <button class="command danger" type="button" data-action="snapshot-revert" ${snapshots.length ? "" : "disabled"}>Revert Live State</button>
        </div>
        ${snapshots.length ? `
          <div class="snapshot-summary-strip">
            ${overviewFact("Latest Snapshot", `#${latest.revision}`, fmtDateTime(latest.snapshotAt || latest.updatedAt))}
            ${overviewFact("Active Nations", fmtNumber(latest.activeNationCount), `${fmtNumber(latest.nationCount)} total records`)}
            ${overviewFact("Published By", latest.updatedBy || "Unknown", "Snapshot source")}
          </div>
          <div class="table-wrap">
            <table class="snapshot-table">
              <thead><tr><th>Revision</th><th>Published</th><th>Saved</th><th>Publisher</th><th class="numeric">Active</th><th class="numeric">Total</th></tr></thead>
              <tbody>
                ${snapshots.slice(0, 12).map((snapshot) => `
                  <tr>
                    <td>#${safeText(snapshot.revision)}</td>
                    <td>${safeText(fmtDateTime(snapshot.updatedAt))}</td>
                    <td>${safeText(fmtDateTime(snapshot.snapshotAt))}</td>
                    <td>${safeText(snapshot.updatedBy || "Unknown")}</td>
                    <td class="numeric">${fmtNumber(snapshot.activeNationCount)}</td>
                    <td class="numeric">${fmtNumber(snapshot.nationCount)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>` : `<div class="empty">Snapshots start recording after the next successful publish.</div>`}
      </section>`;
  }

  function renderHistory() {
    if (isAdmin && sharedSync.enabled && !sharedSync.snapshotsLoaded && !sharedSync.isLoadingSnapshots) fetchSnapshots();
    app.innerHTML = `${renderSnapshotRecoveryPanel()}${renderChangeHistoryPanel("", 50)}`;
  }

  function dossierMetric(label, value, subtext = "") {
    return `
      <div class="dossier-metric">
        <span>${safeText(label)}</span>
        <strong>${safeText(value)}</strong>
        ${subtext ? `<small>${safeText(subtext)}</small>` : ""}
      </div>`;
  }

  function dossierRow(label, value, tone = "") {
    const toneClass = tone ? ` ${escapeHtml(tone)}` : "";
    return `
      <div class="dossier-row">
        <span>${safeText(label)}</span>
        <strong class="${toneClass.trim()}">${safeText(value)}</strong>
      </div>`;
  }

  function dossierSection(title, rows) {
    return `
      <section class="dossier-section">
        <h3>${safeText(title)}</h3>
        <div class="dossier-rows">${rows.join("")}</div>
      </section>`;
  }

  function renderNations() {
    const nations = [...filteredNations()].sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));
    const selected = nations.find((nation) => nation.id === state.selectedNation) || nations[0] || visibleNations()[0];
    if (!selected) return;
    if (selected && selected.id !== state.selectedNation) state.selectedNation = selected.id;
    const national = data.national[selected.id];
    const trade = data.trade[selected.id];
    const industrial = data.industrial[selected.id];
    const population = data.population[selected.id];
    const military = data.military[selected.id];
    const intelligence = data.intelligence[selected.id];
    const naval = data.naval[selected.id];
    const currentYear = data.meta.currentYear;
    const selectedCoverage = coverageFor(selected.id).filter((set) => set.hasData).length;
    const intelligenceTotal = intelligence ? Object.values(intelligence).reduce((total, value) => total + (Number(value) || 0), 0) : null;
    const militaryPersonnel = activeMilitary(military);
    const balanceTone = national?.primaryBalance >= 0 ? "positive" : "negative";
    const tradeTone = trade?.tradeBalance >= 0 ? "positive" : "negative";

    app.innerHTML = `
      <div class="nation-layout">
        <section class="panel nation-roster" aria-label="Nation list">
          <div class="nation-roster-head">
            <div>
              <h2>Nations</h2>
              <p>${fmtNumber(nations.length)} shown / ${fmtNumber(visibleNations().length)} active</p>
            </div>
            <span class="status">${safeText("A-Z")}</span>
          </div>
          <div class="nation-list">
            ${nations.length ? nations
              .map((nation) => {
                const rowNational = data.national[nation.id];
                const rowPopulation = populationFor(nation.id, currentYear);
                const rowCoverage = coverageFor(nation.id).filter((set) => set.hasData).length;
                return `
                  <button class="nation-button ${nation.id === selected.id ? "is-selected" : ""}" type="button" data-nation="${escapeHtml(nation.id)}">
                    <span class="swatch" style="background:${safeColor(nation.color)}"></span>
                    <span class="nation-button-copy">
                      <strong>${safeText(nation.name)}</strong>
                      <small>${safeText(fmtCompact(rowPopulation))} / ${safeText(rowNational?.economicHealth || "No status")}</small>
                    </span>
                    <span class="status">${rowCoverage}/${datasets.length}</span>
                  </button>`;
              })
              .join("") : `<div class="empty compact">No matching countries.</div>`}
          </div>
        </section>
        <section class="panel nation-dossier" style="--nation-color:${safeColor(selected.color)}">
          <div class="nation-dossier-hero">
            <div class="nation-dossier-title">
              <div>
                <h2>${safeText(selected.name)}</h2>
                <p>${safeText(currentYear)} ledger profile / ${selectedCoverage} of ${datasets.length} datasets connected</p>
              </div>
            </div>
            <div class="nation-dossier-status">
              ${safeStatus(national?.economicHealth || "Unknown", national?.economicHealth === "Prosperity" ? "positive" : national?.economicHealth === "Recovery" ? "warning" : "")}
              ${safeStatus(trade?.tradePolicy || "No trade policy")}
            </div>
          </div>
          <div class="nation-stat-strip">
            ${dossierMetric("Population", fmtCompact(populationFor(selected.id, currentYear)), `${fmtNumber(populationFor(selected.id, currentYear))} in ${currentYear}`)}
            ${dossierMetric("Budget Capacity", fmtNumber(national?.budgetCapacity), national ? `${fmtSigned(national.primaryBalance)} balance` : "No national row")}
            ${dossierMetric("Trade Flow", fmtCompact(trade?.tradeFlow), trade ? `${fmtSigned(trade.tradeBalance)} balance` : "No trade row")}
            ${dossierMetric("Active Personnel", fmtCompact(militaryPersonnel), "Military total")}
            ${dossierMetric("Fleet", fmtNumber(naval?.total), "Tracked naval assets")}
          </div>
          <div class="nation-dossier-grid">
            ${dossierSection("National", [
              dossierRow("Stability", fmtPercent(national?.governmentalStability)),
              dossierRow("Development", fmtNumber(national?.developmentLevel)),
              dossierRow("Balance", national ? fmtSigned(national.primaryBalance) : "Unknown", balanceTone),
              dossierRow("Treasury Reserve", fmtNumber(national?.treasuryReserve)),
              dossierRow("Debt", fmtPercent(national?.debt)),
              dossierRow("Market Rate", fmtPercent(national?.interestRate)),
              dossierRow("Service Rate", fmtPercent(national?.debtServiceRate)),
              dossierRow("Debt Service", fmtNumber(national?.debtService)),
              dossierRow("Projected Debt", fmtPercent(national?.projectedDebt))
            ])}
            ${dossierSection("Trade", [
              dossierRow("Policy", trade?.tradePolicy || "Unknown"),
              dossierRow("Trade Balance", trade ? fmtSigned(trade.tradeBalance) : "Unknown", tradeTone),
              dossierRow("Import Reliance", fmtNumber(trade?.importReliance)),
              dossierRow("Export Reliance", fmtNumber(trade?.exportReliance))
            ])}
            ${dossierSection("Industry", [
              dossierRow("Civilian Factories", fmtNumber(industrial?.civilianFactories)),
              dossierRow("Military Factories", fmtNumber(industrial?.militaryFactories)),
              dossierRow("Shipyards", fmtNumber(industrial?.shipyards)),
              dossierRow("Mobilization", industrial?.mobilizationLevel || "Unknown")
            ])}
            ${dossierSection("Military", [
              dossierRow("Supply", fmtPercent(military?.militarySupply)),
              dossierRow("Organization", fmtNumber(military?.militaryOrganization)),
              dossierRow("Cyber Security", fmtNumber(military?.cyberSecurity)),
              dossierRow("Reserve Forces", fmtNumber(military?.reserveForces))
            ])}
            ${dossierSection("Intelligence", [
              dossierRow("Total", fmtNumber(intelligenceTotal)),
              dossierRow("HUMINT", fmtNumber(intelligence?.humint)),
              dossierRow("SIGINT", fmtNumber(intelligence?.sigint)),
              dossierRow("Global Reach", fmtNumber(intelligence?.globalReach))
            ])}
            <section class="dossier-section dossier-section-wide">
              <h3>Dataset Coverage</h3>
              ${coverageHtml(selected.id)}
            </section>
          </div>
        </section>
      </div>
    `;
  }

  const recordsViews = window.AGGS_APP_MODULES.createRecordsViews({
    getData: () => data,
    app,
    state,
    datasets,
    visibleNations,
    isVisibleNation,
    coverageFor,
    nationCell,
    nationOptionsHtml,
    byId,
    safeText,
    escapeHtml,
    safeColor,
    safeStatus,
    fmtDateTime,
    fmtNumber,
    fmtPercent,
    fmtCost,
    isAdmin,
    Engine,
    Parser: RecordsParser,
    saveWorkingState,
    render
  });
  const { renderNaval, renderEquipment, renderRosterImport, renderTemplateImport, renderAudit, auditRows } = recordsViews;

  let editRenderTimer = null;
  let editApplyTimer = null;
  let pendingEditDraft = null;
  let deferredRenderTimer = null;
  const EDIT_APPLY_DELAY_MS = 450;

  function activeEditElement() {
    return document.activeElement?.closest?.("[data-edit]") || null;
  }

  function markPendingEditorChange() {
    if (!sharedSync.enabled || !isAdmin) return;
    sharedSync.hasPendingLocalChange = true;
    markSync("publishing");
  }

  function clearPendingEditDraft() {
    clearTimeout(editApplyTimer);
    editApplyTimer = null;
    pendingEditDraft = null;
  }

  function deferRenderUntilEditSettles() {
    clearTimeout(deferredRenderTimer);
    deferredRenderTimer = setTimeout(() => {
      if (activeEditElement()) {
        deferRenderUntilEditSettles();
      } else {
        render({ force: true });
      }
    }, 250);
  }

  function render(options = {}) {
    if (!options.force && activeEditElement()) {
      deferRenderUntilEditSettles();
      return;
    }
    clearTimeout(deferredRenderTimer);
    if (!canAccessTab(state.tab)) state.tab = "overview";
    ensureSelectedNation();
    tabs.forEach((tab) => {
      const relatedTabs = (tab.dataset.relatedTabs || "").split(" ").filter(Boolean);
      tab.classList.toggle("is-active", tab.dataset.tab === state.tab || relatedTabs.includes(state.tab));
    });
    renderContextToolbar();
    const renderers = {
      overview: renderOverview,
      simulation: renderSimulation,
      editor: renderEditor,
      history: renderHistory,
      nations: renderNations,
      tradeNetwork: renderTradeNetwork,
      national: renderNational,
      trade: renderTrade,
      industrial: renderIndustrial,
      population: renderPopulation,
      military: renderMilitary,
      intelligence: renderIntelligence,
      eclipse: renderEclipse,
      elections: renderElections,
      naval: renderNaval,
      equipment: renderEquipment,
      rosterImport: renderRosterImport,
      templateImport: renderTemplateImport,
      audit: renderAudit
    };
    renderers[state.tab]();
  }

  populateNationSelect();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!canAccessTab(tab.dataset.tab)) return;
      flushPendingEdit(false);
      const changedTab = state.tab !== tab.dataset.tab;
      state.tab = tab.dataset.tab;
      render();
      if (changedTab) scrollToPageTop();
    });
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  app.addEventListener("pointerdown", (event) => {
    const dragHandle = event.target.closest?.("[data-trade-map-panel-drag]");
    if (!dragHandle || event.button !== 0) return;
    const panel = dragHandle.closest(".trade-map-inspector");
    const stage = panel?.closest(".trade-map-stage");
    if (!panel || !stage) return;
    const stageRect = stage.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    tradeMapPanelDrag = {
      stage,
      panel,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: panelRect.left - stageRect.left,
      startTop: panelRect.top - stageRect.top
    };
    event.preventDefault();
    event.stopPropagation();
    panel.classList.add("is-dragging");
    try {
      panel.setPointerCapture?.(event.pointerId);
    } catch (error) {
      // Window-level move/up listeners still keep dragging functional.
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (!tradeMapPanelDrag || event.pointerId !== tradeMapPanelDrag.pointerId) return;
    const { stage, panel, startLeft, startTop, startX, startY } = tradeMapPanelDrag;
    if (!stage.isConnected || !panel.isConnected) {
      tradeMapPanelDrag = null;
      return;
    }
    event.preventDefault();
    setTradeMapPanelPosition(stage, panel, {
      x: startLeft + event.clientX - startX,
      y: startTop + event.clientY - startY
    });
  });

  function finishTradeMapPanelDrag(event) {
    if (!tradeMapPanelDrag || event.pointerId !== tradeMapPanelDrag.pointerId) return;
    const { stage, panel } = tradeMapPanelDrag;
    if (stage.isConnected && panel.isConnected) {
      const stageRect = stage.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      setTradeMapPanelPosition(stage, panel, {
        x: panelRect.left - stageRect.left,
        y: panelRect.top - stageRect.top
      }, true);
      panel.classList.remove("is-dragging");
      try {
        panel.releasePointerCapture?.(event.pointerId);
      } catch (error) {
        // Losing capture during a render should not leave the panel stuck.
      }
    }
    tradeMapPanelDrag = null;
  }

  window.addEventListener("pointerup", finishTradeMapPanelDrag);
  window.addEventListener("pointercancel", finishTradeMapPanelDrag);
  window.addEventListener("resize", () => {
    if (state.tab === "tradeNetwork") applyTradeMapPanelPosition();
  });

  const pendingEdits = new Map();

  function readEditDraft(edit) {
    return {
      dataset: edit.dataset.dataset,
      path: edit.dataset.path,
      id: edit.dataset.id || state.selectedNation,
      rawValue: edit.value,
      tagName: edit.tagName,
      type: edit.type
    };
  }

  function editDraftKey(draft) {
    return `${draft?.id || ""}:${draft?.dataset || ""}:${draft?.path || ""}`;
  }

  function recordChange(entryKey, id, dataset, path, afterValue, afterMetrics) {
    const pending = pendingEdits.get(entryKey);
    if (!pending) return [];
    const changes = snapshotChanges(pending.beforeSnapshot, afterMetrics);
    const fieldChanged = String(pending.beforeValue ?? "") !== String(afterValue ?? "");
    if (!fieldChanged && !changes.length) {
      data.meta.changeHistory = (data.meta.changeHistory || []).filter((entry) => entry.key !== pending.historyKey);
      return [];
    }
    const entry = {
      key: pending.historyKey,
      nationId: id,
      nationName: byId(id)?.name || id,
      dataset,
      field: path,
      label: fieldLabel(dataset, path),
      beforeValue: pending.beforeValue,
      afterValue,
      changedAt: new Date().toISOString(),
      changes,
      deltas: changes.filter((change) => change.numeric && change.delta !== 0)
    };
    data.meta.changeHistory = [entry, ...(data.meta.changeHistory || []).filter((item) => item.key !== entry.key)].slice(0, 60);
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => pendingEdits.delete(entryKey), 2500);
    return changes;
  }

  function flushPendingEdit(renderNow = false) {
    if (!pendingEditDraft) return false;
    const draft = pendingEditDraft;
    clearPendingEditDraft();
    applyEditDraft(draft, renderNow);
    return true;
  }

  function scheduleEditApply(edit) {
    pendingEditDraft = readEditDraft(edit);
    markPendingEditorChange();
    clearTimeout(editApplyTimer);
    editApplyTimer = setTimeout(() => {
      flushPendingEdit(false);
    }, EDIT_APPLY_DELAY_MS);
  }

  function applyEditDraft(draft, renderNow = true) {
    if (!isAdmin) {
      state.notice = "Editor access is restricted.";
      render();
      return;
    }
    const dataset = draft.dataset;
    const path = draft.path;
    const id = draft.id || state.selectedNation;
    const rawValue = draft.rawValue;
    let writePath = path;
    let value = draft.tagName === "SELECT" || draft.type === "text"
      ? rawValue
      : isDecimalPercentField(dataset, path)
        ? Engine.number(rawValue, 0) / 100
        : Engine.number(rawValue, 0);
    if (dataset === "national" && path === "interestRate") {
      const statRate = Engine.number(data.national?.[id]?.computedInterestRate, Engine.constants.DEBT_RULES.baseInterestRate);
      writePath = "interestRateAdjustment";
      value = Number((Engine.number(rawValue, statRate) - statRate).toFixed(2));
    }
    const entryKey = `${id}:${dataset}:${path}`;
    if (!pendingEdits.has(entryKey)) {
      pendingEdits.set(entryKey, {
        historyKey: `${entryKey}:${Date.now()}`,
        beforeValue: historyFieldValue(dataset, path, readFieldValue(data, dataset, id, path)),
        beforeSnapshot: nationSnapshot(data, id),
        timer: null
      });
    }
    Engine.updateValue(data, dataset, id, writePath, value);
    if (path === "mobilizationLevel") {
      if (dataset === "military" && data.industrial[id]) data.industrial[id].mobilizationLevel = value;
      if (dataset === "industrial" && data.military[id]) data.military[id].mobilizationLevel = value;
    }
    Engine.recalculateAll(data);
    const afterValue = historyFieldValue(dataset, path, readFieldValue(data, dataset, id, path));
    const changes = recordChange(entryKey, id, dataset, path, afterValue, nationSnapshot(data, id));
    const bcDelta = changes.find((change) => change.key === "national.budgetCapacity");
    state.notice = `${byId(id)?.name || "Nation"} updated${bcDelta ? `; BC ${fmtSigned(bcDelta.delta)}` : ""}.`;
    saveLedger();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    if (renderNow) {
      clearTimeout(editRenderTimer);
      render({ force: true });
    } else {
      clearTimeout(editRenderTimer);
    }
  }

  function applyView(value) {
    if (!canAccessTab(value)) {
      state.tab = "overview";
    } else {
      state.tab = value;
    }
    render();
  }

  app.addEventListener("input", (event) => {
    if (["currentYearInput", "targetYearInput", "worldHealthInput"].includes(event.target.id)) {
      updateSimulationPreview(event.target.id);
    }
    const edit = event.target.closest("[data-edit]");
    if (edit) scheduleEditApply(edit);
  });

  app.addEventListener("scroll", (event) => {
    const tableWrap = event.target.closest?.("[data-table-scroll]");
    if (tableWrap) rememberTableScroll(tableWrap.dataset.tableScroll, tableWrap);
  }, true);

  app.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-edit]")) flushPendingEdit(false);
    if (recordsViews.handleClick?.(event)) return;

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      flushPendingEdit(false);
      const action = actionButton.dataset.action;
      if (!isAdmin && adminOnlyActions.has(action)) {
        state.notice = "Admin access is required for this action.";
        render();
        return;
      }
      const targetInput = document.getElementById("targetYearInput");
      const currentInput = document.getElementById("currentYearInput");
      const worldHealthInput = document.getElementById("worldHealthInput");
      if (worldHealthInput) data.meta.worldEconomicHealth = worldHealthInput.value;
      if (recordsViews.handleAction?.(action, actionButton)) {
        return;
      } else if (action === "create-nation") {
        createNationFromEditor();
      } else if (action === "archive-nation") {
        archiveSelectedNationFromEditor();
      } else if (action === "restore-nation") {
        restoreArchivedNationFromEditor();
      } else if (action === "refresh-snapshots") {
        await fetchSnapshots(true);
      } else if (action === "snapshot-revert") {
        await revertSelectedSnapshot();
      } else if (action === "snapshot-export") {
        await exportSelectedSnapshot();
      } else if (action === "apply-tax-unrest") {
        applyRecommendedTaxUnrest(actionButton.dataset.nationId || "");
      } else if (action === "preview-trade-generator") {
        rememberVisibleTableScroll();
        state.tradeGenerator = readTradeGeneratorValues();
        state.tradeAnchorPreview = Engine.previewTradeAnchorPlan(data, state.selectedNation, tradeGeneratorSettingsFromValues(state.tradeGenerator));
        render();
      } else if (action === "apply-trade-generator") {
        rememberVisibleTableScroll();
        state.tradeGenerator = readTradeGeneratorValues();
        const preview = state.tradeAnchorPreview?.countryId === state.selectedNation
          ? state.tradeAnchorPreview
          : Engine.previewTradeAnchorPlan(data, state.selectedNation, tradeGeneratorSettingsFromValues(state.tradeGenerator));
        const result = Engine.applyTradeAnchorPlan(data, preview);
        Engine.recalculateAll(data);
        state.tradeAnchorPreview = null;
        saveWorkingState(`${byId(state.selectedNation)?.name || "Country"} trade generator applied ${fmtNumber(result.totalCount)} lane locks.`);
      } else if (action === "clear-trade-generator-preview") {
        state.tradeAnchorPreview = null;
        render();
      } else if (action === "set-targeted-tariff") {
        const importerId = actionButton.dataset.importerId || state.selectedNation;
        const exporterId = actionButton.dataset.exporterId || "";
        const input = document.getElementById(actionButton.dataset.inputId || "");
        if (importerId && exporterId && input) {
          rememberVisibleTableScroll();
          const rate = Engine.number(input.value, data.trade?.[importerId]?.tariffRate ?? 0);
          Engine.setTargetedTariff(data, importerId, exporterId, rate);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(importerId)?.name || "Country"} tariff on ${byId(exporterId)?.name || "partner"} set to ${fmtPercent(rate)}.`);
        }
      } else if (action === "clear-targeted-tariff") {
        const importerId = actionButton.dataset.importerId || state.selectedNation;
        const exporterId = actionButton.dataset.exporterId || "";
        if (importerId && exporterId) {
          rememberVisibleTableScroll();
          Engine.clearTargetedTariff(data, importerId, exporterId);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(importerId)?.name || "Country"} targeted tariff cleared for ${byId(exporterId)?.name || "partner"}.`);
        }
      } else if (action === "set-export-anchor") {
        const exporterId = actionButton.dataset.exporterId || state.selectedNation;
        const importerId = actionButton.dataset.importerId || "";
        const input = document.getElementById(actionButton.dataset.inputId || "");
        if (exporterId && importerId && input) {
          rememberVisibleTableScroll();
          const share = Engine.number(input.value, 0);
          Engine.setExportAnchor(data, exporterId, importerId, share);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(exporterId)?.name || "Country"} export lane to ${byId(importerId)?.name || "partner"} locked at ${fmtPercent(share)}.`);
        }
      } else if (action === "clear-export-anchor") {
        const exporterId = actionButton.dataset.exporterId || state.selectedNation;
        const importerId = actionButton.dataset.importerId || "";
        if (exporterId && importerId) {
          rememberVisibleTableScroll();
          Engine.clearExportAnchor(data, exporterId, importerId);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(exporterId)?.name || "Country"} export lane to ${byId(importerId)?.name || "partner"} returned to auto.`);
        }
      } else if (action === "set-import-anchor") {
        const importerId = actionButton.dataset.importerId || state.selectedNation;
        const exporterId = actionButton.dataset.exporterId || "";
        const input = document.getElementById(actionButton.dataset.inputId || "");
        if (importerId && exporterId && input) {
          rememberVisibleTableScroll();
          const share = Engine.number(input.value, 0);
          Engine.setImportAnchor(data, importerId, exporterId, share);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(importerId)?.name || "Country"} import lane from ${byId(exporterId)?.name || "partner"} locked at ${fmtPercent(share)}.`);
        }
      } else if (action === "clear-import-anchor") {
        const importerId = actionButton.dataset.importerId || state.selectedNation;
        const exporterId = actionButton.dataset.exporterId || "";
        if (importerId && exporterId) {
          rememberVisibleTableScroll();
          Engine.clearImportAnchor(data, importerId, exporterId);
          Engine.recalculateAll(data);
          saveWorkingState(`${byId(importerId)?.name || "Country"} import lane from ${byId(exporterId)?.name || "partner"} returned to auto.`);
        }
      } else if (action === "advance-one") {
        const result = Engine.advanceToYear(data, Number(data.meta.currentYear) + 1);
        saveWorkingState(result.message);
      } else if (action === "advance-target") {
        const result = Engine.advanceToYear(data, Number(targetInput?.value || data.meta.currentYear + 1));
        saveWorkingState(result.message);
      } else if (action === "recalculate") {
        data.meta.currentYear = Number(currentInput?.value || data.meta.currentYear);
        Engine.recalculateAll(data);
        saveWorkingState(`Recalculated ${data.meta.currentYear}.`);
      } else if (action === "toggle-detail-columns") {
        rememberVisibleTableScroll();
        state.showDetails = !state.showDetails;
        render();
      } else if (action === "reset-state") {
        resetWorkingState();
      } else if (action === "export-json") {
        downloadText(`ag-gs-${data.meta.currentYear}.json`, JSON.stringify(persistenceSnapshot(), null, 2));
      } else if (action === "export-data-js") {
        downloadText("data.js", Engine.exportDataJs(persistenceSnapshot()), "text/javascript");
      } else if (action === "publish-live-state") {
        flushPendingEdit(false);
        saveLedger();
        await publishSharedState("Published current state to the live ledger.");
      }
      return;
    }

    const mapLayer = event.target.closest("[data-trade-map-layer]");
    if (mapLayer) {
      flushPendingEdit(false);
      state.tradeMapLayer = mapLayer.dataset.tradeMapLayer || "trade";
      renderPreservingPageScroll();
      return;
    }

    const mapNation = event.target.closest("[data-trade-map-nation]");
    if (mapNation) {
      flushPendingEdit(false);
      state.selectedNation = mapNation.dataset.tradeMapNation;
      state.tradeAnchorPreview = null;
      renderPreservingPageScroll();
      return;
    }

    const nationButton = event.target.closest("[data-nation]");
    if (nationButton) {
      flushPendingEdit(false);
      state.selectedNation = nationButton.dataset.nation;
      state.tradeAnchorPreview = null;
      render();
      return;
    }

    const header = event.target.closest("th[data-table]");
    if (header) {
      flushPendingEdit(false);
      rememberVisibleTableScroll();
      const table = header.dataset.table;
      const key = header.dataset.key;
      const current = state.sort[table] || {};
      state.sort[table] = { key, dir: current.key === key && current.dir === "asc" ? "desc" : "asc" };
      render();
    }
  });

  app.addEventListener("keydown", (event) => {
    const mapNation = event.target.closest?.("[data-trade-map-nation]");
    if (!mapNation || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    state.selectedNation = mapNation.dataset.tradeMapNation;
    state.tradeAnchorPreview = null;
    renderPreservingPageScroll();
  });

  app.addEventListener("change", (event) => {
    if (recordsViews.handleChange?.(event)) return;

    const viewSelect = event.target.closest("[data-view-select]");
    if (viewSelect) {
      flushPendingEdit(false);
      applyView(viewSelect.value);
      return;
    }

    const nationSelect = event.target.closest("[data-nation-select]");
    if (nationSelect) {
      flushPendingEdit(false);
      state.selectedNation = nationSelect.value;
      state.tradeAnchorPreview = null;
      render();
      return;
    }

    const tradeNetworkDirectionFilter = event.target.closest("[data-trade-network-direction-filter]");
    if (tradeNetworkDirectionFilter) {
      rememberVisibleTableScroll();
      state.tradeNetworkDirectionFilter = tradeNetworkDirectionFilter.value || "all";
      renderPreservingPageScroll();
      return;
    }

    const tradeNetworkSizeFilter = event.target.closest("[data-trade-network-size-filter]");
    if (tradeNetworkSizeFilter) {
      rememberVisibleTableScroll();
      state.tradeNetworkSizeFilter = tradeNetworkSizeFilter.value || "all";
      renderPreservingPageScroll();
      return;
    }

    const tradeGeneratorInput = event.target.closest("[data-trade-generator-input]");
    if (tradeGeneratorInput) {
      state.tradeGenerator = readTradeGeneratorValues();
      state.tradeAnchorPreview = null;
      render();
      return;
    }

    const lanePolicySelect = event.target.closest("[data-lane-policy-select]");
    if (lanePolicySelect) {
      if (!isAdmin) {
        state.notice = "Admin access is required for this action.";
        render();
        return;
      }
      const importerId = lanePolicySelect.dataset.importerId || state.selectedNation;
      const exporterId = lanePolicySelect.dataset.exporterId || "";
      if (importerId && exporterId) {
        rememberVisibleTableScroll();
        const value = lanePolicySelect.value;
        const policy = value === "Embargo"
          ? { embargo: true, sanctionsLevel: "None" }
          : { embargo: false, sanctionsLevel: value };
        Engine.setLanePolicy(data, importerId, exporterId, policy);
        Engine.recalculateAll(data);
        saveWorkingState(`${byId(importerId)?.name || "Country"} import policy on ${byId(exporterId)?.name || "partner"} set to ${value}.`);
      }
      return;
    }

    const transitPolicySelect = event.target.closest("[data-transit-policy-select]");
    if (transitPolicySelect) {
      if (!isAdmin) {
        state.notice = "Admin access is required for this action.";
        render();
        return;
      }
      const blockerId = transitPolicySelect.dataset.blockerId || state.selectedNation;
      const targetId = transitPolicySelect.dataset.targetId || "";
      if (blockerId && targetId) {
        rememberVisibleTableScroll();
        const value = transitPolicySelect.value;
        Engine.setTransitPolicy(data, blockerId, targetId, value);
        Engine.recalculateAll(data);
        saveWorkingState(`${byId(blockerId)?.name || "Country"} transit access for ${byId(targetId)?.name || "partner"} set to ${value}.`);
      }
      return;
    }

    const edit = event.target.closest("[data-edit]");
    if (edit && !isAdmin) {
      state.notice = "Editor access is restricted.";
      render();
      return;
    }
    if (!edit) {
      if (event.target.id === "worldHealthInput") {
        updateSimulationPreview(event.target.id);
        data.meta.worldEconomicHealth = event.target.value;
        Engine.recalculateAll(data);
        saveWorkingState("World economy updated.");
      } else if (event.target.id === "currentYearInput") {
        updateSimulationPreview(event.target.id);
        data.meta.currentYear = Number(event.target.value || data.meta.currentYear);
        saveWorkingState(`Working year set to ${data.meta.currentYear}.`);
      } else if (event.target.id === "targetYearInput") {
        updateSimulationPreview(event.target.id);
      }
      return;
    }

    const draft = readEditDraft(edit);
    if (pendingEditDraft && editDraftKey(pendingEditDraft) !== editDraftKey(draft)) flushPendingEdit(false);
    clearPendingEditDraft();
    const shouldRenderAfterChange = edit.tagName === "SELECT" || document.activeElement !== edit;
    applyEditDraft(draft, shouldRenderAfterChange);
  });

  window.addEventListener("beforeunload", () => {
    flushPendingEdit(false);
  });

  render();
  startSharedSync();
})();
