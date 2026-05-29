(function () {
  const STORAGE_KEY = "aggs-operations-state-v4";

  const HEALTH_GROWTH = { Depression: -3, Recession: -2, Slowdown: -1, Recovery: 1, Expansion: 2, Prosperity: 3 };
  const HEALTH_POPULATION = { Prosperity: 2, Expansion: 1.5, Recovery: 1, Slowdown: 0.5, Recession: -1, Depression: -2 };
  const HEALTH_BUDGET = { Prosperity: 1.1, Expansion: 1.05, Recovery: 1, Slowdown: 0.9, Recession: 0.8, Depression: 0.6 };
  const HEALTH_TRADE = { Prosperity: 5, Expansion: 3.5, Recovery: 2, Slowdown: -2, Recession: -5, Depression: -10 };
  const CHILD_POLICY = { "5 Child Policy": 5, "4 Child Policy": 3.75, "3 Child Policy": 2.5, "2 Child Policy": 0.5, "1 Child Policy": 0.25, "No Policy": 0 };
  const MOBILIZATION = {
    None: { militaryGrowthMultiplier: 0.25, civilianPenalty: 0, militaryFactoryMultiplier: 0.4, maintenanceCost: 1, supplyMultiplier: 1 },
    Partial: { militaryGrowthMultiplier: 0.5, civilianPenalty: -0.2, militaryFactoryMultiplier: 0.6, maintenanceCost: 1.5, supplyMultiplier: 1.25 },
    Full: { militaryGrowthMultiplier: 1, civilianPenalty: -0.4, militaryFactoryMultiplier: 0.8, maintenanceCost: 2, supplyMultiplier: 1.5 },
    Total: { militaryGrowthMultiplier: 1.5, civilianPenalty: -0.6, militaryFactoryMultiplier: 1, maintenanceCost: 3, supplyMultiplier: 2 }
  };
  const TRADE_POLICY = { Protectionist: { efficiency: -15, capacity: -10 }, Balanced: { efficiency: 0, capacity: 0 }, "Open Market": { efficiency: 10, capacity: 8 }, "Free Trade": { efficiency: 20, capacity: 15 } };
  const SANCTIONS = {
    None: { efficiency: 0, capacity: 0, flow: 0, balance: 0 },
    Light: { efficiency: -10, capacity: -5, flow: -15, balance: -20 },
    Moderate: { efficiency: -25, capacity: -15, flow: -30, balance: -40 },
    Heavy: { efficiency: -45, capacity: -30, flow: -50, balance: -60 },
    Total: { efficiency: -70, capacity: -50, flow: -80, balance: -85 }
  };
  const COMPLEXITY = { 1: 3, 2: 2, 3: 1.5, 4: 1, 5: 0.8, 6: 0.5, 7: 0.35, 8: 0.25, 9: 0.15, 10: 0.1, 11: 0.05 };
  const DEBT_RULES = {
    baseInterestRate: 2,
    repaymentShare: 0.25,
    maxDebtPaydownRate: 0.1
  };
  const HEALTH_INTEREST_RISK = { Prosperity: 0, Expansion: 0, Recovery: 0, Slowdown: 1, Recession: 3, Depression: 6 };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function number(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[% ,]/g, ""));
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isBlank(value) {
    return value === null || value === undefined || value === "";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundCurrency(value) {
    return Math.round(number(value, 0));
  }

  function roundPercent(value) {
    return Number(number(value, 0).toFixed(2));
  }

  function ensureState(data = {}) {
    data.meta = data.meta || {};
    data.meta.title = data.meta.title || "AG-GS Global Ledger";
    data.meta.currentYear = number(data.meta.currentYear, 2021);
    data.meta.worldEconomicHealth = data.meta.worldEconomicHealth || "Expansion";
    data.meta.hiddenNationIds = Array.isArray(data.meta.hiddenNationIds) ? data.meta.hiddenNationIds : [];
    data.meta.archivedNationIds = Array.isArray(data.meta.archivedNationIds) ? data.meta.archivedNationIds : [];
    data.meta.lastSimulationLog = data.meta.lastSimulationLog || [];
    data.meta.changeHistory = Array.isArray(data.meta.changeHistory) ? data.meta.changeHistory : [];
    data.meta.updatedAt = data.meta.updatedAt || new Date().toISOString();
    data.nations = Array.isArray(data.nations) ? data.nations : [];
    ["national", "trade", "industrial", "population", "military", "intelligence", "naval", "eclipse", "elections"].forEach((key) => {
      data[key] = data[key] && typeof data[key] === "object" && !Array.isArray(data[key]) ? data[key] : {};
    });
    ["populationColumns", "equipmentCosts", "eraMultipliers", "costAdditionModifiers", "costReductionModifiers"].forEach((key) => {
      data[key] = Array.isArray(data[key]) ? data[key] : [];
    });
    return data;
  }

  function hiddenNationIds(data) {
    return new Set(data.meta?.hiddenNationIds || []);
  }

  function archivedNationIds(data) {
    return new Set(data.meta?.archivedNationIds || []);
  }

  function inactiveNationIds(data) {
    return new Set([...hiddenNationIds(data), ...archivedNationIds(data)]);
  }

  function visibleNations(data) {
    const inactive = inactiveNationIds(data);
    return (data.nations || []).filter((nation) => !inactive.has(nation.id));
  }

  function visibleNationIds(data) {
    return visibleNations(data).map((nation) => nation.id);
  }

  function archivedNations(data) {
    const archived = archivedNationIds(data);
    return (data.nations || []).filter((nation) => archived.has(nation.id));
  }

  function uniqueIds(ids) {
    return [...new Set((ids || []).filter(Boolean))];
  }

  function archiveNation(data, id) {
    ensureState(data);
    if (!data.nations.some((nation) => nation.id === id)) return false;
    data.meta.archivedNationIds = uniqueIds([...(data.meta.archivedNationIds || []), id]);
    data.meta.updatedAt = new Date().toISOString();
    return true;
  }

  function restoreNation(data, id) {
    ensureState(data);
    if (!data.nations.some((nation) => nation.id === id)) return false;
    const archived = archivedNationIds(data);
    if (!archived.has(id)) return false;
    data.meta.archivedNationIds = uniqueIds((data.meta.archivedNationIds || []).filter((archivedId) => archivedId !== id));
    data.meta.updatedAt = new Date().toISOString();
    return true;
  }

  function load(baseData) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return ensureState(JSON.parse(saved));
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return ensureState(clone(baseData));
  }

  function save(data, options = {}) {
    if (options.touch !== false) data.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function reset(baseData) {
    localStorage.removeItem(STORAGE_KEY);
    return ensureState(clone(baseData));
  }

  function getPopulation(data, id, year = data.meta.currentYear) {
    const row = data.population[id];
    if (!row) return 0;
    const key = String(year);
    if (row.values && row.values[key] !== undefined) return number(row.values[key], 0);
    const years = Object.keys(row.values || {}).map(Number).filter(Number.isFinite).sort((a, b) => b - a);
    return years.length ? number(row.values[String(years[0])], 0) : 0;
  }

  function setPopulation(data, id, year, value) {
    if (!data.population[id]) data.population[id] = { mandatoryChildPolicy: "No Policy", values: {} };
    data.population[id].values[String(year)] = Math.round(value);
    const key = String(year);
    if (!data.populationColumns.some((column) => column.key === key)) {
      data.populationColumns.unshift({ key, label: `Population (${year})` });
    }
  }

  function currentPopulationKey(data) {
    return String(data.meta.currentYear || 2021);
  }

  function complexityMultiplier(level) {
    const value = clamp(number(level, 4), 1, 11);
    const floor = Math.floor(value);
    const ceil = Math.ceil(value);
    if (floor === ceil) return COMPLEXITY[floor] || COMPLEXITY[4];
    const fraction = value - floor;
    return (COMPLEXITY[floor] || COMPLEXITY[4]) + ((COMPLEXITY[ceil] || COMPLEXITY[4]) - (COMPLEXITY[floor] || COMPLEXITY[4])) * fraction;
  }

  function maxComplexityForDevelopment(developmentLevel) {
    const dev = number(developmentLevel, 1);
    if (dev <= 1) return 1;
    if (dev >= 20) return 11;
    return 1 + 10 * Math.pow((dev - 1) / 19, 1.5);
  }

  function calculateTradeForNation(data, id) {
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

  function recalculateTrade(data) {
    for (const id of Object.keys(data.trade || {})) {
      const next = calculateTradeForNation(data, id);
      if (next) data.trade[id] = { ...data.trade[id], ...next };
    }
    return data;
  }

  function calculateBudgetForNation(data, id) {
    const national = data.national[id];
    const industrial = data.industrial[id];
    const military = data.military[id];
    const trade = data.trade[id];
    if (!national || !industrial || !military || !trade) return null;

    const civFactories = number(industrial.civilianFactories, 0);
    const militaryFactories = number(industrial.militaryFactories, 0);
    const shipyards = number(industrial.shipyards, 0);
    const developmentLevel = number(national.developmentLevel, 0);
    const population = getPopulation(data, id);
    const corruption = number(national.corruption, 0);
    const economicHealth = national.economicHealth || "Recovery";
    const taxRate = number(national.taxRate, 0);
    const mobilization = MOBILIZATION[military.mobilizationLevel || industrial.mobilizationLevel || "None"] || MOBILIZATION.None;
    const tradeBalance = number(trade.tradeBalance, 0);
    const effectiveContributionRate = 5 + developmentLevel * 0.75;
    const developmentMultiplier = 1 + developmentLevel * 0.25;
    const industrialContribution = ((civFactories * effectiveContributionRate) + (militaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) + (shipyards * effectiveContributionRate * 1.5)) / (1 + (civFactories + militaryFactories + shipyards) * 0.0025) * developmentMultiplier;
    const developmentImpact = Math.pow(developmentLevel / 10, 3) * (1 + developmentLevel / 20);
    const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));
    const populationContribution = (Math.log(Math.max(population, 1)) + population / 250000) * taxRateScalingFactor * developmentImpact * ((100 - corruption) / 100) * (HEALTH_BUDGET[economicHealth] || 1);
    const maintenanceCost = (civFactories + shipyards + militaryFactories * mobilization.maintenanceCost) * 0.1;
    const baseBudgetTotal = 10 + industrialContribution + populationContribution - maintenanceCost;
    const tradeImpactOnBudget = clamp(1 + (tradeBalance / Math.max(baseBudgetTotal, 100)) * 0.1, 0.1, 2);
    return Math.round(baseBudgetTotal * tradeImpactOnBudget) + number(national.budgetAdjustment, 0);
  }

  function debtRiskForPercent(debtPercent) {
    const debt = number(debtPercent, 0);
    if (debt >= 200) return 10;
    if (debt >= 100) return 6;
    if (debt >= 50) return 3;
    if (debt >= 25) return 1;
    return 0;
  }

  function stabilityRiskForPercent(stabilityPercent) {
    const stability = number(stabilityPercent, 100);
    if (stability < 40) return 3;
    if (stability < 60) return 2;
    if (stability < 75) return 1;
    return 0;
  }

  function corruptionRiskForPercent(corruptionPercent) {
    const corruption = number(corruptionPercent, 0);
    if (corruption >= 75) return 3;
    if (corruption >= 50) return 2;
    if (corruption >= 30) return 1;
    return 0;
  }

  function calculateFiscalForNation(data, id, options = {}) {
    const national = data.national?.[id];
    if (!national) return null;
    const budgetCapacity = roundCurrency(options.budgetCapacity ?? national.budgetCapacity);
    const budgetExpenditure = roundCurrency(national.budgetExpenditure);
    const debtPercent = Math.max(0, number(national.debt, 0));
    const debtPrincipal = roundCurrency(budgetCapacity * (debtPercent / 100));
    const debtRisk = debtRiskForPercent(debtPercent);
    const stabilityRisk = stabilityRiskForPercent(national.governmentalStability);
    const healthRisk = HEALTH_INTEREST_RISK[national.economicHealth] || 0;
    const corruptionRisk = corruptionRiskForPercent(national.corruption);
    const interestRate = roundPercent(DEBT_RULES.baseInterestRate + debtRisk + stabilityRisk + healthRisk + corruptionRisk);
    const debtService = roundCurrency(debtPrincipal * (interestRate / 100));
    const primaryBalance = roundCurrency(budgetCapacity - budgetExpenditure);
    const effectiveBalance = roundCurrency(primaryBalance - debtService);
    const surplusForRepayment = Math.max(effectiveBalance, 0);
    const repaymentShareLimit = roundCurrency(surplusForRepayment * DEBT_RULES.repaymentShare);
    const maxDebtPaydown = roundCurrency(debtPrincipal * DEBT_RULES.maxDebtPaydownRate);
    const repayment = Math.min(repaymentShareLimit, maxDebtPaydown, debtPrincipal);
    const deficitBorrowing = Math.max(-effectiveBalance, 0);
    const nextDebtPrincipal = Math.max(roundCurrency(debtPrincipal + deficitBorrowing - repayment), 0);
    const nextDebtPercent = budgetCapacity > 0 ? roundPercent((nextDebtPrincipal / budgetCapacity) * 100) : 0;
    const debtChange = roundCurrency(nextDebtPrincipal - debtPrincipal);
    return {
      budgetCapacity,
      budgetExpenditure,
      primaryBalance,
      debtPercent: roundPercent(debtPercent),
      debtPrincipal,
      interestRate,
      debtRisk,
      stabilityRisk,
      healthRisk,
      corruptionRisk,
      debtService,
      effectiveBalance,
      repaymentShareLimit,
      maxDebtPaydown,
      debtRepayment: repayment,
      deficitBorrowing,
      debtChange,
      nextDebtPrincipal,
      nextDebtPercent,
      repaymentShare: DEBT_RULES.repaymentShare * 100,
      maxDebtPaydownRate: DEBT_RULES.maxDebtPaydownRate * 100
    };
  }

  function applyFiscalFields(national, fiscal) {
    national.primaryBalance = fiscal.primaryBalance;
    national.debtPrincipal = fiscal.debtPrincipal;
    national.interestRate = fiscal.interestRate;
    national.debtRisk = fiscal.debtRisk;
    national.stabilityRisk = fiscal.stabilityRisk;
    national.healthRisk = fiscal.healthRisk;
    national.corruptionRisk = fiscal.corruptionRisk;
    national.debtService = fiscal.debtService;
    national.budgetBalance = fiscal.effectiveBalance;
    national.debtRepayment = fiscal.debtRepayment;
    national.deficitBorrowing = fiscal.deficitBorrowing;
    national.debtChange = fiscal.debtChange;
    national.projectedDebt = fiscal.nextDebtPercent;
    national.projectedDebtPrincipal = fiscal.nextDebtPrincipal;
    national.maxDebtPaydown = fiscal.maxDebtPaydown;
    national.repaymentShareLimit = fiscal.repaymentShareLimit;
  }

  function calculateAnnualDebtUpdate(data, id) {
    const fiscal = calculateFiscalForNation(data, id);
    if (!fiscal) return null;
    return {
      debtPrincipal: fiscal.debtPrincipal,
      interestRate: fiscal.interestRate,
      debtService: fiscal.debtService,
      effectiveBalance: fiscal.effectiveBalance,
      repayment: fiscal.debtRepayment,
      deficitBorrowing: fiscal.deficitBorrowing,
      nextDebtPrincipal: fiscal.nextDebtPrincipal,
      nextDebtPercent: fiscal.nextDebtPercent,
      debtChange: fiscal.debtChange
    };
  }

  function recalculateBudgets(data, options = {}) {
    const shouldUpdateDebt = options.updateDebt === true;
    for (const id of Object.keys(data.national || {})) {
      const national = data.national[id];
      const budgetCapacity = calculateBudgetForNation(data, id);
      if (budgetCapacity === null) continue;
      national.budgetCapacity = budgetCapacity;
      let fiscal = calculateFiscalForNation(data, id, { budgetCapacity });
      if (!fiscal) continue;
      applyFiscalFields(national, fiscal);
      if (shouldUpdateDebt) {
        national.debt = fiscal.nextDebtPercent;
        fiscal = calculateFiscalForNation(data, id, { budgetCapacity });
        if (fiscal) applyFiscalFields(national, fiscal);
      }
    }
    return data;
  }

  function advancePopulation(data, id, fromYear, toYear) {
    const national = data.national[id];
    const populationRow = data.population[id];
    if (!national || !populationRow) return null;
    const currentPopulation = getPopulation(data, id, fromYear);
    const economicHealth = national.economicHealth || "Recovery";
    if (!currentPopulation || !(economicHealth in HEALTH_POPULATION)) {
      setPopulation(data, id, toYear, currentPopulation);
      return { from: currentPopulation, to: currentPopulation, growthRate: 0 };
    }
    const stability = number(national.governmentalStability, 0);
    const unrest = number(national.publicUnrest, 0);
    const development = number(national.developmentLevel, 0);
    const immigrationRate = number(national.immigrationRate, 0);
    const policy = populationRow.mandatoryChildPolicy || "No Policy";
    const scalingFactor = Math.max(0.2, 1 - (Math.log10(currentPopulation) / Math.log10(175000000)) * 0.8);
    let developmentImpact = 0;
    if (development <= 7) developmentImpact = Math.min(0.1 * (7 - development), 0.5);
    else if (development >= 15) developmentImpact = Math.max(-0.1 * (development - 15), -0.5);
    const baseGrowth = HEALTH_POPULATION[economicHealth];
    const growthRate = (baseGrowth + (stability / 100) * baseGrowth + (CHILD_POLICY[policy] || 0) + developmentImpact + immigrationRate * 0.5 - unrest * 0.1) * scalingFactor;
    const nextPopulation = Math.round(currentPopulation * (1 + growthRate / 100));
    setPopulation(data, id, toYear, nextPopulation);
    return { from: currentPopulation, to: nextPopulation, growthRate };
  }

  function advanceIndustry(data, id, yearDifference = 1) {
    const industrial = data.industrial[id];
    const national = data.national[id];
    const trade = data.trade[id];
    const military = data.military[id];
    if (!industrial || !national || !trade) return null;
    const currentFactories = number(industrial.civilianFactories, 0);
    const currentMilitaryFactories = number(industrial.militaryFactories, 0);
    const currentShipyards = number(industrial.shipyards, 0);
    const healthStatus = national.economicHealth || "Recovery";
    if (!(healthStatus in HEALTH_GROWTH)) return null;
    const tradeBalance = number(trade.tradeBalance, 0);
    const mobilization = MOBILIZATION[military?.mobilizationLevel || industrial.mobilizationLevel || "None"] || MOBILIZATION.None;
    const impactFromHealth = HEALTH_GROWTH[healthStatus] * yearDifference;
    const totalIndustrialCapacity = currentFactories + currentMilitaryFactories * 0.5 + currentShipyards;
    const economicImpactScore = number(trade.economicImpactScore, 50);
    const tariffRate = number(trade.tariffRate, 5);
    const tradeVolatility = (tariffRate - 5) * 0.5;
    const importReliance = number(trade.importReliance, 0);
    const minimumImports = Math.max(currentFactories * 0.5 + 5, 5);
    const importDependencyPenalty = Math.max(0, importReliance - minimumImports) * 0.05;
    const developmentImportRatio = number(national.developmentLevel, 0) / Math.max(importReliance, 1);
    const industrialGrowthModifier = clamp(developmentImportRatio * 0.1, 0.5, 1.5);
    const tradeImpactScaling = 1 / (1 + totalIndustrialCapacity / 150);
    let impactFromTradeBalance = (tradeBalance / 1000) * (economicImpactScore / 50) * tradeImpactScaling * industrialGrowthModifier - Math.abs(tradeVolatility) * 0.1 - importDependencyPenalty;
    if (tradeBalance < 0) impactFromTradeBalance *= 1.5;
    impactFromTradeBalance = clamp(impactFromTradeBalance, -3, 5);
    const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
    industrial.civilianFactories = Math.max(currentFactories + Math.floor(baseGrowth * (1 + mobilization.civilianPenalty)), 0);
    industrial.militaryFactories = Math.max(currentMilitaryFactories + Math.floor(baseGrowth * mobilization.militaryGrowthMultiplier), 0);
    industrial.shipyards = Math.max(currentShipyards + Math.floor(baseGrowth / 3), 0);
    return {
      civilianFactories: industrial.civilianFactories - currentFactories,
      militaryFactories: industrial.militaryFactories - currentMilitaryFactories,
      shipyards: industrial.shipyards - currentShipyards
    };
  }

  function advanceMilitarySupply(data, id, months = 12) {
    const military = data.military[id];
    const industrial = data.industrial[id];
    const national = data.national[id];
    if (!military || !industrial || !national) return null;
    const currentSupply = number(military.militarySupply, 0);
    const mobilization = MOBILIZATION[military.mobilizationLevel || "None"] || MOBILIZATION.None;
    const techGap = Math.max(0, number(military.equipmentComplexity, 4) - maxComplexityForDevelopment(national.developmentLevel));
    const techGapPenalty = Math.max(0.05, 1 - techGap * (0.95 / 11));
    const monthlyIncrement = number(industrial.militaryFactories, 0) * 0.2 * mobilization.supplyMultiplier * complexityMultiplier(military.equipmentComplexity) * techGapPenalty * (1 + number(military.militaryOrganization, 0) * 0.01);
    military.militarySupply = Number((currentSupply + monthlyIncrement * months).toFixed(1));
    return military.militarySupply - currentSupply;
  }

  function recalculateAll(data, options = {}) {
    recalculateTrade(data);
    recalculateBudgets(data, options);
    recalculateTrade(data);
    return data;
  }

  function snapshot(data, year) {
    const ids = visibleNationIds(data);
    const totalPopulation = ids.reduce((total, id) => total + getPopulation(data, id, year), 0);
    const budgetCapacity = ids.reduce((total, id) => total + number(data.national?.[id]?.budgetCapacity, 0), 0);
    const tradeFlow = ids.reduce((total, id) => total + number(data.trade?.[id]?.tradeFlow, 0), 0);
    const militaryRows = ids.map((id) => data.military?.[id]).filter(Boolean);
    const militarySupplyAverage = militaryRows.reduce((total, row) => total + number(row.militarySupply, 0), 0) / Math.max(militaryRows.length, 1);
    return { year, totalPopulation, budgetCapacity, tradeFlow, militarySupplyAverage: Number(militarySupplyAverage.toFixed(1)) };
  }

  function advanceToYear(data, targetYear) {
    ensureState(data);
    const startYear = number(data.meta.currentYear, 2021);
    const endYear = number(targetYear, startYear);
    if (endYear <= startYear) return { ok: false, message: "Target year must be greater than the current year.", log: [] };
    const log = [];
    const activeNations = visibleNations(data);
    for (let year = startYear + 1; year <= endYear; year++) {
      for (const nation of activeNations) advancePopulation(data, nation.id, year - 1, year);
      data.meta.currentYear = year;
      recalculateTrade(data);
      for (const nation of activeNations) advanceIndustry(data, nation.id, 1);
      recalculateBudgets(data);
      recalculateTrade(data);
      recalculateBudgets(data, { updateDebt: true });
      recalculateTrade(data);
      recalculateBudgets(data);
      for (const nation of activeNations) advanceMilitarySupply(data, nation.id, 12);
      log.push(snapshot(data, year));
    }
    data.meta.lastSimulationLog = log;
    data.meta.updatedAt = new Date().toISOString();
    return { ok: true, message: `Advanced from ${startYear} to ${endYear}.`, log };
  }

  function updateValue(data, dataset, id, path, value) {
    if (dataset === "population") {
      if (!data.population[id]) data.population[id] = { mandatoryChildPolicy: "No Policy", values: {} };
      if (path === "mandatoryChildPolicy") data.population[id].mandatoryChildPolicy = value;
      else setPopulation(data, id, path, number(value, 0));
      return;
    }
    if (!data[dataset]) data[dataset] = {};
    if (Array.isArray(data[dataset])) {
      const row = data[dataset][number(id, -1)];
      if (row) row[path] = value;
      return;
    }
    if (!data[dataset][id]) data[dataset][id] = {};
    if (path.includes(".")) {
      const segments = path.split(".");
      let target = data[dataset][id];
      for (let i = 0; i < segments.length - 1; i++) target = target[segments[i]];
      target[segments[segments.length - 1]] = value;
    } else {
      data[dataset][id][path] = value;
    }
    if (dataset === "naval") {
      const fleet = data.naval[id];
      fleet.total = (fleet.categories || []).reduce(
        (total, category) => total + (category.ships || []).reduce((subtotal, ship) => subtotal + number(ship.count, 0), 0),
        0
      );
      fleet.totalNote = "Computed from editable class counts.";
    }
  }

  function exportDataJs(data) {
    return `window.AGGS_DATA = ${JSON.stringify(data, null, 2)};\n`;
  }

  window.AGGS_ENGINE = {
    load,
    save,
    reset,
    normalizeState: ensureState,
    clone,
    number,
    archivedNations,
    archiveNation,
    restoreNation,
    getPopulation,
    setPopulation,
    visibleNations,
    visibleNationIds,
    currentPopulationKey,
    calculateTradeForNation,
    calculateBudgetForNation,
    calculateFiscalForNation,
    calculateAnnualDebtUpdate,
    recalculateAll,
    recalculateTrade,
    recalculateBudgets,
    advanceToYear,
    updateValue,
    snapshot,
    exportDataJs,
    constants: { HEALTH_GROWTH, HEALTH_POPULATION, HEALTH_BUDGET, HEALTH_TRADE, CHILD_POLICY, MOBILIZATION, TRADE_POLICY, SANCTIONS, DEBT_RULES }
  };
})();
