(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createStatusTableViews = function createStatusTableViews(ctx) {
    const {
      getData,
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
      fmtPrecisePercent,
      fmtSigned,
      displayBudgetCapacity,
      budgetCapacityCell,
      Engine
    } = ctx;

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
          { key: "governmentalEfficiency", label: "Gov Efficiency", numeric: true, secondary: true, render: fmtPrecisePercent },
          { key: "governmentalCorruption", label: "Gov Corruption", numeric: true, secondary: true, render: fmtPercent },
          { key: "crimeRate", label: "Crime Rate", numeric: true, secondary: true, render: fmtPercent },
          { key: "literacyRate", label: "Literacy", numeric: true, secondary: true, render: fmtPercent },
          { key: "developmentLevel", label: "Development", numeric: true, render: fmtNumber },
          { key: "budgetCapacity", label: "Budget Capacity", numeric: true, raw: (row) => displayBudgetCapacity(row.id), render: (_, row) => budgetCapacityCell(row.id) },
          { key: "budgetExpenditure", label: "Expenditure", numeric: true, secondary: true, render: fmtNumber },
          { key: "budgetBalance", label: "Budget Balance", numeric: true, render: (v) => safeStatus(fmtSigned(v), v >= 0 ? "positive" : "negative") },
          { key: "treasuryReserve", label: "Treasury Reserve", numeric: true, render: fmtNumber },
          { key: "debt", label: "Debt", numeric: true, render: fmtPercent },
          { key: "debtServiceRate", label: "Interest Rate", numeric: true, render: fmtPercent },
          { key: "debtService", label: "Debt Service", numeric: true, secondary: true, render: (v) => safeStatus(fmtNumber(v), v > 0 ? "negative" : "") },
          { key: "debtRepayment", label: "Debt Repayment", numeric: true, secondary: true, render: (v) => safeStatus(fmtNumber(v), v > 0 ? "positive" : "") },
          { key: "maxDebtPaydown", label: "Paydown Cap", numeric: true, secondary: true, render: fmtNumber },
          { key: "projectedDebt", label: "Projected Debt", numeric: true, secondary: true, render: fmtPercent },
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
          { key: "autarkyIndex", label: "Autarky", numeric: true, secondary: true, render: fmtNumber },
          { key: "tradeBalance", label: "Balance", numeric: true, render: (v) => safeStatus(fmtSigned(v), v >= 0 ? "positive" : "negative") },
          { key: "tradeFlow", label: "Flow", numeric: true, render: fmtNumber },
          { key: "importReliance", label: "Import", numeric: true, secondary: true, render: fmtNumber },
          { key: "exportReliance", label: "Export", numeric: true, secondary: true, render: fmtNumber },
          { key: "economicTradeDiversity", label: "Diversity", numeric: true, secondary: true, render: fmtNumber },
          { key: "tradePolicy", label: "Policy", render: (v) => safeStatus(v) },
          { key: "tariffRate", label: "Tariff", numeric: true, secondary: true, render: fmtPercent },
          { key: "economicImpactScore", label: "Impact", numeric: true, render: fmtNumber }
        ],
        "trade"
      );
    }

    function tierBreakdownCell(output, tiers) {
      return `
        <div class="industrial-tier-cell">
          ${tiers.map((tier) => `
            <span>
              <small>${safeText(tier.label)}</small>
              <strong>${safeText(fmtNumber(output[tier.key]))}</strong>
            </span>
          `).join("")}
        </div>`;
    }

    function renderIndustrial() {
      const civilianTiers = [{ key: "basic", label: "Basic" }, { key: "improved", label: "Improved" }, { key: "advanced", label: "Advanced" }];
      const militaryTiers = [{ key: "basic", label: "Basic" }, { key: "improved", label: "Improved" }, { key: "advanced", label: "Advanced" }];
      const shipyardTiers = [{ key: "medium", label: "Medium" }, { key: "large", label: "Large" }, { key: "mega", label: "Mega" }];
      const sectorOutputs = new WeakMap();
      function outputsFor(row) {
        if (!sectorOutputs.has(row)) sectorOutputs.set(row, Engine.industrialSectorOutputs(row));
        return sectorOutputs.get(row);
      }
      tablePanel(
        "Industrial Status",
        "Production capacity and mobilization settings used by the economic and military supply models.",
        tableRowsFor("industrial"),
        [
          { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
          { key: "mobilizationLevel", label: "Mobilization", render: (v) => safeStatus(v) },
          {
            key: "civilianSectors",
            label: "Civilian",
            className: "industrial-tier-group",
            raw: (row) => outputsFor(row).civilian.physical,
            render: (_, row) => tierBreakdownCell(outputsFor(row).civilian, civilianTiers)
          },
          {
            key: "militarySectors",
            label: "Military",
            className: "industrial-tier-group industrial-tier-divider",
            raw: (row) => outputsFor(row).military.physical,
            render: (_, row) => tierBreakdownCell(outputsFor(row).military, militaryTiers)
          },
          {
            key: "shipyardSectors",
            label: "Shipyards",
            className: "industrial-tier-group industrial-tier-divider",
            raw: (row) => outputsFor(row).shipyard.physical,
            render: (_, row) => tierBreakdownCell(outputsFor(row).shipyard, shipyardTiers)
          }
        ],
        "industrial"
      );
    }

    function renderPopulation() {
      const data = getData();
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

    return {
      renderNational,
      renderTrade,
      renderIndustrial,
      renderPopulation,
      renderMilitary,
      renderIntelligence,
      renderEclipse,
      renderElections
    };
  };
})();
