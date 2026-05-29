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
      safeText,
      safeStatus,
      fmtNumber,
      fmtPercent,
      fmtCost
    } = ctx;

    function renderNaval() {
      const data = getData();
      const q = state.query.trim().toLowerCase();
      const entries = Object.entries(data.naval).filter(([id, fleet]) => {
        if (!isVisibleNation(id)) return false;
        const nation = data.nations.find((item) => item.id === id);
        const text = [
          nation?.name,
          ...(fleet.categories || []).flatMap((category) => [category.name, ...(category.ships || []).map((ship) => ship.name)])
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
                ${(fleet.categories || [])
                  .map(
                    (category) => `
                      <div class="ship-category">
                        <h3>${safeText(category.name)}</h3>
                        <div class="ship-list">
                          ${(category.ships || [])
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
      const data = getData();
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
      const data = getData();
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

    return {
      renderNaval,
      renderEquipment,
      renderAudit,
      auditRows
    };
  };
})();
