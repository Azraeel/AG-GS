(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const DEFAULT_MAP_VIEWBOX = { width: 100, height: 100 };

  const SEED_GEOGRAPHY = {
    solara: { x: 8, y: 88, region: "southwest_ocean", coastal: true, portStrength: 9, routeAccess: ["deep_ocean", "ocean"] },
    empire_of_khalindar: { x: 20, y: 84, region: "southwest", coastal: true, portStrength: 7, routeAccess: ["ocean"] },
    people_s_federation_of_xanaqu: { x: 39, y: 75, region: "south_central", coastal: true, portStrength: 8, routeAccess: ["ocean"] },
    imperial_dynasty_of_saochai: { x: 34, y: 54, region: "central_west", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
    okudan_empire: { x: 28, y: 28, region: "northwest", coastal: true, portStrength: 5, routeAccess: ["ocean", "land"] },
    republic_of_aurendale: { x: 54, y: 36, region: "central", coastal: true, portStrength: 9, routeAccess: ["ocean", "land"], tradeHubWeight: 1.45 },
    kolkenlennan_empire: { x: 59, y: 39, region: "central", coastal: true, portStrength: 6, routeAccess: ["ocean", "land"] },
    orinian_empire: { x: 73, y: 43, region: "east_central", coastal: true, portStrength: 7, routeAccess: ["ocean", "land"] },
    baathist_republic_of_volgastan: { x: 82, y: 58, region: "southeast", coastal: true, portStrength: 4, routeAccess: ["ocean", "land"] },
    karkalnadag_kingdom: { x: 86, y: 24, region: "northeast", coastal: false, landlocked: true, portStrength: 0, routeAccess: ["land"] },
    khalari_emirates: { x: 91, y: 50, region: "east_coast", coastal: true, portStrength: 6, routeAccess: ["ocean"] },
    republic_of_pestera: { x: 97, y: 28, region: "far_east", coastal: true, portStrength: 5, routeAccess: ["ocean"] },
    astoria: { x: 4, y: 43, region: "far_west", coastal: true, portStrength: 5, routeAccess: ["ocean"] },
    imperial_rhovland: { x: 11, y: 57, region: "far_west", coastal: true, portStrength: 5, routeAccess: ["ocean", "land"] },
    federation_of_vinterholm: { x: 12, y: 48, region: "far_west", coastal: true, portStrength: 4, routeAccess: ["ocean", "land"] },
    theorin_commonwealth: { x: 8, y: 28, region: "far_west", coastal: true, portStrength: 6, routeAccess: ["ocean"] },
    vesperan_federation: { x: 99, y: 76, region: "far_east", coastal: true, portStrength: 5, routeAccess: ["ocean"] }
  };

  const SVG_LABEL_BINDINGS = {
    astoria: "svg_label_207",
    baathist_republic_of_volgastan: "svg_label_307",
    baechong_democratic_republic: "svg_label_2113",
    benera_navine: "svg_label_359",
    bingtau_kingdom: "svg_label_287",
    butonian_state: "svg_label_188",
    crovian_national_union: "svg_label_1107",
    democratic_republic_of_suzuharu: "svg_label_2786",
    dracoist_malonia: "svg_label_185",
    duchy_of_hoogeveen: "svg_label_1095",
    duchy_of_ledostrov: "svg_label_1007",
    empire_of_hanazuki: "svg_label_501",
    empire_of_hyeosu: "svg_label_433",
    empire_of_khalindar: "svg_label_418",
    federated_syndicates_of_veszprem: "svg_label_478",
    federation_of_vinterholm: "svg_label_511",
    fengu_people_s_federation: "svg_label_1141",
    fuji_shogunate: "svg_label_2673",
    hyelean_republic: "svg_label_214",
    imperial_dynasty_of_saochai: "svg_label_830",
    imperial_rhovland: "svg_label_468",
    imperial_suomi: "svg_label_2020",
    judas_democratic_republic: "svg_label_475",
    karkalnadag_kingdom: "svg_label_242",
    khalari_emirates: "svg_label_505",
    kingdom_of_lunaria: "svg_label_476",
    kolkenlennan_empire: "svg_label_431",
    mumoon_hamed_sultunate: "svg_label_504",
    okudan_empire: "svg_label_227",
    orinian_empire: "svg_label_490",
    pdr_of_hoshigoru: "svg_label_1006",
    people_s_federation_of_xanaqu: "svg_label_2692",
    people_s_republic_of_mariposa: "svg_label_1097",
    republic_of_aurendale: "svg_label_1487",
    republic_of_belcanto: "svg_label_954",
    republic_of_borealyan: "svg_label_1858",
    republic_of_calblanca: "svg_label_228",
    republic_of_perzam: "svg_label_225",
    republic_of_pestera: "svg_label_440",
    republic_of_shangri_la: "svg_label_1720",
    serranova_military_junta: "svg_label_455",
    solara: "svg_label_294",
    templar_of_saxonia: "svg_label_714",
    theorin_commonwealth: "svg_label_2035",
    tsardom_of_nogoyev: "svg_label_1426",
    vesperan_federation: "svg_label_1130",
    vinraarabeise_people_s_republic: "svg_label_193",
    vorkutangrad: "svg_label_278",
    xaojin_heavenly_kingdom: "svg_label_204",
    zhensanovian_commonwealth: "svg_label_464"
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shapeManifest() {
    const manifest = root.AGGS_TRADE_MAP_SHAPES;
    return manifest && manifest.viewBox && Array.isArray(manifest.territories) ? manifest : null;
  }

  function formatMapNumber(value) {
    const rounded = Number(value.toFixed(6));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(6);
  }

  function mapConfig() {
    const manifest = shapeManifest();
    const viewBox = manifest?.viewBox || DEFAULT_MAP_VIEWBOX;
    const width = Number(viewBox.width) || DEFAULT_MAP_VIEWBOX.width;
    const height = Number(viewBox.height) || DEFAULT_MAP_VIEWBOX.height;
    return {
      hasRealSvg: Boolean(manifest),
      assetPath: manifest?.assetPath || "assets/world-map.png",
      width,
      height,
      viewBox: `0 0 ${formatMapNumber(width)} ${formatMapNumber(height)}`,
      sourceTerritoryCount: manifest?.territories?.length || 0
    };
  }

  function sourceTerritories() {
    return shapeManifest()?.territories || [];
  }

  function sourceLabels() {
    return shapeManifest()?.labels || [];
  }

  function sourceLabelMap() {
    return Object.fromEntries(sourceLabels().map((label) => [label.id, label]));
  }

  function slugHash(text) {
    let hash = 0;
    for (const char of String(text || "")) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
    return hash;
  }

  function fallbackProfile(nation, index, total) {
    const hash = slugHash(nation.id || nation.name || index);
    const columns = Math.max(8, Math.ceil(Math.sqrt(Math.max(total, 1)) * 1.35));
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = clamp(8 + col * (84 / Math.max(columns - 1, 1)) + ((row % 2) * 2.4) + ((hash % 7) - 3) * 0.35, 4, 96);
    const y = clamp(16 + row * 12 + ((hash % 11) - 5) * 0.45, 10, 90);
    const coastal = x <= 12 || x >= 88 || y >= 78 || y <= 18;
    const regionColumn = x < 28 ? "west" : x < 58 ? "central" : x < 82 ? "east" : "far_east";
    const regionBand = y < 34 ? "north" : y < 66 ? "mid" : "south";
    return {
      x,
      y,
      region: `${regionBand}_${regionColumn}`,
      coastal,
      landlocked: !coastal,
      portStrength: coastal ? clamp(3 + (hash % 5), 3, 8) : 0,
      routeAccess: coastal ? ["ocean", "land"] : ["land"],
      tradeHubWeight: 1
    };
  }

  function profileForNation(nation, index, total) {
    return { ...fallbackProfile(nation, index, total), ...(SEED_GEOGRAPHY[nation.id] || {}) };
  }

  function profileForViewBox(profile) {
    const config = mapConfig();
    return {
      ...profile,
      x: clamp((profile.x / 100) * config.width, 0, config.width),
      y: clamp((profile.y / 100) * config.height, 0, config.height)
    };
  }

  function roundedRectPath(cx, cy, width, height) {
    const config = mapConfig();
    const rx = Math.min(width / 2, 0.9);
    const ry = Math.min(height / 2, 0.65);
    const left = clamp(cx - width / 2, 0, config.width);
    const right = clamp(cx + width / 2, 0, config.width);
    const top = clamp(cy - height / 2, 0, config.height);
    const bottom = clamp(cy + height / 2, 0, config.height);
    return [
      `M ${left + rx} ${top}`,
      `L ${right - rx} ${top}`,
      `Q ${right} ${top} ${right} ${top + ry}`,
      `L ${right} ${bottom - ry}`,
      `Q ${right} ${bottom} ${right - rx} ${bottom}`,
      `L ${left + rx} ${bottom}`,
      `Q ${left} ${bottom} ${left} ${bottom - ry}`,
      `L ${left} ${top + ry}`,
      `Q ${left} ${top} ${left + rx} ${top}`,
      "Z"
    ].join(" ");
  }

  function labelTargetForNation(nation) {
    const labelId = SVG_LABEL_BINDINGS[nation.id];
    const label = labelId ? sourceLabelMap()[labelId] : null;
    if (!label?.bbox || !label?.centroid) return null;
    const sourceBounds = {
      x: Number(label.bbox.x) || 0,
      y: Number(label.bbox.y) || 0,
      width: Number(label.bbox.width) || 0,
      height: Number(label.bbox.height) || 0
    };
    const x = clamp(Number(label.centroid.x) || sourceBounds.x + sourceBounds.width / 2, 0, mapConfig().width);
    const y = clamp(Number(label.centroid.y) || sourceBounds.y + sourceBounds.height / 2, 0, mapConfig().height);
    const width = clamp(sourceBounds.width + 1.2, 2.4, 12);
    const height = clamp(sourceBounds.height + 0.85, 1.4, 5);
    return {
      x,
      y,
      path: roundedRectPath(x, y, width, height),
      anchorSource: "svg-label",
      labelClusterId: label.id,
      labelPathIndices: [...(label.sourcePathIndices || [])],
      labelLineCount: label.lines || 1,
      sourceBounds
    };
  }

  function visualTargetForNation(nation, geographyProfile, index) {
    const config = mapConfig();
    const labelTarget = config.hasRealSvg ? labelTargetForNation(nation) : null;
    if (labelTarget) return labelTarget;
    const visualProfile = profileForViewBox(geographyProfile);
    return {
      x: visualProfile.x,
      y: visualProfile.y,
      path: territoryPath(visualProfile, index),
      anchorSource: config.hasRealSvg ? "generated-fallback" : "generated",
      labelClusterId: "",
      labelPathIndices: [],
      sourceBounds: null
    };
  }

  function territoryPath(profile, index) {
    const rx = 3.4 + (index % 4) * 0.22;
    const ry = 2.7 + (index % 5) * 0.2;
    const skew = ((index % 3) - 1) * 0.36;
    const points = [
      [profile.x - rx, profile.y - ry * 0.2],
      [profile.x - rx * 0.45, profile.y - ry],
      [profile.x + rx * 0.55, profile.y - ry * 0.86],
      [profile.x + rx, profile.y + skew],
      [profile.x + rx * 0.35, profile.y + ry],
      [profile.x - rx * 0.62, profile.y + ry * 0.78]
    ];
    return points
      .map(([x, y], pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(" ") + " Z";
  }

  function territoriesForNations(nations = [], selectedId = "") {
    return nations.map((nation, index) => {
      const geographyProfile = profileForNation(nation, index, nations.length);
      const visualTarget = visualTargetForNation(nation, geographyProfile, index);
      return {
        id: `territory_${nation.id}`,
        nationId: nation.id,
        name: nation.name,
        color: nation.color || "#5f7fa8",
        selected: nation.id === selectedId,
        path: visualTarget.path,
        centroid: { x: visualTarget.x, y: visualTarget.y },
        geography: geographyProfile,
        anchorSource: visualTarget.anchorSource,
        labelClusterId: visualTarget.labelClusterId || "",
        labelPathIndices: visualTarget.labelPathIndices || [],
        labelLineCount: visualTarget.labelLineCount || 0,
        sourceBounds: visualTarget.sourceBounds || null
      };
    });
  }

  function routePath(from, to, bend = 0.18) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const midX = from.x + dx * 0.5;
    const midY = from.y + dy * 0.5;
    const curveX = midX - dy * bend;
    const curveY = midY + dx * bend;
    return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${curveX.toFixed(2)} ${curveY.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }

  function routesForRows(selectedId, rows = [], territories = [], maxRoutes = 12) {
    const byId = Object.fromEntries(territories.map((territory) => [territory.nationId, territory]));
    const selected = byId[selectedId];
    if (!selected) return [];
    return rows
      .filter((row) => byId[row.partner?.id])
      .slice()
      .sort((left, right) => (right.importFlow + right.exportFlow) - (left.importFlow + left.exportFlow))
      .slice(0, maxRoutes)
      .map((row, index) => {
        const partner = byId[row.partner.id];
        const importHeavy = row.importFlow >= row.exportFlow;
        const lane = importHeavy ? row.importLane : row.exportLane;
        return {
          partnerId: row.partner.id,
          partnerName: row.partner.name,
          importFlow: row.importFlow,
          exportFlow: row.exportFlow,
          totalFlow: row.importFlow + row.exportFlow,
          routeType: lane?.routeType || "direct",
          routeDistance: lane?.routeDistance,
          path: routePath(selected.centroid, partner.centroid, 0.12 + (index % 4) * 0.035)
        };
      });
  }

  function ensureGeography(data) {
    if (!data || !Array.isArray(data.nations)) return {};
    data.tradeNetwork = data.tradeNetwork && typeof data.tradeNetwork === "object" && !Array.isArray(data.tradeNetwork)
      ? data.tradeNetwork
      : {};
    data.tradeNetwork.geography = data.tradeNetwork.geography && typeof data.tradeNetwork.geography === "object" && !Array.isArray(data.tradeNetwork.geography)
      ? data.tradeNetwork.geography
      : {};
    data.tradeNetwork.geography.nations = data.tradeNetwork.geography.nations && typeof data.tradeNetwork.geography.nations === "object" && !Array.isArray(data.tradeNetwork.geography.nations)
      ? data.tradeNetwork.geography.nations
      : {};
    const territories = territoriesForNations(data.nations);
    for (const territory of territories) {
      data.tradeNetwork.geography.nations[territory.nationId] = {
        ...territory.geography,
        ...(data.tradeNetwork.geography.nations[territory.nationId] || {})
      };
    }
    return data.tradeNetwork.geography.nations;
  }

  root.AGGS_TRADE_MAP = {
    assetPath: "assets/ag-political-map.svg",
    mapConfig,
    sourceTerritories,
    sourceLabels,
    territoriesForNations,
    routesForRows,
    ensureGeography
  };
})();
