(function () {
  const baseData = window.AGGS_DATA;
  const Engine = window.AGGS_ENGINE;
  let data = Engine.load(baseData);
  const app = document.getElementById("app");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const sourceNote = document.getElementById("sourceNote");
  const sourcePill = document.querySelector(".source-pill");
  const themeToggle = document.getElementById("themeToggle");
  const isAdmin = document.body.dataset.appMode === "admin";
  const THEME_KEY = "aggs-theme";
  const adminOnlyTabs = new Set(["editor", "simulation", "history"]);
  const adminOnlyActions = new Set([
    "advance-one",
    "advance-target",
    "recalculate",
    "reset-state",
    "export-json",
    "export-data-js",
    "publish-live-state",
    "create-nation",
    "archive-nation",
    "restore-nation",
    "refresh-snapshots",
    "snapshot-revert",
    "snapshot-export"
  ]);
  const sharedSync = {
    enabled: location.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1"].includes(location.hostname),
    endpoint: window.AGGS_API_URL || (isAdmin ? "/admin/api/state" : "/api/state"),
    pollMs: 2500,
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
    { key: "history", label: "Change History", adminOnly: true },
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
  const statusTableKeys = new Set(["industrial", "intelligence", "military", "national", "population", "trade"]);

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeText(value, fallback = "Unknown") {
    return escapeHtml(value === null || value === undefined || value === "" ? fallback : value);
  }

  function safeColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#8a94a6";
  }

  function safeStatus(value, tone = "") {
    const className = tone ? ` ${escapeHtml(tone)}` : "";
    return `<span class="status${className}">${safeText(value)}</span>`;
  }

  function fmtNumber(value) {
    return value === null || value === undefined || value === "" ? "Unknown" : Number(value).toLocaleString("en-US");
  }

  function fmtYear(value) {
    const year = Number(value);
    return Number.isFinite(year) ? String(Math.trunc(year)) : "Unknown";
  }

  function fmtCompact(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function fmtDateTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  }

  function fmtPercent(value) {
    return value === null || value === undefined || value === "" ? "Unknown" : `${value}%`;
  }

  function fmtDecimalPercent(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const percent = Engine.number(value, 0) * 100;
    return `${Number(percent.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 })}%`;
  }

  function fmtSigned(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    return value > 0 ? `+${fmtNumber(value)}` : fmtNumber(value);
  }

  function fmtCost(value) {
    return value === null || value === undefined ? "Unknown" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  function fmtHistoryValue(value) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const numeric = typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)));
    if (!numeric) return String(value);
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  const decimalPercentFields = new Set(["national.taxRate"]);

  function fieldKey(dataset, path) {
    return `${dataset}.${path}`;
  }

  function isDecimalPercentField(dataset, path) {
    return decimalPercentFields.has(fieldKey(dataset, path));
  }

  function isDecimalPercentChangeKey(key) {
    return decimalPercentFields.has(key);
  }

  function trimInputNumber(value, maximumFractionDigits = 6) {
    const number = Number(value);
    return Number.isFinite(number) ? String(Number(number.toFixed(maximumFractionDigits))) : "";
  }

  function editFieldValue(dataset, path, value) {
    if (!isDecimalPercentField(dataset, path)) return value ?? "";
    return trimInputNumber(Engine.number(value, 0) * 100);
  }

  function historyFieldValue(dataset, path, value) {
    return isDecimalPercentField(dataset, path) ? fmtDecimalPercent(value) : value;
  }

  function fmtHistoryChangeValue(key, value) {
    return isDecimalPercentChangeKey(key) ? fmtDecimalPercent(value) : fmtHistoryValue(value);
  }

  function fmtHistoryDelta(key, value) {
    if (!isDecimalPercentChangeKey(key)) return fmtSigned(value);
    const percentDelta = Engine.number(value, 0) * 100;
    return `${fmtSigned(Number(percentDelta.toFixed(4)))} pts`;
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
    sharedSync.revision = null;
    pendingEdits.clear();
    state.notice = sharedSync.enabled ? "Reloading the live ledger." : "Cleared local fallback state.";
    ensureSelectedNation();
    updateSourceNote();
    render();
    if (sharedSync.enabled) fetchSharedState();
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
    data = Engine.normalizeState(Engine.clone(payload.data));
    pendingEdits.clear();
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

  async function fetchSnapshots(force = false) {
    if (!sharedSync.enabled || !isAdmin || sharedSync.isLoadingSnapshots) return;
    if (!force && sharedSync.snapshotsLoaded) return;
    sharedSync.isLoadingSnapshots = true;
    try {
      const response = await fetch("/admin/api/snapshots", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const payload = await readSharedJson(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot list is unavailable.");
      sharedSync.snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];
      sharedSync.snapshotsLoaded = true;
    } catch (error) {
      sharedSync.snapshotsLoaded = true;
      state.notice = error.message || "Snapshot list is unavailable.";
    } finally {
      sharedSync.isLoadingSnapshots = false;
      if (state.tab === "history") render();
    }
  }

  async function revertSelectedSnapshot() {
    const snapshotRevision = Number(document.getElementById("snapshotSelect")?.value || 0);
    if (!snapshotRevision) {
      state.notice = "Select a revision snapshot first.";
      render();
      return;
    }
    if (!window.confirm(`Revert the live ledger to revision #${snapshotRevision}? The current live state will be saved as a snapshot first.`)) return;
    try {
      const response = await fetch("/admin/api/revert", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ revision: sharedSync.revision, snapshotRevision })
      });
      const payload = await readSharedJson(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot revert failed.");
      sharedSync.updatedAt = payload.updatedAt || sharedSync.updatedAt;
      sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
      state.notice = `Reverted live ledger to snapshot #${snapshotRevision}.`;
      await fetchSharedState();
      await fetchSnapshots(true);
    } catch (error) {
      state.notice = error.message || "Snapshot revert failed.";
      render();
    }
  }

  async function exportSelectedSnapshot() {
    const snapshotRevision = Number(document.getElementById("snapshotSelect")?.value || 0);
    if (!snapshotRevision) {
      state.notice = "Select a revision snapshot first.";
      render();
      return;
    }
    try {
      const response = await fetch(`/admin/api/snapshots/${snapshotRevision}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const payload = await readSharedJson(response);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot export failed.");
      downloadText(`ag-gs-revision-${snapshotRevision}.json`, JSON.stringify(payload.snapshot, null, 2));
      state.notice = `Exported snapshot #${snapshotRevision}.`;
      render();
    } catch (error) {
      state.notice = error.message || "Snapshot export failed.";
      render();
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
      fetchSnapshots(true);
      if (document.activeElement?.closest?.("[data-edit]")) {
        updateSourceNote();
      } else {
        render();
      }
    } catch (error) {
      sharedSync.isPublishing = false;
      markSync("offline", error.message || "Shared publish failed.");
      state.notice = `Saved locally. ${error.message || "Live publish failed."}`;
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
                  <span class="leaderboard-name"><span class="swatch" style="background:${safeColor(nation.color)}"></span><span class="leaderboard-label">${safeText(nation.name)}</span></span>
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
      <section class="panel">
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
        <div class="table-wrap">
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
        { key: "budgetBalance", label: "Balance", numeric: true, render: (v) => safeStatus(fmtSigned(v), v >= 0 ? "positive" : "negative") },
        { key: "debt", label: "Debt", numeric: true, render: fmtPercent },
        { key: "economicHealth", label: "Health", render: (v) => safeStatus(v, v === "Prosperity" ? "positive" : v === "Recovery" ? "warning" : "") },
        { key: "immigrationRate", label: "Immigration", numeric: true, secondary: true, render: fmtNumber },
        { key: "taxRate", label: "Tax Rate", numeric: true, secondary: true, render: fmtDecimalPercent }
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
        { key: "tradeBalance", label: "Balance", numeric: true, render: (v) => safeStatus(fmtSigned(v), v >= 0 ? "positive" : "negative") },
        { key: "tradeFlow", label: "Flow", numeric: true, render: fmtNumber },
        { key: "tradePower", label: "Power", numeric: true, secondary: true, render: fmtNumber },
        { key: "importReliance", label: "Import", numeric: true, secondary: true, render: fmtNumber },
        { key: "exportReliance", label: "Export", numeric: true, secondary: true, render: fmtNumber },
        { key: "economicTradeDiversity", label: "Diversity", numeric: true, secondary: true, render: fmtNumber },
        { key: "tradePolicy", label: "Policy", render: (v) => safeStatus(v) },
        { key: "sanctionsLevel", label: "Sanctions", render: (v) => safeStatus(v, v === "None" ? "positive" : "warning") },
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
        { key: "mobilizationLevel", label: "Mobilization", render: (v) => safeStatus(v) },
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
      { key: "mandatoryChildPolicy", label: "Child Policy", render: (v) => safeStatus(v) },
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
          <span class="status ${state.notice ? "positive" : ""}">${safeText(state.notice || "Ready")}</span>
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
              <span class="status" data-sim-target-chip>${safeText(`Target ${targetYear}`)}</span>
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
    const targetChip = document.querySelector("[data-sim-target-chip]");
    const economyLabel = document.querySelector("[data-sim-world-economy]");
    if (currentLabel) currentLabel.textContent = fmtYear(currentYear);
    if (targetLabel) targetLabel.textContent = fmtYear(targetYear);
    if (targetChip) targetChip.textContent = `Target ${fmtYear(targetYear)}`;
    if (economyLabel && worldHealthInput) economyLabel.textContent = worldHealthInput.value || "Expansion";
  }

  function fieldControl(dataset, path, label, value, type = "number", options = []) {
    const id = `${dataset}-${path}`.replace(/[^a-z0-9_-]/gi, "-");
    const fieldClass = ["control-field", type === "text" ? "is-text" : "", type === "select" ? "is-select" : ""]
      .filter(Boolean)
      .join(" ");
    const renderedValue = editFieldValue(dataset, path, value);
    if (type === "select") {
      return `
        <label class="${fieldClass}" for="${id}">
          <span>${safeText(label)}</span>
          <select id="${id}" data-edit data-dataset="${dataset}" data-path="${path}">
            ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
        </label>`;
    }
    return `
      <label class="${fieldClass}" for="${id}">
        <span>${safeText(label)}</span>
        <input id="${id}" type="${type}" value="${escapeHtml(renderedValue)}" inputmode="decimal" step="any" data-edit data-dataset="${dataset}" data-path="${path}">
      </label>`;
  }

  function slugifyNationName(name) {
    const base = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return base || "new_nation";
  }

  function uniqueNationId(name) {
    const base = slugifyNationName(name);
    const used = new Set(data.nations.map((nation) => nation.id));
    let next = base;
    let index = 2;
    while (used.has(next)) {
      next = `${base}_${index}`;
      index += 1;
    }
    return next;
  }

  function defaultNationRecords(id) {
    const currentYear = String(data.meta.currentYear || 2021);
    return {
      national: {
        governmentalStability: 70,
        publicUnrest: 0,
        warSupport: 50,
        corruption: 20,
        developmentLevel: 10,
        budgetCapacity: 0,
        budgetExpenditure: 0,
        budgetBalance: 0,
        debt: 0,
        economicHealth: data.meta.worldEconomicHealth || "Expansion",
        immigrationRate: 0,
        taxRate: 0.02
      },
      trade: {
        tradeCapacity: 0,
        tradeEfficiency: 0,
        autarkyIndex: 50,
        tradeBalance: 0,
        tradeFlow: 0,
        tradePower: 0,
        importReliance: 100,
        exportReliance: 100,
        economicTradeDiversity: 100,
        tradePolicy: "Balanced",
        sanctionsLevel: "None",
        tariffRate: 5,
        economicImpactScore: 0
      },
      industrial: {
        mobilizationLevel: "None",
        militaryFactories: 10,
        civilianFactories: 100,
        shipyards: 10
      },
      population: {
        mandatoryChildPolicy: "No Policy",
        values: { [currentYear]: 1000000 }
      },
      military: {
        militaryOrganization: 5,
        militarySupply: 100,
        mobilizationLevel: "None",
        equipmentComplexity: 7,
        cyberSecurity: 5,
        combatPersonnel: 0,
        supportPersonnel: 0,
        airForcePersonnel: 0,
        navalPersonnel: 0,
        reserveForces: 0,
        paramilitaryIrregular: 0
      },
      intelligence: {
        humint: 0,
        sigint: 0,
        counterintelligence: 0,
        covertAction: 0,
        analysisDoctrine: 0,
        globalReach: 0,
        internalSurveillance: 0,
        secrecyDenial: 0
      },
      eclipse: { eclipseStatus: "" },
      elections: { leaderElections: "", parliamentElections: "" },
      naval: { total: 0, totalNote: "No fleet entered.", categories: [] }
    };
  }

  function recordsFromTemplate(sourceId, id) {
    const defaults = defaultNationRecords(id);
    if (!sourceId || !byId(sourceId)) return defaults;
    return {
      national: Engine.clone(data.national[sourceId] || defaults.national),
      trade: Engine.clone(data.trade[sourceId] || defaults.trade),
      industrial: Engine.clone(data.industrial[sourceId] || defaults.industrial),
      population: Engine.clone(data.population[sourceId] || defaults.population),
      military: Engine.clone(data.military[sourceId] || defaults.military),
      intelligence: Engine.clone(data.intelligence[sourceId] || defaults.intelligence),
      eclipse: Engine.clone(data.eclipse[sourceId] || defaults.eclipse),
      elections: Engine.clone(data.elections[sourceId] || defaults.elections),
      naval: Engine.clone(data.naval[sourceId] || defaults.naval)
    };
  }

  function applyNationRecords(id, records) {
    ["national", "trade", "industrial", "population", "military", "intelligence", "eclipse", "elections", "naval"].forEach((key) => {
      data[key][id] = records[key];
    });
  }

  function renderNationManagement(nation) {
    const color = nation?.color || "#63a4ff";
    const archived = archivedNations();
    return `
      <section class="panel roster-manager" aria-label="Roster manager">
        <div class="panel-head compact-head">
          <div>
            <h2>Roster Manager</h2>
            <p>Create countries, archive inactive records, and restore archived countries without losing datasets.</p>
          </div>
          <span class="status">${fmtNumber(visibleNations().length)} active / ${fmtNumber(archived.length)} archived</span>
        </div>
        <div class="roster-tools-grid">
          <div class="roster-create-card">
            <label class="control-field roster-name-field" for="newNationName">
              <span>Name</span>
              <input id="newNationName" type="text" placeholder="New country name" autocomplete="off">
            </label>
            <label class="control-field color-field" for="newNationColor">
              <span>Color</span>
              <input id="newNationColor" type="color" value="${escapeHtml(color)}" aria-label="Nation color">
            </label>
            <label class="control-field roster-template-field" for="newNationTemplate">
              <span>Starting Stats</span>
              <select id="newNationTemplate">
                <option value="blank">Blank baseline</option>
                ${nation ? `<option value="copy">Copy ${safeText(nation.name)}</option>` : ""}
              </select>
            </label>
            <button class="command primary roster-create-command" type="button" data-action="create-nation">Create Nation</button>
          </div>
          <div class="roster-archive-card">
            <label class="control-field" for="archiveNationSelect">
              <span>Archive Country</span>
              <select id="archiveNationSelect">
                ${nationOptionsHtml("", true, "Select country to archive")}
              </select>
            </label>
            <button class="command danger" type="button" data-action="archive-nation">Archive</button>
          </div>
          <div class="roster-restore-card">
            <label class="control-field" for="restoreNationSelect">
              <span>Restore Country</span>
              <select id="restoreNationSelect">
                ${archivedNationOptionsHtml("", true, archived.length ? "Select archived country" : "No archived countries")}
              </select>
            </label>
            <button class="command positive" type="button" data-action="restore-nation" ${archived.length ? "" : "disabled"}>Restore</button>
          </div>
        </div>
      </section>`;
  }

  function createNationFromEditor() {
    const nameInput = document.getElementById("newNationName");
    const colorInput = document.getElementById("newNationColor");
    const templateInput = document.getElementById("newNationTemplate");
    const name = String(nameInput?.value || "").trim();
    if (!name) {
      state.notice = "Enter a country name first.";
      render();
      return;
    }
    const id = uniqueNationId(name);
    const color = safeColor(colorInput?.value || "#63a4ff");
    const sourceId = templateInput?.value === "copy" ? state.selectedNation : "";
    data.nations.push({ id, name, color });
    data.meta.hiddenNationIds = (data.meta.hiddenNationIds || []).filter((hiddenId) => hiddenId !== id);
    data.meta.archivedNationIds = (data.meta.archivedNationIds || []).filter((archivedId) => archivedId !== id);
    applyNationRecords(id, recordsFromTemplate(sourceId, id));
    Engine.recalculateAll(data);
    data.meta.changeHistory = [{
      key: `nation-created:${id}:${Date.now()}`,
      nationId: id,
      nationName: name,
      dataset: "nations",
      field: "create",
      label: "Created Nation",
      beforeValue: "None",
      afterValue: name,
      changedAt: new Date().toISOString(),
      changes: [],
      deltas: []
    }, ...(data.meta.changeHistory || [])].slice(0, 60);
    state.selectedNation = id;
    state.notice = `${name} created. Fill out its stats below.`;
    Engine.save(data);
    populateNationSelect();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    render();
  }

  function archiveSelectedNationFromEditor() {
    const targetId = document.getElementById("archiveNationSelect")?.value || "";
    const nation = byId(targetId);
    if (!nation) {
      state.notice = "Select a country to archive first.";
      render();
      return;
    }
    if (!window.confirm(`Archive ${nation.name}? It will be hidden from active calculations, but all ledger rows will be kept for restore.`)) return;
    if (!Engine.archiveNation(data, nation.id)) {
      state.notice = "That country could not be archived.";
      render();
      return;
    }
    data.meta.changeHistory = [{
      key: `nation-archived:${nation.id}:${Date.now()}`,
      nationId: nation.id,
      nationName: nation.name,
      dataset: "nations",
      field: "archive",
      label: "Archived Nation",
      beforeValue: "Active",
      afterValue: "Archived",
      changedAt: new Date().toISOString(),
      changes: [],
      deltas: []
    }, ...(data.meta.changeHistory || [])].slice(0, 60);
    ensureSelectedNation();
    Engine.recalculateAll(data);
    state.notice = `${nation.name} archived.`;
    Engine.save(data);
    populateNationSelect();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    render();
  }

  function restoreArchivedNationFromEditor() {
    const targetId = document.getElementById("restoreNationSelect")?.value || "";
    const nation = byId(targetId);
    if (!nation) {
      state.notice = "Select an archived country to restore first.";
      render();
      return;
    }
    if (!Engine.restoreNation(data, nation.id)) {
      state.notice = `${nation.name} is not archived.`;
      render();
      return;
    }
    state.selectedNation = nation.id;
    data.meta.changeHistory = [{
      key: `nation-restored:${nation.id}:${Date.now()}`,
      nationId: nation.id,
      nationName: nation.name,
      dataset: "nations",
      field: "restore",
      label: "Restored Nation",
      beforeValue: "Archived",
      afterValue: "Active",
      changedAt: new Date().toISOString(),
      changes: [],
      deltas: []
    }, ...(data.meta.changeHistory || [])].slice(0, 60);
    Engine.recalculateAll(data);
    state.notice = `${nation.name} restored.`;
    Engine.save(data);
    populateNationSelect();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    render();
  }

  function renderEditorSummary(nation, national, trade, industrial, military, currentYear) {
    const coverage = coverageFor(nation.id).filter((set) => set.hasData).length;
    return `
      <div class="editor-summary">
        ${overviewFact("Population", fmtCompact(populationFor(nation.id, currentYear)))}
        ${overviewFact("Budget", fmtNumber(national.budgetCapacity))}
        ${overviewFact("Trade Flow", fmtCompact(trade.tradeFlow))}
        ${overviewFact("Factories", fmtNumber((Number(industrial.civilianFactories) || 0) + (Number(industrial.militaryFactories) || 0)))}
        ${overviewFact("Supply", fmtPercent(military.militarySupply))}
        ${overviewFact("Coverage", `${coverage}/${datasets.length}`)}
      </div>`;
  }

  function renderEditorRail(nation, national, trade) {
    const recent = changeHistoryRows(nation.id, 3);
    return `
      <aside class="editor-rail">
        <section class="editor-rail-panel derived-preview">
          <div class="editor-rail-head">
            <div>
              <span class="section-kicker">Live Calculation Preview</span>
              <h3>Derived State</h3>
            </div>
            <span class="status ${state.notice ? "positive" : ""}">${safeText(state.notice || "Ready")}</span>
          </div>
          <div class="rail-detail-grid">
            ${detailItem("Budget Capacity", fmtNumber(national.budgetCapacity))}
            ${detailItem("Budget Balance", fmtSigned(national.budgetBalance))}
            ${detailItem("Trade Balance", fmtSigned(trade.tradeBalance))}
            ${detailItem("Trade Flow", fmtNumber(trade.tradeFlow))}
            ${detailItem("Economic Impact", fmtNumber(trade.economicImpactScore))}
            ${detailItem("Coverage", `${coverageFor(nation.id).filter((set) => set.hasData).length}/${datasets.length}`)}
          </div>
        </section>
        <section class="editor-rail-panel">
          <div class="editor-rail-head compact">
            <h3>Recent Change Impact</h3>
          </div>
          ${recent.length ? `
            <div class="rail-change-list">
              ${recent
                .map((entry) => `
                  <div class="rail-change-row">
                    <strong>${escapeHtml(entry.label || entry.field || "Edit")}</strong>
                    <div class="change-impact">${(entry.changes || entry.deltas || []).length ? (entry.changes || entry.deltas).slice(0, 3).map(renderChangeBadge).join("") : `<span class="status">No calculated change</span>`}</div>
                  </div>`)
                .join("")}
            </div>` : `<div class="empty compact">No changes recorded yet.</div>`}
        </section>
      </aside>`;
  }

  function renderEditor() {
    const nation = byId(state.selectedNation) || visibleNations()[0];
    if (!nation) {
      app.innerHTML = `
        ${renderNationManagement(null)}
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Nation Editor</h2>
              <p>No live nation data is loaded yet.</p>
            </div>
          <span class="status">${safeText(syncLabel(true))}</span>
          </div>
          <div class="empty">Open the live site through Cloudflare, or publish a valid state from the admin API.</div>
        </section>
      `;
      return;
    }
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
      ${renderNationManagement(nation)}
      <section class="panel">
        <div class="panel-head editor-panel-head">
          <div>
            <h2>Nation Editor</h2>
            <p>Pick a record, edit its stats, and dependent systems recalculate automatically.</p>
          </div>
          <div class="editor-head-controls">
            <label class="select-shell editor-nation-picker" for="editorNationSelect">
              <span>Editing</span>
              <select id="editorNationSelect" data-nation-select>
                ${nationOptionsHtml(nation.id)}
              </select>
            </label>
            <span class="status ${state.notice ? "positive" : ""}">${safeText(state.notice || "Editor ready")}</span>
          </div>
        </div>
        ${renderEditorSummary(nation, national, trade, industrial, military, currentYear)}
        <div class="editor-layout">
          <div class="editor-sections">
            <section class="editor-section editor-section-national">
              <h3>National</h3>
              ${fieldControl("national", "governmentalStability", "Stability %", national.governmentalStability)}
              ${fieldControl("national", "publicUnrest", "Public Unrest", national.publicUnrest)}
              ${fieldControl("national", "warSupport", "War Support %", national.warSupport)}
              ${fieldControl("national", "corruption", "Corruption %", national.corruption)}
              ${fieldControl("national", "developmentLevel", "Development", national.developmentLevel)}
              ${fieldControl("national", "budgetExpenditure", "Expenditure", national.budgetExpenditure)}
              ${fieldControl("national", "economicHealth", "Economic Health", national.economicHealth, "select", economicHealthOptions)}
              ${fieldControl("national", "immigrationRate", "Immigration", national.immigrationRate)}
              ${fieldControl("national", "taxRate", "Tax Rate %", national.taxRate ?? 0)}
            </section>
            <section class="editor-section editor-section-trade">
              <h3>Trade</h3>
              ${fieldControl("trade", "importReliance", "Import Reliance", trade.importReliance)}
              ${fieldControl("trade", "exportReliance", "Export Reliance", trade.exportReliance)}
              ${fieldControl("trade", "economicTradeDiversity", "Diversity", trade.economicTradeDiversity)}
              ${fieldControl("trade", "autarkyIndex", "Autarky", trade.autarkyIndex)}
              ${fieldControl("trade", "tradePolicy", "Trade Policy", trade.tradePolicy, "select", Object.keys(Engine.constants.TRADE_POLICY))}
              ${fieldControl("trade", "sanctionsLevel", "Sanctions", trade.sanctionsLevel, "select", Object.keys(Engine.constants.SANCTIONS))}
              ${fieldControl("trade", "tariffRate", "Tariff %", trade.tariffRate)}
            </section>
            <section class="editor-section editor-section-military">
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
            <section class="editor-section editor-section-intelligence">
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
            <section class="editor-section editor-section-population">
              <h3>Population</h3>
              ${fieldControl("population", String(currentYear), `Population (${currentYear})`, populationFor(nation.id, currentYear))}
              ${fieldControl("population", "mandatoryChildPolicy", "Child Policy", population.mandatoryChildPolicy, "select", Object.keys(Engine.constants.CHILD_POLICY))}
            </section>
            <section class="editor-section editor-section-industrial">
              <h3>Industrial</h3>
              ${fieldControl("industrial", "civilianFactories", "Civilian Factories", industrial.civilianFactories)}
              ${fieldControl("industrial", "militaryFactories", "Military Factories", industrial.militaryFactories)}
              ${fieldControl("industrial", "shipyards", "Shipyards", industrial.shipyards)}
            </section>
            <section class="editor-section editor-section-civic">
              <h3>Civic Schedule</h3>
              ${fieldControl("eclipse", "eclipseStatus", "Eclipse Status", eclipse.eclipseStatus ?? "", "text")}
              ${fieldControl("elections", "leaderElections", "Leader Elections", elections.leaderElections ?? "", "text")}
              ${fieldControl("elections", "parliamentElections", "Parliament Elections", elections.parliamentElections ?? "", "text")}
            </section>
          </div>
          ${renderEditorRail(nation, national, trade)}
        </div>
      </section>
      ${renderChangeHistoryPanel(nation.id, 6)}
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
        { key: "mobilizationLevel", label: "Mobilization", render: (v) => safeStatus(v) },
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
        { key: "eclipseStatus", label: "Eclipse Status", render: (value) => value ? safeStatus(value) : "Unknown" }
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
        { key: "leaderElections", label: "Leader Elections", render: (value) => safeText(value) },
        { key: "parliamentElections", label: "Parliament Elections", render: (value) => safeText(value) }
      ],
      "elections"
    );
  }

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
      budgetBalance: "Budget Balance",
      tradeBalance: "Trade Balance",
      tradeFlow: "Trade Flow",
      tradePower: "Trade Power",
      tradeCapacity: "Trade Capacity",
      tradeEfficiency: "Trade Efficiency",
      economicImpactScore: "Economic Impact",
      governmentalStability: "Stability",
      publicUnrest: "Public Unrest",
      warSupport: "War Support",
      corruption: "Corruption",
      developmentLevel: "Development",
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
      sanctionsLevel: "Sanctions",
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
            <p>Recent admin edits and every changed field after recalculation.</p>
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
              const impacts = entry.changes || entry.deltas || [];
              return `
                <article class="history-list-row" role="row">
                  <div class="history-time" role="cell">${historyTime(entry.changedAt)}</div>
                  <div role="cell">${nationCell(entry.nationId)}</div>
                  <div class="history-edit" role="cell">${escapeHtml(entry.label || entry.field)}</div>
                  <div role="cell"><span class="history-value">${escapeHtml(fmtHistoryValue(entry.beforeValue))}<span aria-hidden="true"> &rarr; </span>${escapeHtml(fmtHistoryValue(entry.afterValue))}</span></div>
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
    const budgetTone = national?.budgetBalance >= 0 ? "positive" : "negative";
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
              <span class="swatch" style="background:${safeColor(selected.color)}"></span>
              <div>
                <span class="section-kicker">Nation Dossier</span>
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
            ${dossierMetric("Budget Capacity", fmtNumber(national?.budgetCapacity), national ? `${fmtSigned(national.budgetBalance)} balance` : "No national row")}
            ${dossierMetric("Trade Flow", fmtCompact(trade?.tradeFlow), trade ? `${fmtSigned(trade.tradeBalance)} balance` : "No trade row")}
            ${dossierMetric("Active Personnel", fmtCompact(militaryPersonnel), "Military total")}
            ${dossierMetric("Fleet", fmtNumber(naval?.total), "Tracked naval assets")}
          </div>
          <div class="nation-dossier-grid">
            ${dossierSection("National", [
              dossierRow("Stability", fmtPercent(national?.governmentalStability)),
              dossierRow("Development", fmtNumber(national?.developmentLevel)),
              dossierRow("Budget Balance", national ? fmtSigned(national.budgetBalance) : "Unknown", budgetTone),
              dossierRow("Debt", fmtPercent(national?.debt))
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
              ${fleet.totalNote ? `<p class="note">${safeText(fleet.totalNote)}</p>` : ""}
              ${fleet.categories
                .map(
                  (category) => `
                    <div class="ship-category">
                      <h3>${safeText(category.name)}</h3>
                      <div class="ship-list">
                        ${category.ships
                          .map((ship) => `<div class="ship-row"><span>${safeText(ship.name)}</span><span>${fmtNumber(ship.count)}</span></div>`)
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
                  .map((row) => `<tr><td>${safeText(row.category)}</td><td>${safeText(row.name)}</td><td class="numeric">${fmtCost(row.productionCost)}</td><td class="numeric">${fmtCost(row.maintenanceCost)}</td></tr>`)
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
                ${data.eraMultipliers.map((row) => `<tr><td>Era</td><td>${safeText(row.label)}</td><td class="numeric">${fmtCost(row.multiplier)}x</td></tr>`).join("")}
                ${data.costAdditionModifiers.map((row) => `<tr><td>Addition</td><td>${safeText(row.label)}</td><td class="numeric">${fmtCost(row.multiplier)}x</td></tr>`).join("")}
                ${data.costReductionModifiers.map((row) => `<tr><td>Reduction</td><td>${safeText(row.label)}</td><td class="numeric">${fmtPercent(row.reduction)}</td></tr>`).join("")}
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
                ${datasetCounts.map((row) => `<tr><td>${safeText(row.label)}</td><td class="numeric">${fmtNumber(row.count)}</td><td class="numeric">${fmtNumber(row.missing)}</td></tr>`).join("")}
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
                        <td>${row.present.map((label) => safeStatus(label, "positive")).join(" ")}</td>
                        <td>${row.missing.length ? row.missing.map((label) => safeStatus(label, "warning")).join(" ") : safeStatus("Complete", "positive")}</td>
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

  let editRenderTimer = null;
  let deferredRenderTimer = null;

  function activeEditElement() {
    return document.activeElement?.closest?.("[data-edit]") || null;
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

  const pendingEdits = new Map();

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
    const value = edit.tagName === "SELECT" || edit.type === "text"
      ? rawValue
      : isDecimalPercentField(dataset, path)
        ? Engine.number(rawValue, 0) / 100
        : Engine.number(rawValue, 0);
    const entryKey = `${id}:${dataset}:${path}`;
    if (!pendingEdits.has(entryKey)) {
      pendingEdits.set(entryKey, {
        historyKey: `${entryKey}:${Date.now()}`,
        beforeValue: historyFieldValue(dataset, path, readFieldValue(data, dataset, id, path)),
        beforeSnapshot: nationSnapshot(data, id),
        timer: null
      });
    }
    Engine.updateValue(data, dataset, id, path, value);
    if (path === "mobilizationLevel") {
      if (dataset === "military" && data.industrial[id]) data.industrial[id].mobilizationLevel = value;
      if (dataset === "industrial" && data.military[id]) data.military[id].mobilizationLevel = value;
    }
    Engine.recalculateAll(data);
    const afterValue = historyFieldValue(dataset, path, readFieldValue(data, dataset, id, path));
    const changes = recordChange(entryKey, id, dataset, path, afterValue, nationSnapshot(data, id));
    const bcDelta = changes.find((change) => change.key === "national.budgetCapacity");
    state.notice = `${byId(id)?.name || "Nation"} updated${bcDelta ? `; BC ${fmtSigned(bcDelta.delta)}` : ""}.`;
    Engine.save(data);
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
    if (edit) applyEdit(edit, false);
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
      if (action === "create-nation") {
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
    const viewSelect = event.target.closest("[data-view-select]");
    if (viewSelect) {
      applyView(viewSelect.value);
      return;
    }

    if (event.target.id === "editorNationSelect") {
      state.selectedNation = event.target.value;
      render();
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

    const shouldRenderAfterChange = edit.tagName === "SELECT" || document.activeElement !== edit;
    applyEdit(edit, shouldRenderAfterChange);
  });

  render();
  startSharedSync();
})();
