(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createWikiView = function createWikiView(ctx) {
    const runtime = {
      ...ctx,
      WikiImport: ctx.WikiImport || window.AGGS_APP_MODULES.WikiImport || null,
      wikiPageUrl: typeof ctx.wikiPageUrl === "function"
        ? ctx.wikiPageUrl
        : (page) => `#wiki/${encodeURIComponent(page?.slug || page?.id || "")}`,
      setWikiRoute: typeof ctx.setWikiRoute === "function" ? ctx.setWikiRoute : () => {},
      setWikiEditorRoute: typeof ctx.setWikiEditorRoute === "function" ? ctx.setWikiEditorRoute : () => {},
      setWikiHomeRoute: typeof ctx.setWikiHomeRoute === "function" ? ctx.setWikiHomeRoute : () => {},
      setLedgerRoute: typeof ctx.setLedgerRoute === "function" ? ctx.setLedgerRoute : () => {},
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

  function wikiReferenceTitle(title) {
    return String(title || "").replace(/[\[\]]/g, "").trim();
  }

  function wikiMissingLinkDraft(title) {
    const draftTitle = wikiReferenceTitle(title) || "Untitled Page";
    const audit = Engine.wikiContentAudit(data, { includeArchived: state.wikiShowArchived });
    const entry = audit.missingLinks.find((link) => link.title.toLowerCase() === draftTitle.toLowerCase());
    const sourcePages = entry?.from || [];
    return wikiDraftFromPage({
      title: draftTitle,
      category: "Concept",
      status: "draft",
      body: sourcePages.length
        ? `Referenced by ${sourcePages.map((page) => `[[${wikiReferenceTitle(page.title)}]]`).join(", ")}.`
        : "",
      relatedPageIds: sourcePages.map((page) => page.id)
    });
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

  function selectedWikiPage() {
    if (!state.selectedWikiPageId) return null;
    const allPages = Engine.wikiPages(data, { includeArchived: isAdmin });
    return allPages.find((page) => page.id === state.selectedWikiPageId)
      || null;
  }

  function wikiPageById(id) {
    return Engine.wikiPages(data, { includeArchived: isAdmin }).find((page) => page.id === id) || null;
  }

  function wikiPageByRouteToken(token) {
    const key = String(token || "").trim().toLowerCase();
    if (!key) return null;
    return Engine.wikiPages(data, { includeArchived: isAdmin }).find((page) => {
      const keys = [
        page.id,
        page.slug,
        page.title,
        Engine.wikiSlug(page.title),
        ...(page.aliases || []),
        ...(page.aliases || []).map((alias) => Engine.wikiSlug(alias))
      ];
      return keys.map((value) => String(value || "").trim().toLowerCase()).includes(key);
    }) || null;
  }

  function selectWikiPage(id, updateRoute = true) {
    state.selectedWikiPageId = id;
    state.wikiDraft = null;
    state.wikiEditRoute = null;
    state.wikiDraftRouteKey = "";
    const page = wikiPageById(id);
    render();
    if (updateRoute && page) setWikiRoute(page);
  }

  function wikiEditorRouteKey(route) {
    if (!route?.mode) return "";
    return `${route.mode}:${route.token || ""}`;
  }

  function ensureWikiEditorDraft() {
    if (!isAdmin || !state.wikiEditRoute?.mode) return;
    const key = wikiEditorRouteKey(state.wikiEditRoute);
    if (state.wikiDraft && state.wikiDraftRouteKey === key) return;
    if (state.wikiEditRoute.mode === "edit") {
      const page = wikiPageByRouteToken(state.wikiEditRoute.token);
      if (page) {
        state.selectedWikiPageId = page.id;
        state.wikiDraft = wikiDraftFromPage(page);
      } else {
        state.wikiDraft = wikiDraftFromPage({
          title: wikiReferenceTitle(state.wikiEditRoute.token),
          category: "Concept",
          status: "draft"
        });
      }
    } else {
      state.wikiDraft = wikiDraftFromPage({ category: "Concept", status: "draft" });
    }
    state.wikiDraftRouteKey = key;
  }

  function activeWikiReturnPage() {
    return wikiPageById(state.selectedWikiPageId);
  }

  function openWikiEditor(draft, mode = "new", page = null) {
    state.wikiDraft = draft;
    state.wikiDraftRouteKey = page ? `${mode}:${page.slug || page.id}` : `${mode}:`;
    state.wikiEditRoute = { mode, token: page?.slug || page?.id || "" };
    state.wikiImportStatus = "";
    render();
    setWikiEditorRoute(page, mode);
  }

  function leaveWikiEditor() {
    const page = activeWikiReturnPage();
    state.wikiDraft = null;
    state.wikiEditRoute = null;
    state.wikiDraftRouteKey = "";
    state.wikiImportStatus = "";
    render();
    if (page) {
      setWikiRoute(page);
    } else {
      setWikiHomeRoute();
    }
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

  function renderWikiFocusBar(title, actions = "") {
    return `
      <div class="wiki-focus-bar">
        <button class="command compact" type="button" data-action="wiki-back-ledger">Back to Ledger</button>
        <div class="wiki-focus-title">
          <span class="section-kicker">Avant Wiki</span>
          <strong>${safeText(title || data.wiki.meta.title)}</strong>
        </div>
        <div class="wiki-focus-actions">${actions}</div>
      </div>`;
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
    const linkWrappers = [
      { marker: "**", open: "<strong>", close: "</strong>" },
      { marker: "'''", open: "<strong>", close: "</strong>" },
      { marker: "''", open: "<em>", close: "</em>" },
      { marker: "*", open: "<em>", close: "</em>" }
    ];
    const renderTextMarkup = (value) => escapeHtml(value)
      .replace(/'''([^']+)'''/g, "<strong>$1</strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/''([^']+)''/g, "<em>$1</em>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label, offset) => {
      let segmentStart = offset;
      let segmentEnd = offset + match.length;
      const wrapper = linkWrappers.find((candidate) => (
        segmentStart >= candidate.marker.length
        && source.slice(segmentStart - candidate.marker.length, segmentStart) === candidate.marker
        && source.slice(segmentEnd, segmentEnd + candidate.marker.length) === candidate.marker
      ));
      if (wrapper) {
        segmentStart -= wrapper.marker.length;
        segmentEnd += wrapper.marker.length;
      }
      output += renderTextMarkup(source.slice(lastIndex, segmentStart));
      const key = String(target || "").trim().toLowerCase();
      const page = lookup.get(key);
      const linkLabel = label || target;
      const renderedLink = page
        ? `<button class="wiki-inline-link" type="button" data-wiki-page="${escapeHtml(page.id)}">${safeText(linkLabel)}</button>`
        : `<span class="wiki-missing-link">${safeText(linkLabel)}</span>`;
      output += wrapper ? `${wrapper.open}${renderedLink}${wrapper.close}` : renderedLink;
      lastIndex = segmentEnd;
      return match;
    });
    output += renderTextMarkup(source.slice(lastIndex));
    return output;
  }

  function wikiHeadingId(title, index) {
    const slug = Engine.wikiSlug
      ? Engine.wikiSlug(title)
      : String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `wiki-heading-${slug || "section"}-${index}`;
  }

  function wikiBodyHeadings(body) {
    const headings = [];
    String(body || "").split(/\n/).forEach((line) => {
      const match = line.trim().match(/^(#{2,6})\s+(.+)$/);
      if (!match) return;
      const level = Math.min(6, Math.max(3, match[1].length + 1));
      const title = match[2].trim();
      headings.push({
        id: wikiHeadingId(title, headings.length),
        level,
        title
      });
    });
    return headings;
  }

  function renderWikiContents(body) {
    const headings = wikiBodyHeadings(body);
    if (headings.length < 2) return "";
    return `
      <nav class="wiki-contents" aria-label="Contents">
        <div class="wiki-contents-title">Contents</div>
        <ol>
          ${headings.map((heading) => `
            <li class="depth-${safeText(heading.level)}">
              <button type="button" data-wiki-jump="${escapeHtml(heading.id)}">${safeText(heading.title)}</button>
            </li>`).join("")}
        </ol>
      </nav>`;
  }

  function renderWikiBody(body) {
    const source = String(body || "").trim();
    if (!source) return `<div class="empty compact">No article body yet.</div>`;
    const lookup = pageLookup();
    const output = [];
    let paragraph = [];
    let list = [];
    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(`<p>${paragraph.map((line) => renderInlineWiki(line, lookup)).join("<br>")}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!list.length) return;
      output.push(`<ul>${list.map((line) => `<li>${renderInlineWiki(line, lookup)}</li>`).join("")}</ul>`);
      list = [];
    };
    let headingIndex = 0;

    source.split(/\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }
      const heading = trimmed.match(/^(#{2,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(6, Math.max(3, heading[1].length + 1));
        const headingTitle = heading[2].trim();
        output.push(`<h${level} id="${escapeHtml(wikiHeadingId(headingTitle, headingIndex))}">${renderInlineWiki(headingTitle, lookup)}</h${level}>`);
        headingIndex += 1;
        return;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        flushParagraph();
        list.push(trimmed.replace(/^[-*]\s+/, ""));
        return;
      }
      flushList();
      paragraph.push(line);
    });
    flushParagraph();
    flushList();
    return output.join("");
  }

  function renderWikiArticleRead(page, options = {}) {
    const includeContents = options.includeContents !== false;
    return `
      <div class="wiki-article-read">
        ${includeContents ? renderWikiContents(page.body) : ""}
        <div class="wiki-body">${renderWikiBody(page.body)}</div>
      </div>`;
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

  function renderWikiArticleHead(page) {
    return `
      <header class="wiki-article-head">
        <div>
          <span class="section-kicker">${safeText(page.category)} / ${safeText(wikiYearLabel(page))}</span>
          <h2>${safeText(page.title)}</h2>
          ${page.summary ? `<p>${safeText(page.summary)}</p>` : ""}
        </div>
        <div class="wiki-article-actions">
          <a class="wiki-permalink" href="${escapeHtml(wikiPageUrl(page))}">Page Link</a>
          ${safeStatus(page.status === "published" ? "Published" : "Draft", page.status === "published" ? "positive" : "warning")}
          ${page.archived ? safeStatus("Archived") : ""}
          ${isAdmin ? `<button class="command compact" type="button" data-action="wiki-edit">Edit</button>` : ""}
        </div>
      </header>`;
  }

  function renderWikiArticleProvenance(page) {
    return `
      <div class="wiki-provenance">
        <span>${safeText(page.era || "No era")}</span>
        <span>Updated ${safeText(fmtDateTime(page.updatedAt))}</span>
      </div>`;
  }

  function renderWikiArticleFooter(page, refs) {
    return `
      <footer class="wiki-article-foot">
        <div class="wiki-tags">${(page.tags || []).map((tag) => `<span>${safeText(tag)}</span>`).join("") || `<span>No tags</span>`}</div>
        ${refs.outbound.length ? `<div class="wiki-related"><strong>Links</strong>${refs.outbound.map((item) => `<button type="button" data-wiki-page="${escapeHtml(item.id)}">${safeText(item.title)}</button>`).join("")}</div>` : ""}
        ${refs.backlinks.length ? `<div class="wiki-related"><strong>Linked From</strong>${refs.backlinks.map((item) => `<button type="button" data-wiki-page="${escapeHtml(item.id)}">${safeText(item.title)}</button>`).join("")}</div>` : ""}
        ${refs.missingLinks.length ? `<div class="wiki-related wiki-missing-links"><strong>Missing</strong>${refs.missingLinks.map((item) => wikiMissingLinkLabel(item)).join("")}</div>` : ""}
      </footer>`;
  }

  function renderWikiArticle(page, options = {}) {
    if (!page) {
      return `
        <article class="wiki-article">
          <div class="empty">No Avant wiki pages have been created yet.</div>
        </article>`;
    }
    const refs = Engine.wikiPageReferences(data, page.id, { includeArchived: isAdmin });
    const footer = renderWikiArticleFooter(page, refs);
    const articleTools = [renderWikiFacts(page), renderWikiContents(page.body)].filter(Boolean).join("");
    if (options.dedicated) {
      return `
        <article class="wiki-article">
          ${renderWikiArticleHead(page)}
          ${renderWikiArticleProvenance(page)}
          <div class="wiki-article-layout">
            <div class="wiki-article-main">
              ${renderWikiArticleRead(page, { includeContents: false })}
              ${footer}
            </div>
            ${articleTools ? `<div class="wiki-article-rail" aria-label="Article tools">${articleTools}</div>` : ""}
          </div>
        </article>`;
    }
    return `
      <article class="wiki-article">
        ${renderWikiArticleHead(page)}
        ${renderWikiArticleProvenance(page)}
        ${renderWikiFacts(page)}
        ${renderWikiArticleRead(page)}
        ${footer}
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

  function wikiDraftPreviewPage() {
    const previewState = Engine.clone(data);
    const draft = state.wikiDraft || {};
    return Engine.saveWikiPage(previewState, {
      ...draft,
      title: String(draft.title || "").trim() || "Untitled Page"
    });
  }

  function renderWikiDraftPreview() {
    if (!isAdmin || !state.wikiDraft) return "";
    const page = wikiDraftPreviewPage();
    return `
      <section class="wiki-review-article" aria-label="Article Review">
        <header class="wiki-review-head">
          <div>
            <span class="section-kicker">Article Review</span>
            <h4>${safeText(page.title)}</h4>
            ${page.summary ? `<p>${safeText(page.summary)}</p>` : ""}
          </div>
          <div class="wiki-review-chips">
            <span>${safeText(page.status === "published" ? "Published" : "Draft")}</span>
            <span>${safeText(page.category)}</span>
            <span>${safeText(wikiYearLabel(page))}</span>
          </div>
        </header>
        ${renderWikiFacts(page)}
        ${renderWikiArticleRead(page)}
        <div class="wiki-tags">${(page.tags || []).map((tag) => `<span>${safeText(tag)}</span>`).join("") || `<span>No tags</span>`}</div>
      </section>`;
  }

  function wikiWorkbenchPageRows(pages, emptyText) {
    if (!pages.length) return `<div class="empty compact">${safeText(emptyText)}</div>`;
    return pages.slice(0, 6).map((page) => `
      <button class="wiki-workbench-row" type="button" data-wiki-page="${escapeHtml(page.id)}">
        <span>
          <strong>${safeText(page.title)}</strong>
          <small>${safeText(page.category)} / ${safeText(wikiYearLabel(page))}</small>
        </span>
        ${page.status === "draft" ? `<span class="status warning">Draft</span>` : ""}
      </button>`).join("");
  }

  function wikiMissingLinkAction(title, label = title) {
    return `<button type="button" data-action="wiki-start-missing" data-wiki-missing-title="${escapeHtml(title)}">${safeText(label)}</button>`;
  }

  function wikiMissingLinkLabel(title) {
    return isAdmin
      ? wikiMissingLinkAction(title)
      : `<span>${safeText(title)}</span>`;
  }

  function wikiWorkbenchMissingRows(links) {
    if (!links.length) return `<div class="empty compact">No missing links.</div>`;
    return links.slice(0, 6).map((link) => `
      <button class="wiki-workbench-row" type="button" data-action="wiki-start-missing" data-wiki-missing-title="${escapeHtml(link.title)}">
        <span>
          <strong>${safeText(link.title)}</strong>
          <small>${safeText(link.from.map((page) => page.title).join(", "))}</small>
        </span>
        <span class="status warning">${safeText(fmtNumber(link.count))}</span>
      </button>`).join("");
  }

  function wikiWorkbenchCategoryRows(counts) {
    if (!counts.length) return `<span class="status">No categories</span>`;
    return counts
      .map((item) => `<span>${safeText(item.category)} ${safeText(fmtNumber(item.count))}</span>`)
      .join("");
  }

  function renderWikiWorkbench() {
    if (!isAdmin) return "";
    const audit = Engine.wikiContentAudit(data, { includeArchived: state.wikiShowArchived });
    return `
      <section class="wiki-workbench" aria-label="Wiki Workbench">
        <div class="wiki-workbench-head">
          <div>
            <span class="section-kicker">Lore build queue</span>
            <h3>Wiki Workbench</h3>
          </div>
          <div class="wiki-workbench-metrics">
            <span>${safeText(fmtNumber(audit.pageCount))} pages</span>
            <span>${safeText(fmtNumber(audit.publishedCount))} published</span>
            <span>${safeText(fmtNumber(audit.draftCount))} drafts</span>
            ${audit.archivedCount ? `<span>${safeText(fmtNumber(audit.archivedCount))} archived</span>` : ""}
          </div>
        </div>
        <div class="wiki-workbench-grid">
          <div class="wiki-workbench-column">
            <h4>Drafts</h4>
            ${wikiWorkbenchPageRows(audit.draftPages, "No draft pages.")}
          </div>
          <div class="wiki-workbench-column">
            <h4>Missing Links</h4>
            ${wikiWorkbenchMissingRows(audit.missingLinks)}
          </div>
          <div class="wiki-workbench-column">
            <h4>Orphans</h4>
            ${wikiWorkbenchPageRows(audit.orphanPages, "No orphan pages.")}
          </div>
        </div>
        <div class="wiki-workbench-categories" aria-label="Category counts">
          <strong>Categories</strong>
          ${wikiWorkbenchCategoryRows(audit.categoryCounts)}
        </div>
      </section>`;
  }

  function editorValue(field) {
    return state.wikiDraft?.[field] ?? "";
  }

  function importedDraftFromPage(page = {}) {
    return {
      id: page.id || "",
      title: page.title || "",
      category: page.category || "Conflict",
      status: page.status || "draft",
      era: page.era || "",
      yearStart: page.yearStart ?? "",
      yearEnd: page.yearEnd ?? "",
      summary: page.summary || "",
      body: page.body || "",
      facts: page.facts || "",
      tags: page.tags || "",
      aliases: page.aliases || "",
      relatedPageIds: page.relatedPageIds || ""
    };
  }

  function wikiImportStatus() {
    return state.wikiImportStatus
      ? `<span class="wiki-import-status">${safeText(state.wikiImportStatus)}</span>`
      : "";
  }

  function wikiEditor() {
    if (!isAdmin || !state.wikiDraft) return "";
    const draft = state.wikiDraft;
    const existingPage = draft.id ? data.wiki.pages[draft.id] : null;
    const hasReadableDraft = Boolean(String([
      draft.title,
      draft.summary,
      draft.body,
      draft.facts,
      draft.tags
    ].filter(Boolean).join(" ")).trim());
    const sourceFieldsOpen = Boolean(existingPage) || !hasReadableDraft;
    return `
      <section class="wiki-editor">
        <div class="wiki-editor-head">
          <div>
            <span class="section-kicker">Wiki editor</span>
            <h3>${existingPage ? `Editing ${safeText(existingPage.title)}` : "New page"}</h3>
          </div>
          <div class="wiki-editor-actions">
            <button class="command" type="button" data-action="wiki-back">Back</button>
            <button class="command primary" type="button" data-action="wiki-save">Save Page</button>
            <button class="command" type="button" data-action="wiki-preview-draft">Review</button>
            <button class="command" type="button" data-action="wiki-apply-fact-template">Fact Template</button>
            ${existingPage ? `<button class="command danger" type="button" data-action="${existingPage.archived ? "wiki-restore" : "wiki-archive"}">${existingPage.archived ? "Restore" : "Archive"}</button>` : ""}
          </div>
        </div>
        <div class="wiki-import-row">
          <label class="control-field is-text wiki-import-field">
            <span>Miraheze URL</span>
            <input type="text" value="${escapeHtml(state.wikiImportSource || "")}" data-wiki-import-source>
          </label>
          <button class="command" type="button" data-action="wiki-import-miraheze">Import Miraheze</button>
          ${wikiImportStatus()}
        </div>
        ${renderWikiDraftPreview()}
        <details class="wiki-source-editor" ${sourceFieldsOpen ? "open" : ""}>
          <summary>
            <span>Source Fields</span>
            <small>Title, facts, body, tags, aliases, and related page ids</small>
          </summary>
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
        </details>
      </section>`;
  }

  function renderWiki() {
    Engine.ensureWikiState(data);
    ensureWikiEditorDraft();
    const pages = wikiPagesForView();
    const page = selectedWikiPage();
    const isEditingWiki = isAdmin && state.wikiDraft;
    if (isEditingWiki) {
      app.innerHTML = `
        <section class="wiki-shell wiki-editor-shell">
          ${renderWikiFocusBar("Editing lore")}
          <main class="wiki-editor-page">
            ${wikiEditor()}
          </main>
        </section>`;
      return;
    }
    if (page) {
      app.innerHTML = `
        <section class="wiki-shell wiki-article-shell">
          ${renderWikiFocusBar(page.title, `<button class="command compact" type="button" data-action="wiki-home">Back to Wiki</button>`)}
          <main class="wiki-document wiki-article-document">
            ${renderWikiArticle(page, { dedicated: true })}
          </main>
        </section>`;
      return;
    }
    app.innerHTML = `
      <section class="wiki-shell wiki-page-shell">
        ${renderWikiFocusBar(data.wiki.meta.title)}
        <header class="wiki-masthead">
          <div class="wiki-title-block">
            <span class="wiki-site-mark">Avantpedia / 0-2020</span>
            <h2>${safeText(data.wiki.meta.title)}</h2>
            <p>Canon archive for nations, people, conflicts, regions, treaties, cultures, and era lore.</p>
          </div>
          <div class="wiki-masthead-tools">
            <label class="wiki-search-box" for="wikiSearch">
              <span>Search the wiki</span>
              <input id="wikiSearch" type="search" value="${escapeHtml(state.wikiQuery || "")}" data-wiki-search>
            </label>
            <button class="command compact" type="button" data-action="wiki-clear-filters">Clear</button>
            <span class="wiki-page-count">${safeText(fmtNumber(Engine.wikiPages(data, { includeArchived: isAdmin }).length))} pages</span>
            ${isAdmin ? `<button class="command primary" type="button" data-action="wiki-new">New Page</button>` : ""}
          </div>
        </header>
        ${renderWikiWorkbench()}
          <div class="wiki-page-frame">
            <aside class="wiki-index" aria-label="Wiki index">
              <div class="wiki-index-head">
                <span class="section-kicker">Index</span>
                <h3>Browse Lore</h3>
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
            <main class="wiki-document">
              ${renderWikiArticle(page)}
            </main>
            <aside class="wiki-side-rail" aria-label="Wiki timeline">
              ${renderWikiTimeline(pages)}
            </aside>
          </div>
      </section>`;
  }

  function updateWikiDraftField(field, value) {
    state.wikiDraft = state.wikiDraft || wikiDraftFromPage(selectedWikiPage() || {});
    state.wikiDraft[field] = value;
  }

  async function importMirahezeDraft() {
    if (!WikiImport?.fetchMirahezeWikitext || !WikiImport?.convertMirahezeWikitext) {
      state.wikiImportStatus = "Miraheze import is unavailable.";
      render();
      return;
    }
    const source = String(state.wikiImportSource || "").trim();
    if (!source) {
      state.wikiImportStatus = "Enter a Miraheze URL or page title.";
      render();
      return;
    }
    state.wikiImportStatus = "Importing Miraheze page.";
    render();
    try {
      const page = await WikiImport.fetchMirahezeWikitext(source);
      state.wikiDraft = importedDraftFromPage(WikiImport.convertMirahezeWikitext(page));
      state.wikiImportSource = page.sourceUrl || source;
      state.wikiImportStatus = `Imported ${state.wikiDraft.title}.`;
    } catch (error) {
      state.wikiImportStatus = error?.message || "Miraheze import failed.";
    }
    render();
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
    const importSource = event.target.closest?.("[data-wiki-import-source]");
    if (importSource) {
      state.wikiImportSource = importSource.value;
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
    state.wikiEditRoute = null;
    state.wikiDraftRouteKey = "";
    setWikiRoute(page);
    saveWorkingState(`Wiki page saved: ${page.title}.`);
  }

  function handleClick(event) {
    const pageButton = event.target.closest?.("[data-wiki-page]");
    if (pageButton) {
      selectWikiPage(pageButton.dataset.wikiPage);
      return true;
    }
    const jumpButton = event.target.closest?.("[data-wiki-jump]");
    if (jumpButton) {
      if (typeof document !== "undefined") {
        document.getElementById(jumpButton.dataset.wikiJump)?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      return true;
    }
    const actionButton = event.target.closest?.("[data-action]");
    if (!actionButton) return false;
    const action = actionButton.dataset.action;
    if (!action.startsWith("wiki-")) return false;
    if (action === "wiki-back-ledger") {
      setLedgerRoute();
      return true;
    }
    if (action === "wiki-home") {
      state.selectedWikiPageId = "";
      state.wikiDraft = null;
      state.wikiEditRoute = null;
      state.wikiDraftRouteKey = "";
      render();
      setWikiHomeRoute();
      return true;
    }
    if (["wiki-new", "wiki-edit", "wiki-save", "wiki-archive", "wiki-restore", "wiki-apply-fact-template", "wiki-preview-draft", "wiki-start-missing", "wiki-import-miraheze", "wiki-back", "wiki-cancel-edit"].includes(action) && !isAdmin) {
      state.notice = "Admin access is required for wiki edits.";
      render();
      return true;
    }
    if (action === "wiki-start-missing") {
      openWikiEditor(wikiMissingLinkDraft(actionButton.dataset.wikiMissingTitle || ""), "new");
      return true;
    }
    if (action === "wiki-new") {
      openWikiEditor(wikiDraftFromPage({ category: "Concept", status: "draft" }), "new");
      return true;
    }
    if (action === "wiki-edit") {
      const page = selectedWikiPage();
      openWikiEditor(wikiDraftFromPage(page || {}), "edit", page);
      return true;
    }
    if (action === "wiki-back" || action === "wiki-cancel-edit") {
      leaveWikiEditor();
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
    if (action === "wiki-preview-draft") {
      state.wikiDraft = state.wikiDraft || wikiDraftFromPage(selectedWikiPage() || {});
      render();
      return true;
    }
    if (action === "wiki-import-miraheze") {
      importMirahezeDraft();
      return true;
    }
    if (action === "wiki-archive" || action === "wiki-restore") {
      const page = selectedWikiPage();
      if (page) {
        Engine.archiveWikiPage(data, page.id, action === "wiki-archive");
        state.wikiDraft = null;
        state.wikiEditRoute = null;
        state.wikiDraftRouteKey = "";
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
