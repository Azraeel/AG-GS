(function () {
  window.AGGS_ENGINE_MODULES = window.AGGS_ENGINE_MODULES || {};

  window.AGGS_ENGINE_MODULES.createTrade = function createTrade(deps) {
    const {
      HEALTH_TRADE,
      TRADE_POLICY,
      SANCTIONS,
      calculateTariffBurdenForNation,
      getPopulation,
      isBlank,
      number,
      clamp,
      roundCurrency,
      roundPercent
    } = deps;

    const TRADE_FORMULAS = {
      legacy: "Legacy workbook trade formula",
      trade2026: "Trade v2 formula",
      trade2027: "Trade v3 global network formula"
    };

    function tradeFormulaVersion(data, options = {}) {
      const version = options.tradeFormulaVersion || options.tradeVersion || data.meta?.tradeFormulaVersion || "legacy";
      return TRADE_FORMULAS[version] ? version : "legacy";
    }

    function calculateTradeForNation(data, id, options = {}) {
      const version = tradeFormulaVersion(data, options);
      if (version === "trade2027") return calculateTradeV3ForNation(data, id, options);
      if (version === "trade2026") return calculateTradeV2ForNation(data, id);
      return calculateLegacyTradeForNation(data, id);
    }

    function calculateLegacyTradeForNation(data, id) {
      const national = data.national[id];
      const trade = data.trade[id];
      const industrial = data.industrial[id];
      if (!national || !trade || !industrial) return null;
      if ([trade.autarkyIndex, trade.importReliance, trade.exportReliance, trade.economicTradeDiversity].some(isBlank)) return null;

      const budgetCapacity = number(national.budgetCapacity, 0);
      const corruption = number(national.corruption, 0) / 100;
      const population = getPopulation(data, id);
      const civilianFactories = number(industrial.civilianFactories, 0);
      const militaryFactories = number(industrial.militaryFactories, 0);
      const shipyards = number(industrial.shipyards, 0);
      const development = number(national.developmentLevel, 0);
      const importReliance = number(trade.importReliance, 0);
      const exportReliance = number(trade.exportReliance, 0);
      const tradeDiversity = number(trade.economicTradeDiversity, 0);
      const economicHealth = national.economicHealth || "Recovery";
      const tradePolicy = trade.tradePolicy || "Balanced";
      const sanctionsLevel = trade.sanctionsLevel || "None";
      const tariffRate = clamp(number(trade.tariffRate, 5), 0, 50);
      const globalEconomicHealth = data.meta.worldEconomicHealth || "Expansion";
      const currencyBonusImpact = number(data.meta.currencyBonusByNation?.[id], 0);
      const policyEffect = TRADE_POLICY[tradePolicy] || TRADE_POLICY.Balanced;
      const sanctionEffect = SANCTIONS[sanctionsLevel] || SANCTIONS.None;
      const tariffEfficiency = Math.max(-30, -tariffRate * 2);
      const tariffCapacity = Math.max(-25, -tariffRate * 1.5);
      const tariffRevenue = tariffRate * 0.01;
      const diversityBonus = (tradeDiversity / 500) * 100;
      const exportMultiplier = 1 + tradeDiversity / 250;

      let tradePower = budgetCapacity * 0.5 + exportReliance * 150 * exportMultiplier + development * 50 + civilianFactories * 25 + shipyards * 40 + currencyBonusImpact + diversityBonus;
      let tradeCapacity = (development * 100 + shipyards * 200) * (1 + (policyEffect.capacity + sanctionEffect.capacity + tariffCapacity) / 100);
      let tradeEfficiency = 50 - corruption * 50 + development * 1.5 + (HEALTH_TRADE[economicHealth] || 0) + (HEALTH_TRADE[globalEconomicHealth] || 0);
      tradeEfficiency = clamp(tradeEfficiency + policyEffect.efficiency + sanctionEffect.efficiency + tariffEfficiency, 0, 100);

      const autarkyIndex = clamp(number(trade.autarkyIndex, 50), 0, 100);
      let tradeFlow = tradePower * (tradeCapacity / 1000) * (tradeEfficiency / 100) * (1 + currencyBonusImpact / 100);
      tradeFlow *= 1 + sanctionEffect.flow / 100;

      const populationNeeds = Math.sqrt(population / 1000000) * 8;
      const factoryNeeds = Math.sqrt(civilianFactories + militaryFactories * 1.5) * 3;
      const minimumImports = Math.max(populationNeeds + factoryNeeds + 10, 15);
      const autarkyReduction = Math.pow(autarkyIndex / 100, 1.5) * 0.6;
      const effectiveImports = Math.max(importReliance * (1 - autarkyReduction), minimumImports * 0.5);
      const exportValue = exportReliance * exportMultiplier;
      const importCost = effectiveImports * (1 + development * 0.01);
      const tradeBalanceRatio = (exportValue - importCost) / Math.max(exportValue + importCost, 1);
      const tradeVolumeBase = Math.sqrt(exportReliance + effectiveImports) * 200;
      let tradeBalance = tradeBalanceRatio * tradeVolumeBase * 100 + tradeFlow * 0.01;
      tradeBalance *= 1 + sanctionEffect.balance / 100;
      tradeBalance += Math.abs(tradeBalance) * tariffRevenue;
      const economicImpactScore = Math.round((Math.abs(tradeBalance) / Math.max(budgetCapacity, 1)) * 100 + (importReliance + exportReliance) / 2 + (100 - autarkyIndex) * 0.5);

      const adjustments = trade.adjustments || {};

      return {
        tradeCapacity: Math.round(tradeCapacity) + number(adjustments.tradeCapacity, 0),
        tradeEfficiency: Math.round(tradeEfficiency) + number(adjustments.tradeEfficiency, 0),
        autarkyIndex,
        tradeBalance: Math.round(tradeBalance) + number(adjustments.tradeBalance, 0),
        tradeFlow: Math.round(tradeFlow) + number(adjustments.tradeFlow, 0),
        tradePower: Math.round(tradePower) + number(adjustments.tradePower, 0),
        importReliance,
        exportReliance,
        economicTradeDiversity: tradeDiversity,
        tradePolicy,
        sanctionsLevel,
        tariffRate,
        economicImpactScore: Math.round(economicImpactScore + number(adjustments.economicImpactScore, 0))
      };
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
      data.tradeNetwork.baseline = data.tradeNetwork.baseline && typeof data.tradeNetwork.baseline === "object" && !Array.isArray(data.tradeNetwork.baseline)
        ? data.tradeNetwork.baseline
        : null;
      return data.tradeNetwork;
    }

    function cloneTargetedTariffs(targetedTariffs = {}) {
      return Object.fromEntries(
        Object.entries(targetedTariffs || {}).map(([importerId, overrides]) => [
          importerId,
          Object.fromEntries(Object.entries(overrides || {}).map(([exporterId, value]) => [exporterId, clamp(number(value, 0), 0, 50)]))
        ])
      );
    }

    function cloneExportAnchors(exportAnchors = {}) {
      return Object.fromEntries(
        Object.entries(exportAnchors || {}).map(([exporterId, anchors]) => [
          exporterId,
          Object.fromEntries(Object.entries(anchors || {}).map(([importerId, value]) => [importerId, clamp(number(value, 0), 0, 95)]))
        ])
      );
    }

    function cloneImportAnchors(importAnchors = {}) {
      return Object.fromEntries(
        Object.entries(importAnchors || {}).map(([importerId, anchors]) => [
          importerId,
          Object.fromEntries(Object.entries(anchors || {}).map(([exporterId, value]) => [exporterId, clamp(number(value, 0), 0, 95)]))
        ])
      );
    }

    function normalizeLanePolicy(policy = {}) {
      const sanctionsLevel = ["None", "Light", "Moderate", "Heavy", "Total"].includes(policy.sanctionsLevel) ? policy.sanctionsLevel : "None";
      return {
        embargo: policy.embargo === true,
        sanctionsLevel
      };
    }

    function cloneLanePolicies(lanePolicies = {}) {
      return Object.fromEntries(
        Object.entries(lanePolicies || {}).map(([importerId, policies]) => [
          importerId,
          Object.fromEntries(Object.entries(policies || {}).map(([exporterId, policy]) => [exporterId, normalizeLanePolicy(policy)]))
        ])
      );
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
        tradeEfficiency: roundCurrency(trade.tradeEfficiency),
        tradeBalance: roundCurrency(trade.tradeBalance),
        tradeFlow: roundCurrency(trade.tradeFlow),
        tradePower: roundCurrency(trade.tradePower),
        importReliance: Math.max(0, number(trade.importReliance, 0)),
        exportReliance: Math.max(0, number(trade.exportReliance, 0)),
        economicTradeDiversity: Math.max(0, number(trade.economicTradeDiversity, 0)),
        autarkyIndex: clamp(number(trade.autarkyIndex, 50), 0, 100),
        tradePolicy: trade.tradePolicy || "Balanced",
        sanctionsLevel: trade.sanctionsLevel || "None",
        tariffRate: clamp(number(trade.tariffRate, 5), 0, 50)
      };
    }

    function ensureTradeV3Baseline(data) {
      const network = tradeNetworkState(data);
      if (!network.baseline) {
        network.baseline = {
          formulaVersion: "trade2027",
          createdAt: data.meta?.updatedAt || new Date().toISOString(),
          targetedTariffs: cloneTargetedTariffs(network.targetedTariffs),
          exportAnchors: cloneExportAnchors(network.exportAnchors),
          importAnchors: cloneImportAnchors(network.importAnchors),
          lanePolicies: cloneLanePolicies(network.lanePolicies),
          nations: {}
        };
      }
      network.baseline.nations = network.baseline.nations && typeof network.baseline.nations === "object" && !Array.isArray(network.baseline.nations)
        ? network.baseline.nations
        : {};
      for (const id of nationIdsForNetwork(data)) {
        if (!network.baseline.nations[id]) {
          network.baseline.nations[id] = tradeInputForNation(data, id);
        }
      }
      return network.baseline;
    }

    function policyNetworkAccess(policy) {
      return { Protectionist: 0.72, Balanced: 0.92, "Open Market": 1.08, "Free Trade": 1.18 }[policy] || 0.92;
    }

    function sanctionNetworkAccess(level) {
      return { None: 1, Light: 0.86, Moderate: 0.64, Heavy: 0.38, Total: 0.12 }[level] || 1;
    }

    function lanePolicyFor(lanePolicies, importerId, exporterId) {
      return normalizeLanePolicy(lanePolicies?.[importerId]?.[exporterId] || {});
    }

    function lanePolicyMultiplier(policy) {
      if (policy.embargo) return 0;
      return { None: 1, Light: 0.82, Moderate: 0.58, Heavy: 0.28, Total: 0.05 }[policy.sanctionsLevel] || 1;
    }

    function tariffDemandAccess(tariffRate) {
      const tariff = clamp(number(tariffRate, 0), 0, 50);
      return clamp(1.03 - Math.max(0, tariff - 4) * 0.018 - Math.max(0, tariff - 15) * 0.018, 0.42, 1.03);
    }

    function importDemandScore(input) {
      const autarkyAccess = clamp(1 - Math.pow(input.autarkyIndex / 100, 1.25) * 0.52, 0.36, 1);
      const populationDemand = Math.sqrt(Math.max(input.population, 0) / 1000000) * 7;
      const industryDemand = Math.sqrt(Math.max(input.civilianFactories + input.militaryFactories, 0)) * 2.2;
      return Math.max(1, (input.importReliance + populationDemand + industryDemand) * policyNetworkAccess(input.tradePolicy) * sanctionNetworkAccess(input.sanctionsLevel) * autarkyAccess);
    }

    function exportSupplyScore(input) {
      const diversity = clamp(0.62 + input.economicTradeDiversity / 155, 0.58, 1.62);
      const autarkyAccess = clamp(1 - Math.pow(input.autarkyIndex / 100, 1.18) * 0.45, 0.42, 1);
      const production = input.civilianFactories * 0.62 + input.shipyards * 1.4 + input.developmentLevel * 7;
      return Math.max(1, (input.exportReliance * diversity + production) * policyNetworkAccess(input.tradePolicy) * sanctionNetworkAccess(input.sanctionsLevel) * autarkyAccess);
    }

    function directionalTradeTilt(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      const scoreRatio = demandScore / Math.max(supplyScore, 1);
      const relianceRatio = (Math.max(0, input.importReliance) + 18) / Math.max(Math.max(0, input.exportReliance) + 18, 1);
      const combinedLogRatio = Math.log(Math.max(0.05, relianceRatio)) * 0.78
        + Math.log(Math.max(0.05, scoreRatio)) * 0.22;
      return clamp(Math.tanh(combinedLogRatio * 0.72), -0.48, 0.48);
    }

    function importDirectionMultiplier(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      return 1 + directionalTradeTilt(input, demandScore, supplyScore);
    }

    function exportDirectionMultiplier(input, demandScore = importDemandScore(input), supplyScore = exportSupplyScore(input)) {
      return 1 - directionalTradeTilt(input, demandScore, supplyScore);
    }

    function worldPoolCapacityScore(input) {
      const openness = policyNetworkAccess(input.tradePolicy) * sanctionNetworkAccess(input.sanctionsLevel);
      const autarkyAccess = clamp(1 - Math.pow(input.autarkyIndex / 100, 1.12) * 0.38, 0.48, 1);
      const logistics = input.civilianFactories * 0.72
        + input.militaryFactories * 0.24
        + input.shipyards * 4.8
        + input.developmentLevel * 10
        + input.economicTradeDiversity * 0.46
        + input.exportReliance * 0.32
        + input.tradeCapacity / 9000;
      const marketDepth = Math.sqrt(Math.max(input.population, 0) / 1000000) * 1.8;
      return Math.max(1, (logistics + marketDepth) * openness * autarkyAccess);
    }

    function worldPoolCapacityTotal(inputsById, useBaseline = false) {
      return Object.values(inputsById).reduce((total, input) => {
        const row = useBaseline ? input.baselineInput || input : input;
        return total + worldPoolCapacityScore(row);
      }, 0);
    }

    function importPoolFor(input, baselineInput = input, inputDemandScore = importDemandScore(input), baselineDemandScore = importDemandScore(baselineInput)) {
      const inputSupplyScore = exportSupplyScore(input);
      const baselineSupplyScore = exportSupplyScore(baselineInput);
      const baselineMultiplier = importDirectionMultiplier(baselineInput, baselineDemandScore, baselineSupplyScore);
      const inputMultiplier = importDirectionMultiplier(input, inputDemandScore, inputSupplyScore);
      const baselinePool = Math.max(0, baselineInput.tradeFlow) * baselineMultiplier;
      const demandRatio = inputDemandScore / Math.max(baselineDemandScore, 1);
      const directionRatio = inputMultiplier / Math.max(baselineMultiplier, 0.01);
      const tariffRatio = tariffDemandAccess(input.tariffRate) / Math.max(tariffDemandAccess(baselineInput.tariffRate), 0.01);
      return baselinePool * Math.max(0.35, demandRatio) * clamp(directionRatio, 0.42, 2.15) * clamp(tariffRatio, 0.38, 1.08);
    }

    function exportPoolFor(input, baselineInput = input, inputSupplyScore = exportSupplyScore(input), baselineSupplyScore = exportSupplyScore(baselineInput)) {
      const inputDemandScore = importDemandScore(input);
      const baselineDemandScore = importDemandScore(baselineInput);
      const baselineMultiplier = exportDirectionMultiplier(baselineInput, baselineDemandScore, baselineSupplyScore);
      const inputMultiplier = exportDirectionMultiplier(input, inputDemandScore, inputSupplyScore);
      const baselinePool = Math.max(0, baselineInput.tradeFlow) * baselineMultiplier;
      const supplyRatio = inputSupplyScore / Math.max(baselineSupplyScore, 1);
      const directionRatio = inputMultiplier / Math.max(baselineMultiplier, 0.01);
      return baselinePool * Math.max(0.25, supplyRatio) * clamp(directionRatio, 0.42, 2.15);
    }

    function baselineWorldTradeFlow(inputsById) {
      return Object.values(inputsById).reduce((total, input) => {
        const baseline = input.baselineInput || input;
        return total + Math.max(0, baseline.tradeFlow);
      }, 0);
    }

    function constrainedWorldTradePool(rawWorldPool, capacityWorldPool) {
      const raw = Math.max(0, rawWorldPool);
      const capacity = Math.max(0, capacityWorldPool);
      if (raw <= 0 || capacity <= 0) return 0;
      if (raw > capacity) return capacity * Math.pow(raw / capacity, 0.28);
      return raw * Math.pow(capacity / raw, 0.45);
    }

    function targetedTariffFor(targetedTariffs, importerId, exporterId, fallbackRate) {
      const override = targetedTariffs?.[importerId]?.[exporterId];
      return override === undefined || override === null || override === "" ? fallbackRate : clamp(number(override, fallbackRate), 0, 50);
    }

    function laneTariffMultiplier(tariffRate) {
      return clamp(1.04 - Math.max(0, tariffRate - 3) * 0.019 + Math.max(0, 3 - tariffRate) * 0.004, 0.34, 1.06);
    }

    function laneTariffRevenue(flow, tariffRate, importerInput) {
      const collection = clamp(0.42 + importerInput.developmentLevel / 34 + (100 - importerInput.corruption) / 260, 0.35, 1);
      return flow * (tariffRate / 100) * 0.075 * collection;
    }

    function tradeHubMultiplier(input, worldTradeFlow, nationCount) {
      const normalizedShare = (Math.max(0, input.tradeFlow) / Math.max(worldTradeFlow, 1)) * Math.max(nationCount, 1);
      return clamp(0.7 + Math.pow(normalizedShare, 0.82) * 0.42, 0.68, 2.9);
    }

    function forcedLaneFor(importerId, exporterId, targetedTariffs, exportAnchors, importAnchors, lanePolicies) {
      return targetedTariffs?.[importerId]?.[exporterId] !== undefined
        || number(importAnchors?.[importerId]?.[exporterId], 0) > 0
        || number(exportAnchors?.[exporterId]?.[importerId], 0) > 0
        || lanePolicies?.[importerId]?.[exporterId] !== undefined;
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
      return {
        id,
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
        region: String(raw.region || "global").toLowerCase(),
        coastal,
        landlocked: raw.landlocked === true && !coastal,
        portStrength,
        routeAccess,
        tradeHubWeight: clamp(number(raw.tradeHubWeight, 1), 0.25, 3)
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

    function laneAffinity(importer, exporter, tariffRate, policy, hubMultiplier, geography = {}) {
      if (policy.embargo) return 0;
      const importerAccess = policyNetworkAccess(importer.tradePolicy) * sanctionNetworkAccess(importer.sanctionsLevel);
      const exporterAccess = policyNetworkAccess(exporter.tradePolicy) * sanctionNetworkAccess(exporter.sanctionsLevel);
      const openness = Math.sqrt(Math.max(0.05, importerAccess) * Math.max(0.05, exporterAccess));
      const tariffAccess = laneTariffMultiplier(tariffRate);
      const policyAccess = lanePolicyMultiplier(policy);
      const complementarity = clamp(0.72 + Math.sqrt(Math.max(0, importer.importReliance) + 1) / 42 + Math.sqrt(Math.max(0, exporter.exportReliance) + 1) / 46, 0.72, 1.42);
      const diversityBridge = clamp(0.84 + Math.sqrt(Math.max(0, exporter.economicTradeDiversity) + Math.max(0, importer.economicTradeDiversity) + 1) / 80, 0.84, 1.24);
      return Math.max(0, hubMultiplier * openness * tariffAccess * policyAccess * complementarity * diversityBridge * laneGeography(importer.id, exporter.id, geography).multiplier);
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

    function networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies) {
      return {
        importFlow: 0,
        exportFlow: 0,
        tariffRevenue: 0,
        importCost: 0,
        targetedTariffCount: Object.keys(targetedTariffs?.[id] || {}).length,
        exportAnchorCount: Object.keys(exportAnchors?.[id] || {}).filter((importerId) => number(exportAnchors[id][importerId], 0) > 0).length,
        importAnchorCount: Object.keys(importAnchors?.[id] || {}).filter((exporterId) => number(importAnchors[id][exporterId], 0) > 0).length,
        lanePolicyCount: Object.keys(lanePolicies?.[id] || {}).length
      };
    }

    function summarizeTrackedLanes(ids, lanes, targetedTariffs, exportAnchors, importAnchors, lanePolicies) {
      const nations = Object.fromEntries(ids.map((id) => [id, networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies)]));
      for (const lane of lanes) {
        nations[lane.importerId].importFlow += lane.currentFlow;
        nations[lane.importerId].tariffRevenue += lane.tariffRevenue;
        nations[lane.importerId].importCost += lane.importCost;
        nations[lane.exporterId].exportFlow += lane.currentFlow;
      }
      Object.values(nations).forEach((row) => {
        row.importFlow = roundCurrency(row.importFlow);
        row.exportFlow = roundCurrency(row.exportFlow);
        row.tariffRevenue = roundCurrency(row.tariffRevenue);
        row.importCost = roundCurrency(row.importCost);
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
      const geography = geographyProfiles(data);
      const lanes = [];
      let nations = Object.fromEntries(ids.map((id) => [id, networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies)]));
      const demandScores = Object.fromEntries(ids.map((id) => [id, importDemandScore(inputsById[id])]));
      const baselineDemandScores = Object.fromEntries(ids.map((id) => [id, importDemandScore(inputsById[id].baselineInput || inputsById[id])]));
      const supplyScores = Object.fromEntries(ids.map((id) => [id, exportSupplyScore(inputsById[id])]));
      const baselineSupplyScores = Object.fromEntries(ids.map((id) => [id, exportSupplyScore(inputsById[id].baselineInput || inputsById[id])]));
      const hubInputs = Object.fromEntries(ids.map((id) => [id, inputsById[id].baselineInput || inputsById[id]]));
      const worldTradeFlow = ids.reduce((total, id) => total + Math.max(0, hubInputs[id].tradeFlow), 0);
      const hubMultipliers = Object.fromEntries(ids.map((id) => [id, tradeHubMultiplier(hubInputs[id], worldTradeFlow, ids.length)]));
      const rawImportTargets = {};
      const rawExportBaseTargets = {};
      const rawExportTargets = {};

      for (const importerId of ids) {
        const importer = inputsById[importerId];
        const importerBaseline = inputsById[importerId].baselineInput || importer;
        rawImportTargets[importerId] = importPoolFor(importer, importerBaseline, demandScores[importerId], baselineDemandScores[importerId]);
      }

      for (const exporterId of ids) {
        const exporter = inputsById[exporterId];
        const exporterBaseline = inputsById[exporterId].baselineInput || exporter;
        rawExportBaseTargets[exporterId] = exportPoolFor(exporter, exporterBaseline, supplyScores[exporterId], baselineSupplyScores[exporterId]);
      }

      for (const exporterId of ids) {
        const exporter = inputsById[exporterId];
        let actualAccess = 0;
        let neutralAccess = 0;
        for (const importerId of ids) {
          if (exporterId === importerId) continue;
          const importer = inputsById[importerId];
          const demandWeight = Math.max(0, rawImportTargets[importerId] || 0);
          const tariffRate = targetedTariffFor(targetedTariffs, importerId, exporterId, importer.tariffRate);
          actualAccess += demandWeight * laneAffinity(importer, exporter, tariffRate, lanePolicyFor(lanePolicies, importerId, exporterId), hubMultipliers[exporterId], geography);
          neutralAccess += demandWeight * laneAffinity(importer, exporter, importer.tariffRate, { embargo: false, sanctionsLevel: "None" }, hubMultipliers[exporterId], geography);
        }
        const marketAccess = neutralAccess > 0 ? actualAccess / neutralAccess : 0;
        rawExportTargets[exporterId] = rawExportBaseTargets[exporterId] * clamp(marketAccess, 0.05, 1.12);
      }

      const rawImportTotal = Object.values(rawImportTargets).reduce((total, value) => total + Math.max(0, value), 0);
      const rawExportTotal = Object.values(rawExportTargets).reduce((total, value) => total + Math.max(0, value), 0);
      const rawWorldPool = (rawImportTotal + rawExportTotal) / 2;
      const baselineWorldPool = baselineWorldTradeFlow(inputsById);
      const capacityRatio = worldPoolCapacityTotal(inputsById) / Math.max(worldPoolCapacityTotal(inputsById, true), 1);
      const capacityWorldPool = baselineWorldPool * Math.max(0.05, capacityRatio);
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
          const geographyLane = laneGeography(importerId, exporterId, geography);
          const affinity = laneAffinity(importer, exporter, tariffRate, policy, hubMultipliers[exporterId], geography);
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
            routeDistance: geographyLane.routeDistance,
            routeType: geographyLane.routeType,
            routeConfidence: geographyLane.routeConfidence,
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
      nations = summarizeTrackedLanes(ids, lanes, targetedTariffs, exportAnchors, importAnchors, lanePolicies);
      const visibleLaneKeys = includeLanes ? selectVisibleLaneKeys(lanes, nations, inputsById, currentWorldPool, ids) : null;
      const visibleLanes = includeLanes
        ? lanes.filter((lane) => visibleLaneKeys.has(laneKey(lane)))
        : [];
      return {
        lanes: visibleLanes,
        nations,
        worldPool: {
          baselineTradeFlow: roundCurrency(baselineWorldPool),
          rawTradeFlow: roundCurrency(rawWorldPool),
          capacityTradeFlow: roundCurrency(capacityWorldPool),
          currentTradeFlow: roundCurrency(currentWorldPool),
          baselineImportPool: roundCurrency(baselineWorldPool),
          rawImportPool: roundCurrency(rawWorldPool),
          capacityImportPool: roundCurrency(capacityWorldPool),
          currentImportPool: roundCurrency(currentWorldPool),
          scale: roundPercent(poolScale * 100)
        }
      };
    }

    function baselineInputsById(data) {
      const baseline = ensureTradeV3Baseline(data);
      return Object.fromEntries(
        nationIdsForNetwork(data)
          .filter((id) => baseline.nations[id])
          .map((id) => [id, { ...baseline.nations[id], baselineInput: baseline.nations[id] }])
      );
    }

    function currentInputsById(data) {
      const baseline = ensureTradeV3Baseline(data);
      return Object.fromEntries(
        nationIdsForNetwork(data)
          .filter((id) => baseline.nations[id])
          .map((id) => [id, { ...tradeInputForNation(data, id), baselineInput: baseline.nations[id] }])
      );
    }

    function calculateTradeNetwork(data, options = {}) {
      const network = tradeNetworkState(data);
      const baseline = ensureTradeV3Baseline(data);
      const includeLanes = options.includeLanes !== false;
      const baselineFlows = buildNetworkFlows(data, baselineInputsById(data), baseline.targetedTariffs || {}, {
        includeLanes,
        exportAnchors: baseline.exportAnchors || {},
        importAnchors: baseline.importAnchors || {},
        lanePolicies: baseline.lanePolicies || {}
      });
      const currentFlows = buildNetworkFlows(data, currentInputsById(data), network.targetedTariffs || {}, {
        includeLanes,
        exportAnchors: network.exportAnchors || {},
        importAnchors: network.importAnchors || {},
        lanePolicies: network.lanePolicies || {}
      });
      const ids = Object.keys(currentFlows.nations);
      const nations = {};

      for (const id of ids) {
        const base = baselineFlows.nations[id] || {};
        const current = currentFlows.nations[id] || {};
        const tradeFlowDelta = (current.importFlow || 0) + (current.exportFlow || 0) - (number(base.importFlow, 0) + number(base.exportFlow, 0));
        const tariffRevenueDelta = number(current.tariffRevenue, 0) - number(base.tariffRevenue, 0);
        const importCostDelta = number(current.importCost, 0) - number(base.importCost, 0);
        const exportDelta = number(current.exportFlow, 0) - number(base.exportFlow, 0);
        const importDelta = number(current.importFlow, 0) - number(base.importFlow, 0);
        const tradeBalanceDelta = exportDelta * 0.16 - importDelta * 0.08 + tariffRevenueDelta * 1.8 - importCostDelta * 0.45;
        nations[id] = {
          importFlow: roundCurrency(current.importFlow),
          exportFlow: roundCurrency(current.exportFlow),
          baselineImportFlow: roundCurrency(base.importFlow),
          baselineExportFlow: roundCurrency(base.exportFlow),
          tradeFlowDelta: roundCurrency(tradeFlowDelta),
          tradeBalanceDelta: roundCurrency(tradeBalanceDelta),
          tariffRevenueDelta: roundCurrency(tariffRevenueDelta),
          importCostDelta: roundCurrency(importCostDelta),
          targetedTariffCount: current.targetedTariffCount || 0,
          exportAnchorCount: current.exportAnchorCount || 0,
          importAnchorCount: current.importAnchorCount || 0,
          lanePolicyCount: current.lanePolicyCount || 0
        };
      }

      const baselineLaneMap = includeLanes
        ? new Map(baselineFlows.lanes.map((lane) => [`${lane.importerId}:${lane.exporterId}`, lane]))
        : new Map();
      const nationNames = includeLanes
        ? Object.fromEntries((data.nations || []).map((nation) => [nation.id, nation.name]))
        : {};
      const lanes = includeLanes
        ? currentFlows.lanes.map((lane) => {
            const baselineLane = baselineLaneMap.get(`${lane.importerId}:${lane.exporterId}`) || {};
            return {
              ...lane,
              importerName: nationNames[lane.importerId] || lane.importerId,
              exporterName: nationNames[lane.exporterId] || lane.exporterId,
              baselineFlow: roundCurrency(baselineLane.currentFlow),
              flowDelta: roundCurrency(lane.currentFlow - number(baselineLane.currentFlow, 0)),
              baselineTariffRate: roundPercent(baselineLane.tariffRate ?? lane.tariffRate),
              importerShare: roundPercent((number(lane.currentFlow, 0) / Math.max(number(currentFlows.nations[lane.importerId]?.importFlow, 0), 1)) * 100),
              exporterShare: roundPercent((number(lane.currentFlow, 0) / Math.max(number(currentFlows.nations[lane.exporterId]?.exportFlow, 0), 1)) * 100)
            };
          })
        : [];

      const worldPool = {
        baselineTradeFlow: roundCurrency(baselineFlows.worldPool?.currentTradeFlow),
        rawTradeFlow: roundCurrency(currentFlows.worldPool?.rawTradeFlow),
        capacityTradeFlow: roundCurrency(currentFlows.worldPool?.capacityTradeFlow),
        currentTradeFlow: roundCurrency(currentFlows.worldPool?.currentTradeFlow),
        tradeFlowDelta: roundCurrency(number(currentFlows.worldPool?.currentTradeFlow, 0) - number(baselineFlows.worldPool?.currentTradeFlow, 0)),
        baselineImportPool: roundCurrency(baselineFlows.worldPool?.currentTradeFlow),
        rawImportPool: roundCurrency(currentFlows.worldPool?.rawTradeFlow),
        capacityImportPool: roundCurrency(currentFlows.worldPool?.capacityTradeFlow),
        currentImportPool: roundCurrency(currentFlows.worldPool?.currentTradeFlow),
        importPoolDelta: roundCurrency(number(currentFlows.worldPool?.currentTradeFlow, 0) - number(baselineFlows.worldPool?.currentTradeFlow, 0)),
        scale: roundPercent(currentFlows.worldPool?.scale)
      };

      return { lanes, nations, baselineCreatedAt: baseline.createdAt, worldPool };
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

    function calculateTradeV3ForNation(data, id, options = {}) {
      const baseline = ensureTradeV3Baseline(data).nations[id];
      const current = tradeInputForNation(data, id);
      if (!baseline || !current) return null;
      const network = options.tradeNetworkSnapshot || calculateTradeNetwork(data);
      const impact = network.nations[id] || {};
      const exportInputDelta = current.exportReliance - number(baseline.exportReliance, current.exportReliance);
      const importInputDelta = current.importReliance - number(baseline.importReliance, current.importReliance);
      const diversityDelta = current.economicTradeDiversity - number(baseline.economicTradeDiversity, current.economicTradeDiversity);
      const autarkyDelta = current.autarkyIndex - number(baseline.autarkyIndex, current.autarkyIndex);
      const structuralBalanceDelta = exportInputDelta * 1100 - importInputDelta * 850 + diversityDelta * 340 - autarkyDelta * 260;
      const flowDelta = number(impact.tradeFlowDelta, 0) + exportInputDelta * 4500 + importInputDelta * 2200 + diversityDelta * 1800 - autarkyDelta * 1100;
      const balanceDelta = number(impact.tradeBalanceDelta, 0) + structuralBalanceDelta;
      const capacityDelta = (current.developmentLevel - number(baseline.developmentLevel, current.developmentLevel)) * 820
        + (current.shipyards - number(baseline.shipyards, current.shipyards)) * 180
        + diversityDelta * 120
        - autarkyDelta * 95;
      const efficiencyDelta = (current.governmentalStability - number(baseline.governmentalStability, current.governmentalStability)) * 0.08
        - (current.corruption - number(baseline.corruption, current.corruption)) * 0.12
        - (current.tariffRate - number(baseline.tariffRate, current.tariffRate)) * 0.35;

      return {
        tradeFormulaVersion: "trade2027",
        tradeCapacity: Math.max(0, roundCurrency(number(baseline.tradeCapacity, 0) + capacityDelta)),
        tradeEfficiency: Math.max(0, roundCurrency(number(baseline.tradeEfficiency, 0) + efficiencyDelta)),
        autarkyIndex: current.autarkyIndex,
        tradeBalance: roundCurrency(number(baseline.tradeBalance, 0) + balanceDelta),
        tradeFlow: Math.max(0, roundCurrency(number(baseline.tradeFlow, 0) + flowDelta)),
        tradePower: Math.max(0, roundCurrency(number(baseline.tradePower, 0) + flowDelta * 0.06 + exportInputDelta * 950)),
        importReliance: current.importReliance,
        exportReliance: current.exportReliance,
        economicTradeDiversity: current.economicTradeDiversity,
        tradePolicy: current.tradePolicy,
        sanctionsLevel: current.sanctionsLevel,
        tariffRate: current.tariffRate,
        economicImpactScore: Math.max(0, roundCurrency(number(baseline.economicImpactScore, 0) + balanceDelta / 9000 + flowDelta / 65000 + diversityDelta * 0.35)),
        tradeTier: tradeTierForFlow(number(baseline.tradeFlow, 0) + flowDelta),
        networkImportFlow: roundCurrency(impact.importFlow),
        networkExportFlow: roundCurrency(impact.exportFlow),
        networkFlowDelta: roundCurrency(impact.tradeFlowDelta),
        networkBalanceDelta: roundCurrency(impact.tradeBalanceDelta),
        networkTariffDelta: roundCurrency(impact.tariffRevenueDelta),
        networkImportCostDelta: roundCurrency(impact.importCostDelta),
        targetedTariffCount: impact.targetedTariffCount || 0
      };
    }

    function stableFiscalScale(national, population, productionStrength) {
      const taxRate = number(national.taxRate, 0);
      const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
      const development = clamp(number(national.developmentLevel, 0), 0, 20);
      const stability = number(national.governmentalStability, 50);
      const corruption = number(national.corruption, 0);
      const health = national.economicHealth || "Recovery";
      const healthMultiplier = { Prosperity: 1.08, Expansion: 1.04, Recovery: 1, Slowdown: 0.92, Recession: 0.78, Depression: 0.62 }[health] || 1;
      const populationBase = Math.sqrt(Math.max(population, 0) / 1000000) * 3600;
      const developmentFactor = clamp(0.58 + Math.pow(development / 20, 1.25) * 0.62, 0.55, 1.22);
      const stabilityFactor = clamp(0.78 + stability / 500, 0.75, 1.02);
      const corruptionFactor = clamp(1 - corruption / 350, 0.62, 1);
      const taxSignal = clamp(0.9 + Math.sqrt(clamp(taxRatePercent, 1, 60)) / 70, 0.92, 1.02);
      const marketBase = populationBase * developmentFactor * stabilityFactor * corruptionFactor * taxSignal * healthMultiplier;
      const industrialBase = productionStrength * 0.31;
      return Math.max(1000, marketBase + industrialBase + number(national.budgetAdjustment, 0));
    }

    function calculateTradeV2ForNation(data, id) {
      const national = data.national[id];
      const trade = data.trade[id];
      const industrial = data.industrial[id];
      if (!national || !trade || !industrial) return null;
      if ([trade.autarkyIndex, trade.importReliance, trade.exportReliance, trade.economicTradeDiversity].some(isBlank)) return null;

      const corruption = number(national.corruption, 0);
      const population = getPopulation(data, id);
      const civilianFactories = number(industrial.civilianFactories, 0);
      const militaryFactories = number(industrial.militaryFactories, 0);
      const shipyards = number(industrial.shipyards, 0);
      const development = number(national.developmentLevel, 0);
      const importReliance = number(trade.importReliance, 0);
      const exportReliance = number(trade.exportReliance, 0);
      const tradeDiversity = number(trade.economicTradeDiversity, 0);
      const autarkyIndex = clamp(number(trade.autarkyIndex, 50), 0, 100);
      const economicHealth = national.economicHealth || "Recovery";
      const tradePolicy = trade.tradePolicy || "Balanced";
      const sanctionsLevel = trade.sanctionsLevel || "None";
      const tariffRate = clamp(number(trade.tariffRate, 5), 0, 50);
      const tariffBurden = calculateTariffBurdenForNation ? calculateTariffBurdenForNation(data, id) : {};
      const policyEffect = TRADE_POLICY[tradePolicy] || TRADE_POLICY.Balanced;
      const sanctionEffect = SANCTIONS[sanctionsLevel] || SANCTIONS.None;
      const policyOpenness = { Protectionist: 0.68, Balanced: 0.88, "Open Market": 1.06, "Free Trade": 1.18 }[tradePolicy] || 0.88;
      const diversityAccess = clamp(0.85 + tradeDiversity / 320, 0.78, 1.55);
      const autarkyPressure = clamp((autarkyIndex - 55) / 45, 0, 1);
      const autarkyCurve = Math.pow(autarkyPressure, 1.12);
      const autarkyGlobalAccess = clamp(1 - autarkyCurve * 0.5, 0.5, 1);
      const autarkyLogisticsAccess = clamp(1 - autarkyCurve * 0.28, 0.72, 1);
      const autarkyImportAccess = clamp(1 - autarkyCurve * 0.34, 0.66, 1);
      const autarkyExportAccess = clamp(1 - autarkyCurve * 0.45, 0.55, 1);
      const autarkyServicesAccess = clamp(1 - autarkyCurve * 0.58, 0.42, 1);
      const autarkyImportCost = 1 + autarkyCurve * 0.22;
      const rawOpenness = policyOpenness * diversityAccess * autarkyGlobalAccess;
      const autarkyOpennessCap = clamp(1.18 - Math.max(0, autarkyIndex - 55) * 0.015, 0.58, 1.18);
      const openness = clamp(Math.min(rawOpenness, autarkyOpennessCap), 0.5, 1.18);
      const healthEffect = HEALTH_TRADE[economicHealth] || 0;
      const worldHealthEffect = HEALTH_TRADE[data.meta.worldEconomicHealth] || 0;

      const productionStrength = civilianFactories * 112 + militaryFactories * 35 + shipyards * 255 + Math.pow(development, 2) * 175;
      const fiscalScale = stableFiscalScale(national, population, productionStrength);
      const marketSize = Math.sqrt(Math.max(population, 0) / 1000000) * 620 + fiscalScale * 1.05 + Math.pow(development, 1.8) * 145;
      const logisticsCapacity = (shipyards * 255 + development * 850 + Math.sqrt(Math.max(fiscalScale, 0)) * 95)
        * (1 + (policyEffect.capacity + sanctionEffect.capacity - Math.min(25, tariffRate * 1.2)) / 100)
        * clamp(0.8 + tradeDiversity / 360, 0.78, 1.38)
        * autarkyLogisticsAccess
        * number(tariffBurden.capacityMultiplier, 1);
      const importDemand = (importReliance * 640 + Math.sqrt(Math.max(population, 0) / 1000000) * 560 + Math.sqrt(civilianFactories + militaryFactories * 1.5) * 275)
        * (1 + development / 44)
        * clamp(1 - Math.pow(autarkyIndex / 100, 1.35) * 0.44, 0.45, 1)
        * autarkyImportAccess
        * number(tariffBurden.importDemandMultiplier, 1);
      const exportStrength = (exportReliance * 820 * (0.75 + tradeDiversity / 130) + productionStrength * 0.42)
        * (1 + healthEffect / 100)
        * policyOpenness
        * autarkyExportAccess
        * number(tariffBurden.exportAccessMultiplier, 1);
      const efficiency = clamp(
        0.52 + development / 36 + (100 - corruption) / 175 + healthEffect / 130 + worldHealthEffect / 170 + policyEffect.efficiency / 125 + sanctionEffect.efficiency / 130 - tariffRate / 125 - number(tariffBurden.tariffShockScore, 0) / 160,
        0.15,
        1.28
      );
      const financialDepth = clamp(0.78 + Math.pow(Math.max(fiscalScale, 1) / 120000, 0.82) * 0.65, 0.78, 2.05);
      const scaleThroughput = clamp(Math.pow(Math.max(fiscalScale, 1) / 115000, 0.8), 0.62, 1.3);
      const tradeFlow = (marketSize * 0.95 + productionStrength * 0.52 + importDemand * 1.05 + exportStrength * 1.18)
        * (logisticsCapacity / 12500)
        * efficiency
        * openness
        * financialDepth
        * scaleThroughput
        * number(tariffBurden.tradeFlowMultiplier, 1)
        * (1 + sanctionEffect.flow / 100);

      const importCost = importDemand * (1 + development / 70) * autarkyImportCost * number(tariffBurden.importCostMultiplier, 1 + tariffRate / 250);
      const exportValue = exportStrength * (1 + tradeDiversity / 230) * clamp(1 - autarkyIndex / 390, 0.72, 1.05) * (1 + sanctionEffect.balance / 100);
      const servicesPremium = (marketSize + logisticsCapacity) * 0.14 * policyOpenness * (tradeDiversity / 95) * clamp(1 - autarkyIndex / 210, 0.35, 1) * autarkyServicesAccess * number(tariffBurden.servicesMultiplier, 1);
      const tradeBalance = (exportValue - importCost + servicesPremium + tradeFlow * 0.016) * (1 + sanctionEffect.balance / 100);
      const tradePower = marketSize * 0.42 + productionStrength * 0.5 + exportStrength * 0.42;
      const economicImpactScore = Math.round((Math.abs(tradeBalance) / Math.max(fiscalScale, 1)) * 58 + tradeFlow / 56000 + tradeDiversity * 0.52 + (100 - autarkyIndex) * 0.3);

      return {
        tradeFormulaVersion: "trade2026",
        tradeCapacity: Math.round(logisticsCapacity),
        tradeEfficiency: Math.round(efficiency * 100),
        autarkyIndex,
        tradeBalance: Math.round(tradeBalance),
        tradeFlow: Math.round(tradeFlow),
        tradePower: Math.round(tradePower),
        importReliance,
        exportReliance,
        economicTradeDiversity: tradeDiversity,
        tradePolicy,
        sanctionsLevel,
        tariffRate,
        economicImpactScore,
        tradeTier: tradeTierForFlow(tradeFlow),
        marketSize: Math.round(marketSize),
        productionStrength: Math.round(productionStrength),
        fiscalScale: Math.round(fiscalScale),
        logisticsCapacity: Math.round(logisticsCapacity),
        importDemand: Math.round(importDemand),
        exportStrength: Math.round(exportStrength),
        tradeOpenness: roundPercent(openness * 100),
        autarkyPressure: roundPercent(autarkyPressure * 100),
        financialDepth: roundPercent(financialDepth * 100),
        scaleThroughput: roundPercent(scaleThroughput * 100)
      };
    }

    function recalculateTrade(data, options = {}) {
      const tradeVersion = tradeFormulaVersion(data, options);
      const tradeNetworkSnapshot = tradeVersion === "trade2027"
        ? calculateTradeNetwork(data, { includeLanes: false })
        : null;
      for (const id of Object.keys(data.trade || {})) {
        const next = calculateTradeForNation(data, id, {
          ...options,
          tradeFormulaVersion: tradeVersion,
          tradeNetworkSnapshot
        });
        if (next) data.trade[id] = { ...data.trade[id], ...next };
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

    return {
      TRADE_FORMULAS,
      calculateTradeForNation,
      calculateTradeNetwork,
      previewTradeAnchorPlan,
      applyTradeAnchorPlan,
      ensureTradeV3Baseline,
      setTargetedTariff,
      clearTargetedTariff,
      setExportAnchor,
      clearExportAnchor,
      setImportAnchor,
      clearImportAnchor,
      setLanePolicy,
      clearLanePolicy,
      recalculateTrade,
      tradeTierForFlow
    };
  };
})();
