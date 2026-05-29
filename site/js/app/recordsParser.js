(function () {
  const majorCategories = [
    "Small Arms",
    "Support Weapons",
    "Armored Vehicles",
    "Aeroplanes",
    "Aircraft",
    "Infantry Equipment",
    "Naval",
    "Navy",
    "Missiles",
    "Strategic Systems"
  ];

  const subcategoryMap = {
    Pistols: "Small Arms",
    Rifles: "Small Arms",
    SMGs: "Small Arms",
    "Assault Rifles": "Small Arms",
    MGs: "Small Arms",
    "ATR/RPG": "Small Arms",
    Miscellaneous: "Small Arms",
    Mortar: "Support Weapons",
    "ATGs/ATGM": "Support Weapons",
    Artillery: "Support Weapons",
    "AAA/SAM": "Support Weapons",
    Tanks: "Armored Vehicles",
    "IFV/APCs": "Armored Vehicles",
    SPGs: "Armored Vehicles",
    SPAA: "Armored Vehicles",
    "Recon vehicles": "Armored Vehicles",
    "Utility vehicles": "Armored Vehicles",
    "Support vehicles": "Armored Vehicles",
    "Fighters/Multi-Role": "Aeroplanes",
    Bombers: "Aeroplanes",
    Helicopters: "Aeroplanes",
    "Attack Helicopters": "Aeroplanes",
    CRBN: "Infantry Equipment",
    NVGs: "Infantry Equipment",
    Helmets: "Infantry Equipment",
    "Vests/Carrier": "Infantry Equipment",
    "Camo Patterns": "Infantry Equipment",
    Misc: "Infantry Equipment"
  };

  const defaultTemplates = [
    { key: "aircraft", name: "Aircraft Custom Template", category: "Aeroplanes" },
    { key: "armored_vehicle", name: "Tank / AFV Template", category: "Armored Vehicles" },
    { key: "missile", name: "Missile Template", category: "Missiles" },
    { key: "ship", name: "Ship Template", category: "Naval" },
    { key: "infantry_gear", name: "Infantry Gear Template", category: "Infantry Equipment" }
  ];

  function cleanLine(line) {
    return String(line || "")
      .replace(/^\s*[-*]\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function recordKey(record) {
    return [record.nationId || "", record.category || "", record.subcategory || "", normalizeName(record.name)].join("|");
  }

  function titleCaseNation(value) {
    return cleanLine(value).replace(/\s+Equipment$/i, "");
  }

  function isMajorCategory(line) {
    return majorCategories.find((category) => category.toLowerCase() === line.toLowerCase()) || "";
  }

  function subcategoryCategory(line) {
    const exact = Object.keys(subcategoryMap).find((subcategory) => subcategory.toLowerCase() === line.toLowerCase());
    return exact ? { subcategory: exact, category: subcategoryMap[exact] } : null;
  }

  function looksLikeNote(text) {
    return /\b(active|rare|common|main|variant|variants|produced|local|manpads?|flamethrower|prototype|reserve|retired|limited|export)\b/i.test(text);
  }

  function parseItemLine(line) {
    const notes = [];
    let name = line;
    const matches = Array.from(line.matchAll(/\(([^)]+)\)/g));
    matches.forEach((match) => {
      if (looksLikeNote(match[1])) {
        notes.push(match[1].trim());
        name = name.replace(match[0], "").replace(/\s+/g, " ").trim();
      }
    });
    const statusNote = notes.find((note) => /\bactive\b/i.test(note))
      || notes.find((note) => /\breserve\b/i.test(note))
      || notes.find((note) => /\bretired\b/i.test(note));
    const status = statusNote
      ? statusNote.match(/\bactive\b/i)
        ? "Active"
        : statusNote.match(/\breserve\b/i)
          ? "Reserve"
          : "Retired"
      : "Rostered";
    return { name, notes: notes.join("; "), status };
  }

  function mergeNotes(existing, next) {
    const existingNotes = String(existing || "").trim();
    const nextNotes = String(next || "").trim();
    if (!existingNotes) return nextNotes;
    if (!nextNotes || existingNotes.toLowerCase().includes(nextNotes.toLowerCase())) return existingNotes;
    return `${existingNotes}; ${nextNotes}`;
  }

  function parseRoster(text, options = {}) {
    const rows = String(text || "").split(/\r?\n/).map(cleanLine).filter(Boolean);
    let nationName = options.nationName || "";
    let category = "Small Arms";
    let subcategory = "";
    const byKey = new Map();
    const sourceDuplicates = [];

    rows.forEach((line) => {
      if (/equipment$/i.test(line) && !subcategoryCategory(line) && !isMajorCategory(line)) {
        nationName = titleCaseNation(line);
        return;
      }
      const major = isMajorCategory(line);
      if (major) {
        category = major === "Aircraft" ? "Aeroplanes" : major === "Navy" ? "Naval" : major;
        subcategory = "";
        return;
      }
      const sub = subcategoryCategory(line);
      if (sub) {
        category = sub.category;
        subcategory = sub.subcategory;
        return;
      }

      const parsed = parseItemLine(line);
      if (!parsed.name) return;
      const record = {
        id: "",
        name: parsed.name,
        category,
        subcategory,
        role: subcategory,
        status: parsed.status,
        origin: "Roster Import",
        notes: parsed.notes,
        detailLevel: "roster",
        updatedAt: ""
      };
      const key = recordKey(record);
      if (byKey.has(key)) {
        const existing = byKey.get(key);
        existing.notes = mergeNotes(existing.notes, record.notes);
        if (existing.status === "Rostered" && record.status !== "Rostered") existing.status = record.status;
        sourceDuplicates.push(record);
      } else {
        byKey.set(key, record);
      }
    });

    return {
      nationName,
      items: Array.from(byKey.values()),
      sourceDuplicates
    };
  }

  function stripMarkdown(value) {
    return cleanLine(value).replace(/\*\*/g, "").replace(/^#+\s*/, "");
  }

  function cleanHeading(value) {
    return stripMarkdown(value).replace(/^\[(.*)]$/, "$1").trim();
  }

  function parseFieldLine(line) {
    const cleaned = cleanLine(line).replace(/\*\*/g, "");
    const match = cleaned.match(/^([^:]+):\s*(.*)$/);
    if (!match) return null;
    return { label: stripMarkdown(match[1]), value: cleanLine(match[2]) };
  }

  function templateKind(title) {
    const lowerTitle = String(title || "").toLowerCase();
    if (/\b(ship|naval|submarine|frigate|destroyer|carrier)\b/.test(lowerTitle)) return "Ship";
    if (/\b(aircraft|plane|fighter|bomber|helicopter|uav|drone)\b/.test(lowerTitle)) return "Aircraft";
    if (/\b(tank|afv|armor|armour|vehicle)\b/.test(lowerTitle)) return "Vehicle";
    if (/\b(missile|rocket|sam|atgm)\b/.test(lowerTitle)) return "Missile";
    if (/\b(infantry|gear|helmet|vest|nvg|crbn)\b/.test(lowerTitle)) return "Infantry Gear";
    return "Equipment";
  }

  function templateDefaultName(title, options = {}) {
    const baseTitle = cleanHeading(title).replace(/\s*custom template$/i, "").trim();
    const kind = templateKind(title);
    if (options.name) return options.name;
    if (baseTitle && baseTitle.toLowerCase() !== kind.toLowerCase()) {
      const generic = /^(ship|aircraft|aircraft custom|tank|afv|tank \/ afv|vehicle|missile|infantry|infantry gear|equipment)$/i;
      if (!generic.test(baseTitle)) return baseTitle;
    }
    return `Untitled ${kind}`;
  }

  function parseDetailedTemplate(text, options = {}) {
    const rows = String(text || "").split(/\r?\n/);
    const sections = {};
    let currentSection = "General Information";
    let currentSubsection = "";
    let title = "";
    const fields = {};

    rows.forEach((row) => {
      const trimmed = row.trim();
      if (!trimmed) return;
      if (/^-{3,}$/.test(trimmed)) return;

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const rawHeading = heading[2];
        const headingText = cleanHeading(rawHeading);
        const bracketHeading = /^\*\*\[.*]\*\*$|^\[.*]$/.test(rawHeading.trim());

        if (level === 1) {
          title = headingText;
          return;
        }
        if (level === 2 || (level === 3 && bracketHeading)) {
          currentSection = headingText;
          currentSubsection = "";
          sections[currentSection] = sections[currentSection] || {};
          return;
        }
        if (level >= 3) {
          currentSubsection = headingText;
          sections[currentSection] = sections[currentSection] || {};
          sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {};
          return;
        }
        return;
      }

      const field = parseFieldLine(trimmed);
      if (!field) return;
      sections[currentSection] = sections[currentSection] || {};
      const target = currentSubsection ? (sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {}) : sections[currentSection];
      target[field.label] = field.value;
      fields[field.label.toLowerCase()] = field.value;
    });

    const name = fields.name || templateDefaultName(title, options);
    const category = options.category || templateCategory(title);
    return {
      id: "",
      name,
      category,
      subcategory: fields.designation || "",
      role: fields.type || templateKind(title),
      status: fields["year introduced"] ? "Fielded" : "Concept",
      origin: fields["country of origin"] || "Detailed Template",
      notes: title || "Detailed template import",
      detailLevel: "template",
      templateName: title || options.templateName || "Detailed Template",
      sections,
      rawTemplate: String(text || ""),
      updatedAt: ""
    };
  }

  function templateCategory(title) {
    const lowerTitle = String(title || "").toLowerCase();
    if (/\b(tank|afv|armor|armour|vehicle)\b/.test(lowerTitle)) return "Armored Vehicles";
    if (/\b(aircraft|plane|fighter|bomber|helicopter|uav|drone)\b/.test(lowerTitle)) return "Aeroplanes";
    if (/\b(missile|rocket|sam|atgm)\b/.test(lowerTitle)) return "Missiles";
    if (/\b(ship|naval|submarine|frigate|destroyer|carrier)\b/.test(lowerTitle)) return "Naval";
    if (/\b(infantry|gear|helmet|vest|nvg|crbn)\b/.test(lowerTitle)) return "Infantry Equipment";
    const match = defaultTemplates.find((template) => lowerTitle.includes(template.key.split("_")[0]));
    return match?.category || "Other";
  }

  function buildImportPreview(parsedItems, existingItems, nationId = "") {
    const existingByKey = new Map((existingItems || []).map((item) => [recordKey({ ...item, nationId }), item]));
    const newItems = [];
    const duplicates = [];
    const updates = [];
    (parsedItems || []).forEach((item) => {
      const key = recordKey({ ...item, nationId });
      const existing = existingByKey.get(key);
      if (!existing) {
        newItems.push(item);
        return;
      }
      const nextNotes = mergeNotes(existing.notes, item.notes);
      if (nextNotes !== String(existing.notes || "").trim()) updates.push({ existing, item: { ...item, notes: nextNotes } });
      else duplicates.push({ existing, item });
    });
    return { newItems, duplicates, updates };
  }

  const api = {
    defaultTemplates,
    parseRoster,
    parseDetailedTemplate,
    buildImportPreview,
    normalizeName,
    recordKey,
    mergeNotes
  };

  if (typeof window !== "undefined") window.AGGS_RECORDS_PARSER = api;
  if (typeof module !== "undefined") module.exports = api;
})();
