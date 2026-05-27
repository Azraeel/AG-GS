(function () {
  const data = window.AGGS_DATA;
  const app = document.getElementById("app");
  const searchInput = document.getElementById("searchInput");
  const nationSelect = document.getElementById("nationSelect");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const sourceNote = document.getElementById("sourceNote");

  const datasets = [
    { key: "national", label: "National" },
    { key: "trade", label: "Trade" },
    { key: "industrial", label: "Industrial" },
    { key: "population", label: "Population" },
    { key: "military", label: "Military" },
    { key: "intelligence", label: "Intelligence" },
    { key: "naval", label: "Naval" }
  ];

  const state = {
    tab: "overview",
    query: "",
    selectedNation: "solara",
    sort: {}
  };

  sourceNote.textContent = `${data.meta.source} ${data.meta.accuracyNote}`;

  function byId(id) {
    return data.nations.find((nation) => nation.id === id);
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
    if (!q) return data.nations;
    return data.nations.filter((nation) => {
      const haystack = [
        nation.name,
        data.national[nation.id]?.economicHealth,
        data.trade[nation.id]?.tradePolicy,
        data.trade[nation.id]?.sanctionsLevel,
        data.industrial[nation.id]?.mobilizationLevel,
        data.population[nation.id]?.mandatoryChildPolicy
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function sumValues(object, getter) {
    return Object.keys(object).reduce((total, id) => total + (Number(getter(object[id], id)) || 0), 0);
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

  function topList(title, source, getter, formatter, limit = 6) {
    const rows = data.nations
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
    const totalPopulation = sumValues(data.population, (row) => row.values["2021"]);
    const totalBudget = sumValues(data.national, (row) => row.budgetCapacity);
    const totalTradeFlow = sumValues(data.trade, (row) => row.tradeFlow);
    const totalActive = sumValues(data.military, (row) => activeMilitary(row));
    const totalFleet = sumValues(data.naval, (row) => row.total);

    app.innerHTML = `
      <section class="dashboard-grid">
        ${renderMetric("Nations", fmtNumber(data.nations.length), "Unique nations visible across screenshots")}
        ${renderMetric("2021 Population", fmtCompact(totalPopulation), "Population Tracker visible rows")}
        ${renderMetric("Budget Capacity", fmtNumber(totalBudget), "National Status visible rows")}
        ${renderMetric("Fleet Inventory", fmtNumber(totalFleet), "Naval rows entered")}
      </section>
      <section class="dashboard-grid">
        ${renderMetric("Trade Flow", fmtCompact(totalTradeFlow), "Trade Status visible rows")}
        ${renderMetric("Active Personnel", fmtCompact(totalActive), "Combat, support, air, naval, irregular")}
        ${renderMetric("National Rows", fmtNumber(Object.keys(data.national).length), "Rows visible in National Status")}
        ${renderMetric("Audit Gaps", fmtNumber(auditRows().filter((row) => row.missing.length).length), "Nations missing at least one dataset")}
      </section>
      <div class="split">
        ${topList("Largest Populations", "Population (2021)", dataId => data.population[dataId]?.values["2021"], fmtCompact)}
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

    const sort = state.sort[id] || { key: columns[0].key, dir: "asc" };
    const col = columns.find((column) => column.key === sort.key) || columns[0];
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
          <span class="status">${fmtNumber(sortedRows.length)} rows</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${columns
                  .map(
                    (column) =>
                      `<th class="${column.numeric ? "numeric" : ""}" data-table="${id}" data-key="${column.key}">${column.label}${sort.key === column.key ? (sort.dir === "asc" ? " ^" : " v") : ""}</th>`
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${sortedRows
                .map(
                  (row) => `
                    <tr>
                      ${columns
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
      "Government, budget, debt, health, and migration values from the visible National Status rows.",
      tableRowsFor("national"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "governmentalStability", label: "Stability", numeric: true, render: fmtPercent },
        { key: "publicUnrest", label: "Unrest", numeric: true, render: fmtNumber },
        { key: "warSupport", label: "War Support", numeric: true, render: fmtPercent },
        { key: "corruption", label: "Corruption", numeric: true, render: fmtPercent },
        { key: "developmentLevel", label: "Development", numeric: true, render: fmtNumber },
        { key: "budgetCapacity", label: "Budget Capacity", numeric: true, render: fmtNumber },
        { key: "budgetExpenditure", label: "Expenditure", numeric: true, render: fmtNumber },
        { key: "budgetBalance", label: "Balance", numeric: true, render: (v) => `<span class="status ${v >= 0 ? "positive" : "negative"}">${fmtSigned(v)}</span>` },
        { key: "debt", label: "Debt", numeric: true, render: fmtPercent },
        { key: "economicHealth", label: "Health", render: (v) => `<span class="status ${v === "Prosperity" ? "positive" : v === "Recovery" ? "warning" : ""}">${v}</span>` },
        { key: "immigrationRate", label: "Immigration", numeric: true, render: fmtNumber }
      ],
      "national"
    );
  }

  function renderTrade() {
    tablePanel(
      "Trade Status",
      "Capacity, flow, reliance, policy, sanctions, tariff, and economic impact values from the visible Trade Status rows.",
      tableRowsFor("trade"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "tradeCapacity", label: "Capacity", numeric: true, render: fmtNumber },
        { key: "tradeEfficiency", label: "Efficiency", numeric: true, render: fmtNumber },
        { key: "autarkyIndex", label: "Autarky", numeric: true, render: fmtNumber },
        { key: "tradeBalance", label: "Balance", numeric: true, render: (v) => `<span class="status ${v >= 0 ? "positive" : "negative"}">${fmtSigned(v)}</span>` },
        { key: "tradeFlow", label: "Flow", numeric: true, render: fmtNumber },
        { key: "tradePower", label: "Power", numeric: true, render: fmtNumber },
        { key: "importReliance", label: "Import", numeric: true, render: fmtNumber },
        { key: "exportReliance", label: "Export", numeric: true, render: fmtNumber },
        { key: "economicTradeDiversity", label: "Diversity", numeric: true, render: fmtNumber },
        { key: "tradePolicy", label: "Policy", render: (v) => `<span class="status">${v}</span>` },
        { key: "sanctionsLevel", label: "Sanctions", render: (v) => `<span class="status ${v === "None" ? "positive" : "warning"}">${v}</span>` },
        { key: "tariffRate", label: "Tariff", numeric: true, render: fmtPercent },
        { key: "economicImpactScore", label: "Impact", numeric: true, render: fmtNumber }
      ],
      "trade"
    );
  }

  function renderIndustrial() {
    tablePanel(
      "Industrial Status",
      "Factory, shipyard, and mobilization rows visible in the Industrial Status screenshot.",
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
        raw: (row) => row.values[column.key],
        render: (v) => fmtNumber(v)
      }))
    ];
    tablePanel("Population Tracker", "Visible population history columns, including the duplicate 2020 archive column exactly as shown.", rows, columns, "population");
  }

  function renderMilitary() {
    tablePanel(
      "Military Status",
      "Organization, supply, complexity, cyber, personnel, reserve, and irregular values from the visible Military Status rows.",
      tableRowsFor("military"),
      [
        { key: "nation", label: "Nation", render: (_, row) => nationCell(row.id) },
        { key: "militaryOrganization", label: "Org", numeric: true, render: fmtNumber },
        { key: "militarySupply", label: "Supply", numeric: true, render: fmtPercent },
        { key: "mobilizationLevel", label: "Mobilization", render: (v) => `<span class="status">${v}</span>` },
        { key: "equipmentComplexity", label: "Complexity", numeric: true, render: fmtNumber },
        { key: "cyberSecurity", label: "Cyber", numeric: true, render: fmtNumber },
        { key: "combatPersonnel", label: "Combat", numeric: true, render: fmtNumber },
        { key: "supportPersonnel", label: "Support", numeric: true, render: fmtNumber },
        { key: "airForcePersonnel", label: "Air Force", numeric: true, render: fmtNumber },
        { key: "navalPersonnel", label: "Naval", numeric: true, render: fmtNumber },
        { key: "reserveForces", label: "Reserve", numeric: true, render: fmtNumber },
        { key: "paramilitaryIrregular", label: "Irregular", numeric: true, render: fmtNumber },
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
        { key: "globalReach", label: "Reach", numeric: true, render: fmtNumber },
        { key: "internalSurveillance", label: "Surveillance", numeric: true, render: fmtNumber },
        { key: "secrecyDenial", label: "Secrecy", numeric: true, render: fmtNumber }
      ],
      "intelligence"
    );
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderNations() {
    const nations = filteredNations();
    const selected = byId(state.selectedNation) || nations[0] || data.nations[0];
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
                  <span class="status">${coverageFor(nation.id).filter((set) => set.hasData).length}/7</span>
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
            ${detailItem("2021 Population", fmtNumber(population?.values["2021"]))}
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
            ${detailItem("Data Coverage", `${coverageFor(selected.id).filter((set) => set.hasData).length}/7`)}
          </div>
        </section>
      </div>
    `;
  }

  function renderNaval() {
    const q = state.query.trim().toLowerCase();
    const entries = Object.entries(data.naval).filter(([id, fleet]) => {
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
            <p>Visible class counts from the fleet screenshot. Computed totals are marked when the total cell was not visible.</p>
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
              <p>Visible production and maintenance costs in BC.</p>
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
              <p>Era multipliers plus visible cost addition and reduction modifiers.</p>
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
    return data.nations.map((nation) => {
      const present = coverageFor(nation.id).filter((set) => set.hasData).map((set) => set.label);
      const missing = coverageFor(nation.id).filter((set) => !set.hasData).map((set) => set.label);
      return { nation, present, missing };
    });
  }

  function renderAudit() {
    const rows = auditRows().filter((row) => !state.query || row.nation.name.toLowerCase().includes(state.query.toLowerCase()));
    const datasetCounts = datasets.map((set) => ({
      label: set.label,
      count: Object.keys(data[set.key]).length,
      missing: data.nations.length - Object.keys(data[set.key]).length
    }));

    app.innerHTML = `
      <div class="audit-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Dataset Coverage</h2>
              <p>${data.meta.accuracyNote}</p>
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
              <p>All unique nations visible across the supplied screenshots.</p>
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
    tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === state.tab));
    const renderers = {
      overview: renderOverview,
      nations: renderNations,
      national: renderNational,
      trade: renderTrade,
      industrial: renderIndustrial,
      population: renderPopulation,
      military: renderMilitary,
      intelligence: renderIntelligence,
      naval: renderNaval,
      equipment: renderEquipment,
      audit: renderAudit
    };
    renderers[state.tab]();
  }

  data.nations.forEach((nation) => {
    const option = document.createElement("option");
    option.value = nation.id;
    option.textContent = nation.name;
    nationSelect.append(option);
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      render();
    });
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  nationSelect.addEventListener("change", (event) => {
    state.selectedNation = event.target.value;
    state.tab = "nations";
    render();
  });

  app.addEventListener("click", (event) => {
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

  render();
})();
