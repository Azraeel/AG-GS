(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createWikiView = function createWikiView(ctx) {
    const runtime = {
      ...ctx,
      get data() {
        return ctx.getData();
      }
    };

    with (runtime) {
  function wikiDraftFromPage(page = {}) {
    return {
      id: page.id || "",
      title: page.title || "",
      category: page.category || "Concept",
      status: page.status || "draft",
      era: page.era || "",
      yearStart: page.yearStart ?? "",
      yearEnd: page.yearEnd ?? "",
      summary: page.summary || "",
      body: page.body || "",
      facts: factsToText(page.facts || []),
      tags: (page.tags || []).join(", "),
      aliases: (page.aliases || []).join(", "),
      relatedPageIds: (page.relatedPageIds || []).join(", ")
    };
  }

  function factsToText(facts = []) {
    return (facts || [])
      .map((fact) => `${fact.label || ""}: ${fact.value || ""}`)
      .filter((line) => line.trim() !== ":")
      .join("\n");
  }

  function wikiPagesForView() {
    const status = isAdmin ? state.wikiStatusFilter || "all" : "published";
    return Engine.searchWikiPages(data, state.wikiQuery || "", {
      category: state.wikiCategoryFilter || "all",
      era: state.wikiEraFilter || "all",
      year: state.wikiYearFilter || "",
      status,
      includeDrafts: isAdmin && status === "all",
      includeArchived: isAdmin && state.wikiShowArchived
    });
  }

  function selectedWikiPage(pages = wikiPagesForView()) {
    const allPages = Engine.wikiPages(data, { includeArchived: isAdmin });
    return allPages.find((page) => page.id === state.selectedWikiPageId)
      || pages[0]
      || allPages.find((page) => !page.archived && (isAdmin || page.status === "published"))
      || null;
  }

  function wikiYearLabel(page) {
    if (page.yearStart === "" && page.yearEnd === "") return "Undated";
    if (page.yearEnd !== "" && page.yearEnd !== page.yearStart) return `${fmtYear(page.yearStart)}-${fmtYear(page.yearEnd)}`;
    return fmtYear(page.yearStart);
  }

  function wikiPageClass(page) {
    return ["wiki-page-button", page.id === state.selectedWikiPageId ? "is-selected" : "", page.archived ? "is-archived" : "", page.status === "draft" ? "is-draft" : ""]
      .filter(Boolean)
      .join(" ");
  }

  function categoryOptions(selected) {
    return ["all", ...Engine.constants.WIKI_CATEGORIES]
      .map((category) => `<option value="${escapeHtml(category)}" ${selected === category ? "selected" : ""}>${safeText(category === "all" ? "All categories" : category)}</option>`)
      .join("");
  }

  function pageCategoryOptions(selected) {
    return Engine.constants.WIKI_CATEGORIES
      .map((category) => `<option value="${escapeHtml(category)}" ${selected === category ? "selected" : ""}>${safeText(category)}</option>`)
      .join("");
  }

  function statusOptions(selected) {
    return ["all", ...Engine.constants.WIKI_STATUSES]
      .map((status) => `<option value="${escapeHtml(status)}" ${selected === status ? "selected" : ""}>${safeText(status === "all" ? "All statuses" : status)}</option>`)
      .join("");
  }

  function pageStatusOptions(selected) {
    return Engine.constants.WIKI_STATUSES
      .map((status) => `<option value="${escapeHtml(status)}" ${selected === status ? "selected" : ""}>${safeText(status)}</option>`)
      .join("");
  }

  function eraOptions(selected) {
    const eras = Array.from(new Set(Engine.wikiPages(data, { includeArchived: isAdmin }).map((page) => page.era).filter(Boolean))).sort((left, right) => left.localeCompare(right));
    return ["all", ...eras]
      .map((era) => `<option value="${escapeHtml(era)}" ${selected === era ? "selected" : ""}>${safeText(era === "all" ? "All eras" : era)}</option>`)
      .join("");
  }

  function wikiPageList(pages) {
    if (!pages.length) return `<div class="empty compact">No wiki pages match.</div>`;
    return pages.map((page) => `
      <button class="${wikiPageClass(page)}" type="button" data-wiki-page="${escapeHtml(page.id)}">
        <span>
          <strong>${safeText(page.title)}</strong>
          <small>${safeText(page.category)} / ${safeText(wikiYearLabel(page))}</small>
        </span>
        ${page.status === "draft" ? `<span class="status warning">Draft</span>` : ""}
        ${page.archived ? `<span class="status">Archived</span>` : ""}
      </button>`).join("");
  }

  function pageLookup() {
    const lookup = new Map();
    Engine.wikiPages(data, { includeArchived: isAdmin }).forEach((page) => {
      lookup.set(page.id.toLowerCase(), page);
      lookup.set(page.slug.toLowerCase(), page);
      lookup.set(page.title.toLowerCase(), page);
      (page.aliases || []).forEach((alias) => lookup.set(alias.toLowerCase(), page));
    });
    return lookup;
  }

  function renderInlineWiki(text, lookup) {
    const source = String(text || "");
    let output = "";
    let lastIndex = 0;
    source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label, offset) => {
      output += escapeHtml(source.slice(lastIndex, offset));
      const key = String(target || "").trim().toLowerCase();
      const page = lookup.get(key);
      const linkLabel = label || target;
      output += page
        ? `<button class="wiki-inline-link" type="button" data-wiki-page="${escapeHtml(page.id)}">${safeText(linkLabel)}</button>`
        : `<span class="wiki-missing-link">${safeText(linkLabel)}</span>`;
      lastIndex = offset + match.length;
      return match;
    });
    output += escapeHtml(source.slice(lastIndex));
    return output;
  }

  function renderWikiBody(body) {
    const source = String(body || "").trim();
    if (!source) return `<div class="empty compact">No article body yet.</div>`;
    const lookup = pageLookup();
    return source.split(/\n{2,}/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("## ")) return `<h3>${renderInlineWiki(trimmed.slice(3), lookup)}</h3>`;
        const lines = trimmed.split(/\n/);
        if (lines.every((line) => line.trim().startsWith("- "))) {
          return `<ul>${lines.map((line) => `<li>${renderInlineWiki(line.trim().slice(2), lookup)}</li>`).join("")}</ul>`;
        }
        return `<p>${lines.map((line) => renderInlineWiki(line, lookup)).join("<br>")}</p>`;
      })
      .join("");
  }

  function renderWikiFacts(page) {
    const facts = (page.facts || []).filter((fact) => fact.label && fact.value);
    if (!facts.length) return "";
    const lookup = pageLookup();
    return `
      <aside class="wiki-fact-sheet" aria-label="Fact Sheet">
        <div class="wiki-fact-head">
          <span class="section-kicker">Fact Sheet</span>
          <h3>${safeText(page.category)}</h3>
        </div>
        <dl>
          ${facts.map((fact) => `
            <div>
              <dt>${safeText(fact.label)}</dt>
              <dd>${renderInlineWiki(fact.value, lookup)}</dd>
            </div>`).join("")}
        </dl>
      </aside>`;
  }

  function renderWikiArticle(page) {
    if (!page) {
      return `
        <article class="wiki-article">
          <div class="empty">No Avant wiki pages have been created yet.</div>
        </article>`;
    }
    const refs = Engine.wikiPageReferences(data, page.id, { includeArchived: isAdmin });
    return `
      <article class="wiki-article">
        <header class="wiki-article-head">
          <div>
            <span class="section-kicker">${safeText(page.category)} / ${safeText(wikiYearLabel(page))}</span>
            <h2>${safeText(page.title)}</h2>
            ${page.summary ? `<p>${safeText(page.summary)}</p>` : ""}
          </div>
          <div class="wiki-article-actions">
            ${safeStatus(page.status === "published" ? "Published" : "Draft", page.status === "published" ? "positive" : "warning")}
            ${page.archived ? safeStatus("Archived") : ""}
            ${isAdmin ? `<button class="command compact" type="button" data-action="wiki-edit">Edit</button>` : ""}
          </div>
        </header>
        <div class="wiki-provenance">
          <span>${safeText(page.era || "No era")}</span>
          <span>Updated ${safeText(fmtDateTime(page.updatedAt))}</span>
        </div>
        ${renderWikiFacts(page)}
        <div class="wiki-body">${renderWikiBody(page.body)}</div>
        <footer class="wiki-article-foot">
          <div class="wiki-tags">${(page.tags || []).map((tag) => `<span>${safeText(tag)}</span>`).join("") || `<span>No tags</span>`}</div>
          ${refs.outbound.length ? `<div class="wiki-related"><strong>Links</strong>${refs.outbound.map((item) => `<button type="button" data-wiki-page="${escapeHtml(item.id)}">${safeText(item.title)}</button>`).join("")}</div>` : ""}
          ${refs.backlinks.length ? `<div class="wiki-related"><strong>Linked From</strong>${refs.backlinks.map((item) => `<button type="button" data-wiki-page="${escapeHtml(item.id)}">${safeText(item.title)}</button>`).join("")}</div>` : ""}
          ${refs.missingLinks.length ? `<div class="wiki-related wiki-missing-links"><strong>Missing</strong>${refs.missingLinks.map((item) => `<span>${safeText(item)}</span>`).join("")}</div>` : ""}
        </footer>
      </article>`;
  }

  function renderWikiTimeline(pages) {
    const dated = pages
      .filter((page) => page.yearStart !== "")
      .sort((left, right) => Engine.number(left.yearStart, 0) - Engine.number(right.yearStart, 0))
      .slice(0, 14);
    return `
      <aside class="wiki-timeline" aria-label="Timeline">
        <div class="wiki-side-head">
          <span class="section-kicker">0-2020</span>
          <h3>Timeline</h3>
        </div>
        ${dated.length ? dated.map((page) => `
          <button class="wiki-timeline-item" type="button" data-wiki-page="${escapeHtml(page.id)}">
            <span>${safeText(wikiYearLabel(page))}</span>
            <strong>${safeText(page.title)}</strong>
          </button>`).join("") : `<div class="empty compact">No dated pages.</div>`}
      </aside>`;
  }

  function editorValue(field) {
    return state.wikiDraft?.[field] ?? "";
  }

  function wikiEditor() {
    if (!isAdmin || !state.wikiDraft) return "";
    const draft = state.wikiDraft;
    const existingPage = draft.id ? data.wiki.pages[draft.id] : null;
    return `
      <section class="wiki-editor">
        <div class="wiki-editor-head">
          <div>
            <span class="section-kicker">Wiki editor</span>
            <h3>${existingPage ? `Editing ${safeText(existingPage.title)}` : "New page"}</h3>
          </div>
          <div class="wiki-editor-actions">
            <button class="command primary" type="button" data-action="wiki-save">Save Page</button>
            <button class="command" type="button" data-action="wiki-apply-fact-template">Fact Template</button>
            <button class="command" type="button" data-action="wiki-cancel-edit">Cancel</button>
            ${existingPage ? `<button class="command danger" type="button" data-action="${existingPage.archived ? "wiki-restore" : "wiki-archive"}">${existingPage.archived ? "Restore" : "Archive"}</button>` : ""}
          </div>
        </div>
        <div class="wiki-editor-grid">
          <label class="control-field is-text"><span>Title</span><input type="text" value="${escapeHtml(editorValue("title"))}" data-wiki-field="title"></label>
          <label class="control-field is-select"><span>Category</span><select data-wiki-field="category">${pageCategoryOptions(draft.category)}</select></label>
          <label class="control-field is-select"><span>Status</span><select data-wiki-field="status">${pageStatusOptions(draft.status)}</select></label>
          <label class="control-field is-text"><span>Era</span><input type="text" value="${escapeHtml(editorValue("era"))}" data-wiki-field="era"></label>
          <label class="control-field"><span>Start Year</span><input type="number" value="${escapeHtml(editorValue("yearStart"))}" data-wiki-field="yearStart"></label>
          <label class="control-field"><span>End Year</span><input type="number" value="${escapeHtml(editorValue("yearEnd"))}" data-wiki-field="yearEnd"></label>
          <label class="control-field is-text wiki-editor-wide"><span>Fact Sheet</span><textarea rows="6" data-wiki-field="facts">${escapeHtml(editorValue("facts"))}</textarea></label>
          <label class="control-field is-text wiki-editor-wide"><span>Summary</span><textarea rows="3" data-wiki-field="summary">${escapeHtml(editorValue("summary"))}</textarea></label>
          <label class="control-field is-text wiki-editor-wide"><span>Body</span><textarea rows="12" data-wiki-field="body">${escapeHtml(editorValue("body"))}</textarea></label>
          <label class="control-field is-text"><span>Tags</span><input type="text" value="${escapeHtml(editorValue("tags"))}" data-wiki-field="tags"></label>
          <label class="control-field is-text"><span>Aliases</span><input type="text" value="${escapeHtml(editorValue("aliases"))}" data-wiki-field="aliases"></label>
          <label class="control-field is-text wiki-editor-wide"><span>Related Page IDs</span><input type="text" value="${escapeHtml(editorValue("relatedPageIds"))}" data-wiki-field="relatedPageIds"></label>
        </div>
      </section>`;
  }

  function renderWiki() {
    Engine.ensureWikiState(data);
    const pages = wikiPagesForView();
    const page = selectedWikiPage(pages);
    if (page && state.selectedWikiPageId !== page.id) state.selectedWikiPageId = page.id;
    app.innerHTML = `
      <section class="wiki-shell">
        <header class="wiki-top">
          <div>
            <span class="section-kicker">Avant World / 0-2020</span>
            <h2>${safeText(data.wiki.meta.title)}</h2>
          </div>
          <div class="wiki-top-actions">
            <span class="status">${safeText(fmtNumber(Engine.wikiPages(data, { includeArchived: isAdmin }).length))} pages</span>
            ${isAdmin ? `<button class="command primary" type="button" data-action="wiki-new">New Page</button>` : ""}
          </div>
        </header>
        <div class="wiki-layout">
          <aside class="wiki-library" aria-label="Wiki pages">
            <div class="wiki-search-row">
              <label class="control-field is-text" for="wikiSearch"><span>Search</span><input id="wikiSearch" type="search" value="${escapeHtml(state.wikiQuery || "")}" data-wiki-search></label>
              <button class="command compact" type="button" data-action="wiki-clear-filters">Clear</button>
            </div>
            <div class="wiki-filter-grid">
              <label class="control-field is-select"><span>Category</span><select data-wiki-filter="category">${categoryOptions(state.wikiCategoryFilter || "all")}</select></label>
              <label class="control-field is-select"><span>Era</span><select data-wiki-filter="era">${eraOptions(state.wikiEraFilter || "all")}</select></label>
              <label class="control-field"><span>Year</span><input type="number" value="${escapeHtml(state.wikiYearFilter || "")}" data-wiki-year-filter></label>
              ${isAdmin ? `<label class="control-field is-select"><span>Status</span><select data-wiki-filter="status">${statusOptions(state.wikiStatusFilter || "all")}</select></label>` : ""}
              ${isAdmin ? `<button class="command compact ${state.wikiShowArchived ? "is-active" : ""}" type="button" data-action="wiki-toggle-archived">${state.wikiShowArchived ? "Hide Archived" : "Show Archived"}</button>` : ""}
            </div>
            <div class="wiki-list">${wikiPageList(pages)}</div>
          </aside>
          <div class="wiki-main">
            ${renderWikiArticle(page)}
            ${wikiEditor()}
          </div>
          ${renderWikiTimeline(pages)}
        </div>
      </section>`;
  }

  function updateWikiDraftField(field, value) {
    state.wikiDraft = state.wikiDraft || wikiDraftFromPage(selectedWikiPage() || {});
    state.wikiDraft[field] = value;
  }

  function handleInput(event) {
    const search = event.target.closest?.("[data-wiki-search]");
    if (search) {
      state.wikiQuery = search.value;
      render();
      return true;
    }
    const year = event.target.closest?.("[data-wiki-year-filter]");
    if (year) {
      state.wikiYearFilter = year.value;
      render();
      return true;
    }
    const field = event.target.closest?.("[data-wiki-field]");
    if (field) {
      updateWikiDraftField(field.dataset.wikiField, field.value);
      return true;
    }
    return false;
  }

  function handleChange(event) {
    const filter = event.target.closest?.("[data-wiki-filter]");
    if (filter) {
      const key = filter.dataset.wikiFilter;
      if (key === "category") state.wikiCategoryFilter = filter.value;
      if (key === "era") state.wikiEraFilter = filter.value;
      if (key === "status") state.wikiStatusFilter = filter.value;
      render();
      return true;
    }
    const field = event.target.closest?.("[data-wiki-field]");
    if (field) {
      updateWikiDraftField(field.dataset.wikiField, field.value);
      return true;
    }
    return false;
  }

  function saveWikiDraft() {
    if (!isAdmin) {
      state.notice = "Admin access is required for wiki edits.";
      render();
      return;
    }
    const page = Engine.saveWikiPage(data, state.wikiDraft || {});
    state.selectedWikiPageId = page.id;
    state.wikiDraft = null;
    saveWorkingState(`Wiki page saved: ${page.title}.`);
  }

  function handleClick(event) {
    const pageButton = event.target.closest?.("[data-wiki-page]");
    if (pageButton) {
      state.selectedWikiPageId = pageButton.dataset.wikiPage;
      state.wikiDraft = null;
      render();
      return true;
    }
    const actionButton = event.target.closest?.("[data-action]");
    if (!actionButton) return false;
    const action = actionButton.dataset.action;
    if (!action.startsWith("wiki-")) return false;
    if (["wiki-new", "wiki-edit", "wiki-save", "wiki-archive", "wiki-restore", "wiki-apply-fact-template"].includes(action) && !isAdmin) {
      state.notice = "Admin access is required for wiki edits.";
      render();
      return true;
    }
    if (action === "wiki-new") {
      state.wikiDraft = wikiDraftFromPage({ category: "Concept", status: "draft" });
      render();
      return true;
    }
    if (action === "wiki-edit") {
      state.wikiDraft = wikiDraftFromPage(selectedWikiPage() || {});
      render();
      return true;
    }
    if (action === "wiki-cancel-edit") {
      state.wikiDraft = null;
      render();
      return true;
    }
    if (action === "wiki-save") {
      saveWikiDraft();
      return true;
    }
    if (action === "wiki-apply-fact-template") {
      state.wikiDraft = state.wikiDraft || wikiDraftFromPage(selectedWikiPage() || {});
      const template = Engine.wikiFactTemplate(state.wikiDraft.category || "Concept");
      state.wikiDraft.facts = factsToText(template);
      render();
      return true;
    }
    if (action === "wiki-archive" || action === "wiki-restore") {
      const page = selectedWikiPage();
      if (page) {
        Engine.archiveWikiPage(data, page.id, action === "wiki-archive");
        state.wikiDraft = null;
        saveWorkingState(`Wiki page ${action === "wiki-archive" ? "archived" : "restored"}: ${page.title}.`);
      }
      return true;
    }
    if (action === "wiki-clear-filters") {
      state.wikiQuery = "";
      state.wikiCategoryFilter = "all";
      state.wikiEraFilter = "all";
      state.wikiYearFilter = "";
      state.wikiStatusFilter = "all";
      state.wikiShowArchived = false;
      render();
      return true;
    }
    if (action === "wiki-toggle-archived") {
      state.wikiShowArchived = !state.wikiShowArchived;
      render();
      return true;
    }
    return false;
  }

      return {
        renderWiki,
        handleInput,
        handleChange,
        handleClick
      };
    }
  };
})();
