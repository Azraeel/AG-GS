(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createEditorView = function createEditorView(ctx) {
    const runtime = {
      ...ctx,
      get data() {
        return ctx.getData();
      }
    };

    with (runtime) {
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
        primaryBalance: 0,
        budgetBalance: 0,
        treasuryReserve: 0,
        treasuryDeposit: 0,
        deficitBeforeReserve: 0,
        treasuryDrawdown: 0,
        treasuryChange: 0,
        projectedTreasuryReserve: 0,
        debt: 0,
        debtPrincipal: 0,
        computedInterestRate: Engine.constants.DEBT_RULES.baseInterestRate,
        interestRateAdjustment: 0,
        interestRate: Engine.constants.DEBT_RULES.baseInterestRate,
        debtServiceRate: Engine.constants.DEBT_RULES.baseInterestRate,
        deficitRisk: 0,
        sanctionsRisk: 0,
        mobilizationRisk: 0,
        tradeBalanceRisk: 0,
        debtTrendRisk: 0,
        debtService: 0,
        debtRepayment: 0,
        projectedDebt: 0,
        projectedDebtServiceRate: Engine.constants.DEBT_RULES.baseInterestRate,
        fiscalModel: "Standard",
        economicHealth: data.meta.worldEconomicHealth || "Expansion",
        immigrationRate: 0,
        taxRate: 0.02
      },
      trade: {
        tradeCapacity: 0,
        autarkyIndex: 50,
        tradeBalance: 0,
        tradeFlow: 0,
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
        shipyards: 10,
        civilianSectors: { basic: 100, improved: 0, advanced: 0 },
        militarySectors: { basic: 10, improved: 0, advanced: 0 },
        shipyardSectors: { medium: 10, large: 0, mega: 0 }
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
      naval: { total: 0, totalNote: "No fleet entered.", categories: [] },
      equipmentDesigns: []
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
      naval: Engine.clone(data.naval[sourceId] || defaults.naval),
      equipmentDesigns: Engine.clone(data.equipmentDesigns?.[sourceId] || defaults.equipmentDesigns)
    };
  }

  function applyNationRecords(id, records) {
    ["national", "trade", "industrial", "population", "military", "intelligence", "eclipse", "elections", "naval", "equipmentDesigns"].forEach((key) => {
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
    saveLedger();
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
    saveLedger();
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
    saveLedger();
    populateNationSelect();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    render();
  }

  function renderEditorSummary(nation, national, trade, industrial, military, currentYear) {
    const coverage = coverageFor(nation.id).filter((set) => set.hasData).length;
    const sectorOutput = Engine.industrialSectorOutputs(industrial);
    const physicalFactories = sectorOutput.civilian.physical + sectorOutput.military.physical;
    const effectiveFactories = sectorOutput.civilian.effective + sectorOutput.military.effective;
    const factorySummary = effectiveFactories === physicalFactories
      ? fmtNumber(physicalFactories)
      : `${fmtNumber(physicalFactories)} / ${fmtNumber(effectiveFactories)} eff.`;
    return `
      <div class="editor-summary">
        ${overviewFact("Population", fmtCompact(populationFor(nation.id, currentYear)))}
        ${overviewFact("Budget", budgetCapacityText(nation.id))}
        ${overviewFact("Trade Flow", fmtCompact(trade.tradeFlow))}
        ${overviewFact("Factories", factorySummary)}
        ${overviewFact("Supply", fmtPercent(military.militarySupply))}
        ${overviewFact("Coverage", `${coverage}/${datasets.length}`)}
      </div>`;
  }

  function renderSectorSummary(label, output) {
    const effectiveNote = output.effective === output.physical ? "" : ` / ${fmtNumber(output.effective)} effective`;
    return `<div class="industrial-sector-summary"><span>${safeText(label)}</span><strong>${safeText(`${fmtNumber(output.physical)} physical${effectiveNote}`)}</strong></div>`;
  }

  function renderEditorRail(nation, national, trade) {
    const recent = changeHistoryRows(nation.id, 3);
    const wartimeHeadroom = Engine.number(national.wartimeBudgetHeadroom, 0);
    const wartimeBonus = Engine.number(national.wartimeBudgetBonus, 0);
    const autoMobilizationBe = Engine.number(national.wartimeBudgetAutoExpenditure, 0);
    const hasWartimeCapacity = wartimeBonus > 0 || wartimeHeadroom > 0 || Engine.number(national.mobilizedBudgetCapacity, 0) > Engine.number(national.budgetCapacity, 0);
    return `
      <aside class="editor-rail">
        <section class="editor-rail-panel derived-preview">
          <div class="editor-rail-head">
            <div>
              <span class="section-kicker">Live Calculation Preview</span>
              <h3>Derived State</h3>
            </div>
            ${state.notice ? `<span class="status positive">${safeText(state.notice)}</span>` : ""}
          </div>
          <div class="rail-detail-grid">
            ${detailItem("Displayed Budget Capacity", `${budgetCapacityText(nation.id)}${budgetCapacityNote(nation.id) ? ` (${budgetCapacityNote(nation.id)})` : ""}`)}
            ${hasWartimeCapacity ? detailItem("Auto Mobilization BE", autoMobilizationBe > 0 ? fmtNumber(autoMobilizationBe) : "Not started") : ""}
            ${wartimeHeadroom > 0 ? detailItem("Available Wartime Headroom", fmtNumber(wartimeHeadroom)) : ""}
            ${Engine.number(national.mobilizationYears, 0) > 0 ? detailItem("Mobilization Strain", fmtDecimalPercent(national.mobilizationStrain)) : ""}
            ${detailItem("Peacetime Fiscal Balance", fmtSigned(national.primaryBalance))}
            ${detailItem("Debt Service", fmtNumber(national.debtService))}
            ${detailItem("Effective Balance After Auto BE", fmtSigned(national.budgetBalance))}
            ${detailItem("Treasury Reserve", fmtNumber(national.treasuryReserve))}
            ${detailItem("Reserve Change", fmtSigned(national.treasuryChange))}
            ${detailItem("Debt", fmtPercent(national.debt))}
            ${detailItem("Interest Rate", fmtPercent(national.debtServiceRate))}
            ${detailItem("Projected Debt", fmtPercent(national.projectedDebt))}
            ${detailItem("Trade Flow", fmtNumber(trade.tradeFlow))}
          </div>
        </section>
        <section class="editor-rail-panel">
          <div class="editor-rail-head compact">
            <h3>Recent Change Impact</h3>
          </div>
          ${recent.length ? `
            <div class="rail-change-list">
              ${recent
                .map((entry) => {
                  const impacts = visibleChangeImpacts(entry).slice(0, 3);
                  return `
                  <div class="rail-change-row">
                    <strong>${escapeHtml(entry.label || entry.field || "Edit")}</strong>
                    <div class="change-impact">${impacts.length ? impacts.map(renderChangeBadge).join("") : `<span class="status">No calculated change</span>`}</div>
                  </div>`;
                })
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
    const sectorOutput = Engine.industrialSectorOutputs(industrial);
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
            ${state.notice ? `<span class="status positive">${safeText(state.notice)}</span>` : ""}
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
              ${fieldControl("national", "fiscalModel", "Fiscal Model", Engine.fiscalModelForNation(data, nation.id), "select", Object.keys(Engine.constants.FISCAL_MODELS))}
              ${fieldControl("national", "budgetExpenditure", "Expenditure", national.budgetExpenditure)}
              ${fieldControl("national", "treasuryReserve", "Treasury Reserve", national.treasuryReserve ?? 0)}
              ${fieldControl("national", "debt", "Debt %", national.debt ?? 0)}
              ${fieldControl("national", "debtServiceRate", "Interest Rate %", national.debtServiceRate ?? national.interestRate ?? Engine.constants.DEBT_RULES.baseInterestRate)}
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
              ${renderSectorSummary("Civilian Sectors", sectorOutput.civilian)}
              ${fieldControl("industrial", "civilianSectors.basic", "Basic Civilian", sectorOutput.civilian.basic)}
              ${fieldControl("industrial", "civilianSectors.improved", "Improved Civilian", sectorOutput.civilian.improved)}
              ${fieldControl("industrial", "civilianSectors.advanced", "Advanced Civilian", sectorOutput.civilian.advanced)}
              ${renderSectorSummary("Military Sectors", sectorOutput.military)}
              ${fieldControl("industrial", "militarySectors.basic", "Basic Military", sectorOutput.military.basic)}
              ${fieldControl("industrial", "militarySectors.improved", "Improved Military", sectorOutput.military.improved)}
              ${fieldControl("industrial", "militarySectors.advanced", "Advanced Military", sectorOutput.military.advanced)}
              ${renderSectorSummary("Shipyard Sectors", sectorOutput.shipyard)}
              ${fieldControl("industrial", "shipyardSectors.medium", "Medium Shipyards", sectorOutput.shipyard.medium)}
              ${fieldControl("industrial", "shipyardSectors.large", "Large Shipyards", sectorOutput.shipyard.large)}
              ${fieldControl("industrial", "shipyardSectors.mega", "Mega Shipyards", sectorOutput.shipyard.mega)}
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

      return {
        renderEditor,
        createNationFromEditor,
        archiveSelectedNationFromEditor,
        restoreArchivedNationFromEditor,
        fieldControl
      };
    }
  };
})();
