(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  const INFOBOX_LABELS = {
    conflict: "Conflict",
    date: "Date",
    place: "Place",
    result: "Result",
    territory: "Territory",
    combatants: "Combatants",
    commanders: "Commanders",
    casualties: "Casualties",
    source: "Source"
  };

  function decodeTitle(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch (error) {
      return String(value || "");
    }
  }

  function titleFromUrlString(value) {
    const queryTitle = String(value || "").match(/[?&]title=([^&#]+)/i);
    if (queryTitle) return queryTitle[1];
    const wikiPath = String(value || "").match(/^https?:\/\/[^/]+\/wiki\/([^?#]+)/i);
    if (wikiPath) return wikiPath[1];
    return "";
  }

  function pageTitleFromInput(input) {
    const value = String(input || "").trim();
    if (!value) return "";
    const urlTitle = titleFromUrlString(value);
    if (urlTitle) return decodeTitle(urlTitle).replace(/_/g, " ").trim();
    try {
      const url = new URL(value);
      const title = url.searchParams.get("title")
        || url.pathname.split("/").filter(Boolean).pop()
        || value;
      return decodeTitle(title).replace(/_/g, " ").trim();
    } catch (error) {
      return decodeTitle(value).replace(/_/g, " ").trim();
    }
  }

  function sourceUrlFromInput(input, title) {
    const value = String(input || "").trim();
    if (/^https?:\/\//i.test(value)) return value;
    return `https://avantpedia.miraheze.org/wiki/${encodeURIComponent(String(title || value).trim().replace(/\s+/g, "_"))}`;
  }

  function stripFileLinks(text) {
    return String(text || "")
      .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, "")
      .replace(/\{\{[^{}]*\}\}/g, "");
  }

  function convertWikiLinks(text, options = {}) {
    return stripFileLinks(text).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, label) => {
      const cleanTarget = String(target || "").trim();
      const cleanLabel = String(label || "").trim();
      if (!cleanTarget || /^(?:File|Image):/i.test(cleanTarget)) return "";
      if (options.preferLabel && cleanLabel) return `[[${cleanLabel}]]`;
      if (!cleanLabel || cleanLabel === cleanTarget) return `[[${cleanTarget}]]`;
      return `[[${cleanTarget}|${cleanLabel}]]`;
    });
  }

  function compactValue(text, options = {}) {
    return convertWikiLinks(text, options)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("; ");
  }

  function extractInfobox(wikitext) {
    const text = String(wikitext || "");
    const match = text.match(/\{\{Infobox military conflict\s*([\s\S]*?)\n\}\}/i);
    if (!match) return { fields: {}, body: text };
    return {
      fields: parseInfoboxFields(match[1]),
      body: `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`.trim()
    };
  }

  function parseInfoboxFields(block) {
    const fields = {};
    let currentKey = "";
    String(block || "").split(/\r?\n/).forEach((line) => {
      const next = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
      if (next) {
        currentKey = next[1].trim();
        fields[currentKey] = next[2] || "";
        return;
      }
      if (currentKey) fields[currentKey] = `${fields[currentKey]}\n${line}`;
    });
    return fields;
  }

  function factLine(labelKey, value) {
    const clean = compactValue(value);
    if (!clean) return "";
    return `${INFOBOX_LABELS[labelKey] || labelKey}: ${clean}`;
  }

  function joinedFact(labelKey, values) {
    const clean = values
      .map((value) => compactValue(value))
      .filter(Boolean)
      .join("; ");
    return clean ? `${INFOBOX_LABELS[labelKey] || labelKey}: ${clean}` : "";
  }

  function factsFromInfobox(fields, sourceUrl) {
    return [
      factLine("conflict", fields.conflict),
      factLine("date", fields.date),
      factLine("place", fields.place),
      factLine("result", fields.result),
      factLine("territory", fields.territory),
      joinedFact("combatants", [fields.combatant1, fields.combatant2, fields.combatant3]),
      joinedFact("commanders", [fields.commander1, fields.commander2, fields.commander3]),
      joinedFact("casualties", [fields.casualties1, fields.casualties2, fields.casualties3]),
      sourceUrl ? `${INFOBOX_LABELS.source}: ${sourceUrl}` : ""
    ].filter(Boolean).join("\n");
  }

  function dateYears(value) {
    const years = String(value || "").match(/\b(1[0-9]{3}|20[0-2][0-9])\b/g) || [];
    if (!years.length) return { yearStart: "", yearEnd: "" };
    return {
      yearStart: years[0],
      yearEnd: years[1] || years[0]
    };
  }

  function tagsFromDraft(title, fields) {
    const haystack = [
      title,
      fields.conflict,
      fields.place,
      fields.combatant1,
      fields.combatant2
    ].join(" ");
    const tags = ["war", "conflict"];
    ["Solara", "Khalindar", "Alberion", "Congrave"].forEach((tag) => {
      if (haystack.toLowerCase().includes(tag.toLowerCase())) tags.push(tag);
    });
    return [...new Set(tags)].join(", ");
  }

  function summaryFromFields(title, fields) {
    const years = fields.date ? compactValue(fields.date) : "";
    const place = fields.place ? compactValue(fields.place) : "";
    const result = fields.result ? compactValue(fields.result) : "";
    const parts = [
      years ? `${years} conflict` : "Conflict",
      place ? `centered on ${place}` : "",
      result ? `ending with ${result.toLowerCase()}` : ""
    ].filter(Boolean);
    return `${title} was a ${parts.join(", ")}.`;
  }

  function convertHeadings(line) {
    const heading = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (!heading) return null;
    const level = Math.max(2, heading[1].length - 1);
    return `${"#".repeat(level)} ${heading[2].trim()}`;
  }

  function convertBody(wikitext) {
    return String(wikitext || "")
      .split(/\r?\n/)
      .map((line) => {
        if (/^\s*\[\[(?:File|Image):/i.test(line)) return "";
        const heading = convertHeadings(line.trim());
        if (heading) return heading;
        return convertWikiLinks(line, { preferLabel: true })
          .replace(/'''/g, "")
          .replace(/''/g, "")
          .trimEnd();
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function convertMirahezeWikitext({ title, sourceUrl = "", wikitext }) {
    const pageTitle = pageTitleFromInput(title) || "Untitled Page";
    const { fields, body } = extractInfobox(wikitext);
    const infoboxTitle = compactValue(fields.conflict || "");
    const years = dateYears(fields.date);
    return {
      id: "",
      title: pageTitle,
      category: "Conflict",
      status: "draft",
      era: "Modern Era",
      yearStart: years.yearStart,
      yearEnd: years.yearEnd,
      summary: summaryFromFields(pageTitle, fields),
      body: convertBody(body),
      facts: factsFromInfobox(fields, sourceUrl),
      tags: tagsFromDraft(pageTitle, fields),
      aliases: infoboxTitle && infoboxTitle !== pageTitle ? infoboxTitle : "",
      relatedPageIds: ""
    };
  }

  async function fetchMirahezeWikitext(input, fetchImpl = window.fetch?.bind(window)) {
    if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this browser.");
    const title = pageTitleFromInput(input);
    if (!title) throw new Error("Enter a Miraheze page URL or title.");
    const apiUrl = new URL("https://avantpedia.miraheze.org/w/api.php");
    apiUrl.searchParams.set("action", "parse");
    apiUrl.searchParams.set("page", title);
    apiUrl.searchParams.set("prop", "wikitext");
    apiUrl.searchParams.set("format", "json");
    apiUrl.searchParams.set("formatversion", "2");
    apiUrl.searchParams.set("origin", "*");
    const response = await fetchImpl(apiUrl.toString(), { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.info || "Miraheze page import failed.");
    }
    return {
      title: payload.parse?.title || title,
      sourceUrl: sourceUrlFromInput(input, title),
      wikitext: payload.parse?.wikitext || ""
    };
  }

  window.AGGS_APP_MODULES.WikiImport = {
    pageTitleFromInput,
    sourceUrlFromInput,
    convertMirahezeWikitext,
    fetchMirahezeWikitext
  };
})();
