(function () {
  const baseData = window.AGGS_DATA;
  const Engine = window.AGGS_ENGINE;
  let data = Engine.load(baseData);
  const app = document.getElementById("app");
  const searchInput = document.getElementById("searchInput");
  const viewSelect = document.getElementById("viewSelect");
  const nationSelect = document.getElementById("nationSelect");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const sourceNote = document.getElementById("sourceNote");
  const sourcePill = document.querySelector(".source-pill");
  const themeToggle = document.getElementById("themeToggle");
  const isAdmin = document.body.dataset.appMode === "admin";
  const THEME_KEY = "aggs-theme";
  const adminOnlyTabs = new Set(["editor", "simulation"]);
  const adminOnlyActions = new Set(["advance-one", "advance-target", "recalculate", "reset-state", "export-json", "export-data-js", "publish-live-state"]);
  const sharedSync = {
    enabled: location.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1"].includes(location.hostname),
    endpoint: window.AGGS_API_URL || (isAdmin ? "/admin/api/state" : "/api/state"),
    pollMs: 2500,
    revision: null,
    status: "local",
    message: "",
    updatedAt: "",
    updatedBy: "",
    isPublishing: false,
    hasPendingLocalChange: false,
    publishTimer: null,
    pollTimer: null
  };

  const datasets = [
    { key: "national", label: "National" },
    { key: "trade", label: "Trade" },
    { key: "industrial", label: "Industrial" },
    { key: "population", label: "Population" },
    { key: "military", label: "Military" },
    { key: "intelligence", label: "Intelligence" },
    { key: "eclipse", label: "Eclipse" },
    { key: "elections", label: "Elections" },
    { key: "naval", label: "Naval" }
  ];
  const viewOptions = [
    { key: "overview", label: "Overview" },
    { key: "editor", label: "Editor", adminOnly: true },
    { key: "nations", label: "Nations" },
    { key: "simulation", label: "Simulation", adminOnly: true },
    { key: "national", label: "National Status" },
    { key: "trade", label: "Trade Status" },
    { key: "industrial", label: "Industrial Status" },
    { key: "population", label: "Population Tracker" },
    { key: "military", label: "Military Status" },
    { key: "intelligence", label: "Intelligence Status" },
    { key: "naval", label: "Naval Inventory" },
    { key: "equipment", label: "Equipment Costs" },
    { key: "eclipse", label: "Eclipse Status" },
    { key: "elections", label: "Election Tracker" },
    { key: "audit", label: "Audit" }
  ];
  const economicHealthOptions = ["Prosperity", "Expansion", "Recovery", "Slowdown", "Recession", "Depression"];

  const state = {
    tab: "overview",
    query: "",
    selectedNation: "solara",
    sort: {},
    showDetails: false,
    notice: ""
  };

  function canAccessTab(tabKey) {
    return isAdmin || !adminOnlyTabs.has(tabKey);
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function updateThemeToggle() {
    if (!themeToggle) return;
    const isDark = currentTheme() === "dark";
    const label = isDark ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
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
      ? "Admin workspace: edits are saved in this browser until exported."
      : "Public view: editor and simulation access are managed separately.";
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

  function isVisibleNation(id) {
    return visibleIds().includes(id);
  }

  function ensureSelectedNation() {
    const active = visibleNations();
    if (!active.some((nation) => nation.id === state.selectedNation)) {
      state.selectedNation = active[0]?.id || "";
    }
    if (nationSelect.value !== state.selectedNation) nationSelect.value = state.selectedNation;
  }

  function populateNationSelect() {
    nationSelect.textContent = "";
    visibleNations().forEach((nation) => {
      const option = document.createElement("option");
      option.value = nation.id;
      option.textContent = nation.name;
      nationSelect.append(option);
    });
    ensureSelectedNation();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmtNumber(value) {
    return value === null || value === undefined || value === "" ? "Unknown" : Number(value).toLocaleString("en-US");
  }

  function fmtCompact(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function fmtPercent(value) {
    return value === null || value === undefined || value === "" ? "Unknown" : `${value}%`;
  }

  function fmtSigned(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    return value > 0 ? `+${fmtNumber(value)}` : fmtNumber(value);
  }

  function fmtCost(value) {
    return value === null || value === undefined ? "Unknown" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  function populationFor(id, year = data.meta.currentYear) {
    return Engine.getPopulation(data, id, year);
  }

  function saveWorkingState(message) {
    Engine.save(data);
    state.notice = message || "Saved locally.";
    scheduleSharedPublish(state.notice, 0);
    updateSourceNote();
    render();
  }

  function resetWorkingState() {
    data = Engine.reset(baseData);
    state.notice = "Reset to the operating baseline.";
    ensureSelectedNation();
    scheduleSharedPublish(state.notice, 0);
    updateSourceNote();
    render();
  }

  function downloadText(filename, text, mimeType = "application/json") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function readSharedJson(response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function markSync(status, message = "") {
    sharedSync.status = status;
    sharedSync.message = message;
    updateSourceNote();
  }

  function applySharedData(payload) {
    if (!payload?.data || sharedSync.hasPendingLocalChange || sharedSync.isPublishing) return false;
    const nextRevision = Number(payload.revision || 0);
    if (nextRevision && nextRevision === sharedSync.revision) return false;
    data = Engine.clone(payload.data);
    sharedSync.revision = nextRevision || sharedSync.revision;
    sharedSync.updatedAt = payload.updatedAt || data.meta?.updatedAt || "";
    sharedSync.updatedBy = payload.updatedBy || data.meta?.updatedBy || "";
    Engine.save(data, { touch: false });
    populateNationSelect();
    updateSourceNote();
    state.notice = sharedSync.updatedBy ? `Live update from ${sharedSync.updatedBy}.` : "Live update received.";
    render();
    return true;
  }

  async function fetchSharedState() {
    if (!sharedSync.enabled || sharedSync.isPublishing || sharedSync.hasPendingLocalChange) return;
    markSync(sharedSync.revision ? "online" : "connecting");
    try {
      const response = await fetch(sharedSync.endpoint, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const payload = await readSharedJson(response);
      if (response.status === 404 && payload?.code === "NO_SHARED_STATE") {
        markSync("ready-empty", payload.message || "");
        return;
      }
      if (response.status === 404 && !payload) {
        markSync("local");
        return;
      }
      if (!response.ok || !payload?.ok) {
        markSync("offline", payload?.message || "Shared sync is unavailable.");
        return;
      }
      const applied = applySharedData(payload);
      if (!applied) {
        sharedSync.revision = Number(payload.revision || sharedSync.revision || 0);
        sharedSync.updatedAt = payload.updatedAt || sharedSync.updatedAt;
        sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
      }
      markSync("online");
    } catch (error) {
      markSync("offline", "Shared sync is unavailable.");
    }
  }

  function scheduleSharedPublish(message, delay = 900) {
    if (!sharedSync.enabled || !isAdmin) return;
    sharedSync.hasPendingLocalChange = true;
    markSync("publishing");
    clearTimeout(sharedSync.publishTimer);
    sharedSync.publishTimer = setTimeout(() => {
      publishSharedState(message);
    }, delay);
  }

  async function publishSharedState(message = "Published live changes.") {
    if (!sharedSync.enabled || !isAdmin) {
      state.notice = sharedSync.enabled ? "Admin access is required to publish." : "Shared sync is not configured for this host.";
      updateSourceNote();
      render();
      return;
    }
    clearTimeout(sharedSync.publishTimer);
    sharedSync.hasPendingLocalChange = true;
    sharedSync.isPublishing = true;
    markSync("publishing");
    try {
      data.meta.updatedAt = new Date().toISOString();
      const response = await fetch(sharedSync.endpoint, {
        method: "PUT",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data, revision: sharedSync.revision })
      });
      const payload = await readSharedJson(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Publish failed.");
      sharedSync.revision = Number(payload.revision || sharedSync.revision || 0);
      sharedSync.updatedAt = payload.updatedAt || data.meta.updatedAt;
      sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
      data.meta.updatedBy = sharedSync.updatedBy || data.meta.updatedBy;
      Engine.save(data, { touch: false });
      sharedSync.hasPendingLocalChange = false;
      sharedSync.isPublishing = false;
      markSync("online");
      state.notice = message;
      render();
    } catch (error) {
      sharedSync.isPublishing = false;
      markSync("offline", error.message || "Shared publish failed.");
      state.notice = "Saved locally. Live publish failed.";
      render();
    }
  }

  function startSharedSync() {
    if (!sharedSync.enabled) {
      markSync("local");
      return;
    }
    fetchSharedState();
    sharedSync.pollTimer = setInterval(fetchSharedState, sharedSync.pollMs);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) fetchSharedState();
    });
  }

  function nationCell(id) {
    const nation = byId(id);
    if (!nation) return id;
    return `<span class="nation-cell"><span class="swatch" style="background:${nation.color}"></span>${nation.name}</span>`;
  }

  function coverageFor(id) {
    return datasets.map((set) => ({
      ...set,
      hasData: Boolean(data[set.key] && data[set.key][id])
    }));
  }

  function coverageHtml(id) {
    return `<div class="coverage">${coverageFor(id)
      .map((set) => `<span class="${set.hasData ? "has-data" : ""}">${set.label}</span>`)
      .join("")}</div>`;
  }

  function filteredNations() {
    const q = state.query.trim().toLowerCase();
    const active = visibleNations();
    if (!q) return active;
    return active.filter((nation) => {
      const haystack = [
        nation.name,
        data.national[nation.id]?.economicHealth,
        data.trade[nation.id]?.tradePolicy,
        data.trade[nation.id]?.sanctionsLevel,
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
    return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${subtext}</small></article>`;
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
    const max = Math.max(...rows.map((row) => row.value), 1);
    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>${title}</h2>
            <p>${source}</p>
          </div>
        </div>
        <div class="bar-list">
          ${rows
            .map(
              ({ nation, value }) => `
                <div class="bar-row">
                  <span class="bar-name"><span class="swatch" style="background:${nation.color}"></span>${nation.name}</span>
                  <span class="bar-track"><span class="bar-fill" style="--bar-width:${Math.max(3, (value / max) * 100)}%"></span></span>
                  <span class="bar-value">${formatter(value)}</span>
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

    app.innerHTML = `
      <section class="dashboard-grid">
        ${renderMetric("Active Nations", fmtNumber(active.length), "Countries currently shown in the ledger")}
        ${renderMetric(`${currentYear} Population`, fmtCompact(totalPopulation), "Combined active population")}
        ${renderMetric("Budget Capacity", fmtNumber(totalBudget), "Combined national budget capacity")}
        ${renderMetric("Fleet Inventory", fmtNumber(totalFleet), "Tracked naval assets")}
      </section>
      <section class="dashboard-grid">
        ${renderMetric("Trade Flow", fmtCompact(totalTradeFlow), "Aggregate active trade flow")}
        ${renderMetric("Active Personnel", fmtCompact(totalActive), "Combat, support, air, naval, irregular")}
        ${renderMetric("National Profiles", fmtNumber(active.filter((nation) => data.national[nation.id]).length), "Active records with national data")}
        ${renderMetric("Coverage Gaps", fmtNumber(auditRows().filter((row) => row.missing.length).length), "Active nations missing a dataset")}
      </section>
      <div class="split">
        ${topList("Largest Populations", `Population (${currentYear})`, dataId => populationFor(dataId, currentYear), fmtCompact)}
        ${topList("Budget Capacity", "National Status", dataId => data.national[dataId]?.budgetCapacity, fmtNumber)}
      </div>
      <div class="split" style="margin-top:14px">
        ${topList("Trade Flow", "Trade Status", dataId => data.trade[dataId]?.tradeFlow, fmtCompact)}
        ${topList("Active Military Personnel", "Military Status", dataId => activeMilitary(data.military[dataId]), fmtCompact)}
      </div>
    `;
  }

  function tablePanel(title, subtitle, rows, columns, id) {
    if (!rows.length) {
      app.innerHTML = `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><p>${subtitle}</p></div></div><div class="empty">No rows match the current search.</div></section>`;
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
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>
          <div class="panel-actions">
            ${hasSecondaryColumns ? `<button class="command compact ${state.showDetails ? "is-active" : ""}" type="button" data-action="toggle-detail-columns">${state.showDetails ? "Focused Columns" : "Detailed Columns"}</button>` : ""}
            <span class="status">${fmtNumber(sortedRows.length)} rows</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${visibleColumns
                  .map(
                    (column) =>
                      `<th class="${column.numeric ? "numeric" : ""}" data-table="${id}" data-key="${column.key}">${column.label}${sortLabel(sort, column)}</th>`
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
                          const rendered = column.render ? column.render(value, row) : value ?? "Unknown";
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
  }

  function tableRowsFor(datasetKey) {
    return filteredNations()
      .filter((nation) => data[datasetKey][nation.id])
      .map((nation) => ({ id: nation.id, nation: nation.name, ...data[datasetKey][nation.id] }));
  }

  function renderNational() {
    tablePanel(
      "National Status",
      "Core governance, fiscal, and economic indicators used by the simulation model.",
      tableRowsFor("national"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "governmentalStability", label: "Stability", numeric: true, render: fmtPercent },
        { key: "publicUnrest", label: "Unrest", numeric: true, render: fmtNumber },
        { key: "warSupport", label: "War Support", numeric: true, secondary: true, render: fmtPercent },
        { key: "corruption", label: "Corruption", numeric: true, secondary: true, render: fmtPercent },
        { key: "developmentLevel", label: "Development", numeric: true, render: fmtNumber },
        { key: "budgetCapacity", label: "Budget Capacity", numeric: true, render: fmtNumber },
        { key: "budgetExpenditure", label: "Expenditure", numeric: true, secondary: true, render: fmtNumber },
        { key: "budgetBalance", label: "Balance", numeric: true, render: (v) => `<span class="status ${v >= 0 ? "positive" : "negative"}">${fmtSigned(v)}</span>` },
        { key: "debt", label: "Debt", numeric: true, render: fmtPercent },
        { key: "economicHealth", label: "Health", render: (v) => `<span class="status ${v === "Prosperity" ? "positive" : v === "Recovery" ? "warning" : ""}">${v}</span>` },
        { key: "immigrationRate", label: "Immigration", numeric: true, secondary: true, render: fmtNumber },
        { key: "taxRate", label: "Tax Rate", numeric: true, secondary: true, render: fmtNumber }
      ],
      "national"
    );
  }

  function renderTrade() {
    tablePanel(
      "Trade Status",
      "Trade posture, reliance, restrictions, and calculated output for each active nation.",
      tableRowsFor("trade"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "tradeCapacity", label: "Capacity", numeric: true, render: fmtNumber },
        { key: "tradeEfficiency", label: "Efficiency", numeric: true, render: fmtNumber },
        { key: "autarkyIndex", label: "Autarky", numeric: true, secondary: true, render: fmtNumber },
        { key: "tradeBalance", label: "Balance", numeric: true, render: (v) => `<span class="status ${v >= 0 ? "positive" : "negative"}">${fmtSigned(v)}</span>` },
        { key: "tradeFlow", label: "Flow", numeric: true, render: fmtNumber },
        { key: "tradePower", label: "Power", numeric: true, secondary: true, render: fmtNumber },
        { key: "importReliance", label: "Import", numeric: true, secondary: true, render: fmtNumber },
        { key: "exportReliance", label: "Export", numeric: true, secondary: true, render: fmtNumber },
        { key: "economicTradeDiversity", label: "Diversity", numeric: true, secondary: true, render: fmtNumber },
        { key: "tradePolicy", label: "Policy", render: (v) => `<span class="status">${v}</span>` },
        { key: "sanctionsLevel", label: "Sanctions", render: (v) => `<span class="status ${v === "None" ? "positive" : "warning"}">${v}</span>` },
        { key: "tariffRate", label: "Tariff", numeric: true, secondary: true, render: fmtPercent },
        { key: "economicImpactScore", label: "Impact", numeric: true, render: fmtNumber }
      ],
      "trade"
    );
  }

  function renderIndustrial() {
    tablePanel(
      "Industrial Status",
      "Production capacity and mobilization settings used by the economic and military supply models.",
      tableRowsFor("industrial"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "mobilizationLevel", label: "Mobilization", render: (v) => `<span class="status">${v}</span>` },
        { key: "militaryFactories", label: "Military Factories", numeric: true, render: fmtNumber },
        { key: "civilianFactories", label: "Civilian Factories", numeric: true, render: fmtNumber },
        { key: "shipyards", label: "Shipyards", numeric: true, render: fmtNumber }
      ],
      "industrial"
    );
  }

  function renderPopulation() {
    const rows = filteredNations()
      .filter((nation) => data.population[nation.id])
      .map((nation) => ({ id: nation.id, nation: nation.name, ...data.population[nation.id] }));
    const columns = [
      { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
      { key: "mandatoryChildPolicy", label: "Child Policy", render: (v) => `<span class="status">${v}</span>` },
      ...data.populationColumns.map((column) => ({
        key: column.key,
        label: column.label,
        numeric: true,
        secondary: column.key !== String(data.meta.currentYear),
        raw: (row) => row.values[column.key],
        render: (v) => fmtNumber(v)
      }))
    ];
    tablePanel("Population Tracker", "Population history and demographic policy inputs used by yearly growth calculations.", rows, columns, "population");
  }

  function renderSimulation() {
    const currentYear = Number(data.meta.currentYear) || 2021;
    const snapshot = Engine.snapshot(data, currentYear);
    const log = data.meta.lastSimulationLog || [];
    app.innerHTML = `
      <section class="dashboard-grid">
        ${renderMetric("Working Year", fmtNumber(currentYear), "Local browser state")}
        ${renderMetric("Population", fmtCompact(snapshot.totalPopulation), `Total in ${currentYear}`)}
        ${renderMetric("Budget Capacity", fmtNumber(snapshot.budgetCapacity), "After current calculations")}
        ${renderMetric("Trade Flow", fmtCompact(snapshot.tradeFlow), "After current calculations")}
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Simulation Controls</h2>
            <p>Advance active nations year by year through population, trade, industry, budget, debt, and military supply calculations.</p>
          </div>
          <span class="status ${state.notice ? "positive" : ""}">${state.notice || "Ready"}</span>
        </div>
        <div class="control-grid">
          <label class="control-field">
            <span>Current Year</span>
            <input type="number" id="currentYearInput" value="${currentYear}" min="1">
          </label>
          <label class="control-field">
            <span>Target Year</span>
            <input type="number" id="targetYearInput" value="${currentYear + 1}" min="${currentYear + 1}">
          </label>
          <label class="control-field">
            <span>World Economy</span>
            <select id="worldHealthInput">
              ${["Prosperity", "Expansion", "Recovery", "Slowdown", "Recession", "Depression"].map((option) => `<option ${data.meta.worldEconomicHealth === option ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="command-row">
          <button class="command primary" type="button" data-action="advance-one">Advance 1 Year</button>
          <button class="command" type="button" data-action="advance-target">Simulate To Target</button>
          <button class="command" type="button" data-action="recalculate">Recalculate Current Year</button>
          <button class="command danger" type="button" data-action="reset-state">Reset Baseline</button>
          <button class="command" type="button" data-action="export-json">Export JSON</button>
          <button class="command" type="button" data-action="export-data-js">Export data.js</button>
          <button class="command" type="button" data-action="publish-live-state">Publish Live State</button>
        </div>
      </section>
      <section class="panel simulation-notes">
        <div class="panel-head">
          <div>
            <h2>Calculation Pipeline</h2>
            <p>Each yearly step updates population, recalculates trade, grows industry, updates budget and debt, then applies twelve months of military supply production.</p>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Simulation Log</h2>
            <p>Most recent run, stored locally in this browser.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th class="numeric">Year</th><th class="numeric">Population</th><th class="numeric">Budget Capacity</th><th class="numeric">Trade Flow</th><th class="numeric">Avg Supply</th></tr></thead>
            <tbody>
              ${(log.length ? log : [snapshot]).map((row) => `<tr><td class="numeric">${fmtNumber(row.year)}</td><td class="numeric">${fmtNumber(row.totalPopulation)}</td><td class="numeric">${fmtNumber(row.budgetCapacity)}</td><td class="numeric">${fmtNumber(row.tradeFlow)}</td><td class="numeric">${fmtPercent(row.militarySupplyAverage)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function fieldControl(dataset, path, label, value, type = "number", options = []) {
    const id = `${dataset}-${path}`.replace(/[^a-z0-9_-]/gi, "-");
    if (type === "select") {
      return `
        <label class="control-field" for="${id}">
          <span>${label}</span>
          <select id="${id}" data-edit data-dataset="${dataset}" data-path="${path}">
            ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
        </label>`;
    }
    return `
      <label class="control-field" for="${id}">
        <span>${label}</span>
        <input id="${id}" type="${type}" value="${escapeHtml(value ?? "")}" data-edit data-dataset="${dataset}" data-path="${path}">
      </label>`;
  }

  function renderEditor() {
    const nation = byId(state.selectedNation) || visibleNations()[0];
    if (!nation) return;
    const national = data.national[nation.id] || {};
    const trade = data.trade[nation.id] || {};
    const industrial = data.industrial[nation.id] || {};
    const military = data.military[nation.id] || {};
    const intelligence = data.intelligence[nation.id] || {};
    const eclipse = data.eclipse[nation.id] || {};
    const elections = data.elections[nation.id] || {};
    const population = data.population[nation.id] || { mandatoryChildPolicy: "No Policy", values: {} };
    const currentYear = data.meta.currentYear;

    app.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>${nationCell(nation.id)}</h2>
            <p>Edit the selected nation. Dependent systems recalculate automatically, and changes stay local until exported.</p>
          </div>
          <span class="status ${state.notice ? "positive" : ""}">${state.notice || "Editor ready"}</span>
        </div>
        <div class="editor-grid">
          <section class="editor-section">
            <h3>Population</h3>
            ${fieldControl("population", String(currentYear), `Population (${currentYear})`, populationFor(nation.id, currentYear))}
            ${fieldControl("population", "mandatoryChildPolicy", "Child Policy", population.mandatoryChildPolicy, "select", Object.keys(Engine.constants.CHILD_POLICY))}
          </section>
          <section class="editor-section">
            <h3>National</h3>
            ${fieldControl("national", "governmentalStability", "Stability %", national.governmentalStability)}
            ${fieldControl("national", "publicUnrest", "Public Unrest", national.publicUnrest)}
            ${fieldControl("national", "warSupport", "War Support %", national.warSupport)}
            ${fieldControl("national", "corruption", "Corruption %", national.corruption)}
            ${fieldControl("national", "developmentLevel", "Development", national.developmentLevel)}
            ${fieldControl("national", "budgetExpenditure", "Expenditure", national.budgetExpenditure)}
            ${fieldControl("national", "economicHealth", "Economic Health", national.economicHealth, "select", economicHealthOptions)}
            ${fieldControl("national", "immigrationRate", "Immigration", national.immigrationRate)}
            ${fieldControl("national", "taxRate", "Tax Rate", national.taxRate ?? 0)}
          </section>
          <section class="editor-section">
            <h3>Trade</h3>
            ${fieldControl("trade", "importReliance", "Import Reliance", trade.importReliance)}
            ${fieldControl("trade", "exportReliance", "Export Reliance", trade.exportReliance)}
            ${fieldControl("trade", "economicTradeDiversity", "Diversity", trade.economicTradeDiversity)}
            ${fieldControl("trade", "autarkyIndex", "Autarky", trade.autarkyIndex)}
            ${fieldControl("trade", "tradePolicy", "Trade Policy", trade.tradePolicy, "select", Object.keys(Engine.constants.TRADE_POLICY))}
            ${fieldControl("trade", "sanctionsLevel", "Sanctions", trade.sanctionsLevel, "select", Object.keys(Engine.constants.SANCTIONS))}
            ${fieldControl("trade", "tariffRate", "Tariff %", trade.tariffRate)}
          </section>
          <section class="editor-section">
            <h3>Industrial</h3>
            ${fieldControl("industrial", "civilianFactories", "Civilian Factories", industrial.civilianFactories)}
            ${fieldControl("industrial", "militaryFactories", "Military Factories", industrial.militaryFactories)}
            ${fieldControl("industrial", "shipyards", "Shipyards", industrial.shipyards)}
          </section>
          <section class="editor-section">
            <h3>Military</h3>
            ${fieldControl("military", "militaryOrganization", "Organization", military.militaryOrganization)}
            ${fieldControl("military", "militarySupply", "Supply %", military.militarySupply)}
            ${fieldControl("military", "mobilizationLevel", "Mobilization", military.mobilizationLevel, "select", Object.keys(Engine.constants.MOBILIZATION))}
            ${fieldControl("military", "equipmentComplexity", "Complexity", military.equipmentComplexity)}
            ${fieldControl("military", "cyberSecurity", "Cyber Security", military.cyberSecurity)}
            ${fieldControl("military", "combatPersonnel", "Combat Personnel", military.combatPersonnel)}
            ${fieldControl("military", "supportPersonnel", "Support Personnel", military.supportPersonnel)}
            ${fieldControl("military", "airForcePersonnel", "Air Force Personnel", military.airForcePersonnel)}
            ${fieldControl("military", "navalPersonnel", "Naval Personnel", military.navalPersonnel)}
            ${fieldControl("military", "reserveForces", "Reserve Forces", military.reserveForces)}
            ${fieldControl("military", "paramilitaryIrregular", "Paramilitary", military.paramilitaryIrregular)}
          </section>
          <section class="editor-section">
            <h3>Intelligence</h3>
            ${fieldControl("intelligence", "humint", "HUMINT", intelligence.humint)}
            ${fieldControl("intelligence", "sigint", "SIGINT", intelligence.sigint)}
            ${fieldControl("intelligence", "counterintelligence", "Counterintelligence", intelligence.counterintelligence)}
            ${fieldControl("intelligence", "covertAction", "Covert Action", intelligence.covertAction)}
            ${fieldControl("intelligence", "analysisDoctrine", "Analysis & Doctrine", intelligence.analysisDoctrine)}
            ${fieldControl("intelligence", "globalReach", "Global Reach", intelligence.globalReach)}
            ${fieldControl("intelligence", "internalSurveillance", "Internal Surveillance", intelligence.internalSurveillance)}
            ${fieldControl("intelligence", "secrecyDenial", "Secrecy & Denial", intelligence.secrecyDenial)}
          </section>
          <section class="editor-section">
            <h3>Civic Schedule</h3>
            ${fieldControl("eclipse", "eclipseStatus", "Eclipse Status", eclipse.eclipseStatus ?? "", "text")}
            ${fieldControl("elections", "leaderElections", "Leader Elections", elections.leaderElections ?? "", "text")}
            ${fieldControl("elections", "parliamentElections", "Parliament Elections", elections.parliamentElections ?? "", "text")}
          </section>
          <section class="editor-section">
            <h3>Derived Preview</h3>
            ${detailItem("Budget Capacity", fmtNumber(national.budgetCapacity))}
            ${detailItem("Budget Balance", fmtSigned(national.budgetBalance))}
            ${detailItem("Trade Balance", fmtSigned(trade.tradeBalance))}
            ${detailItem("Trade Flow", fmtNumber(trade.tradeFlow))}
            ${detailItem("Economic Impact", fmtNumber(trade.economicImpactScore))}
          </section>
        </div>
      </section>
    `;
  }

  function renderMilitary() {
    tablePanel(
      "Military Status",
      "Force readiness, supply, complexity, cyber capability, and personnel structure.",
      tableRowsFor("military"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "militaryOrganization", label: "Org", numeric: true, render: fmtNumber },
        { key: "militarySupply", label: "Supply", numeric: true, render: fmtPercent },
        { key: "mobilizationLevel", label: "Mobilization", render: (v) => `<span class="status">${v}</span>` },
        { key: "equipmentComplexity", label: "Complexity", numeric: true, render: fmtNumber },
        { key: "cyberSecurity", label: "Cyber", numeric: true, render: fmtNumber },
        { key: "combatPersonnel", label: "Combat", numeric: true, render: fmtNumber },
        { key: "supportPersonnel", label: "Support", numeric: true, secondary: true, render: fmtNumber },
        { key: "airForcePersonnel", label: "Air Force", numeric: true, secondary: true, render: fmtNumber },
        { key: "navalPersonnel", label: "Naval", numeric: true, secondary: true, render: fmtNumber },
        { key: "reserveForces", label: "Reserve", numeric: true, secondary: true, render: fmtNumber },
        { key: "paramilitaryIrregular", label: "Irregular", numeric: true, secondary: true, render: fmtNumber },
        { key: "active", label: "Active Total", numeric: true, raw: (row) => activeMilitary(row), render: fmtNumber }
      ],
      "military"
    );
  }

  function renderIntelligence() {
    tablePanel(
      "Intelligence Status",
      "Visible HUMINT, SIGINT, counterintelligence, covert action, doctrine, reach, surveillance, and secrecy scores.",
      tableRowsFor("intelligence"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "humint", label: "HUMINT", numeric: true, render: fmtNumber },
        { key: "sigint", label: "SIGINT", numeric: true, render: fmtNumber },
        { key: "counterintelligence", label: "Counterintel", numeric: true, render: fmtNumber },
        { key: "covertAction", label: "Covert", numeric: true, render: fmtNumber },
        { key: "analysisDoctrine", label: "Doctrine", numeric: true, render: fmtNumber },
        { key: "globalReach", label: "Reach", numeric: true, secondary: true, render: fmtNumber },
        { key: "internalSurveillance", label: "Surveillance", numeric: true, secondary: true, render: fmtNumber },
        { key: "secrecyDenial", label: "Secrecy", numeric: true, secondary: true, render: fmtNumber }
      ],
      "intelligence"
    );
  }

  function renderEclipse() {
    tablePanel(
      "Eclipse Status",
      "Current Eclipse status for active nations.",
      tableRowsFor("eclipse"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "eclipseStatus", label: "Eclipse Status", render: (value) => value ? `<span class="status">${value}</span>` : "Unknown" }
      ],
      "eclipse"
    );
  }

  function renderElections() {
    tablePanel(
      "Election Tracker",
      "Leadership and parliamentary election timing for active nations.",
      tableRowsFor("elections"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "leaderElections", label: "Leader Elections", render: (value) => value || "Unknown" },
        { key: "parliamentElections", label: "Parliament Elections", render: (value) => value || "Unknown" }
      ],
      "elections"
    );
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderNations() {
    const nations = filteredNations();
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

    app.innerHTML = `
      <div class="nation-layout">
        <section class="nation-list" aria-label="Nation list">
          ${nations
            .map(
              (nation) => `
                <button class="nation-button ${nation.id === selected.id ? "is-selected" : ""}" type="button" data-nation="${nation.id}">
                  <span class="swatch" style="background:${nation.color}"></span>
                  <strong>${nation.name}</strong>
                  <span class="status">${coverageFor(nation.id).filter((set) => set.hasData).length}/${datasets.length}</span>
                </button>`
            )
            .join("")}
        </section>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>${nationCell(selected.id)}</h2>
              <p>${coverageHtml(selected.id)}</p>
            </div>
          </div>
          <div class="detail-grid">
            ${detailItem(`${data.meta.currentYear} Population`, fmtNumber(populationFor(selected.id)))}
            ${detailItem("Economic Health", national?.economicHealth ?? "Unknown")}
            ${detailItem("Budget Balance", national ? fmtSigned(national.budgetBalance) : "Unknown")}
            ${detailItem("Trade Balance", trade ? fmtSigned(trade.tradeBalance) : "Unknown")}
            ${detailItem("Trade Policy", trade?.tradePolicy ?? "Unknown")}
            ${detailItem("Civilian Factories", fmtNumber(industrial?.civilianFactories))}
            ${detailItem("Military Factories", fmtNumber(industrial?.militaryFactories))}
            ${detailItem("Active Personnel", fmtNumber(activeMilitary(military)))}
            ${detailItem("Military Supply", fmtPercent(military?.militarySupply))}
            ${detailItem("Intelligence Total", fmtNumber(intelligence ? Object.values(intelligence).reduce((a, b) => a + b, 0) : null))}
            ${detailItem("Fleet Total", fmtNumber(naval?.total))}
            ${detailItem("Data Coverage", `${coverageFor(selected.id).filter((set) => set.hasData).length}/${datasets.length}`)}
          </div>
        </section>
      </div>
    `;
  }

  function renderNaval() {
    const q = state.query.trim().toLowerCase();
    const entries = Object.entries(data.naval).filter(([id, fleet]) => {
      if (!isVisibleNation(id)) return false;
      const nation = byId(id);
      const text = [
        nation?.name,
        ...fleet.categories.flatMap((category) => [category.name, ...category.ships.map((ship) => ship.name)])
      ]
        .join(" ")
        .toLowerCase();
      return !q || text.includes(q);
    });

    app.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Naval Inventory</h2>
            <p>Tracked fleet classes and force totals for active nations with naval records.</p>
          </div>
          <span class="status">${fmtNumber(entries.length)} fleets</span>
        </div>
        ${entries.length ? entries
          .map(([id, fleet]) => `
            <article class="fleet">
              <div class="fleet-head">
                <h2>${nationCell(id)}</h2>
                <span class="fleet-total">${fmtNumber(fleet.total)}</span>
              </div>
              ${fleet.totalNote ? `<p class="note">${fleet.totalNote}</p>` : ""}
              ${fleet.categories
                .map(
                  (category) => `
                    <div class="ship-category">
                      <h3>${category.name}</h3>
                      <div class="ship-list">
                        ${category.ships
                          .map((ship) => `<div class="ship-row"><span>${ship.name}</span><span>${fmtNumber(ship.count)}</span></div>`)
                          .join("")}
                      </div>
                    </div>`
                )
                .join("")}
            </article>`
          )
          .join("") : `<div class="empty">No fleets match the current search.</div>`}
      </section>
    `;
  }

  function renderEquipment() {
    const q = state.query.trim().toLowerCase();
    const costRows = data.equipmentCosts.filter((row) => [row.category, row.name].join(" ").toLowerCase().includes(q));
    app.innerHTML = `
      <div class="equipment-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Equipment Costs</h2>
              <p>Production and maintenance cost references used for equipment planning.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Equipment</th><th class="numeric">Production</th><th class="numeric">Maintenance</th></tr></thead>
              <tbody>
                ${costRows
                  .map((row) => `<tr><td>${row.category}</td><td>${row.name}</td><td class="numeric">${fmtCost(row.productionCost)}</td><td class="numeric">${fmtCost(row.maintenanceCost)}</td></tr>`)
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Cost Modifiers</h2>
              <p>Era, design, storage, and maintenance modifiers for equipment cost calculations.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Group</th><th>Modifier</th><th class="numeric">Value</th></tr></thead>
              <tbody>
                ${data.eraMultipliers.map((row) => `<tr><td>Era</td><td>${row.label}</td><td class="numeric">${row.multiplier}x</td></tr>`).join("")}
                ${data.costAdditionModifiers.map((row) => `<tr><td>Addition</td><td>${row.label}</td><td class="numeric">${row.multiplier}x</td></tr>`).join("")}
                ${data.costReductionModifiers.map((row) => `<tr><td>Reduction</td><td>${row.label}</td><td class="numeric">${fmtPercent(row.reduction)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function auditRows() {
    return visibleNations().map((nation) => {
      const present = coverageFor(nation.id).filter((set) => set.hasData).map((set) => set.label);
      const missing = coverageFor(nation.id).filter((set) => !set.hasData).map((set) => set.label);
      return { nation, present, missing };
    });
  }

  function renderAudit() {
    const rows = auditRows().filter((row) => !state.query || row.nation.name.toLowerCase().includes(state.query.toLowerCase()));
    const active = visibleNations();
    const datasetCounts = datasets.map((set) => ({
      label: set.label,
      count: active.filter((nation) => Boolean(data[set.key]?.[nation.id])).length,
      missing: active.filter((nation) => !data[set.key]?.[nation.id]).length
    }));

    app.innerHTML = `
      <div class="audit-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Dataset Coverage</h2>
              <p>Coverage across active operational datasets.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Dataset</th><th class="numeric">Rows Entered</th><th class="numeric">Missing Nations</th></tr></thead>
              <tbody>
                ${datasetCounts.map((row) => `<tr><td>${row.label}</td><td class="numeric">${fmtNumber(row.count)}</td><td class="numeric">${fmtNumber(row.missing)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Nation Completeness</h2>
              <p>Dataset availability for every active nation in the ledger.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nation</th><th>Present</th><th>Missing</th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `
                      <tr>
                        <td>${nationCell(row.nation.id)}</td>
                        <td>${row.present.map((label) => `<span class="status positive">${label}</span>`).join(" ")}</td>
                        <td>${row.missing.length ? row.missing.map((label) => `<span class="status warning">${label}</span>`).join(" ") : `<span class="status positive">Complete</span>`}</td>
                      </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function render() {
    if (!canAccessTab(state.tab)) state.tab = "overview";
    ensureSelectedNation();
    tabs.forEach((tab) => {
      const relatedTabs = (tab.dataset.relatedTabs || "").split(" ").filter(Boolean);
      tab.classList.toggle("is-active", tab.dataset.tab === state.tab || relatedTabs.includes(state.tab));
    });
    if (viewSelect.value !== state.tab) viewSelect.value = state.tab;
    const renderers = {
      overview: renderOverview,
      simulation: renderSimulation,
      editor: renderEditor,
      nations: renderNations,
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
      audit: renderAudit
    };
    renderers[state.tab]();
  }

  viewOptions.filter((view) => isAdmin || !view.adminOnly).forEach((view) => {
    const option = document.createElement("option");
    option.value = view.key;
    option.textContent = view.label;
    viewSelect.append(option);
  });

  populateNationSelect();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!canAccessTab(tab.dataset.tab)) return;
      state.tab = tab.dataset.tab;
      render();
    });
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  let editRenderTimer = null;

  function applyEdit(edit, renderNow = true) {
    if (!isAdmin) {
      state.notice = "Editor access is restricted.";
      render();
      return;
    }
    const dataset = edit.dataset.dataset;
    const path = edit.dataset.path;
    const id = edit.dataset.id || state.selectedNation;
    const rawValue = edit.value;
    const value = edit.tagName === "SELECT" || edit.type === "text" ? rawValue : Engine.number(rawValue, 0);
    Engine.updateValue(data, dataset, id, path, value);
    if (path === "mobilizationLevel") {
      if (dataset === "military" && data.industrial[id]) data.industrial[id].mobilizationLevel = value;
      if (dataset === "industrial" && data.military[id]) data.military[id].mobilizationLevel = value;
    }
    Engine.recalculateAll(data);
    state.notice = `${byId(id)?.name || "Nation"} updated.`;
    Engine.save(data);
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    if (renderNow) {
      clearTimeout(editRenderTimer);
      render();
    } else {
      clearTimeout(editRenderTimer);
      editRenderTimer = setTimeout(() => render(), 700);
    }
  }

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  viewSelect.addEventListener("change", (event) => {
    if (!canAccessTab(event.target.value)) {
      state.tab = "overview";
      render();
      return;
    }
    state.tab = event.target.value;
    render();
  });

  app.addEventListener("input", (event) => {
    const edit = event.target.closest("[data-edit]");
    if (edit) applyEdit(edit, false);
  });

  nationSelect.addEventListener("change", (event) => {
    state.selectedNation = event.target.value;
    if (state.tab !== "editor") state.tab = "nations";
    render();
  });

  app.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
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
      if (action === "advance-one") {
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
        state.showDetails = !state.showDetails;
        render();
      } else if (action === "reset-state") {
        resetWorkingState();
      } else if (action === "export-json") {
        downloadText(`ag-gs-${data.meta.currentYear}.json`, JSON.stringify(data, null, 2));
      } else if (action === "export-data-js") {
        downloadText("data.js", Engine.exportDataJs(data), "text/javascript");
      } else if (action === "publish-live-state") {
        Engine.save(data);
        await publishSharedState("Published current state to the live ledger.");
      }
      return;
    }

    const nationButton = event.target.closest("[data-nation]");
    if (nationButton) {
      state.selectedNation = nationButton.dataset.nation;
      nationSelect.value = state.selectedNation;
      render();
      return;
    }

    const header = event.target.closest("th[data-table]");
    if (header) {
      const table = header.dataset.table;
      const key = header.dataset.key;
      const current = state.sort[table] || {};
      state.sort[table] = { key, dir: current.key === key && current.dir === "asc" ? "desc" : "asc" };
      render();
    }
  });

  app.addEventListener("change", (event) => {
    const edit = event.target.closest("[data-edit]");
    if (edit && !isAdmin) {
      state.notice = "Editor access is restricted.";
      render();
      return;
    }
    if (!edit) {
      if (event.target.id === "worldHealthInput") {
        data.meta.worldEconomicHealth = event.target.value;
        Engine.recalculateAll(data);
        saveWorkingState("World economy updated.");
      } else if (event.target.id === "currentYearInput") {
        data.meta.currentYear = Number(event.target.value || data.meta.currentYear);
        saveWorkingState(`Working year set to ${data.meta.currentYear}.`);
      }
      return;
    }

    applyEdit(edit, true);
  });

  render();
  startSharedSync();
})();
