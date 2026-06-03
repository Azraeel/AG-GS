(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const DEFAULT_MAP_VIEWBOX = { width: 100, height: 100 };
  const WORLD_SURFACE_AREA_SQ_MI = 236_400_000;
  const EARTH_SURFACE_AREA_SQ_MI = 197_000_000;
  const KHALINDAR_CALIBRATION_AREA_SQ_MI = 7_260_000;

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
    baathist_republic_of_volgastan: "svg_label_307",
    benera_navine: "svg_label_359",
    bingtau_kingdom: "svg_label_287",
    crovian_national_union: "svg_label_1107",
    democratic_republic_of_suzuharu: "svg_label_2786",
    dracoist_malonia: "svg_label_185",
    duchy_of_hoogeveen: "svg_label_1095",
    duchy_of_ledostrov: "svg_label_1007",
    empire_of_hyeosu: "svg_label_433",
    empire_of_khalindar: "svg_label_418",
    federated_syndicates_of_veszprem: "svg_label_478",
    federation_of_vinterholm: "svg_label_511",
    fengu_people_s_federation: "svg_label_1141",
    fuji_shogunate: "svg_label_2673",
    hyelean_republic: "svg_label_214",
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
    zhensanovian_commonwealth: "svg_label_464"
  };

  const SVG_TERRITORY_BINDINGS = {
    astoria: { sourceId: "svg_path_15" },
    baathist_republic_of_volgastan: { x: 84.4, y: 39.2, pathX: 84.4, pathY: 39.2, width: 13.4, height: 8.4, useRoundedBox: true },
    baechong_democratic_republic: { sourceId: "svg_path_62" },
    benera_navine: { sourceId: "svg_path_88" },
    bingtau_kingdom: { sourceId: "svg_path_158", width: 2.6, height: 2.2, useRoundedBox: true },
    butonian_state: { sourceId: "svg_path_43" },
    crovian_national_union: { sourceId: "svg_path_46" },
    democratic_republic_of_suzuharu: { sourceId: "svg_path_28" },
    dracoist_malonia: { sourceId: "svg_path_38" },
    duchy_of_hoogeveen: { sourceId: "svg_path_86" },
    duchy_of_ledostrov: { sourceId: "svg_path_56" },
    empire_of_hanazuki: { sourceId: "svg_path_40" },
    empire_of_hyeosu: { sourceId: "svg_path_25" },
    empire_of_khalindar: { sourceId: "svg_path_6" },
    federated_syndicates_of_veszprem: { x: 24.3, y: 37.8, pathX: 24.3, pathY: 37.8, width: 6.4, height: 5.4, useRoundedBox: true },
    federation_of_vinterholm: { sourceId: "svg_path_29" },
    fengu_people_s_federation: { sourceId: "svg_path_109" },
    fuji_shogunate: { sourceId: "svg_path_134", width: 2.6, height: 1.8, useRoundedBox: true },
    hyelean_republic: { sourceId: "svg_path_163", width: 2.6, height: 2.2, useRoundedBox: true },
    imperial_dynasty_of_saochai: { sourceId: "svg_path_11" },
    imperial_rhovland: { sourceId: "svg_path_16" },
    imperial_suomi: { sourceId: "svg_path_42" },
    judas_democratic_republic: { sourceId: "svg_path_37" },
    karkalnadag_kingdom: { sourceId: "svg_path_9" },
    khalari_emirates: { sourceId: "svg_path_66" },
    kingdom_of_lunaria: { sourceId: "svg_path_27" },
    kolkenlennan_empire: { sourceId: "svg_path_45" },
    mumoon_hamed_sultunate: { sourceId: "svg_path_17" },
    okudan_empire: { sourceId: "svg_path_8" },
    orinian_empire: { sourceId: "svg_path_7" },
    pdr_of_hoshigoru: { sourceId: "svg_path_13" },
    people_s_federation_of_xanaqu: { sourceId: "svg_path_14" },
    people_s_republic_of_mariposa: { sourceId: "svg_path_23" },
    republic_of_aurendale: { sourceId: "svg_path_92" },
    republic_of_belcanto: { x: 53.0, y: 9.0, pathX: 53.0, pathY: 9.0, width: 4.6, height: 2.2, useRoundedBox: true },
    republic_of_borealyan: { sourceId: "svg_path_67" },
    republic_of_calblanca: { sourceId: "svg_path_75" },
    republic_of_perzam: { sourceId: "svg_path_53" },
    republic_of_pestera: { sourceId: "svg_path_26" },
    republic_of_shangri_la: { sourceId: "svg_path_93" },
    serranova_military_junta: { sourceId: "svg_path_36" },
    solara: { sourceId: "svg_path_19" },
    templar_of_saxonia: { x: 48.6, y: 13.4, pathX: 48.6, pathY: 13.4, width: 5.1, height: 2.6, useRoundedBox: true },
    theorin_commonwealth: { sourceId: "svg_path_24" },
    tsardom_of_nogoyev: { sourceId: "svg_path_33" },
    vesperan_federation: { sourceId: "svg_path_35" },
    vinraarabeise_people_s_republic: { sourceId: "svg_path_100" },
    vorkutangrad: { sourceId: "svg_path_12" },
    xaojin_heavenly_kingdom: { x: 34.1, y: 40.9, pathX: 34.1, pathY: 40.3, width: 4.2, height: 5.8, useRoundedBox: true },
    zhensanovian_commonwealth: { x: 37.2, y: 7.9, pathX: 37.2, pathY: 7.9, width: 5.2, height: 2.6, useRoundedBox: true }
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
    const areaPerViewBoxUnitSqMi = WORLD_SURFACE_AREA_SQ_MI / Math.max(1, width * height);
    const meanRadiusMi = Math.sqrt(WORLD_SURFACE_AREA_SQ_MI / (4 * Math.PI));
    return {
      hasRealSvg: Boolean(manifest),
      assetPath: manifest?.assetPath || "assets/world-map.png",
      width,
      height,
      viewBox: `0 0 ${formatMapNumber(width)} ${formatMapNumber(height)}`,
      sourceTerritoryCount: manifest?.territories?.length || 0,
      surfaceAreaSqMi: WORLD_SURFACE_AREA_SQ_MI,
      earthSurfaceScale: WORLD_SURFACE_AREA_SQ_MI / EARTH_SURFACE_AREA_SQ_MI,
      meanRadiusMi,
      equatorialCircumferenceMi: 2 * Math.PI * meanRadiusMi,
      areaPerViewBoxUnitSqMi,
      distancePerViewBoxUnitMi: Math.sqrt(areaPerViewBoxUnitSqMi)
    };
  }

  function sourceTerritories() {
    return shapeManifest()?.territories || [];
  }

  function sourceTerritoryMap() {
    return Object.fromEntries(sourceTerritories().map((territory) => [territory.id, territory]));
  }

  function sourceLabels() {
    return shapeManifest()?.labels || [];
  }

  function tradeZones() {
    const manifest = root.AGGS_TRADE_ZONES;
    return manifest && Array.isArray(manifest.zones) ? manifest : null;
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

  function roundGeo(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function sourceAreaUnitsForBounds(bounds) {
    if (!bounds) return 0;
    return Math.max(0, Number(bounds.width) || 0) * Math.max(0, Number(bounds.height) || 0);
  }

  function territoryAreaUnits(territory) {
    return sourceAreaUnitsForBounds(territory?.bbox);
  }

  function areaSqMiPerUnit() {
    const khalindarBinding = SVG_TERRITORY_BINDINGS.empire_of_khalindar;
    const khalindarTerritory = khalindarBinding?.sourceId ? sourceTerritoryMap()[khalindarBinding.sourceId] : null;
    const khalindarUnits = territoryAreaUnits(khalindarTerritory);
    return khalindarUnits > 0
      ? KHALINDAR_CALIBRATION_AREA_SQ_MI / khalindarUnits
      : WORLD_SURFACE_AREA_SQ_MI / Math.max(1, DEFAULT_MAP_VIEWBOX.width * DEFAULT_MAP_VIEWBOX.height);
  }

  function areaSummaryForUnits(areaUnits) {
    const sqMi = areaUnits > 0 ? areaUnits * areaSqMiPerUnit() : 0;
    return {
      areaUnits: roundGeo(areaUnits, 4),
      areaSqMi: Math.round(sqMi),
      areaShare: roundGeo((sqMi / WORLD_SURFACE_AREA_SQ_MI) * 100, 3)
    };
  }

  function titleLabel(value) {
    return String(value || "")
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function positionFromVisualTarget(visualTarget) {
    const config = mapConfig();
    return {
      x: roundGeo(clamp((visualTarget.x / Math.max(config.width, 1)) * 100, 0, 100), 2),
      y: roundGeo(clamp((visualTarget.y / Math.max(config.height, 1)) * 100, 0, 100), 2)
    };
  }

  function coordinateForPosition(position, label = "Capital") {
    const longitude = roundGeo(position.x * 3.6 - 180, 2);
    const latitude = roundGeo(90 - position.y * 1.8, 2);
    return {
      label,
      x: position.x,
      y: position.y,
      latitude,
      longitude
    };
  }

  function regionForPosition(position) {
    const column = position.x < 18
      ? "far_west"
      : position.x < 38
        ? "west"
        : position.x < 62
          ? "central"
          : position.x < 82
            ? "east"
            : "far_east";
    const band = position.y < 24
      ? "north"
      : position.y < 48
        ? "upper"
        : position.y < 72
          ? "lower"
          : "south";
    const continent = column === "far_west"
      ? "Western Reach"
      : column === "west"
        ? "Western Mainland"
        : column === "central"
          ? "Central Belt"
          : column === "east"
            ? "Eastern Mainland"
            : "Eastern Reach";
    return {
      region: `${band}_${column}`,
      regionLabel: titleLabel(`${band}_${column}`),
      continent
    };
  }

  function inferCoast(position, baseProfile = {}) {
    const routeAccess = Array.isArray(baseProfile.routeAccess) ? baseProfile.routeAccess : [];
    const seededCoastal = baseProfile.coastal === true || Number(baseProfile.portStrength) > 0 || routeAccess.some((route) => String(route).includes("ocean") || String(route).includes("port"));
    const edgeCoastal = position.x <= 12 || position.x >= 88 || position.y <= 16 || position.y >= 82;
    const coastal = seededCoastal || edgeCoastal;
    const west = position.x <= 18;
    const east = position.x >= 82;
    const south = position.y >= 72;
    const north = position.y <= 24;
    const oceanZone = !coastal
      ? ""
      : west
        ? "Western Ocean"
        : east
          ? "Eastern Ocean"
          : south
            ? "Southern Ocean"
            : north
              ? "Northern Sea"
              : "Central Sea";
    const coastline = !coastal
      ? "Landlocked"
      : edgeCoastal
        ? "Open Coast"
        : "Connected Coast";
    const portStrength = coastal ? clamp(Number(baseProfile.portStrength) || (edgeCoastal ? 5 : 3), 1, 10) : 0;
    return {
      coastal,
      landlocked: !coastal,
      coastline,
      oceanZone,
      portStrength,
      routeAccess: coastal ? [...new Set([...routeAccess, "ocean", "land"])] : [...new Set([...routeAccess, "land"])]
    };
  }

  function portForPosition(position, coast) {
    if (!coast.coastal) return null;
    const portPosition = { ...position };
    if (coast.oceanZone === "Western Ocean") portPosition.x = clamp(portPosition.x - 2.4, 0, 100);
    if (coast.oceanZone === "Eastern Ocean") portPosition.x = clamp(portPosition.x + 2.4, 0, 100);
    if (coast.oceanZone === "Southern Ocean") portPosition.y = clamp(portPosition.y + 2.4, 0, 100);
    if (coast.oceanZone === "Northern Sea") portPosition.y = clamp(portPosition.y - 2.4, 0, 100);
    if (coast.oceanZone === "Central Sea") portPosition.y = clamp(portPosition.y + 1.6, 0, 100);
    return coordinateForPosition({
      x: roundGeo(portPosition.x, 2),
      y: roundGeo(portPosition.y, 2)
    }, "Primary Port");
  }

  function enrichGeography(baseProfile, visualTarget, nation, index) {
    const position = positionFromVisualTarget(visualTarget);
    const region = regionForPosition(position);
    const coast = inferCoast(position, baseProfile);
    const capital = coordinateForPosition(position, "Capital");
    const primaryPort = portForPosition(position, coast);
    const area = areaSummaryForUnits(Number(visualTarget.sourceAreaUnits) || sourceAreaUnitsForBounds(visualTarget.sourceBounds));
    return {
      ...baseProfile,
      x: position.x,
      y: position.y,
      areaUnits: area.areaUnits,
      areaSqMi: area.areaSqMi,
      areaShare: area.areaShare,
      legacyRegion: baseProfile.region || "",
      region: region.region,
      regionLabel: region.regionLabel,
      continent: region.continent,
      coastal: coast.coastal,
      landlocked: coast.landlocked,
      coastline: coast.coastline,
      oceanZone: coast.oceanZone,
      portStrength: coast.portStrength,
      routeAccess: coast.routeAccess,
      capital,
      primaryPort,
      mapPosition: {
        x: position.x,
        y: position.y,
        source: visualTarget.anchorSource || "generated"
      },
      neighborIds: [],
      borderCandidates: [],
      geographySource: "svg-anchor-v1",
      geographyIndex: index,
      nationName: nation.name
    };
  }

  function distanceBetweenGeography(left, right) {
    const dx = Number(left.x) - Number(right.x);
    const dy = Number(left.y) - Number(right.y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function applyNeighborCandidates(territories) {
    const geographyById = Object.fromEntries(territories.map((territory) => [territory.nationId, territory.geography]));
    for (const territory of territories) {
      const candidates = territories
        .filter((candidate) => candidate.nationId !== territory.nationId)
        .map((candidate) => {
          const distance = distanceBetweenGeography(territory.geography, candidate.geography);
          const sameRegion = territory.geography.region === candidate.geography.region;
          const sameContinent = territory.geography.continent === candidate.geography.continent;
          const borderScore = roundGeo(clamp(100 - distance * 3.4 + (sameRegion ? 18 : 0) + (sameContinent ? 8 : 0), 0, 100), 1);
          return {
            id: candidate.nationId,
            name: candidate.name,
            distance: roundGeo(distance, 2),
            sameRegion,
            sameContinent,
            borderScore
          };
        })
        .sort((left, right) => right.borderScore - left.borderScore || left.distance - right.distance)
        .slice(0, 5);
      geographyById[territory.nationId].neighborIds = candidates.slice(0, 4).map((candidate) => candidate.id);
      geographyById[territory.nationId].borderCandidates = candidates;
    }
    return geographyById;
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

  function territoryTargetForNation(nation) {
    const binding = SVG_TERRITORY_BINDINGS[nation.id];
    const territory = binding?.sourceId ? sourceTerritoryMap()[binding.sourceId] : null;
    if (!binding || (binding.sourceId && !territory?.bbox && !binding.useRoundedBox)) return null;
    const fallbackX = Number(binding.pathX ?? binding.x) || 0;
    const fallbackY = Number(binding.pathY ?? binding.y) || 0;
    const fallbackWidth = Number(binding.width) || 3.2;
    const fallbackHeight = Number(binding.height) || 2.4;
    const sourceBounds = territory?.bbox
      ? {
          x: Number(territory.bbox.x) || 0,
          y: Number(territory.bbox.y) || 0,
          width: Number(territory.bbox.width) || 0,
          height: Number(territory.bbox.height) || 0
        }
      : {
          x: clamp(fallbackX - fallbackWidth / 2, 0, mapConfig().width),
          y: clamp(fallbackY - fallbackHeight / 2, 0, mapConfig().height),
          width: fallbackWidth,
          height: fallbackHeight
        };
    const x = clamp(Number(binding.x) || territory?.centroid?.x || sourceBounds.x + sourceBounds.width / 2, 0, mapConfig().width);
    const y = clamp(Number(binding.y) || territory?.centroid?.y || sourceBounds.y + sourceBounds.height / 2, 0, mapConfig().height);
    const pathX = clamp(Number(binding.pathX) || sourceBounds.x + sourceBounds.width / 2, 0, mapConfig().width);
    const pathY = clamp(Number(binding.pathY) || sourceBounds.y + sourceBounds.height / 2, 0, mapConfig().height);
    const width = clamp(Number(binding.width) || sourceBounds.width, 2.6, territory ? 10 : 18);
    const height = clamp(Number(binding.height) || sourceBounds.height, 1.8, territory ? 10 : 12);
    const rounded = binding.useRoundedBox || !territory?.path;
    return {
      x,
      y,
      path: rounded ? roundedRectPath(pathX, pathY, width, height) : territory.path,
      transform: rounded ? "" : territory.transform,
      anchorSource: territory ? "svg-territory" : "reviewed-map-target",
      sourceTerritoryId: territory?.id || "",
      sourceTerritoryPathIndex: territory?.sourcePathIndex,
      sourceAreaUnits: territoryAreaUnits(territory) || sourceAreaUnitsForBounds(sourceBounds),
      labelClusterId: "",
      labelPathIndices: [],
      labelLineCount: 0,
      sourceBounds
    };
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
      transform: "",
      anchorSource: "svg-label",
      labelClusterId: label.id,
      labelPathIndices: [...(label.sourcePathIndices || [])],
      labelLineCount: label.lines || 1,
      sourceBounds
    };
  }

  function visualTargetForNation(nation, geographyProfile, index) {
    const config = mapConfig();
    const territoryTarget = config.hasRealSvg ? territoryTargetForNation(nation) : null;
    if (territoryTarget) return territoryTarget;
    const labelTarget = config.hasRealSvg ? labelTargetForNation(nation) : null;
    if (labelTarget) return labelTarget;
    const visualProfile = profileForViewBox(geographyProfile);
    return {
      x: visualProfile.x,
      y: visualProfile.y,
      path: territoryPath(visualProfile, index),
      transform: "",
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
    const territories = nations.map((nation, index) => {
      const geographyProfile = profileForNation(nation, index, nations.length);
      const visualTarget = visualTargetForNation(nation, geographyProfile, index);
      const geography = enrichGeography(geographyProfile, visualTarget, nation, index);
      return {
        id: `territory_${nation.id}`,
        nationId: nation.id,
        name: nation.name,
        color: nation.color || "#5f7fa8",
        selected: nation.id === selectedId,
        path: visualTarget.path,
        transform: visualTarget.transform || "",
        centroid: { x: visualTarget.x, y: visualTarget.y },
        geography,
        anchorSource: visualTarget.anchorSource,
        labelClusterId: visualTarget.labelClusterId || "",
        labelPathIndices: visualTarget.labelPathIndices || [],
        labelLineCount: visualTarget.labelLineCount || 0,
        sourceTerritoryId: visualTarget.sourceTerritoryId || "",
        sourceTerritoryPathIndex: visualTarget.sourceTerritoryPathIndex ?? null,
        sourceBounds: visualTarget.sourceBounds || null
      };
    });
    applyNeighborCandidates(territories);
    return territories;
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
        ...(data.tradeNetwork.geography.nations[territory.nationId] || {}),
        ...territory.geography
      };
    }
    return data.tradeNetwork.geography.nations;
  }

  root.AGGS_TRADE_MAP = {
    assetPath: "assets/ag-political-map.svg",
    mapConfig,
    sourceTerritories,
    sourceLabels,
    tradeZones,
    territoriesForNations,
    routesForRows,
    ensureGeography
  };
})();
