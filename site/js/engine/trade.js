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
      trade2026: "Trade v2 formula"
    };

    function tradeFormulaVersion(data, options = {}) {
      const version = options.tradeFormulaVersion || options.tradeVersion || data.meta?.tradeFormulaVersion || "legacy";
      return TRADE_FORMULAS[version] ? version : "legacy";
    }

    function calculateTradeForNation(data, id, options = {}) {
      return tradeFormulaVersion(data, options) === "trade2026"
        ? calculateTradeV2ForNation(data, id)
        : calculateLegacyTradeForNation(data, id);
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
      for (const id of Object.keys(data.trade || {})) {
        const next = calculateTradeForNation(data, id, options);
        if (next) data.trade[id] = { ...data.trade[id], ...next };
      }
      return data;
    }

    return {
      TRADE_FORMULAS,
      calculateTradeForNation,
      recalculateTrade,
      tradeTierForFlow
    };
  };
})();
