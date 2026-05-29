(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createRecordsViews = function createRecordsViews(ctx) {
    const {
      getData,
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
      saveWorkingState,
      render
    } = ctx;

    const recordTabs = [
      { key: "equipment", label: "Equipment Designs" },
      { key: "naval", label: "Navy Inventory" },
      { key: "audit", label: "Coverage Audit" }
    ];
    const designStatuses = ["Concept", "Prototype", "Fielded", "Reserve", "Retired"];
    const designEras = ["Great War", "Atomic", "Information", "Digital", "Near Future"];
    const newDesignId = "__new_equipment_design__";
    const fallbackCategories = [
      "Small Arms",
      "Support Weapons",
      "Armored Vehicles",
      "Aeroplanes",
      "Naval",
      "Cyber",
      "Strategic",
      "Other"
    ];

    function selectedNation() {
      return byId(state.selectedNation) || visibleNations()[0] || null;
    }

    function ensureDesigns(id) {
      const data = getData();
      data.equipmentDesigns = data.equipmentDesigns || {};
      if (!Array.isArray(data.equipmentDesigns[id])) data.equipmentDesigns[id] = [];
      return data.equipmentDesigns[id];
    }

    function designsFor(id) {
      const data = getData();
      return Array.isArray(data.equipmentDesigns?.[id]) ? data.equipmentDesigns[id] : [];
    }

    function visibleDesignEntries() {
      return visibleNations().flatMap((nation) => designsFor(nation.id).map((design) => ({ nation, design })));
    }

    function sortedDesigns(id) {
      return designsFor(id)
        .slice()
        .sort((left, right) => {
          const category = String(left.category || "").localeCompare(String(right.category || ""), "en", { sensitivity: "base" });
          return category || String(left.name || "").localeCompare(String(right.name || ""), "en", { sensitivity: "base" });
        });
    }

    function selectedDesign(id) {
      const designs = sortedDesigns(id);
      if (state.selectedEquipmentDesignId === newDesignId) return null;
      const selected = designs.find((design) => design.id === state.selectedEquipmentDesignId) || designs[0] || null;
      state.selectedEquipmentDesignId = selected?.id || "";
      return selected;
    }

    function equipmentCategories() {
      const data = getData();
      const set = new Set(fallbackCategories);
      (data.equipmentCosts || []).forEach((row) => {
        if (row.category) set.add(row.category);
      });
      return Array.from(set).sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
    }

    function optionHtml(options, selected) {
      const normalized = options.slice();
      if (selected && !normalized.includes(selected)) normalized.unshift(selected);
      return normalized.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${safeText(option)}</option>`).join("");
    }

    function recordTabsHtml(activeKey) {
      return `
        <div class="records-local-tabs" aria-label="Records views">
          ${recordTabs
            .map((tab) => `<button type="button" class="record-tab ${tab.key === activeKey ? "is-active" : ""}" data-records-view="${escapeHtml(tab.key)}">${safeText(tab.label)}</button>`)
            .join("")}
        </div>`;
    }

    function recordsHeader(activeKey, title, description, status = "") {
      const nation = selectedNation();
      return `
        <section class="records-hero">
          <div>
            <span class="section-kicker">Records Workspace</span>
            <h2>${safeText(title)}</h2>
            <p>${safeText(description)}</p>
          </div>
          <div class="records-hero-controls">
            ${status ? `<span class="status ${state.notice ? "positive" : ""}">${safeText(status)}</span>` : ""}
            <label class="select-shell records-nation-picker">
              <span>Country</span>
              <select data-records-nation-select>
                ${nationOptionsHtml(nation?.id || "")}
              </select>
            </label>
          </div>
        </section>
        ${recordTabsHtml(activeKey)}`;
    }

    function summaryFact(label, value, note = "") {
      return `
        <div class="records-fact">
          <span>${safeText(label)}</span>
          <strong>${safeText(value)}</strong>
          ${note ? `<small>${safeText(note)}</small>` : ""}
        </div>`;
    }

    function designCard(nation, design, active) {
      return `
        <button type="button" class="design-card ${active ? "is-active" : ""}" data-equipment-design="${escapeHtml(design.id)}">
          <span class="swatch" style="background:${safeColor(nation.color)}"></span>
          <strong>${safeText(design.name, "Untitled Design")}</strong>
          <small>${safeText(design.category, "Uncategorized")} / ${safeText(design.status, "Concept")}</small>
          ${design.role ? `<em>${safeText(design.role)}</em>` : ""}
        </button>`;
    }

    function designForm(nation, design) {
      const isExisting = Boolean(design);
      const category = design?.category || equipmentCategories()[0] || "Other";
      const status = design?.status || "Concept";
      const era = design?.era || "Digital";
      if (!isAdmin) {
        if (!design) return `<div class="empty compact">No custom equipment designs have been recorded for ${safeText(nation.name)}.</div>`;
        return `
          <div class="design-readout">
            <div>
              <span class="section-kicker">Design Record</span>
              <h3>${safeText(design.name)}</h3>
              <p>${safeText(design.notes || "No design notes have been entered yet.")}</p>
            </div>
            <div class="design-detail-grid">
              ${summaryFact("Category", design.category || "Other")}
              ${summaryFact("Role", design.role || "Unassigned")}
              ${summaryFact("Era", design.era || "Unknown")}
              ${summaryFact("Status", design.status || "Concept")}
              ${summaryFact("Origin", design.origin || "In-game")}
              ${summaryFact("Updated", fmtDateTime(design.updatedAt))}
            </div>
          </div>`;
      }

      return `
        <div class="design-editor-form">
          <div class="design-editor-title">
            <div>
              <span class="section-kicker">${isExisting ? "Editing Design" : "New Design"}</span>
              <h3>${safeText(isExisting ? design.name : "Create Equipment Design")}</h3>
            </div>
            ${isExisting ? `<button type="button" class="command danger compact" data-action="delete-equipment-design">Delete Design</button>` : ""}
          </div>
          <div class="design-form-grid">
            <label class="control-field is-text">
              <span>Name</span>
              <input id="equipmentDesignName" type="text" value="${escapeHtml(design?.name || "")}" placeholder="A-42 Kestrel MBT" autocomplete="off">
            </label>
            <label class="control-field">
              <span>Category</span>
              <select id="equipmentDesignCategory">
                ${optionHtml(equipmentCategories(), category)}
              </select>
            </label>
            <label class="control-field is-text">
              <span>Role</span>
              <input id="equipmentDesignRole" type="text" value="${escapeHtml(design?.role || "")}" placeholder="Main battle tank" autocomplete="off">
            </label>
            <label class="control-field">
              <span>Era</span>
              <select id="equipmentDesignEra">
                ${optionHtml(designEras, era)}
              </select>
            </label>
            <label class="control-field">
              <span>Status</span>
              <select id="equipmentDesignStatus">
                ${optionHtml(designStatuses, status)}
              </select>
            </label>
            <label class="control-field is-text">
              <span>Origin</span>
              <input id="equipmentDesignOrigin" type="text" value="${escapeHtml(design?.origin || "In-game")}" placeholder="In-game domestic" autocomplete="off">
            </label>
            <label class="control-field is-text design-notes-field">
              <span>Notes</span>
              <textarea id="equipmentDesignNotes" rows="5" placeholder="Doctrine notes, special systems, upgrades, export restrictions...">${escapeHtml(design?.notes || "")}</textarea>
            </label>
          </div>
          <div class="design-actions">
            <button type="button" class="command primary" data-action="save-equipment-design">${isExisting ? "Save Design" : "Create Design"}</button>
            <button type="button" class="command" data-new-equipment-design>Clear Form</button>
          </div>
        </div>`;
    }

    function costReferenceHtml() {
      const data = getData();
      const rows = (data.equipmentCosts || []).slice(0, 12);
      if (!rows.length) {
        return `
          <section class="panel record-reference-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>Cost Reference</h2>
                <p>No cost reference rows are loaded in the local shell.</p>
              </div>
            </div>
          </section>`;
      }
      return `
        <section class="panel record-reference-panel">
          <div class="panel-head compact-head">
            <div>
              <h2>Cost Reference</h2>
              <p>Reference values stay global. Custom equipment designs stay attached to countries.</p>
            </div>
          </div>
          <div class="table-wrap compact-table">
            <table>
              <thead><tr><th>Category</th><th>Equipment</th><th class="numeric">Production</th><th class="numeric">Maintenance</th></tr></thead>
              <tbody>
                ${rows
                  .map((row) => `<tr><td>${safeText(row.category)}</td><td>${safeText(row.name)}</td><td class="numeric">${fmtCost(row.productionCost)}</td><td class="numeric">${fmtCost(row.maintenanceCost)}</td></tr>`)
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>`;
    }

    function renderEquipment() {
      const data = getData();
      const nation = selectedNation();
      if (!nation) {
        app.innerHTML = `<section class="panel"><div class="empty">No active countries are loaded.</div></section>`;
        return;
      }
      const designs = sortedDesigns(nation.id);
      const design = selectedDesign(nation.id);
      const fleet = data.naval?.[nation.id] || { total: 0, categories: [] };
      const allDesigns = visibleDesignEntries();
      const categories = new Set(designs.map((item) => item.category).filter(Boolean));

      app.innerHTML = `
        ${recordsHeader("equipment", "Equipment Designs", "Store country-owned custom equipment created in-game without forcing quantity tracking.", state.notice || syncText())}
        <div class="records-summary-strip">
          ${summaryFact("Country Designs", fmtNumber(designs.length), `${fmtNumber(categories.size)} categories`)}
          ${summaryFact("World Designs", fmtNumber(allDesigns.length), "Across active countries")}
          ${summaryFact("Navy Counted", fmtNumber(fleet.total || 0), "Only navy carries quantities")}
          ${summaryFact("Selected Country", nation.name, "Local Records selector")}
        </div>
        <div class="records-workspace-grid">
          <section class="panel design-roster-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>${safeText(nation.name)} Designs</h2>
                <p>${fmtNumber(designs.length)} custom records. No stockpile counts are stored here.</p>
              </div>
              ${isAdmin ? `<button type="button" class="command compact" data-new-equipment-design>New</button>` : ""}
            </div>
            <div class="design-card-list">
              ${designs.length ? designs.map((item) => designCard(nation, item, item.id === design?.id)).join("") : `<div class="empty compact">No designs recorded yet.</div>`}
            </div>
          </section>
          <section class="panel design-editor-panel">
            ${designForm(nation, design)}
          </section>
          <aside class="panel navy-record-rail">
            <div class="panel-head compact-head">
              <div>
                <h2>Navy Inventory</h2>
                <p>Fleet classes keep numeric counts.</p>
              </div>
              <strong class="fleet-total">${fmtNumber(fleet.total || 0)}</strong>
            </div>
            <div class="navy-glance-list">
              ${(fleet.categories || []).slice(0, 6).map((category) => summaryFact(category.name, fmtNumber((category.ships || []).reduce((total, ship) => total + Engine.number(ship.count, 0), 0)))).join("") || `<div class="empty compact">No fleet classes entered.</div>`}
            </div>
            <button type="button" class="command" data-records-view="naval">Open Navy Editor</button>
          </aside>
        </div>
        ${costReferenceHtml()}
      `;
    }

    function shipCountInput(id, categoryIndex, shipIndex, count) {
      if (!isAdmin) return `<span>${fmtNumber(count)}</span>`;
      return `
        <input
          class="ship-count-input"
          type="number"
          inputmode="numeric"
          step="1"
          min="0"
          value="${escapeHtml(count ?? 0)}"
          aria-label="Fleet class count"
          data-edit
          data-dataset="naval"
          data-id="${escapeHtml(id)}"
          data-path="categories.${categoryIndex}.ships.${shipIndex}.count"
        >`;
    }

    function renderNaval() {
      const data = getData();
      const nation = selectedNation();
      if (!nation) {
        app.innerHTML = `<section class="panel"><div class="empty">No active countries are loaded.</div></section>`;
        return;
      }
      const fleet = data.naval?.[nation.id] || { total: 0, categories: [] };
      const fleetCount = visibleNations().filter((item) => Boolean(data.naval?.[item.id])).length;

      app.innerHTML = `
        ${recordsHeader("naval", "Navy Inventory", "Track fleet classes and quantities. Numeric inventory is intentionally limited to naval records.", state.notice || syncText())}
        <div class="records-summary-strip">
          ${summaryFact("Selected Fleet", fmtNumber(fleet.total || 0), nation.name)}
          ${summaryFact("World Fleets", fmtNumber(fleetCount), "Active countries with records")}
          ${summaryFact("Categories", fmtNumber((fleet.categories || []).length), "Ship groupings")}
        </div>
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>${nationCell(nation.id)}</h2>
              <p>${safeText(fleet.totalNote || "Fleet total is computed from editable class counts.")}</p>
            </div>
            <span class="fleet-total">${fmtNumber(fleet.total || 0)}</span>
          </div>
          <div class="fleet-editor">
            ${(fleet.categories || [])
              .map(
                (category, categoryIndex) => `
                  <div class="ship-category editable-ship-category">
                    <h3>${safeText(category.name)}</h3>
                    <div class="ship-list">
                      ${(category.ships || [])
                        .map(
                          (ship, shipIndex) => `
                            <div class="ship-row editable-ship-row">
                              <span>${safeText(ship.name)}</span>
                              <span class="ship-count-cell">${shipCountInput(nation.id, categoryIndex, shipIndex, ship.count)}</span>
                              ${isAdmin ? `<button class="icon-command danger" type="button" data-action="delete-naval-ship" data-category-index="${categoryIndex}" data-ship-index="${shipIndex}" aria-label="Delete ${safeText(ship.name)}">Remove</button>` : ""}
                            </div>`
                        )
                        .join("") || `<div class="empty compact">No classes in this category.</div>`}
                    </div>
                  </div>`
              )
              .join("") || `<div class="empty">No fleet classes entered for ${safeText(nation.name)}.</div>`}
          </div>
          ${isAdmin ? `
            <div class="naval-add-row">
              <label class="control-field is-text">
                <span>Category</span>
                <input id="newNavalCategory" type="text" placeholder="Destroyer" autocomplete="off">
              </label>
              <label class="control-field is-text">
                <span>Class Name</span>
                <input id="newNavalClass" type="text" placeholder="Archer-class destroyer" autocomplete="off">
              </label>
              <label class="control-field">
                <span>Count</span>
                <input id="newNavalCount" type="number" inputmode="numeric" step="1" min="0" value="1">
              </label>
              <button class="command primary" type="button" data-action="add-naval-ship">Add Navy Class</button>
            </div>` : ""}
        </section>
      `;
    }

    function auditRows() {
      return visibleNations().map((nation) => {
        const present = coverageFor(nation.id).filter((set) => set.hasData).map((set) => set.label);
        const missing = coverageFor(nation.id).filter((set) => !set.hasData).map((set) => set.label);
        const designs = designsFor(nation.id);
        return { nation, present, missing, designs };
      });
    }

    function renderAudit() {
      const data = getData();
      const rows = auditRows();
      const active = visibleNations();
      const datasetCounts = datasets.map((set) => ({
        label: set.label,
        count: active.filter((nation) => Boolean(data[set.key]?.[nation.id])).length,
        missing: active.filter((nation) => !data[set.key]?.[nation.id]).length
      }));
      const totalDesigns = rows.reduce((total, row) => total + row.designs.length, 0);

      app.innerHTML = `
        ${recordsHeader("audit", "Coverage Audit", "Review core dataset coverage and custom design records across active countries.", state.notice || syncText())}
        <div class="audit-grid">
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Dataset Coverage</h2>
                <p>Coverage across active operational datasets.</p>
              </div>
              <span class="status">${fmtNumber(totalDesigns)} designs</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Dataset</th><th class="numeric">Rows Entered</th><th class="numeric">Missing Nations</th></tr></thead>
                <tbody>
                  ${datasetCounts.map((row) => `<tr><td>${safeText(row.label)}</td><td class="numeric">${fmtNumber(row.count)}</td><td class="numeric">${fmtNumber(row.missing)}</td></tr>`).join("")}
                  <tr><td>Equipment Designs</td><td class="numeric">${fmtNumber(totalDesigns)}</td><td class="numeric">Optional</td></tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Nation Completeness</h2>
                <p>Dataset availability and country-owned custom equipment counts.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nation</th><th>Present</th><th>Missing</th><th class="numeric">Designs</th></tr></thead>
                <tbody>
                  ${rows
                    .map(
                      (row) => `
                        <tr>
                          <td>${nationCell(row.nation.id)}</td>
                          <td>${row.present.map((label) => safeStatus(label, "positive")).join(" ")}</td>
                          <td>${row.missing.length ? row.missing.map((label) => safeStatus(label, "warning")).join(" ") : safeStatus("Complete", "positive")}</td>
                          <td class="numeric">${fmtNumber(row.designs.length)}</td>
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

    function syncText() {
      return "Records ready";
    }

    function pushHistory(nation, label, beforeValue, afterValue, field) {
      const data = getData();
      data.meta.changeHistory = [{
        key: `records:${nation.id}:${field}:${Date.now()}`,
        nationId: nation.id,
        nationName: nation.name,
        dataset: "records",
        field,
        label,
        beforeValue,
        afterValue,
        changedAt: new Date().toISOString(),
        changes: [],
        deltas: []
      }, ...(data.meta.changeHistory || [])].slice(0, 60);
    }

    function readFormValue(id) {
      return String(document.getElementById(id)?.value || "").trim();
    }

    function saveEquipmentDesign() {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      const name = readFormValue("equipmentDesignName");
      if (!name) {
        state.notice = "Enter an equipment design name first.";
        render();
        return true;
      }
      const data = getData();
      const list = ensureDesigns(nation.id);
      const existingIndex = list.findIndex((design) => design.id === state.selectedEquipmentDesignId);
      const existing = existingIndex >= 0 ? list[existingIndex] : null;
      const record = {
        id: existing?.id || `design_${Date.now().toString(36)}`,
        name,
        category: readFormValue("equipmentDesignCategory") || "Other",
        role: readFormValue("equipmentDesignRole"),
        era: readFormValue("equipmentDesignEra") || "Digital",
        status: readFormValue("equipmentDesignStatus") || "Concept",
        origin: readFormValue("equipmentDesignOrigin") || "In-game",
        notes: readFormValue("equipmentDesignNotes"),
        updatedAt: new Date().toISOString()
      };
      if (existing) list[existingIndex] = record;
      else list.push(record);
      state.selectedEquipmentDesignId = record.id;
      pushHistory(nation, existing ? "Updated Equipment Design" : "Created Equipment Design", existing?.name || "None", record.name, record.id);
      data.meta.updatedAt = new Date().toISOString();
      saveWorkingState(`${record.name} saved for ${nation.name}.`);
      return true;
    }

    function deleteEquipmentDesign() {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation || !state.selectedEquipmentDesignId) return false;
      const list = ensureDesigns(nation.id);
      const design = list.find((item) => item.id === state.selectedEquipmentDesignId);
      if (!design) return false;
      if (!window.confirm(`Delete ${design.name} from ${nation.name}?`)) return true;
      const data = getData();
      data.equipmentDesigns[nation.id] = list.filter((item) => item.id !== design.id);
      pushHistory(nation, "Deleted Equipment Design", design.name, "Deleted", design.id);
      state.selectedEquipmentDesignId = "";
      data.meta.updatedAt = new Date().toISOString();
      saveWorkingState(`${design.name} deleted from ${nation.name}.`);
      return true;
    }

    function recalculateFleetTotal(fleet) {
      fleet.total = (fleet.categories || []).reduce(
        (total, category) => total + (category.ships || []).reduce((subtotal, ship) => subtotal + Engine.number(ship.count, 0), 0),
        0
      );
      fleet.totalNote = "Computed from editable class counts.";
    }

    function addNavalShip() {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      const categoryName = readFormValue("newNavalCategory");
      const shipName = readFormValue("newNavalClass");
      const count = Math.max(0, Math.trunc(Engine.number(readFormValue("newNavalCount"), 0)));
      if (!categoryName || !shipName) {
        state.notice = "Enter both a navy category and class name.";
        render();
        return true;
      }
      const data = getData();
      data.naval[nation.id] = data.naval[nation.id] || { total: 0, totalNote: "", categories: [] };
      const fleet = data.naval[nation.id];
      fleet.categories = Array.isArray(fleet.categories) ? fleet.categories : [];
      let category = fleet.categories.find((item) => String(item.name).toLowerCase() === categoryName.toLowerCase());
      if (!category) {
        category = { name: categoryName, ships: [] };
        fleet.categories.push(category);
      }
      category.ships = Array.isArray(category.ships) ? category.ships : [];
      category.ships.push({ name: shipName, count });
      recalculateFleetTotal(fleet);
      pushHistory(nation, "Added Naval Class", "None", `${shipName} (${fmtNumber(count)})`, "naval-add");
      data.meta.updatedAt = new Date().toISOString();
      saveWorkingState(`${shipName} added to ${nation.name}.`);
      return true;
    }

    function deleteNavalShip(button) {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      const data = getData();
      const fleet = data.naval?.[nation.id];
      const categoryIndex = Engine.number(button.dataset.categoryIndex, -1);
      const shipIndex = Engine.number(button.dataset.shipIndex, -1);
      const category = fleet?.categories?.[categoryIndex];
      const ship = category?.ships?.[shipIndex];
      if (!ship) return false;
      if (!window.confirm(`Remove ${ship.name} from ${nation.name}'s navy records?`)) return true;
      category.ships.splice(shipIndex, 1);
      if (!category.ships.length) fleet.categories.splice(categoryIndex, 1);
      recalculateFleetTotal(fleet);
      pushHistory(nation, "Removed Naval Class", ship.name, "Removed", "naval-remove");
      data.meta.updatedAt = new Date().toISOString();
      saveWorkingState(`${ship.name} removed from ${nation.name}.`);
      return true;
    }

    function handleClick(event) {
      const viewButton = event.target.closest("[data-records-view]");
      if (viewButton) {
        state.tab = viewButton.dataset.recordsView;
        if (state.tab !== "equipment" && state.selectedEquipmentDesignId === newDesignId) state.selectedEquipmentDesignId = "";
        render();
        return true;
      }

      const designButton = event.target.closest("[data-equipment-design]");
      if (designButton) {
        state.selectedEquipmentDesignId = designButton.dataset.equipmentDesign;
        render();
        return true;
      }

      const newDesignButton = event.target.closest("[data-new-equipment-design]");
      if (newDesignButton) {
        state.selectedEquipmentDesignId = newDesignId;
        render();
        return true;
      }

      return false;
    }

    function handleChange(event) {
      const nationSelect = event.target.closest("[data-records-nation-select]");
      if (!nationSelect) return false;
      state.selectedNation = nationSelect.value;
      state.selectedEquipmentDesignId = "";
      render();
      return true;
    }

    function handleAction(action, button) {
      if (action === "save-equipment-design") return saveEquipmentDesign();
      if (action === "delete-equipment-design") return deleteEquipmentDesign();
      if (action === "add-naval-ship") return addNavalShip();
      if (action === "delete-naval-ship") return deleteNavalShip(button);
      return false;
    }

    return {
      renderNaval,
      renderEquipment,
      renderAudit,
      auditRows,
      handleClick,
      handleChange,
      handleAction
    };
  };
})();
