(function () {
  window.AGGS_ENGINE_MODULES = window.AGGS_ENGINE_MODULES || {};

  window.AGGS_ENGINE_MODULES.createTrade = function createTrade(deps) {
    const {
      getPopulation,
      number,
      clamp,
      roundCurrency,
      roundPercent
    } = deps;
    const DEFAULT_MAP_WIDTH = 100;
    const DEFAULT_MAP_HEIGHT = 100;
    const DEFAULT_MAP_DIAGONAL = 141.4213562373;
    const KHALINDAR_CALIBRATION_AREA_SQ_MI = 7_260_000;
    const DEFAULT_SQ_MI_PER_MAP_AREA_UNIT = 18_150;
    const TRANSIT_MODES = ["Open", "Block Land", "Block Maritime", "Block All"];
    const REMOVED_TRADE_STAT_KEYS = [
      "trade" + "Efficiency",
      "trade" + "Power",
      "adjustments",
      "marketSize",
      "productionStrength",
      "fiscalScale",
      "logisticsCapacity",
      "importDemand",
      "exportStrength",
      "tradeOpenness",
      "financialDepth",
      "scaleThroughput",
      "autarkyPressure"
    ];
    const routeNetworkCacheByData = new WeakMap();
    const ROUTE_NETWORK_CACHE_LIMIT = 16;
    const tradePolicyHelpers = window.AGGS_ENGINE_MODULES.createTradePolicyHelpers({
      number,
      clamp,
      transitModes: TRANSIT_MODES
    });
    const {
      cloneTargetedTariffs,
      cloneExportAnchors,
      cloneImportAnchors,
      normalizeLanePolicy,
      normalizeTransitMode,
      cloneLanePolicies,
      cloneTransitPolicies,
      normalizeChokepointControl,
      cloneChokepoints
    } = tradePolicyHelpers;

    function stripRemovedTradeStats(row) {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      for (const key of REMOVED_TRADE_STAT_KEYS) delete row[key];
      return row;
    }

    function calculateTradeForNation(data, id, options = {}) {
      return calculateTradeV4ForNation(data, id, options);
    }

    function tradeTierForFlow(tradeFlow) {
      const flow = number(tradeFlow, 0);
      if (flow >= 7000000) return "Superpower";
      if (flow >= 3000000) return "Major Power";
      if (flow >= 1000000) return "Regional Power";
      if (flow >= 350000) return "Middle Power";
      return "Minor Power";
    }

    function nationIdsForNetwork(data) {
      return (data.nations || [])
        .map((nation) => nation.id)
        .filter((id) => data.national?.[id] && data.trade?.[id]);
    }

    function tradeNetworkState(data) {
      data.tradeNetwork = data.tradeNetwork && typeof data.tradeNetwork === "object" && !Array.isArray(data.tradeNetwork)
        ? data.tradeNetwork
        : {};
      data.tradeNetwork.targetedTariffs = data.tradeNetwork.targetedTariffs && typeof data.tradeNetwork.targetedTariffs === "object" && !Array.isArray(data.tradeNetwork.targetedTariffs)
        ? data.tradeNetwork.targetedTariffs
        : {};
      data.tradeNetwork.exportAnchors = data.tradeNetwork.exportAnchors && typeof data.tradeNetwork.exportAnchors === "object" && !Array.isArray(data.tradeNetwork.exportAnchors)
        ? data.tradeNetwork.exportAnchors
        : {};
      data.tradeNetwork.importAnchors = data.tradeNetwork.importAnchors && typeof data.tradeNetwork.importAnchors === "object" && !Array.isArray(data.tradeNetwork.importAnchors)
        ? data.tradeNetwork.importAnchors
        : {};
      data.tradeNetwork.lanePolicies = data.tradeNetwork.lanePolicies && typeof data.tradeNetwork.lanePolicies === "object" && !Array.isArray(data.tradeNetwork.lanePolicies)
        ? data.tradeNetwork.lanePolicies
        : {};
      data.tradeNetwork.transitPolicies = data.tradeNetwork.transitPolicies && typeof data.tradeNetwork.transitPolicies === "object" && !Array.isArray(data.tradeNetwork.transitPolicies)
        ? data.tradeNetwork.transitPolicies
        : {};
      data.tradeNetwork.chokepoints = data.tradeNetwork.chokepoints && typeof data.tradeNetwork.chokepoints === "object" && !Array.isArray(data.tradeNetwork.chokepoints)
        ? data.tradeNetwork.chokepoints
        : {};
      delete data.tradeNetwork.routeInvestments;
      delete data.tradeNetwork.baseline;
      return data.tradeNetwork;
    }

    function tradeLogisticsProfile(input = {}) {
      const development = clamp(number(input.developmentLevel, 0), 0, 20);
      const shipyards = Math.max(0, number(input.shipyards, 0));
      const civilianFactories = Math.max(0, number(input.civilianFactories, 0));
      const stability = clamp(number(input.governmentalStability, 70), 0, 100);
      const corruption = clamp(number(input.corruption, 0), 0, 100);
      const reliability = clamp(48 + stability * 0.44 - corruption * 0.34 + development * 1.05, 0, 100);
      const maritime = clamp(Math.sqrt(shipyards) * 1.2 + development * 0.22 + (stability - 50) * 0.035 - corruption * 0.022, 0, 10);
      const corridors = clamp(Math.sqrt(civilianFactories) * 0.42 + development * 0.3 + (stability - 50) * 0.04 - corruption * 0.032, 0, 10);
      const overall = clamp((maritime + corridors) * 4.2 + reliability * 0.16, 0, 100);
      return {
        maritime: roundPercent(maritime),
        corridors: roundPercent(corridors),
        reliability: roundPercent(reliability),
        overall: roundPercent(overall),
        shipyards: roundCurrency(shipyards),
        civilianFactories: roundCurrency(civilianFactories),
        development: roundPercent(development),
        stability: roundPercent(stability),
        corruption: roundPercent(corruption)
      };
    }

    function tradeLogisticsFor(data, nationId) {
      return tradeLogisticsProfile(tradeInputForNation(data, nationId));
    }

    function tradeLogisticsDelta(currentInput = {}) {
      const current = tradeLogisticsProfile(currentInput);
      return {
        maritime: roundPercent(current.maritime - 2.8),
        corridors: roundPercent(current.corridors - 3.2),
        reliability: roundPercent((current.reliability - 62) / 6),
        overall: roundPercent((current.overall - 42) / 6)
      };
    }

    function isNeutralTradeLogistics(delta = {}) {
      return Math.abs(number(delta.maritime, 0)) < 0.001
        && Math.abs(number(delta.corridors, 0)) < 0.001
        && Math.abs(number(delta.reliability, 0)) < 0.001
        && Math.abs(number(delta.overall, 0)) < 0.001;
    }

    function tradeLogisticsDeltasForInputs(inputsById = {}) {
      return Object.fromEntries(
        Object.entries(inputsById || {})
          .map(([nationId, input]) => [nationId, tradeLogisticsDelta(input)])
          .filter(([, delta]) => !isNeutralTradeLogistics(delta))
      );
    }

    function tradeLogisticsDeltaFor(routeLogistics, nationId) {
      const delta = routeLogistics?.[nationId] || {};
      return {
        maritime: roundPercent(number(delta.maritime, 0)),
        corridors: roundPercent(number(delta.corridors, 0)),
        reliability: roundPercent(number(delta.reliability, 0)),
        overall: roundPercent(number(delta.overall, 0))
      };
    }

    function hasExportAnchors(exportAnchors = {}) {
      return Object.values(exportAnchors || {}).some((anchors) => Object.values(anchors || {}).some((value) => number(value, 0) > 0));
    }

    function hasImportAnchors(importAnchors = {}) {
      return Object.values(importAnchors || {}).some((anchors) => Object.values(anchors || {}).some((value) => number(value, 0) > 0));
    }

    function tradeInputForNation(data, id) {
      const national = data.national?.[id] || {};
      const trade = data.trade?.[id] || {};
      const industrial = data.industrial?.[id] || {};
      return {
        id,
        population: getPopulation(data, id),
        developmentLevel: number(national.developmentLevel, 0),
        governmentalStability: number(national.governmentalStability, 70),
        corruption: number(national.corruption, 0),
        economicHealth: national.economicHealth || "Recovery",
        budgetCapacity: roundCurrency(national.budgetCapacity),
        budgetAdjustment: roundCurrency(national.budgetAdjustment),
        civilianFactories: number(industrial.civilianFactories, 0),
        militaryFactories: number(industrial.militaryFactories, 0),
        shipyards: number(industrial.shipyards, 0),
        tradeCapacity: roundCurrency(trade.tradeCapacity),
        tradeBalance: roundCurrency(trade.tradeBalance),
        tradeFlow: roundCurrency(trade.tradeFlow),
        importReliance: Math.max(0, number(trade.importReliance, 0)),
        exportReliance: Math.max(0, number(trade.exportReliance, 0)),
        economicTradeDiversity: Math.max(0, number(trade.economicTradeDiversity, 0)),
        autarkyIndex: clamp(number(trade.autarkyIndex, 50), 0, 100),
        tradePolicy: trade.tradePolicy || "Balanced",
        sanctionsLevel: trade.sanctionsLevel || "None",
        tariffRate: clamp(number(trade.tariffRate, 5), 0, 50)
      };
    }

    function ensureTradeV4State(data) {
      const network = tradeNetworkState(data);
      delete network.baseline;
      return network;
    }

    function tradePolicyProfile(policy) {
      return {
        Protectionist: { access: 0.52, importDemand: 0.5, exportSupply: 0.68, capacity: 0.66, balanceRisk: 0.72 },
        Balanced: { access: 1, importDemand: 1, exportSupply: 1, capacity: 1, balanceRisk: 1 },
        "Open Market": { access: 1.22, importDemand: 1.18, exportSupply: 1.14, capacity: 1.12, balanceRisk: 1.18 },
        "Free Trade": { access: 1.44, importDemand: 1.32, exportSupply: 1.26, capacity: 1.22, balanceRisk: 1.35 }
      }[policy] || { access: 1, importDemand: 1, exportSupply: 1, capacity: 1, balanceRisk: 1 };
    }

    function policyNetworkAccess(policy) {
      return tradePolicyProfile(policy).access;
    }

    function sanctionNetworkAccess(level) {
      return { None: 1, Light: 0.86, Moderate: 0.64, Heavy: 0.38, Total: 0.12 }[level] || 1;
    }

    function lanePolicyFor(lanePolicies, importerId, exporterId) {
      return normalizeLanePolicy(lanePolicies?.[importerId]?.[exporterId] || {});
    }

    function lanePolicyMultiplier(policy) {
      if (policy.embargo) return 0;
      return { None: 1, Light: 0.66, Moderate: 0.36, Heavy: 0.12, Total: 0.015 }[policy.sanctionsLevel] || 1;
    }

    function tariffDemandAccess(tariffRate) {
      const tariff = clamp(number(tariffRate, 0), 0, 50);
      if (tariff <= 2) return clamp(1.05 - tariff * 0.018, 0.98, 1.05);
      return clamp(1.01 * Math.exp(-(tariff - 2) * 0.075), 0.04, 1.01);
    }

    function tariffFlowAccess(tariffRate) {
      const tariff = clamp(number(tariffRate, 0), 0, 50);
      if (tariff <= 2) return clamp(1.06 - tariff * 0.02, 1, 1.06);
      return clamp(1.02 * Math.exp(-(tariff - 2) * 0.11), 0.025, 1.02);
    }

    function autarkyTradeAccess(input, mode = "overall") {
      const autarky = clamp(number(input.autarkyIndex, 50), 0, 100) / 100;
      if (mode === "import") return clamp(1 - Math.pow(autarky, 1.12) * 0.9, 0.07, 1);
      if (mode === "export") return clamp(1 - Math.pow(autarky, 1.06) * 0.72, 0.16, 1);
      return clamp(1 - Math.pow(autarky, 1.1) * 0.78, 0.12, 1);
    }

    function diversityResilience(input) {
      return clamp(0.88 + Math.sqrt(Math.max(0, input.economicTradeDiversity)) / 58, 0.88, 1.22);
    }

    function physicalTradeBase(input) {
      const populationMarket = Math.sqrt(Math.max(input.population, 0) / 1000000) * 5200;
      const industrialMarket = input.civilianFactories * 1500 + input.militaryFactories * 340 + input.shipyards * 3000;
      const budgetMarket = Math.sqrt(Math.max(input.budgetCapacity, 0)) * 1900;
      const developmentFactor = clamp(0.46 + clamp(input.developmentLevel, 0, 20) / 22, 0.46, 1.36);
      const stabilityFactor = clamp(0.74 + number(input.governmentalStability, 70) / 360 - number(input.corruption, 0) / 290, 0.42, 1.08);
      const healthFactor = { Prosperity: 1.14, Expansion: 1.08, Recovery: 1, Slowdown: 0.84, Recession: 0.62, Depression: 0.38 }[input.economicHealth] || 1;
      return Math.max(120, (populationMarket + industrialMarket + budgetMarket) * developmentFactor * stabilityFactor * healthFactor);
    }

    function importDemandScore(input) {
      const reliance = Math.pow(Math.max(0, input.importReliance) / 100, 1.32);
      const floorDemand = Math.sqrt(Math.max(input.population, 0) / 1000000) * 120 + Math.sqrt(Math.max(input.civilianFactories + input.militaryFactories, 0)) * 28;
      const policy = tradePolicyProfile(input.tradePolicy);
      return Math.max(
        1,
        (physicalTradeBase(input) * reliance + floorDemand)
          * policy.importDemand
          * sanctionNetworkAccess(input.sanctionsLevel)
          * autarkyTradeAccess(input, "import")
          * tariffDemandAccess(input.tariffRate)
      );
    }

    function exportSupplyScore(input) {
      const reliance = Math.pow(Math.max(0, input.exportReliance) / 100, 1.32);
      const production = input.civilianFactories * 850 + input.shipyards * 2500 + input.developmentLevel * 1750;
      const policy = tradePolicyProfile(input.tradePolicy);
      return Math.max(
        1,
        (physicalTradeBase(input) * reliance * 0.92 + production)
          * diversityResilience(input)
          * policy.exportSupply
          * sanctionNetworkAccess(input.sanctionsLevel)
          * autarkyTradeAccess(input, "export")
      );
    }

    function directionalTradeTilt(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      const scoreRatio = demandScore / Math.max(supplyScore, 1);
      const relianceRatio = (Math.max(0, input.importReliance) + 6) / Math.max(Math.max(0, input.exportReliance) + 6, 1);
      const combinedLogRatio = Math.log(Math.max(0.03, relianceRatio)) * 0.86
        + Math.log(Math.max(0.03, scoreRatio)) * 0.14;
      return clamp(Math.tanh(combinedLogRatio * 1.05), -0.68, 0.68);
    }

    function importDirectionMultiplier(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      return 1 + directionalTradeTilt(input, demandScore, supplyScore);
    }

    function exportDirectionMultiplier(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      return 1 - directionalTradeTilt(input, demandScore, supplyScore);
    }

    function worldPoolCapacityScore(input) {
      const policy = tradePolicyProfile(input.tradePolicy);
      const logistics = 0.58 + tradeLogisticsProfile(input).overall / 82;
      return Math.max(
        1,
        physicalTradeBase(input)
          * policy.capacity
          * sanctionNetworkAccess(input.sanctionsLevel)
          * autarkyTradeAccess(input)
          * logistics
          * diversityResilience(input)
      );
    }

    function worldPoolCapacityTotal(inputsById) {
      return Object.values(inputsById).reduce((total, input) => total + worldPoolCapacityScore(input), 0);
    }

    function importPoolFor(input, inputDemandScore = importDemandScore(input)) {
      const inputSupplyScore = exportSupplyScore(input);
      return inputDemandScore * importDirectionMultiplier(input, inputDemandScore, inputSupplyScore);
    }

    function exportPoolFor(input, inputSupplyScore = exportSupplyScore(input)) {
      const inputDemandScore = importDemandScore(input);
      return inputSupplyScore * exportDirectionMultiplier(input, inputDemandScore, inputSupplyScore);
    }

    function constrainedWorldTradePool(rawWorldPool, capacityWorldPool) {
      const raw = Math.max(0, rawWorldPool);
      const capacity = Math.max(0, capacityWorldPool);
      if (raw <= 0 || capacity <= 0) return 0;
      if (raw > capacity) return capacity + (raw - capacity) * 0.18;
      return raw;
    }

    function targetedTariffFor(targetedTariffs, importerId, exporterId, fallbackRate) {
      const override = targetedTariffs?.[importerId]?.[exporterId];
      return override === undefined || override === null || override === "" ? fallbackRate : clamp(number(override, fallbackRate), 0, 50);
    }

    function laneTariffMultiplier(tariffRate) {
      return tariffFlowAccess(tariffRate);
    }

    function laneTariffRevenue(flow, tariffRate, importerInput) {
      const collection = clamp(0.42 + importerInput.developmentLevel / 34 + (100 - importerInput.corruption) / 260, 0.35, 1);
      return flow * (tariffRate / 100) * 0.075 * collection;
    }

    function tradeHubMultiplier(input, worldTradeFlow, nationCount) {
      const normalizedShare = (Math.max(0, input.tradeFlow) / Math.max(worldTradeFlow, 1)) * Math.max(nationCount, 1);
      return clamp(0.7 + Math.pow(normalizedShare, 0.82) * 0.42, 0.68, 2.9);
    }

    function normalizeRouteAccess(value) {
      if (Array.isArray(value)) return value.map((entry) => String(entry || "").toLowerCase()).filter(Boolean);
      if (typeof value === "string") return value.split(/[,|]/).map((entry) => entry.trim().toLowerCase()).filter(Boolean);
      return [];
    }

    function normalizeGeographyProfile(id, raw = {}) {
      const x = Number(raw.x);
      const y = Number(raw.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const routeAccess = normalizeRouteAccess(raw.routeAccess);
      const portStrength = clamp(number(raw.portStrength, 0), 0, 10);
      const coastal = raw.coastal === true || portStrength > 0 || routeAccess.some((route) => route.includes("ocean") || route.includes("port"));
      const borderDistances = raw.borderDistances && typeof raw.borderDistances === "object" && !Array.isArray(raw.borderDistances)
        ? Object.fromEntries(Object.entries(raw.borderDistances).map(([nationId, value]) => [nationId, Math.max(0, number(value, 0))]))
        : {};
      return {
        id,
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
        areaUnits: Math.max(0, number(raw.areaUnits ?? raw.area ?? raw.sourceAreaUnits, 0)),
        region: String(raw.region || "global").toLowerCase(),
        regionLabel: raw.regionLabel || "",
        continent: raw.continent || "",
        coastal,
        landlocked: raw.landlocked === true && !coastal,
        coastline: raw.coastline || (coastal ? "Coastal" : "Landlocked"),
        oceanZone: raw.oceanZone || "",
        portStrength,
        routeAccess,
        tradeHubWeight: clamp(number(raw.tradeHubWeight, 1), 0.25, 3),
        capital: raw.capital || null,
        primaryPort: raw.primaryPort || null,
        neighborIds: Array.isArray(raw.neighborIds) ? raw.neighborIds : [],
        borderDistances,
        borderCandidates: Array.isArray(raw.borderCandidates) ? raw.borderCandidates : [],
        mapPosition: raw.mapPosition || null,
        geographySource: raw.geographySource || ""
      };
    }

    function geographyProfiles(data) {
      const network = tradeNetworkState(data);
      const raw = network.geography?.nations || network.geography || {};
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return Object.fromEntries(
        Object.entries(raw)
          .map(([id, profile]) => [id, normalizeGeographyProfile(id, profile)])
          .filter(([, profile]) => profile)
      );
    }

    function routeAccessOverlap(importerGeo, exporterGeo) {
      const importerRoutes = new Set(importerGeo.routeAccess || []);
      const exporterRoutes = new Set(exporterGeo.routeAccess || []);
      if (!importerRoutes.size || !exporterRoutes.size) return 0;
      let overlap = 0;
      for (const route of importerRoutes) {
        if (exporterRoutes.has(route)) overlap += 1;
      }
      return overlap;
    }

    function geographyMapOptions(data) {
      const network = tradeNetworkState(data);
      return network.geography?.map && typeof network.geography.map === "object" && !Array.isArray(network.geography.map)
        ? network.geography.map
        : {};
    }

    function routeScale(data, geography) {
      const map = geographyMapOptions(data);
      const calibrationNationId = map.calibrationNationId || "empire_of_khalindar";
      const calibrationAreaSqMi = Math.max(1, number(map.calibrationAreaSqMi, KHALINDAR_CALIBRATION_AREA_SQ_MI));
      const calibrationAreaUnits = Math.max(0, number(geography?.[calibrationNationId]?.areaUnits, 0));
      const squareMilesPerMapUnit = Math.max(
        1,
        number(
          map.squareMilesPerMapUnit,
          calibrationAreaUnits > 0
            ? calibrationAreaSqMi / calibrationAreaUnits
            : DEFAULT_SQ_MI_PER_MAP_AREA_UNIT
        )
      );
      return {
        width: Math.max(1, number(map.width, DEFAULT_MAP_WIDTH)),
        height: Math.max(1, number(map.height, DEFAULT_MAP_HEIGHT)),
        calibrationNationId,
        calibrationAreaSqMi: roundCurrency(calibrationAreaSqMi),
        calibrationAreaUnits: roundPercent(calibrationAreaUnits),
        squareMilesPerMapUnit: roundCurrency(squareMilesPerMapUnit),
        milesPerMapUnit: Math.sqrt(squareMilesPerMapUnit)
      };
    }

    function mapDistanceUnits(left, right, scale, wrap = true) {
      if (!left || !right) return DEFAULT_MAP_DIAGONAL;
      const rawDx = Math.abs(number(left.x, 0) - number(right.x, 0));
      const dx = wrap && rawDx > scale.width * 0.72 ? Math.min(rawDx, Math.max(0, scale.width - rawDx)) : rawDx;
      const dy = Math.abs(number(left.y, 0) - number(right.y, 0));
      return Math.sqrt(dx * dx + dy * dy);
    }

    function candidateBorderDistance(left, right) {
      const leftDirect = left?.borderDistances?.[right?.id];
      const rightDirect = right?.borderDistances?.[left?.id];
      if (Number.isFinite(Number(leftDirect))) return Math.max(0, Number(leftDirect));
      if (Number.isFinite(Number(rightDirect))) return Math.max(0, Number(rightDirect));
      const leftCandidate = (left?.borderCandidates || []).find((candidate) => candidate.id === right?.id || candidate.nationId === right?.id);
      const rightCandidate = (right?.borderCandidates || []).find((candidate) => candidate.id === left?.id || candidate.nationId === left?.id);
      if (leftCandidate && Number.isFinite(Number(leftCandidate.distance))) return Math.max(0, Number(leftCandidate.distance));
      if (rightCandidate && Number.isFinite(Number(rightCandidate.distance))) return Math.max(0, Number(rightCandidate.distance));
      if ((left?.neighborIds || []).includes(right?.id) || (right?.neighborIds || []).includes(left?.id)) return 0;
      return null;
    }

    function sameRouteRegion(left, right) {
      return Boolean(left?.region && right?.region && left.region !== "global" && right.region !== "global" && left.region === right.region);
    }

    function hasOceanAccess(geo) {
      const routes = geo?.routeAccess || [];
      return Boolean(geo?.coastal && routes.some((route) => String(route || "").includes("ocean") || String(route || "").includes("port")));
    }

    function regionalRouteMode(importerGeo, exporterGeo, directBorderUnits) {
      if (directBorderUnits !== null && directBorderUnits <= 3.5) return "land";
      return hasOceanAccess(importerGeo) && hasOceanAccess(exporterGeo) ? "maritime" : "land";
    }

    function transitModeFor(transitPolicies, blockerId, targetId) {
      return normalizeTransitMode(transitPolicies?.[blockerId]?.[targetId]);
    }

    function transitBlocksUsage(transitPolicies, blockerId, targetId, usage) {
      if (!blockerId || !targetId || blockerId === targetId) return false;
      const mode = transitModeFor(transitPolicies, blockerId, targetId);
      if (mode === "Block All") return true;
      if (usage === "land" && mode === "Block Land") return true;
      if (usage === "maritime" && mode === "Block Maritime") return true;
      return false;
    }

    function uniqueRoutePath(nodes) {
      const path = [];
      for (const node of nodes) {
        if (!node || path[path.length - 1] === node) continue;
        path.push(node);
      }
      return path;
    }

    function seaSide(zone = "") {
      const value = String(zone || "").toLowerCase();
      if (value.includes("west") || value.includes("southwest")) return "west";
      if (value.includes("east") || value.includes("far_east") || value.includes("northeast")) return "east";
      if (value.includes("vesperan")) return "strait";
      if (value.includes("south")) return "south";
      if (value.includes("north")) return "north";
      return "central";
    }

    function routeChokepointsForOcean(fromPort, toPort) {
      const fromSide = seaSide(fromPort?.oceanZone || fromPort?.region);
      const toSide = seaSide(toPort?.oceanZone || toPort?.region);
      if (fromSide === "strait" || toSide === "strait") return ["vesperan_strait"];
      if ((fromSide === "west" && toSide === "east") || (fromSide === "east" && toSide === "west")) return ["vesperan_strait"];
      return [];
    }

    function routeMeshForData(data) {
      const mesh = tradeNetworkState(data).geography?.routeMesh;
      if (!mesh || typeof mesh !== "object" || Array.isArray(mesh)) return null;
      const nodes = Array.isArray(mesh.nodes)
        ? mesh.nodes
            .map((node) => ({
              id: String(node.id || ""),
              zoneId: String(node.zoneId || node.id || ""),
              label: String(node.label || node.zoneId || node.id || ""),
              type: String(node.type || "sea_zone"),
              chokepoint: node.chokepoint === true || String(node.type || "") === "strait",
              x: clamp(number(node.x, NaN), 0, 100),
              y: clamp(number(node.y, NaN), 0, 100)
            }))
            .filter((node) => node.id && Number.isFinite(node.x) && Number.isFinite(node.y))
        : [];
      const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
      const adjacency = Object.fromEntries(nodes.map((node) => [node.id, []]));
      let heuristicScale = 1;
      for (const edge of Array.isArray(mesh.edges) ? mesh.edges : []) {
        const from = String(edge.from || "");
        const to = String(edge.to || "");
        if (!nodeById[from] || !nodeById[to]) continue;
        const cost = Math.max(0.01, number(edge.cost, mapDistanceUnits(nodeById[from], nodeById[to], { width: 100, height: 100 }, false)));
        const distance = Math.max(0.01, pointDistanceUnits(nodeById[from], nodeById[to]));
        heuristicScale = Math.min(heuristicScale, cost / distance);
        const chokepoints = Array.isArray(edge.chokepoints) ? edge.chokepoints.map((id) => String(id)).filter(Boolean) : [];
        adjacency[from].push({ id: to, cost, chokepoints });
        adjacency[to].push({ id: from, cost, chokepoints });
      }
      if (!nodes.length) return null;
      return {
        version: mesh.version || "route-mesh",
        heuristicScale: clamp(heuristicScale, 0, 1),
        nodes,
        nodeById,
        adjacency
      };
    }

    function edgeKey(from, to) {
      return `${from}>${to}`;
    }

    function laneSkeletonForData(data) {
      const skeleton = tradeNetworkState(data).geography?.laneSkeleton;
      if (!skeleton || typeof skeleton !== "object" || Array.isArray(skeleton)) return null;
      const nodes = Array.isArray(skeleton.nodes)
        ? skeleton.nodes
            .map((node) => {
              const id = String(node.id || "");
              const type = String(node.type || "lane");
              const zones = Array.isArray(node.zones) ? node.zones.map((zone) => String(zone)).filter(Boolean) : [];
              const zoneId = String(node.zoneId || zones[0] || node.id || "");
              return {
                id,
                zoneId,
                label: String(node.label || node.zoneId || zones[0] || node.id || ""),
                type,
                chokepoint: node.chokepoint === true || type === "strait" || type === "chokepoint",
                zones: zones.length ? [...new Set(zones)] : zoneId ? [zoneId] : [],
                x: clamp(number(node.x, NaN), 0, 100),
                y: clamp(number(node.y, NaN), 0, 100)
              };
            })
            .filter((node) => node.id && Number.isFinite(node.x) && Number.isFinite(node.y))
        : [];
      const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
      const adjacency = Object.fromEntries(nodes.map((node) => [node.id, []]));
      let heuristicScale = 1;
      for (const edge of Array.isArray(skeleton.edges) ? skeleton.edges : []) {
        const from = String(edge.from || "");
        const to = String(edge.to || "");
        if (!nodeById[from] || !nodeById[to]) continue;
        const cost = Math.max(0.01, number(edge.cost, pointDistanceUnits(nodeById[from], nodeById[to])));
        const distance = Math.max(0.01, pointDistanceUnits(nodeById[from], nodeById[to]));
        heuristicScale = Math.min(heuristicScale, cost / distance);
        const zones = Array.isArray(edge.zones) ? edge.zones.map((zone) => String(zone)).filter(Boolean) : [];
        const chokepoints = Array.isArray(edge.chokepoints) ? edge.chokepoints.map((id) => String(id)).filter(Boolean) : [];
        const path = Array.isArray(edge.path)
          ? edge.path
              .map((point) => ({
                x: clamp(number(point.x, NaN), 0, 100),
                y: clamp(number(point.y, NaN), 0, 100)
              }))
              .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
          : [];
        const normalized = {
          id: String(edge.id || edgeKey(from, to)),
          from,
          to,
          cost,
          class: String(edge.class || ""),
          zones: [...new Set(zones)],
          chokepoints: [...new Set(chokepoints)],
          path
        };
        adjacency[from].push(normalized);
        adjacency[to].push({
          ...normalized,
          id: String(edge.id || edgeKey(to, from)),
          from: to,
          to: from,
          path: path.slice().reverse()
        });
      }
      if (!nodes.length) return null;
      return {
        version: skeleton.version || "lane-skeleton",
        entryLimit: clamp(Math.round(number(skeleton.entryLimit, 4)), 1, 6),
        heuristicScale: clamp(heuristicScale, 0, 1),
        nodes,
        nodeById,
        adjacency
      };
    }

    function routePointForGeography(geo, preferPort = true) {
      const source = preferPort && geo?.primaryPort ? geo.primaryPort : geo?.capital || geo;
      return {
        x: clamp(number(source?.x, geo?.x || 0), 0, 100),
        y: clamp(number(source?.y, geo?.y || 0), 0, 100)
      };
    }

    function pointDistanceUnits(left, right) {
      if (!left || !right) return DEFAULT_MAP_DIAGONAL;
      const dx = number(left.x, 0) - number(right.x, 0);
      const dy = number(left.y, 0) - number(right.y, 0);
      return Math.sqrt(dx * dx + dy * dy);
    }

    function nearestRouteMeshNode(mesh, point) {
      return mesh?.nodes
        ?.slice()
        .sort((left, right) => pointDistanceUnits(left, point) - pointDistanceUnits(right, point))[0] || null;
    }

    function nearestLaneSkeletonEntries(skeleton, point) {
      if (!skeleton || !point) return [];
      return skeleton.nodes
        .map((node) => {
          const chokepointCost = node.chokepoint ? 1.25 : 0;
          return {
            id: node.id,
            cost: Math.max(0.01, pointDistanceUnits(node, point) * 1.04 + chokepointCost),
            zones: node.zones || [],
            chokepoints: node.chokepoint ? [node.zoneId].filter(Boolean) : []
          };
        })
        .sort((left, right) => left.cost - right.cost)
        .slice(0, skeleton.entryLimit);
    }

    function solveRouteMeshPath(mesh, startPoint, endPoint) {
      if (!mesh || !startPoint || !endPoint || !mesh.nodes.length) return null;
      const startAnchor = nearestRouteMeshNode(mesh, startPoint);
      const endAnchor = nearestRouteMeshNode(mesh, endPoint);
      if (!startAnchor || !endAnchor) return null;
      const startId = "__route_start";
      const endId = "__route_end";
      const pointById = {
        [startId]: startPoint,
        [endId]: endPoint,
        ...Object.fromEntries(mesh.nodes.map((node) => [node.id, node]))
      };
      const open = new Set([startId]);
      const closed = new Set();
      const cameFrom = new Map();
      const gScore = new Map([[startId, 0]]);
      const routeChokes = new Map();

      function heuristic(id) {
        return pointDistanceUnits(pointById[id], endPoint) * mesh.heuristicScale;
      }

      function neighbors(id) {
        if (id === startId) {
          return [{ id: startAnchor.id, cost: Math.max(0.01, pointDistanceUnits(startPoint, startAnchor)), chokepoints: [] }];
        }
        if (id === endId) return [];
        const base = mesh.adjacency[id] || [];
        const list = base.slice();
        if (id === endAnchor.id) {
          list.push({ id: endId, cost: Math.max(0.01, pointDistanceUnits(pointById[id], endPoint)), chokepoints: [] });
        }
        return list;
      }

      while (open.size) {
        let current = null;
        let currentScore = Infinity;
        for (const id of open) {
          const score = (gScore.get(id) ?? Infinity) + heuristic(id);
          if (score < currentScore) {
            current = id;
            currentScore = score;
          }
        }
        if (current === endId) {
          const ids = [];
          let cursor = endId;
          while (cursor) {
            ids.unshift(cursor);
            cursor = cameFrom.get(cursor);
          }
          const meshNodeIds = ids.filter((id) => id !== startId && id !== endId);
          const chokepoints = [...new Set(meshNodeIds
            .map((id) => mesh.nodeById[id])
            .filter((node) => node?.chokepoint)
            .map((node) => node.zoneId)
            .concat(ids.flatMap((id) => routeChokes.get(id) || [])))];
          return {
            distanceUnits: roundPercent(gScore.get(endId) ?? 0),
            routePath: ids.map((id) => ({
              x: roundPercent(pointById[id].x),
              y: roundPercent(pointById[id].y)
            })),
            routeNodes: meshNodeIds,
            routeZones: meshNodeIds.map((id) => mesh.nodeById[id]?.zoneId).filter(Boolean),
            chokepoints,
            routeMeshVersion: mesh.version
          };
        }
        open.delete(current);
        closed.add(current);
        for (const neighbor of neighbors(current)) {
          if (closed.has(neighbor.id)) continue;
          const tentative = (gScore.get(current) ?? Infinity) + Math.max(0.01, number(neighbor.cost, 0));
          if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) continue;
          cameFrom.set(neighbor.id, current);
          routeChokes.set(neighbor.id, neighbor.chokepoints || []);
          gScore.set(neighbor.id, tentative);
          open.add(neighbor.id);
        }
      }
      return null;
    }

    function buildSolvedLanePath(ids, pointById, edgeByStep) {
      const routePath = [];
      function pushPoint(point) {
        if (!point) return;
        const next = {
          x: roundPercent(point.x),
          y: roundPercent(point.y)
        };
        const previous = routePath[routePath.length - 1];
        if (previous && previous.x === next.x && previous.y === next.y) return;
        routePath.push(next);
      }
      pushPoint(pointById[ids[0]]);
      for (let index = 1; index < ids.length; index++) {
        const from = ids[index - 1];
        const to = ids[index];
        const edge = edgeByStep.get(edgeKey(from, to));
        if (edge?.path?.length) {
          for (const point of edge.path) pushPoint(point);
        }
        pushPoint(pointById[to]);
      }
      return routePath;
    }

    function solveLaneSkeletonPath(skeleton, startPoint, endPoint) {
      if (!skeleton || !startPoint || !endPoint || !skeleton.nodes.length) return null;
      const startId = "__lane_start";
      const endId = "__lane_end";
      const pointById = {
        [startId]: startPoint,
        [endId]: endPoint,
        ...Object.fromEntries(skeleton.nodes.map((node) => [node.id, node]))
      };
      const open = new Set([startId]);
      const closed = new Set();
      const cameFrom = new Map();
      const gScore = new Map([[startId, 0]]);
      const routeEdges = new Map();

      function heuristic(id) {
        return pointDistanceUnits(pointById[id], endPoint) * skeleton.heuristicScale;
      }

      function neighbors(id) {
        if (id === startId) {
          return nearestLaneSkeletonEntries(skeleton, startPoint).map((entry) => ({
            id: entry.id,
            cost: entry.cost,
            zones: entry.zones,
            chokepoints: entry.chokepoints,
            path: []
          }));
        }
        if (id === endId) return [];
        const list = (skeleton.adjacency[id] || []).slice();
        const exitCost = pointDistanceUnits(pointById[id], endPoint);
        if (exitCost <= 18) {
          list.push({
            id: endId,
            from: id,
            to: endId,
            cost: Math.max(0.01, exitCost),
            zones: skeleton.nodeById[id]?.zones || [],
            chokepoints: [],
            path: []
          });
        }
        return list;
      }

      while (open.size) {
        let current = null;
        let currentScore = Infinity;
        for (const id of open) {
          const score = (gScore.get(id) ?? Infinity) + heuristic(id);
          if (score < currentScore) {
            current = id;
            currentScore = score;
          }
        }
        if (current === endId) {
          const ids = [];
          let cursor = endId;
          while (cursor) {
            ids.unshift(cursor);
            cursor = cameFrom.get(cursor);
          }
          const skeletonNodeIds = ids.filter((id) => id !== startId && id !== endId);
          const routeZones = [];
          const chokepoints = [];
          function pushUnique(list, values) {
            for (const value of values || []) {
              if (value && !list.includes(value)) list.push(value);
            }
          }
          for (const id of skeletonNodeIds) {
            const node = skeleton.nodeById[id];
            pushUnique(routeZones, node?.zones);
            if (node?.chokepoint) pushUnique(chokepoints, [node.zoneId]);
          }
          for (let index = 1; index < ids.length; index++) {
            const edge = routeEdges.get(edgeKey(ids[index - 1], ids[index]));
            pushUnique(routeZones, edge?.zones);
            pushUnique(chokepoints, edge?.chokepoints);
          }
          return {
            distanceUnits: roundPercent(gScore.get(endId) ?? 0),
            routePath: buildSolvedLanePath(ids, pointById, routeEdges),
            routeNodes: skeletonNodeIds,
            routeZones,
            chokepoints,
            routeMeshVersion: skeleton.version
          };
        }
        open.delete(current);
        closed.add(current);
        for (const neighbor of neighbors(current)) {
          const neighborId = neighbor.to || neighbor.id;
          if (closed.has(neighborId)) continue;
          const tentative = (gScore.get(current) ?? Infinity) + Math.max(0.01, number(neighbor.cost, 0));
          if (tentative >= (gScore.get(neighborId) ?? Infinity)) continue;
          cameFrom.set(neighborId, current);
          routeEdges.set(edgeKey(current, neighborId), neighbor);
          gScore.set(neighborId, tentative);
          open.add(neighborId);
        }
      }
      return null;
    }

    function stableRouteKey(value) {
      if (value === null || value === undefined) return "";
      if (Array.isArray(value)) return `[${value.map(stableRouteKey).join(",")}]`;
      if (typeof value === "object") {
        return `{${Object.keys(value).sort().map((key) => `${key}:${stableRouteKey(value[key])}`).join(",")}}`;
      }
      return String(value);
    }

    function pointRouteSignature(point) {
      if (!point) return "";
      return `${roundPercent(number(point.x, 0))},${roundPercent(number(point.y, 0))}`;
    }

    function geographyRouteSignature(geography = {}) {
      return Object.keys(geography || {})
        .sort()
        .map((id) => {
          const geo = geography[id] || {};
          return [
            id,
            pointRouteSignature(geo),
            pointRouteSignature(geo.capital),
            pointRouteSignature(geo.primaryPort),
            geo.region || "",
            geo.oceanZone || "",
            geo.coastal === true ? "coastal" : "",
            geo.landlocked === true ? "landlocked" : "",
            roundPercent(number(geo.portStrength, 0)),
            (geo.routeAccess || []).slice().sort().join(","),
            (geo.neighborIds || []).slice().sort().join(",")
          ].join(":");
        })
        .join("|");
    }

    function routeOverlaySignature(data) {
      const geography = tradeNetworkState(data).geography || {};
      const mesh = geography.routeMesh;
      const skeleton = geography.laneSkeleton;
      return [
        mesh?.version || "",
        Array.isArray(mesh?.nodes) ? mesh.nodes.length : 0,
        Array.isArray(mesh?.edges) ? mesh.edges.length : 0,
        skeleton?.version || "",
        Array.isArray(skeleton?.nodes) ? skeleton.nodes.length : 0,
        Array.isArray(skeleton?.edges) ? skeleton.edges.length : 0
      ].join(":");
    }

    function routeNetworkCacheForData(data) {
      let cache = routeNetworkCacheByData.get(data);
      if (!cache) {
        cache = new Map();
        routeNetworkCacheByData.set(data, cache);
      }
      return cache;
    }

    function routeNetworkCacheKey(data, geography, transitPolicies, chokepoints, routeLogistics) {
      return [
        routeOverlaySignature(data),
        geographyRouteSignature(geography),
        stableRouteKey(transitPolicies),
        stableRouteKey(chokepoints),
        stableRouteKey(routeLogistics)
      ].join("||");
    }

    function cachedRouteMeshPath(context, startPoint, endPoint) {
      if (!context.routeMesh) return null;
      const key = `${roundPercent(startPoint.x)},${roundPercent(startPoint.y)}>${roundPercent(endPoint.x)},${roundPercent(endPoint.y)}`;
      if (context.routeMeshCache.has(key)) return context.routeMeshCache.get(key);
      const route = solveRouteMeshPath(context.routeMesh, startPoint, endPoint);
      context.routeMeshCache.set(key, route);
      return route;
    }

    function cachedLaneSkeletonPath(context, startPoint, endPoint) {
      if (!context.laneSkeleton) return null;
      const key = `${roundPercent(startPoint.x)},${roundPercent(startPoint.y)}>${roundPercent(endPoint.x)},${roundPercent(endPoint.y)}`;
      if (context.laneSkeletonCache.has(key)) return context.laneSkeletonCache.get(key);
      const route = solveLaneSkeletonPath(context.laneSkeleton, startPoint, endPoint);
      context.laneSkeletonCache.set(key, route);
      return route;
    }

    function chokepointControlFor(chokepoints, id, importerId, exporterId) {
      const control = normalizeChokepointControl(chokepoints?.[id] || {});
      const targeted = control.targeted?.[importerId] || control.targeted?.[exporterId];
      return targeted ? normalizeChokepointControl(targeted) : control;
    }

    function chokepointPenalty(chokepoints, chokepointIds, importerId, exporterId) {
      let severity = 0;
      let blocked = false;
      for (const id of chokepointIds || []) {
        const control = chokepointControlFor(chokepoints, id, importerId, exporterId);
        severity = Math.max(severity, control.severity || 0);
        if (control.status === "Blockaded" || control.severity >= 100) blocked = true;
      }
      return {
        severity: roundPercent(severity),
        blocked,
        factor: clamp(1 - severity / 115, 0.04, 1)
      };
    }

    function geographyWithRouteLogistics(geo, routeLogistics) {
      if (!geo) return geo;
      const logistics = tradeLogisticsDeltaFor(routeLogistics, geo.id);
      if (Math.abs(logistics.maritime) < 0.001) return geo;
      return {
        ...geo,
        portStrength: roundPercent(clamp(number(geo.portStrength, 0) + logistics.maritime * 0.45, 0, 12))
      };
    }

    function routeLogisticsPathScore(routeLogistics, path = []) {
      const uniqueIds = [...new Set((path || []).filter(Boolean))];
      return uniqueIds.reduce((sum, nationId) => {
        const logistics = tradeLogisticsDeltaFor(routeLogistics, nationId);
        return sum + logistics.corridors + logistics.maritime * 0.6 + logistics.reliability / 25;
      }, 0);
    }

    function routeCorridorMultiplier(routeLogistics, path = []) {
      return clamp(1 + routeLogisticsPathScore(routeLogistics, path) * 0.034, 0.74, 1.28);
    }

    function routeAccessCostMultiplier(routeLogistics, path = []) {
      return clamp(1 - routeLogisticsPathScore(routeLogistics, path) * 0.03, 0.68, 1.32);
    }

    function routeTerminalAccessDiscount(routeLogistics, ownerId) {
      return tradeLogisticsDeltaFor(routeLogistics, ownerId).maritime * 0.18;
    }

    function routeLogisticsBonusPercent(multiplier) {
      return roundPercent((number(multiplier, 1) - 1) * 100);
    }

    function coastalAccessOptions(ownerId, geography, scale, transitPolicies, usageOwnerId = ownerId, routeLogistics = {}) {
      const owner = geography?.[ownerId];
      if (!owner) return [];
      if (owner.coastal) {
        const port = geographyWithRouteLogistics(owner, routeLogistics);
        return [{
          portId: ownerId,
          port,
          landUnits: 0,
          costUnits: Math.max(0, (10 - number(port.portStrength, 0)) * 0.08),
          path: [ownerId],
          blockedBy: []
        }];
      }
      const candidates = [];
      for (const port of Object.values(geography || {})) {
        if (!port?.coastal || port.id === ownerId) continue;
        const borderUnits = candidateBorderDistance(owner, port);
        const mapUnits = mapDistanceUnits(owner, port, scale, true);
        const isNeighbor = borderUnits !== null || (owner.neighborIds || []).includes(port.id) || (port.neighborIds || []).includes(ownerId);
        if (!isNeighbor && !sameRouteRegion(owner, port) && mapUnits > 28) continue;
        const landBlocked = transitBlocksUsage(transitPolicies, port.id, usageOwnerId, "land");
        const maritimeBlocked = transitBlocksUsage(transitPolicies, port.id, usageOwnerId, "maritime");
        const landUnits = borderUnits !== null ? borderUnits : mapUnits;
        const accessPenalty = isNeighbor ? 0 : 5.5;
        const investedPort = geographyWithRouteLogistics(port, routeLogistics);
        const accessCostFactor = routeAccessCostMultiplier(routeLogistics, [ownerId, port.id]);
        const portPenalty = Math.max(0, (10 - number(investedPort.portStrength, 0)) * 0.42);
        const terminalDiscount = routeTerminalAccessDiscount(routeLogistics, ownerId);
        candidates.push({
          portId: port.id,
          port: investedPort,
          landUnits,
          costUnits: Math.max(0, (landUnits + accessPenalty) * accessCostFactor + portPenalty - terminalDiscount),
          path: uniqueRoutePath([ownerId, port.id]),
          blockedBy: landBlocked || maritimeBlocked ? [port.id] : []
        });
      }
      return candidates
        .sort((left, right) => left.costUnits - right.costUnits)
        .slice(0, 6);
    }

    function routeEfficiencyMultiplier(routeType, distanceUnits, scale, fromGeo, toGeo, chokepointFactor) {
      const normalized = clamp(distanceUnits / DEFAULT_MAP_DIAGONAL, 0, 1.6);
      const distanceScore = routeType === "border"
        ? clamp(1.32 - normalized * 0.36, 1.12, 1.34)
        : clamp(1.38 - normalized * 1.18, 0.22, 1.34);
      const regionScore = sameRouteRegion(fromGeo, toGeo) ? 1.14 : normalized <= 0.2 ? 1.05 : 0.92;
      const portScore = fromGeo?.coastal && toGeo?.coastal
        ? clamp(0.92 + (fromGeo.portStrength + toGeo.portStrength) / 42, 0.92, 1.38)
        : routeType === "land-sea"
          ? 0.86
          : 0.92;
      return clamp(distanceScore * regionScore * portScore * chokepointFactor, 0.04, 1.95);
    }

    function fallbackRoute(importerId, exporterId, geography, scale) {
      const importerGeo = geography?.[importerId];
      const exporterGeo = geography?.[exporterId];
      if (!importerGeo || !exporterGeo) {
        return {
          multiplier: 1,
          routeDistance: null,
          routeDistanceMiles: null,
          routeType: "unmapped",
          routeConfidence: 0,
          routeEfficiency: 100,
          transitPath: [exporterId, importerId],
          routePath: [],
          routeNodes: [],
          routeZones: [],
          routeMeshVersion: "",
          chokepoints: [],
          chokepointSeverity: 0,
          routeLogisticsBonus: 0,
          transitBlocked: false,
          transitBlockedBy: []
        };
      }
      const units = mapDistanceUnits(importerGeo, exporterGeo, scale, true);
      const multiplier = routeEfficiencyMultiplier("interregional", units, scale, exporterGeo, importerGeo, 1);
      return {
        multiplier,
        routeDistance: roundPercent((units / DEFAULT_MAP_DIAGONAL) * 100),
        routeDistanceMiles: roundCurrency(units * scale.milesPerMapUnit),
        routeType: "interregional",
        routeConfidence: 48,
        routeEfficiency: roundPercent(clamp(multiplier / 1.35, 0.04, 1.05) * 100),
        transitPath: [exporterId, importerId],
        routePath: [],
        routeNodes: [],
        routeZones: [],
        routeMeshVersion: "",
        chokepoints: [],
        chokepointSeverity: 0,
        routeLogisticsBonus: 0,
        transitBlocked: false,
        transitBlockedBy: []
      };
    }

    function bestRouteForLane(importerId, exporterId, context) {
      const { geography, scale, transitPolicies, chokepoints, routeLogistics, routeMesh, laneSkeleton } = context;
      const importerGeo = geography?.[importerId];
      const exporterGeo = geography?.[exporterId];
      if (!importerGeo || !exporterGeo) return fallbackRoute(importerId, exporterId, geography, scale);
      const importerProfile = geographyWithRouteLogistics(importerGeo, routeLogistics);
      const exporterProfile = geographyWithRouteLogistics(exporterGeo, routeLogistics);

      const candidates = [];
      const blockedBy = new Set();
      const directBorderUnits = candidateBorderDistance(importerGeo, exporterGeo);
      if (directBorderUnits !== null && directBorderUnits <= 3.5) {
        const units = Math.max(0.12, directBorderUnits);
        const transitPath = [exporterId, importerId];
        const corridorMultiplier = routeCorridorMultiplier(routeLogistics, transitPath);
        const multiplier = Math.max(2.05, routeEfficiencyMultiplier("border", units, scale, exporterProfile, importerProfile, 1) * corridorMultiplier);
        candidates.push({
          routeType: "border",
          routeMode: "land",
          distanceUnits: units,
          multiplier,
          transitPath,
          routePath: [],
          routeNodes: [],
          routeZones: [],
          routeMeshVersion: "",
          chokepoints: [],
          chokepointSeverity: 0,
          routeLogisticsBonus: routeLogisticsBonusPercent(corridorMultiplier),
          transitBlockedBy: []
        });
      }

      const directMapUnits = mapDistanceUnits(importerGeo, exporterGeo, scale, false);
      if ((directBorderUnits === null || directBorderUnits > 3.5) && (sameRouteRegion(importerGeo, exporterGeo) || directMapUnits <= 18)) {
        const transitPath = [exporterId, importerId];
        const corridorMultiplier = routeCorridorMultiplier(routeLogistics, transitPath);
        const multiplier = routeEfficiencyMultiplier("regional", directMapUnits, scale, exporterProfile, importerProfile, 1) * corridorMultiplier;
        candidates.push({
          routeType: "regional",
          routeMode: regionalRouteMode(importerGeo, exporterGeo, directBorderUnits),
          distanceUnits: directMapUnits,
          multiplier,
          transitPath,
          routePath: [],
          routeNodes: [],
          routeZones: [],
          routeMeshVersion: "",
          chokepoints: [],
          chokepointSeverity: 0,
          routeLogisticsBonus: routeLogisticsBonusPercent(corridorMultiplier),
          transitBlockedBy: []
        });
      }

      const exporterPorts = coastalAccessOptions(exporterId, geography, scale, transitPolicies, exporterId, routeLogistics);
      const importerPorts = coastalAccessOptions(importerId, geography, scale, transitPolicies, importerId, routeLogistics);
      for (const option of [...exporterPorts, ...importerPorts]) {
        for (const blocker of option.blockedBy || []) blockedBy.add(blocker);
      }

      for (const exportPort of exporterPorts.filter((option) => !option.blockedBy.length)) {
        for (const importPort of importerPorts.filter((option) => !option.blockedBy.length)) {
          const startPoint = routePointForGeography(exportPort.port);
          const endPoint = routePointForGeography(importPort.port);
          const pushOceanCandidate = (oceanRoute) => {
            const oceanUnits = exportPort.portId === importPort.portId
              ? 0
              : oceanRoute
                ? oceanRoute.distanceUnits
                : mapDistanceUnits(exportPort.port, importPort.port, scale, true) * 0.88;
            const chokepointIds = oceanRoute?.chokepoints?.length
              ? oceanRoute.chokepoints
              : routeChokepointsForOcean(exportPort.port, importPort.port);
            const chokepoint = chokepointPenalty(chokepoints, chokepointIds, importerId, exporterId);
            if (chokepoint.blocked) return false;
            const distanceUnits = exportPort.landUnits + oceanUnits + importPort.landUnits;
            const routeType = exportPort.portId === exporterId && importPort.portId === importerId
              ? "ocean"
              : oceanUnits <= 0
                ? "regional"
                : "land-sea";
            const transitPath = uniqueRoutePath([...exportPort.path, ...importPort.path.slice().reverse()]);
            const corridorMultiplier = routeCorridorMultiplier(routeLogistics, transitPath);
            const multiplier = routeEfficiencyMultiplier(routeType, distanceUnits, scale, exportPort.port, importPort.port, chokepoint.factor) * corridorMultiplier;
            candidates.push({
              routeType,
              routeMode: oceanUnits > 0 ? "maritime" : "land",
              distanceUnits,
              multiplier,
              transitPath,
              routePath: oceanRoute?.routePath || [],
              routeNodes: oceanRoute?.routeNodes || [],
              routeZones: oceanRoute?.routeZones || [],
              routeMeshVersion: oceanRoute?.routeMeshVersion || "",
              chokepoints: chokepointIds,
              chokepointSeverity: chokepoint.severity,
              routeLogisticsBonus: routeLogisticsBonusPercent(corridorMultiplier),
              transitBlockedBy: []
            });
            return true;
          };
          if (exportPort.portId === importPort.portId) {
            pushOceanCandidate(null);
            continue;
          }
          const skeletonRoute = laneSkeleton ? cachedLaneSkeletonPath(context, startPoint, endPoint) : null;
          if (skeletonRoute && pushOceanCandidate(skeletonRoute)) continue;
          const meshRoute = routeMesh ? cachedRouteMeshPath(context, startPoint, endPoint) : null;
          if (meshRoute) {
            pushOceanCandidate(meshRoute);
          } else if (!skeletonRoute) {
            pushOceanCandidate(null);
          }
        }
      }

      if (!candidates.length) {
        const fallback = fallbackRoute(importerId, exporterId, geography, scale);
        fallback.multiplier *= 0.18;
        fallback.routeEfficiency = roundPercent(fallback.routeEfficiency * 0.18);
        fallback.transitBlocked = true;
        fallback.transitBlockedBy = [...blockedBy];
        return fallback;
      }

      const best = candidates.sort((left, right) => right.multiplier - left.multiplier || left.distanceUnits - right.distanceUnits)[0];
      return {
        multiplier: best.multiplier,
        routeDistance: roundPercent((best.distanceUnits / DEFAULT_MAP_DIAGONAL) * 100),
        routeDistanceMiles: roundCurrency(best.distanceUnits * scale.milesPerMapUnit),
        routeType: best.routeType,
        routeMode: best.routeMode,
        routeConfidence: roundPercent(clamp(52 + best.multiplier * 25 - best.chokepointSeverity * 0.35, 25, 96)),
        routeEfficiency: roundPercent(clamp(best.multiplier / 1.35, 0.04, 1.08) * 100),
        transitPath: best.transitPath,
        routePath: best.routePath || [],
        routeNodes: best.routeNodes || [],
        routeZones: best.routeZones || [],
        routeMeshVersion: best.routeMeshVersion || "",
        chokepoints: best.chokepoints,
        chokepointSeverity: best.chokepointSeverity,
        routeLogisticsBonus: best.routeLogisticsBonus || 0,
        transitBlocked: false,
        transitBlockedBy: [...blockedBy]
      };
    }

    function buildRouteNetwork(data, geography, options = {}) {
      const scale = routeScale(data, geography);
      const transitPolicies = cloneTransitPolicies(options.transitPolicies || {});
      const chokepoints = cloneChokepoints(options.chokepoints || {});
      const routeLogistics = options.routeLogistics || {};
      const ids = Object.keys(geography || {});
      const routes = {};
      const laneSkeleton = laneSkeletonForData(data);
      const routeMesh = routeMeshForData(data);
      const context = {
        geography,
        scale,
        transitPolicies,
        chokepoints,
        routeLogistics,
        laneSkeleton,
        laneSkeletonCache: new Map(),
        routeMesh,
        routeMeshCache: new Map()
      };
      for (const importerId of ids) {
        for (const exporterId of ids) {
          if (importerId === exporterId) continue;
          routes[`${importerId}:${exporterId}`] = bestRouteForLane(importerId, exporterId, context);
        }
      }
      return {
        scale: {
          ...scale,
          milesPerMapUnit: roundPercent(scale.milesPerMapUnit)
        },
        routes,
        laneSkeleton: laneSkeleton ? { version: laneSkeleton.version, nodeCount: laneSkeleton.nodes.length } : null,
        routeMesh: routeMesh ? { version: routeMesh.version, nodeCount: routeMesh.nodes.length } : null,
        chokepoints,
        routeLogistics
      };
    }

    function cachedRouteNetwork(data, geography, options = {}) {
      const transitPolicies = cloneTransitPolicies(options.transitPolicies || {});
      const chokepoints = cloneChokepoints(options.chokepoints || {});
      const routeLogistics = options.routeLogistics || {};
      const cache = routeNetworkCacheForData(data);
      const key = routeNetworkCacheKey(data, geography, transitPolicies, chokepoints, routeLogistics);
      if (cache.has(key)) return cache.get(key);
      const routeNetwork = buildRouteNetwork(data, geography, { transitPolicies, chokepoints, routeLogistics });
      if (cache.size >= ROUTE_NETWORK_CACHE_LIMIT) cache.clear();
      cache.set(key, routeNetwork);
      return routeNetwork;
    }

    function routeForLane(routeNetwork, importerId, exporterId) {
      return routeNetwork?.routes?.[`${importerId}:${exporterId}`] || null;
    }

    function laneGeography(importerId, exporterId, geography) {
      const importerGeo = geography?.[importerId];
      const exporterGeo = geography?.[exporterId];
      if (!importerGeo || !exporterGeo) {
        return { multiplier: 1, routeDistance: null, routeType: "unmapped", routeConfidence: 0 };
      }
      const dx = importerGeo.x - exporterGeo.x;
      const dy = importerGeo.y - exporterGeo.y;
      const distance = clamp(Math.sqrt(dx * dx + dy * dy) / 141.4213562373, 0, 1);
      const sameRegion = importerGeo.region && importerGeo.region === exporterGeo.region;
      const bothCoastal = importerGeo.coastal && exporterGeo.coastal;
      const sharedRoutes = routeAccessOverlap(importerGeo, exporterGeo);
      const distantInland = distance > 0.42 && (importerGeo.landlocked || exporterGeo.landlocked);
      const routeType = sameRegion || distance <= 0.16
        ? "regional"
        : bothCoastal
          ? "ocean"
          : distantInland
            ? "distant-inland"
            : "interregional";
      const distanceScore = clamp(1.35 - distance * 1.24, 0.46, 1.32);
      const regionScore = sameRegion ? 1.2 : distance <= 0.22 ? 1.04 : 0.86;
      const portScore = bothCoastal
        ? clamp(0.96 + (importerGeo.portStrength + exporterGeo.portStrength) / 34, 0.98, 1.42)
        : distantInland
          ? 0.56
          : 0.92;
      const routeScore = sharedRoutes ? clamp(1 + sharedRoutes * 0.08, 1.08, 1.28) : 1;
      const hubScore = Math.sqrt(Math.max(0.25, importerGeo.tradeHubWeight) * Math.max(0.25, exporterGeo.tradeHubWeight));
      return {
        multiplier: clamp(distanceScore * regionScore * portScore * routeScore * hubScore, 0.3, 1.85),
        routeDistance: roundPercent(distance * 100),
        routeType,
        routeConfidence: roundPercent(clamp(0.58 + (sameRegion ? 0.18 : 0) + (bothCoastal || sharedRoutes ? 0.14 : 0) - (distantInland ? 0.12 : 0), 0.35, 0.95) * 100)
      };
    }

    function normalizeTargets(targets, totalTarget) {
      const rawTotal = Object.values(targets).reduce((total, value) => total + Math.max(0, value), 0);
      if (rawTotal <= 0 || totalTarget <= 0) return Object.fromEntries(Object.keys(targets).map((id) => [id, 0]));
      const scale = totalTarget / rawTotal;
      return Object.fromEntries(Object.entries(targets).map(([id, value]) => [id, Math.max(0, value) * scale]));
    }

    function laneAffinity(importer, exporter, tariffRate, policy, hubMultiplier, routeNetwork = null) {
      if (policy.embargo) return 0;
      const importerAccess = policyNetworkAccess(importer.tradePolicy) * sanctionNetworkAccess(importer.sanctionsLevel);
      const exporterAccess = policyNetworkAccess(exporter.tradePolicy) * sanctionNetworkAccess(exporter.sanctionsLevel);
      const openness = Math.sqrt(Math.max(0.05, importerAccess) * Math.max(0.05, exporterAccess));
      const tariffAccess = laneTariffMultiplier(tariffRate);
      const policyAccess = lanePolicyMultiplier(policy);
      const complementarity = clamp(0.72 + Math.sqrt(Math.max(0, importer.importReliance) + 1) / 42 + Math.sqrt(Math.max(0, exporter.exportReliance) + 1) / 46, 0.72, 1.42);
      const diversityBridge = clamp(0.84 + Math.sqrt(Math.max(0, exporter.economicTradeDiversity) + Math.max(0, importer.economicTradeDiversity) + 1) / 80, 0.84, 1.24);
      const route = routeForLane(routeNetwork, importer.id, exporter.id);
      const routeMultiplier = route ? route.multiplier : 1;
      return Math.max(0, hubMultiplier * openness * tariffAccess * policyAccess * complementarity * diversityBridge * routeMultiplier);
    }

    function balanceLanesToTargets(lanes, importTargets, exportTargets, iterations = 28) {
      for (const lane of lanes) lane.currentFlow = Math.max(0, lane.weight);
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        const importerTotals = {};
        for (const lane of lanes) importerTotals[lane.importerId] = (importerTotals[lane.importerId] || 0) + lane.currentFlow;
        for (const lane of lanes) {
          const target = importTargets[lane.importerId] || 0;
          const total = importerTotals[lane.importerId] || 0;
          lane.currentFlow = total > 0 ? lane.currentFlow * (target / total) : 0;
        }

        const exporterTotals = {};
        for (const lane of lanes) exporterTotals[lane.exporterId] = (exporterTotals[lane.exporterId] || 0) + lane.currentFlow;
        for (const lane of lanes) {
          const target = exportTargets[lane.exporterId] || 0;
          const total = exporterTotals[lane.exporterId] || 0;
          lane.currentFlow = total > 0 ? lane.currentFlow * (target / total) : 0;
        }
      }
    }

    function laneKey(lane) {
      return `${lane.importerId}:${lane.exporterId}`;
    }

    function forcedVisibleLane(lane) {
      return lane.targeted || lane.exportAnchorShare || lane.importAnchorShare || lane.embargoed || lane.sanctionsLevel !== "None";
    }

    function directReachScore(input, worldPool, nationCount) {
      const tradeFlow = Math.max(0, number(input.tradeFlow, 0));
      const openness = policyNetworkAccess(input.tradePolicy) * sanctionNetworkAccess(input.sanctionsLevel);
      const diversity = Math.sqrt(Math.max(0, number(input.economicTradeDiversity, 0))) / 8.5;
      const globalShare = worldPool > 0 ? (tradeFlow / worldPool) * Math.max(1, nationCount) : 0;
      const scale = Math.log10(Math.max(tradeFlow, 1000)) - 5.7;
      const autarkyDrag = number(input.autarkyIndex, 50) / 68;
      return Math.max(0, scale * 1.15 + diversity + Math.sqrt(Math.max(0, globalShare)) * 0.85 + (openness - 1) * 1.45 - autarkyDrag);
    }

    function directImportPartnerLimit(input, worldPool, nationCount) {
      if (nationCount <= 1) return 0;
      const tradeFlow = Math.max(0, number(input.tradeFlow, 0));
      const globalShare = worldPool > 0 ? (tradeFlow / worldPool) * Math.max(1, nationCount) : 0;
      const openness = policyNetworkAccess(input.tradePolicy) * sanctionNetworkAccess(input.sanctionsLevel);
      const flowScale = Math.max(0, Math.log10(Math.max(tradeFlow, 1000)) - 5.05);
      const diversityBonus = Math.sqrt(Math.max(0, number(input.economicTradeDiversity, 0))) / 19;
      const importBias = Math.sqrt(Math.max(0, number(input.importReliance, 0))) / 18;
      const autarkyDrag = number(input.autarkyIndex, 50) / 145;
      const limit = 1.45 + flowScale * 1.1 + Math.sqrt(Math.max(0, globalShare)) * 1.45 + diversityBonus + importBias + (openness - 1) * 1.15 - autarkyDrag;
      return clamp(Math.round(limit), Math.min(2, nationCount - 1), Math.min(18, nationCount - 1));
    }

    function directExportPartnerLimit(input, worldPool, nationCount) {
      if (nationCount <= 1) return 0;
      const reach = directReachScore(input, worldPool, nationCount);
      const tradeFlow = Math.max(0, number(input.tradeFlow, 0));
      const globalShare = worldPool > 0 ? (tradeFlow / worldPool) * Math.max(1, nationCount) : 0;
      const exportBias = Math.sqrt(Math.max(0, number(input.exportReliance, 0))) / 12;
      const limit = 1 + reach * 1.15 + Math.sqrt(Math.max(0, globalShare)) * 1.9 + exportBias;
      return clamp(Math.round(limit), 1, Math.min(30, nationCount - 1));
    }

    function globalHubExposure(input, worldPool, nationCount) {
      const tradeFlow = Math.max(0, number(input.tradeFlow, 0));
      return worldPool > 0 ? (tradeFlow / worldPool) * Math.max(1, nationCount) : 0;
    }

    function selectVisibleLaneKeys(lanes, nations, inputsById, worldPool, ids) {
      const visible = new Set();
      const importerCounts = Object.fromEntries(ids.map((id) => [id, 0]));
      const exporterCounts = Object.fromEntries(ids.map((id) => [id, 0]));
      const lanesByImporter = Object.fromEntries(ids.map((id) => [id, []]));
      const lanesByExporter = Object.fromEntries(ids.map((id) => [id, []]));
      const importerLimits = Object.fromEntries(ids.map((id) => [id, directImportPartnerLimit(inputsById[id], worldPool, ids.length)]));
      const exporterTargets = Object.fromEntries(ids.map((id) => [id, directExportPartnerLimit(inputsById[id], worldPool, ids.length)]));
      const selectedExportersByImporter = Object.fromEntries(ids.map((id) => [id, new Set()]));

      const addLane = (lane) => {
        const key = laneKey(lane);
        if (visible.has(key)) return;
        visible.add(key);
        importerCounts[lane.importerId] = (importerCounts[lane.importerId] || 0) + 1;
        exporterCounts[lane.exporterId] = (exporterCounts[lane.exporterId] || 0) + 1;
        selectedExportersByImporter[lane.importerId]?.add(lane.exporterId);
      };

      const candidateScore = (lane) => {
        const exporter = inputsById[lane.exporterId];
        const importerLimit = importerLimits[lane.importerId] || 1;
        const selectedExporters = selectedExportersByImporter[lane.importerId] || new Set();
        const exporterTarget = Math.max(1, exporterTargets[lane.exporterId] || 1);
        const saturation = (exporterCounts[lane.exporterId] || 0) / exporterTarget;
        const saturationPenalty = 1 + Math.pow(Math.max(0, saturation), 2.35) * 5.5;
        const exporterExposure = globalHubExposure(exporter, worldPool, ids.length);
        const hasGlobalHub = [...selectedExporters].some((exporterId) => globalHubExposure(inputsById[exporterId], worldPool, ids.length) >= 4);
        let score = number(lane.currentFlow, 0) / saturationPenalty;
        if (hasGlobalHub && exporterExposure >= 4 && importerLimit <= 4) score *= 0.18;
        if (hasGlobalHub && exporterExposure >= 3 && importerLimit <= 3) score *= 0.45;
        return score;
      };

      for (const lane of lanes) {
        if (number(lane.currentFlow, 0) <= 0 && !forcedVisibleLane(lane)) continue;
        lanesByImporter[lane.importerId]?.push(lane);
        lanesByExporter[lane.exporterId]?.push(lane);
        if (forcedVisibleLane(lane)) addLane(lane);
      }

      const maxImporterLimit = Math.max(...Object.values(importerLimits), 0);
      for (let round = 0; round < maxImporterLimit; round += 1) {
        for (const importerId of ids) {
          const limit = importerLimits[importerId] || 0;
          if ((importerCounts[importerId] || 0) >= limit) continue;
          const candidates = (lanesByImporter[importerId] || [])
            .filter((lane) => number(lane.currentFlow, 0) > 0 && !visible.has(laneKey(lane)))
            .sort((a, b) => candidateScore(b) - candidateScore(a));
          if (candidates[0]) addLane(candidates[0]);
        }
      }

      for (const exporterId of ids) {
        if (exporterCounts[exporterId] > 0 || number(nations[exporterId]?.exportFlow, 0) <= 0) continue;
        const limit = directExportPartnerLimit(inputsById[exporterId], worldPool, ids.length);
        const candidates = (lanesByExporter[exporterId] || [])
          .filter((lane) => number(lane.currentFlow, 0) > 0)
          .sort((a, b) => {
            const aImporterLimit = directImportPartnerLimit(inputsById[a.importerId], worldPool, ids.length);
            const bImporterLimit = directImportPartnerLimit(inputsById[b.importerId], worldPool, ids.length);
            const aRoom = Math.max(0, aImporterLimit - (importerCounts[a.importerId] || 0));
            const bRoom = Math.max(0, bImporterLimit - (importerCounts[b.importerId] || 0));
            if (bRoom !== aRoom) return bRoom - aRoom;
            return number(b.currentFlow, 0) - number(a.currentFlow, 0);
          });
        let added = 0;
        for (const lane of candidates) {
          if (added >= limit) break;
          const importerLimit = importerLimits[lane.importerId] || 0;
          if ((importerCounts[lane.importerId] || 0) >= importerLimit + 2) continue;
          addLane(lane);
          added += 1;
        }
        if (exporterCounts[exporterId] <= 0 && candidates[0]) addLane(candidates[0]);
      }

      for (const lane of lanes) {
        const flow = number(lane.currentFlow, 0);
        const worldShare = worldPool > 0 ? (flow / worldPool) * 100 : 0;
        const importerFlow = number(nations[lane.importerId]?.importFlow, 0);
        const exporterFlow = number(nations[lane.exporterId]?.exportFlow, 0);
        const importerShare = importerFlow > 0 ? (flow / importerFlow) * 100 : 0;
        const exporterShare = exporterFlow > 0 ? (flow / exporterFlow) * 100 : 0;
        if (worldShare >= 0.45 || (worldShare >= 0.18 && importerShare >= 18 && exporterShare >= 12)) addLane(lane);
      }

      return visible;
    }

    function networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies, transitPolicies = {}) {
      return {
        importFlow: 0,
        exportFlow: 0,
        tariffRevenue: 0,
        importCost: 0,
        targetedTariffCount: Object.keys(targetedTariffs?.[id] || {}).length,
        exportAnchorCount: Object.keys(exportAnchors?.[id] || {}).filter((importerId) => number(exportAnchors[id][importerId], 0) > 0).length,
        importAnchorCount: Object.keys(importAnchors?.[id] || {}).filter((exporterId) => number(importAnchors[id][exporterId], 0) > 0).length,
        lanePolicyCount: Object.keys(lanePolicies?.[id] || {}).length,
        transitBlockCount: Object.values(transitPolicies?.[id] || {}).filter((mode) => normalizeTransitMode(mode) !== "Open").length,
        transitFlowLoss: 0
      };
    }

    function summarizeTrackedLanes(ids, lanes, targetedTariffs, exportAnchors, importAnchors, lanePolicies, transitPolicies = {}) {
      const nations = Object.fromEntries(ids.map((id) => [id, networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies, transitPolicies)]));
      for (const lane of lanes) {
        nations[lane.importerId].importFlow += lane.currentFlow;
        nations[lane.importerId].tariffRevenue += lane.tariffRevenue;
        nations[lane.importerId].importCost += lane.importCost;
        nations[lane.exporterId].exportFlow += lane.currentFlow;
        for (const blockerId of lane.transitBlockedBy || []) {
          if (nations[blockerId]) nations[blockerId].transitFlowLoss += lane.currentFlow * 0.025;
        }
      }
      Object.values(nations).forEach((row) => {
        row.importFlow = roundCurrency(row.importFlow);
        row.exportFlow = roundCurrency(row.exportFlow);
        row.tariffRevenue = roundCurrency(row.tariffRevenue);
        row.importCost = roundCurrency(row.importCost);
        row.transitFlowLoss = roundCurrency(row.transitFlowLoss);
      });
      return nations;
    }

    function applyExportAnchorsToLanes(lanes, exportAnchors, lanePolicies) {
      if (!hasExportAnchors(exportAnchors)) return;
      for (const [exporterId, anchors] of Object.entries(exportAnchors || {})) {
        const exporterLanes = lanes.filter((lane) => lane.exporterId === exporterId);
        if (!exporterLanes.length) continue;
        const totalExportFlow = exporterLanes.reduce((total, lane) => total + number(lane.currentFlow, 0), 0);
        if (totalExportFlow <= 0) continue;
        const anchorRows = Object.entries(anchors || {})
          .map(([importerId, share]) => ({
            importerId,
            share: clamp(number(share, 0), 0, 95),
            lane: exporterLanes.find((candidate) => candidate.importerId === importerId)
          }))
          .filter((row) => row.share > 0 && row.lane && row.importerId !== exporterId);
        if (!anchorRows.length) continue;

        const activeAnchors = anchorRows.filter((row) => !lanePolicyFor(lanePolicies, row.importerId, exporterId).embargo);
        const blockedShare = anchorRows
          .filter((row) => lanePolicyFor(lanePolicies, row.importerId, exporterId).embargo)
          .reduce((total, row) => total + row.share, 0);
        const totalActiveShare = activeAnchors.reduce((total, row) => total + row.share, 0);
        const normalizedActiveScale = totalActiveShare > 95 ? 95 / totalActiveShare : 1;
        const availableExportFlow = totalExportFlow * clamp(1 - blockedShare * 0.0075, 0.25, 1);
        const anchoredFlow = activeAnchors.reduce((total, row) => total + availableExportFlow * ((row.share * normalizedActiveScale) / 100), 0);
        const nonAnchorLanes = exporterLanes.filter((lane) => !activeAnchors.some((row) => row.lane === lane));
        const nonAnchorCurrent = nonAnchorLanes.reduce((total, lane) => total + number(lane.currentFlow, 0), 0);
        const residualFlow = Math.max(0, availableExportFlow - anchoredFlow);

        for (const row of activeAnchors) {
          const nextFlow = availableExportFlow * ((row.share * normalizedActiveScale) / 100);
          const ratio = nextFlow / Math.max(row.lane.currentFlow, 1);
          row.lane.currentFlow = roundCurrency(nextFlow);
          row.lane.tariffRevenue = roundCurrency(row.lane.tariffRevenue * ratio);
          row.lane.importCost = roundCurrency(row.lane.importCost * ratio);
          row.lane.exportAnchorShare = roundPercent(row.share);
        }

        for (const lane of nonAnchorLanes) {
          const ratio = nonAnchorCurrent > 0 ? residualFlow / nonAnchorCurrent : 0;
          lane.currentFlow = roundCurrency(lane.currentFlow * ratio);
          lane.tariffRevenue = roundCurrency(lane.tariffRevenue * ratio);
          lane.importCost = roundCurrency(lane.importCost * ratio);
        }
      }
    }

    function applyImportAnchorsToLanes(lanes, importAnchors, lanePolicies) {
      if (!hasImportAnchors(importAnchors)) return;
      for (const [importerId, anchors] of Object.entries(importAnchors || {})) {
        const importerLanes = lanes.filter((lane) => lane.importerId === importerId);
        if (!importerLanes.length) continue;
        const totalImportFlow = importerLanes.reduce((total, lane) => total + number(lane.currentFlow, 0), 0);
        if (totalImportFlow <= 0) continue;
        const anchorRows = Object.entries(anchors || {})
          .map(([exporterId, share]) => ({
            exporterId,
            share: clamp(number(share, 0), 0, 95),
            lane: importerLanes.find((candidate) => candidate.exporterId === exporterId)
          }))
          .filter((row) => row.share > 0 && row.lane && row.exporterId !== importerId);
        if (!anchorRows.length) continue;

        const activeAnchors = anchorRows.filter((row) => !lanePolicyFor(lanePolicies, importerId, row.exporterId).embargo);
        const blockedShare = anchorRows
          .filter((row) => lanePolicyFor(lanePolicies, importerId, row.exporterId).embargo)
          .reduce((total, row) => total + row.share, 0);
        const totalActiveShare = activeAnchors.reduce((total, row) => total + row.share, 0);
        const normalizedActiveScale = totalActiveShare > 95 ? 95 / totalActiveShare : 1;
        const availableImportFlow = totalImportFlow * clamp(1 - blockedShare * 0.0075, 0.25, 1);
        const anchoredFlow = activeAnchors.reduce((total, row) => total + availableImportFlow * ((row.share * normalizedActiveScale) / 100), 0);
        const activeLaneKeys = new Set(activeAnchors.map((row) => row.exporterId));
        const nonAnchorLanes = importerLanes.filter((lane) => !activeLaneKeys.has(lane.exporterId));
        const nonAnchorCurrent = nonAnchorLanes.reduce((total, lane) => total + number(lane.currentFlow, 0), 0);
        const residualFlow = Math.max(0, availableImportFlow - anchoredFlow);

        for (const row of activeAnchors) {
          const nextFlow = availableImportFlow * ((row.share * normalizedActiveScale) / 100);
          const ratio = nextFlow / Math.max(row.lane.currentFlow, 1);
          row.lane.currentFlow = roundCurrency(nextFlow);
          row.lane.tariffRevenue = roundCurrency(row.lane.tariffRevenue * ratio);
          row.lane.importCost = roundCurrency(row.lane.importCost * ratio);
          row.lane.importAnchorShare = roundPercent(row.share);
        }

        for (const lane of nonAnchorLanes) {
          const ratio = nonAnchorCurrent > 0 ? residualFlow / nonAnchorCurrent : 0;
          lane.currentFlow = roundCurrency(lane.currentFlow * ratio);
          lane.tariffRevenue = roundCurrency(lane.tariffRevenue * ratio);
          lane.importCost = roundCurrency(lane.importCost * ratio);
        }
      }
    }

    function buildNetworkFlows(data, inputsById, targetedTariffs, options = {}) {
      const ids = Object.keys(inputsById);
      const includeLanes = options.includeLanes !== false;
      const exportAnchors = options.exportAnchors || {};
      const importAnchors = options.importAnchors || {};
      const lanePolicies = options.lanePolicies || {};
      const transitPolicies = options.transitPolicies || {};
      const chokepoints = options.chokepoints || {};
      const routeLogistics = options.routeLogistics || tradeLogisticsDeltasForInputs(inputsById);
      const neutralRouteLogistics = options.neutralRouteLogistics === undefined ? {} : options.neutralRouteLogistics || {};
      const geography = geographyProfiles(data);
      const routeNetwork = cachedRouteNetwork(data, geography, { transitPolicies, chokepoints, routeLogistics });
      const neutralRouteNetwork = cachedRouteNetwork(data, geography, { transitPolicies: {}, chokepoints: {}, routeLogistics: neutralRouteLogistics });
      const lanes = [];
      let nations = Object.fromEntries(ids.map((id) => [id, networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies, transitPolicies)]));
      const demandScores = Object.fromEntries(ids.map((id) => [id, importDemandScore(inputsById[id])]));
      const supplyScores = Object.fromEntries(ids.map((id) => [id, exportSupplyScore(inputsById[id])]));
      const hubInputs = inputsById;
      const worldTradeFlow = ids.reduce((total, id) => total + Math.max(0, hubInputs[id].tradeFlow), 0);
      const hubMultipliers = Object.fromEntries(ids.map((id) => [id, tradeHubMultiplier(hubInputs[id], worldTradeFlow, ids.length)]));
      const rawImportBaseTargets = {};
      const rawImportTargets = {};
      const rawExportBaseTargets = {};
      const rawExportTargets = {};

      for (const importerId of ids) {
        const importer = inputsById[importerId];
        rawImportBaseTargets[importerId] = importPoolFor(importer, demandScores[importerId]);
      }

      for (const exporterId of ids) {
        const exporter = inputsById[exporterId];
        rawExportBaseTargets[exporterId] = exportPoolFor(exporter, supplyScores[exporterId]);
      }

      for (const importerId of ids) {
        const importer = inputsById[importerId];
        let actualAccess = 0;
        let neutralAccess = 0;
        for (const exporterId of ids) {
          if (exporterId === importerId) continue;
          const exporter = inputsById[exporterId];
          const supplyWeight = Math.max(0, rawExportBaseTargets[exporterId] || 0);
          const tariffRate = targetedTariffFor(targetedTariffs, importerId, exporterId, importer.tariffRate);
          actualAccess += supplyWeight * laneAffinity(importer, exporter, tariffRate, lanePolicyFor(lanePolicies, importerId, exporterId), hubMultipliers[exporterId], routeNetwork);
          neutralAccess += supplyWeight * laneAffinity(importer, exporter, importer.tariffRate, { embargo: false, sanctionsLevel: "None" }, hubMultipliers[exporterId], neutralRouteNetwork);
        }
        const marketAccess = neutralAccess > 0 ? actualAccess / neutralAccess : 0;
        rawImportTargets[importerId] = rawImportBaseTargets[importerId] * clamp(marketAccess, 0.02, 1.08);
      }

      for (const exporterId of ids) {
        const exporter = inputsById[exporterId];
        let actualAccess = 0;
        let neutralAccess = 0;
        for (const importerId of ids) {
          if (exporterId === importerId) continue;
          const importer = inputsById[importerId];
          const demandWeight = Math.max(0, rawImportBaseTargets[importerId] || 0);
          const tariffRate = targetedTariffFor(targetedTariffs, importerId, exporterId, importer.tariffRate);
          actualAccess += demandWeight * laneAffinity(importer, exporter, tariffRate, lanePolicyFor(lanePolicies, importerId, exporterId), hubMultipliers[exporterId], routeNetwork);
          neutralAccess += demandWeight * laneAffinity(importer, exporter, importer.tariffRate, { embargo: false, sanctionsLevel: "None" }, hubMultipliers[exporterId], neutralRouteNetwork);
        }
        const marketAccess = neutralAccess > 0 ? actualAccess / neutralAccess : 0;
        rawExportTargets[exporterId] = rawExportBaseTargets[exporterId] * clamp(marketAccess, 0.02, 1.08);
      }

      const rawImportTotal = Object.values(rawImportTargets).reduce((total, value) => total + Math.max(0, value), 0);
      const rawExportTotal = Object.values(rawExportTargets).reduce((total, value) => total + Math.max(0, value), 0);
      const rawWorldPool = (rawImportTotal + rawExportTotal) / 2;
      const capacityWorldPool = worldPoolCapacityTotal(inputsById);
      const currentWorldPool = constrainedWorldTradePool(rawWorldPool, capacityWorldPool);
      const poolScale = rawWorldPool > 0 ? currentWorldPool / rawWorldPool : 0;
      const importTargets = normalizeTargets(rawImportTargets, currentWorldPool);
      const exportTargets = normalizeTargets(rawExportTargets, currentWorldPool);

      for (const importerId of ids) {
        const importer = inputsById[importerId];
        for (const exporterId of ids) {
          if (exporterId === importerId) continue;
          const exporter = inputsById[exporterId];
          const tariffRate = targetedTariffFor(targetedTariffs, importerId, exporterId, importer.tariffRate);
          const policy = lanePolicyFor(lanePolicies, importerId, exporterId);
          const route = routeForLane(routeNetwork, importerId, exporterId) || laneGeography(importerId, exporterId, geography);
          const affinity = laneAffinity(importer, exporter, tariffRate, policy, hubMultipliers[exporterId], routeNetwork);
          const targetProduct = Math.sqrt(Math.max(0, importTargets[importerId] || 0) * Math.max(0, exportTargets[exporterId] || 0));
          lanes.push({
            importerId,
            exporterId,
            tariffRate: roundPercent(tariffRate),
            currentFlow: 0,
            tariffRevenue: 0,
            importCost: 0,
            targeted: targetedTariffs?.[importerId]?.[exporterId] !== undefined,
            sanctionsLevel: policy.sanctionsLevel,
            embargoed: policy.embargo,
            routeDistance: route.routeDistance,
            routeDistanceMiles: route.routeDistanceMiles,
            routeType: route.routeType,
            routeMode: route.routeMode || route.routeType,
            routeConfidence: route.routeConfidence,
            routeEfficiency: route.routeEfficiency,
            routePath: route.routePath || [],
            routeNodes: route.routeNodes || [],
            routeZones: route.routeZones || [],
            routeMeshVersion: route.routeMeshVersion || "",
            transitPath: route.transitPath || [exporterId, importerId],
            transitBlocked: route.transitBlocked === true,
            transitBlockedBy: route.transitBlockedBy || [],
            chokepoints: route.chokepoints || [],
            chokepointSeverity: route.chokepointSeverity || 0,
            routeLogisticsBonus: route.routeLogisticsBonus || 0,
            weight: targetProduct * affinity
          });
        }
      }

      balanceLanesToTargets(lanes, importTargets, exportTargets);
      for (const lane of lanes) {
        const importer = inputsById[lane.importerId];
        const flow = lane.currentFlow;
        lane.currentFlow = roundCurrency(flow);
        lane.tariffRevenue = roundCurrency(laneTariffRevenue(flow, lane.tariffRate, importer));
        lane.importCost = roundCurrency(flow * Math.max(0, lane.tariffRate - importer.tariffRate) * 0.0022);
        delete lane.weight;
      }
      applyExportAnchorsToLanes(lanes, exportAnchors, lanePolicies);
      applyImportAnchorsToLanes(lanes, importAnchors, lanePolicies);
      nations = summarizeTrackedLanes(ids, lanes, targetedTariffs, exportAnchors, importAnchors, lanePolicies, transitPolicies);
      const visibleLaneKeys = includeLanes ? selectVisibleLaneKeys(lanes, nations, inputsById, currentWorldPool, ids) : null;
      const showAllLanes = options.laneVisibility === "all" || options.includeAllLanes === true;
      const visibleLanes = includeLanes
        ? lanes.filter((lane) => showAllLanes ? number(lane.currentFlow, 0) > 0 || forcedVisibleLane(lane) : number(lane.currentFlow, 0) > 0 || visibleLaneKeys.has(laneKey(lane)))
        : [];
      return {
        lanes: visibleLanes,
        nations,
        routeNetwork,
        worldPool: {
          rawTradeFlow: roundCurrency(rawWorldPool),
          capacityTradeFlow: roundCurrency(capacityWorldPool),
          currentTradeFlow: roundCurrency(currentWorldPool),
          rawImportPool: roundCurrency(rawWorldPool),
          capacityImportPool: roundCurrency(capacityWorldPool),
          currentImportPool: roundCurrency(currentWorldPool),
          scale: roundPercent(poolScale * 100)
        }
      };
    }

    function currentInputsById(data) {
      return Object.fromEntries(
        nationIdsForNetwork(data)
          .map((id) => [id, tradeInputForNation(data, id)])
      );
    }

    function calculateTradeNetwork(data, options = {}) {
      const network = tradeNetworkState(data);
      ensureTradeV4State(data);
      const includeLanes = options.includeLanes !== false;
      const inputs = currentInputsById(data);
      const neutralFlows = buildNetworkFlows(data, inputs, {}, {
        includeLanes,
        laneVisibility: options.laneVisibility,
        exportAnchors: network.exportAnchors || {},
        importAnchors: network.importAnchors || {},
        lanePolicies: {},
        transitPolicies: {},
        routeLogistics: {},
        neutralRouteLogistics: {},
        chokepoints: {}
      });
      const currentFlows = buildNetworkFlows(data, inputs, network.targetedTariffs || {}, {
        includeLanes,
        laneVisibility: options.laneVisibility,
        exportAnchors: network.exportAnchors || {},
        importAnchors: network.importAnchors || {},
        lanePolicies: network.lanePolicies || {},
        transitPolicies: network.transitPolicies || {},
        neutralRouteLogistics: {},
        chokepoints: network.chokepoints || {}
      });
      const ids = Object.keys(currentFlows.nations);
      const nations = {};

      for (const id of ids) {
        const neutral = neutralFlows.nations[id] || {};
        const current = currentFlows.nations[id] || {};
        const tradeFlowDelta = (current.importFlow || 0) + (current.exportFlow || 0) - (number(neutral.importFlow, 0) + number(neutral.exportFlow, 0));
        const tariffRevenueDelta = number(current.tariffRevenue, 0) - number(neutral.tariffRevenue, 0);
        const importCostDelta = number(current.importCost, 0) - number(neutral.importCost, 0);
        const exportDelta = number(current.exportFlow, 0) - number(neutral.exportFlow, 0);
        const importDelta = number(current.importFlow, 0) - number(neutral.importFlow, 0);
        const tradeBalanceDelta = exportDelta * 0.22 - importDelta * 0.16 + tariffRevenueDelta * 1.6 - importCostDelta * 0.72;
        nations[id] = {
          importFlow: roundCurrency(current.importFlow),
          exportFlow: roundCurrency(current.exportFlow),
          neutralImportFlow: roundCurrency(neutral.importFlow),
          neutralExportFlow: roundCurrency(neutral.exportFlow),
          tradeFlowDelta: roundCurrency(tradeFlowDelta),
          tradeBalanceDelta: roundCurrency(tradeBalanceDelta),
          tariffRevenueDelta: roundCurrency(tariffRevenueDelta),
          importCostDelta: roundCurrency(importCostDelta),
          targetedTariffCount: current.targetedTariffCount || 0,
          exportAnchorCount: current.exportAnchorCount || 0,
          importAnchorCount: current.importAnchorCount || 0,
          lanePolicyCount: current.lanePolicyCount || 0,
          transitBlockCount: current.transitBlockCount || 0,
          transitFlowLoss: roundCurrency(current.transitFlowLoss)
        };
      }

      const neutralLaneMap = includeLanes
        ? new Map(neutralFlows.lanes.map((lane) => [`${lane.importerId}:${lane.exporterId}`, lane]))
        : new Map();
      const nationNames = includeLanes
        ? Object.fromEntries((data.nations || []).map((nation) => [nation.id, nation.name]))
        : {};
      const lanes = includeLanes
        ? currentFlows.lanes.map((lane) => {
            const neutralLane = neutralLaneMap.get(`${lane.importerId}:${lane.exporterId}`) || {};
            return {
              ...lane,
              importerName: nationNames[lane.importerId] || lane.importerId,
              exporterName: nationNames[lane.exporterId] || lane.exporterId,
              neutralFlow: roundCurrency(neutralLane.currentFlow),
              flowDelta: roundCurrency(lane.currentFlow - number(neutralLane.currentFlow, 0)),
              neutralTariffRate: roundPercent(neutralLane.tariffRate ?? lane.tariffRate),
              importerShare: roundPercent((number(lane.currentFlow, 0) / Math.max(number(currentFlows.nations[lane.importerId]?.importFlow, 0), 1)) * 100),
              exporterShare: roundPercent((number(lane.currentFlow, 0) / Math.max(number(currentFlows.nations[lane.exporterId]?.exportFlow, 0), 1)) * 100)
            };
          })
        : [];

      const worldPool = {
        neutralTradeFlow: roundCurrency(neutralFlows.worldPool?.currentTradeFlow),
        rawTradeFlow: roundCurrency(currentFlows.worldPool?.rawTradeFlow),
        capacityTradeFlow: roundCurrency(currentFlows.worldPool?.capacityTradeFlow),
        currentTradeFlow: roundCurrency(currentFlows.worldPool?.currentTradeFlow),
        tradeFlowDelta: roundCurrency(number(currentFlows.worldPool?.currentTradeFlow, 0) - number(neutralFlows.worldPool?.currentTradeFlow, 0)),
        neutralImportPool: roundCurrency(neutralFlows.worldPool?.currentTradeFlow),
        rawImportPool: roundCurrency(currentFlows.worldPool?.rawTradeFlow),
        capacityImportPool: roundCurrency(currentFlows.worldPool?.capacityTradeFlow),
        currentImportPool: roundCurrency(currentFlows.worldPool?.currentTradeFlow),
        importPoolDelta: roundCurrency(number(currentFlows.worldPool?.currentTradeFlow, 0) - number(neutralFlows.worldPool?.currentTradeFlow, 0)),
        scale: roundPercent(currentFlows.worldPool?.scale)
      };

      return { lanes, nations, worldPool, routeNetwork: currentFlows.routeNetwork };
    }

    const TRADE_ANCHOR_PATTERNS = {
      manual: { label: "Manual picks", shares: [] },
      concentrated: { label: "Concentrated", shares: [45, 24, 14, 8, 4] },
      balanced: { label: "Balanced", shares: [24, 19, 15, 12, 9, 7] },
      globalized: { label: "Globalized", shares: [16, 14, 12, 10, 9, 8, 7, 6] },
      isolated: { label: "Isolated", shares: [22, 13, 7] }
    };

    function anchorPattern(pattern) {
      return TRADE_ANCHOR_PATTERNS[pattern] || TRADE_ANCHOR_PATTERNS.concentrated;
    }

    function requestedPartnerId(row) {
      if (typeof row === "string") return row;
      return row?.partnerId || row?.id || row?.importerId || row?.exporterId || "";
    }

    function requestedShare(row, fallback) {
      if (typeof row === "string") return fallback;
      if (row?.share !== undefined && row.share !== "") return number(row.share, fallback);
      if (row?.percent !== undefined && row.percent !== "") return number(row.percent, fallback);
      return fallback;
    }

    function rankTradePartners(network, countryId, direction) {
      const lanes = direction === "import"
        ? network.lanes.filter((lane) => lane.importerId === countryId)
        : network.lanes.filter((lane) => lane.exporterId === countryId);
      return lanes
        .slice()
        .sort((left, right) => number(right.currentFlow, 0) - number(left.currentFlow, 0))
        .map((lane) => ({
          partnerId: direction === "import" ? lane.exporterId : lane.importerId,
          lane
        }));
    }

    function buildAnchorSuggestions({ countryId, direction, rankedPartners, requestedPartners, patternShares, nationNames }) {
      const suggestions = [];
      const used = new Set([countryId]);
      const requestedRows = Array.isArray(requestedPartners) ? requestedPartners : [];

      function addSuggestion(partnerId, share, lane) {
        if (!partnerId || used.has(partnerId)) return;
        const cleanShare = clamp(number(share, 0), 0, 95);
        if (cleanShare <= 0) return;
        used.add(partnerId);
        suggestions.push({
          direction,
          partnerId,
          partnerName: nationNames[partnerId] || partnerId,
          importerId: direction === "import" ? countryId : partnerId,
          exporterId: direction === "import" ? partnerId : countryId,
          share: roundPercent(cleanShare),
          currentShare: roundPercent(direction === "import" ? lane?.importerShare || 0 : lane?.exporterShare || 0),
          currentFlow: roundCurrency(lane?.currentFlow || 0),
          flowDelta: roundCurrency(lane?.flowDelta || 0)
        });
      }

      for (const row of requestedRows) {
        const partnerId = requestedPartnerId(row);
        const ranked = rankedPartners.find((candidate) => candidate.partnerId === partnerId);
        const fallbackShare = patternShares[suggestions.length] || 0;
        addSuggestion(partnerId, requestedShare(row, fallbackShare), ranked?.lane);
      }

      const targetCount = Math.max(patternShares.length, suggestions.length);
      for (const ranked of rankedPartners) {
        if (suggestions.length >= targetCount) break;
        const alreadyAssigned = suggestions.reduce((total, row) => total + row.share, 0);
        const remaining = 95 - alreadyAssigned;
        if (remaining < 1) break;
        const fallbackShare = Math.min(patternShares[suggestions.length] || Math.min(remaining, 5), remaining);
        addSuggestion(ranked.partnerId, fallbackShare, ranked.lane);
      }

      const totalShare = suggestions.reduce((total, row) => total + row.share, 0);
      if (totalShare > 95) {
        let adjustedTotal = 0;
        suggestions.forEach((row, index) => {
          const adjusted = index === suggestions.length - 1
            ? Math.max(0, 95 - adjustedTotal)
            : roundPercent(row.share * (95 / totalShare));
          row.share = adjusted;
          adjustedTotal += adjusted;
        });
      }

      return suggestions;
    }

    function previewTradeAnchorPlan(data, countryId, options = {}) {
      const network = calculateTradeNetwork(data);
      const patternKey = TRADE_ANCHOR_PATTERNS[options.pattern] ? options.pattern : "concentrated";
      const pattern = anchorPattern(patternKey);
      const nationNames = Object.fromEntries((data.nations || []).map((nation) => [nation.id, nation.name]));
      const importAnchors = buildAnchorSuggestions({
        countryId,
        direction: "import",
        rankedPartners: rankTradePartners(network, countryId, "import"),
        requestedPartners: options.importPartners || [],
        patternShares: pattern.shares,
        nationNames
      });
      const exportAnchors = buildAnchorSuggestions({
        countryId,
        direction: "export",
        rankedPartners: rankTradePartners(network, countryId, "export"),
        requestedPartners: options.exportPartners || [],
        patternShares: pattern.shares,
        nationNames
      });
      const changes = [
        ...importAnchors.map((row) => ({
          type: "import_anchor",
          countryId,
          partnerId: row.partnerId,
          partnerName: row.partnerName,
          beforeShare: row.currentShare,
          afterShare: row.share,
          currentFlow: row.currentFlow
        })),
        ...exportAnchors.map((row) => ({
          type: "export_anchor",
          countryId,
          partnerId: row.partnerId,
          partnerName: row.partnerName,
          beforeShare: row.currentShare,
          afterShare: row.share,
          currentFlow: row.currentFlow
        }))
      ];

      return {
        countryId,
        countryName: nationNames[countryId] || countryId,
        pattern: patternKey,
        patternLabel: pattern.label,
        replaceExisting: options.replaceExisting !== false,
        importAnchors,
        exportAnchors,
        changes
      };
    }

    function applyTradeAnchorPlan(data, plan = {}) {
      const countryId = plan.countryId;
      const network = tradeNetworkState(data);
      if (!countryId) return { importCount: 0, exportCount: 0, totalCount: 0 };
      if (plan.replaceExisting !== false) {
        if (network.importAnchors) delete network.importAnchors[countryId];
        if (network.exportAnchors) delete network.exportAnchors[countryId];
      }
      for (const row of plan.importAnchors || []) {
        setImportAnchor(data, row.importerId || countryId, row.exporterId || row.partnerId, row.share);
      }
      for (const row of plan.exportAnchors || []) {
        setExportAnchor(data, row.exporterId || countryId, row.importerId || row.partnerId, row.share);
      }
      const importCount = (plan.importAnchors || []).length;
      const exportCount = (plan.exportAnchors || []).length;
      return { importCount, exportCount, totalCount: importCount + exportCount };
    }

    function calculateTradeV4ForNation(data, id, options = {}) {
      const current = tradeInputForNation(data, id);
      if (!current) return null;
      const network = options.tradeNetworkSnapshot || calculateTradeNetwork(data);
      const impact = network.nations[id] || {};
      const importFlow = number(impact.importFlow, 0);
      const exportFlow = number(impact.exportFlow, 0);
      const totalFlow = Math.max(0, importFlow + exportFlow);
      const policy = tradePolicyProfile(current.tradePolicy);
      const logistics = tradeLogisticsProfile(current);
      const relianceGap = number(current.exportReliance, 0) - number(current.importReliance, 0);
      const relianceAverage = Math.max(1, (number(current.exportReliance, 0) + number(current.importReliance, 0)) / 2);
      const normalizedGap = relianceGap / relianceAverage;
      const balanceScale = 160 + Math.sqrt(Math.max(totalFlow, 0)) * 0.72 + Math.sqrt(Math.max(current.budgetCapacity, 0)) * 8.5;
      const structuralBalance = relianceGap * balanceScale * policy.balanceRisk;
      const flowBalance = exportFlow * 0.034 - importFlow * 0.04;
      const tariffBalance = number(impact.tariffRevenueDelta, 0) * 0.72 - number(impact.importCostDelta, 0) * 0.5;
      const imbalancePenalty = -Math.pow(Math.abs(normalizedGap), 1.45) * balanceScale * 3.4 * (relianceGap < 0 ? 1.24 : 0.38);
      const tradeBalance = roundCurrency(flowBalance + structuralBalance + tariffBalance + imbalancePenalty + number(impact.tradeBalanceDelta, 0));
      const tradeCapacity = roundCurrency(
        worldPoolCapacityScore(current) / 600
          + logistics.overall * 140
          + diversityResilience(current) * 1800
      );
      const tradeFlow = roundCurrency(totalFlow);
      const economicImpactScore = Math.max(
        0,
        roundCurrency(
          tradeFlow / 52000
            + Math.max(0, tradeBalance) / Math.max(current.budgetCapacity, 1000) * 42
            + Math.abs(Math.min(0, tradeBalance)) / Math.max(current.budgetCapacity, 1000) * 22
            + current.economicTradeDiversity * 0.18
            + (100 - current.autarkyIndex) * 0.16
        )
      );

      return {
        tradeFormulaVersion: "trade2028",
        tradeCapacity: Math.max(0, tradeCapacity),
        autarkyIndex: current.autarkyIndex,
        tradeBalance,
        tradeFlow: Math.max(0, tradeFlow),
        importReliance: current.importReliance,
        exportReliance: current.exportReliance,
        economicTradeDiversity: current.economicTradeDiversity,
        tradePolicy: current.tradePolicy,
        sanctionsLevel: current.sanctionsLevel,
        tariffRate: current.tariffRate,
        economicImpactScore,
        tradeTier: tradeTierForFlow(tradeFlow),
        networkImportFlow: roundCurrency(impact.importFlow),
        networkExportFlow: roundCurrency(impact.exportFlow),
        networkFlowDelta: roundCurrency(impact.tradeFlowDelta),
        networkBalanceDelta: roundCurrency(impact.tradeBalanceDelta),
        networkTariffDelta: roundCurrency(impact.tariffRevenueDelta),
        networkImportCostDelta: roundCurrency(impact.importCostDelta),
        targetedTariffCount: impact.targetedTariffCount || 0
      };
    }

    function recalculateTrade(data, options = {}) {
      const tradeNetworkSnapshot = calculateTradeNetwork(data, { includeLanes: false });
      for (const id of Object.keys(data.trade || {})) {
        stripRemovedTradeStats(data.trade[id]);
        const next = calculateTradeForNation(data, id, {
          ...options,
          tradeNetworkSnapshot
        });
        if (next) data.trade[id] = stripRemovedTradeStats({ ...data.trade[id], ...next });
      }
      return data;
    }

    function setTargetedTariff(data, importerId, exporterId, rate) {
      const network = tradeNetworkState(data);
      if (!network.targetedTariffs[importerId]) network.targetedTariffs[importerId] = {};
      network.targetedTariffs[importerId][exporterId] = clamp(number(rate, 0), 0, 50);
      return network.targetedTariffs[importerId][exporterId];
    }

    function clearTargetedTariff(data, importerId, exporterId) {
      const network = tradeNetworkState(data);
      if (network.targetedTariffs[importerId]) {
        delete network.targetedTariffs[importerId][exporterId];
        if (!Object.keys(network.targetedTariffs[importerId]).length) delete network.targetedTariffs[importerId];
      }
    }

    function setExportAnchor(data, exporterId, importerId, share) {
      const network = tradeNetworkState(data);
      if (!network.exportAnchors[exporterId]) network.exportAnchors[exporterId] = {};
      network.exportAnchors[exporterId][importerId] = clamp(number(share, 0), 0, 95);
      return network.exportAnchors[exporterId][importerId];
    }

    function clearExportAnchor(data, exporterId, importerId) {
      const network = tradeNetworkState(data);
      if (network.exportAnchors[exporterId]) {
        delete network.exportAnchors[exporterId][importerId];
        if (!Object.keys(network.exportAnchors[exporterId]).length) delete network.exportAnchors[exporterId];
      }
    }

    function setImportAnchor(data, importerId, exporterId, share) {
      const network = tradeNetworkState(data);
      if (!network.importAnchors[importerId]) network.importAnchors[importerId] = {};
      network.importAnchors[importerId][exporterId] = clamp(number(share, 0), 0, 95);
      return network.importAnchors[importerId][exporterId];
    }

    function clearImportAnchor(data, importerId, exporterId) {
      const network = tradeNetworkState(data);
      if (network.importAnchors[importerId]) {
        delete network.importAnchors[importerId][exporterId];
        if (!Object.keys(network.importAnchors[importerId]).length) delete network.importAnchors[importerId];
      }
    }

    function setLanePolicy(data, importerId, exporterId, policy = {}) {
      const network = tradeNetworkState(data);
      const normalized = normalizeLanePolicy(policy);
      const isDefault = !normalized.embargo && normalized.sanctionsLevel === "None";
      if (isDefault) {
        clearLanePolicy(data, importerId, exporterId);
        return normalized;
      }
      if (!network.lanePolicies[importerId]) network.lanePolicies[importerId] = {};
      network.lanePolicies[importerId][exporterId] = normalized;
      return normalized;
    }

    function clearLanePolicy(data, importerId, exporterId) {
      const network = tradeNetworkState(data);
      if (network.lanePolicies[importerId]) {
        delete network.lanePolicies[importerId][exporterId];
        if (!Object.keys(network.lanePolicies[importerId]).length) delete network.lanePolicies[importerId];
      }
    }

    function setTransitPolicy(data, blockerId, targetId, mode = "Open") {
      const network = tradeNetworkState(data);
      const normalized = normalizeTransitMode(mode);
      if (normalized === "Open") {
        clearTransitPolicy(data, blockerId, targetId);
        return normalized;
      }
      if (!network.transitPolicies[blockerId]) network.transitPolicies[blockerId] = {};
      network.transitPolicies[blockerId][targetId] = normalized;
      return normalized;
    }

    function clearTransitPolicy(data, blockerId, targetId) {
      const network = tradeNetworkState(data);
      if (network.transitPolicies[blockerId]) {
        delete network.transitPolicies[blockerId][targetId];
        if (!Object.keys(network.transitPolicies[blockerId]).length) delete network.transitPolicies[blockerId];
      }
    }

    return {
      calculateTradeForNation,
      calculateTradeNetwork,
      previewTradeAnchorPlan,
      applyTradeAnchorPlan,
      ensureTradeV4State,
      setTargetedTariff,
      clearTargetedTariff,
      setExportAnchor,
      clearExportAnchor,
      setImportAnchor,
      clearImportAnchor,
      setLanePolicy,
      clearLanePolicy,
      setTransitPolicy,
      clearTransitPolicy,
      tradeLogisticsFor,
      recalculateTrade,
      tradeTierForFlow
    };
  };
})();
