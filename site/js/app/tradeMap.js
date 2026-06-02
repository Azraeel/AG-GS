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

  const MAP_LABEL_ANCHORS = {
    astoria: { x: 3.2, y: 44.2, width: 4.2, height: 2.3 },
    baathist_republic_of_volgastan: { x: 80.8, y: 43.6, width: 11.8, height: 4.3 },
    baechong_democratic_republic: { x: 48.8, y: 24.9, width: 9.2, height: 3.9 },
    benera_navine: { x: 51.8, y: 33.7, width: 5.8, height: 2.3 },
    bingtau_kingdom: { x: 97.4, y: 55.2, width: 5.8, height: 2.5 },
    butonian_state: { x: 14.8, y: 51.2, width: 5.6, height: 2.4 },
    crovian_national_union: { x: 22.5, y: 44.8, width: 7.8, height: 3.5 },
    democratic_republic_of_suzuharu: { x: 30.7, y: 36.9, width: 9.4, height: 3.9 },
    dracoist_malonia: { x: 92.5, y: 41.9, width: 5.8, height: 2.6 },
    duchy_of_hoogeveen: { x: 11.4, y: 30.9, width: 6.3, height: 2.6 },
    duchy_of_ledostrov: { x: 57.4, y: 15.1, width: 5.9, height: 2.6 },
    empire_of_hanazuki: { x: 37.2, y: 31.2, width: 6.8, height: 2.8 },
    empire_of_hyeosu: { x: 39.9, y: 41.6, width: 6.5, height: 2.8 },
    empire_of_khalindar: { x: 20.0, y: 61.7, width: 8.3, height: 2.9 },
    federated_syndicates_of_veszprem: { x: 24.6, y: 39.5, width: 10.4, height: 4.2 },
    federation_of_vinterholm: { x: 8.4, y: 29.4, width: 7.3, height: 3.2 },
    fengu_people_s_federation: { x: 63.2, y: 17.8, width: 8.4, height: 3.7 },
    fuji_shogunate: { x: 31.6, y: 10.4, width: 5.4, height: 2.2 },
    hyelean_republic: { x: 93.0, y: 47.4, width: 6.0, height: 2.7 },
    imperial_dynasty_of_saochai: { x: 35.2, y: 38.6, width: 8.7, height: 3.8 },
    imperial_rhovland: { x: 10.3, y: 37.0, width: 6.1, height: 2.8 },
    imperial_suomi: { x: 66.4, y: 20.5, width: 5.7, height: 2.4 },
    judas_democratic_republic: { x: 80.2, y: 26.5, width: 8.3, height: 3.5 },
    karkalnadag_kingdom: { x: 84.0, y: 11.4, width: 7.4, height: 3.1 },
    khalari_emirates: { x: 88.0, y: 28.7, width: 5.6, height: 2.4 },
    kingdom_of_lunaria: { x: 71.7, y: 18.7, width: 6.7, height: 2.8 },
    kolkenlennan_empire: { x: 60.6, y: 21.5, width: 7.1, height: 2.8 },
    mumoon_hamed_sultunate: { x: 70.2, y: 34.4, width: 8.4, height: 3.6 },
    okudan_empire: { x: 35.5, y: 17.6, width: 6.5, height: 2.5 },
    orinian_empire: { x: 74.4, y: 31.8, width: 6.0, height: 2.6 },
    pdr_of_hoshigoru: { x: 38.1, y: 25.2, width: 8.0, height: 3.5 },
    people_s_federation_of_xanaqu: { x: 38.5, y: 56.0, width: 9.0, height: 3.5 },
    people_s_republic_of_mariposa: { x: 5.7, y: 41.4, width: 8.4, height: 3.6 },
    republic_of_aurendale: { x: 52.4, y: 43.4, width: 7.1, height: 2.8 },
    republic_of_belcanto: { x: 53.6, y: 11.7, width: 6.7, height: 2.7 },
    republic_of_borealyan: { x: 55.6, y: 19.7, width: 6.9, height: 2.8 },
    republic_of_calblanca: { x: 78.0, y: 37.8, width: 7.4, height: 2.8 },
    republic_of_perzam: { x: 25.2, y: 54.8, width: 6.2, height: 2.6 },
    republic_of_pestera: { x: 96.2, y: 18.2, width: 6.0, height: 2.5 },
    republic_of_shangri_la: { x: 30.2, y: 48.0, width: 7.2, height: 2.8 },
    serranova_military_junta: { x: 54.1, y: 41.6, width: 7.9, height: 3.5 },
    solara: { x: 5.3, y: 60.6, width: 4.4, height: 2.2 },
    templar_of_saxonia: { x: 50.8, y: 12.8, width: 6.8, height: 2.8 },
    theorin_commonwealth: { x: 5.0, y: 16.6, width: 7.0, height: 3.2 },
    tsardom_of_nogoyev: { x: 52.8, y: 19.2, width: 6.6, height: 2.8 },
    vesperan_federation: { x: 96.8, y: 50.5, width: 6.7, height: 2.8 },
    vinraarabeise_people_s_republic: { x: 63.2, y: 43.8, width: 9.2, height: 3.8 },
    vorkutangrad: { x: 74.4, y: 12.1, width: 5.5, height: 2.4 },
    xaojin_heavenly_kingdom: { x: 39.6, y: 52.8, width: 8.2, height: 3.4 },
    zhensanovian_commonwealth: { x: 37.1, y: 8.2, width: 8.0, height: 3.2 }
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

  function visualTargetForNation(nation, geographyProfile, index) {
    const config = mapConfig();
    const anchor = config.hasRealSvg ? MAP_LABEL_ANCHORS[nation.id] : null;
    if (anchor) {
      const width = anchor.width || clamp(String(nation.name || "").length * 0.32, 3.8, 10);
      const height = anchor.height || 2.8;
      return {
        x: clamp(anchor.x, 0, config.width),
        y: clamp(anchor.y, 0, config.height),
        path: roundedRectPath(anchor.x, anchor.y, width, height),
        anchorSource: "map-label"
      };
    }
    const visualProfile = profileForViewBox(geographyProfile);
    return {
      x: visualProfile.x,
      y: visualProfile.y,
      path: territoryPath(visualProfile, index),
      anchorSource: config.hasRealSvg ? "generated-fallback" : "generated"
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
        anchorSource: visualTarget.anchorSource
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
    territoriesForNations,
    routesForRows,
    ensureGeography
  };
})();
