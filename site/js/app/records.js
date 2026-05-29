(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createRecordsViews = function createRecordsViews(ctx) {
    const {
      getData,
      app,
      state,
      datasets,
      visibleNations,
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
      fmtCost,
      isAdmin,
      Engine,
      Parser,
      saveWorkingState,
      render
    } = ctx;

    const parser = Parser || window.AGGS_RECORDS_PARSER;
    const recordTabs = [
      { key: "equipment", label: "Equipment Library" },
      { key: "rosterImport", label: "Roster Import", adminOnly: true },
      { key: "templates", label: "Template Library" },
      { key: "templateImport", label: "Detailed Template", adminOnly: true },
      { key: "naval", label: "Navy Inventory" },
      { key: "audit", label: "Coverage Audit" }
    ];
    const designStatuses = ["Concept", "Prototype", "Fielded", "Active", "Reserve", "Retired", "Rostered"];
    const designEras = ["Great War", "Atomic", "Information", "Digital", "Near Future"];
    const newDesignId = "__new_equipment_design__";
    const fallbackCategories = [
      "Small Arms",
      "Support Weapons",
      "Armored Vehicles",
      "Aeroplanes",
      "Infantry Equipment",
      "Missiles",
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
          const subcategory = String(left.subcategory || left.role || "").localeCompare(String(right.subcategory || right.role || ""), "en", { sensitivity: "base" });
          return category || subcategory || String(left.name || "").localeCompare(String(right.name || ""), "en", { sensitivity: "base" });
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
      visibleDesignEntries().forEach(({ design }) => {
        if (design.category) set.add(design.category);
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
            .filter((tab) => isAdmin || !tab.adminOnly)
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

    function recordId(prefix = "record") {
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function designStatus(design) {
      return design.status || (design.detailLevel === "template" ? "Concept" : "Rostered");
    }

    function designCard(nation, design, active) {
      const detailLabel = design.detailLevel === "template" ? "Detailed" : design.detailLevel === "roster" ? "Roster" : "Custom";
      return `
        <button type="button" class="design-card ${active ? "is-active" : ""}" data-equipment-design="${escapeHtml(design.id)}">
          <span class="swatch" style="background:${safeColor(nation.color)}"></span>
          <strong>${safeText(design.name, "Untitled Equipment")}</strong>
          <small>${safeText(design.category, "Uncategorized")} / ${safeText(design.subcategory || design.role || detailLabel, detailLabel)}</small>
          <em>${safeText(designStatus(design))}${design.notes ? ` - ${safeText(design.notes)}` : ""}</em>
        </button>`;
    }

    function equipmentCategoryOptions(designs) {
      const counts = new Map();
      designs.forEach((design) => {
        const category = design.category || "Other";
        counts.set(category, (counts.get(category) || 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category, "en", { sensitivity: "base" }));
    }

    function selectedEquipmentCategory(designs) {
      const categories = new Set(designs.map((design) => design.category || "Other"));
      if (!state.equipmentCategoryFilter || state.equipmentCategoryFilter === "all" || !categories.has(state.equipmentCategoryFilter)) {
        state.equipmentCategoryFilter = "all";
        return "all";
      }
      return state.equipmentCategoryFilter;
    }

    function filteredEquipmentDesigns(designs, category) {
      if (category === "all") return designs;
      return designs.filter((design) => (design.category || "Other") === category);
    }

    function categoryFilterHtml(designs, activeCategory) {
      const categories = equipmentCategoryOptions(designs);
      return `
        <div class="equipment-filter-bar" aria-label="Equipment category filters">
          <button type="button" class="equipment-filter-chip ${activeCategory === "all" ? "is-active" : ""}" data-equipment-category="all">All ${fmtNumber(designs.length)}</button>
          ${categories
            .map(({ category, count }) => `<button type="button" class="equipment-filter-chip ${activeCategory === category ? "is-active" : ""}" data-equipment-category="${escapeHtml(category)}">${safeText(category)} ${fmtNumber(count)}</button>`)
            .join("")}
        </div>`;
    }

    function equipmentActionsHtml(fleet) {
      return `
        <div class="equipment-action-bar">
          ${isAdmin ? `<button type="button" class="command primary compact" data-records-view="rosterImport">Paste Roster</button>` : ""}
          ${isAdmin ? `<button type="button" class="command compact" data-records-view="templateImport">Paste Detailed Template</button>` : ""}
          ${isAdmin ? `<button type="button" class="command compact" data-new-equipment-design>New Record</button>` : ""}
          <button type="button" class="command compact" data-records-view="templates">Template Library</button>
          <button type="button" class="command compact" data-records-view="naval">Navy Inventory (${fmtNumber(fleet.total || 0)})</button>
        </div>`;
    }

    function equipmentTableHtml(nation, designs, selectedId, hiddenCount = 0) {
      if (!designs.length) return `<div class="empty compact">No records match this category.</div>`;
      return `
        <div class="equipment-table-wrap">
          <table class="equipment-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${designs
                .map((design) => `
                  <tr class="equipment-record-row ${design.id === selectedId ? "is-active" : ""}" data-equipment-design="${escapeHtml(design.id)}">
                    <td>
                      <span class="equipment-item-name">
                        <span class="swatch" style="background:${safeColor(nation.color)}"></span>
                        <strong>${safeText(design.name, "Untitled Equipment")}</strong>
                      </span>
                    </td>
                    <td>${safeText(design.category || "Other")}</td>
                    <td>${safeText(design.subcategory || design.role || "General")}</td>
                    <td>${safeStatus(designStatus(design))}</td>
                    <td>${safeText(design.notes || "No notes")}</td>
                  </tr>`)
                .join("")}
            </tbody>
          </table>
          ${hiddenCount > 0 ? `<div class="equipment-table-limit">Showing the first ${fmtNumber(designs.length)} records in this filter. Narrow by category for the remaining ${fmtNumber(hiddenCount)}.</div>` : ""}
        </div>`;
    }

    function designSectionsHtml(design) {
      if (!design?.sections) return "";
      const sectionRows = Object.entries(design.sections).slice(0, 5).map(([sectionName, fields]) => {
        const flatFields = Object.entries(fields || {}).flatMap(([key, value]) => {
          if (value && typeof value === "object") {
            return Object.entries(value).map(([subKey, subValue]) => [`${key} / ${subKey}`, subValue]);
          }
          return [[key, value]];
        }).filter(([, value]) => value !== "");
        return `
          <div class="template-section-preview">
            <h4>${safeText(sectionName)}</h4>
            ${flatFields.slice(0, 4).map(([key, value]) => `<p><span>${safeText(key)}</span><strong>${safeText(value || "Unfilled")}</strong></p>`).join("") || `<p><span>Fields</span><strong>Unfilled</strong></p>`}
          </div>`;
      });
      return sectionRows.length ? `<div class="template-section-grid">${sectionRows.join("")}</div>` : "";
    }

    function designForm(nation, design) {
      const isExisting = Boolean(design);
      const category = design?.category || equipmentCategories()[0] || "Other";
      const status = design?.status || "Concept";
      const era = design?.era || "Digital";
      if (!isAdmin) {
        if (!design) return `<div class="empty compact">No custom equipment records have been entered for ${safeText(nation.name)}.</div>`;
        return `
          <div class="design-readout">
            <div>
              <span class="section-kicker">${safeText(design.detailLevel === "template" ? "Detailed Template" : "Equipment Record")}</span>
              <h3>${safeText(design.name)}</h3>
              <p>${safeText(design.notes || "No notes have been entered yet.")}</p>
            </div>
            <div class="design-detail-grid">
              ${summaryFact("Category", design.category || "Other")}
              ${summaryFact("Subcategory", design.subcategory || design.role || "Unassigned")}
              ${summaryFact("Status", designStatus(design))}
              ${summaryFact("Origin", design.origin || "In-game")}
              ${summaryFact("Detail Level", design.detailLevel || "custom")}
              ${summaryFact("Updated", fmtDateTime(design.updatedAt))}
            </div>
            ${designSectionsHtml(design)}
          </div>`;
      }

      return `
        <div class="design-editor-form">
          <div class="design-editor-title">
            <div>
              <span class="section-kicker">${isExisting ? "Editing Record" : "New Record"}</span>
              <h3>${safeText(isExisting ? design.name : "Create Equipment Record")}</h3>
            </div>
            ${isExisting ? `<button type="button" class="command danger compact" data-action="delete-equipment-design">Delete Record</button>` : ""}
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
              <span>Subcategory</span>
              <input id="equipmentDesignSubcategory" type="text" value="${escapeHtml(design?.subcategory || design?.role || "")}" placeholder="Tanks, Pistols, Fighters..." autocomplete="off">
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
              <input id="equipmentDesignOrigin" type="text" value="${escapeHtml(design?.origin || "In-game")}" placeholder="Roster Import" autocomplete="off">
            </label>
            <label class="control-field is-text design-notes-field">
              <span>Notes</span>
              <textarea id="equipmentDesignNotes" rows="5" placeholder="Variants, rarity, active status, doctrine notes...">${escapeHtml(design?.notes || "")}</textarea>
            </label>
          </div>
          ${designSectionsHtml(design)}
          <div class="design-actions">
            <button type="button" class="command primary" data-action="save-equipment-design">${isExisting ? "Save Record" : "Create Record"}</button>
            <button type="button" class="command" data-new-equipment-design>Clear Form</button>
          </div>
        </div>`;
    }

    function costReferenceHtml() {
      const data = getData();
      const rows = (data.equipmentCosts || []).slice(0, 12);
      return `
        <section class="panel record-reference-panel">
          <div class="panel-head compact-head">
            <div>
              <h2>Cost Reference</h2>
              <p>Reference values stay global. Country equipment records stay attached to nations.</p>
            </div>
          </div>
          ${rows.length ? `
            <div class="table-wrap compact-table">
              <table>
                <thead><tr><th>Category</th><th>Equipment</th><th class="numeric">Production</th><th class="numeric">Maintenance</th></tr></thead>
                <tbody>
                  ${rows.map((row) => `<tr><td>${safeText(row.category)}</td><td>${safeText(row.name)}</td><td class="numeric">${fmtCost(row.productionCost)}</td><td class="numeric">${fmtCost(row.maintenanceCost)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>` : `<div class="empty compact">No cost reference rows are loaded in the local shell.</div>`}
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
      const activeCategory = selectedEquipmentCategory(designs);
      let filteredDesigns = filteredEquipmentDesigns(designs, activeCategory);
      let design = selectedDesign(nation.id);
      if (activeCategory !== "all" && design && !filteredDesigns.some((item) => item.id === design.id) && filteredDesigns[0]) {
        state.selectedEquipmentDesignId = filteredDesigns[0].id;
        design = filteredDesigns[0];
      }
      const fleet = data.naval?.[nation.id] || { total: 0, categories: [] };
      const allDesigns = visibleDesignEntries();
      const categories = new Set(designs.map((item) => item.category).filter(Boolean));
      const detailedCount = designs.filter((item) => item.detailLevel === "template").length;
      const visibleLimit = 140;
      const hiddenCount = Math.max(0, filteredDesigns.length - visibleLimit);
      filteredDesigns = filteredDesigns.slice(0, visibleLimit);

      app.innerHTML = `
        ${recordsHeader("equipment", "Equipment Library", "Browse and edit country-owned equipment records from quick entries, roster imports, and detailed templates.", state.notice || syncText())}
        <div class="records-summary-strip">
          ${summaryFact("Country Records", fmtNumber(designs.length), `${fmtNumber(categories.size)} categories`)}
          ${summaryFact("Detailed Templates", fmtNumber(detailedCount), "Full specification records")}
          ${summaryFact("World Records", fmtNumber(allDesigns.length), "Across active countries")}
          ${summaryFact("Navy Counted", fmtNumber(fleet.total || 0), "Only navy carries quantities")}
        </div>
        <div class="equipment-library-layout">
          <section class="panel equipment-browser-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>${safeText(nation.name)} Equipment</h2>
                <p>${fmtNumber(designs.length)} records in a compact inventory browser. Filter by category, then edit the selected record in the inspector.</p>
              </div>
              ${equipmentActionsHtml(fleet)}
            </div>
            ${categoryFilterHtml(designs, activeCategory)}
            ${designs.length ? equipmentTableHtml(nation, filteredDesigns, design?.id || "", hiddenCount) : `<div class="empty compact">No records yet. Use Roster Import for large lists.</div>`}
          </section>
          <aside class="panel equipment-inspector-panel">
            ${designForm(nation, design)}
          </aside>
        </div>
        ${costReferenceHtml()}
      `;
    }

    function previewRowsHtml(preview) {
      const rows = [
        ...preview.newItems.map((item) => ({ tone: "positive", state: "New", item })),
        ...preview.updates.map((entry) => ({ tone: "warning", state: "Merge Notes", item: entry.item })),
        ...preview.duplicates.map((entry) => ({ tone: "", state: "Duplicate", item: entry.item }))
      ];
      if (!rows.length) return `<div class="empty compact">Nothing parsed yet.</div>`;
      return `
        <div class="import-preview-list">
          ${rows.slice(0, 120).map(({ tone, state: rowState, item }) => `
            <div class="import-preview-row">
              <span>${safeText(item.category)}</span>
              <span>${safeText(item.subcategory || item.role || "General")}</span>
              <strong>${safeText(item.name)}</strong>
              ${safeStatus(rowState, tone)}
            </div>`).join("")}
        </div>`;
    }

    function renderRosterImport() {
      const nation = selectedNation();
      if (!nation) {
        app.innerHTML = `<section class="panel"><div class="empty">No active countries are loaded.</div></section>`;
        return;
      }
      const preview = state.rosterImportPreview;
      const parsed = preview?.parsed;
      app.innerHTML = `
        ${recordsHeader("rosterImport", "Roster Import", "Paste full country arsenals. The importer detects categories, subcategories, records, notes, and duplicates before saving.", state.notice || "Importer ready")}
        <div class="records-summary-strip">
          ${summaryFact("Parsed Records", fmtNumber(parsed?.items?.length || 0), "Unique records in paste")}
          ${summaryFact("Paste Duplicates", fmtNumber(parsed?.sourceDuplicates?.length || 0), "Repeated inside pasted text")}
          ${summaryFact("New Records", fmtNumber(preview?.preview?.newItems?.length || 0), "Will be created")}
          ${summaryFact("Merge Notes", fmtNumber(preview?.preview?.updates?.length || 0), "Existing records with new notes")}
        </div>
        <div class="records-import-grid">
          <section class="panel import-paste-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>Paste Equipment Roster</h2>
                <p>Messy lists are fine. Keep headings and line breaks; the parser does the sorting.</p>
              </div>
            </div>
            <div class="import-paste-body">
              <label class="control-field is-text">
                <span>Roster Text</span>
                <textarea id="rosterImportText" rows="22" spellcheck="false" placeholder="Orinian Empire Equipment&#10;Pistols&#10;FEG 37M&#10;Frommer Stop&#10;Armored Vehicles&#10;Tanks&#10;T-72M1">${escapeHtml(state.rosterImportText || "")}</textarea>
              </label>
              <div class="design-actions">
                <button type="button" class="command primary" data-action="preview-roster-import">Preview Import</button>
                <button type="button" class="command" data-action="clear-roster-import">Clear</button>
              </div>
            </div>
          </section>
          <section class="panel import-preview-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>Import Preview</h2>
                <p>Review grouped records. Duplicates are skipped unless they bring new notes.</p>
              </div>
              ${preview ? `<span class="status">${fmtNumber(preview.preview.newItems.length + preview.preview.updates.length)} changes</span>` : ""}
            </div>
            ${previewRowsHtml(preview?.preview || { newItems: [], updates: [], duplicates: [] })}
            <div class="design-actions import-apply-actions">
              <button type="button" class="command primary" data-action="apply-roster-import" ${preview ? "" : "disabled"}>Apply Import</button>
              <button type="button" class="command" data-action="apply-roster-import-new" ${preview ? "" : "disabled"}>Add New Only</button>
            </div>
          </section>
        </div>
      `;
    }

    function renderTemplates() {
      const templates = parser.defaultTemplates || [];
      app.innerHTML = `
        ${recordsHeader("templates", "Template Library", "Reusable structures for detailed custom equipment. Templates guide full records without forcing every roster item into a giant form.", state.notice || syncText())}
        <div class="template-library-grid">
          ${templates.map((template) => `
            <section class="panel template-card">
              <div class="panel-head compact-head">
                <div>
                  <h2>${safeText(template.name)}</h2>
                  <p>${safeText(template.category)} records with optional detailed sections.</p>
                </div>
              </div>
              <div class="template-card-body">
                ${summaryFact("Import Mode", "Paste filled template", "One detailed equipment record")}
                ${summaryFact("Library Mode", "Reusable", "Keeps raw text and parsed fields")}
                ${isAdmin ? `<button type="button" class="command" data-records-view="templateImport">Use Template</button>` : ""}
              </div>
            </section>`).join("")}
        </div>
      `;
    }

    function renderTemplateImport() {
      const nation = selectedNation();
      if (!nation) {
        app.innerHTML = `<section class="panel"><div class="empty">No active countries are loaded.</div></section>`;
        return;
      }
      app.innerHTML = `
        ${recordsHeader("templateImport", "Detailed Template Import", "Paste one filled template to create a detailed country equipment record with parsed sections and preserved raw text.", state.notice || "Template importer ready")}
        <div class="records-import-grid">
          <section class="panel import-paste-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>Paste Filled Template</h2>
                <p>Aircraft, armor, missile, ship, or infantry gear templates can be pasted here.</p>
              </div>
            </div>
            <div class="import-paste-body">
              <label class="control-field is-text">
                <span>Template Text</span>
                <textarea id="templateImportText" rows="24" spellcheck="false" placeholder="# AIRCRAFT CUSTOM TEMPLATE&#10;&#10;## General Information&#10;- **Name:** Ravenstrike UAV&#10;- **Type:** Recon Drone">${escapeHtml(state.templateImportText || "")}</textarea>
              </label>
              <div class="design-actions">
                <button type="button" class="command primary" data-action="import-template-record">Import Template Record</button>
                <button type="button" class="command" data-action="clear-template-import">Clear</button>
              </div>
            </div>
          </section>
          <section class="panel import-preview-panel">
            <div class="panel-head compact-head">
              <div>
                <h2>What Gets Stored</h2>
                <p>One detailed equipment record, attached to ${safeText(nation.name)}.</p>
              </div>
            </div>
            <div class="template-explain-list">
              ${summaryFact("Core Fields", "Name, type, origin", "Pulled from General Information")}
              ${summaryFact("Sections", "Parsed headings", "Performance, armament, avionics, and more")}
              ${summaryFact("Raw Template", "Preserved", "No pasted detail gets lost")}
              ${summaryFact("Quantities", "Not tracked", "Except navy inventory")}
            </div>
          </section>
        </div>
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
      const detailed = rows.reduce((total, row) => total + row.designs.filter((item) => item.detailLevel === "template").length, 0);

      app.innerHTML = `
        ${recordsHeader("audit", "Coverage Audit", "Review core dataset coverage, imported roster records, and detailed equipment templates.", state.notice || syncText())}
        <div class="audit-grid">
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Dataset Coverage</h2>
                <p>Coverage across active operational datasets.</p>
              </div>
              <span class="status">${fmtNumber(totalDesigns)} records / ${fmtNumber(detailed)} detailed</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Dataset</th><th class="numeric">Rows Entered</th><th class="numeric">Missing Nations</th></tr></thead>
                <tbody>
                  ${datasetCounts.map((row) => `<tr><td>${safeText(row.label)}</td><td class="numeric">${fmtNumber(row.count)}</td><td class="numeric">${fmtNumber(row.missing)}</td></tr>`).join("")}
                  <tr><td>Equipment Library</td><td class="numeric">${fmtNumber(totalDesigns)}</td><td class="numeric">Optional</td></tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Nation Completeness</h2>
                <p>Dataset availability and country-owned equipment record counts.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nation</th><th>Present</th><th>Missing</th><th class="numeric">Records</th></tr></thead>
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
        state.notice = "Enter an equipment record name first.";
        render();
        return true;
      }
      const data = getData();
      const list = ensureDesigns(nation.id);
      const existingIndex = list.findIndex((design) => design.id === state.selectedEquipmentDesignId);
      const existing = existingIndex >= 0 ? list[existingIndex] : null;
      const subcategory = readFormValue("equipmentDesignSubcategory");
      const record = {
        ...(existing || {}),
        id: existing?.id || recordId("equipment"),
        name,
        category: readFormValue("equipmentDesignCategory") || "Other",
        subcategory,
        role: readFormValue("equipmentDesignRole") || subcategory,
        era: readFormValue("equipmentDesignEra") || "Digital",
        status: readFormValue("equipmentDesignStatus") || "Concept",
        origin: readFormValue("equipmentDesignOrigin") || "In-game",
        notes: readFormValue("equipmentDesignNotes"),
        detailLevel: existing?.detailLevel || "custom",
        updatedAt: new Date().toISOString()
      };
      if (existing) list[existingIndex] = record;
      else list.push(record);
      state.selectedEquipmentDesignId = record.id;
      pushHistory(nation, existing ? "Updated Equipment Record" : "Created Equipment Record", existing?.name || "None", record.name, record.id);
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
      pushHistory(nation, "Deleted Equipment Record", design.name, "Deleted", design.id);
      state.selectedEquipmentDesignId = "";
      data.meta.updatedAt = new Date().toISOString();
      saveWorkingState(`${design.name} deleted from ${nation.name}.`);
      return true;
    }

    function previewRosterImport() {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      const text = readFormValue("rosterImportText");
      state.rosterImportText = text;
      if (!text) {
        state.notice = "Paste a roster before previewing.";
        render();
        return true;
      }
      const parsed = parser.parseRoster(text, { nationName: nation.name });
      const preview = parser.buildImportPreview(parsed.items, ensureDesigns(nation.id), nation.id);
      state.rosterImportPreview = { parsed, preview };
      state.notice = `Parsed ${fmtNumber(parsed.items.length)} unique records.`;
      render();
      return true;
    }

    function clearRosterImport() {
      state.rosterImportText = "";
      state.rosterImportPreview = null;
      state.notice = "Roster import cleared.";
      render();
      return true;
    }

    function applyRosterImport(mergeUpdates = true) {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      if (!state.rosterImportPreview) {
        previewRosterImport();
        return true;
      }
      const data = getData();
      const list = ensureDesigns(nation.id);
      const { preview } = state.rosterImportPreview;
      const now = new Date().toISOString();
      preview.newItems.forEach((item, index) => {
        list.push({ ...item, id: recordId(`roster_${index}`), updatedAt: now });
      });
      if (mergeUpdates) {
        preview.updates.forEach(({ existing, item }) => {
          const target = list.find((record) => parser.recordKey({ ...record, nationId: nation.id }) === parser.recordKey({ ...existing, nationId: nation.id }));
          if (target) {
            target.notes = item.notes;
            target.status = item.status || target.status;
            target.updatedAt = now;
          }
        });
      }
      pushHistory(nation, "Imported Equipment Roster", "Preview", `${preview.newItems.length} new / ${mergeUpdates ? preview.updates.length : 0} updated`, "roster-import");
      data.meta.updatedAt = now;
      state.rosterImportText = "";
      state.rosterImportPreview = null;
      saveWorkingState(`Imported ${fmtNumber(preview.newItems.length)} new records for ${nation.name}.`);
      return true;
    }

    function importTemplateRecord() {
      if (!isAdmin) return false;
      const nation = selectedNation();
      if (!nation) return false;
      const text = readFormValue("templateImportText");
      state.templateImportText = text;
      if (!text) {
        state.notice = "Paste a filled template before importing.";
        render();
        return true;
      }
      const data = getData();
      const record = parser.parseDetailedTemplate(text);
      record.id = recordId("template");
      record.updatedAt = new Date().toISOString();
      ensureDesigns(nation.id).push(record);
      state.selectedEquipmentDesignId = record.id;
      state.equipmentCategoryFilter = record.category || "all";
      pushHistory(nation, "Imported Detailed Template", "None", record.name, record.id);
      data.meta.updatedAt = record.updatedAt;
      state.templateImportText = "";
      state.tab = "equipment";
      saveWorkingState(`${record.name} imported for ${nation.name}.`);
      return true;
    }

    function clearTemplateImport() {
      state.templateImportText = "";
      state.notice = "Template import cleared.";
      render();
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
        const nextTab = viewButton.dataset.recordsView;
        if (!isAdmin && recordTabs.find((tab) => tab.key === nextTab)?.adminOnly) return true;
        state.tab = nextTab;
        if (state.tab !== "equipment" && state.selectedEquipmentDesignId === newDesignId) state.selectedEquipmentDesignId = "";
        render();
        return true;
      }

      const designButton = event.target.closest("[data-equipment-design]");
      if (designButton) {
        const tableWrap = designButton.closest(".equipment-table-wrap");
        const scrollTop = tableWrap?.scrollTop || 0;
        const scrollLeft = tableWrap?.scrollLeft || 0;
        state.selectedEquipmentDesignId = designButton.dataset.equipmentDesign;
        render();
        const nextTableWrap = app.querySelector(".equipment-table-wrap");
        if (nextTableWrap) {
          nextTableWrap.scrollTop = scrollTop;
          nextTableWrap.scrollLeft = scrollLeft;
        }
        return true;
      }

      const categoryButton = event.target.closest("[data-equipment-category]");
      if (categoryButton) {
        state.equipmentCategoryFilter = categoryButton.dataset.equipmentCategory || "all";
        state.selectedEquipmentDesignId = "";
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
      state.equipmentCategoryFilter = "all";
      state.rosterImportPreview = null;
      render();
      return true;
    }

    function handleAction(action, button) {
      if (action === "save-equipment-design") return saveEquipmentDesign();
      if (action === "delete-equipment-design") return deleteEquipmentDesign();
      if (action === "preview-roster-import") return previewRosterImport();
      if (action === "apply-roster-import") return applyRosterImport(true);
      if (action === "apply-roster-import-new") return applyRosterImport(false);
      if (action === "clear-roster-import") return clearRosterImport();
      if (action === "import-template-record") return importTemplateRecord();
      if (action === "clear-template-import") return clearTemplateImport();
      if (action === "add-naval-ship") return addNavalShip();
      if (action === "delete-naval-ship") return deleteNavalShip(button);
      return false;
    }

    return {
      renderNaval,
      renderEquipment,
      renderRosterImport,
      renderTemplates,
      renderTemplateImport,
      renderAudit,
      auditRows,
      handleClick,
      handleChange,
      handleAction
    };
  };
})();
