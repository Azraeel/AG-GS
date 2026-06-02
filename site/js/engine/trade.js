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

    function importPoolFor(input, baselineInput = input, inputDemandScore = importDemandScore(input), baselineDemandScore = importDemandScore(baselineInput)) {
      const importShare = clamp(input.importReliance / Math.max(input.importReliance + input.exportReliance, 1), 0.25, 0.75);
      const baselinePool = Math.max(0, baselineInput.tradeFlow) * clamp(baselineInput.importReliance / Math.max(baselineInput.importReliance + baselineInput.exportReliance, 1), 0.25, 0.75);
      const demandRatio = inputDemandScore / Math.max(baselineDemandScore, 1);
      const tariffRatio = tariffDemandAccess(input.tariffRate) / Math.max(tariffDemandAccess(baselineInput.tariffRate), 0.01);
      return baselinePool * Math.max(0.35, demandRatio) * clamp(tariffRatio, 0.38, 1.08) * clamp(0.85 + importShare * 0.3, 0.9, 1.08);
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
      const trackLanes = includeLanes || hasExportAnchors(exportAnchors) || hasImportAnchors(importAnchors);
      const lanes = [];
      let nations = Object.fromEntries(ids.map((id) => [id, networkNationSeed(id, targetedTariffs, exportAnchors, importAnchors, lanePolicies)]));
      const demandScores = Object.fromEntries(ids.map((id) => [id, importDemandScore(inputsById[id])]));
      const baselineDemandScores = Object.fromEntries(ids.map((id) => [id, importDemandScore(inputsById[id].baselineInput || inputsById[id])]));
      const supplyScores = Object.fromEntries(ids.map((id) => [id, exportSupplyScore(inputsById[id])]));

      for (const importerId of ids) {
        const importer = inputsById[importerId];
        const exporters = ids.filter((id) => id !== importerId);
        if (!exporters.length) continue;
        const importerBaseline = inputsById[importerId].baselineInput || importer;
        const pool = importPoolFor(importer, importerBaseline, demandScores[importerId], baselineDemandScores[importerId]);
        const weighted = exporters.map((exporterId) => {
          const tariffRate = targetedTariffFor(targetedTariffs, importerId, exporterId, importer.tariffRate);
          const policy = lanePolicyFor(lanePolicies, importerId, exporterId);
          const baseWeight = supplyScores[exporterId] * laneTariffMultiplier(tariffRate);
          const policyMultiplier = lanePolicyMultiplier(policy);
          const weight = baseWeight * policyMultiplier;
          return { exporterId, tariffRate, policy, baseWeight, policyMultiplier, weight };
        });
        const totalBaseWeight = weighted.reduce((total, row) => total + row.baseWeight, 0) || 1;
        const deniedWeight = weighted.reduce((total, row) => total + row.baseWeight * (1 - row.policyMultiplier), 0);
        const policyAccess = clamp(1 - (deniedWeight / totalBaseWeight) * 0.82, 0.18, 1);
        const adjustedPool = pool * policyAccess;
        const totalWeight = weighted.reduce((total, row) => total + row.weight, 0) || 1;
        for (const row of weighted) {
          const flow = adjustedPool * (row.weight / totalWeight);
          const tariffRevenue = laneTariffRevenue(flow, row.tariffRate, importer);
          const importCost = flow * Math.max(0, row.tariffRate - importer.tariffRate) * 0.0022;
          if (trackLanes) {
            lanes.push({
              importerId,
              exporterId: row.exporterId,
              tariffRate: roundPercent(row.tariffRate),
              currentFlow: roundCurrency(flow),
              tariffRevenue: roundCurrency(tariffRevenue),
              importCost: roundCurrency(importCost),
              targeted: targetedTariffs?.[importerId]?.[row.exporterId] !== undefined,
              sanctionsLevel: row.policy.sanctionsLevel,
              embargoed: row.policy.embargo
            });
          }
          if (!trackLanes) {
            nations[importerId].importFlow += flow;
            nations[importerId].tariffRevenue += tariffRevenue;
            nations[importerId].importCost += importCost;
            nations[row.exporterId].exportFlow += flow;
          }
        }
      }

      if (trackLanes) {
        applyExportAnchorsToLanes(lanes, exportAnchors, lanePolicies);
        applyImportAnchorsToLanes(lanes, importAnchors, lanePolicies);
        nations = summarizeTrackedLanes(ids, lanes, targetedTariffs, exportAnchors, importAnchors, lanePolicies);
      } else {
        Object.values(nations).forEach((row) => {
          row.importFlow = roundCurrency(row.importFlow);
          row.exportFlow = roundCurrency(row.exportFlow);
          row.tariffRevenue = roundCurrency(row.tariffRevenue);
          row.importCost = roundCurrency(row.importCost);
        });
      }
      return { lanes: includeLanes ? lanes : [], nations };
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
      const exporterTotals = includeLanes
        ? currentFlows.lanes.reduce((totals, lane) => {
            totals[lane.exporterId] = (totals[lane.exporterId] || 0) + number(lane.currentFlow, 0);
            return totals;
          }, {})
        : {};
      const importerTotals = includeLanes
        ? currentFlows.lanes.reduce((totals, lane) => {
            totals[lane.importerId] = (totals[lane.importerId] || 0) + number(lane.currentFlow, 0);
            return totals;
          }, {})
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
              importerShare: roundPercent((number(lane.currentFlow, 0) / Math.max(importerTotals[lane.importerId] || 0, 1)) * 100),
              exporterShare: roundPercent((number(lane.currentFlow, 0) / Math.max(exporterTotals[lane.exporterId] || 0, 1)) * 100)
            };
          })
        : [];

      return { lanes, nations, baselineCreatedAt: baseline.createdAt };
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
