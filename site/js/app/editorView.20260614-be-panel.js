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
        governmentalCorruption: 20,
        crimeRate: 20,
        governmentalEfficiency: 100,
        effectiveGovernmentalEfficiency: 100,
        literacyRate: 95,
        urbanizationRate: 50,
        urbanDevelopment: 10,
        ruralDevelopment: 10,
        infrastructureLevel: 10,
        livingStandard: 10,
        industrialSophistication: 50,
        industrialSophisticationBaseline: 50,
        budgetCapacity: 0,
        budgetExpenditure: 0,
        temporaryBudgetExpenditures: [],
        temporaryBudgetExpenditure: 0,
        temporaryBudgetExpenditureCount: 0,
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
        tradeDisruption: 0,
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
    const color = safeColor(nation?.color || "#63a4ff");
    const archived = archivedNations();
    const activeCount = visibleNations().length;
    return `
      <div class="nation-manager" role="region" aria-label="Nation manager">
        <div class="nation-manager-head">
          <div>
            <h2>Nation Editor</h2>
            <p>Country selection, roster operations, and live state editing.</p>
          </div>
          <span class="status">${fmtNumber(activeCount)} active / ${fmtNumber(archived.length)} archived</span>
        </div>
        <div class="roster-tools-grid nation-manager-grid">
          <div class="nation-manager-select-card">
            <label class="select-shell editor-nation-picker nation-manager-picker" for="editorNationSelect">
              <span>Editing</span>
              <select id="editorNationSelect" data-nation-select ${activeCount ? "" : "disabled"}>
                ${activeCount ? nationOptionsHtml(nation?.id || "") : `<option>No active countries</option>`}
              </select>
            </label>
            ${state.notice ? `<span class="status positive">${safeText(state.notice)}</span>` : ""}
          </div>
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
          <div class="roster-rename-card">
            <label class="control-field roster-name-field" for="renameNationName">
              <span>Rename Selected</span>
              <input id="renameNationName" type="text" value="${escapeHtml(nation?.name || "")}" placeholder="Country name" autocomplete="off" ${nation ? "" : "disabled"}>
            </label>
            <button class="command" type="button" data-action="rename-nation" ${nation ? "" : "disabled"}>Rename</button>
          </div>
          <div class="roster-color-card">
            <label class="control-field color-field" for="selectedNationColor">
              <span>Selected Color</span>
              <input id="selectedNationColor" type="color" value="${escapeHtml(color)}" aria-label="Selected nation color" ${nation ? "" : "disabled"}>
            </label>
            <button class="command" type="button" data-action="change-nation-color" ${nation ? "" : "disabled"}>Set Color</button>
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
      </div>`;
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

  function renameSelectedNationFromEditor() {
    const nation = byId(state.selectedNation);
    const nameInput = document.getElementById("renameNationName");
    const nextName = String(nameInput?.value || "").trim();
    if (!nation) {
      state.notice = "Select a country to rename first.";
      render();
      return;
    }
    if (!nextName) {
      state.notice = "Enter a country name first.";
      render();
      return;
    }
    if (nextName === nation.name) {
      state.notice = `${nation.name} already has that name.`;
      render();
      return;
    }
    const duplicate = data.nations.some((candidate) => candidate.id !== nation.id && String(candidate.name || "").trim().toLowerCase() === nextName.toLowerCase());
    if (duplicate) {
      state.notice = `${nextName} already exists.`;
      render();
      return;
    }
    const previousName = nation.name;
    nation.name = nextName;
    data.meta.changeHistory = [{
      key: `nation-renamed:${nation.id}:${Date.now()}`,
      nationId: nation.id,
      nationName: nextName,
      dataset: "nations",
      field: "name",
      label: "Renamed Nation",
      beforeValue: previousName,
      afterValue: nextName,
      changedAt: new Date().toISOString(),
      changes: [],
      deltas: []
    }, ...(data.meta.changeHistory || [])].slice(0, 60);
    if (data.tradeNetwork?.geography?.nations?.[nation.id]) {
      data.tradeNetwork.geography.nations[nation.id].nationName = nextName;
    }
    state.notice = `${previousName} renamed to ${nextName}.`;
    saveLedger();
    populateNationSelect();
    scheduleSharedPublish(state.notice);
    updateSourceNote();
    render();
  }

  function changeSelectedNationColorFromEditor() {
    const nation = byId(state.selectedNation);
    const colorInput = document.getElementById("selectedNationColor");
    if (!nation) {
      state.notice = "Select a country to recolor first.";
      render();
      return;
    }
    const previousColor = safeColor(nation.color || "#63a4ff");
    const nextColor = safeColor(colorInput?.value || previousColor);
    if (nextColor.toLowerCase() === previousColor.toLowerCase()) {
      state.notice = `${nation.name} already uses that color.`;
      render();
      return;
    }
    nation.color = nextColor;
    data.meta.changeHistory = [{
      key: `nation-color:${nation.id}:${Date.now()}`,
      nationId: nation.id,
      nationName: nation.name,
      dataset: "nations",
      field: "color",
      label: "Changed Nation Color",
      beforeValue: previousColor,
      afterValue: nextColor,
      changedAt: new Date().toISOString(),
      changes: [],
      deltas: []
    }, ...(data.meta.changeHistory || [])].slice(0, 60);
    state.notice = `${nation.name} color updated.`;
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
    const sectorOutput = Engine.industrialSectorOutputs(industrial, national);
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

  function editorHistoryTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function renderEditorChangeHistory(nation) {
    const rows = changeHistoryRows(nation.id, 5);
    return `
      <section class="editor-rail-panel editor-history-panel">
        <div class="editor-rail-head compact">
          <div>
            <span class="section-kicker">Nation Change History</span>
            <h3>Change History</h3>
          </div>
          <span class="status">${fmtNumber(rows.length)} shown</span>
        </div>
        ${rows.length ? `
          <div class="editor-history-list" aria-label="Recent nation changes">
            ${rows.map((entry) => {
              const impacts = visibleChangeImpacts(entry);
              const key = fieldKey(entry.dataset, entry.field);
              return `
                <article class="editor-history-row">
                  <div class="editor-history-row-head">
                    <strong>${escapeHtml(entry.label || entry.field || "Change")}</strong>
                    <span>${editorHistoryTime(entry.changedAt)}</span>
                  </div>
                  <div class="editor-history-value">${escapeHtml(fmtHistoryChangeValue(key, entry.beforeValue))}<span aria-hidden="true"> &rarr; </span>${escapeHtml(fmtHistoryChangeValue(key, entry.afterValue))}</div>
                  <div class="editor-history-impact change-impact ${impacts.length ? "" : "is-empty"}">${impacts.length ? impacts.map((impact) => renderChangeBadge(impact)).join("") : "No calculated impact"}</div>
                </article>`;
            }).join("")}
          </div>` : `<div class="empty compact">No changes recorded for this nation.</div>`}
      </section>`;
  }

  function renderTemporaryBePanel(nation, national) {
    const isOpen = state.editorTemporaryBeOpen === true;
    const temporaryItems = Engine.temporaryBudgetExpenditureItems(Engine.clone(national));
    const permanentBe = Engine.number(national.budgetExpenditure, 0);
    const temporaryBe = temporaryItems.reduce((total, item) => total + Engine.number(item.amount, 0), 0);
    const autoBe = Engine.number(national.wartimeBudgetAutoExpenditure, 0);
    const effectiveBe = Engine.number(national.effectiveBudgetExpenditure, permanentBe + temporaryBe + autoBe);
    return `
      <section class="temporary-be-panel ${isOpen ? "is-open" : ""}" aria-label="Budget expenditure schedule" aria-hidden="${isOpen ? "false" : "true"}" ${isOpen ? "" : "inert"}>
        <div class="temporary-be-panel-head">
          <div>
            <span class="section-kicker">Budget Expenditure</span>
            <h4>Expenditure Schedule</h4>
          </div>
          <button class="be-panel-close" type="button" data-action="toggle-temporary-be-drawer" aria-label="Close expenditure schedule">
            <span aria-hidden="true">&lsaquo;</span>
          </button>
        </div>
        <div class="temporary-be-drawer" aria-hidden="${isOpen ? "false" : "true"}" ${isOpen ? "" : "inert"}>
          <div class="temporary-be-flow" aria-label="Budget expenditure breakdown">
            <div><span>Permanent</span><strong>${safeText(fmtNumber(permanentBe))}</strong></div>
            <div><span>Temporary</span><strong>${safeText(fmtNumber(temporaryBe))}</strong></div>
            <div><span>Mobilization</span><strong>${safeText(fmtNumber(autoBe))}</strong></div>
            <div><span>Effective</span><strong>${safeText(fmtNumber(effectiveBe))}</strong></div>
          </div>
          <div class="temporary-be-form">
            <label class="control-field" for="temporaryBeLabel">
              <span>Label</span>
              <input id="temporaryBeLabel" type="text" value="Emergency Program" autocomplete="off">
            </label>
            <label class="control-field" for="temporaryBeAmount">
              <span>BE Increase</span>
              <input id="temporaryBeAmount" type="number" inputmode="decimal" step="any" min="0" value="">
            </label>
            <label class="control-field" for="temporaryBeYears">
              <span>Years</span>
              <input id="temporaryBeYears" type="number" inputmode="numeric" step="1" min="1" value="1">
            </label>
            <button class="command primary" type="button" data-action="add-temporary-be" ${nation ? "" : "disabled"}>Add</button>
          </div>
          <div class="temporary-be-list" aria-label="Temporary BE schedule">
            ${temporaryItems.length ? temporaryItems.map((item) => `
              <article class="temporary-be-row">
                <div>
                  <strong>${safeText(item.label)}</strong>
                  <span>${safeText(fmtNumber(item.amount))} / ${safeText(fmtNumber(item.yearsRemaining))} yr${item.yearsRemaining === 1 ? "" : "s"}</span>
                </div>
                <button class="command compact danger" type="button" data-action="remove-temporary-be" data-be-id="${escapeHtml(item.id)}">Remove</button>
              </article>`).join("") : `<div class="empty compact">No temporary BE.</div>`}
          </div>
        </div>
      </section>`;
  }

  function renderBudgetExpenditureControl(nation, national) {
    const isOpen = state.editorTemporaryBeOpen === true;
    const temporaryBe = Engine.number(national.temporaryBudgetExpenditure, 0);
    const triggerLabel = isOpen ? "Close expenditure schedule" : "Open expenditure schedule";
    return `
      <div class="budget-expenditure-control ${isOpen ? "is-open" : ""}">
        ${fieldControl("national", "budgetExpenditure", "Expenditure", national.budgetExpenditure)}
        <button class="be-panel-trigger" type="button" data-action="toggle-temporary-be-drawer" aria-expanded="${isOpen ? "true" : "false"}" aria-label="${triggerLabel}">
          <span aria-hidden="true">&rsaquo;</span>
          ${temporaryBe > 0 ? `<strong>${safeText(fmtNumber(temporaryBe))}</strong>` : ""}
        </button>
      </div>`;
  }

  function renderEditorRail(nation, national, trade) {
    const wartimeHeadroom = Engine.number(national.wartimeBudgetHeadroom, 0);
    const wartimeBonus = Engine.number(national.wartimeBudgetBonus, 0);
    const autoMobilizationBe = Engine.number(national.wartimeBudgetAutoExpenditure, 0);
    const temporaryBe = Engine.number(national.temporaryBudgetExpenditure, 0);
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
            ${detailItem("Permanent BE", fmtNumber(national.budgetExpenditure))}
            ${temporaryBe > 0 ? detailItem("Temporary BE", fmtNumber(temporaryBe)) : ""}
            ${hasWartimeCapacity ? detailItem("Auto Mobilization BE", autoMobilizationBe > 0 ? fmtNumber(autoMobilizationBe) : "Not started") : ""}
            ${wartimeHeadroom > 0 ? detailItem("Available Wartime Headroom", fmtNumber(wartimeHeadroom)) : ""}
            ${detailItem("Effective Expenditure", fmtNumber(national.effectiveBudgetExpenditure ?? national.budgetExpenditure))}
            ${Engine.number(national.mobilizationYears, 0) > 0 ? detailItem("Mobilization Strain", fmtDecimalPercent(national.mobilizationStrain)) : ""}
            ${detailItem("Primary Balance", fmtSigned(national.primaryBalance))}
            ${detailItem("Debt Service", fmtNumber(national.debtService))}
            ${detailItem("Effective Balance After BE", fmtSigned(national.budgetBalance))}
            ${detailItem("Treasury Reserve", fmtNumber(national.treasuryReserve))}
            ${detailItem("Reserve Change", fmtSigned(national.treasuryChange))}
            ${detailItem("Debt", fmtPercent(national.debt))}
            ${detailItem("Interest Rate", fmtPercent(national.debtServiceRate))}
            ${detailItem("Projected Debt", fmtPercent(national.projectedDebt))}
            ${detailItem("Trade Flow", fmtNumber(trade.tradeFlow))}
          </div>
        </section>
        ${renderEditorChangeHistory(nation)}
      </aside>`;
  }

  function renderEditor() {
    const nation = byId(state.selectedNation) || visibleNations()[0];
    if (!nation) {
      app.innerHTML = `
        <section class="panel nation-editor-shell">
          ${renderNationManagement(null)}
          <div class="editor-empty-state">
            <div class="empty">Open the live site through Cloudflare, or publish a valid state from the admin API.</div>
            <span class="status">${safeText(syncLabel(true))}</span>
          </div>
        </section>
      `;
      return;
    }
    const national = data.national[nation.id] || {};
    const trade = data.trade[nation.id] || {};
    const industrial = data.industrial[nation.id] || {};
    const sectorOutput = Engine.industrialSectorOutputs(industrial, national);
    const military = data.military[nation.id] || {};
    const intelligence = data.intelligence[nation.id] || {};
    const eclipse = data.eclipse[nation.id] || {};
    const elections = data.elections[nation.id] || {};
    const population = data.population[nation.id] || { mandatoryChildPolicy: "No Policy", values: {} };
    const currentYear = data.meta.currentYear;

    app.innerHTML = `
      <section class="panel nation-editor-shell">
        ${renderNationManagement(nation)}
        ${renderEditorSummary(nation, national, trade, industrial, military, currentYear)}
        <div class="editor-layout">
          <div class="editor-sections">
            <div class="editor-column editor-column-primary">
              <section class="editor-section editor-section-national">
                <h3>National</h3>
                ${fieldControl("national", "governmentalStability", "Stability %", national.governmentalStability)}
                ${fieldControl("national", "publicUnrest", "Public Unrest", national.publicUnrest)}
                ${fieldControl("national", "warSupport", "War Support %", national.warSupport)}
                ${fieldControl("national", "governmentalEfficiency", "Gov Efficiency %", national.governmentalEfficiency ?? 100)}
                ${fieldControl("national", "governmentalCorruption", "Gov Corruption %", national.governmentalCorruption ?? national.corruption)}
                ${fieldControl("national", "crimeRate", "Crime Rate %", national.crimeRate ?? national.corruption)}
                ${fieldControl("national", "literacyRate", "Literacy %", national.literacyRate ?? 95)}
                ${fieldControl("national", "urbanizationRate", "Urbanization %", national.urbanizationRate)}
                ${fieldControl("national", "urbanDevelopment", "Urban Development", national.urbanDevelopment)}
                ${fieldControl("national", "ruralDevelopment", "Rural Development", national.ruralDevelopment)}
                ${fieldControl("national", "infrastructureLevel", "Infrastructure", national.infrastructureLevel)}
                ${fieldControl("national", "livingStandard", "Living Standard", national.livingStandard)}
                ${fieldControl("national", "industrialSophistication", "Industrial Sophistication %", national.industrialSophistication)}
                ${fieldControl("national", "fiscalModel", "Fiscal Model", Engine.fiscalModelForNation(data, nation.id), "select", Object.keys(Engine.constants.FISCAL_MODELS))}
                ${renderBudgetExpenditureControl(nation, national)}
                ${renderTemporaryBePanel(nation, national)}
                ${fieldControl("national", "treasuryReserve", "Treasury Reserve", national.treasuryReserve ?? 0)}
                ${fieldControl("national", "debt", "Debt %", national.debt ?? 0)}
                ${fieldControl("national", "debtServiceRate", "Interest Rate %", national.debtServiceRate ?? national.interestRate ?? Engine.constants.DEBT_RULES.baseInterestRate)}
                ${fieldControl("national", "economicHealth", "Economic Health", national.economicHealth, "select", economicHealthOptions)}
                ${fieldControl("national", "immigrationRate", "Immigration", national.immigrationRate)}
                ${fieldControl("national", "taxRate", "Tax Rate %", national.taxRate ?? 0)}
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
              <section class="editor-section editor-section-population">
                <h3>Population</h3>
                ${fieldControl("population", String(currentYear), `Population (${currentYear})`, populationFor(nation.id, currentYear))}
                ${fieldControl("population", "mandatoryChildPolicy", "Child Policy", population.mandatoryChildPolicy, "select", Object.keys(Engine.constants.CHILD_POLICY))}
              </section>
            </div>
            <div class="editor-column editor-column-secondary">
              <section class="editor-section editor-section-trade">
                <h3>Trade</h3>
                ${fieldControl("trade", "importReliance", "Import Reliance", trade.importReliance)}
                ${fieldControl("trade", "exportReliance", "Export Reliance", trade.exportReliance)}
                ${fieldControl("trade", "economicTradeDiversity", "Diversity", trade.economicTradeDiversity)}
                ${fieldControl("trade", "autarkyIndex", "Autarky", trade.autarkyIndex)}
                ${fieldControl("trade", "tradeDisruption", "Trade Disruption %", trade.tradeDisruption ?? 0)}
                ${fieldControl("trade", "tradePolicy", "Trade Policy", trade.tradePolicy, "select", Object.keys(Engine.constants.TRADE_POLICY))}
                ${fieldControl("trade", "tariffRate", "Tariff %", trade.tariffRate)}
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
          </div>
          ${renderEditorRail(nation, national, trade)}
        </div>
      </section>
    `;
  }

      return {
        renderEditor,
        createNationFromEditor,
        renameSelectedNationFromEditor,
        changeSelectedNationColorFromEditor,
        archiveSelectedNationFromEditor,
        restoreArchivedNationFromEditor,
        fieldControl
      };
    }
  };
})();
