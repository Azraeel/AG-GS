(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createWikiRoute = function createWikiRoute(ctx) {
    const {
      Engine,
      getData,
      isAdmin = false,
      pushHash = (hash) => {
        if (!window.history || !window.location || window.location.hash === hash) return;
        window.history.pushState(null, "", hash);
      }
    } = ctx;

    function normalizeToken(value) {
      try {
        return decodeURIComponent(String(value || "")).trim();
      } catch (error) {
        return String(value || "").trim();
      }
    }

    function routeFromHash(hash) {
      const match = String(hash || "").trim().match(/^#wiki(?:\/(.+))?$/i);
      if (!match) return null;
      const token = normalizeToken(match[1] || "");
      const lowerToken = token.toLowerCase();
      if (lowerToken === "new") return { tab: "wiki", token: "", editorMode: "new" };
      if (lowerToken === "edit" || lowerToken.startsWith("edit/")) {
        return {
          tab: "wiki",
          token: normalizeToken(token.slice(4).replace(/^\/+/, "")),
          editorMode: "edit"
        };
      }
      return { tab: "wiki", token, editorMode: "" };
    }

    function comparableKeys(page) {
      return [
        page.id,
        page.slug,
        page.title,
        Engine.wikiSlug(page.title),
        ...(page.aliases || []),
        ...(page.aliases || []).map((alias) => Engine.wikiSlug(alias))
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
    }

    function pagesForRoute() {
      return Engine.wikiPages(getData(), { includeArchived: isAdmin })
        .filter((page) => isAdmin || page.status === "published");
    }

    function pageForToken(token) {
      const key = normalizeToken(token).toLowerCase();
      if (!key) return null;
      return pagesForRoute().find((page) => comparableKeys(page).includes(key)) || null;
    }

    function hashForPage(page) {
      const slug = page?.slug || Engine.wikiSlug(page?.title || page?.id || "");
      return slug ? `#wiki/${encodeURIComponent(slug)}` : "#wiki";
    }

    function hashForNewPage() {
      return "#wiki/new";
    }

    function hashForEditor(page) {
      const slug = page?.slug || Engine.wikiSlug(page?.title || page?.id || "");
      return slug ? `#wiki/edit/${encodeURIComponent(slug)}` : hashForNewPage();
    }

    function applyHashToState(state, hash) {
      const route = routeFromHash(hash);
      if (!route) return false;
      state.tab = "wiki";
      state.wikiDraft = null;
      state.wikiEditRoute = null;
      if (isAdmin && route.editorMode) {
        state.wikiEditRoute = { mode: route.editorMode, token: route.token };
        if (route.editorMode === "edit" && route.token) {
          const page = pageForToken(route.token);
          state.selectedWikiPageId = page?.id || "";
        }
        return true;
      }
      if (route.token) {
        const page = pageForToken(route.token);
        state.selectedWikiPageId = page?.id || "";
      } else {
        state.selectedWikiPageId = "";
      }
      return true;
    }

    function pushPage(page) {
      pushHash(hashForPage(page));
    }

    function pushNewPage() {
      pushHash(hashForNewPage());
    }

    function pushEditor(page) {
      pushHash(hashForEditor(page));
    }

    function pushHome() {
      pushHash("#wiki");
    }

    return {
      routeFromHash,
      pageForToken,
      hashForPage,
      hashForNewPage,
      hashForEditor,
      applyHashToState,
      pushPage,
      pushNewPage,
      pushEditor,
      pushHome
    };
  };
})();
