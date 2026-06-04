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

  const navalSubcategories = [
    "Support Ships",
    "Patrol Boats",
    "Corvette",
    "Corvettes",
    "Frigates",
    "Destroyers",
    "Cruisers",
    "Carriers",
    "Submarines",
    "Capital ship",
    "Battleships",
    "Landing Ships",
    "Amphibious Ships",
    "Misc Ships"
  ];

  const defaultTemplates = [
    { key: "aircraft", name: "Aircraft Custom Template", category: "Aeroplanes" },
    { key: "armored_vehicle", name: "Tank / AFV Template", category: "Armored Vehicles" },
    { key: "missile", name: "Missile Template", category: "Missiles" },
    { key: "ship", name: "Ship Template", category: "Naval" },
    { key: "infantry_gear", name: "Infantry Gear Template", category: "Infantry Equipment" }
  ];

  function cleanLine(line) {
    return String(line || "")
      .replace(/^\s*[-*\u2022]\s+/, "")
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

  function navalSubcategory(line) {
    return navalSubcategories.find((subcategory) => subcategory.toLowerCase() === line.toLowerCase()) || "";
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
    name = name.replace(/[\s,]+$/g, "").trim();
    if (/^[,.;:-]+$/.test(name)) name = "";
    if (/^n\/?a$/i.test(name)) name = "";
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
      const naval = category === "Naval" ? navalSubcategory(line) : "";
      if (naval) {
        subcategory = naval;
        return;
      }

      const parsed = parseItemLine(line);
      if (!parsed.name) return;
      const record = {
        id: "",
        name: parsed.name,
        category,
        status: parsed.status,
        origin: "Roster Import",
        detailLevel: "roster",
        updatedAt: ""
      };
      if (subcategory) {
        record.subcategory = subcategory;
        record.role = subcategory;
      }
      if (parsed.notes) record.notes = parsed.notes;
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
    return cleanLine(value).replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/, "");
  }

  function cleanHeading(value) {
    return stripMarkdown(value).replace(/^\[(.*)]$/, "$1").trim();
  }

  function parseFieldLine(line) {
    const cleaned = cleanLine(line).replace(/\*\*/g, "");
    const match = cleaned.match(/^([^:]+):\s*(.*)$/);
    if (match) return { label: stripMarkdown(match[1]), value: cleanLine(match[2]) };
    const dashMatch = cleaned.match(/^([^\u2013\u2014-]+?)\s+[\u2013\u2014-]\s+(.+)$/);
    if (!dashMatch) return null;
    return { label: stripMarkdown(dashMatch[1]), value: cleanLine(dashMatch[2]) };
  }

  const majorTemplateSections = new Map([
    ["general information", "General Information"],
    ["technical specifications", "Technical Specifications"],
    ["performance", "Performance"],
    ["performance characteristics", "Performance Characteristics"],
    ["dimensions", "Dimensions"],
    ["flight characteristics", "Flight Characteristics"],
    ["armament", "Armament"],
    ["firepower", "Firepower"],
    ["electronics", "Electronics"],
    ["electronics & systems", "Electronics & Systems"],
    ["electronics and systems", "Electronics & Systems"],
    ["avionics & electronics", "Avionics & Electronics"],
    ["avionics and electronics", "Avionics & Electronics"],
    ["electronics, sensors & systems", "Electronics, Sensors & Systems"],
    ["electronics sensors & systems", "Electronics, Sensors & Systems"],
    ["navigation & targeting", "Navigation & Targeting"],
    ["navigation & targeting systems", "Navigation & Targeting"],
    ["navigation and targeting", "Navigation & Targeting"],
    ["payload options", "Payload Options"],
    ["defensive & survival systems", "Defensive & Survival Systems"],
    ["defensive and survival systems", "Defensive & Survival Systems"],
    ["short description", "Short Description"],
    ["additional remarks", "Additional Remarks"],
    ["materials & construction", "Materials & Construction"],
    ["materials and construction", "Materials & Construction"],
    ["optics & targeting systems", "Optics & Targeting Systems"],
    ["optics and targeting systems", "Optics & Targeting Systems"],
    ["ergonomics & handling", "Ergonomics & Handling"],
    ["ergonomics and handling", "Ergonomics & Handling"],
    ["reliability & environmental performance", "Reliability & Environmental Performance"],
    ["reliability and environmental performance", "Reliability & Environmental Performance"],
    ["variants & modular options", "Variants & Modular Options"],
    ["variants and modular options", "Variants & Modular Options"],
    ["logistics & operational details", "Logistics & Operational Details"],
    ["logistics and operational details", "Logistics & Operational Details"],
    ["cost & economic considerations", "Cost & Economic Considerations"],
    ["cost and economic considerations", "Cost & Economic Considerations"],
    ["mobility systems", "Mobility Systems"],
    ["visual enhancements", "Visual Enhancements"],
    ["protection systems", "Protection Systems"],
    ["armour & protection", "Armour & Protection"],
    ["armour and protection", "Armour & Protection"],
    ["armor & protection", "Armour & Protection"],
    ["armor and protection", "Armour & Protection"],
    ["logistics & maintenance systems", "Logistics & Maintenance Systems"],
    ["logistics and maintenance systems", "Logistics & Maintenance Systems"],
    ["capabilities", "Capabilities"],
    ["cost & operational aspects", "Cost & Operational Aspects"],
    ["cost and operational aspects", "Cost & Operational Aspects"],
    ["propulsion & maneuvering systems", "Propulsion & Maneuvering Systems"],
    ["propulsion and maneuvering systems", "Propulsion & Maneuvering Systems"],
    ["firepower & armament", "Firepower & Armament"],
    ["firepower and armament", "Firepower & Armament"],
    ["protection & armor", "Protection & Armor"],
    ["protection and armor", "Protection & Armor"]
  ]);

  const templateSubsections = new Map([
    ["internal", "Internal"],
    ["internal armament", "Internal Armament"],
    ["external hard-points", "External Hardpoints"],
    ["external hardpoints", "External Hardpoints"],
    ["air-to-air", "Air-to-Air"],
    ["air to air", "Air-to-Air"],
    ["air-to-ground", "Air-to-Ground"],
    ["air to ground", "Air-to-Ground"],
    ["auxiliary", "Auxiliary"],
    ["primary armament", "Primary Armament"],
    ["primary weapon", "Primary Weapon"],
    ["primary weapon ngap", "Primary Weapon (NGAP)"],
    ["primary weapon janissary options", "Primary Weapon (Janissary Options)"],
    ["secondary armament", "Secondary Armament"],
    ["secondary weapons", "Secondary Weapons"],
    ["missile systems", "Missile Systems"],
    ["anti-aircraft weapons", "Anti-Aircraft Weapons"],
    ["missiles", "Missiles"],
    ["anti-submarine warfare", "Anti-Submarine Warfare"],
    ["aircraft/helicopter support", "Aircraft/Helicopter Support"],
    ["weight", "Weight"],
    ["mobility", "Mobility"],
    ["suspension system", "Suspension System"],
    ["radar", "Radar"],
    ["active protection systems aps", "Active Protection Systems (APS)"],
    ["countermeasures", "Countermeasures"],
    ["hull armor", "Hull Armor"],
    ["hull armour", "Hull Armour"],
    ["hull", "Hull"],
    ["turret protection", "Turret Protection"],
    ["turret protection ngap", "Turret Protection (NGAP)"],
    ["conning tower armor", "Conning Tower Armor"],
    ["additional protection systems", "Additional Protection Systems"],
    ["additional protection", "Additional Protection"],
    ["misc protection", "Misc Protection"],
    ["battlefield role", "Battlefield Role"]
  ]);

  function normalizedHeadingKey(value) {
    return cleanHeading(value)
      .toLowerCase()
      .replace(/[()[\]{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function plainTemplateHeading(line) {
    const key = normalizedHeadingKey(line);
    if (majorTemplateSections.has(key)) return { type: "section", label: majorTemplateSections.get(key) };
    if (templateSubsections.has(key)) return { type: "subsection", label: templateSubsections.get(key) };
    return null;
  }

  function isDiscordNoise(line) {
    const cleaned = cleanLine(line);
    if (/^OP$/i.test(cleaned)) return true;
    if (/^\u2014?\s*\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/.test(cleaned)) return true;
    if (/^image$/i.test(cleaned)) return true;
    if (/^[\w .,'-]+\s+\[[^\]]+],?$/.test(cleaned) && !cleaned.includes(":")) return true;
    return false;
  }

  function standaloneSubsection(line, currentSection) {
    if (!currentSection || currentSection === "General Information" || currentSection === "Short Description" || currentSection === "Additional Remarks") return "";
    const key = normalizedHeadingKey(line);
    if (templateSubsections.has(key)) return templateSubsections.get(key);
    const cleaned = cleanHeading(line);
    if (cleaned.length > 64 || /[:.;]/.test(cleaned) || /\d/.test(cleaned)) return "";
    if (!/^[A-Z][A-Za-z /&()'-]+$/.test(cleaned)) return "";
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length > 5) return "";
    return cleaned;
  }

  function appendNarrativeLine(sections, currentSection, currentSubsection, line) {
    const section = currentSection || "General Information";
    sections[section] = sections[section] || {};
    const target = currentSubsection ? (sections[section][currentSubsection] = sections[section][currentSubsection] || {}) : sections[section];
    const key = section === "Short Description" ? "Description" : section === "Additional Remarks" ? "Remarks" : "Details";
    target[key] = target[key] ? `${target[key]}\n${cleanLine(line)}` : cleanLine(line);
  }

  function firstFieldStarting(fields, prefix) {
    const key = Object.keys(fields).find((field) => field.startsWith(prefix));
    return key ? fields[key] : "";
  }

  function templateKind(title) {
    const lowerTitle = String(title || "").toLowerCase();
    if (/\b(ship|naval|submarine|frigate|destroyer|carrier)\b/.test(lowerTitle)) return "Ship";
    if (/\b(aircraft|plane|fighter|bomber|helicopter|uav|drone)\b/.test(lowerTitle)) return "Aircraft";
    if (/\b(tank|afv|armor|armour|vehicle)\b/.test(lowerTitle)) return "Vehicle";
    if (/\b(missile|rocket|sam|atgm|srbm|ballistic)\b/.test(lowerTitle)) return "Missile";
    if (/\b(rifle|pistol|smg|machine gun|carbine|shotgun|launcher|small arm)\b/.test(lowerTitle)) return "Small Arm";
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
      if (isDiscordNoise(trimmed)) return;
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

      const plainHeading = plainTemplateHeading(trimmed);
      if (plainHeading) {
        if (plainHeading.type === "section") {
          currentSection = plainHeading.label;
          currentSubsection = "";
          sections[currentSection] = sections[currentSection] || {};
        } else {
          sections[currentSection] = sections[currentSection] || {};
          currentSubsection = plainHeading.label;
          sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {};
        }
        return;
      }

      const looseSubsection = currentSubsection ? "" : standaloneSubsection(trimmed, currentSection);
      if (looseSubsection) {
        sections[currentSection] = sections[currentSection] || {};
        currentSubsection = looseSubsection;
        sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {};
        return;
      }

      const field = parseFieldLine(trimmed);
      if (!field) {
        if (!title && currentSection === "General Information" && !currentSubsection) {
          title = cleanHeading(trimmed);
          return;
        }
        appendNarrativeLine(sections, currentSection, currentSubsection, trimmed);
        return;
      }
      sections[currentSection] = sections[currentSection] || {};
      if (!field.value && currentSection !== "General Information") {
        currentSubsection = field.label;
        sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {};
        return;
      }
      const target = currentSubsection ? (sections[currentSection][currentSubsection] = sections[currentSection][currentSubsection] || {}) : sections[currentSection];
      target[field.label] = field.value;
      fields[field.label.toLowerCase()] = field.value;
    });

    const name = fields.name || templateDefaultName(title, options);
    const type = fields.type || "";
    const subcategory = fields.designation || fields.class || "";
    const categoryText = `${title} ${name} ${type} ${subcategory}`;
    const category = options.category || templateCategory(categoryText);
    const introduced = firstFieldStarting(fields, "year introduced");
    const hasIntroducedYear = introduced && !/^tbd$/i.test(introduced);
    const shortDescription = sections["Short Description"]?.Description || fields.description || "";
    return {
      id: "",
      name,
      category,
      subcategory,
      role: type || subcategory || templateKind(`${title} ${type} ${subcategory}`),
      status: hasIntroducedYear ? "Fielded" : "Concept",
      origin: fields["country of origin"] || "Detailed Template",
      notes: shortDescription || title || "Detailed template import",
      detailLevel: "template",
      templateName: title || options.templateName || "Detailed Template",
      sections,
      rawTemplate: String(text || ""),
      updatedAt: ""
    };
  }

  function templateCategory(title) {
    const lowerTitle = String(title || "").toLowerCase();
    if (/\b(ship|naval|submarine|frigate|destroyer|carrier)\b/.test(lowerTitle)) return "Naval";
    if (/\b(tank|afv|armor|armour|vehicle)\b/.test(lowerTitle)) return "Armored Vehicles";
    if (/\b(aircraft|plane|fighter|bomber|helicopter|uav|drone)\b/.test(lowerTitle)) return "Aeroplanes";
    if (/\b(missile|rocket|sam|atgm|srbm|ballistic)\b/.test(lowerTitle)) return "Missiles";
    if (/\b(rifle|pistol|smg|machine gun|carbine|shotgun|launcher|small arm)\b/.test(lowerTitle)) return "Small Arms";
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
