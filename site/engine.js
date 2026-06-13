(function () {
  const STORAGE_KEY = "aggs-operations-state-v4";
  const TRADE_V4_FORMULA_VERSION = "trade2028";
  const GOVERNANCE_DEFAULT_EFFICIENCY = 100;
  const GOVERNANCE_HIGH_EFFICIENCY_LINEAR_PENALTY = 0.006;
  const GOVERNANCE_LOW_EFFICIENCY_GAP_PENALTY = 0.0015;
  const GOVERNANCE_LOW_EFFICIENCY_GAP_EXPONENT = 1.85;
  const GOVERNANCE_MIN_EFFICIENCY_MULTIPLIER = 0.18;
  const GOVERNANCE_MAX_BUREAUCRACY_PRESSURE = 6;
  const GOVERNANCE_WARNING_EFFICIENCY = 99.95;
  const GOVERNANCE_HIGH_CAPACITY_MIN_EFFICIENCY = 70;
  const GOVERNANCE_CRIME_LITERACY_NEUTRAL = 95;
  const GOVERNANCE_CRIME_LITERACY_SENSITIVITY = 1.15;
  const GOVERNANCE_CRIME_ADJUSTMENT_RATE = 0.18;
  const GOVERNANCE_CORRUPTION_ADJUSTMENT_RATE = 0.12;
  const GOVERNANCE_EFFICIENCY_ADJUSTMENT_RATE = 0.1;
  const GOVERNANCE_EFFECTIVE_EFFICIENCY_ADJUSTMENT_RATE = 0.28;
  const LITERACY_NEUTRAL_RATE = 95;
  const LITERACY_POPULATION_SLOWDOWN_MAX = 0.32;

  const HEALTH_GROWTH = { Depression: -6.2, Recession: -4.1, Slowdown: -2.2, Recovery: 1.4, Expansion: 3.2, Prosperity: 4.8 };
  const INDUSTRIAL_HEALTH_MOMENTUM = { Prosperity: 0.18, Expansion: 0.12, Recovery: 0.04, Slowdown: 0.1, Recession: 0.16, Depression: 0.24 };
  const HEALTH_DEMOGRAPHICS = {
    Prosperity: { naturalGrowth: 0.12, migration: 0.12 },
    Expansion: { naturalGrowth: 0.04, migration: 0.06 },
    Recovery: { naturalGrowth: 0, migration: 0 },
    Slowdown: { naturalGrowth: -0.22, migration: -0.12 },
    Recession: { naturalGrowth: -0.55, migration: -0.28 },
    Depression: { naturalGrowth: -1, migration: -0.55 }
  };
  const HEALTH_BUDGET = { Prosperity: 1.1, Expansion: 1.05, Recovery: 1, Slowdown: 0.9, Recession: 0.8, Depression: 0.6 };
  const HEALTH_TRADE = { Prosperity: 5, Expansion: 3.5, Recovery: 2, Slowdown: -2, Recession: -5, Depression: -10 };
  const CHILD_POLICY = { "5 Child Policy": 5, "4 Child Policy": 3.75, "3 Child Policy": 2.5, "2 Child Policy": 0.5, "1 Child Policy": 0.25, "No Policy": 0 };
  const CHILD_POLICY_POPULATION_EFFECT = { "5 Child Policy": 0.65, "4 Child Policy": 0.5, "3 Child Policy": 0.34, "2 Child Policy": 0.12, "1 Child Policy": 0.05, "No Policy": 0 };
  const MOBILIZATION = {
    None: { militaryGrowthMultiplier: 0.25, civilianPenalty: 0, militaryFactoryMultiplier: 0.4, maintenanceCost: 1, supplyMultiplier: 1 },
    Partial: { militaryGrowthMultiplier: 0.5, civilianPenalty: -0.2, militaryFactoryMultiplier: 0.6, maintenanceCost: 1.5, supplyMultiplier: 1.25 },
    Full: { militaryGrowthMultiplier: 1, civilianPenalty: -0.4, militaryFactoryMultiplier: 0.8, maintenanceCost: 2, supplyMultiplier: 1.5 },
    Total: { militaryGrowthMultiplier: 1.5, civilianPenalty: -0.6, militaryFactoryMultiplier: 1, maintenanceCost: 3, supplyMultiplier: 2 }
  };
  const MOBILIZED_BUDGET_UNLOCK = { None: 0, Partial: 0.45, Full: 0.78, Total: 1.08 };
  const MOBILIZED_BUDGET_RESOLVE = {
    None: { base: 1, scale: 0, exponent: 1, min: 1, max: 1 },
    Partial: { base: 1, scale: 0, exponent: 1, min: 1, max: 1 },
    Full: { base: 0.82, scale: 0.45, exponent: 2, min: 0.82, max: 1.27 },
    Total: { base: 0.2, scale: 1.95, exponent: 2.4, min: 0.2, max: 2.15 }
  };
  const INDUSTRIAL_SECTOR_WEIGHTS = {
    civilian: { basic: 1, improved: 5, advanced: 30 },
    military: { basic: 1, improved: 4, advanced: 12 },
    shipyard: { medium: 1, large: 10, mega: 40 }
  };
  const INDUSTRIAL_SECTOR_CONFIG = {
    civilian: { totalKey: "civilianFactories", sectorsKey: "civilianSectors", defaultTier: "basic", tiers: ["basic", "improved", "advanced"], weights: INDUSTRIAL_SECTOR_WEIGHTS.civilian, literacyImpact: { improved: "improved", advanced: "advanced" } },
    military: { totalKey: "militaryFactories", sectorsKey: "militarySectors", defaultTier: "basic", tiers: ["basic", "improved", "advanced"], weights: INDUSTRIAL_SECTOR_WEIGHTS.military, literacyImpact: { improved: "improved", advanced: "advanced" } },
    shipyard: { totalKey: "shipyards", sectorsKey: "shipyardSectors", defaultTier: "medium", tiers: ["medium", "large", "mega"], weights: INDUSTRIAL_SECTOR_WEIGHTS.shipyard, literacyImpact: { large: "improved", mega: "advanced" } }
  };
  const DEVELOPMENT_COMPONENT_KEYS = ["urbanizationRate", "ruralDevelopment", "infrastructureLevel", "livingStandard"];
  const DEVELOPMENT_COMPONENT_WEIGHTS = {
    urbanizationRate: 0.15,
    ruralDevelopment: 0.2,
    infrastructureLevel: 0.35,
    livingStandard: 0.3
  };
  const DEVELOPMENT_COMPONENT_FORMULA_VERSION = "components2026-rural-quality";
  const DEVELOPMENT_CURRENT_REFERENCE = 20;
  const DEVELOPMENT_LEVEL_MAX = 50;
  const DEVELOPMENT_COMPONENT_LEVEL_MAX = 60;
  const URBANIZATION_COMPONENT_LEVEL_MAX = 20;
  const MOBILIZATION_FINANCE = {
    None: { activationShare: 0, rampRate: 0, strainStartYears: 0, strainRate: 0, maxStrain: 0, autoSpendShare: 0 },
    Partial: { activationShare: 0.68, rampRate: 0.24, strainStartYears: 2.8, strainRate: 0.075, maxStrain: 0.55, autoSpendShare: 0.52 },
    Full: { activationShare: 0.58, rampRate: 0.27, strainStartYears: 2.1, strainRate: 0.105, maxStrain: 0.66, autoSpendShare: 0.54 },
    Total: { activationShare: 0.48, rampRate: 0.31, strainStartYears: 1.35, strainRate: 0.16, maxStrain: 0.78, autoSpendShare: 0.58 }
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
    maxDebtPaydownRate: 0.1,
    annualServiceRateRepriceShare: 0.2
  };
  const BUDGET_FORMULAS = {
    legacy: "Legacy workbook formula",
    tax2026: "Tax calibration model"
  };
  const TARIFF_FORMULAS = {
    legacy: "Legacy tariff handling",
    tariff2026: "Tariff revenue calibration model"
  };
  const POPULATION_FORMULAS = {
    population2026: "Demographic pressure model"
  };
  const WIKI_CATEGORIES = ["Overview", "Era", "Event", "Nation", "Region", "Person", "Organization", "Concept", "Culture", "Conflict", "Treaty"];
  const WIKI_STATUSES = ["draft", "published"];
  const WIKI_FACT_TEMPLATES = {
    Overview: ["Scope", "Period", "Key themes"],
    Era: ["Period", "Major powers", "Defining events", "Legacy"],
    Event: ["Date", "Location", "Participants", "Outcome", "Legacy"],
    Nation: ["Capital", "Government", "Founded", "Region", "Major cultures"],
    Region: ["Location", "Major nations", "Terrain", "Strategic value"],
    Person: ["Born", "Role", "Affiliation", "Known for", "Status"],
    Organization: ["Founded", "Headquarters", "Members", "Purpose", "Status"],
    Concept: ["Type", "Used by", "Era", "Notes"],
    Culture: ["Region", "Language", "Faith/traditions", "Influences", "Legacy"],
    Conflict: ["Period", "Belligerents", "Theater", "Result", "Aftermath"],
    Treaty: ["Signed", "Parties", "Terms", "Impact", "Status"]
  };
  const TARIFF_POLICY_LIMITS = { "Free Trade": 3, "Open Market": 5, Balanced: 8, Protectionist: 12 };
  const TARIFF_POLICY_SENSITIVITY = { "Free Trade": 1.35, "Open Market": 1.18, Balanced: 1, Protectionist: 0.78 };
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

  function developmentLevelValue(value, fallback = 10) {
    return clamp(number(value, fallback), 0, DEVELOPMENT_LEVEL_MAX);
  }

  function developmentReferenceRatio(value) {
    return clamp(developmentLevelValue(value, 0) / DEVELOPMENT_CURRENT_REFERENCE, 0, DEVELOPMENT_LEVEL_MAX / DEVELOPMENT_CURRENT_REFERENCE);
  }

  function currentEraDevelopmentRatio(value) {
    return clamp(developmentLevelValue(value, 0) / DEVELOPMENT_CURRENT_REFERENCE, 0, 1);
  }

  function roundCurrency(value) {
    return Math.round(number(value, 0));
  }

  function roundPercent(value) {
    return Number(number(value, 0).toFixed(2));
  }

  function percentStat(value, fallback = 0) {
    return clamp(number(value, fallback), 0, 100);
  }

  function governanceMetrics(national = {}) {
    const legacyCorruption = percentStat(national?.corruption, 0);
    const governmentalCorruption = percentStat(national?.governmentalCorruption, legacyCorruption);
    const crimeRate = percentStat(national?.crimeRate, legacyCorruption);
    const governmentalEfficiencyTarget = clamp(number(national?.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
    const governmentalEfficiency = clamp(number(national?.effectiveGovernmentalEfficiency, governmentalEfficiencyTarget), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
    const efficiencyGap = Math.max(0, GOVERNANCE_DEFAULT_EFFICIENCY - governmentalEfficiency);
    const nearPerfectGap = Math.min(efficiencyGap, 1);
    const deepBureaucracyGap = Math.max(0, efficiencyGap - nearPerfectGap);
    const efficiencyPenalty = nearPerfectGap * GOVERNANCE_HIGH_EFFICIENCY_LINEAR_PENALTY
      + Math.pow(deepBureaucracyGap, GOVERNANCE_LOW_EFFICIENCY_GAP_EXPONENT) * GOVERNANCE_LOW_EFFICIENCY_GAP_PENALTY;
    const efficiencyMultiplier = clamp(1 - efficiencyPenalty, GOVERNANCE_MIN_EFFICIENCY_MULTIPLIER, 1);
    const bureaucracyPressure = clamp(1 / Math.max(efficiencyMultiplier, 0.05), 1, GOVERNANCE_MAX_BUREAUCRACY_PRESSURE);
    return {
      legacyCorruption,
      governmentalCorruption,
      crimeRate,
      governmentalEfficiency,
      governmentalEfficiencyTarget,
      effectiveGovernmentalEfficiency: governmentalEfficiency,
      efficiencyGap,
      efficiencyMultiplier,
      bureaucracyPressure,
      fiscalCorruption: roundPercent(governmentalCorruption * 0.85 + crimeRate * 0.15),
      logisticsCorruption: roundPercent(governmentalCorruption * 0.35 + crimeRate * 0.65),
      socialCorruption: roundPercent(governmentalCorruption * 0.25 + crimeRate * 0.75),
      stateCapacityCorruption: roundPercent(governmentalCorruption * 0.75 + crimeRate * 0.25)
    };
  }

  function literacyRateForNational(national = {}) {
    return clamp(number(national?.literacyRate, LITERACY_NEUTRAL_RATE), 0, 100);
  }

  function interpolateByLiteracy(literacyRate, points) {
    const literacy = literacyRateForNational({ literacyRate });
    if (literacy >= LITERACY_NEUTRAL_RATE) return 1;
    if (literacy <= points[0].rate) return points[0].multiplier;
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const next = points[index];
      if (literacy > next.rate) continue;
      const span = Math.max(1, next.rate - previous.rate);
      const progress = clamp((literacy - previous.rate) / span, 0, 1);
      return previous.multiplier + (next.multiplier - previous.multiplier) * progress;
    }
    return points[points.length - 1].multiplier;
  }

  function literacyIndustrialMultiplier(national = {}, impact = "") {
    const literacy = literacyRateForNational(national);
    if (!impact || literacy >= LITERACY_NEUTRAL_RATE) return 1;
    const curve = impact === "advanced"
      ? [
          { rate: 0, multiplier: 0.15 },
          { rate: 55, multiplier: 0.25 },
          { rate: 70, multiplier: 0.5 },
          { rate: 80, multiplier: 0.7 },
          { rate: 90, multiplier: 0.9 },
          { rate: 95, multiplier: 1 }
        ]
      : [
          { rate: 0, multiplier: 0.35 },
          { rate: 55, multiplier: 0.55 },
          { rate: 70, multiplier: 0.72 },
          { rate: 80, multiplier: 0.85 },
          { rate: 90, multiplier: 0.96 },
          { rate: 95, multiplier: 1 }
        ];
    return clamp(interpolateByLiteracy(literacy, curve), 0.05, 1);
  }

  function literacyPopulationGrowthSlowdown(national = {}) {
    const literacy = literacyRateForNational(national);
    if (literacy <= LITERACY_NEUTRAL_RATE) return 0;
    const highLiteracyShare = clamp((literacy - LITERACY_NEUTRAL_RATE) / Math.max(1, 100 - LITERACY_NEUTRAL_RATE), 0, 1);
    return Math.pow(highLiteracyShare, 1.15) * LITERACY_POPULATION_SLOWDOWN_MAX;
  }

  function developmentComponentDefaults(developmentLevel) {
    const development = developmentLevelValue(developmentLevel, 10);
    return {
      urbanizationRate: roundPercent(clamp(development * 5, 0, 100)),
      ruralDevelopment: roundPercent(development),
      infrastructureLevel: roundPercent(development),
      livingStandard: roundPercent(development)
    };
  }

  function developmentComponentsMatchDefaults(national = {}, defaults = developmentComponentDefaults(national.developmentLevel), tolerance = 0.05) {
    return DEVELOPMENT_COMPONENT_KEYS.every((key) => !isBlank(national[key]) && Math.abs(number(national[key], 0) - number(defaults[key], 0)) <= tolerance);
  }

  function metricLogValue(value) {
    return Math.log1p(Math.max(0, number(value, 0)));
  }

  function metricRange(rows, key) {
    const values = rows.map((row) => metricLogValue(row[key]));
    return {
      min: Math.min(...values, 0),
      max: Math.max(...values, 0)
    };
  }

  function scaledMetric(context, key, value) {
    const range = context?.ranges?.[key];
    if (!range || range.max <= range.min) return 0.5;
    return clamp((metricLogValue(value) - range.min) / (range.max - range.min), 0, 1);
  }

  function healthDevelopmentScore(health = "Recovery") {
    return { Depression: 0.05, Recession: 0.2, Slowdown: 0.35, Recovery: 0.5, Expansion: 0.72, Prosperity: 0.9 }[health] ?? 0.5;
  }

  function developmentInferenceProfile(data, id) {
    const national = data.national?.[id] || {};
    const industrial = data.industrial?.[id] || {};
    const trade = data.trade?.[id] || {};
    const population = getPopulation(data, id, data.meta?.currentYear) || 0;
    const populationMillions = population / 1000000;
    const industrialBase = Math.max(0, number(industrial.civilianFactories, 0))
      + Math.max(0, number(industrial.militaryFactories, 0)) * 1.4
      + Math.max(0, number(industrial.shipyards, 0)) * 4;
    const denominator = Math.max(populationMillions, 0.25);
    return {
      id,
      population,
      industrialBase,
      industrialDensity: industrialBase / denominator,
      shipyardDensity: Math.max(0, number(industrial.shipyards, 0)) / denominator,
      tradeIntensity: Math.max(0, number(trade.tradeFlow, 0)) / denominator,
      budgetIntensity: Math.max(0, number(national.budgetCapacity, 0)) / denominator
    };
  }

  function developmentInferenceContext(data) {
    const rows = visibleNations(data).map((nation) => developmentInferenceProfile(data, nation.id));
    const ranges = ["population", "industrialBase", "industrialDensity", "shipyardDensity", "tradeIntensity", "budgetIntensity"]
      .reduce((result, key) => {
        result[key] = metricRange(rows, key);
        return result;
      }, {});
    return {
      ranges,
      byId: rows.reduce((result, row) => {
        result[row.id] = row;
        return result;
      }, {})
    };
  }

  function weightedDevelopmentLevel(levels = {}) {
    return number(levels.urbanizationLevel, 0) * DEVELOPMENT_COMPONENT_WEIGHTS.urbanizationRate
      + number(levels.ruralDevelopment, 0) * DEVELOPMENT_COMPONENT_WEIGHTS.ruralDevelopment
      + number(levels.infrastructureLevel, 0) * DEVELOPMENT_COMPONENT_WEIGHTS.infrastructureLevel
      + number(levels.livingStandard, 0) * DEVELOPMENT_COMPONENT_WEIGHTS.livingStandard;
  }

  function anchorDevelopmentComponentLevels(levels = {}, targetDevelopment = 10, caps = {}) {
    const target = developmentLevelValue(targetDevelopment, 10);
    const defaultComponentCeiling = target > DEVELOPMENT_CURRENT_REFERENCE
      ? DEVELOPMENT_COMPONENT_LEVEL_MAX
      : DEVELOPMENT_CURRENT_REFERENCE;
    const anchored = {
      urbanizationLevel: clamp(number(levels.urbanizationLevel, target), 0, caps.urbanizationLevel ?? URBANIZATION_COMPONENT_LEVEL_MAX),
      ruralDevelopment: clamp(number(levels.ruralDevelopment, target), 0, caps.ruralDevelopment ?? defaultComponentCeiling),
      infrastructureLevel: clamp(number(levels.infrastructureLevel, target), 0, caps.infrastructureLevel ?? defaultComponentCeiling),
      livingStandard: clamp(number(levels.livingStandard, target), 0, caps.livingStandard ?? defaultComponentCeiling)
    };
    const weights = {
      urbanizationLevel: DEVELOPMENT_COMPONENT_WEIGHTS.urbanizationRate,
      ruralDevelopment: DEVELOPMENT_COMPONENT_WEIGHTS.ruralDevelopment,
      infrastructureLevel: DEVELOPMENT_COMPONENT_WEIGHTS.infrastructureLevel,
      livingStandard: DEVELOPMENT_COMPONENT_WEIGHTS.livingStandard
    };
    const ceiling = (key) => caps[key] ?? (key === "urbanizationLevel" ? URBANIZATION_COMPONENT_LEVEL_MAX : defaultComponentCeiling);
    const positiveOrder = ["infrastructureLevel", "livingStandard", "urbanizationLevel", "ruralDevelopment"];
    const negativeOrder = ["urbanizationLevel", "infrastructureLevel", "livingStandard", "ruralDevelopment"];
    Object.keys(anchored).forEach((key) => {
      anchored[key] = roundPercent(clamp(anchored[key], 0, ceiling(key)));
    });
    for (let pass = 0; pass < 4; pass += 1) {
      let difference = target - weightedDevelopmentLevel(anchored);
      if (Math.abs(difference) < 0.005) break;
      const order = difference > 0 ? positiveOrder : negativeOrder;
      for (const key of order) {
        if (Math.abs(difference) < 0.005) break;
        const available = difference > 0 ? ceiling(key) - anchored[key] : anchored[key];
        if (available <= 0) continue;
        const levelDelta = Math.min(Math.abs(difference) / weights[key], available);
        anchored[key] = roundPercent(clamp(anchored[key] + (difference > 0 ? levelDelta : -levelDelta), 0, ceiling(key)));
        difference = target - weightedDevelopmentLevel(anchored);
      }
    }
    return anchored;
  }

  function inferDevelopmentComponents(data, id, targetDevelopment = data.national?.[id]?.developmentLevel, context = developmentInferenceContext(data)) {
    const national = data.national?.[id] || {};
    const trade = data.trade?.[id] || {};
    const profile = context.byId[id] || developmentInferenceProfile(data, id);
    const development = developmentLevelValue(targetDevelopment, 10);
    const developmentRatio = currentEraDevelopmentRatio(development);
    const futureDevelopmentShare = Math.max(0, developmentReferenceRatio(development) - 1);
    const inferredComponentCeiling = development > DEVELOPMENT_CURRENT_REFERENCE
      ? DEVELOPMENT_COMPONENT_LEVEL_MAX
      : DEVELOPMENT_CURRENT_REFERENCE;
    const literacyRatio = clamp(literacyRateForNational(national) / 100, 0, 1);
    const stabilityRatio = clamp(number(national.governmentalStability, 70) / 100, 0, 1);
    const efficiencyRatio = clamp(number(national.effectiveGovernmentalEfficiency, number(national.governmentalEfficiency, 100)) / 100, 0, 1);
    const crime = percentStat(national.crimeRate, national.corruption);
    const corruption = percentStat(national.governmentalCorruption, national.corruption);
    const integrityRatio = clamp(1 - (crime * 0.45 + corruption * 0.55) / 100, 0, 1);
    const healthRatio = healthDevelopmentScore(national.economicHealth);
    const industryDensity = scaledMetric(context, "industrialDensity", profile.industrialDensity);
    const shipyardDensity = scaledMetric(context, "shipyardDensity", profile.shipyardDensity);
    const tradeIntensity = scaledMetric(context, "tradeIntensity", profile.tradeIntensity);
    const budgetIntensity = scaledMetric(context, "budgetIntensity", profile.budgetIntensity);
    const populationScale = scaledMetric(context, "population", profile.population);
    const diversityRatio = clamp(number(trade.economicTradeDiversity, 50) / 260, 0, 1);
    const urbanizationLevel = 20 * (
      developmentRatio * 0.38
        + industryDensity * 0.25
        + budgetIntensity * 0.13
        + tradeIntensity * 0.08
        + shipyardDensity * 0.06
        + populationScale * 0.04
        + healthRatio * 0.03
        + literacyRatio * 0.03
    );
    const ruralQualityCap = clamp(20 * (
      developmentRatio * 0.04
        + Math.pow(developmentRatio, 2) * 0.04
        + literacyRatio * 0.24
        + integrityRatio * 0.16
        + budgetIntensity * 0.09
        + industryDensity * 0.06
        + stabilityRatio * 0.02
        + healthRatio * 0.02
    ) + futureDevelopmentShare * 12, 1.5, inferredComponentCeiling);
    const livingStandardCap = clamp(20 * (
      developmentRatio * 0.24
        + Math.pow(developmentRatio, 2) * 0.22
        + literacyRatio * 0.18
        + integrityRatio * 0.12
        + budgetIntensity * 0.12
        + industryDensity * 0.13
        + stabilityRatio * 0.05
        + healthRatio * 0.03
        + efficiencyRatio * 0.03
    ) + futureDevelopmentShare * 18, 3, inferredComponentCeiling);
    const levels = anchorDevelopmentComponentLevels({
      urbanizationLevel,
      ruralDevelopment: 20 * (
        developmentRatio * 0.18
          + (1 - clamp(urbanizationLevel / 20, 0, 1)) * 0.03
          + stabilityRatio * 0.06
          + literacyRatio * 0.19
          + efficiencyRatio * 0.03
          + integrityRatio * 0.17
          + healthRatio * 0.03
          + budgetIntensity * 0.09
          + industryDensity * 0.03
          + diversityRatio * 0.03
      ),
      infrastructureLevel: 20 * (
        developmentRatio * 0.28
          + industryDensity * 0.2
          + shipyardDensity * 0.12
          + tradeIntensity * 0.15
          + budgetIntensity * 0.08
          + diversityRatio * 0.08
          + efficiencyRatio * 0.04
          + populationScale * 0.05
      ),
      livingStandard: 20 * (
        developmentRatio * 0.28
          + literacyRatio * 0.22
          + stabilityRatio * 0.1
          + integrityRatio * 0.17
          + budgetIntensity * 0.12
          + healthRatio * 0.05
          + efficiencyRatio * 0.03
          + industryDensity * 0.03
      )
    }, development, {
      ruralDevelopment: ruralQualityCap,
      livingStandard: livingStandardCap
    });
    return {
      urbanizationRate: roundPercent(clamp(levels.urbanizationLevel * 5, 0, 100)),
      ruralDevelopment: levels.ruralDevelopment,
      infrastructureLevel: levels.infrastructureLevel,
      livingStandard: levels.livingStandard
    };
  }

  function developmentComponentLevel(national = {}, key, fallbackDevelopment = developmentLevelValue(national.developmentLevel, 10)) {
    const defaults = developmentComponentDefaults(fallbackDevelopment);
    if (key === "urbanizationRate") return clamp(number(national.urbanizationRate, defaults.urbanizationRate), 0, 100) / 5;
    return developmentLevelValue(national[key], defaults[key]);
  }

  function developmentLevelFromComponents(national = {}) {
    const fallbackDevelopment = developmentLevelValue(national.developmentLevel, 10);
    const urbanization = developmentComponentLevel(national, "urbanizationRate", fallbackDevelopment);
    const rural = developmentComponentLevel(national, "ruralDevelopment", fallbackDevelopment);
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel", fallbackDevelopment);
    const livingStandard = developmentComponentLevel(national, "livingStandard", fallbackDevelopment);
    return roundPercent(clamp(
      urbanization * DEVELOPMENT_COMPONENT_WEIGHTS.urbanizationRate
        + rural * DEVELOPMENT_COMPONENT_WEIGHTS.ruralDevelopment
        + infrastructure * DEVELOPMENT_COMPONENT_WEIGHTS.infrastructureLevel
        + livingStandard * DEVELOPMENT_COMPONENT_WEIGHTS.livingStandard,
      0,
      20
    ));
  }

  function setDevelopmentComponentsFromLevel(national = {}, developmentLevel = national.developmentLevel, data = null, id = "") {
    const explicitDevelopment = developmentLevelValue(developmentLevel, 10);
    const components = data && id
      ? inferDevelopmentComponents(data, id, explicitDevelopment)
      : developmentComponentDefaults(explicitDevelopment);
    Object.assign(national, components);
    national.developmentLevel = explicitDevelopment;
    national.developmentComponentsManual = false;
    national.developmentComponentsFormulaVersion = DEVELOPMENT_COMPONENT_FORMULA_VERSION;
    return national.developmentLevel;
  }

  function syncDevelopmentLevelFromComponents(national = {}) {
    national.developmentLevel = developmentLevelFromComponents(national);
    return national.developmentLevel;
  }

  function determineIndustrialSophistication(national = {}, industrial = {}) {
    const development = developmentLevelValue(national.developmentLevel, 10);
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel", development);
    const literacy = literacyRateForNational(national);
    const civilian = Math.max(0, number(industrial.civilianFactories, 0));
    const military = Math.max(0, number(industrial.militaryFactories, 0));
    const shipyards = Math.max(0, number(industrial.shipyards, 0));
    const industrialDepth = clamp(Math.sqrt(civilian + military * 1.4 + shipyards * 4) * 1.2, 0, 14);
    return roundPercent(clamp(
      development * 2.15
        + infrastructure * 1.3
        + literacy * 0.18
        + industrialDepth,
      0,
      100
    ));
  }

  function sophisticationScore(national = {}) {
    if (isBlank(national.industrialSophistication)) return null;
    return clamp(number(national.industrialSophistication, 0), 0, 100);
  }

  function sophisticationAbsoluteMultiplier(score, impact = "") {
    if (!impact || score === null || score === undefined) return 1;
    const ratio = clamp(number(score, 0), 0, 100) / 100;
    if (impact === "advanced") return clamp(0.15 + Math.pow(ratio, 1.25) * 0.85, 0.15, 1);
    if (impact === "improved") return clamp(0.45 + Math.pow(ratio, 0.85) * 0.55, 0.45, 1);
    return 1;
  }

  function sophisticationIndustrialMultiplier(national = {}, impact = "") {
    const current = sophisticationScore(national);
    if (current === null || !impact) return 1;
    const baseline = clamp(number(national.industrialSophisticationBaseline, current), 0, 100);
    const currentMultiplier = sophisticationAbsoluteMultiplier(current, impact);
    const baselineMultiplier = sophisticationAbsoluteMultiplier(baseline, impact);
    return clamp(currentMultiplier / Math.max(baselineMultiplier, 0.05), 0.05, 6);
  }

  function sophisticationSupplyMultiplier(national = {}) {
    const current = sophisticationScore(national);
    if (current === null) return 1;
    const baseline = clamp(number(national.industrialSophisticationBaseline, current), 0, 100);
    const currentMultiplier = clamp(0.45 + Math.pow(current / 100, 0.9) * 0.65, 0.45, 1.1);
    const baselineMultiplier = clamp(0.45 + Math.pow(baseline / 100, 0.9) * 0.65, 0.45, 1.1);
    return clamp(currentMultiplier / Math.max(baselineMultiplier, 0.05), 0.05, 2.5);
  }

  function normalizeDevelopmentFields(data) {
    const context = developmentInferenceContext(data);
    Object.entries(data.national || {}).forEach(([id, national]) => {
      if (!national || typeof national !== "object") return;
      if (isBlank(national.developmentLevel)) national.developmentLevel = 10;
      const originalDevelopment = developmentLevelValue(national.developmentLevel, 10);
      const defaults = developmentComponentDefaults(national.developmentLevel);
      const hasComponentData = DEVELOPMENT_COMPONENT_KEYS.every((key) => !isBlank(national[key]));
      const hasOnlyOldDefaultComponents = hasComponentData && developmentComponentsMatchDefaults(national, defaults);
      const needsProfileInference = !hasComponentData
        || (national.developmentComponentsManual !== true
          && national.developmentComponentsFormulaVersion !== DEVELOPMENT_COMPONENT_FORMULA_VERSION);
      let refreshedProfileComponents = false;
      if (needsProfileInference) {
        Object.assign(national, inferDevelopmentComponents(data, id, national.developmentLevel, context));
        national.developmentComponentsManual = false;
        national.developmentComponentsFormulaVersion = DEVELOPMENT_COMPONENT_FORMULA_VERSION;
        refreshedProfileComponents = true;
      } else if (national.developmentComponentsFormulaVersion !== DEVELOPMENT_COMPONENT_FORMULA_VERSION) {
        national.developmentComponentsManual = national.developmentComponentsManual === true || !hasOnlyOldDefaultComponents;
        national.developmentComponentsFormulaVersion = DEVELOPMENT_COMPONENT_FORMULA_VERSION;
      }
      DEVELOPMENT_COMPONENT_KEYS.forEach((key) => {
        if (isBlank(national[key])) national[key] = defaults[key];
      });
      national.developmentLevel = national.developmentComponentsManual === true
        ? developmentLevelFromComponents(national)
        : originalDevelopment;
      if (isBlank(national.industrialSophisticationManual)) national.industrialSophisticationManual = false;
      if (isBlank(national.industrialSophistication) || national.industrialSophisticationManual !== true) {
        national.industrialSophistication = determineIndustrialSophistication(national, data.industrial?.[id]);
      }
      if (refreshedProfileComponents && national.industrialSophisticationManual !== true) {
        national.industrialSophisticationBaseline = clamp(number(national.industrialSophistication, determineIndustrialSophistication(national, data.industrial?.[id])), 0, 100);
      } else if (isBlank(national.industrialSophisticationBaseline)) {
        national.industrialSophisticationBaseline = clamp(number(national.industrialSophistication, determineIndustrialSophistication(national, data.industrial?.[id])), 0, 100);
      }
    });
  }

  function refreshAutoIndustrialSophistication(data, id) {
    const national = data.national?.[id];
    if (!national || national.industrialSophisticationManual === true) return;
    national.industrialSophistication = determineIndustrialSophistication(national, data.industrial?.[id]);
    if (isBlank(national.industrialSophisticationBaseline)) national.industrialSophisticationBaseline = national.industrialSophistication;
  }

  function normalizeGovernanceFields(data) {
    Object.values(data.national || {}).forEach((national) => {
      if (!national || typeof national !== "object") return;
      const governance = governanceMetrics(national);
      if (isBlank(national.governmentalCorruption)) national.governmentalCorruption = governance.governmentalCorruption;
      if (isBlank(national.crimeRate)) national.crimeRate = governance.crimeRate;
      if (isBlank(national.governmentalEfficiency)) national.governmentalEfficiency = GOVERNANCE_DEFAULT_EFFICIENCY;
      if (isBlank(national.effectiveGovernmentalEfficiency)) national.effectiveGovernmentalEfficiency = clamp(number(national.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
      if (isBlank(national.literacyRate)) national.literacyRate = LITERACY_NEUTRAL_RATE;
    });
  }

  function ensureState(data = {}) {
    data.meta = data.meta || {};
    data.meta.title = data.meta.title || "AG-GS Global Ledger";
    data.meta.currentYear = number(data.meta.currentYear, 2021);
    data.meta.worldEconomicHealth = data.meta.worldEconomicHealth || "Expansion";
    data.meta.budgetFormulaVersion = data.meta.budgetFormulaVersion || "legacy";
    data.meta.tariffFormulaVersion = TARIFF_FORMULAS[data.meta.tariffFormulaVersion] ? data.meta.tariffFormulaVersion : "legacy";
    data.meta.populationFormulaVersion = POPULATION_FORMULAS[data.meta.populationFormulaVersion] ? data.meta.populationFormulaVersion : "population2026";
    delete data.meta.tradeV3Enabled;
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
    data.meta.tradeFormulaVersion = TRADE_V4_FORMULA_VERSION;
    data.tradeNetwork = data.tradeNetwork && typeof data.tradeNetwork === "object" && !Array.isArray(data.tradeNetwork) ? data.tradeNetwork : {};
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
    normalizeGovernanceFields(data);
    normalizeDevelopmentFields(data);
    normalizeDebtServiceRates(data);
    ensureWikiState(data);
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

  function normalizeDebtServiceRates(data) {
    Object.values(data.national || {}).forEach((national) => {
      if (!national || !isBlank(national.debtServiceRate)) return;
      const debtPrincipal = number(national.debtPrincipal, 0);
      if (debtPrincipal <= 0) {
        national.debtServiceRate = 0;
        return;
      }
      const debtService = number(national.debtService, null);
      const fallbackRate = number(national.interestRate, number(national.computedInterestRate, DEBT_RULES.baseInterestRate));
      const serviceRate = debtService !== null && debtService > 0
        ? (debtService / debtPrincipal) * 100
        : fallbackRate;
      national.debtServiceRate = roundPercent(serviceRate);
      if (isBlank(national.projectedDebtServiceRate)) national.projectedDebtServiceRate = national.debtServiceRate;
    });
  }

  function wikiSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "wiki-page";
  }

  function wikiArray(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function wikiFacts(value) {
    const factFromPair = (label, rawValue) => {
      const normalizedLabel = String(label || "").trim();
      const normalizedValue = String(rawValue ?? "").trim();
      return normalizedLabel && normalizedValue ? { label: normalizedLabel, value: normalizedValue } : null;
    };
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          return factFromPair(item.label || item.key || item.name, item.value ?? item.text);
        })
        .filter(Boolean);
    }
    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([label, rawValue]) => factFromPair(label, rawValue))
        .filter(Boolean);
    }
    return String(value || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .map((line) => {
        const match = line.match(/^([^:=\-]+)\s*[:=\-]\s*(.+)$/);
        return match ? factFromPair(match[1], match[2]) : null;
      })
      .filter(Boolean);
  }

  function wikiFactTemplate(category) {
    return (WIKI_FACT_TEMPLATES[category] || []).map((label) => ({ label, value: "" }));
  }

  function wikiYearBounds(rawWiki = {}) {
    const rawStart = number(rawWiki.meta?.startYear, 0);
    const rawEnd = number(rawWiki.meta?.endYear, 2020);
    return {
      startYear: Math.round(Math.min(rawStart, rawEnd)),
      endYear: Math.round(Math.max(rawStart, rawEnd))
    };
  }

  function normalizeWikiYear(value, bounds) {
    if (value === "" || value === null || value === undefined) return "";
    return Math.round(clamp(number(value, bounds.startYear), bounds.startYear, bounds.endYear));
  }

  function uniqueWikiPageId(data, title, existingId = "") {
    const pages = data.wiki?.pages || {};
    const base = wikiSlug(title);
    if (existingId && pages[existingId]) return existingId;
    let next = base;
    let suffix = 2;
    while (pages[next]) {
      next = `${base}-${suffix}`;
      suffix += 1;
    }
    return next;
  }

  function normalizeWikiPage(page = {}, fallbackId = "", bounds = { startYear: 0, endYear: 2020 }) {
    const title = String(page.title || fallbackId || "Untitled Page").trim();
    const id = String(page.id || fallbackId || wikiSlug(title)).trim();
    const category = WIKI_CATEGORIES.includes(page.category) ? page.category : "Concept";
    const status = WIKI_STATUSES.includes(page.status) ? page.status : "draft";
    let yearStart = normalizeWikiYear(page.yearStart, bounds);
    let yearEnd = normalizeWikiYear(page.yearEnd, bounds);
    if (yearStart !== "" && yearEnd !== "" && yearEnd < yearStart) {
      [yearStart, yearEnd] = [yearEnd, yearStart];
    }
    return {
      id,
      slug: wikiSlug(page.slug || title),
      title,
      category,
      status,
      era: String(page.era || "").trim(),
      yearStart,
      yearEnd,
      summary: String(page.summary || "").trim(),
      body: String(page.body || "").trim(),
      facts: wikiFacts(page.facts),
      tags: wikiArray(page.tags),
      aliases: wikiArray(page.aliases),
      relatedPageIds: wikiArray(page.relatedPageIds),
      archived: Boolean(page.archived),
      createdAt: page.createdAt || new Date().toISOString(),
      updatedAt: page.updatedAt || new Date().toISOString()
    };
  }

  function ensureWikiState(data) {
    const rawWiki = data.wiki && typeof data.wiki === "object" && !Array.isArray(data.wiki) ? data.wiki : {};
    const bounds = wikiYearBounds(rawWiki);
    const rawPages = rawWiki.pages && typeof rawWiki.pages === "object" ? rawWiki.pages : {};
    const pages = {};
    Object.entries(rawPages).forEach(([id, page]) => {
      const normalized = normalizeWikiPage({ ...page, id: page?.id || id }, id, bounds);
      pages[normalized.id] = normalized;
    });
    data.wiki = {
      meta: {
        title: rawWiki.meta?.title || "Avant World Wiki",
        startYear: bounds.startYear,
        endYear: bounds.endYear,
        updatedAt: rawWiki.meta?.updatedAt || data.meta?.updatedAt || new Date().toISOString()
      },
      pages
    };
    return data.wiki;
  }

  function wikiPages(data, options = {}) {
    ensureWikiState(data);
    const includeArchived = options.includeArchived === true;
    return Object.values(data.wiki.pages)
      .filter((page) => includeArchived || !page.archived)
      .sort((left, right) => {
        const leftYear = left.yearStart === "" ? Number.POSITIVE_INFINITY : number(left.yearStart, Number.POSITIVE_INFINITY);
        const rightYear = right.yearStart === "" ? Number.POSITIVE_INFINITY : number(right.yearStart, Number.POSITIVE_INFINITY);
        if (leftYear !== rightYear) return leftYear - rightYear;
        return left.title.localeCompare(right.title, "en", { sensitivity: "base" });
      });
  }

  function wikiInlineTargets(text) {
    const targets = [];
    String(text || "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target) => {
      const trimmed = String(target || "").trim();
      if (trimmed) targets.push(trimmed);
      return match;
    });
    return targets;
  }

  function wikiPageLookup(data, options = {}) {
    const lookup = new Map();
    wikiPages(data, { includeArchived: options.includeArchived }).forEach((page) => {
      lookup.set(page.id.toLowerCase(), page);
      lookup.set(page.slug.toLowerCase(), page);
      lookup.set(page.title.toLowerCase(), page);
      (page.aliases || []).forEach((alias) => lookup.set(alias.toLowerCase(), page));
    });
    return lookup;
  }

  function uniqueWikiPages(pages) {
    const seen = new Set();
    return pages.filter((page) => {
      if (!page || seen.has(page.id)) return false;
      seen.add(page.id);
      return true;
    });
  }

  function uniqueWikiStrings(values) {
    const seen = new Set();
    return values.filter((value) => {
      const key = String(value || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function wikiReferencesForPage(data, page, lookup) {
    const outbound = [];
    const missingLinks = [];
    const targets = [
      ...(page.relatedPageIds || []),
      ...wikiInlineTargets(page.summary),
      ...wikiInlineTargets(page.body),
      ...(page.facts || []).flatMap((fact) => wikiInlineTargets(fact.value))
    ];
    targets.forEach((target) => {
      const linkedPage = lookup.get(String(target).toLowerCase());
      if (linkedPage) {
        if (linkedPage.id !== page.id) outbound.push(linkedPage);
      } else {
        missingLinks.push(target);
      }
    });
    return {
      outbound: uniqueWikiPages(outbound),
      missingLinks: uniqueWikiStrings(missingLinks)
    };
  }

  function wikiPageReferences(data, id, options = {}) {
    ensureWikiState(data);
    const page = data.wiki.pages[id] || null;
    if (!page) return { page: null, outbound: [], backlinks: [], missingLinks: [], isOrphan: true };
    const pages = wikiPages(data, { includeArchived: options.includeArchived });
    const lookup = wikiPageLookup(data, { includeArchived: options.includeArchived });
    const refs = wikiReferencesForPage(data, page, lookup);
    const backlinks = pages
      .filter((candidate) => candidate.id !== page.id)
      .filter((candidate) => wikiReferencesForPage(data, candidate, lookup).outbound.some((linkedPage) => linkedPage.id === page.id));
    return {
      page,
      outbound: refs.outbound,
      backlinks,
      missingLinks: refs.missingLinks,
      isOrphan: backlinks.length === 0
    };
  }

  function wikiAuditPageSummary(page) {
    return {
      id: page.id,
      title: page.title,
      category: page.category,
      status: page.status,
      yearStart: page.yearStart,
      yearEnd: page.yearEnd,
      archived: page.archived
    };
  }

  function wikiContentAudit(data, options = {}) {
    ensureWikiState(data);
    const includeArchived = options.includeArchived === true;
    const allPages = wikiPages(data, { includeArchived: true });
    const pages = allPages.filter((page) => includeArchived || !page.archived);
    const missing = new Map();
    const categoryCounts = new Map();

    pages.forEach((page) => {
      categoryCounts.set(page.category, (categoryCounts.get(page.category) || 0) + 1);
      wikiPageReferences(data, page.id, { includeArchived }).missingLinks.forEach((title) => {
        const key = title.toLowerCase();
        const bucket = missing.get(key) || { title, from: [] };
        bucket.from.push(wikiAuditPageSummary(page));
        missing.set(key, bucket);
      });
    });

    const byTitle = (left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base" });
    const summarizePages = (items) => items.map(wikiAuditPageSummary).sort(byTitle);

    return {
      pageCount: pages.length,
      publishedCount: pages.filter((page) => page.status === "published").length,
      draftCount: pages.filter((page) => page.status === "draft").length,
      archivedCount: allPages.filter((page) => page.archived).length,
      draftPages: summarizePages(pages.filter((page) => page.status === "draft")),
      orphanPages: summarizePages(pages.filter((page) => wikiPageReferences(data, page.id, { includeArchived }).isOrphan)),
      missingLinks: Array.from(missing.values())
        .map((entry) => ({
          title: entry.title,
          count: entry.from.length,
          from: entry.from.sort(byTitle)
        }))
        .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title, "en", { sensitivity: "base" })),
      categoryCounts: Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => left.category.localeCompare(right.category, "en", { sensitivity: "base" }))
    };
  }

  function searchWikiPages(data, query = "", filters = {}) {
    const q = String(query || "").trim().toLowerCase();
    const yearFilter = filters.year === "" || filters.year === null || filters.year === undefined ? null : number(filters.year, null);
    return wikiPages(data, { includeArchived: filters.includeArchived })
      .filter((page) => {
        if (filters.status && filters.status !== "all") return page.status === filters.status;
        return filters.includeDrafts || page.status === "published";
      })
      .filter((page) => !filters.category || filters.category === "all" || page.category === filters.category)
      .filter((page) => !filters.era || filters.era === "all" || page.era === filters.era)
      .filter((page) => {
        if (yearFilter === null) return true;
        const start = page.yearStart === "" ? Number.NEGATIVE_INFINITY : number(page.yearStart, Number.NEGATIVE_INFINITY);
        const end = page.yearEnd === "" ? start : number(page.yearEnd, start);
        return yearFilter >= start && yearFilter <= end;
      })
      .filter((page) => {
        if (!q) return true;
        const haystack = [
          page.title,
          page.category,
          page.era,
          page.summary,
          page.body,
          ...(page.facts || []).flatMap((fact) => [fact.label, fact.value]),
          ...page.tags,
          ...page.aliases
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      });
  }

  function saveWikiPage(data, page) {
    ensureState(data);
    const existingId = page?.id && data.wiki.pages[page.id] ? page.id : "";
    const id = existingId || uniqueWikiPageId(data, page?.title || "Untitled Page");
    const existing = data.wiki.pages[id] || {};
    const now = new Date().toISOString();
    const normalized = normalizeWikiPage({
      ...existing,
      ...page,
      id,
      createdAt: existing.createdAt || page?.createdAt || now,
      updatedAt: now
    }, id, data.wiki.meta);
    data.wiki.pages[id] = normalized;
    data.wiki.meta.updatedAt = now;
    data.meta.updatedAt = now;
    return normalized;
  }

  function archiveWikiPage(data, id, archived = true) {
    ensureState(data);
    const page = data.wiki.pages[id];
    if (!page) return null;
    const now = new Date().toISOString();
    page.archived = Boolean(archived);
    page.updatedAt = now;
    data.wiki.meta.updatedAt = now;
    data.meta.updatedAt = now;
    return page;
  }

  function recalculationSignature(data) {
    return Object.keys(data.national || {})
      .sort()
      .map((id) => {
        const national = data.national[id] || {};
        const trade = data.trade?.[id] || {};
        return [
          id,
          roundCurrency(national.budgetCapacity),
          roundCurrency(national.budgetExpenditure),
          roundCurrency(national.budgetBalance),
          roundCurrency(trade.tradeCapacity),
          roundCurrency(trade.tradeBalance),
          roundCurrency(trade.tradeFlow)
        ].join(":");
      })
      .join("|");
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

  function budgetFormulaVersion(data, options = {}) {
    const version = options.version || data.meta?.budgetFormulaVersion || "legacy";
    return BUDGET_FORMULAS[version] ? version : "legacy";
  }

  function tariffFormulaVersion(data, options = {}) {
    const version = options.tariffFormulaVersion || options.tariffVersion || data.meta?.tariffFormulaVersion || "legacy";
    return TARIFF_FORMULAS[version] ? version : "legacy";
  }

  function normalizeFiscalModel(value) {
    return FISCAL_MODELS[value] ? value : "";
  }

  function sectorValue(sectors, tier) {
    return Math.max(0, number(sectors?.[tier], 0));
  }

  function industrialSectorBreakdown(industrial, config, national = {}) {
    const physicalTotal = Math.max(0, number(industrial?.[config.totalKey], 0));
    const sectors = industrial?.[config.sectorsKey] || {};
    const hasSectorData = config.tiers.some((tier) => Object.prototype.hasOwnProperty.call(sectors, tier));
    const values = {};
    if (!hasSectorData) {
      config.tiers.forEach((tier) => {
        values[tier] = tier === config.defaultTier ? physicalTotal : 0;
      });
    } else {
      let nonDefaultTotal = 0;
      config.tiers.forEach((tier) => {
        if (tier === config.defaultTier) return;
        values[tier] = sectorValue(sectors, tier);
        nonDefaultTotal += values[tier];
      });
      values[config.defaultTier] = Object.prototype.hasOwnProperty.call(sectors, config.defaultTier)
        ? sectorValue(sectors, config.defaultTier)
        : Math.max(0, physicalTotal - nonDefaultTotal);
    }
    const physical = config.tiers.reduce((total, tier) => total + values[tier], 0);
    const literacyMultipliers = {};
    const sophisticationMultipliers = {};
    const effective = config.tiers.reduce((total, tier) => {
      const literacyMultiplier = literacyIndustrialMultiplier(national, config.literacyImpact?.[tier]);
      const sophisticationMultiplier = sophisticationIndustrialMultiplier(national, config.literacyImpact?.[tier]);
      literacyMultipliers[tier] = literacyMultiplier;
      sophisticationMultipliers[tier] = sophisticationMultiplier;
      return total + values[tier] * config.weights[tier] * literacyMultiplier * sophisticationMultiplier;
    }, 0);
    return { ...values, physical, effective, legacyTotal: physicalTotal, literacyMultipliers, sophisticationMultipliers };
  }

  function industrialSectorOutputs(industrial, national = {}) {
    return {
      civilian: industrialSectorBreakdown(industrial, INDUSTRIAL_SECTOR_CONFIG.civilian, national),
      military: industrialSectorBreakdown(industrial, INDUSTRIAL_SECTOR_CONFIG.military, national),
      shipyard: industrialSectorBreakdown(industrial, INDUSTRIAL_SECTOR_CONFIG.shipyard, national)
    };
  }

  function hasIndustrialSectorData(industrial, config) {
    const sectors = industrial?.[config.sectorsKey];
    return Boolean(sectors && typeof sectors === "object" && config.tiers.some((tier) => Object.prototype.hasOwnProperty.call(sectors, tier)));
  }

  function syncIndustrialSectorTotal(industrial, path) {
    if (!industrial || !path.includes("Sectors.")) return;
    const config = Object.values(INDUSTRIAL_SECTOR_CONFIG).find((candidate) => path.startsWith(`${candidate.sectorsKey}.`));
    if (!config) return;
    industrial[config.totalKey] = roundCurrency(industrialSectorBreakdown(industrial, config).physical);
  }

  function ensureExplicitIndustrialSectorDefault(industrial, path) {
    if (!industrial || !path.includes("Sectors.")) return;
    const config = Object.values(INDUSTRIAL_SECTOR_CONFIG).find((candidate) => path.startsWith(`${candidate.sectorsKey}.`));
    if (!config) return;
    const sectors = industrial[config.sectorsKey] && typeof industrial[config.sectorsKey] === "object" && !Array.isArray(industrial[config.sectorsKey])
      ? industrial[config.sectorsKey]
      : {};
    if (!Object.prototype.hasOwnProperty.call(sectors, config.defaultTier)) {
      sectors[config.defaultTier] = roundCurrency(industrialSectorBreakdown(industrial, config)[config.defaultTier]);
    }
    industrial[config.sectorsKey] = sectors;
  }

  function applyIndustrialSectorDefaultDelta(industrial, config, previousBreakdown, delta) {
    if (!hasIndustrialSectorData(industrial, config) || !delta) return;
    const sectors = industrial[config.sectorsKey] || {};
    sectors[config.defaultTier] = Math.max(0, roundCurrency(number(previousBreakdown?.[config.defaultTier], 0) + delta));
    industrial[config.sectorsKey] = sectors;
  }

  function ensureIndustrialSectorData(industrial, config) {
    if (!industrial) return null;
    if (hasIndustrialSectorData(industrial, config)) return industrial[config.sectorsKey];
    const breakdown = industrialSectorBreakdown(industrial, config);
    const sectors = {};
    config.tiers.forEach((tier) => {
      sectors[tier] = tier === config.defaultTier ? roundCurrency(breakdown[tier]) : 0;
    });
    industrial[config.sectorsKey] = sectors;
    return sectors;
  }

  function healthModernizationMultiplier(health = "Recovery") {
    return { Prosperity: 1.15, Expansion: 1.02, Recovery: 0.78, Slowdown: 0.42, Recession: 0.18, Depression: 0 }[health] ?? 0.78;
  }

  function modernizationRate(score, threshold, maxRate) {
    if (score <= threshold) return 0;
    const progress = clamp((score - threshold) / Math.max(1, 100 - threshold), 0, 1);
    return maxRate * Math.pow(progress, 1.25);
  }

  function convertIndustrialTier(sectors, fromTier, toTier, rate, yearsAdvanced = 1) {
    const available = Math.max(0, Math.floor(number(sectors?.[fromTier], 0)));
    if (!available || rate <= 0) return 0;
    const converted = Math.min(available, Math.floor(available * rate * Math.max(0, yearsAdvanced)));
    if (!converted) return 0;
    sectors[fromTier] = Math.max(0, roundCurrency(number(sectors[fromTier], 0) - converted));
    sectors[toTier] = roundCurrency(number(sectors[toTier], 0) + converted);
    return converted;
  }

  function modernizationScores(national = {}, industrial = {}, military = {}) {
    const sophistication = sophisticationScore(national);
    if (sophistication === null) return null;
    const development = developmentLevelValue(national.developmentLevel, 10) * 5;
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel") * 5;
    const literacy = literacyRateForNational(national);
    const health = healthModernizationMultiplier(national.economicHealth);
    const healthScore = health * 100;
    const mobilization = military?.mobilizationLevel || industrial.mobilizationLevel || "None";
    const mobilizationScore = { None: 0, Partial: 62, Full: 82, Total: 95 }[mobilization] || 0;
    const warSupport = clamp(number(national.warSupport, 50), 0, 100);
    const militaryOrganization = clamp(number(military?.militaryOrganization, 0), 0, 100);
    const shipyardDepth = clamp(Math.sqrt(Math.max(0, number(industrial.shipyards, 0))) * 10, 0, 100);
    return {
      civilianImproved: sophistication * 0.44 + infrastructure * 0.2 + development * 0.14 + literacy * 0.1 + healthScore * 0.12,
      civilianAdvanced: sophistication * 0.46 + literacy * 0.22 + development * 0.14 + infrastructure * 0.1 + healthScore * 0.08,
      militaryImproved: sophistication * 0.38 + infrastructure * 0.16 + development * 0.12 + literacy * 0.1 + healthScore * 0.09 + Math.max(mobilizationScore, warSupport) * 0.15,
      militaryAdvanced: sophistication * 0.42 + literacy * 0.18 + development * 0.12 + infrastructure * 0.1 + healthScore * 0.07 + Math.max(mobilizationScore, warSupport) * 0.07 + militaryOrganization * 0.04,
      shipyardLarge: sophistication * 0.4 + infrastructure * 0.24 + development * 0.12 + literacy * 0.08 + healthScore * 0.08 + shipyardDepth * 0.08,
      shipyardMega: sophistication * 0.48 + infrastructure * 0.18 + development * 0.12 + literacy * 0.1 + healthScore * 0.05 + shipyardDepth * 0.07
    };
  }

  function advanceIndustrialModernization(industrial, national, military, yearsAdvanced = 1) {
    const scores = modernizationScores(national, industrial, military);
    if (!scores) return null;
    const civilian = ensureIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.civilian);
    const militarySectors = ensureIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.military);
    const shipyard = ensureIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.shipyard);
    const changes = {
      civilianBasicToImproved: convertIndustrialTier(civilian, "basic", "improved", modernizationRate(scores.civilianImproved, 40, 0.04), yearsAdvanced),
      civilianImprovedToAdvanced: convertIndustrialTier(civilian, "improved", "advanced", modernizationRate(scores.civilianAdvanced, 70, 0.02), yearsAdvanced),
      militaryBasicToImproved: convertIndustrialTier(militarySectors, "basic", "improved", modernizationRate(scores.militaryImproved, 42, 0.04), yearsAdvanced),
      militaryImprovedToAdvanced: convertIndustrialTier(militarySectors, "improved", "advanced", modernizationRate(scores.militaryAdvanced, 72, 0.02), yearsAdvanced),
      shipyardMediumToLarge: convertIndustrialTier(shipyard, "medium", "large", modernizationRate(scores.shipyardLarge, 50, 0.03), yearsAdvanced),
      shipyardLargeToMega: convertIndustrialTier(shipyard, "large", "mega", modernizationRate(scores.shipyardMega, 90, 0.01), yearsAdvanced)
    };
    syncIndustrialSectorTotal(industrial, "civilianSectors.basic");
    syncIndustrialSectorTotal(industrial, "militarySectors.basic");
    syncIndustrialSectorTotal(industrial, "shipyardSectors.medium");
    return changes;
  }

  function fiscalModelForNation(data, id, national = data.national?.[id]) {
    const explicit = normalizeFiscalModel(national?.fiscalModel);
    if (explicit) return explicit;
    const industrial = data.industrial?.[id] || {};
    const taxRate = number(national?.taxRate, 0);
    const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
    const development = number(national?.developmentLevel, 0);
    const stability = number(national?.governmentalStability, 0);
    const governance = governanceMetrics(national);
    const health = national?.economicHealth || "Recovery";
    const sectorOutput = industrialSectorOutputs(industrial, national);
    const industrialScale = sectorOutput.civilian.effective + sectorOutput.military.effective + sectorOutput.shipyard.effective;
    const isStrongEconomy = ["Prosperity", "Expansion"].includes(health);
    const isHighCapacity = development >= 18 && stability >= 85 && governance.governmentalEfficiency >= GOVERNANCE_HIGH_CAPACITY_MIN_EFFICIENCY && isStrongEconomy && industrialScale >= 650;
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

    const sectorOutput = industrialSectorOutputs(industrial, national);
    const civFactories = sectorOutput.civilian.effective;
    const militaryFactories = sectorOutput.military.effective;
    const shipyards = sectorOutput.shipyard.effective;
    const physicalCivFactories = sectorOutput.civilian.physical;
    const physicalMilitaryFactories = sectorOutput.military.physical;
    const physicalShipyards = sectorOutput.shipyard.physical;
    const developmentLevel = number(national.developmentLevel, 0);
    const population = getPopulation(data, id);
    const governance = governanceMetrics(national);
    const corruption = governance.fiscalCorruption;
    const economicHealth = national.economicHealth || "Recovery";
    const taxRate = number(national.taxRate, 0);
    const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
    const fiscalModel = fiscalModelForNation(data, id, national);
    const fiscalProfile = FISCAL_MODELS[fiscalModel] || FISCAL_MODELS.Standard;
    const mobilizationLevel = military.mobilizationLevel || industrial.mobilizationLevel || "None";
    const mobilization = MOBILIZATION[mobilizationLevel] || MOBILIZATION.None;
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
      physicalCivFactories,
      physicalMilitaryFactories,
      physicalShipyards,
      sectorOutput,
      developmentLevel,
      population,
      governance,
      governmentalCorruption: governance.governmentalCorruption,
      crimeRate: governance.crimeRate,
      governmentalEfficiency: governance.governmentalEfficiency,
      corruption,
      economicHealth,
      taxRate,
      taxRatePercent,
      fiscalModel,
      fiscalProfile,
      mobilizationLevel,
      mobilization,
      tradeBalance,
      stability
    };
  }

  function calculateTaxBurdenForNation(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const { taxRatePercent, developmentLevel, corruption, economicHealth, stability, national, fiscalModel, fiscalProfile, governance } = inputs;
    const bureaucracyMultiplier = governance.efficiencyMultiplier;
    const sustainableTaxRate = roundPercent(clamp(4 + developmentLevel * 0.4 + fiscalProfile.sustainableTaxBonus, 3, 42));
    const taxPressure = roundPercent(Math.max(0, taxRatePercent - sustainableTaxRate));
    const healthPressure = { Prosperity: 0.75, Expansion: 0.9, Recovery: 1, Slowdown: 1.35, Recession: 1.75, Depression: 2.25 }[economicHealth] || 1;
    const stabilityPressure = 1 + clamp((70 - stability) / 60, 0, 1.25);
    const corruptionPressure = 1 + clamp(corruption / 180, 0, 0.75);
    const bureaucracyPressure = governance.bureaucracyPressure;
    const pressureScore = roundPercent(taxPressure * healthPressure * stabilityPressure * corruptionPressure * bureaucracyPressure * fiscalProfile.pressureMultiplier);
    let tier = "Stable";
    if (pressureScore > 16) tier = "Crisis";
    else if (pressureScore > 9) tier = "Volatile";
    else if (pressureScore > 4) tier = "Agitated";
    else if (taxPressure > 0) tier = "Strained";

    const baseUnrestChange = tier === "Crisis" ? 3 : tier === "Volatile" ? 2 : tier === "Agitated" ? 1 : 0;
    const currentUnrest = clamp(number(national.publicUnrest, 0), 0, 10);
    const suggestedUnrestChange = clamp(baseUnrestChange, 0, Math.max(0, 10 - currentUnrest));
    const collectionCeiling = clamp(bureaucracyMultiplier, 0.05, 1);
    const minimumCollectionMultiplier = Math.min(
      fiscalProfile.collectionFloor * clamp(1 - corruption / 240, 0.5, 1) * clamp(bureaucracyMultiplier, 0.2, 1),
      collectionCeiling
    );
    const normalCollectionDrag = clamp(1 - taxRatePercent * (0.0022 + corruption / 60000) * fiscalProfile.avoidanceMultiplier, 0.82, 1);
    const saturationMultiplier = clamp(1 / (1 + pressureScore * 0.08), fiscalProfile.collectionFloor, 1);
    const avoidanceMultiplier = clamp(1 - taxPressure * (0.005 + corruption / 12000) * fiscalProfile.avoidanceMultiplier, 0.45, 1);
    const collectionMultiplier = roundPercent(clamp(normalCollectionDrag * saturationMultiplier * avoidanceMultiplier * bureaucracyMultiplier, minimumCollectionMultiplier, collectionCeiling));
    const normalPopulationDrag = taxRatePercent * 0.012 * healthPressure * fiscalProfile.populationPenaltyMultiplier;
    const normalImmigrationDrag = taxRatePercent * 0.008 * healthPressure * fiscalProfile.immigrationPenaltyMultiplier;
    const normalIndustryDrag = taxRatePercent * 0.0035 * healthPressure * fiscalProfile.industryPenaltyMultiplier;
    const populationGrowthPenalty = roundPercent(clamp(normalPopulationDrag + taxPressure * 0.08 * healthPressure * fiscalProfile.populationPenaltyMultiplier, 0, 3));
    const immigrationPenalty = roundPercent(clamp(normalImmigrationDrag + Math.max(0, taxPressure - 4) * 0.08 * healthPressure * fiscalProfile.immigrationPenaltyMultiplier, 0, 3));
    const industryGrowthMultiplier = roundPercent(clamp(1 - normalIndustryDrag - taxPressure * 0.025 * healthPressure * fiscalProfile.industryPenaltyMultiplier, 0.35, 1));
    const warnings = [];
    if (fiscalModel !== "Standard") warnings.push(`${fiscalModel} fiscal model is moderating the tax burden.`);
    if (taxPressure > 0) warnings.push(`Tax rate is ${roundPercent(taxPressure)} points above the sustainable rate.`);
    if (suggestedUnrestChange > 0) warnings.push(`Consider +${suggestedUnrestChange} public unrest if this tax level persists.`);
    if (collectionMultiplier < 0.8) warnings.push("High tax pressure is reducing collection efficiency.");
    if (governance.governmentalEfficiency < GOVERNANCE_HIGH_CAPACITY_MIN_EFFICIENCY) warnings.push("Low governmental efficiency is slowing tax administration.");
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

  function industrialBudgetContribution(inputs) {
    const { civFactories, militaryFactories, shipyards, physicalCivFactories, physicalMilitaryFactories, physicalShipyards, developmentLevel, mobilization } = inputs;
    const effectiveContributionRate = 5 + developmentLevel * 0.75;
    const developmentMultiplier = 1 + developmentLevel * 0.25;
    const physicalIndustry = physicalCivFactories + physicalMilitaryFactories + physicalShipyards;
    return ((civFactories * effectiveContributionRate) + (militaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) + (shipyards * effectiveContributionRate * 1.5)) / (1 + physicalIndustry * 0.0025) * developmentMultiplier;
  }

  function peacetimeBudgetInputs(inputs) {
    return {
      ...inputs,
      mobilizationLevel: "None",
      mobilization: MOBILIZATION.None
    };
  }

  function mobilizedBudgetFoundation(inputs) {
    const populationBase = Math.sqrt(Math.max(inputs.population, 0) / 1_000_000) * 250;
    const civilianBase = Math.sqrt(Math.max(inputs.civFactories, 0)) * 1700;
    const shipyardBase = Math.sqrt(Math.max(inputs.shipyards, 0)) * 3200;
    const militaryBase = Math.sqrt(Math.max(inputs.militaryFactories, 0)) * 1200;
    const developmentBase = developmentLevelValue(inputs.developmentLevel, 0) * 1900;
    const industryDepth = Math.max(inputs.civFactories, 0)
      + Math.max(inputs.shipyards, 0) * 1.8
      + Math.max(inputs.militaryFactories, 0) * 1.3;
    const advancedIndustrialSurge = industryDepth * developmentReferenceRatio(inputs.developmentLevel) * 45;
    return populationBase + civilianBase + shipyardBase + militaryBase + developmentBase + advancedIndustrialSurge;
  }

  function mobilizedBudgetStateCapacity(inputs) {
    const development = developmentReferenceRatio(inputs.developmentLevel);
    const stability = clamp(inputs.stability / 100, 0, 1.15);
    const corruptionControl = clamp((100 - inputs.governance.stateCapacityCorruption) / 100, 0, 1);
    const baseCapacity = 0.5 + development * 0.32 + stability * 0.28 + corruptionControl * 0.22;
    return clamp(baseCapacity * inputs.governance.efficiencyMultiplier, 0.05, 1.28);
  }

  function mobilizedBudgetResolveMultiplier(level, warSupport) {
    const profile = MOBILIZED_BUDGET_RESOLVE[level] || MOBILIZED_BUDGET_RESOLVE.None;
    const resolve = Math.pow(clamp(warSupport, 0, 1), profile.exponent);
    return clamp(profile.base + resolve * profile.scale, profile.min, profile.max);
  }

  function wartimeBudgetPeakBonusFromInputs(inputs, peacetimeBudgetCapacity) {
    const unlock = MOBILIZED_BUDGET_UNLOCK[inputs.mobilizationLevel] || 0;
    if (unlock <= 0) return 0;
    const foundation = mobilizedBudgetFoundation(inputs);
    const stateCapacity = mobilizedBudgetStateCapacity(inputs);
    const warSupport = clamp(number(inputs.national?.warSupport, 50) / 100, 0, 1);
    const readiness = clamp(0.62 + warSupport * 0.38, 0.45, 1);
    const latentBudgetDepth = clamp(Math.pow(Math.max(foundation * 0.95, 1) / Math.max(peacetimeBudgetCapacity, 1000), 0.25), 0.85, 1.35);
    const resolveMultiplier = mobilizedBudgetResolveMultiplier(inputs.mobilizationLevel, warSupport);
    return Math.max(0, roundCurrency(foundation * stateCapacity * readiness * latentBudgetDepth * unlock * resolveMultiplier));
  }

  function mobilizationFinanceAbility(inputs) {
    const development = developmentReferenceRatio(inputs.developmentLevel);
    const stability = clamp(inputs.stability / 100, 0, 1.15);
    const corruptionControl = clamp((100 - inputs.governance.stateCapacityCorruption) / 100, 0, 1);
    const warSupport = clamp(number(inputs.national?.warSupport, 50) / 100, 0, 1);
    const industryDepth = clamp(Math.sqrt(Math.max(inputs.civFactories + inputs.militaryFactories + inputs.shipyards, 0)) / 36, 0, 1);
    const baseAbility = 0.36 + development * 0.24 + stability * 0.2 + corruptionControl * 0.17 + warSupport * 0.14 + industryDepth * 0.24;
    return clamp(baseAbility * inputs.governance.efficiencyMultiplier, 0.05, 1.25);
  }

  function mobilizationFinanceEndurance(inputs) {
    const development = developmentReferenceRatio(inputs.developmentLevel);
    const stability = clamp(inputs.stability / 100, 0, 1.15);
    const corruptionControl = clamp((100 - inputs.governance.stateCapacityCorruption) / 100, 0, 1);
    const warSupport = clamp(number(inputs.national?.warSupport, 50) / 100, 0, 1);
    const populationDepth = clamp(Math.sqrt(Math.max(inputs.population, 0) / 25_000_000), 0, 1.7);
    const shipyardDepth = clamp(Math.sqrt(Math.max(inputs.shipyards, 0)) / 12, 0, 1);
    const baseEndurance = 0.65 + development * 1.7 + stability * 1.15 + corruptionControl * 1.25 + warSupport * 0.8 + populationDepth * 0.65 + shipyardDepth * 0.55;
    return clamp(baseEndurance * inputs.governance.efficiencyMultiplier, 0.05, 6.5);
  }

  function mobilizationFinanceMetricsFromInputs(inputs, peacetimeBudgetCapacity) {
    const level = inputs.mobilizationLevel || "None";
    const profile = MOBILIZATION_FINANCE[level] || MOBILIZATION_FINANCE.None;
    const peakBonus = wartimeBudgetPeakBonusFromInputs(inputs, peacetimeBudgetCapacity);
    const national = inputs.national || {};
    if (!peakBonus || level === "None") {
      return {
        wartimeBudgetPeakBonus: 0,
        wartimeBudgetBonus: 0,
        wartimeBudgetAutoExpenditure: 0,
        wartimeBudgetHeadroom: 0,
        effectiveBudgetExpenditure: roundCurrency(number(national.budgetExpenditure, 0)),
        mobilizationEffectiveness: 0,
        mobilizationAbility: 0,
        mobilizationEnduranceYears: 0
      };
    }
    const storedLevel = national.mobilizationFinanceLevel || level;
    const sameLevel = storedLevel === level;
    const mobilizationYears = sameLevel ? Math.max(0, number(national.mobilizationYears, 0)) : 0;
    const readiness = clamp(sameLevel ? number(national.mobilizationReadiness, 1) : 1, 0, 1);
    const strain = clamp(sameLevel ? number(national.mobilizationStrain, 0) : 0, 0, profile.maxStrain);
    const effectiveness = clamp(readiness * (1 - strain), 0, 1);
    const currentBonus = roundCurrency(peakBonus * effectiveness);
    const autoSpendShare = mobilizationYears > 0
      ? clamp(profile.autoSpendShare * (0.88 + readiness * 0.12 + strain * 0.12), 0, 0.95)
      : 0;
    const autoExpenditure = Math.min(roundCurrency(currentBonus * autoSpendShare), Math.max(0, currentBonus - 1));
    const headroom = Math.max(0, roundCurrency(currentBonus - autoExpenditure));
    return {
      wartimeBudgetPeakBonus: peakBonus,
      wartimeBudgetBonus: currentBonus,
      wartimeBudgetAutoExpenditure: autoExpenditure,
      wartimeBudgetHeadroom: headroom,
      effectiveBudgetExpenditure: roundCurrency(number(national.budgetExpenditure, 0) + autoExpenditure),
      mobilizationEffectiveness: roundPercent(effectiveness),
      mobilizationAbility: roundPercent(mobilizationFinanceAbility(inputs)),
      mobilizationEnduranceYears: roundPercent(mobilizationFinanceEndurance(inputs))
    };
  }

  function calculateTariffBurdenForNation(data, id) {
    const national = data.national?.[id] || {};
    const tradeRow = data.trade?.[id] || {};
    const tariffRate = clamp(number(tradeRow.tariffRate, 0), 0, 50);
    const tradePolicy = tradeRow.tradePolicy || "Balanced";
    const sustainableTariffRate = TARIFF_POLICY_LIMITS[tradePolicy] ?? TARIFF_POLICY_LIMITS.Balanced;
    const tariffPressure = roundPercent(Math.max(0, tariffRate - sustainableTariffRate));
    const health = national.economicHealth || "Recovery";
    const healthPressure = { Prosperity: 0.9, Expansion: 1, Recovery: 1.1, Slowdown: 1.35, Recession: 1.7, Depression: 2.1 }[health] || 1.1;
    const stabilityPressure = 1 + clamp((70 - number(national.governmentalStability, 70)) / 90, 0, 0.8);
    const governance = governanceMetrics(national);
    const corruptionPressure = 1 + clamp(governance.fiscalCorruption / 220, 0, 0.55);
    const importReliance = Math.max(0, number(tradeRow.importReliance, 0));
    const exportReliance = Math.max(0, number(tradeRow.exportReliance, 0));
    const importShare = clamp(importReliance / Math.max(importReliance + exportReliance, 1), 0.25, 0.75);
    const importExposure = clamp(0.85 + importShare * 0.55, 0.95, 1.25);
    const policySensitivity = TARIFF_POLICY_SENSITIVITY[tradePolicy] ?? TARIFF_POLICY_SENSITIVITY.Balanced;
    const tariffShockScore = roundPercent(tariffPressure * healthPressure * stabilityPressure * corruptionPressure * governance.bureaucracyPressure * importExposure * policySensitivity);
    const collectionFriction = clamp(1 - tariffPressure * 0.06 - Math.max(0, tariffPressure - 6) * 0.045 - Math.max(0, tariffPressure - 14) * 0.07, 0.12, 1);
    const warnings = [];
    if (tariffPressure > 0) warnings.push(`Tariff is ${roundPercent(tariffPressure)} points above the ${tradePolicy} comfort line.`);
    if (tariffShockScore >= 18) warnings.push("Tariff shock is severely reducing trade competitiveness.");
    else if (tariffShockScore >= 8) warnings.push("Tariff shock is reducing trade competitiveness.");
    if (governance.governmentalEfficiency < GOVERNANCE_WARNING_EFFICIENCY) warnings.push("Bureaucratic drag is amplifying tariff shock.");
    return {
      tariffRate,
      tradePolicy,
      sustainableTariffRate,
      tariffPressure,
      tariffShockScore,
      collectionFriction: roundPercent(collectionFriction),
      tradeFlowMultiplier: roundPercent(clamp(1 - tariffShockScore * 0.018, 0.42, 1)),
      capacityMultiplier: roundPercent(clamp(1 - tariffShockScore * 0.014, 0.48, 1)),
      exportAccessMultiplier: roundPercent(clamp(1 - tariffShockScore * 0.012, 0.55, 1)),
      importDemandMultiplier: roundPercent(clamp(1 - tariffShockScore * 0.009, 0.58, 1)),
      importCostMultiplier: roundPercent(1 + tariffRate / 260 + tariffShockScore / 135),
      servicesMultiplier: roundPercent(clamp(1 - tariffShockScore * 0.015, 0.5, 1)),
      warnings
    };
  }

  function calculateTariffRevenueForNation(data, id) {
    const national = data.national?.[id];
    const tradeRow = data.trade?.[id];
    if (!national || !tradeRow) {
      return {
        tariffRate: 0,
        tradeFlow: 0,
        grossTariffBase: 0,
        collectionEfficiency: 0,
        tariffRevenue: 0,
        warnings: ["Missing national or trade data."]
      };
    }
    const tariffBurden = calculateTariffBurdenForNation(data, id);
    const storedTradeFlow = number(tradeRow.tradeFlow, null);
    const calculatedTrade = storedTradeFlow === null ? calculateTradeForNation(data, id) || {} : {};
    const tariffRate = clamp(number(tradeRow.tariffRate, 0), 0, 50);
    const tradeFlow = Math.max(0, storedTradeFlow ?? number(calculatedTrade.tradeFlow, 0));
    const developmentLevel = number(national.developmentLevel, 0);
    const governance = governanceMetrics(national);
    const corruption = governance.governmentalCorruption;
    const tradePolicy = tradeRow.tradePolicy || "Balanced";
    const sanctionsLevel = tradeRow.sanctionsLevel || "None";
    const policyCollection = { "Free Trade": 1, "Open Market": 0.95, Balanced: 0.9, Protectionist: 0.82 }[tradePolicy] || 0.9;
    const sanctionsCollection = { None: 1, Light: 0.85, Moderate: 0.65, Heavy: 0.42, Total: 0.2 }[sanctionsLevel] || 1;
    const developmentCollection = clamp(0.45 + developmentLevel / 32, 0.45, 1.05);
    const corruptionCollection = clamp(1 - corruption / 160, 0.45, 1);
    const highTariffFriction = tariffBurden.collectionFriction;
    const collectionEfficiency = clamp(policyCollection * sanctionsCollection * developmentCollection * corruptionCollection * highTariffFriction * governance.efficiencyMultiplier, 0, 1.2);
    const importReliance = Math.max(0, number(tradeRow.importReliance, 0));
    const exportReliance = Math.max(0, number(tradeRow.exportReliance, 0));
    const importShare = clamp(importReliance / Math.max(importReliance + exportReliance, 1), 0.25, 0.75);
    const policyTaxableShare = { "Free Trade": 0.18, "Open Market": 0.2, Balanced: 0.22, Protectionist: 0.26 }[tradePolicy] || 0.22;
    const taxableTradeShare = importShare * policyTaxableShare;
    const customsTradeBase = tradeFlow * taxableTradeShare;
    const grossTariffBase = customsTradeBase * (tariffRate / 100);
    const tariffRevenue = roundCurrency(grossTariffBase * collectionEfficiency);
    const warnings = [...tariffBurden.warnings];
    if (tariffRate >= 20) warnings.push("High tariff rates are reducing collection efficiency and trade competitiveness.");
    else if (tariffRate >= 10) warnings.push("Elevated tariff rates may slow trade growth if kept long-term.");
    if (sanctionsLevel !== "None") warnings.push(`${sanctionsLevel} sanctions are reducing collectible tariff revenue.`);
    if (corruption >= 45) warnings.push("Governmental corruption is reducing tariff collection efficiency.");
    if (governance.governmentalEfficiency < GOVERNANCE_WARNING_EFFICIENCY) warnings.push("Governmental inefficiency is reducing tariff collection efficiency.");
    if (tradeFlow <= 0 && tariffRate > 0) warnings.push("No active trade flow is available for tariff collection.");
    return {
      tariffRate,
      tradeFlow: roundCurrency(tradeFlow),
      taxableTradeShare: roundPercent(taxableTradeShare * 100),
      customsTradeBase: roundCurrency(customsTradeBase),
      grossTariffBase: roundCurrency(grossTariffBase),
      collectionEfficiency: roundPercent(collectionEfficiency * 100),
      tariffRevenue,
      sustainableTariffRate: tariffBurden.sustainableTariffRate,
      tariffPressure: tariffBurden.tariffPressure,
      tariffShockScore: tariffBurden.tariffShockScore,
      collectionFriction: roundPercent(tariffBurden.collectionFriction * 100),
      warnings
    };
  }

  function budgetCapacityFromBreakdown(inputs, industrialContribution, populationContribution, tariffRevenue = 0) {
    const { physicalCivFactories, physicalMilitaryFactories, physicalShipyards, mobilization, national, tradeBalance } = inputs;
    const maintenanceCost = (physicalCivFactories + physicalShipyards + physicalMilitaryFactories * mobilization.maintenanceCost) * 0.1;
    const administrativeCapacityMultiplier = clamp(0.35 + number(inputs.governance?.efficiencyMultiplier, 1) * 0.65, 0.35, 1);
    const baseBudgetTotal = (10 + industrialContribution + populationContribution - maintenanceCost) * administrativeCapacityMultiplier;
    const tradeImpactOnBudget = Math.max(0.1, 1 + (tradeBalance / Math.max(baseBudgetTotal, 100)) * 0.1);
    const budgetCapacity = Math.max(0, Math.round(baseBudgetTotal * tradeImpactOnBudget + number(tariffRevenue, 0)) + number(national.budgetAdjustment, 0));
    return {
      budgetCapacity,
      industrialContribution,
      populationContribution,
      tariffRevenue: roundCurrency(tariffRevenue),
      maintenanceCost,
      administrativeCapacityMultiplier,
      baseBudgetTotal,
      tradeImpactOnBudget
    };
  }

  function legacyBudgetBreakdown(data, id) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const peacetimeInputs = peacetimeBudgetInputs(inputs);
    const { developmentLevel, population, taxRate, corruption, economicHealth, governance } = inputs;
    const developmentImpact = Math.pow(developmentLevel / 10, 3) * (1 + developmentLevel / 20);
    const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));
    const populationContribution = (Math.log(Math.max(population, 1)) + population / 250000) * taxRateScalingFactor * developmentImpact * ((100 - corruption) / 100) * governance.efficiencyMultiplier * (HEALTH_BUDGET[economicHealth] || 1);
    const breakdown = {
      formulaVersion: "legacy",
      taxRevenue: populationContribution,
      ...budgetCapacityFromBreakdown(peacetimeInputs, industrialBudgetContribution(peacetimeInputs), populationContribution)
    };
    const mobilizationFinance = mobilizationFinanceMetricsFromInputs(inputs, breakdown.budgetCapacity);
    Object.assign(breakdown, mobilizationFinance);
    breakdown.mobilizedBudgetCapacity = breakdown.budgetCapacity + breakdown.wartimeBudgetBonus;
    return breakdown;
  }

  function tax2026BudgetBreakdown(data, id, options = {}) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const peacetimeInputs = peacetimeBudgetInputs(inputs);
    const { developmentLevel, population, taxRatePercent, corruption, economicHealth, stability, fiscalProfile, governance } = inputs;
    const taxBurden = calculateTaxBurdenForNation(data, id);
    const developmentCollection = clamp(0.18 + Math.pow(developmentReferenceRatio(developmentLevel), 1.35) * 0.95, 0.18, 1.15);
    const stabilityFactor = clamp(0.55 + stability / 200, 0.4, 1.1);
    const corruptionFactor = clamp((100 - corruption) / 100, 0.05, 1);
    const healthFactor = HEALTH_BUDGET[economicHealth] || 1;
    const collectionEfficiency = clamp(developmentCollection * stabilityFactor * corruptionFactor * healthFactor * fiscalProfile.collectionEfficiencyMultiplier * governance.efficiencyMultiplier, 0.05, 1.35);
    const taxDrag = taxBurden?.collectionMultiplier ?? 1;
    const taxRevenue = (population / 125000) * clamp(taxRatePercent, 0, 60) * collectionEfficiency * taxDrag * fiscalProfile.taxYieldMultiplier;
    const legacyPopulationContribution = legacyBudgetBreakdown(data, id)?.populationContribution || 0;
    const populationContribution = Math.max(legacyPopulationContribution, taxRevenue);
    const tariff = calculateTariffRevenueForNation(data, id);
    const tariffRevenue = tariffFormulaVersion(data, options) === "tariff2026" ? tariff.tariffRevenue : 0;
    const breakdown = {
      formulaVersion: "tax2026",
      taxRevenue,
      tariff,
      developmentCollection,
      collectionEfficiency,
      taxDrag,
      taxBurden,
      ...budgetCapacityFromBreakdown(peacetimeInputs, industrialBudgetContribution(peacetimeInputs), populationContribution, tariffRevenue)
    };
    const mobilizationFinance = mobilizationFinanceMetricsFromInputs(inputs, breakdown.budgetCapacity);
    Object.assign(breakdown, mobilizationFinance);
    breakdown.mobilizedBudgetCapacity = breakdown.budgetCapacity + breakdown.wartimeBudgetBonus;
    return breakdown;
  }

  function calculateBudgetBreakdownForNation(data, id, options = {}) {
    return budgetFormulaVersion(data, options) === "tax2026"
      ? tax2026BudgetBreakdown(data, id, options)
      : legacyBudgetBreakdown(data, id);
  }

  function calculateBudgetForNation(data, id, options = {}) {
    const breakdown = calculateBudgetBreakdownForNation(data, id, options);
    return breakdown ? breakdown.budgetCapacity : null;
  }

  function wartimeBudgetBonus(data, id) {
    return Math.max(0, roundCurrency(data.national?.[id]?.wartimeBudgetBonus));
  }

  function displayBudgetCapacity(data, id) {
    const national = data.national?.[id] || {};
    return roundCurrency(number(national.mobilizedBudgetCapacity, number(national.budgetCapacity, 0) + wartimeBudgetBonus(data, id)));
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
    governanceMetrics,
    calculateBudgetBreakdownForNation
  });

  function advancePopulation(data, id, fromYear, toYear) {
    const national = data.national[id];
    const populationRow = data.population[id];
    if (!national || !populationRow) return null;
    const currentPopulation = getPopulation(data, id, fromYear);
    const economicHealth = national.economicHealth || "Recovery";
    if (!currentPopulation || !(economicHealth in HEALTH_DEMOGRAPHICS)) {
      setPopulation(data, id, toYear, currentPopulation);
      return { from: currentPopulation, to: currentPopulation, growthRate: 0 };
    }
    const stability = number(national.governmentalStability, 0);
    const unrest = number(national.publicUnrest, 0);
    const development = number(national.developmentLevel, 0);
    const governance = governanceMetrics(national);
    const corruption = governance.socialCorruption;
    const bureaucracyDrag = 1 - governance.efficiencyMultiplier;
    const immigrationRate = number(national.immigrationRate, 0);
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};
    const effectiveImmigrationRate = immigrationRate - number(taxBurden.immigrationPenalty, 0);
    const policy = populationRow.mandatoryChildPolicy || "No Policy";
    const healthProfile = HEALTH_DEMOGRAPHICS[economicHealth] || HEALTH_DEMOGRAPHICS.Recovery;
    const maturity = currentEraDevelopmentRatio(development);
    const demographicBase = 1.72 - maturity * 1.9;
    const stabilityEffect = clamp((stability - 65) * 0.0038, -0.32, 0.22);
    const policyEffect = (CHILD_POLICY_POPULATION_EFFECT[policy] || 0) * clamp(1 - maturity * 0.25, 0.72, 1.05);
    const taxGrowthPenalty = number(taxBurden.populationGrowthPenalty, 0) * 0.55;
    const stressPenalty = unrest * 0.045 + corruption * 0.004 + bureaucracyDrag * 0.28 + taxGrowthPenalty;
    const sizeDamping = clamp(1 - Math.max(0, Math.log10(currentPopulation / 6000000)) * 0.2, 0.5, 1);
    const maturityStabilizer = economicHealth === "Prosperity" ? maturity * 0.18 : 0;
    const literacyGrowthSlowdown = literacyPopulationGrowthSlowdown(national);
    const naturalGrowth = (demographicBase + healthProfile.naturalGrowth + maturityStabilizer + stabilityEffect + policyEffect - stressPenalty - literacyGrowthSlowdown) * sizeDamping;
    const migrationDamping = clamp(1 - Math.max(0, Math.log10(currentPopulation / 25000000)) * 0.26, 0.28, 1) * clamp(1 - maturity * 0.35, 0.55, 1);
    const migrationAttractiveness = healthProfile.migration
      + clamp((stability - 60) * 0.007, -0.35, 0.28)
      + clamp((development - 10) * 0.025, -0.15, 0.28)
      - unrest * 0.045
      - corruption * 0.006
      - bureaucracyDrag * 0.5
      - number(taxBurden.immigrationPenalty, 0) * 0.4;
    const migrationGrowth = clamp((effectiveImmigrationRate * 0.15 + migrationAttractiveness * 0.08) * migrationDamping, -0.9, 0.9);
    const rawGrowthRate = clamp(naturalGrowth + migrationGrowth, -4.5, 3.5);
    const rawPopulationChange = currentPopulation * (rawGrowthRate / 100);
    const normalAnnualMovement = 150000 + Math.sqrt(currentPopulation) * 30;
    const inertiaPressure = Math.max(0, Math.abs(rawPopulationChange) / Math.max(normalAnnualMovement, 1) - 1);
    const inertiaMultiplier = 1 / (1 + Math.pow(inertiaPressure, 1.25) * 1.5);
    const growthRate = roundPercent(rawGrowthRate * inertiaMultiplier);
    const nextPopulation = Math.round(currentPopulation * (1 + growthRate / 100));
    setPopulation(data, id, toYear, nextPopulation);
    return {
      from: currentPopulation,
      to: nextPopulation,
      growthRate,
      populationFormulaVersion: "population2026",
      naturalGrowth: roundPercent(naturalGrowth),
      migrationGrowth: roundPercent(migrationGrowth),
      demographicMaturity: roundPercent(maturity * 100),
      sizeDamping: roundPercent(sizeDamping * 100),
      migrationDamping: roundPercent(migrationDamping * 100),
      inertiaDamping: roundPercent(inertiaMultiplier * 100),
      normalAnnualMovement: roundCurrency(normalAnnualMovement),
      maturityStabilizer: roundPercent(maturityStabilizer),
      literacyGrowthSlowdown: roundPercent(literacyGrowthSlowdown),
      policyEffect: roundPercent(policyEffect),
      stressPenalty: roundPercent(stressPenalty)
    };
  }

  function moveToward(currentValue, targetValue, rate, maxDown, maxUp, years = 1) {
    const gap = number(targetValue, 0) - number(currentValue, 0);
    const yearScale = Math.max(0, number(years, 1));
    return clamp(gap * rate * yearScale, -maxDown * yearScale, maxUp * yearScale);
  }

  function advanceGovernance(data, id, years = 1) {
    const national = data.national[id];
    if (!national) return null;
    const yearsAdvanced = Math.max(0, number(years, 1));
    if (!yearsAdvanced) return null;

    const legacyCorruption = percentStat(national.corruption, 0);
    const literacy = literacyRateForNational(national);
    const development = developmentLevelValue(national.developmentLevel, 0);
    const stability = percentStat(national.governmentalStability, 70);
    const unrest = clamp(number(national.publicUnrest, 0), 0, 10);
    const health = national.economicHealth || "Recovery";
    const healthCrimePressure = { Prosperity: -3, Expansion: -1.5, Recovery: 0, Slowdown: 2, Recession: 5, Depression: 8 }[health] || 0;
    const healthCorruptionPressure = { Prosperity: -2, Expansion: -1, Recovery: 0, Slowdown: 1.5, Recession: 3, Depression: 5 }[health] || 0;

    const currentCrime = percentStat(national.crimeRate, legacyCorruption);
    const literacyDeficit = Math.max(0, GOVERNANCE_CRIME_LITERACY_NEUTRAL - literacy);
    const lowStabilityCrimePressure = Math.max(0, 68 - stability) * 0.35;
    const crimeTarget = clamp(
      10
        + literacyDeficit * GOVERNANCE_CRIME_LITERACY_SENSITIVITY
        + unrest * 2.2
        + lowStabilityCrimePressure
        + healthCrimePressure
        - development * 0.2,
      3,
      100
    );
    const crimeChange = moveToward(currentCrime, crimeTarget, GOVERNANCE_CRIME_ADJUSTMENT_RATE, 2.2, 4.5, yearsAdvanced);
    const nextCrime = roundPercent(clamp(currentCrime + crimeChange, 0, 100));

    const currentCorruption = percentStat(national.governmentalCorruption, legacyCorruption);
    const crimeCorruptionPressure = Math.max(0, nextCrime - 25) * 1.25;
    const lowStabilityCorruptionPressure = Math.max(0, 65 - stability) * 0.25;
    const corruptionTarget = clamp(
      10
        + crimeCorruptionPressure
        + lowStabilityCorruptionPressure
        + unrest * 1.2
        + healthCorruptionPressure
        - development * 0.1,
      4,
      100
    );
    const corruptionChange = moveToward(currentCorruption, corruptionTarget, GOVERNANCE_CORRUPTION_ADJUSTMENT_RATE, 1.5, 3.0, yearsAdvanced);
    const nextCorruption = roundPercent(clamp(currentCorruption + corruptionChange, 0, 100));

    const currentEfficiency = clamp(number(national.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
    const corruptionEfficiencyPressure = Math.max(0, nextCorruption - 30) * 0.65;
    const crimeEfficiencyPressure = Math.max(0, nextCrime - 60) * 0.15;
    const instabilityEfficiencyPressure = Math.max(0, 70 - stability) * 0.08;
    const efficiencyTarget = clamp(
      GOVERNANCE_DEFAULT_EFFICIENCY
        - corruptionEfficiencyPressure
        - crimeEfficiencyPressure
        - instabilityEfficiencyPressure
        + development * 0.05,
      45,
      GOVERNANCE_DEFAULT_EFFICIENCY
    );
    const efficiencyChange = moveToward(currentEfficiency, efficiencyTarget, GOVERNANCE_EFFICIENCY_ADJUSTMENT_RATE, 1.2, 0.8, yearsAdvanced);
    const nextEfficiency = roundPercent(clamp(currentEfficiency + efficiencyChange, 0, GOVERNANCE_DEFAULT_EFFICIENCY));

    const currentEffectiveEfficiency = clamp(
      number(national.effectiveGovernmentalEfficiency, currentEfficiency),
      0,
      GOVERNANCE_DEFAULT_EFFICIENCY
    );
    const effectiveEfficiencyChange = moveToward(
      currentEffectiveEfficiency,
      nextEfficiency,
      GOVERNANCE_EFFECTIVE_EFFICIENCY_ADJUSTMENT_RATE,
      0.75,
      1.0,
      yearsAdvanced
    );
    const nextEffectiveEfficiency = roundPercent(clamp(currentEffectiveEfficiency + effectiveEfficiencyChange, 0, GOVERNANCE_DEFAULT_EFFICIENCY));

    national.crimeRate = nextCrime;
    national.governmentalCorruption = nextCorruption;
    national.governmentalEfficiency = nextEfficiency;
    national.effectiveGovernmentalEfficiency = nextEffectiveEfficiency;

    return {
      crimeRate: nextCrime,
      crimeChange: roundPercent(nextCrime - currentCrime),
      governmentalCorruption: nextCorruption,
      governmentalCorruptionChange: roundPercent(nextCorruption - currentCorruption),
      governmentalEfficiency: nextEfficiency,
      governmentalEfficiencyChange: roundPercent(nextEfficiency - currentEfficiency),
      effectiveGovernmentalEfficiency: nextEffectiveEfficiency,
      effectiveGovernmentalEfficiencyChange: roundPercent(nextEffectiveEfficiency - currentEffectiveEfficiency)
    };
  }

  function yearlyMilitaryFactoryGrowth(baseGrowth, national, currentMilitaryFactories, mobilizationLevel) {
    const growth = number(baseGrowth, 0);
    if (growth < 0) return Math.floor(growth * 0.25);
    const warSupport = clamp(number(national?.warSupport, 50), 0, 100);
    const profile = {
      None: { minWarSupport: 95, growthThreshold: 30, multiplier: 0.02 },
      Partial: { minWarSupport: 75, growthThreshold: 16, multiplier: 0.18 },
      Full: { minWarSupport: 60, growthThreshold: 9, multiplier: 0.55 },
      Total: { minWarSupport: 45, growthThreshold: 6, multiplier: 0.82 }
    }[mobilizationLevel] || { minWarSupport: 95, growthThreshold: 30, multiplier: 0.02 };
    if (warSupport < profile.minWarSupport || growth < profile.growthThreshold) return 0;
    const supportRange = Math.max(1, 100 - profile.minWarSupport);
    const supportReadiness = clamp((warSupport - profile.minWarSupport) / supportRange, 0, 1);
    const armsDepth = clamp(Math.sqrt(Math.max(0, currentMilitaryFactories)) / 90, 0, 0.18);
    return Math.floor((growth - profile.growthThreshold) * profile.multiplier * (0.65 + supportReadiness * 0.65 + armsDepth));
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
    const currentSectorOutput = industrialSectorOutputs(industrial, national);
    const healthStatus = national.economicHealth || "Recovery";
    if (!(healthStatus in HEALTH_GROWTH)) return null;
    const yearsAdvanced = Math.max(1, number(yearDifference, 1));
    const previousHealthYears = national.industrialHealthStatus === healthStatus ? Math.max(0, number(national.industrialHealthYears, 0)) : 0;
    const industrialHealthYears = roundPercent(previousHealthYears + yearsAdvanced);
    national.industrialHealthStatus = healthStatus;
    national.industrialHealthYears = industrialHealthYears;
    const tradeBalance = number(trade.tradeBalance, 0);
    const mobilizationLevel = military?.mobilizationLevel || industrial.mobilizationLevel || "None";
    const mobilization = MOBILIZATION[mobilizationLevel] || MOBILIZATION.None;
    const totalIndustrialCapacity = currentFactories + currentMilitaryFactories * 0.5 + currentShipyards;
    const momentumRate = INDUSTRIAL_HEALTH_MOMENTUM[healthStatus] || 0;
    const healthMomentum = 1 + Math.sqrt(Math.max(industrialHealthYears - 1, 0)) * momentumRate;
    const industrialScale = Math.sqrt(Math.max(totalIndustrialCapacity, 0));
    const developmentScale = number(national.developmentLevel, 0);
    const stabilityScale = clamp(number(national.governmentalStability, 70) / 100, 0, 1.2);
    const governance = governanceMetrics(national);
    const corruptionDrag = clamp(governance.stateCapacityCorruption / 160, 0, 0.55);
    const bureaucracyScale = governance.efficiencyMultiplier;
    const healthSignal = HEALTH_GROWTH[healthStatus] * yearsAdvanced;
    const positiveScale = (1 + industrialScale / 28 + developmentScale / 55 + stabilityScale * 0.22 - corruptionDrag) * bureaucracyScale;
    const negativeScale = (1 + industrialScale / 45 + corruptionDrag * 0.45 + clamp((65 - number(national.governmentalStability, 70)) / 120, 0, 0.35)) * governance.bureaucracyPressure;
    const impactFromHealth = healthSignal >= 0
      ? healthSignal * positiveScale * healthMomentum
      : healthSignal * negativeScale * healthMomentum;
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
    const tradeGrowth = Math.max(impactFromTradeBalance, 0) * growthMultiplier;
    const tradeContraction = Math.min(impactFromTradeBalance, 0) * (healthSignal < 0 ? 1.2 + Math.abs(healthSignal) / 8 : 0.65);
    const baseGrowth = impactFromHealth + tradeGrowth + tradeContraction;
    const militaryFactoryGrowth = yearlyMilitaryFactoryGrowth(baseGrowth, national, currentMilitaryFactories, mobilizationLevel);
    industrial.civilianFactories = Math.max(currentFactories + Math.floor(baseGrowth * (1 + mobilization.civilianPenalty)), 0);
    industrial.militaryFactories = Math.max(currentMilitaryFactories + militaryFactoryGrowth, 0);
    industrial.shipyards = Math.max(currentShipyards + Math.floor(baseGrowth / 3), 0);
    applyIndustrialSectorDefaultDelta(industrial, INDUSTRIAL_SECTOR_CONFIG.civilian, currentSectorOutput.civilian, industrial.civilianFactories - currentFactories);
    applyIndustrialSectorDefaultDelta(industrial, INDUSTRIAL_SECTOR_CONFIG.military, currentSectorOutput.military, industrial.militaryFactories - currentMilitaryFactories);
    applyIndustrialSectorDefaultDelta(industrial, INDUSTRIAL_SECTOR_CONFIG.shipyard, currentSectorOutput.shipyard, industrial.shipyards - currentShipyards);
    if (hasIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.civilian)) syncIndustrialSectorTotal(industrial, "civilianSectors.basic");
    if (hasIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.military)) syncIndustrialSectorTotal(industrial, "militarySectors.basic");
    if (hasIndustrialSectorData(industrial, INDUSTRIAL_SECTOR_CONFIG.shipyard)) syncIndustrialSectorTotal(industrial, "shipyardSectors.medium");
    const modernization = advanceIndustrialModernization(industrial, national, military, yearsAdvanced);
    refreshAutoIndustrialSophistication(data, id);
    return {
      civilianFactories: industrial.civilianFactories - currentFactories,
      militaryFactories: industrial.militaryFactories - currentMilitaryFactories,
      shipyards: industrial.shipyards - currentShipyards,
      modernization
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
    const militaryOutput = industrialSectorOutputs(industrial, national).military.effective;
    const monthlyIncrement = militaryOutput * 0.2 * sophisticationSupplyMultiplier(national) * mobilization.supplyMultiplier * complexityMultiplier(military.equipmentComplexity) * techGapPenalty * (1 + number(military.militaryOrganization, 0) * 0.01);
    military.militarySupply = Number((currentSupply + monthlyIncrement * months).toFixed(1));
    return military.militarySupply - currentSupply;
  }

  function advanceMobilizationFinance(data, id, years = 1) {
    const inputs = budgetInputsForNation(data, id);
    if (!inputs) return null;
    const national = inputs.national;
    const level = inputs.mobilizationLevel || "None";
    const profile = MOBILIZATION_FINANCE[level] || MOBILIZATION_FINANCE.None;
    const yearsAdvanced = Math.max(0, number(years, 1));
    if (level === "None" || !profile.autoSpendShare) {
      national.mobilizationFinanceLevel = "None";
      national.mobilizationYears = 0;
      national.mobilizationReadiness = 0;
      national.mobilizationStrain = 0;
      national.mobilizationEffectiveness = 0;
      national.wartimeBudgetAutoExpenditure = 0;
      national.wartimeBudgetHeadroom = 0;
      national.effectiveBudgetExpenditure = roundCurrency(number(national.budgetExpenditure, 0));
      return {
        level: "None",
        years: 0,
        readiness: 0,
        strain: 0,
        effectiveness: 0
      };
    }

    const previousLevel = national.mobilizationFinanceLevel || level;
    const ability = mobilizationFinanceAbility(inputs);
    const enduranceYears = mobilizationFinanceEndurance(inputs);
    const sameLevel = previousLevel === level;
    const previousReadiness = number(national.mobilizationReadiness, profile.activationShare * ability);
    const previousStrain = number(national.mobilizationStrain, 0);
    const previousYears = Math.max(0, number(national.mobilizationYears, 0));
    const baseReadiness = sameLevel
      ? previousReadiness
      : Math.max(profile.activationShare * ability, previousReadiness * 0.62);
    const baseStrain = sameLevel ? previousStrain : previousStrain * 0.45;
    const mobilizationYears = roundPercent((sameLevel ? previousYears : 0) + yearsAdvanced);
    const readiness = clamp(baseReadiness + profile.rampRate * ability * yearsAdvanced, 0, 1);
    const yearsOverEndurance = Math.max(0, mobilizationYears - (profile.strainStartYears + enduranceYears));
    const strainTarget = clamp(yearsOverEndurance * profile.strainRate / Math.max(ability, 0.42), 0, profile.maxStrain);
    const strain = clamp(Math.max(baseStrain, strainTarget), 0, profile.maxStrain);
    const effectiveness = clamp(readiness * (1 - strain), 0, 1);

    national.mobilizationFinanceLevel = level;
    national.mobilizationYears = mobilizationYears;
    national.mobilizationReadiness = roundPercent(readiness);
    national.mobilizationStrain = roundPercent(strain);
    national.mobilizationEffectiveness = roundPercent(effectiveness);
    national.mobilizationAbility = roundPercent(ability);
    national.mobilizationEnduranceYears = roundPercent(enduranceYears);
    return {
      level,
      years: mobilizationYears,
      readiness: national.mobilizationReadiness,
      strain: national.mobilizationStrain,
      effectiveness: national.mobilizationEffectiveness,
      ability: national.mobilizationAbility,
      enduranceYears: national.mobilizationEnduranceYears
    };
  }

  function recalculateAll(data, options = {}) {
    ensureTradeV4State(data);
    let previousSignature = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      recalculateTrade(data, options);
      recalculateBudgets(data, options);
      const nextSignature = recalculationSignature(data);
      if (attempt > 0 && nextSignature === previousSignature) break;
      previousSignature = nextSignature;
    }
    return data;
  }

  const tradeFactory = window.AGGS_ENGINE_MODULES?.createTrade;
  if (!tradeFactory) throw new Error("AG-GS trade engine module failed to load.");
  const {
    calculateTradeForNation,
    calculateTradeNetwork,
    previewTradeAnchorPlan,
    applyTradeAnchorPlan,
    ensureTradeV4State: ensureTradeNetworkState,
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
  } = tradeFactory({
    getPopulation,
    number,
    clamp,
    roundCurrency,
    roundPercent,
    governanceMetrics,
    industrialSectorOutputs
  });

  function ensureTradeV4State(data) {
    ensureState(data);
    ensureTradeNetworkState(data);
    data.meta.tradeFormulaVersion = TRADE_V4_FORMULA_VERSION;
    delete data.meta.tradeV3Enabled;
    return data;
  }

  function snapshot(data, year) {
    const ids = visibleNationIds(data);
    const totalPopulation = ids.reduce((total, id) => total + getPopulation(data, id, year), 0);
    const budgetCapacity = ids.reduce((total, id) => total + displayBudgetCapacity(data, id), 0);
    const tradeFlow = ids.reduce((total, id) => total + number(data.trade?.[id]?.tradeFlow, 0), 0);
    const nationalRows = ids.map((id) => data.national?.[id]).filter(Boolean);
    const crimeRateAverage = nationalRows.reduce((total, row) => total + number(row.crimeRate, row.corruption), 0) / Math.max(nationalRows.length, 1);
    const governmentalCorruptionAverage = nationalRows.reduce((total, row) => total + number(row.governmentalCorruption, row.corruption), 0) / Math.max(nationalRows.length, 1);
    const governmentalEfficiencyAverage = nationalRows.reduce((total, row) => total + number(row.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0) / Math.max(nationalRows.length, 1);
    const effectiveGovernmentalEfficiencyAverage = nationalRows.reduce((total, row) => total + number(row.effectiveGovernmentalEfficiency, row.governmentalEfficiency), 0) / Math.max(nationalRows.length, 1);
    const militaryRows = ids.map((id) => data.military?.[id]).filter(Boolean);
    const militarySupplyAverage = militaryRows.reduce((total, row) => total + number(row.militarySupply, 0), 0) / Math.max(militaryRows.length, 1);
    return {
      year,
      totalPopulation,
      budgetCapacity,
      tradeFlow,
      crimeRateAverage: roundPercent(crimeRateAverage),
      governmentalCorruptionAverage: roundPercent(governmentalCorruptionAverage),
      governmentalEfficiencyAverage: roundPercent(governmentalEfficiencyAverage),
      effectiveGovernmentalEfficiencyAverage: roundPercent(effectiveGovernmentalEfficiencyAverage),
      militarySupplyAverage: Number(militarySupplyAverage.toFixed(1))
    };
  }

  function advanceToYear(data, targetYear) {
    ensureState(data);
    ensureTradeV4State(data);
    const startYear = number(data.meta.currentYear, 2021);
    const endYear = number(targetYear, startYear);
    if (endYear <= startYear) return { ok: false, message: "Target year must be greater than the current year.", log: [] };
    const log = [];
    const activeNations = visibleNations(data);
    for (let year = startYear + 1; year <= endYear; year++) {
      for (const nation of activeNations) advancePopulation(data, nation.id, year - 1, year);
      for (const nation of activeNations) advanceGovernance(data, nation.id, 1);
      data.meta.currentYear = year;
      recalculateTrade(data);
      for (const nation of activeNations) advanceIndustry(data, nation.id, 1);
      recalculateBudgets(data);
      for (const nation of activeNations) advanceMobilizationFinance(data, nation.id, 1);
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
    if (dataset === "industrial") ensureExplicitIndustrialSectorDefault(data.industrial[id], path);
    if (path.includes(".")) {
      const segments = path.split(".");
      let target = data[dataset][id];
      for (let i = 0; i < segments.length - 1; i++) {
        if (!target[segments[i]] || typeof target[segments[i]] !== "object") target[segments[i]] = {};
        target = target[segments[i]];
      }
      target[segments[segments.length - 1]] = value;
    } else {
      data[dataset][id][path] = value;
    }
    if (dataset === "industrial") syncIndustrialSectorTotal(data.industrial[id], path);
    if (dataset === "industrial") refreshAutoIndustrialSophistication(data, id);
    if (dataset === "national") {
      const row = data.national[id];
      if (path === "developmentLevel") {
        setDevelopmentComponentsFromLevel(row, row.developmentLevel, data, id);
      } else if (DEVELOPMENT_COMPONENT_KEYS.includes(path)) {
        syncDevelopmentLevelFromComponents(row);
        row.developmentComponentsManual = true;
        row.developmentComponentsFormulaVersion = DEVELOPMENT_COMPONENT_FORMULA_VERSION;
      } else if (path === "industrialSophistication") {
        row.industrialSophisticationManual = true;
        if (isBlank(row.industrialSophisticationBaseline)) row.industrialSophisticationBaseline = clamp(number(row.industrialSophistication, 0), 0, 100);
      }
      if (path === "developmentLevel" || path === "literacyRate" || DEVELOPMENT_COMPONENT_KEYS.includes(path)) refreshAutoIndustrialSophistication(data, id);
    }
    if (dataset === "national" && path === "debt") {
      const row = data.national[id];
      row.debt = Math.max(0, number(value, 0));
      row.debtPrincipal = roundCurrency(number(row.budgetCapacity, 0) * (row.debt / 100));
      const fiscal = calculateFiscalForNation(data, id);
      row.debtServiceRate = row.debtPrincipal > 0 ? roundPercent(fiscal?.interestRate ?? DEBT_RULES.baseInterestRate) : 0;
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
    tradeTierForFlow,
    industrialSectorOutputs,
    developmentLevelFromComponents,
    inferDevelopmentComponents,
    determineIndustrialSophistication,
    fiscalModelForNation,
    calculateTaxBurdenForNation,
    calculateTariffBurdenForNation,
    calculateTariffRevenueForNation,
    calculateBudgetBreakdownForNation,
    calculateBudgetForNation,
    wartimeBudgetBonus,
    displayBudgetCapacity,
    calculateFiscalForNation,
    calculateAnnualDebtUpdate,
    recalculateAll,
    recalculateTrade,
    recalculateBudgets,
    ensureWikiState,
    wikiSlug,
    wikiPages,
    wikiPageReferences,
    wikiContentAudit,
    wikiFactTemplate,
    searchWikiPages,
    saveWikiPage,
    archiveWikiPage,
    advancePopulation,
    advanceGovernance,
    advanceIndustry,
    advanceMobilizationFinance,
    advanceToYear,
    updateValue,
    snapshot,
    exportDataJs,
    constants: { HEALTH_GROWTH, HEALTH_DEMOGRAPHICS, HEALTH_BUDGET, HEALTH_TRADE, CHILD_POLICY, CHILD_POLICY_POPULATION_EFFECT, MOBILIZATION, TRADE_POLICY, SANCTIONS, DEBT_RULES, BUDGET_FORMULAS, TARIFF_FORMULAS, POPULATION_FORMULAS, FISCAL_MODELS, TARIFF_POLICY_LIMITS, INDUSTRIAL_SECTOR_WEIGHTS, WIKI_CATEGORIES, WIKI_STATUSES, WIKI_FACT_TEMPLATES }
  };
})();
