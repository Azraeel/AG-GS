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
  const BUDGET_FORMULAS = {
    legacy: "Legacy workbook formula",
    tax2026: "Tax calibration model"
  };
  const FISCAL_MODELS = {
    Standard: {
      sustainableTaxBonus: 0,
      pressureMultiplier: 1,
      collectionFloor: 0.25,
      avoidanceMultiplier: 1,
      collectionEfficiencyMultiplier: 1,
      taxYieldMultiplier: 1,
      populationPenaltyMultiplier: 1,
      immigrationPenaltyMultiplier: 1,
      industryPenaltyMultiplier: 1
    },
    "High Capacity State": {
      sustainableTaxBonus: 8,
      pressureMultiplier: 0.75,
      collectionFloor: 0.35,
      avoidanceMultiplier: 0.8,
      collectionEfficiencyMultiplier: 1.08,
      taxYieldMultiplier: 0.9,
      populationPenaltyMultiplier: 0.75,
      immigrationPenaltyMultiplier: 0.65,
      industryPenaltyMultiplier: 0.7
    },
    "Welfare State": {
      sustainableTaxBonus: 14,
      pressureMultiplier: 0.5,
      collectionFloor: 0.45,
      avoidanceMultiplier: 0.55,
      collectionEfficiencyMultiplier: 1.12,
      taxYieldMultiplier: 0.72,
      populationPenaltyMultiplier: 0.65,
      immigrationPenaltyMultiplier: 0.35,
      industryPenaltyMultiplier: 0.5
    },
    "Command Economy": {
      sustainableTaxBonus: 10,
      pressureMultiplier: 0.75,
      collectionFloor: 0.35,
      avoidanceMultiplier: 0.7,
      collectionEfficiencyMultiplier: 1.05,
      taxYieldMultiplier: 0.85,
      populationPenaltyMultiplier: 1.1,
      immigrationPenaltyMultiplier: 1.25,
      industryPenaltyMultiplier: 0.7
    },
    "Low Capacity State": {
      sustainableTaxBonus: -5,
      pressureMultiplier: 1.35,
      collectionFloor: 0.2,
      avoidanceMultiplier: 1.25,
      collectionEfficiencyMultiplier: 0.85,
      taxYieldMultiplier: 0.9,
      populationPenaltyMultiplier: 1.25,
      immigrationPenaltyMultiplier: 1.25,
      industryPenaltyMultiplier: 1.25
    },
    "Extractive State": {
      sustainableTaxBonus: 6,
      pressureMultiplier: 1.45,
      collectionFloor: 0.25,
      avoidanceMultiplier: 1.15,
      collectionEfficiencyMultiplier: 1.05,
      taxYieldMultiplier: 1,
      populationPenaltyMultiplier: 1.35,
      immigrationPenaltyMultiplier: 1.6,
      industryPenaltyMultiplier: 1.4
    }
  };
  const HEALTH_INTEREST_RISK = { Prosperity: 0, Expansion: 0, Recovery: 0, Slowdown: 1, Recession: 3, Depression: 6 };
  const SANCTIONS_INTEREST_RISK = { None: 0, Light: 1, Moderate: 2, Heavy: 4, Total: 7 };
  const MOBILIZATION_INTEREST_RISK = { None: 0, Partial: 1, Full: 2, Total: 4 };

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
    data.meta.budgetFormulaVersion = data.meta.budgetFormulaVersion || "legacy";
    data.meta.archivedNationIds = Array.isArray(data.meta.archivedNationIds) ? data.meta.archivedNationIds : [];
    data.meta.lastSimulationLog = data.meta.lastSimulationLog || [];
    data.meta.changeHistory = Array.isArray(data.meta.changeHistory) ? data.meta.changeHistory : [];
    data.meta.updatedAt = data.meta.updatedAt || new Date().toISOString();
    data.nations = Array.isArray(data.nations) ? data.nations : [];
    ["national", "trade", "industrial", "population", "military", "intelligence", "naval", "equipmentDesigns", "eclipse", "elections"].forEach((key) => {
      data[key] = data[key] && typeof data[key] === "object" && !Array.isArray(data[key]) ? data[key] : {};
    });
    ["populationColumns", "equipmentCosts", "eraMultipliers", "costAdditionModifiers", "costReductionModifiers"].forEach((key) => {
      data[key] = Array.isArray(data[key]) ? data[key] : [];
    });
    return data;
  }

  function archivedNationIds(data) {
    return new Set(data.meta?.archivedNationIds || []);
  }

  function inactiveNationIds(data) {
    return archivedNationIds(data);
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

  function budgetFormulaVersion(data, options = {}) {
    const version = options.version || data.meta?.budgetFormulaVersion || "legacy";
    return BUDGET_FORMULAS[version] ? version : "legacy";
  }

  function normalizeFiscalModel(value) {
    return FISCAL_MODELS[value] ? value : "";
  }

  function fiscalModelForNation(data, id, national = data.national?.[id]) {
    const explicit = normalizeFiscalModel(national?.fiscalModel);
    if (explicit) return explicit;
    const industrial = data.industrial?.[id] || {};
    const taxRate = number(national?.taxRate, 0);
    const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
    const development = number(national?.developmentLevel, 0);
    const stability = number(national?.governmentalStability, 0);
    const health = national?.economicHealth || "Recovery";
    const industrialScale = number(industrial.civilianFactories, 0) + number(industrial.militaryFactories, 0) + number(industrial.shipyards, 0);
    const isStrongEconomy = ["Prosperity", "Expansion"].includes(health);
    const isHighCapacity = development >= 18 && stability >= 85 && isStrongEconomy && industrialScale >= 650;
    if (isHighCapacity && taxRatePercent >= 24) return "Welfare State";
    if (isHighCapacity) return "High Capacity State";
    return "Standard";
  }

  function budgetInputsForNation(data, id) {
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
    const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
    const fiscalModel = fiscalModelForNation(data, id, national);
    const fiscalProfile = FISCAL_MODELS[fiscalModel] || FISCAL_MODELS.Standard;
    const mobilization = MOBILIZATION[military.mobilizationLevel || industrial.mobilizationLevel || "None"] || MOBILIZATION.None;
    const tradeBalance = number(trade.tradeBalance, 0);
    const stability = number(national.governmentalStability, 70);
    return {
      national,
      industrial,
      military,
      trade,
      civFactories,
      militaryFactories,
      shipyards,
      developmentLevel,
      population,
      corruption,
      economicHealth,
      taxRate,
      taxRatePercent,
      fiscalModel,
      fiscalProfile,
      mobilization,
      tradeBalance,
      stability
    };
  }

  function calculateTaxBurdenForNation(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const { taxRatePercent, developmentLevel, corruption, economicHealth, stability, national, fiscalModel, fiscalProfile } = inputs;
    const sustainableTaxRate = roundPercent(clamp(8 + developmentLevel * 0.8 + fiscalProfile.sustainableTaxBonus, 5, 48));
    const taxPressure = roundPercent(Math.max(0, taxRatePercent - sustainableTaxRate));
    const healthPressure = { Prosperity: 0.75, Expansion: 0.9, Recovery: 1, Slowdown: 1.35, Recession: 1.75, Depression: 2.25 }[economicHealth] || 1;
    const stabilityPressure = 1 + clamp((70 - stability) / 60, 0, 1.25);
    const corruptionPressure = 1 + clamp(corruption / 180, 0, 0.75);
    const pressureScore = roundPercent(taxPressure * healthPressure * stabilityPressure * corruptionPressure * fiscalProfile.pressureMultiplier);
    let tier = "Stable";
    if (pressureScore > 16) tier = "Crisis";
    else if (pressureScore > 9) tier = "Volatile";
    else if (pressureScore > 4) tier = "Agitated";
    else if (taxPressure > 0) tier = "Strained";

    const baseUnrestChange = tier === "Crisis" ? 3 : tier === "Volatile" ? 2 : tier === "Agitated" ? 1 : 0;
    const currentUnrest = clamp(number(national.publicUnrest, 0), 0, 10);
    const suggestedUnrestChange = clamp(baseUnrestChange, 0, Math.max(0, 10 - currentUnrest));
    const saturationMultiplier = clamp(1 / (1 + pressureScore * 0.08), fiscalProfile.collectionFloor, 1);
    const avoidanceMultiplier = clamp(1 - taxPressure * (0.005 + corruption / 12000) * fiscalProfile.avoidanceMultiplier, 0.45, 1);
    const collectionMultiplier = roundPercent(clamp(saturationMultiplier * avoidanceMultiplier, 0.25, 1));
    const populationGrowthPenalty = roundPercent(clamp(taxPressure * 0.08 * healthPressure * fiscalProfile.populationPenaltyMultiplier, 0, 3));
    const immigrationPenalty = roundPercent(clamp(Math.max(0, taxPressure - 4) * 0.08 * healthPressure * fiscalProfile.immigrationPenaltyMultiplier, 0, 3));
    const industryGrowthMultiplier = roundPercent(clamp(1 - taxPressure * 0.025 * healthPressure * fiscalProfile.industryPenaltyMultiplier, 0.35, 1));
    const warnings = [];
    if (fiscalModel !== "Standard") warnings.push(`${fiscalModel} fiscal model is moderating the tax burden.`);
    if (taxPressure > 0) warnings.push(`Tax rate is ${roundPercent(taxPressure)} points above the sustainable rate.`);
    if (suggestedUnrestChange > 0) warnings.push(`Consider +${suggestedUnrestChange} public unrest if this tax level persists.`);
    if (collectionMultiplier < 0.8) warnings.push("High tax pressure is reducing collection efficiency.");
    if (populationGrowthPenalty > 0) warnings.push("Population growth and immigration are under tax pressure.");
    if (industryGrowthMultiplier < 0.9) warnings.push("Long-term industry growth is under tax pressure.");

    return {
      taxRatePercent: roundPercent(taxRatePercent),
      fiscalModel,
      sustainableTaxRate,
      taxPressure,
      pressureScore,
      tier,
      suggestedUnrestChange,
      currentUnrest,
      collectionMultiplier,
      populationGrowthPenalty,
      immigrationPenalty,
      industryGrowthMultiplier,
      warnings
    };
  }

  function calculateTariffRevenueForNation(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const { national, trade, developmentLevel, corruption, stability } = inputs;
    const tariffRate = clamp(number(trade.tariffRate, 0), 0, 50);
    const tradeFlow = Math.max(0, number(trade.tradeFlow, 0));
    const importReliance = Math.max(0, number(trade.importReliance, 0));
    const exportReliance = Math.max(0, number(trade.exportReliance, 0));
    const importExposure = clamp(importReliance / Math.max(importReliance + exportReliance, 1), 0.05, 0.95);
    const frictionMultiplier = clamp(1 - Math.pow(tariffRate / 70, 1.25), 0.22, 1);
    const collectionMultiplier = clamp(0.45 + developmentLevel / 30 + stability / 250 - corruption / 250, 0.25, 1.15);
    const policyMultiplier = (TRADE_POLICY[trade.tradePolicy || "Balanced"] || TRADE_POLICY.Balanced).efficiency >= 10 ? 1.05 : 1;
    const sanctionsMultiplier = trade.sanctionsLevel === "None" ? 1 : trade.sanctionsLevel === "Light" ? 0.9 : trade.sanctionsLevel === "Moderate" ? 0.75 : trade.sanctionsLevel === "Heavy" ? 0.55 : 0.35;
    const tariffRevenue = roundCurrency(tradeFlow * importExposure * (tariffRate / 100) * frictionMultiplier * collectionMultiplier * policyMultiplier * sanctionsMultiplier);
    let tier = "Stable";
    if (tariffRate >= 45) tier = "Shock";
    else if (tariffRate >= 30) tier = "Distortion";
    else if (tariffRate >= 15) tier = "Friction";
    else if (tariffRate > 5) tier = "Revenue";
    const warnings = [];
    if (tariffRate >= 15) warnings.push("High tariffs are creating trade friction and avoidance.");
    if (frictionMultiplier < 0.75) warnings.push("Diminishing returns are reducing tariff yield.");
    if (trade.sanctionsLevel && trade.sanctionsLevel !== "None") warnings.push("Sanctions are reducing collectible tariff volume.");
    if ((national.economicHealth === "Recession" || national.economicHealth === "Depression") && tariffRate >= 10) warnings.push("Tariffs during weak economic health may worsen trade conditions.");
    return {
      tariffRate,
      tariffRevenue,
      tradeFlow,
      importExposure: roundPercent(importExposure * 100),
      frictionMultiplier,
      collectionMultiplier,
      tier,
      warnings
    };
  }

  function applyTaxBurdenUnrestSuggestion(data, id) {
    const national = data.national?.[id];
    if (!national) return { applied: false, before: 0, after: 0, delta: 0, message: "Nation has no national record." };
    const burden = calculateTaxBurdenForNation(data, id);
    const before = clamp(number(national.publicUnrest, 0), 0, 10);
    const delta = clamp(Math.round(number(burden?.suggestedUnrestChange, 0)), 0, 10 - before);
    if (delta <= 0) return { applied: false, before, after: before, delta: 0, burden, message: "No unrest suggestion is currently available." };
    const after = before + delta;
    national.publicUnrest = after;
    data.meta.updatedAt = new Date().toISOString();
    return { applied: true, before, after, delta, burden, message: `Applied +${delta} public unrest.` };
  }

  function industrialBudgetContribution(inputs) {
    const { civFactories, militaryFactories, shipyards, developmentLevel, mobilization } = inputs;
    const effectiveContributionRate = 5 + developmentLevel * 0.75;
    const developmentMultiplier = 1 + developmentLevel * 0.25;
    return ((civFactories * effectiveContributionRate) + (militaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) + (shipyards * effectiveContributionRate * 1.5)) / (1 + (civFactories + militaryFactories + shipyards) * 0.0025) * developmentMultiplier;
  }

  function budgetCapacityFromBreakdown(inputs, industrialContribution, populationContribution, tariffRevenue = 0) {
    const { civFactories, militaryFactories, shipyards, mobilization, national, tradeBalance } = inputs;
    const maintenanceCost = (civFactories + shipyards + militaryFactories * mobilization.maintenanceCost) * 0.1;
    const baseBudgetTotal = 10 + industrialContribution + populationContribution + tariffRevenue - maintenanceCost;
    const tradeImpactOnBudget = clamp(1 + (tradeBalance / Math.max(baseBudgetTotal, 100)) * 0.1, 0.1, 2);
    const budgetCapacity = Math.max(0, Math.round(baseBudgetTotal * tradeImpactOnBudget) + number(national.budgetAdjustment, 0));
    return {
      budgetCapacity,
      industrialContribution,
      populationContribution,
      tariffRevenue,
      maintenanceCost,
      baseBudgetTotal,
      tradeImpactOnBudget
    };
  }

  function legacyBudgetBreakdown(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const { developmentLevel, population, taxRate, corruption, economicHealth } = inputs;
    const developmentImpact = Math.pow(developmentLevel / 10, 3) * (1 + developmentLevel / 20);
    const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));
    const populationContribution = (Math.log(Math.max(population, 1)) + population / 250000) * taxRateScalingFactor * developmentImpact * ((100 - corruption) / 100) * (HEALTH_BUDGET[economicHealth] || 1);
    return {
      formulaVersion: "legacy",
      taxRevenue: populationContribution,
      ...budgetCapacityFromBreakdown(inputs, industrialBudgetContribution(inputs), populationContribution)
    };
  }

  function tax2026BudgetBreakdown(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const { developmentLevel, population, taxRatePercent, corruption, economicHealth, stability, fiscalProfile } = inputs;
    const taxBurden = calculateTaxBurdenForNation(data, id);
    const tariff = calculateTariffRevenueForNation(data, id);
    const developmentCollection = clamp(0.18 + Math.pow(clamp(developmentLevel, 0, 20) / 20, 1.35) * 0.95, 0.18, 1.15);
    const stabilityFactor = clamp(0.55 + stability / 200, 0.4, 1.1);
    const corruptionFactor = clamp((100 - corruption) / 100, 0.05, 1);
    const healthFactor = HEALTH_BUDGET[economicHealth] || 1;
    const collectionEfficiency = clamp(developmentCollection * stabilityFactor * corruptionFactor * healthFactor * fiscalProfile.collectionEfficiencyMultiplier, 0.05, 1.35);
    const taxDrag = taxBurden?.collectionMultiplier ?? 1;
    const taxRevenue = (population / 125000) * clamp(taxRatePercent, 0, 60) * collectionEfficiency * taxDrag * fiscalProfile.taxYieldMultiplier;
    const legacyPopulationContribution = legacyBudgetBreakdown(data, id)?.populationContribution || 0;
    const populationContribution = Math.max(legacyPopulationContribution, taxRevenue);
    return {
      formulaVersion: "tax2026",
      taxRevenue,
      developmentCollection,
      collectionEfficiency,
      taxDrag,
      taxBurden,
      tariff,
      ...budgetCapacityFromBreakdown(inputs, industrialBudgetContribution(inputs), populationContribution, tariff?.tariffRevenue || 0)
    };
  }

  function calculateBudgetBreakdownForNation(data, id, options = {}) {
    return budgetFormulaVersion(data, options) === "tax2026"
      ? tax2026BudgetBreakdown(data, id)
      : legacyBudgetBreakdown(data, id);
  }

  function calculateBudgetForNation(data, id, options = {}) {
    const breakdown = calculateBudgetBreakdownForNation(data, id, options);
    return breakdown ? breakdown.budgetCapacity : null;
  }

  const fiscalFactory = window.AGGS_ENGINE_MODULES?.createFiscal;
  if (!fiscalFactory) throw new Error("AG-GS fiscal engine module failed to load.");
  const {
    calculateFiscalForNation,
    calculateAnnualDebtUpdate,
    recalculateBudgets
  } = fiscalFactory({
    number,
    roundCurrency,
    roundPercent,
    DEBT_RULES,
    HEALTH_INTEREST_RISK,
    SANCTIONS_INTEREST_RISK,
    MOBILIZATION_INTEREST_RISK,
    calculateBudgetForNation
  });

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
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};
    const effectiveImmigrationRate = immigrationRate - number(taxBurden.immigrationPenalty, 0);
    const policy = populationRow.mandatoryChildPolicy || "No Policy";
    const scalingFactor = Math.max(0.2, 1 - (Math.log10(currentPopulation) / Math.log10(175000000)) * 0.8);
    let developmentImpact = 0;
    if (development <= 7) developmentImpact = Math.min(0.1 * (7 - development), 0.5);
    else if (development >= 15) developmentImpact = Math.max(-0.1 * (development - 15), -0.5);
    const baseGrowth = HEALTH_POPULATION[economicHealth];
    const growthRate = (baseGrowth + (stability / 100) * baseGrowth + (CHILD_POLICY[policy] || 0) + developmentImpact + effectiveImmigrationRate * 0.5 - unrest * 0.1 - number(taxBurden.populationGrowthPenalty, 0)) * scalingFactor;
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
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};
    const growthMultiplier = number(taxBurden.industryGrowthMultiplier, 1) || 1;
    const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0) * growthMultiplier;
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

  function solveExpenditureForBalance(data, id, budgetCapacity, targetBalance) {
    const working = ensureState(clone(data));
    const national = working.national?.[id];
    if (!national) return null;
    national.budgetCapacity = roundCurrency(budgetCapacity);
    let budgetExpenditure = roundCurrency(national.budgetExpenditure);
    for (let index = 0; index < 6; index += 1) {
      const fiscal = calculateFiscalForNation(working, id, { budgetCapacity, budgetExpenditure });
      if (!fiscal) return null;
      const nextExpenditure = Math.max(0, roundCurrency(budgetCapacity - fiscal.debtService - targetBalance));
      if (Math.abs(nextExpenditure - budgetExpenditure) <= 1) {
        budgetExpenditure = nextExpenditure;
        break;
      }
      budgetExpenditure = nextExpenditure;
    }
    const fiscal = calculateFiscalForNation(working, id, { budgetCapacity, budgetExpenditure });
    return fiscal ? { budgetExpenditure, fiscal } : null;
  }

  function previewBudgetRebalance(data) {
    const current = ensureState(clone(data));
    const fromFormulaVersion = budgetFormulaVersion(current);

    const modeled = ensureState(clone(data));
    modeled.meta.budgetFormulaVersion = "tax2026";
    recalculateAll(modeled, { budgetFormulaVersion: "tax2026" });

    const rows = visibleNationIds(current).map((id) => {
      const nation = current.nations.find((entry) => entry.id === id) || { id, name: id };
      const currentNational = current.national[id] || {};
      const modeledNational = modeled.national[id] || {};
      const oldBudgetCapacity = roundCurrency(currentNational.budgetCapacity);
      const oldBudgetExpenditure = roundCurrency(currentNational.budgetExpenditure);
      const oldBudgetBalance = roundCurrency(currentNational.budgetBalance);
      const oldPrimaryBalance = roundCurrency(currentNational.primaryBalance ?? oldBudgetCapacity - oldBudgetExpenditure);
      const newBudgetCapacity = roundCurrency(modeledNational.budgetCapacity);
      const solved = solveExpenditureForBalance(modeled, id, newBudgetCapacity, oldBudgetBalance);
      const newBudgetExpenditure = solved ? solved.budgetExpenditure : Math.max(0, roundCurrency(newBudgetCapacity - oldPrimaryBalance));
      const appliedBudgetBalance = solved ? solved.fiscal.effectiveBalance : roundCurrency(newBudgetCapacity - newBudgetExpenditure);
      const breakdown = calculateBudgetBreakdownForNation(modeled, id, { version: "tax2026" }) || {};
      const taxBurden = breakdown.taxBurden || calculateTaxBurdenForNation(modeled, id) || {};
      return {
        id,
        name: nation.name,
        color: nation.color,
        oldBudgetCapacity,
        newBudgetCapacity,
        budgetCapacityDelta: roundCurrency(newBudgetCapacity - oldBudgetCapacity),
        oldBudgetExpenditure,
        newBudgetExpenditure,
        budgetExpenditureDelta: roundCurrency(newBudgetExpenditure - oldBudgetExpenditure),
        oldBudgetBalance,
        appliedBudgetBalance,
        budgetBalanceDelta: roundCurrency(appliedBudgetBalance - oldBudgetBalance),
        oldPrimaryBalance,
        newPrimaryBalance: roundCurrency(newBudgetCapacity - newBudgetExpenditure),
        taxRevenue: roundCurrency(breakdown.taxRevenue),
        tariffRevenue: roundCurrency(breakdown.tariffRevenue),
        collectionEfficiency: roundPercent((breakdown.collectionEfficiency || 0) * 100),
        taxDrag: roundPercent((breakdown.taxDrag || 1) * 100),
        fiscalModel: taxBurden.fiscalModel,
        taxRatePercent: taxBurden.taxRatePercent,
        sustainableTaxRate: taxBurden.sustainableTaxRate,
        taxBurdenTier: taxBurden.tier,
        taxPressure: taxBurden.taxPressure,
        suggestedUnrestChange: taxBurden.suggestedUnrestChange,
        collectionMultiplier: roundPercent((taxBurden.collectionMultiplier || 1) * 100),
        populationGrowthPenalty: taxBurden.populationGrowthPenalty,
        industryGrowthMultiplier: roundPercent((taxBurden.industryGrowthMultiplier || 1) * 100),
        taxBurdenWarnings: taxBurden.warnings || []
      };
    });

    const totals = rows.reduce((total, row) => {
      total.currentBudgetCapacity += row.oldBudgetCapacity;
      total.modeledBudgetCapacity += row.newBudgetCapacity;
      total.budgetCapacityDelta += row.budgetCapacityDelta;
      total.currentExpenditure += row.oldBudgetExpenditure;
      total.newExpenditure += row.newBudgetExpenditure;
      total.expenditureDelta += row.budgetExpenditureDelta;
      total.balanceDelta += row.budgetBalanceDelta;
      return total;
    }, {
      currentBudgetCapacity: 0,
      modeledBudgetCapacity: 0,
      budgetCapacityDelta: 0,
      currentExpenditure: 0,
      newExpenditure: 0,
      expenditureDelta: 0,
      balanceDelta: 0
    });

    Object.keys(totals).forEach((key) => {
      totals[key] = roundCurrency(totals[key]);
    });

    return {
      fromFormulaVersion,
      formulaVersion: "tax2026",
      generatedAt: new Date().toISOString(),
      rows,
      totals
    };
  }

  function applyBudgetRebalance(data) {
    ensureState(data);
    const preview = previewBudgetRebalance(data);
    data.meta.budgetFormulaVersion = "tax2026";
    for (const row of preview.rows) {
      if (data.national?.[row.id]) {
        data.national[row.id].budgetExpenditure = row.newBudgetExpenditure;
      }
    }
    recalculateAll(data, { budgetFormulaVersion: "tax2026" });
    const appliedAt = new Date().toISOString();
    const rows = preview.rows.map((row) => {
      const national = data.national?.[row.id] || {};
      return {
        ...row,
        newBudgetCapacity: roundCurrency(national.budgetCapacity ?? row.newBudgetCapacity),
        newBudgetExpenditure: roundCurrency(national.budgetExpenditure ?? row.newBudgetExpenditure),
        appliedBudgetBalance: roundCurrency(national.budgetBalance ?? row.appliedBudgetBalance),
        budgetBalanceDelta: roundCurrency((national.budgetBalance ?? row.appliedBudgetBalance) - row.oldBudgetBalance)
      };
    });
    data.meta.lastBudgetRebalance = {
      appliedAt,
      fromFormulaVersion: preview.fromFormulaVersion,
      formulaVersion: preview.formulaVersion,
      rowCount: rows.length,
      totals: preview.totals
    };
    data.meta.updatedAt = appliedAt;
    return { ...preview, appliedAt, rows };
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
    fiscalModelForNation,
    calculateTaxBurdenForNation,
    calculateTariffRevenueForNation,
    applyTaxBurdenUnrestSuggestion,
    calculateBudgetBreakdownForNation,
    calculateBudgetForNation,
    calculateFiscalForNation,
    calculateAnnualDebtUpdate,
    recalculateAll,
    recalculateTrade,
    recalculateBudgets,
    previewBudgetRebalance,
    applyBudgetRebalance,
    advancePopulation,
    advanceIndustry,
    advanceToYear,
    updateValue,
    snapshot,
    exportDataJs,
    constants: { HEALTH_GROWTH, HEALTH_POPULATION, HEALTH_BUDGET, HEALTH_TRADE, CHILD_POLICY, MOBILIZATION, TRADE_POLICY, SANCTIONS, DEBT_RULES, BUDGET_FORMULAS, FISCAL_MODELS }
  };
})();
