(function () {
  window.AGGS_APP_CONFIG = {
    THEME_KEY: "aggs-theme",
    adminOnlyTabs: ["editor", "simulation", "history"],
    adminOnlyActions: [
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
    ],
    datasets: [
      { key: "national", label: "National" },
      { key: "trade", label: "Trade" },
      { key: "industrial", label: "Industrial" },
      { key: "population", label: "Population" },
      { key: "military", label: "Military" },
      { key: "intelligence", label: "Intelligence" },
      { key: "eclipse", label: "Eclipse" },
      { key: "elections", label: "Elections" },
      { key: "naval", label: "Naval" }
    ],
    viewOptions: [
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
    ],
    economicHealthOptions: ["Prosperity", "Expansion", "Recovery", "Slowdown", "Recession", "Depression"],
    statusTableKeys: ["industrial", "intelligence", "military", "national", "population", "trade"]
  };
})();
