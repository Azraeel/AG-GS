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
  const LITERACY_POPULATION_SLOWDOWN_START = 70;
  const LITERACY_POPULATION_SLOWDOWN_MAX = 0.45;

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
  const DEVELOPMENT_COMPONENT_KEYS = ["urbanizationRate", "urbanDevelopment", "ruralDevelopment", "infrastructureLevel", "livingStandard"];
  const DEVELOPMENT_COMPONENT_WEIGHTS = {
    urbanizationRate: 0.06,
    urbanDevelopment: 0.09,
    ruralDevelopment: 0.2,
    infrastructureLevel: 0.35,
    livingStandard: 0.3
  };
  const DEVELOPMENT_CURRENT_REFERENCE = 20;
  const DEVELOPMENT_LEVEL_MAX = 50;
  const DEVELOPMENT_COMPONENT_LEVEL_MAX = 60;
  const URBANIZATION_CURRENT_MAX = 92;
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

  function componentScoreValue(value, fallback = 10) {
    return clamp(number(value, fallback), 0, DEVELOPMENT_LEVEL_MAX);
  }

  function componentReferenceRatio(value) {
    return clamp(componentScoreValue(value, 0) / DEVELOPMENT_CURRENT_REFERENCE, 0, DEVELOPMENT_LEVEL_MAX / DEVELOPMENT_CURRENT_REFERENCE);
  }

  function currentEraComponentRatio(value) {
    return clamp(componentScoreValue(value, 0) / DEVELOPMENT_CURRENT_REFERENCE, 0, 1);
  }

  function developmentComponentValue(value, fallback = 10) {
    return clamp(number(value, fallback), 0, DEVELOPMENT_COMPONENT_LEVEL_MAX);
  }

  function urbanizationRateValue(value, fallback = 50) {
    return clamp(number(value, fallback), 0, 100);
  }

  function roundCurrency(value) {
    return Math.round(number(value, 0));
  }

  function roundPercent(value) {
    return Number(number(value, 0).toFixed(2));
  }

  function temporaryBudgetExpenditureId(index = 0) {
    return `temporary_be_${Date.now()}_${index + 1}`;
  }

  function normalizeTemporaryBudgetExpenditures(national = {}) {
    const source = Array.isArray(national.temporaryBudgetExpenditures) ? national.temporaryBudgetExpenditures : [];
    const normalized = source
      .map((item, index) => {
        const amount = Math.max(0, roundCurrency(item?.amount));
        const yearsRemaining = Math.max(0, Math.ceil(number(item?.yearsRemaining ?? item?.durationYears, 0)));
        const label = String(item?.label || "Temporary BE").trim() || "Temporary BE";
        return {
          id: String(item?.id || `temporary_be_${index + 1}`),
          label,
          amount,
          yearsRemaining,
          createdYear: item?.createdYear === undefined ? null : Math.trunc(number(item.createdYear, 0)),
          createdAt: item?.createdAt || null
        };
      })
      .filter((item) => item.amount > 0 && item.yearsRemaining > 0);
    national.temporaryBudgetExpenditures = normalized;
    national.temporaryBudgetExpenditure = roundCurrency(normalized.reduce((total, item) => total + item.amount, 0));
    national.temporaryBudgetExpenditureCount = normalized.length;
    return normalized;
  }

  function temporaryBudgetExpenditureItems(national = {}) {
    return normalizeTemporaryBudgetExpenditures(national);
  }

  function temporaryBudgetExpenditureTotal(national = {}) {
    return roundCurrency(normalizeTemporaryBudgetExpenditures(national).reduce((total, item) => total + item.amount, 0));
  }

  function addTemporaryBudgetExpenditure(national = {}, item = {}) {
    const current = normalizeTemporaryBudgetExpenditures(national);
    const amount = Math.max(0, roundCurrency(item.amount));
    const yearsRemaining = Math.max(0, Math.ceil(number(item.yearsRemaining ?? item.durationYears, 0)));
    if (!amount || !yearsRemaining) return null;
    const entry = {
      id: String(item.id || temporaryBudgetExpenditureId(current.length)),
      label: String(item.label || "Temporary BE").trim() || "Temporary BE",
      amount,
      yearsRemaining,
      createdYear: item.createdYear === undefined ? null : Math.trunc(number(item.createdYear, 0)),
      createdAt: item.createdAt || new Date().toISOString()
    };
    national.temporaryBudgetExpenditures = [...current, entry];
    normalizeTemporaryBudgetExpenditures(national);
    return entry;
  }

  function removeTemporaryBudgetExpenditure(national = {}, itemId = "") {
    const current = normalizeTemporaryBudgetExpenditures(national);
    const next = current.filter((item) => item.id !== itemId);
    if (next.length === current.length) return null;
    national.temporaryBudgetExpenditures = next;
    normalizeTemporaryBudgetExpenditures(national);
    return current.find((item) => item.id === itemId) || null;
  }

  function advanceTemporaryBudgetExpenditures(data, id, years = 1) {
    const national = data.national?.[id];
    if (!national) return null;
    const elapsedYears = Math.max(0, Math.ceil(number(years, 1)));
    const current = normalizeTemporaryBudgetExpenditures(national);
    if (!current.length || !elapsedYears) return { expired: [], active: current };
    const expired = [];
    const active = [];
    current.forEach((item) => {
      const nextYears = Math.max(0, item.yearsRemaining - elapsedYears);
      if (nextYears > 0) active.push({ ...item, yearsRemaining: nextYears });
      else expired.push(item);
    });
    national.temporaryBudgetExpenditures = active;
    normalizeTemporaryBudgetExpenditures(national);
    return { expired, active: national.temporaryBudgetExpenditures };
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
    if (literacy <= LITERACY_POPULATION_SLOWDOWN_START) return 0;
    const highLiteracyShare = clamp((literacy - LITERACY_POPULATION_SLOWDOWN_START) / Math.max(1, 100 - LITERACY_POPULATION_SLOWDOWN_START), 0, 1);
    return Math.pow(highLiteracyShare, 1.15) * LITERACY_POPULATION_SLOWDOWN_MAX;
  }

  function corruptionEfficiencyPressureFor(corruptionPercent) {
    const corruption = percentStat(corruptionPercent, 0);
    return corruption * 0.1 + Math.max(0, corruption - 30) * 0.55;
  }

  function developmentComponentDefaults(seedScore = 10) {
    const seed = componentScoreValue(seedScore, 10);
    return {
      urbanizationRate: roundPercent(clamp(seed * 5, 0, 100)),
      urbanDevelopment: roundPercent(seed),
      ruralDevelopment: roundPercent(seed),
      infrastructureLevel: roundPercent(seed),
      livingStandard: roundPercent(seed)
    };
  }

  function urbanDevelopmentFallback(national = {}, defaults = developmentComponentDefaults()) {
    return urbanizationRateValue(national.urbanizationRate, defaults.urbanizationRate) / 5;
  }

  function developmentComponentLevel(national = {}, key, fallbackScore = 10) {
    const defaults = developmentComponentDefaults(fallbackScore);
    if (key === "urbanizationRate") return urbanizationRateValue(national.urbanizationRate, defaults.urbanizationRate) / 5;
    if (key === "urbanDevelopment") return developmentComponentValue(national.urbanDevelopment, urbanDevelopmentFallback(national, defaults));
    return developmentComponentValue(national[key], defaults[key]);
  }

  function componentScoreFromComponents(national = {}) {
    const urbanization = developmentComponentLevel(national, "urbanizationRate");
    const urbanDevelopment = developmentComponentLevel(national, "urbanDevelopment");
    const rural = developmentComponentLevel(national, "ruralDevelopment");
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel");
    const livingStandard = developmentComponentLevel(national, "livingStandard");
    return roundPercent(clamp(
      urbanization * DEVELOPMENT_COMPONENT_WEIGHTS.urbanizationRate
        + urbanDevelopment * DEVELOPMENT_COMPONENT_WEIGHTS.urbanDevelopment
        + rural * DEVELOPMENT_COMPONENT_WEIGHTS.ruralDevelopment
        + infrastructure * DEVELOPMENT_COMPONENT_WEIGHTS.infrastructureLevel
        + livingStandard * DEVELOPMENT_COMPONENT_WEIGHTS.livingStandard,
      0,
      DEVELOPMENT_LEVEL_MAX
    ));
  }

  function componentProfileScore(national = {}, weights = DEVELOPMENT_COMPONENT_WEIGHTS) {
    const urbanization = developmentComponentLevel(national, "urbanizationRate");
    const urbanDevelopment = developmentComponentLevel(national, "urbanDevelopment");
    const rural = developmentComponentLevel(national, "ruralDevelopment");
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel");
    const livingStandard = developmentComponentLevel(national, "livingStandard");
    return roundPercent(clamp(
      urbanization * number(weights.urbanizationRate, 0)
        + urbanDevelopment * number(weights.urbanDevelopment, 0)
        + rural * number(weights.ruralDevelopment, 0)
        + infrastructure * number(weights.infrastructureLevel, 0)
        + livingStandard * number(weights.livingStandard, 0),
      0,
      DEVELOPMENT_LEVEL_MAX
    ));
  }

  function urbanStrainMetrics(national = {}, populationMetrics = {}) {
    const urbanPressure = developmentComponentLevel(national, "urbanizationRate");
    const urbanDevelopment = developmentComponentLevel(national, "urbanDevelopment");
    const supportCapacity = componentProfileScore(national, {
      urbanizationRate: 0,
      urbanDevelopment: 0.62,
      ruralDevelopment: 0.04,
      infrastructureLevel: 0.22,
      livingStandard: 0.12
    });
    const directGap = Math.max(0, urbanPressure - urbanDevelopment);
    const supportGap = Math.max(0, urbanPressure - supportCapacity) * clamp(directGap / 2, 0, 1);
    const growthLoad = Math.max(0, number(populationMetrics.growthRate, 0)) * 0.35;
    const migrationLoad = Math.max(0, number(populationMetrics.migrationGrowth, 0)) * 0.55;
    const structuralStrain = clamp(directGap * 5.2 + supportGap * 2.1, 0, 100);
    const growthStrain = clamp((growthLoad + migrationLoad) * Math.max(0.25, directGap / 5), 0, 18);
    const urbanStrain = clamp(structuralStrain + growthStrain, 0, 100);
    return {
      urbanPressure: roundPercent(urbanPressure),
      urbanCapacity: roundPercent(supportCapacity),
      urbanDevelopment: roundPercent(urbanDevelopment),
      urbanStructuralStrain: roundPercent(structuralStrain),
      urbanGrowthStrain: roundPercent(growthStrain),
      urbanStrain: roundPercent(urbanStrain)
    };
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
    Object.values(data.national || {}).forEach((national) => {
      if (!national || typeof national !== "object") return;
      const legacyKeys = Object.keys(national).filter((key) => key.toLowerCase() === "developmentlevel");
      const defaults = developmentComponentDefaults();
      DEVELOPMENT_COMPONENT_KEYS.forEach((key) => {
        if (isBlank(national[key])) national[key] = key === "urbanDevelopment" ? urbanDevelopmentFallback(national, defaults) : defaults[key];
      });
      national.urbanizationRate = roundPercent(urbanizationRateValue(national.urbanizationRate, defaults.urbanizationRate));
      national.urbanDevelopment = roundPercent(developmentComponentValue(national.urbanDevelopment, urbanDevelopmentFallback(national, defaults)));
      national.ruralDevelopment = roundPercent(developmentComponentValue(national.ruralDevelopment, defaults.ruralDevelopment));
      national.infrastructureLevel = roundPercent(developmentComponentValue(national.infrastructureLevel, defaults.infrastructureLevel));
      national.livingStandard = roundPercent(developmentComponentValue(national.livingStandard, defaults.livingStandard));
      legacyKeys.forEach((key) => delete national[key]);
      delete national.urbanStrain;
      delete national.urbanCapacity;
      delete national.urbanPressure;
      delete national.developmentComponentsManual;
      delete national.developmentComponentsFormulaVersion;
      delete national.industrialSophisticationManual;
      national.industrialSophistication = roundPercent(clamp(number(national.industrialSophistication, 50), 0, 100));
      if (isBlank(national.industrialSophisticationBaseline)) national.industrialSophisticationBaseline = national.industrialSophistication;
      else national.industrialSophisticationBaseline = roundPercent(clamp(number(national.industrialSophisticationBaseline, national.industrialSophistication), 0, 100));
    });
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

  function normalizeTemporaryBudgetExpenditureFields(data) {
    Object.values(data.national || {}).forEach((national) => {
      if (!national || typeof national !== "object") return;
      normalizeTemporaryBudgetExpenditures(national);
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
    normalizeTemporaryBudgetExpenditureFields(data);
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

  function maxComplexityForTechnology(national = {}) {
    const technology = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.08,
      infrastructureLevel: 0.42,
      livingStandard: 0.42
    });
    if (technology <= 1) return 1;
    if (technology >= DEVELOPMENT_CURRENT_REFERENCE) return 11;
    return 1 + 10 * Math.pow((technology - 1) / (DEVELOPMENT_CURRENT_REFERENCE - 1), 1.5);
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
    const infrastructure = developmentComponentLevel(national, "infrastructureLevel") * 5;
    const livingStandard = developmentComponentLevel(national, "livingStandard") * 5;
    const urbanization = developmentComponentLevel(national, "urbanizationRate") * 5;
    const urbanDevelopment = developmentComponentLevel(national, "urbanDevelopment") * 5;
    const ruralQuality = developmentComponentLevel(national, "ruralDevelopment") * 5;
    const literacy = literacyRateForNational(national);
    const health = healthModernizationMultiplier(national.economicHealth);
    const healthScore = health * 100;
    const mobilization = military?.mobilizationLevel || industrial.mobilizationLevel || "None";
    const mobilizationScore = { None: 0, Partial: 62, Full: 82, Total: 95 }[mobilization] || 0;
    const warSupport = clamp(number(national.warSupport, 50), 0, 100);
    const militaryOrganization = clamp(number(military?.militaryOrganization, 0), 0, 100);
    const shipyardDepth = clamp(Math.sqrt(Math.max(0, number(industrial.shipyards, 0))) * 10, 0, 100);
    return {
      civilianImproved: sophistication * 0.44 + infrastructure * 0.2 + livingStandard * 0.08 + ruralQuality * 0.06 + literacy * 0.1 + healthScore * 0.12,
      civilianAdvanced: sophistication * 0.46 + literacy * 0.22 + livingStandard * 0.1 + infrastructure * 0.1 + urbanization * 0.015 + urbanDevelopment * 0.025 + healthScore * 0.08,
      militaryImproved: sophistication * 0.38 + infrastructure * 0.16 + livingStandard * 0.08 + urbanization * 0.015 + urbanDevelopment * 0.025 + literacy * 0.1 + healthScore * 0.09 + Math.max(mobilizationScore, warSupport) * 0.15,
      militaryAdvanced: sophistication * 0.42 + literacy * 0.18 + livingStandard * 0.08 + infrastructure * 0.1 + urbanization * 0.015 + urbanDevelopment * 0.025 + healthScore * 0.07 + Math.max(mobilizationScore, warSupport) * 0.07 + militaryOrganization * 0.04,
      shipyardLarge: sophistication * 0.4 + infrastructure * 0.24 + livingStandard * 0.06 + urbanization * 0.02 + urbanDevelopment * 0.04 + literacy * 0.08 + healthScore * 0.08 + shipyardDepth * 0.08,
      shipyardMega: sophistication * 0.48 + infrastructure * 0.18 + livingStandard * 0.07 + urbanization * 0.015 + urbanDevelopment * 0.035 + literacy * 0.1 + healthScore * 0.05 + shipyardDepth * 0.07
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
    const fiscalCapacity = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.22,
      infrastructureLevel: 0.4,
      livingStandard: 0.3
    });
    const stability = number(national?.governmentalStability, 0);
    const governance = governanceMetrics(national);
    const health = national?.economicHealth || "Recovery";
    const sectorOutput = industrialSectorOutputs(industrial, national);
    const industrialScale = sectorOutput.civilian.effective + sectorOutput.military.effective + sectorOutput.shipyard.effective;
    const isStrongEconomy = ["Prosperity", "Expansion"].includes(health);
    const isHighCapacity = fiscalCapacity >= 18 && stability >= 85 && governance.governmentalEfficiency >= GOVERNANCE_HIGH_CAPACITY_MIN_EFFICIENCY && isStrongEconomy && industrialScale >= 650;
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
    const fiscalCapacity = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.22,
      infrastructureLevel: 0.4,
      livingStandard: 0.3
    });
    const industrialCapacity = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.07,
      ruralDevelopment: 0.12,
      infrastructureLevel: 0.5,
      livingStandard: 0.28
    });
    const marketMaturity = componentProfileScore(national, {
      urbanizationRate: 0.14,
      urbanDevelopment: 0.16,
      ruralDevelopment: 0.05,
      infrastructureLevel: 0.25,
      livingStandard: 0.4
    });
    const stateCapacity = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.18,
      infrastructureLevel: 0.44,
      livingStandard: 0.3
    });
    const demographicMaturity = componentProfileScore(national, {
      urbanizationRate: 0.25,
      urbanDevelopment: 0.1,
      ruralDevelopment: 0.05,
      infrastructureLevel: 0.15,
      livingStandard: 0.45
    });
    const wartimeCapacity = componentProfileScore(national, {
      urbanizationRate: 0.06,
      urbanDevelopment: 0.09,
      ruralDevelopment: 0.12,
      infrastructureLevel: 0.48,
      livingStandard: 0.25
    });
    const population = getPopulation(data, id);
    const governance = governanceMetrics(national);
    const urbanStrain = urbanStrainMetrics(national);
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
      fiscalCapacity,
      industrialCapacity,
      marketMaturity,
      stateCapacity,
      demographicMaturity,
      wartimeCapacity,
      urbanStrain,
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
    const { taxRatePercent, fiscalCapacity, corruption, economicHealth, stability, national, fiscalModel, fiscalProfile, governance, urbanStrain } = inputs;
    const bureaucracyMultiplier = governance.efficiencyMultiplier;
    const sustainableTaxRate = roundPercent(clamp(4 + fiscalCapacity * 0.4 + fiscalProfile.sustainableTaxBonus, 3, 42));
    const taxPressure = roundPercent(Math.max(0, taxRatePercent - sustainableTaxRate));
    const healthPressure = { Prosperity: 0.75, Expansion: 0.9, Recovery: 1, Slowdown: 1.35, Recession: 1.75, Depression: 2.25 }[economicHealth] || 1;
    const stabilityPressure = 1 + clamp((70 - stability) / 60, 0, 1.25);
    const corruptionPressure = 1 + clamp(corruption / 180, 0, 0.75);
    const bureaucracyPressure = governance.bureaucracyPressure;
    const urbanStrainPressure = 1 + clamp(number(urbanStrain?.urbanStructuralStrain, 0) / 180, 0, 0.35);
    const pressureScore = roundPercent(taxPressure * healthPressure * stabilityPressure * corruptionPressure * bureaucracyPressure * urbanStrainPressure * fiscalProfile.pressureMultiplier);
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
    const urbanCollectionDrag = clamp(1 - number(urbanStrain?.urbanStructuralStrain, 0) * 0.002, 0.85, 1);
    const collectionMultiplier = roundPercent(clamp(normalCollectionDrag * saturationMultiplier * avoidanceMultiplier * bureaucracyMultiplier * urbanCollectionDrag, minimumCollectionMultiplier, collectionCeiling));
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
    const { civFactories, militaryFactories, shipyards, physicalCivFactories, physicalMilitaryFactories, physicalShipyards, industrialCapacity, mobilization } = inputs;
    const effectiveContributionRate = 5 + industrialCapacity * 0.75;
    const developmentMultiplier = 1 + industrialCapacity * 0.25;
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
    const developmentBase = componentScoreValue(inputs.wartimeCapacity, 0) * 1900;
    const industryDepth = Math.max(inputs.civFactories, 0)
      + Math.max(inputs.shipyards, 0) * 1.8
      + Math.max(inputs.militaryFactories, 0) * 1.3;
    const advancedIndustrialSurge = industryDepth * componentReferenceRatio(inputs.industrialCapacity) * 45;
    return populationBase + civilianBase + shipyardBase + militaryBase + developmentBase + advancedIndustrialSurge;
  }

  function mobilizedBudgetStateCapacity(inputs) {
    const development = componentReferenceRatio(inputs.stateCapacity);
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
    const development = componentReferenceRatio(inputs.stateCapacity);
    const stability = clamp(inputs.stability / 100, 0, 1.15);
    const corruptionControl = clamp((100 - inputs.governance.stateCapacityCorruption) / 100, 0, 1);
    const warSupport = clamp(number(inputs.national?.warSupport, 50) / 100, 0, 1);
    const industryDepth = clamp(Math.sqrt(Math.max(inputs.civFactories + inputs.militaryFactories + inputs.shipyards, 0)) / 36, 0, 1);
    const baseAbility = 0.36 + development * 0.24 + stability * 0.2 + corruptionControl * 0.17 + warSupport * 0.14 + industryDepth * 0.24;
    return clamp(baseAbility * inputs.governance.efficiencyMultiplier, 0.05, 1.25);
  }

  function mobilizationFinanceEndurance(inputs) {
    const development = componentReferenceRatio(inputs.stateCapacity);
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
    const baseExpenditure = roundCurrency(number(national.budgetExpenditure, 0));
    const temporaryExpenditure = temporaryBudgetExpenditureTotal(national);
    if (!peakBonus || level === "None") {
      return {
        wartimeBudgetPeakBonus: 0,
        wartimeBudgetBonus: 0,
        wartimeBudgetAutoExpenditure: 0,
        wartimeBudgetHeadroom: 0,
        temporaryBudgetExpenditure: temporaryExpenditure,
        effectiveBudgetExpenditure: roundCurrency(baseExpenditure + temporaryExpenditure),
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
      temporaryBudgetExpenditure: temporaryExpenditure,
      effectiveBudgetExpenditure: roundCurrency(baseExpenditure + temporaryExpenditure + autoExpenditure),
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
    const customsCapacity = componentProfileScore(national, {
      urbanizationRate: 0.04,
      urbanDevelopment: 0.08,
      ruralDevelopment: 0.14,
      infrastructureLevel: 0.5,
      livingStandard: 0.24
    });
    const governance = governanceMetrics(national);
    const corruption = governance.governmentalCorruption;
    const tradePolicy = tradeRow.tradePolicy || "Balanced";
    const sanctionsLevel = tradeRow.sanctionsLevel || "None";
    const policyCollection = { "Free Trade": 1, "Open Market": 0.95, Balanced: 0.9, Protectionist: 0.82 }[tradePolicy] || 0.9;
    const sanctionsCollection = { None: 1, Light: 0.85, Moderate: 0.65, Heavy: 0.42, Total: 0.2 }[sanctionsLevel] || 1;
    const developmentCollection = clamp(0.45 + customsCapacity / 32, 0.45, 1.05);
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
    const { fiscalCapacity, population, taxRate, corruption, economicHealth, governance } = inputs;
    const developmentImpact = Math.pow(fiscalCapacity / 10, 3) * (1 + fiscalCapacity / 20);
    const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));
    const populationContribution = (Math.log(Math.max(population, 1)) + population / 250000) * taxRateScalingFactor * developmentImpact * ((100 - corruption) / 100) * governance.efficiencyMultiplier * (HEALTH_BUDGET[economicHealth] || 1);
    const breakdown = {
      formulaVersion: "legacy",
      taxRevenue: populationContribution,
      urbanStrain: inputs.urbanStrain,
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
    const { fiscalCapacity, population, taxRatePercent, corruption, economicHealth, stability, fiscalProfile, governance } = inputs;
    const taxBurden = calculateTaxBurdenForNation(data, id);
    const developmentCollection = clamp(0.18 + Math.pow(componentReferenceRatio(fiscalCapacity), 1.35) * 0.95, 0.18, 1.15);
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
      urbanStrain: inputs.urbanStrain,
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

  function healthUrbanizationMomentum(health = "Recovery") {
    return { Depression: -0.18, Recession: -0.11, Slowdown: -0.05, Recovery: 0.02, Expansion: 0.07, Prosperity: 0.1 }[health] || 0;
  }

  function urbanizationSimulationCeiling(national = {}) {
    const urbanCapacity = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.07,
      ruralDevelopment: 0.05,
      infrastructureLevel: 0.55,
      livingStandard: 0.3
    });
    const developmentRatio = currentEraComponentRatio(urbanCapacity);
    const futureDevelopmentShare = Math.max(0, componentReferenceRatio(urbanCapacity) - 1);
    const infrastructureRatio = clamp(developmentComponentLevel(national, "infrastructureLevel") / DEVELOPMENT_CURRENT_REFERENCE, 0, 1.5);
    const livingRatio = clamp(developmentComponentLevel(national, "livingStandard") / DEVELOPMENT_CURRENT_REFERENCE, 0, 1.5);
    const literacyRatio = clamp(literacyRateForNational(national) / 100, 0, 1);
    const stabilityRatio = clamp(number(national.governmentalStability, 70) / 100, 0, 1);
    const governance = governanceMetrics(national);
    const integrityRatio = clamp(1 - governance.socialCorruption / 100, 0, 1);
    return roundPercent(clamp(
      48
        + developmentRatio * 18
        + infrastructureRatio * 10
        + livingRatio * 4
        + literacyRatio * 3
        + stabilityRatio * 2
        + integrityRatio * 2
        + futureDevelopmentShare * 8,
      35,
      urbanCapacity > DEVELOPMENT_CURRENT_REFERENCE ? 98 : URBANIZATION_CURRENT_MAX
    ));
  }

  function advanceUrbanizationFromPopulation(data, id, populationMetrics) {
    const national = data.national?.[id];
    if (!national) return null;
    const previousUrbanization = urbanizationRateValue(national.urbanizationRate, 50);
    const ceiling = urbanizationSimulationCeiling(national);
    const infrastructureRatio = clamp(developmentComponentLevel(national, "infrastructureLevel") / DEVELOPMENT_CURRENT_REFERENCE, 0, 1.5);
    const developmentRatio = currentEraComponentRatio(componentProfileScore(national, {
      urbanizationRate: 0.02,
      urbanDevelopment: 0.08,
      ruralDevelopment: 0.05,
      infrastructureLevel: 0.55,
      livingStandard: 0.3
    }));
    const strain = urbanStrainMetrics(national, populationMetrics);
    const governance = governanceMetrics(national);
    const bureaucracyDrag = 1 - governance.efficiencyMultiplier;
    const unrest = clamp(number(national.publicUnrest, 0), 0, 10);
    const growthRate = number(populationMetrics.growthRate, 0);
    const migrationGrowth = number(populationMetrics.migrationGrowth, 0);
    const cityAbsorptionBase = clamp(
      -0.22
        + developmentRatio * 0.28
        + infrastructureRatio * 0.32
        + healthUrbanizationMomentum(national.economicHealth)
        + Math.max(0, migrationGrowth) * 0.18
        - Math.max(0, -migrationGrowth) * 0.1
        - bureaucracyDrag * 0.35
        - unrest * 0.025
        - governance.socialCorruption * 0.003,
      -0.9,
      1.2
    );
    const cityAbsorption = clamp(cityAbsorptionBase - strain.urbanStrain * 0.006, -1.2, 1.2);
    const ruralGrowthPressure = Math.max(0, growthRate) * clamp((100 - previousUrbanization) / 60, 0.12, 1.1) * 0.48;
    const headroomRatio = clamp((ceiling - previousUrbanization) / 18, 0, 1);
    const overCeilingDrag = Math.max(0, previousUrbanization - ceiling) * 0.08;
    const cityAbsorptionEffect = cityAbsorption >= 0 ? cityAbsorption * headroomRatio : cityAbsorption;
    const urbanizationChange = roundPercent(clamp(cityAbsorptionEffect - ruralGrowthPressure - overCeilingDrag, -1.2, 0.85));
    if (Math.abs(urbanizationChange) < 0.005) {
      return {
        urbanizationRate: previousUrbanization,
        urbanizationRateChange: 0,
        urbanizationCeiling: ceiling,
        cityAbsorption: roundPercent(cityAbsorption),
        ruralGrowthPressure: roundPercent(ruralGrowthPressure),
        overCeilingDrag: roundPercent(overCeilingDrag),
        urbanStrain: strain.urbanStrain,
        urbanCapacity: strain.urbanCapacity,
        componentScoreChange: 0
      };
    }

    const nextUrbanization = roundPercent(clamp(previousUrbanization + urbanizationChange, 5, Math.max(ceiling, previousUrbanization)));
    const actualChange = roundPercent(nextUrbanization - previousUrbanization);
    national.urbanizationRate = nextUrbanization;

    return {
      urbanizationRate: nextUrbanization,
      urbanizationRateChange: actualChange,
      urbanizationCeiling: ceiling,
      cityAbsorption: roundPercent(cityAbsorption),
      ruralGrowthPressure: roundPercent(ruralGrowthPressure),
      overCeilingDrag: roundPercent(overCeilingDrag),
      urbanStrain: strain.urbanStrain,
      urbanCapacity: strain.urbanCapacity,
      componentScoreChange: 0
    };
  }

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
    const demographicMaturity = componentProfileScore(national, {
      urbanizationRate: 0.25,
      urbanDevelopment: 0.1,
      ruralDevelopment: 0.05,
      infrastructureLevel: 0.15,
      livingStandard: 0.45
    });
    const governance = governanceMetrics(national);
    const corruption = governance.socialCorruption;
    const bureaucracyDrag = 1 - governance.efficiencyMultiplier;
    const immigrationRate = number(national.immigrationRate, 0);
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};
    const effectiveImmigrationRate = immigrationRate - number(taxBurden.immigrationPenalty, 0);
    const baselineUrbanStrain = urbanStrainMetrics(national);
    const policy = populationRow.mandatoryChildPolicy || "No Policy";
    const healthProfile = HEALTH_DEMOGRAPHICS[economicHealth] || HEALTH_DEMOGRAPHICS.Recovery;
    const maturity = currentEraComponentRatio(demographicMaturity);
    const demographicBase = 1.72 - maturity * 1.9;
    const stabilityEffect = clamp((stability - 65) * 0.0038, -0.32, 0.22);
    const policyEffect = (CHILD_POLICY_POPULATION_EFFECT[policy] || 0) * clamp(1 - maturity * 0.25, 0.72, 1.05);
    const taxGrowthPenalty = number(taxBurden.populationGrowthPenalty, 0) * 0.55;
    const stressPenalty = unrest * 0.045 + corruption * 0.004 + bureaucracyDrag * 0.28 + taxGrowthPenalty + baselineUrbanStrain.urbanStructuralStrain * 0.006;
    const sizeDamping = clamp(1 - Math.max(0, Math.log10(currentPopulation / 6000000)) * 0.2, 0.5, 1);
    const maturityStabilizer = economicHealth === "Prosperity" ? maturity * 0.18 : 0;
    const literacyGrowthSlowdown = literacyPopulationGrowthSlowdown(national);
    const naturalGrowth = (demographicBase + healthProfile.naturalGrowth + maturityStabilizer + stabilityEffect + policyEffect - stressPenalty - literacyGrowthSlowdown) * sizeDamping;
    const migrationDamping = clamp(1 - Math.max(0, Math.log10(currentPopulation / 25000000)) * 0.26, 0.28, 1) * clamp(1 - maturity * 0.35, 0.55, 1) * clamp(1 - baselineUrbanStrain.urbanStructuralStrain / 220, 0.62, 1);
    const migrationAttractiveness = healthProfile.migration
      + clamp((stability - 60) * 0.007, -0.35, 0.28)
      + clamp((demographicMaturity - 10) * 0.025, -0.15, 0.28)
      - unrest * 0.045
      - corruption * 0.006
      - bureaucracyDrag * 0.5
      - baselineUrbanStrain.urbanStructuralStrain * 0.006
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
    const urbanization = advanceUrbanizationFromPopulation(data, id, {
      growthRate,
      naturalGrowth,
      migrationGrowth
    });
    const finalUrbanStrain = urbanStrainMetrics(national, { growthRate, migrationGrowth });
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
      stressPenalty: roundPercent(stressPenalty),
      urbanStrain: finalUrbanStrain,
      urbanization
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
    const development = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.22,
      infrastructureLevel: 0.4,
      livingStandard: 0.3
    });
    const urbanStrain = urbanStrainMetrics(national);
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
        + urbanStrain.urbanStrain * 0.22
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
        + urbanStrain.urbanStrain * 0.06
        - development * 0.1,
      4,
      100
    );
    const corruptionChange = moveToward(currentCorruption, corruptionTarget, GOVERNANCE_CORRUPTION_ADJUSTMENT_RATE, 1.5, 3.0, yearsAdvanced);
    const nextCorruption = roundPercent(clamp(currentCorruption + corruptionChange, 0, 100));

    const currentEfficiency = clamp(number(national.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
    const corruptionEfficiencyPressure = corruptionEfficiencyPressureFor(nextCorruption);
    const crimeEfficiencyPressure = Math.max(0, nextCrime - 60) * 0.15;
    const instabilityEfficiencyPressure = Math.max(0, 70 - stability) * 0.08;
    const efficiencyTarget = clamp(
      GOVERNANCE_DEFAULT_EFFICIENCY
        - corruptionEfficiencyPressure
        - crimeEfficiencyPressure
        - instabilityEfficiencyPressure
        - urbanStrain.urbanStrain * 0.03
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

  function governanceSimulationPreview(national = {}, years = 1) {
    const yearsAdvanced = Math.max(0, number(years, 1)) || 1;
    const legacyCorruption = percentStat(national.corruption, 0);
    const literacy = literacyRateForNational(national);
    const development = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.22,
      infrastructureLevel: 0.4,
      livingStandard: 0.3
    });
    const urbanStrain = urbanStrainMetrics(national);
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
        + urbanStrain.urbanStrain * 0.22
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
        + urbanStrain.urbanStrain * 0.06
        - development * 0.1,
      4,
      100
    );
    const corruptionChange = moveToward(currentCorruption, corruptionTarget, GOVERNANCE_CORRUPTION_ADJUSTMENT_RATE, 1.5, 3.0, yearsAdvanced);
    const nextCorruption = roundPercent(clamp(currentCorruption + corruptionChange, 0, 100));

    const currentEfficiency = clamp(number(national.governmentalEfficiency, GOVERNANCE_DEFAULT_EFFICIENCY), 0, GOVERNANCE_DEFAULT_EFFICIENCY);
    const corruptionEfficiencyPressure = corruptionEfficiencyPressureFor(nextCorruption);
    const crimeEfficiencyPressure = Math.max(0, nextCrime - 60) * 0.15;
    const instabilityEfficiencyPressure = Math.max(0, 70 - stability) * 0.08;
    const efficiencyTarget = clamp(
      GOVERNANCE_DEFAULT_EFFICIENCY
        - corruptionEfficiencyPressure
        - crimeEfficiencyPressure
        - instabilityEfficiencyPressure
        - urbanStrain.urbanStrain * 0.03
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

    return {
      literacy,
      literacyDeficit,
      development,
      urbanStrain,
      stability,
      unrest,
      health,
      healthCrimePressure,
      healthCorruptionPressure,
      currentCrime,
      crimeTarget: roundPercent(crimeTarget),
      crimeChange: roundPercent(crimeChange),
      nextCrime,
      currentCorruption,
      crimeCorruptionPressure: roundPercent(crimeCorruptionPressure),
      lowStabilityCorruptionPressure: roundPercent(lowStabilityCorruptionPressure),
      corruptionTarget: roundPercent(corruptionTarget),
      corruptionChange: roundPercent(corruptionChange),
      nextCorruption,
      currentEfficiency,
      corruptionEfficiencyPressure: roundPercent(corruptionEfficiencyPressure),
      crimeEfficiencyPressure: roundPercent(crimeEfficiencyPressure),
      instabilityEfficiencyPressure: roundPercent(instabilityEfficiencyPressure),
      efficiencyTarget: roundPercent(efficiencyTarget),
      efficiencyChange: roundPercent(efficiencyChange),
      nextEfficiency,
      currentEffectiveEfficiency,
      effectiveEfficiencyChange: roundPercent(effectiveEfficiencyChange),
      nextEffectiveEfficiency
    };
  }

  function statPathValue(row, path) {
    if (!row || !path) return undefined;
    if (!path.includes(".")) return row[path];
    return path.split(".").reduce((target, segment) => target?.[segment], row);
  }

  function statHumanLabel(path = "") {
    const labels = {
      active: "Active Total",
      autarkyIndex: "Autarky",
      budgetBalance: "Peacetime Fiscal Balance",
      budgetCapacity: "Budget Capacity",
      budgetExpenditure: "Expenditure",
      civilianFactories: "Civilian Factories",
      civilianSectors: "Civilian Sectors",
      combatPersonnel: "Combat Personnel",
      crimeRate: "Crime Rate",
      debt: "Debt",
      debtRepayment: "Debt Repayment",
      debtService: "Debt Service",
      debtServiceRate: "Interest Rate",
      economicHealth: "Economic Health",
      economicImpactScore: "Economic Impact",
      economicTradeDiversity: "Trade Diversity",
      effectiveBudgetExpenditure: "Expenditure",
      effectiveGovernmentalEfficiency: "Applied Governmental Efficiency",
      exportReliance: "Export Reliance",
      governmentalCorruption: "Governmental Corruption",
      governmentalEfficiency: "Governmental Efficiency",
      governmentalStability: "Stability",
      importReliance: "Import Reliance",
      industrialSophistication: "Industrial Sophistication",
      infrastructureLevel: "Infrastructure",
      literacyRate: "Literacy Rate",
      livingStandard: "Living Standard",
      maxDebtPaydown: "Debt Paydown Cap",
      militaryFactories: "Military Factories",
      militarySectors: "Military Sectors",
      militarySupply: "Military Supply",
      mobilizationLevel: "Mobilization",
      mobilizationStrain: "Mobilization Strain",
      mobilizedBudgetCapacity: "Displayed Budget Capacity",
      primaryBalance: "Primary Balance",
      projectedDebt: "Projected Debt",
      publicUnrest: "Public Unrest",
      ruralDevelopment: "Rural Development",
      shipyardSectors: "Shipyard Sectors",
      shipyards: "Shipyards",
      taxRate: "Tax Rate",
      tariffRate: "Tariff Rate",
      temporaryBudgetExpenditure: "Temporary BE",
      tradeBalance: "Trade Balance",
      tradeCapacity: "Trade Capacity",
      tradeDisruption: "Trade Disruption",
      tradeFlow: "Trade Flow",
      tradePolicy: "Trade Policy",
      treasuryReserve: "Treasury Reserve",
      urbanDevelopment: "Urban Development",
      urbanizationRate: "Urbanization",
      wartimeBudgetAutoExpenditure: "Auto Mobilization BE",
      wartimeBudgetBonus: "Wartime BC Bonus",
      wartimeBudgetHeadroom: "Unused Wartime BC",
      wartimeBudgetPeakBonus: "Peak Wartime BC Bonus",
      warSupport: "War Support"
    };
    if (labels[path]) return labels[path];
    const last = String(path).split(".").pop() || path;
    return last
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function statExplainRow(label, value, options = {}) {
    return {
      label,
      value,
      format: options.format || "number",
      tone: options.tone || "neutral",
      detail: options.detail || "",
      adminOnly: options.adminOnly === true
    };
  }

  function publicStatRows(rows, admin) {
    return rows.filter((row) => !row.adminOnly || admin);
  }

  function statExplainBase(data, id, dataset, key, options = {}) {
    const row = dataset === "population" ? data.population?.[id]?.values : data[dataset]?.[id];
    const rawValue = dataset === "population" && /^\d+$/.test(String(key))
      ? data.population?.[id]?.values?.[key]
      : statPathValue(row, key);
    return {
      nationId: id,
      nationName: data.nations?.find((nation) => nation.id === id)?.name || id || "",
      dataset,
      key,
      title: options.title || statHumanLabel(key),
      value: rawValue ?? options.currentValue,
      valueFormat: options.valueFormat || "auto",
      summary: "This is the stored ledger value shown directly for this nation.",
      formula: "",
      components: [],
      hidden: [],
      warnings: []
    };
  }

  function statToneForChange(value, positiveIsGood = true) {
    const numeric = number(value, 0);
    if (Math.abs(numeric) < 0.000001) return "neutral";
    return numeric > 0 === positiveIsGood ? "positive" : "negative";
  }

  function statToneForMultiplier(value, higherIsGood = true) {
    const numeric = number(value, 1);
    if (Math.abs(numeric - 1) < 0.000001) return "neutral";
    return numeric > 1 === higherIsGood ? "positive" : "negative";
  }

  function fiscalCapacityProfileFor(national = {}) {
    return componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.05,
      ruralDevelopment: 0.22,
      infrastructureLevel: 0.4,
      livingStandard: 0.3
    });
  }

  function taxStabilityPressureFor(stability) {
    return 1 + clamp((70 - number(stability, 70)) / 60, 0, 1.25);
  }

  function stabilityCollectionFactorFor(stability) {
    return clamp(0.55 + number(stability, 70) / 200, 0.4, 1.1);
  }

  function stabilityPopulationGrowthEffect(stability) {
    return clamp((number(stability, 65) - 65) * 0.0038, -0.32, 0.22);
  }

  function stabilityMigrationAttractiveness(stability) {
    return clamp((number(stability, 60) - 60) * 0.007, -0.35, 0.28);
  }

  function diversityResilienceForExplain(diversity) {
    return clamp(0.88 + Math.sqrt(Math.max(0, number(diversity, 0))) / 58, 0.88, 1.22);
  }

  function autarkyAccessForExplain(autarkyIndex, mode = "overall") {
    const autarky = clamp(number(autarkyIndex, 50), 0, 100) / 100;
    if (mode === "import") return clamp(1 - Math.pow(autarky, 1.12) * 0.9, 0.07, 1);
    if (mode === "export") return clamp(1 - Math.pow(autarky, 1.06) * 0.72, 0.16, 1);
    return clamp(1 - Math.pow(autarky, 1.1) * 0.78, 0.12, 1);
  }

  function tradePolicyProfileForExplain(policy) {
    return {
      Protectionist: { access: 0.52, importDemand: 0.5, exportSupply: 0.68, capacity: 0.66, balanceRisk: 0.78 },
      Balanced: { access: 1, importDemand: 1, exportSupply: 1, capacity: 1, balanceRisk: 1 },
      "Open Market": { access: 1.22, importDemand: 1.18, exportSupply: 1.14, capacity: 1.12, balanceRisk: 1.08 },
      "Free Trade": { access: 1.44, importDemand: 1.32, exportSupply: 1.26, capacity: 1.22, balanceRisk: 1.14 }
    }[policy] || { access: 1, importDemand: 1, exportSupply: 1, capacity: 1, balanceRisk: 1 };
  }

  function activeMilitaryPersonnel(military = {}) {
    return ["combatPersonnel", "supportPersonnel", "airForcePersonnel", "navalPersonnel", "reserveForces", "paramilitaryIrregular"]
      .reduce((total, key) => total + number(military[key], 0), 0);
  }

  function explainGovernanceStat(data, id, key, options = {}) {
    const national = data.national?.[id];
    if (!national) return null;
    const admin = options.admin === true;
    const governance = governanceMetrics(national);
    const preview = governanceSimulationPreview(national);
    const base = statExplainBase(data, id, "national", key, {
      title: options.title,
      valueFormat: "percent"
    });
    base.formula = "Yearly simulation: literacy/stability/unrest/economy -> crime -> governmental corruption -> governmental efficiency -> applied efficiency.";

    if (key === "governmentalStability") {
      const stability = percentStat(national.governmentalStability, 70);
      const fiscal = calculateFiscalForNation(data, id) || {};
      const taxBurden = calculateTaxBurdenForNation(data, id) || {};
      const logistics = tradeLogisticsFor(data, id) || {};
      base.value = stability;
      base.valueFormat = "percent";
      base.summary = "Stability is a broad domestic-order score. It affects tax collection, unrest risk, population growth, immigration, trade logistics, debt interest risk, and the yearly governance chain.";
      base.formula = "Low stability raises tax pressure, crime/corruption pressure, efficiency pressure, debt risk, and population stress. High stability improves collection, migration, logistics, and industrial growth.";
      base.components = publicStatRows([
        statExplainRow("Current stability", stability, { format: "percent", tone: stability >= 75 ? "positive" : stability < 60 ? "negative" : "warning" }),
        statExplainRow("Tax collection factor", stabilityCollectionFactorFor(stability), { format: "multiplier", tone: statToneForMultiplier(stabilityCollectionFactorFor(stability)), detail: "Used by tax revenue collection." }),
        statExplainRow("Tax unrest pressure", taxStabilityPressureFor(stability), { format: "multiplier", tone: taxStabilityPressureFor(stability) > 1 ? "negative" : "neutral", detail: "Only rises when stability is below 70%." }),
        statExplainRow("Natural growth effect", stabilityPopulationGrowthEffect(stability), { format: "signedYearlyPoints", tone: statToneForChange(stabilityPopulationGrowthEffect(stability)), detail: "Added to annual natural population growth before other effects." }),
        statExplainRow("Migration attractiveness", stabilityMigrationAttractiveness(stability), { format: "signedYearlyPoints", tone: statToneForChange(stabilityMigrationAttractiveness(stability)), detail: "Feeds the migration side of yearly population growth." }),
        statExplainRow("Low-stability crime pressure", preview.lowStabilityCrimePressure, { format: "negativePoints", tone: preview.lowStabilityCrimePressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Low-stability corruption pressure", preview.lowStabilityCorruptionPressure, { format: "negativePoints", tone: preview.lowStabilityCorruptionPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Efficiency pressure", preview.instabilityEfficiencyPressure, { format: "negativePoints", tone: preview.instabilityEfficiencyPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Trade reliability", logistics.reliability, { format: "percent", tone: number(logistics.reliability, 0) >= 62 ? "positive" : "warning" }),
        statExplainRow("Interest-rate risk", fiscal.stabilityRisk, { format: "signedPoints", tone: number(fiscal.stabilityRisk, 0) > 0 ? "negative" : "neutral", detail: "Added to debt interest when stability is below 75%." }),
        statExplainRow("Tax pressure score", taxBurden.pressureScore, { format: "number", tone: number(taxBurden.pressureScore, 0) > 4 ? "warning" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "publicUnrest") {
      const unrest = clamp(number(national.publicUnrest, 0), 0, 10);
      const taxBurden = calculateTaxBurdenForNation(data, id) || {};
      base.value = unrest;
      base.valueFormat = "number";
      base.summary = "Public unrest is a GM-controlled 0-10 pressure score. It does not auto-rise by itself, but the tax screen can recommend increases. Yearly simulation uses unrest to hurt population growth, immigration, crime, and governmental corruption.";
      base.formula = "Unrest feeds annual population stress, city absorption, crime target, and corruption target. Crime/corruption can later pull governmental efficiency down.";
      base.components = publicStatRows([
        statExplainRow("Current unrest", unrest, { format: "number", tone: unrest >= 6 ? "negative" : unrest > 0 ? "warning" : "positive" }),
        statExplainRow("Tax-tool recommendation", number(taxBurden.suggestedUnrestChange, 0), { format: "number", tone: number(taxBurden.suggestedUnrestChange, 0) > 0 ? "warning" : "neutral", detail: "Admins must apply this manually." }),
        statExplainRow("Natural growth drag", unrest * 0.045, { format: "negativeYearlyPoints", tone: unrest > 0 ? "negative" : "neutral" }),
        statExplainRow("Migration drag", unrest * 0.045, { format: "negativeYearlyPoints", tone: unrest > 0 ? "negative" : "neutral", detail: "Reduces migration attractiveness before damping." }),
        statExplainRow("City absorption drag", unrest * 0.025, { format: "negativeYearlyPoints", tone: unrest > 0 ? "negative" : "neutral", detail: "Slows urbanization when cities are trying to absorb growth." }),
        statExplainRow("Crime target pressure", unrest * 2.2, { format: "negativePoints", tone: unrest > 0 ? "negative" : "neutral" }),
        statExplainRow("Corruption target pressure", unrest * 1.2, { format: "negativePoints", tone: unrest > 0 ? "negative" : "neutral" }),
        statExplainRow("Next-year crime pull", preview.crimeChange, { format: "signedPercent", tone: statToneForChange(preview.crimeChange, false), detail: `Targeting ${preview.crimeTarget}%.` }),
        statExplainRow("Next-year corruption pull", preview.corruptionChange, { format: "signedPercent", tone: statToneForChange(preview.corruptionChange, false), detail: `Targeting ${preview.corruptionTarget}%.` })
      ], admin);
      return base;
    }

    if (key === "governmentalEfficiency" || key === "effectiveGovernmentalEfficiency") {
      base.value = key === "effectiveGovernmentalEfficiency" ? governance.governmentalEfficiency : governance.governmentalEfficiencyTarget;
      base.summary = "The visible efficiency target moves during yearly simulation. Fiscal formulas use the lagged applied efficiency so a manual edit does not instantly delete BC.";
      base.components = publicStatRows([
        statExplainRow("Visible target", governance.governmentalEfficiencyTarget, { format: "precisePercent" }),
        statExplainRow("Applied fiscal efficiency", governance.effectiveGovernmentalEfficiency, { format: "precisePercent", adminOnly: true, detail: "Budget and interest formulas use this lagged value." }),
        statExplainRow("Next-year target pull", preview.efficiencyChange, { format: "signedPrecisePercent", tone: statToneForChange(preview.efficiencyChange), detail: `Targeting ${roundPercent(preview.efficiencyTarget)}%.` }),
        statExplainRow("Gov corruption pressure", preview.corruptionEfficiencyPressure, { format: "negativePercent", tone: preview.corruptionEfficiencyPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Crime pressure", preview.crimeEfficiencyPressure, { format: "negativePercent", tone: preview.crimeEfficiencyPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Instability pressure", preview.instabilityEfficiencyPressure, { format: "negativePercent", tone: preview.instabilityEfficiencyPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Development offset", preview.development * 0.05, { format: "positivePercent", tone: "positive" }),
        statExplainRow("Bureaucracy multiplier", governance.efficiencyMultiplier, { format: "multiplier", tone: governance.efficiencyMultiplier < 1 ? "negative" : "positive", adminOnly: true }),
        statExplainRow("Bureaucracy pressure", governance.bureaucracyPressure, { format: "multiplier", tone: governance.bureaucracyPressure > 1 ? "negative" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "governmentalCorruption" || key === "corruption") {
      base.value = governance.governmentalCorruption;
      base.summary = "Governmental corruption moves over yearly simulation. High crime, unrest, instability, poor economic health, and urban strain pull it upward.";
      base.components = publicStatRows([
        statExplainRow("Current corruption", governance.governmentalCorruption, { format: "percent", tone: governance.governmentalCorruption >= 30 ? "negative" : "neutral" }),
        statExplainRow("Next-year pull", preview.corruptionChange, { format: "signedPercent", tone: statToneForChange(preview.corruptionChange, false), detail: `Targeting ${preview.corruptionTarget}%.` }),
        statExplainRow("Crime pressure", preview.crimeCorruptionPressure, { format: "negativePercent", tone: preview.crimeCorruptionPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Low-stability pressure", preview.lowStabilityCorruptionPressure, { format: "negativePercent", tone: preview.lowStabilityCorruptionPressure > 0 ? "negative" : "neutral" }),
        statExplainRow("Public unrest", preview.unrest, { format: "number", tone: preview.unrest > 0 ? "negative" : "neutral" }),
        statExplainRow("Economic health pressure", preview.healthCorruptionPressure, { format: "signedPercent", tone: statToneForChange(preview.healthCorruptionPressure, false), detail: preview.health }),
        statExplainRow("Development offset", preview.development * 0.1, { format: "positivePercent", tone: "positive", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "crimeRate") {
      base.value = governance.crimeRate;
      base.summary = "Crime moves first in the governance chain. Low literacy, unrest, instability, economic weakness, and urban strain raise it over simulation years.";
      base.components = publicStatRows([
        statExplainRow("Current crime", governance.crimeRate, { format: "percent", tone: governance.crimeRate >= 25 ? "negative" : "neutral" }),
        statExplainRow("Next-year pull", preview.crimeChange, { format: "signedPercent", tone: statToneForChange(preview.crimeChange, false), detail: `Targeting ${preview.crimeTarget}%.` }),
        statExplainRow("Literacy deficit", preview.literacyDeficit, { format: "negativePercent", tone: preview.literacyDeficit > 0 ? "negative" : "positive", detail: `Neutral at ${GOVERNANCE_CRIME_LITERACY_NEUTRAL}%.` }),
        statExplainRow("Public unrest", preview.unrest, { format: "number", tone: preview.unrest > 0 ? "negative" : "neutral" }),
        statExplainRow("Urban strain", preview.urbanStrain.urbanStrain, { format: "percent", tone: preview.urbanStrain.urbanStrain > 0 ? "negative" : "neutral" }),
        statExplainRow("Development offset", preview.development * 0.2, { format: "positivePercent", tone: "positive", adminOnly: true })
      ], admin);
      return base;
    }

    return null;
  }

  function explainNationalDriverStat(data, id, key, options = {}) {
    const national = data.national?.[id];
    if (!national) return null;
    const admin = options.admin === true;
    const base = statExplainBase(data, id, "national", key, { title: options.title });
    const military = data.military?.[id] || {};
    const industrial = data.industrial?.[id] || {};
    const mobilizationLevel = military.mobilizationLevel || industrial.mobilizationLevel || "None";
    const fiscal = calculateFiscalForNation(data, id) || {};
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};
    const preview = governanceSimulationPreview(national);

    if (key === "warSupport") {
      const warSupport = clamp(number(national.warSupport, 50), 0, 100);
      const mobilization = MOBILIZATION[mobilizationLevel] || MOBILIZATION.None;
      const resolveMultiplier = mobilizedBudgetResolveMultiplier(mobilizationLevel, warSupport / 100);
      const readiness = clamp(0.62 + (warSupport / 100) * 0.38, 0.45, 1);
      base.value = warSupport;
      base.valueFormat = "percent";
      base.summary = "War support does not directly change peacetime trade. It affects wartime mobilized BC resolve, wartime military factory growth readiness, and military modernization pressure.";
      base.formula = "Mobilization uses war support as a resolve/readiness input. Low support matters most at Full and Total mobilization.";
      base.components = publicStatRows([
        statExplainRow("War support", warSupport, { format: "percent", tone: warSupport >= 75 ? "positive" : warSupport < 45 ? "negative" : "warning" }),
        statExplainRow("Mobilization level", mobilizationLevel, { format: "text", tone: mobilizationLevel === "None" ? "neutral" : "warning" }),
        statExplainRow("Resolve multiplier", resolveMultiplier, { format: "multiplier", tone: statToneForMultiplier(resolveMultiplier), detail: "Affects unlocked wartime BC at Full/Total mobilization." }),
        statExplainRow("Readiness multiplier", readiness, { format: "multiplier", tone: statToneForMultiplier(readiness), detail: "Feeds wartime BC foundation." }),
        statExplainRow("Supply multiplier from mobilization", mobilization.supplyMultiplier, { format: "multiplier", tone: statToneForMultiplier(mobilization.supplyMultiplier) }),
        statExplainRow("Current wartime BC bonus", national.wartimeBudgetBonus, { format: "number", tone: number(national.wartimeBudgetBonus, 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Auto mobilization BE", national.wartimeBudgetAutoExpenditure, { format: "number", tone: number(national.wartimeBudgetAutoExpenditure, 0) > 0 ? "negative" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "economicHealth") {
      const health = national.economicHealth || "Recovery";
      const demographics = HEALTH_DEMOGRAPHICS[health] || HEALTH_DEMOGRAPHICS.Recovery;
      base.value = health;
      base.valueFormat = "text";
      base.summary = "Economic health is a broad cycle setting. It affects tax collection, tax stress, population growth, migration, industrial yearly growth, governance pressure, trade, and debt interest risk.";
      base.formula = "Health multipliers feed budget collection, demographic pressure, industrial health signal, tariff/tax stress, governance drift, and interest-rate risk.";
      base.components = publicStatRows([
        statExplainRow("Health state", health, { format: "text", tone: ["Prosperity", "Expansion"].includes(health) ? "positive" : ["Recession", "Depression"].includes(health) ? "negative" : health === "Slowdown" ? "warning" : "neutral" }),
        statExplainRow("Budget collection", HEALTH_BUDGET[health] || 1, { format: "multiplier", tone: statToneForMultiplier(HEALTH_BUDGET[health] || 1) }),
        statExplainRow("Industry growth signal", HEALTH_GROWTH[health] || 0, { format: "signedNumber", tone: statToneForChange(HEALTH_GROWTH[health] || 0) }),
        statExplainRow("Natural growth climate", demographics.naturalGrowth, { format: "signedYearlyPoints", tone: statToneForChange(demographics.naturalGrowth) }),
        statExplainRow("Migration climate", demographics.migration, { format: "signedYearlyPoints", tone: statToneForChange(demographics.migration) }),
        statExplainRow("Tax pressure tier", taxBurden.tier || "Stable", { format: "text", tone: ["Volatile", "Crisis"].includes(taxBurden.tier) ? "negative" : taxBurden.tier === "Agitated" ? "warning" : "neutral" }),
        statExplainRow("Crime pressure", preview.healthCrimePressure, { format: "signedPoints", tone: statToneForChange(preview.healthCrimePressure, false) }),
        statExplainRow("Corruption pressure", preview.healthCorruptionPressure, { format: "signedPoints", tone: statToneForChange(preview.healthCorruptionPressure, false) }),
        statExplainRow("Interest-rate risk", fiscal.healthRisk, { format: "signedPoints", tone: number(fiscal.healthRisk, 0) > 0 ? "negative" : "neutral" })
      ], admin);
      return base;
    }

    if (key === "immigrationRate") {
      const immigration = number(national.immigrationRate, 0);
      const taxPenalty = number(taxBurden.immigrationPenalty, 0);
      const effectiveImmigration = immigration - taxPenalty;
      const stabilityMigration = stabilityMigrationAttractiveness(national.governmentalStability);
      const unrestDrag = clamp(number(national.publicUnrest, 0), 0, 10) * 0.045;
      base.value = immigration;
      base.valueFormat = "number";
      base.summary = "Immigration is a GM-facing migration input used by yearly population growth. Tax pressure, stability, unrest, corruption, bureaucracy, maturity, and urban strain modify how much actually becomes population growth.";
      base.formula = "Effective immigration input = immigration rate - tax immigration penalty, then migration attractiveness and damping apply.";
      base.components = publicStatRows([
        statExplainRow("Immigration input", immigration, { format: "number", tone: immigration > 0 ? "positive" : immigration < 0 ? "negative" : "neutral" }),
        statExplainRow("Tax immigration penalty", taxPenalty, { format: "negativePoints", tone: taxPenalty > 0 ? "negative" : "neutral" }),
        statExplainRow("Effective input", effectiveImmigration, { format: "signedNumber", tone: statToneForChange(effectiveImmigration) }),
        statExplainRow("Stability attractiveness", stabilityMigration, { format: "signedYearlyPoints", tone: statToneForChange(stabilityMigration) }),
        statExplainRow("Unrest migration drag", unrestDrag, { format: "negativeYearlyPoints", tone: unrestDrag > 0 ? "negative" : "neutral" }),
        statExplainRow("Tax pressure tier", taxBurden.tier || "Stable", { format: "text", tone: ["Volatile", "Crisis"].includes(taxBurden.tier) ? "negative" : taxBurden.tier === "Agitated" ? "warning" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "fiscalModel") {
      const model = fiscalModelForNation(data, id, national);
      const profile = FISCAL_MODELS[model] || FISCAL_MODELS.Standard;
      base.value = model;
      base.valueFormat = "text";
      base.summary = "Fiscal model changes how the tax system behaves. It can raise sustainable tax capacity, alter unrest pressure, change tax collection floors, and modify population/immigration/industry tax penalties.";
      base.formula = "If no model is manually set, strong high-capacity states can auto-resolve to High Capacity State or Welfare State.";
      base.components = publicStatRows([
        statExplainRow("Fiscal model", model, { format: "text" }),
        statExplainRow("Fiscal capacity profile", fiscalCapacityProfileFor(national), { format: "number", tone: "positive" }),
        statExplainRow("Sustainable tax bonus", profile.sustainableTaxBonus, { format: "signedPoints", tone: statToneForChange(profile.sustainableTaxBonus) }),
        statExplainRow("Tax pressure multiplier", profile.pressureMultiplier, { format: "multiplier", tone: statToneForMultiplier(profile.pressureMultiplier, false) }),
        statExplainRow("Collection floor", profile.collectionFloor * 100, { format: "percent", tone: "positive", adminOnly: true }),
        statExplainRow("Avoidance multiplier", profile.avoidanceMultiplier, { format: "multiplier", tone: statToneForMultiplier(profile.avoidanceMultiplier, false), adminOnly: true })
      ], admin);
      return base;
    }

    return null;
  }

  function explainFiscalStat(data, id, key, options = {}) {
    const national = data.national?.[id];
    if (!national) return null;
    const admin = options.admin === true;
    const fiscal = calculateFiscalForNation(data, id) || {};
    const breakdown = calculateBudgetBreakdownForNation(data, id) || {};
    const base = statExplainBase(data, id, "national", key, { title: options.title });
    const finalExpenditure = number(national.effectiveBudgetExpenditure ?? national.budgetExpenditure, 0);
    const permanentExpenditure = number(national.budgetExpenditure, 0);
    const temporaryExpenditure = number(national.temporaryBudgetExpenditure, 0);
    const autoMobilizationBe = number(national.wartimeBudgetAutoExpenditure, 0);
    const taxBurden = calculateTaxBurdenForNation(data, id) || {};

    if (key === "taxRate") {
      const taxRate = number(national.taxRate, 0);
      const taxRatePercent = taxRate > 1 ? taxRate : taxRate * 100;
      base.value = taxRatePercent;
      base.valueFormat = "percent";
      base.summary = "Tax rate feeds tax revenue, collection drag, tax pressure, population growth penalties, immigration penalties, industry growth penalties, and GM unrest recommendations.";
      base.formula = "Tax pressure = tax rate - sustainable tax rate. Pressure then reduces collection and can recommend public unrest.";
      base.components = publicStatRows([
        statExplainRow("Tax rate", taxRatePercent, { format: "percent", tone: taxRatePercent > number(taxBurden.sustainableTaxRate, 0) ? "warning" : "neutral" }),
        statExplainRow("Sustainable tax rate", taxBurden.sustainableTaxRate, { format: "percent", tone: "positive" }),
        statExplainRow("Tax pressure", taxBurden.taxPressure, { format: "negativePoints", tone: number(taxBurden.taxPressure, 0) > 0 ? "negative" : "neutral" }),
        statExplainRow("Pressure score", taxBurden.pressureScore, { format: "number", tone: number(taxBurden.pressureScore, 0) > 9 ? "negative" : number(taxBurden.pressureScore, 0) > 4 ? "warning" : "neutral" }),
        statExplainRow("Pressure tier", taxBurden.tier || "Stable", { format: "text", tone: ["Volatile", "Crisis"].includes(taxBurden.tier) ? "negative" : taxBurden.tier === "Agitated" ? "warning" : "neutral" }),
        statExplainRow("Collection retained", number(taxBurden.collectionMultiplier, 1) * 100, { format: "percent", tone: number(taxBurden.collectionMultiplier, 1) < 0.9 ? "warning" : "positive" }),
        statExplainRow("Population growth penalty", taxBurden.populationGrowthPenalty, { format: "negativeYearlyPoints", tone: number(taxBurden.populationGrowthPenalty, 0) > 0 ? "negative" : "neutral" }),
        statExplainRow("Immigration penalty", taxBurden.immigrationPenalty, { format: "negativePoints", tone: number(taxBurden.immigrationPenalty, 0) > 0 ? "negative" : "neutral" }),
        statExplainRow("Industry growth retained", number(taxBurden.industryGrowthMultiplier, 1) * 100, { format: "percent", tone: number(taxBurden.industryGrowthMultiplier, 1) < 0.9 ? "warning" : "positive" }),
        statExplainRow("Recommended unrest", taxBurden.suggestedUnrestChange, { format: "number", tone: number(taxBurden.suggestedUnrestChange, 0) > 0 ? "warning" : "neutral", detail: "GM-controlled; not applied automatically." })
      ], admin);
      base.warnings = publicStatRows((taxBurden.warnings || []).map((warning) => statExplainRow("Warning", warning, { format: "text", tone: "warning", adminOnly: true })), admin);
      return base;
    }

    if (key === "budgetCapacity" || key === "mobilizedBudgetCapacity") {
      base.value = displayBudgetCapacity(data, id);
      base.valueFormat = "number";
      base.summary = "Displayed BC is peacetime BC plus current wartime mobilization BC. Trade and normal peacetime systems should use the stored peacetime BC.";
      base.formula = "Displayed BC = Peacetime BC + current wartime BC bonus.";
      base.components = publicStatRows([
        statExplainRow("Peacetime BC", number(national.budgetCapacity, 0), { format: "number", tone: "positive" }),
        statExplainRow("Wartime BC bonus", number(national.wartimeBudgetBonus, 0), { format: "number", tone: number(national.wartimeBudgetBonus, 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Industrial contribution", breakdown.industrialContribution, { format: "number", tone: "positive", adminOnly: true }),
        statExplainRow("Population/tax contribution", breakdown.populationContribution, { format: "number", tone: "positive", adminOnly: true }),
        statExplainRow("Tariff revenue", breakdown.tariffRevenue, { format: "number", tone: number(breakdown.tariffRevenue, 0) > 0 ? "positive" : "neutral", adminOnly: true }),
        statExplainRow("Maintenance drag", breakdown.maintenanceCost, { format: "negativeNumber", tone: "negative", adminOnly: true }),
        statExplainRow("Admin capacity multiplier", breakdown.administrativeCapacityMultiplier, { format: "multiplier", tone: number(breakdown.administrativeCapacityMultiplier, 1) < 1 ? "negative" : "positive", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "effectiveBudgetExpenditure" || key === "budgetExpenditure") {
      base.value = finalExpenditure;
      base.valueFormat = "number";
      base.summary = "Expenditure is the final number used by fiscal balance. Public tables show only this final value; admins can see permanent, temporary, and mobilization pieces.";
      base.formula = "Final expenditure = permanent BE + temporary BE + auto mobilization BE.";
      base.components = publicStatRows([
        statExplainRow("Final expenditure", finalExpenditure, { format: "number", tone: "negative" }),
        statExplainRow("Permanent BE", permanentExpenditure, { format: "number", tone: "negative", adminOnly: true }),
        statExplainRow("Temporary BE", temporaryExpenditure, { format: "number", tone: "negative", adminOnly: true }),
        statExplainRow("Auto mobilization BE", autoMobilizationBe, { format: "number", tone: autoMobilizationBe > 0 ? "negative" : "neutral", adminOnly: true }),
        statExplainRow("Temporary items", number(national.temporaryBudgetExpenditureCount, 0), { format: "number", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "primaryBalance" || key === "budgetBalance") {
      base.value = key === "primaryBalance" ? fiscal.primaryBalance : fiscal.effectiveBalance;
      base.valueFormat = "signedNumber";
      base.summary = key === "primaryBalance"
        ? "Primary balance is BC minus expenditure before debt service."
        : "Peacetime fiscal balance subtracts debt service after primary balance. Surplus can repay debt; deficit draws reserves first, then adds debt.";
      base.formula = key === "primaryBalance"
        ? "Primary balance = peacetime BC - final expenditure."
        : "Fiscal balance = primary balance - debt service.";
      base.components = publicStatRows([
        statExplainRow("Peacetime BC", fiscal.budgetCapacity, { format: "number", tone: "positive" }),
        statExplainRow("Final expenditure", fiscal.budgetExpenditure, { format: "negativeNumber", tone: "negative" }),
        statExplainRow("Primary balance", fiscal.primaryBalance, { format: "signedNumber", tone: statToneForChange(fiscal.primaryBalance) }),
        statExplainRow("Debt service", fiscal.debtService, { format: "negativeNumber", tone: fiscal.debtService > 0 ? "negative" : "neutral" }),
        statExplainRow("Fiscal balance", fiscal.effectiveBalance, { format: "signedNumber", tone: statToneForChange(fiscal.effectiveBalance) }),
        statExplainRow("Treasury drawdown", fiscal.treasuryDrawdown, { format: "negativeNumber", tone: fiscal.treasuryDrawdown > 0 ? "warning" : "neutral", adminOnly: true }),
        statExplainRow("Deficit borrowing", fiscal.deficitBorrowing, { format: "negativeNumber", tone: fiscal.deficitBorrowing > 0 ? "negative" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (["treasuryReserve", "debtRepayment", "maxDebtPaydown"].includes(key)) {
      base.value = key === "treasuryReserve" ? fiscal.treasuryReserve : fiscal[key];
      base.valueFormat = "number";
      base.summary = key === "treasuryReserve"
        ? "Treasury reserve absorbs deficits before new borrowing and receives surplus left after debt repayment."
        : "Debt repayment is automatically limited by surplus, the annual repayment share, the max paydown cap, and remaining debt principal.";
      base.formula = "Surplus repays debt up to the repayment share and paydown cap. Deficits draw treasury first, then borrow.";
      base.components = publicStatRows([
        statExplainRow("Treasury reserve", fiscal.treasuryReserve, { format: "number", tone: fiscal.treasuryReserve > 0 ? "positive" : "neutral" }),
        statExplainRow("Fiscal balance", fiscal.effectiveBalance, { format: "signedNumber", tone: statToneForChange(fiscal.effectiveBalance) }),
        statExplainRow("Treasury drawdown", fiscal.treasuryDrawdown, { format: "negativeNumber", tone: fiscal.treasuryDrawdown > 0 ? "warning" : "neutral" }),
        statExplainRow("Treasury deposit", fiscal.treasuryDeposit, { format: "number", tone: fiscal.treasuryDeposit > 0 ? "positive" : "neutral" }),
        statExplainRow("Next reserve", fiscal.nextTreasuryReserve, { format: "number", tone: fiscal.nextTreasuryReserve > fiscal.treasuryReserve ? "positive" : fiscal.nextTreasuryReserve < fiscal.treasuryReserve ? "warning" : "neutral" }),
        statExplainRow("Debt repayment", fiscal.debtRepayment, { format: "number", tone: fiscal.debtRepayment > 0 ? "positive" : "neutral" }),
        statExplainRow("Repayment share limit", fiscal.repaymentShareLimit, { format: "number", tone: "positive", adminOnly: true }),
        statExplainRow("Paydown cap", fiscal.maxDebtPaydown, { format: "number", tone: "positive", adminOnly: true })
      ], admin);
      return base;
    }

    if (["debt", "projectedDebt", "debtService", "debtServiceRate", "interestRate"].includes(key)) {
      base.value = key === "projectedDebt" ? fiscal.nextDebtPercent : key === "debt" ? fiscal.debtPercent : national[key];
      base.valueFormat = key.includes("Rate") || key === "interestRate" || key === "debt" || key === "projectedDebt" ? "percent" : "number";
      base.summary = "Debt projection uses peacetime BC, final expenditure, current debt principal, service rate, reserves, and deficit borrowing.";
      base.formula = "Debt service = debt principal x service rate. Projected debt updates after repayment, reserve drawdown, and new borrowing.";
      base.components = publicStatRows([
        statExplainRow("Debt principal", fiscal.debtPrincipal, { format: "number", tone: fiscal.debtPrincipal > 0 ? "negative" : "neutral" }),
        statExplainRow("Debt percent", fiscal.debtPercent, { format: "percent", tone: fiscal.debtPercent > 50 ? "negative" : fiscal.debtPercent > 25 ? "warning" : "neutral" }),
        statExplainRow("Service rate", fiscal.debtServiceRate, { format: "percent", tone: fiscal.debtServiceRate > 5 ? "negative" : fiscal.debtServiceRate > 2 ? "warning" : "neutral" }),
        statExplainRow("Debt service", fiscal.debtService, { format: "number", tone: fiscal.debtService > 0 ? "negative" : "neutral" }),
        statExplainRow("Debt repayment", fiscal.debtRepayment, { format: "number", tone: fiscal.debtRepayment > 0 ? "positive" : "neutral" }),
        statExplainRow("Deficit borrowing", fiscal.deficitBorrowing, { format: "number", tone: fiscal.deficitBorrowing > 0 ? "negative" : "neutral" }),
        statExplainRow("Projected debt", fiscal.nextDebtPercent, { format: "percent", tone: fiscal.nextDebtPercent > fiscal.debtPercent ? "negative" : fiscal.nextDebtPercent < fiscal.debtPercent ? "positive" : "neutral" }),
        statExplainRow("Debt risk", fiscal.debtRisk, { format: "signedPercent", tone: fiscal.debtRisk > 0 ? "negative" : "neutral", adminOnly: true }),
        statExplainRow("Efficiency interest risk", fiscal.governmentalEfficiencyRisk, { format: "signedPercent", tone: fiscal.governmentalEfficiencyRisk > 0 ? "negative" : "neutral", adminOnly: true }),
        statExplainRow("Deficit interest risk", fiscal.deficitRisk, { format: "signedPercent", tone: fiscal.deficitRisk > 0 ? "negative" : "neutral", adminOnly: true })
      ], admin);
      return base;
    }

    if (key === "wartimeBudgetHeadroom" || key === "wartimeBudgetBonus" || key === "wartimeBudgetAutoExpenditure" || key === "mobilizationStrain") {
      base.value = statPathValue(national, key);
      base.valueFormat = key === "mobilizationStrain" ? "percent" : "number";
      base.summary = "Wartime BC is extra mobilized capacity. Auto mobilization BE uses part of it, and unused wartime BC is the remaining headroom.";
      base.formula = "Unused wartime BC = current wartime BC bonus - auto mobilization BE.";
      base.components = publicStatRows([
        statExplainRow("Peak wartime BC bonus", national.wartimeBudgetPeakBonus, { format: "number", tone: "positive", adminOnly: true }),
        statExplainRow("Current wartime BC bonus", national.wartimeBudgetBonus, { format: "number", tone: number(national.wartimeBudgetBonus, 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Auto mobilization BE", national.wartimeBudgetAutoExpenditure, { format: "number", tone: number(national.wartimeBudgetAutoExpenditure, 0) > 0 ? "negative" : "neutral", adminOnly: true }),
        statExplainRow("Unused wartime BC", national.wartimeBudgetHeadroom, { format: "number", tone: number(national.wartimeBudgetHeadroom, 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Mobilization strain", national.mobilizationStrain, { format: "percent", tone: number(national.mobilizationStrain, 0) > 0 ? "negative" : "neutral" })
      ], admin);
      return base;
    }

    return null;
  }

  function explainTradeStat(data, id, key, options = {}) {
    const trade = data.trade?.[id];
    if (!trade) return null;
    const admin = options.admin === true;
    const tariff = calculateTariffRevenueForNation(data, id);
    const base = statExplainBase(data, id, "trade", key, { title: options.title });
    if (["tradeFlow", "tradeCapacity", "tradeBalance", "tradeDisruption", "tariffRate", "economicImpactScore", "importReliance", "exportReliance", "economicTradeDiversity", "autarkyIndex", "tradePolicy"].includes(key)) {
      const logistics = tradeLogisticsFor(data, id) || {};
      const policy = trade.tradePolicy || "Balanced";
      const policyProfile = tradePolicyProfileForExplain(policy);
      const importReliance = number(trade.importReliance, 0);
      const exportReliance = number(trade.exportReliance, 0);
      const diversity = number(trade.economicTradeDiversity, 0);
      const autarky = number(trade.autarkyIndex, 50);
      base.value = statPathValue(trade, key);
      base.valueFormat = key === "tradeDisruption" || key === "tariffRate" ? "percent" : key === "tradePolicy" ? "text" : "number";
      base.summary = "Trade output is driven by trade capacity, trade policy, import/export reliance, trade diversity, autarky, tariffs, disruption, logistics, and the routed trade network.";
      base.formula = "Flow is the active routed trade value after policy, reliance, diversity, autarky, tariff, network, logistics, and disruption effects.";
      base.components = publicStatRows([
        statExplainRow("Trade flow", trade.tradeFlow, { format: "number", tone: "positive" }),
        statExplainRow("Trade capacity", trade.tradeCapacity, { format: "number", tone: "positive" }),
        statExplainRow("Trade balance", trade.tradeBalance, { format: "signedNumber", tone: statToneForChange(trade.tradeBalance) }),
        statExplainRow("Import reliance", importReliance, { format: "number", tone: importReliance > exportReliance * 1.25 ? "warning" : "neutral" }),
        statExplainRow("Export reliance", exportReliance, { format: "number", tone: exportReliance > importReliance * 1.25 ? "positive" : "neutral" }),
        statExplainRow("Reliance tilt", importReliance - exportReliance, { format: "signedNumber", tone: importReliance > exportReliance ? "warning" : exportReliance > importReliance ? "positive" : "neutral", detail: "Positive means import-biased; negative means export-biased." }),
        statExplainRow("Trade diversity", diversity, { format: "number", tone: diversity >= 100 ? "positive" : diversity < 50 ? "warning" : "neutral" }),
        statExplainRow("Diversity resilience", diversityResilienceForExplain(diversity), { format: "multiplier", tone: statToneForMultiplier(diversityResilienceForExplain(diversity)), detail: "Raises export/world-pool resilience." }),
        statExplainRow("Autarky", autarky, { format: "number", tone: autarky > 60 ? "warning" : autarky < 25 ? "positive" : "neutral" }),
        statExplainRow("Import access from autarky", autarkyAccessForExplain(autarky, "import"), { format: "multiplier", tone: statToneForMultiplier(autarkyAccessForExplain(autarky, "import")) }),
        statExplainRow("Export access from autarky", autarkyAccessForExplain(autarky, "export"), { format: "multiplier", tone: statToneForMultiplier(autarkyAccessForExplain(autarky, "export")) }),
        statExplainRow("Trade policy", policy, { format: "text" }),
        statExplainRow("Policy import demand", policyProfile.importDemand, { format: "multiplier", tone: statToneForMultiplier(policyProfile.importDemand) }),
        statExplainRow("Policy export supply", policyProfile.exportSupply, { format: "multiplier", tone: statToneForMultiplier(policyProfile.exportSupply) }),
        statExplainRow("Policy capacity", policyProfile.capacity, { format: "multiplier", tone: statToneForMultiplier(policyProfile.capacity) }),
        statExplainRow("Logistics reliability", logistics.reliability, { format: "percent", tone: number(logistics.reliability, 0) >= 62 ? "positive" : "warning" }),
        statExplainRow("Trade disruption", trade.tradeDisruption, { format: "negativePercent", tone: number(trade.tradeDisruption, 0) > 0 ? "negative" : "neutral" }),
        statExplainRow("Tariff rate", trade.tariffRate, { format: "percent", tone: number(trade.tariffRate, 0) > 10 ? "warning" : "neutral" }),
        statExplainRow("Tariff shock", tariff?.tariffShockScore, { format: "negativePercent", tone: number(tariff?.tariffShockScore, 0) > 0 ? "negative" : "neutral", adminOnly: true }),
        statExplainRow("Tariff revenue", tariff?.tariffRevenue, { format: "number", tone: number(tariff?.tariffRevenue, 0) > 0 ? "positive" : "neutral", adminOnly: true }),
        statExplainRow("Collection efficiency", tariff?.collectionEfficiency, { format: "percent", tone: number(tariff?.collectionEfficiency, 100) < 80 ? "warning" : "positive", adminOnly: true })
      ], admin);
      base.warnings = publicStatRows((tariff?.warnings || []).map((warning) => statExplainRow("Warning", warning, { format: "text", tone: "warning", adminOnly: true })), admin);
      return base;
    }
    return null;
  }

  function explainDevelopmentStat(data, id, key, options = {}) {
    const national = data.national?.[id];
    if (!national) return null;
    const base = statExplainBase(data, id, "national", key, { title: options.title });
    const urbanStrain = urbanStrainMetrics(national);
    if (["urbanizationRate", "urbanDevelopment", "ruralDevelopment", "infrastructureLevel", "livingStandard"].includes(key)) {
      base.summary = "Development components feed tax collection, industry, trade logistics, urban strain, population behavior, and governance simulation.";
      base.formula = "Different systems use weighted component profiles instead of one legacy development number.";
      base.components = [
        statExplainRow("Urbanization", national.urbanizationRate, { format: "percent" }),
        statExplainRow("Urban development", national.urbanDevelopment, { format: "number", tone: "positive" }),
        statExplainRow("Rural development", national.ruralDevelopment, { format: "number", tone: "positive" }),
        statExplainRow("Infrastructure", national.infrastructureLevel, { format: "number", tone: "positive" }),
        statExplainRow("Living standard", national.livingStandard, { format: "number", tone: "positive" }),
        statExplainRow("Fiscal capacity profile", componentProfileScore(national, { urbanizationRate: 0.03, urbanDevelopment: 0.05, ruralDevelopment: 0.22, infrastructureLevel: 0.4, livingStandard: 0.3 }), { format: "number", tone: "positive" }),
        statExplainRow("Urban strain", urbanStrain.urbanStrain, { format: "percent", tone: urbanStrain.urbanStrain > 0 ? "negative" : "neutral" })
      ];
      return base;
    }
    return null;
  }

  function explainIndustryStat(data, id, dataset, key, options = {}) {
    const industrial = data.industrial?.[id];
    if (!industrial) return null;
    const national = data.national?.[id] || {};
    const output = industrialSectorOutputs(industrial, national);
    const base = statExplainBase(data, id, dataset, key, { title: options.title });
    const tierMatch = String(key).match(/^(civilianSectors|militarySectors|shipyardSectors)\.(basic|improved|advanced|medium|large|mega)$/);
    if (dataset === "industrial" && (["civilianSectors", "militarySectors", "shipyardSectors", "civilianFactories", "militaryFactories", "shipyards"].includes(key) || tierMatch)) {
      const sectorKey = tierMatch?.[1] || key;
      const tierKey = tierMatch?.[2] || "";
      const sector = sectorKey.startsWith("military") ? output.military : sectorKey.startsWith("shipyard") || sectorKey === "shipyards" ? output.shipyard : output.civilian;
      const sectorLabel = sectorKey.startsWith("military") ? "Military" : sectorKey.startsWith("shipyard") || sectorKey === "shipyards" ? "Shipyards" : "Civilian";
      base.value = tierKey ? sector[tierKey] : sector.physical;
      base.valueFormat = "number";
      base.summary = `${sectorLabel} industry is stored as physical tier counts. Formulas use effective output, which is the weighted output that actually counts after high-tier literacy and sophistication limits.`;
      base.formula = "Effective output = tier count x tier weight x output retained share. Basic/Medium tiers retain 100%; higher tiers can be discounted.";
      const retainedRows = [];
      if (sector.improved !== undefined) {
        retainedRows.push(statExplainRow("Improved output retained", number(sector.literacyMultipliers?.improved, 1) * number(sector.sophisticationMultipliers?.improved, 1) * 100, {
          format: "percent",
          tone: number(sector.literacyMultipliers?.improved, 1) * number(sector.sophisticationMultipliers?.improved, 1) < 1 ? "warning" : "positive",
          detail: "Share of improved-tier theoretical output that counts."
        }));
      }
      if (sector.advanced !== undefined) {
        retainedRows.push(statExplainRow("Advanced output retained", number(sector.literacyMultipliers?.advanced, 1) * number(sector.sophisticationMultipliers?.advanced, 1) * 100, {
          format: "percent",
          tone: number(sector.literacyMultipliers?.advanced, 1) * number(sector.sophisticationMultipliers?.advanced, 1) < 1 ? "warning" : "positive",
          detail: "Share of advanced-tier theoretical output that counts."
        }));
      }
      if (sector.large !== undefined) {
        retainedRows.push(statExplainRow("Large output retained", number(sector.literacyMultipliers?.large, 1) * number(sector.sophisticationMultipliers?.large, 1) * 100, {
          format: "percent",
          tone: number(sector.literacyMultipliers?.large, 1) * number(sector.sophisticationMultipliers?.large, 1) < 1 ? "warning" : "positive",
          detail: "Share of large-shipyard theoretical output that counts."
        }));
      }
      if (sector.mega !== undefined) {
        retainedRows.push(statExplainRow("Mega output retained", number(sector.literacyMultipliers?.mega, 1) * number(sector.sophisticationMultipliers?.mega, 1) * 100, {
          format: "percent",
          tone: number(sector.literacyMultipliers?.mega, 1) * number(sector.sophisticationMultipliers?.mega, 1) < 1 ? "warning" : "positive",
          detail: "Share of mega-shipyard theoretical output that counts."
        }));
      }
      base.components = [
        ...Object.keys(sector)
          .filter((tier) => !["physical", "effective", "legacyTotal", "literacyMultipliers", "sophisticationMultipliers"].includes(tier))
          .map((tier) => statExplainRow(statHumanLabel(tier), sector[tier], { format: "number" })),
        statExplainRow("Physical total", sector.physical, { format: "number" }),
        statExplainRow("Effective output", sector.effective, { format: "number", tone: "positive" }),
        ...retainedRows,
        statExplainRow("Literacy", national.literacyRate, { format: "percent", tone: number(national.literacyRate, 95) < 95 ? "warning" : "positive" }),
        statExplainRow("Industrial sophistication", national.industrialSophistication, { format: "percent", tone: number(national.industrialSophistication, 0) >= 50 ? "positive" : "warning" })
      ];
      return base;
    }
    if (dataset === "national" && key === "industrialSophistication") {
      base.value = national.industrialSophistication;
      base.valueFormat = "percent";
      base.summary = "Sophistication is production quality: tooling, suppliers, standards, process control, and whether high-tier industry can perform at its theoretical level.";
      base.formula = "100% retained means high-tier output counts fully. Lower retained output means advanced factories/shipyards exist physically but do not produce at full high-tier value.";
      base.components = [
        statExplainRow("Industrial sophistication", national.industrialSophistication, { format: "percent", tone: number(national.industrialSophistication, 0) >= 50 ? "positive" : "warning" }),
        statExplainRow("Improved/Large output retained", sophisticationIndustrialMultiplier(national, "improved") * 100, {
          format: "percent",
          tone: sophisticationIndustrialMultiplier(national, "improved") < 1 ? "warning" : "positive",
          detail: "Sophistication share only; low literacy can reduce this further."
        }),
        statExplainRow("Advanced/Mega output retained", sophisticationIndustrialMultiplier(national, "advanced") * 100, {
          format: "percent",
          tone: sophisticationIndustrialMultiplier(national, "advanced") < 1 ? "warning" : "positive",
          detail: "Sophistication share only; low literacy can reduce this further."
        }),
        statExplainRow("Literacy", national.literacyRate, { format: "percent", tone: number(national.literacyRate, 95) < 95 ? "warning" : "positive" })
      ];
      return base;
    }
    if (dataset === "national" && key === "literacyRate") {
      const literacy = literacyRateForNational(national);
      base.value = literacy;
      base.valueFormat = "percent";
      base.summary = "Literacy is human capital. It does not directly add BC, but low literacy limits high-tier industry and broader literacy slows natural population growth over time.";
      base.formula = "High-tier industry reaches full retained output at 95% literacy. Population slowdown starts around 70% literacy and widens gradually toward 100%.";
      base.components = [
        statExplainRow("Literacy", literacy, { format: "percent", tone: literacy < LITERACY_NEUTRAL_RATE ? "warning" : "positive" }),
        statExplainRow("Improved/Large output retained", literacyIndustrialMultiplier(national, "improved") * 100, {
          format: "percent",
          tone: literacyIndustrialMultiplier(national, "improved") < 1 ? "warning" : "positive",
          detail: "Literacy share only; sophistication can reduce high-tier output too."
        }),
        statExplainRow("Advanced/Mega output retained", literacyIndustrialMultiplier(national, "advanced") * 100, {
          format: "percent",
          tone: literacyIndustrialMultiplier(national, "advanced") < 1 ? "warning" : "positive",
          detail: "Literacy share only; sophistication can reduce high-tier output too."
        }),
        statExplainRow("Yearly growth reduction", literacyPopulationGrowthSlowdown(national), {
          format: "yearlyPoints",
          tone: literacy > LITERACY_POPULATION_SLOWDOWN_START ? "warning" : "neutral",
          detail: "Subtracted from the annual natural population growth rate. Example: 2.00% growth becomes 1.58% before other effects."
        })
      ];
      return base;
    }
    return null;
  }

  function explainMilitaryStat(data, id, dataset, key, options = {}) {
    if (dataset !== "military" && !(dataset === "industrial" && key === "mobilizationLevel")) return null;
    const military = data.military?.[id] || {};
    const national = data.national?.[id] || {};
    const industrial = data.industrial?.[id] || {};
    const base = statExplainBase(data, id, dataset, key, { title: options.title });
    const mobilizationLevel = military.mobilizationLevel || industrial.mobilizationLevel || "None";
    const mobilization = MOBILIZATION[mobilizationLevel] || MOBILIZATION.None;
    const sectorOutput = industrialSectorOutputs(industrial, national);
    const militaryOutput = sectorOutput.military.effective;
    const complexity = number(military.equipmentComplexity, 4);
    const techLimit = maxComplexityForTechnology(national);
    const techGap = Math.max(0, complexity - techLimit);
    const techGapPenalty = Math.max(0.05, 1 - techGap * (0.95 / 11));
    const supplyGainPerYear = militaryOutput * 0.2 * 12
      * sophisticationSupplyMultiplier(national)
      * mobilization.supplyMultiplier
      * complexityMultiplier(complexity)
      * techGapPenalty
      * (1 + number(military.militaryOrganization, 0) * 0.01);

    if (key === "militarySupply") {
      base.value = military.militarySupply;
      base.valueFormat = "percent";
      base.summary = "Military supply is the readiness stockpile/output score. It grows over time from effective military factories, sophistication, mobilization, equipment complexity, tech limits, and organization.";
      base.formula = "Annual supply gain = military output x sophistication x mobilization x complexity x tech-gap penalty x organization boost.";
      base.components = [
        statExplainRow("Current supply", military.militarySupply, { format: "percent", tone: number(military.militarySupply, 0) >= 100 ? "positive" : "warning" }),
        statExplainRow("Projected yearly gain", supplyGainPerYear, { format: "number", tone: supplyGainPerYear > 0 ? "positive" : "neutral" }),
        statExplainRow("Effective military output", militaryOutput, { format: "number", tone: "positive" }),
        statExplainRow("Sophistication supply", sophisticationSupplyMultiplier(national), { format: "multiplier", tone: statToneForMultiplier(sophisticationSupplyMultiplier(national)) }),
        statExplainRow("Mobilization supply", mobilization.supplyMultiplier, { format: "multiplier", tone: statToneForMultiplier(mobilization.supplyMultiplier) }),
        statExplainRow("Complexity multiplier", complexityMultiplier(complexity), { format: "multiplier", tone: statToneForMultiplier(complexityMultiplier(complexity)) }),
        statExplainRow("Tech-gap penalty", techGapPenalty, { format: "multiplier", tone: techGapPenalty < 1 ? "negative" : "neutral" }),
        statExplainRow("Organization boost", 1 + number(military.militaryOrganization, 0) * 0.01, { format: "multiplier", tone: "positive" })
      ];
      return base;
    }

    if (key === "militaryOrganization") {
      base.value = military.militaryOrganization;
      base.valueFormat = "number";
      base.summary = "Organization is a military quality score. It boosts military supply growth and helps advanced military modernization.";
      base.formula = "Supply growth uses organization as a direct multiplier: 1 + organization / 100.";
      base.components = [
        statExplainRow("Organization", military.militaryOrganization, { format: "number", tone: number(military.militaryOrganization, 0) >= 50 ? "positive" : "warning" }),
        statExplainRow("Supply-growth boost", 1 + number(military.militaryOrganization, 0) * 0.01, { format: "multiplier", tone: "positive" }),
        statExplainRow("Advanced modernization input", number(military.militaryOrganization, 0) * 0.04, { format: "number", tone: "positive", detail: "Feeds yearly advanced military tier growth." })
      ];
      return base;
    }

    if (key === "equipmentComplexity") {
      base.value = complexity;
      base.valueFormat = "number";
      base.summary = "Equipment complexity represents how hard the force is to supply. Higher complexity can be powerful in lore, but it reduces supply growth unless the country's development can support it.";
      base.formula = "Supply growth uses a complexity multiplier and an additional tech-gap penalty if complexity exceeds the development-based tech limit.";
      base.components = [
        statExplainRow("Equipment complexity", complexity, { format: "number", tone: complexity > techLimit ? "warning" : "neutral" }),
        statExplainRow("Supported complexity", techLimit, { format: "number", tone: "positive" }),
        statExplainRow("Unsupported gap", techGap, { format: "number", tone: techGap > 0 ? "negative" : "neutral" }),
        statExplainRow("Complexity multiplier", complexityMultiplier(complexity), { format: "multiplier", tone: statToneForMultiplier(complexityMultiplier(complexity)) }),
        statExplainRow("Tech-gap penalty", techGapPenalty, { format: "multiplier", tone: techGapPenalty < 1 ? "negative" : "neutral" })
      ];
      return base;
    }

    if (key === "mobilizationLevel") {
      base.value = mobilizationLevel;
      base.valueFormat = "text";
      base.summary = "Mobilization changes military supply growth, civilian factory growth, military factory weighting, maintenance pressure, wartime BC, auto mobilization BE, and mobilization strain.";
      base.formula = "Higher mobilization unlocks wartime BC and military output but applies civilian and fiscal strain.";
      base.components = [
        statExplainRow("Mobilization", mobilizationLevel, { format: "text", tone: mobilizationLevel === "None" ? "neutral" : "warning" }),
        statExplainRow("Supply multiplier", mobilization.supplyMultiplier, { format: "multiplier", tone: statToneForMultiplier(mobilization.supplyMultiplier) }),
        statExplainRow("Military factory BC weight", mobilization.militaryFactoryMultiplier * 100, { format: "percent", tone: mobilization.militaryFactoryMultiplier >= 1 ? "positive" : "warning" }),
        statExplainRow("Civilian growth effect", mobilization.civilianPenalty * 100, { format: "signedPercent", tone: mobilization.civilianPenalty < 0 ? "negative" : "neutral" }),
        statExplainRow("Maintenance multiplier", mobilization.maintenanceCost, { format: "multiplier", tone: mobilization.maintenanceCost > 1 ? "negative" : "neutral" }),
        statExplainRow("Wartime BC bonus", national.wartimeBudgetBonus, { format: "number", tone: number(national.wartimeBudgetBonus, 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Mobilization strain", national.mobilizationStrain, { format: "percent", tone: number(national.mobilizationStrain, 0) > 0 ? "negative" : "neutral" })
      ];
      return base;
    }

    if (key === "cyberSecurity") {
      base.value = military.cyberSecurity;
      base.valueFormat = "number";
      base.summary = "Cyber security is a visible military/security capability score. It is tracked for player comparison and GM rulings, but it is not currently wired into fiscal, trade, or population formulas.";
      base.components = [
        statExplainRow("Cyber security", military.cyberSecurity, { format: "number", tone: number(military.cyberSecurity, 0) >= 10 ? "positive" : "neutral" }),
        statExplainRow("Formula impact", "No automatic economy effect", { format: "text" })
      ];
      return base;
    }

    if (["combatPersonnel", "supportPersonnel", "airForcePersonnel", "navalPersonnel", "reserveForces", "paramilitaryIrregular", "active"].includes(key)) {
      base.value = key === "active" ? activeMilitaryPersonnel(military) : military[key];
      base.valueFormat = "number";
      base.summary = "Personnel fields are force-structure records for display, comparison, and GM rulings. They do not currently feed BC, trade, or yearly population formulas automatically.";
      base.components = [
        statExplainRow("Combat personnel", military.combatPersonnel, { format: "number" }),
        statExplainRow("Support personnel", military.supportPersonnel, { format: "number" }),
        statExplainRow("Air force personnel", military.airForcePersonnel, { format: "number" }),
        statExplainRow("Naval personnel", military.navalPersonnel, { format: "number" }),
        statExplainRow("Reserve forces", military.reserveForces, { format: "number" }),
        statExplainRow("Paramilitary", military.paramilitaryIrregular, { format: "number" }),
        statExplainRow("Active total", activeMilitaryPersonnel(military), { format: "number", tone: "positive" })
      ];
      return base;
    }

    return null;
  }

  function explainPopulationStat(data, id, dataset, key, options = {}) {
    if (dataset !== "population") return null;
    const population = data.population?.[id] || {};
    const national = data.national?.[id] || {};
    const base = statExplainBase(data, id, dataset, key, { title: options.title });
    const currentYearKey = currentPopulationKey(data);
    const currentPopulation = getPopulation(data, id);
    const policy = population.mandatoryChildPolicy || "No Policy";
    if (/^\d+$/.test(String(key))) {
      base.value = population.values?.[key];
      base.valueFormat = "number";
      base.summary = "Population history feeds market size, tax revenue, trade demand, mobilization finance, and yearly demographic simulation.";
      base.formula = "Yearly population growth combines demographic maturity, economic health, stability, policy, tax stress, unrest, corruption, literacy slowdown, immigration, and urban strain.";
      base.components = [
        statExplainRow("Current population", currentPopulation, { format: "number", tone: "positive" }),
        statExplainRow("Displayed year", String(key), { format: "text" }),
        statExplainRow("Current year", currentYearKey, { format: "text" }),
        statExplainRow("Child policy", policy, { format: "text" }),
        statExplainRow("Policy growth effect", CHILD_POLICY_POPULATION_EFFECT[policy] || 0, { format: "yearlyPoints", tone: (CHILD_POLICY_POPULATION_EFFECT[policy] || 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Literacy growth reduction", literacyPopulationGrowthSlowdown(national), { format: "negativeYearlyPoints", tone: literacyPopulationGrowthSlowdown(national) > 0 ? "warning" : "neutral" }),
        statExplainRow("Immigration input", national.immigrationRate, { format: "number" })
      ];
      return base;
    }
    if (key === "mandatoryChildPolicy") {
      base.value = policy;
      base.valueFormat = "text";
      base.summary = "Child policy is a GM-facing demographic policy. It adds to natural population growth before maturity and other stress effects dampen the result.";
      base.formula = "Policy effect is added to annual natural growth, then reduced by demographic maturity and other penalties.";
      base.components = [
        statExplainRow("Child policy", policy, { format: "text" }),
        statExplainRow("Base policy effect", CHILD_POLICY_POPULATION_EFFECT[policy] || 0, { format: "yearlyPoints", tone: (CHILD_POLICY_POPULATION_EFFECT[policy] || 0) > 0 ? "positive" : "neutral" }),
        statExplainRow("Economic health", national.economicHealth || "Recovery", { format: "text" }),
        statExplainRow("Stability", national.governmentalStability, { format: "percent" }),
        statExplainRow("Public unrest", national.publicUnrest, { format: "number", tone: number(national.publicUnrest, 0) > 0 ? "warning" : "neutral" })
      ];
      return base;
    }
    return null;
  }

  function explainIntelligenceStat(data, id, dataset, key, options = {}) {
    if (dataset !== "intelligence") return null;
    const intelligence = data.intelligence?.[id] || {};
    const base = statExplainBase(data, id, dataset, key, { title: options.title });
    base.value = intelligence[key];
    base.valueFormat = "number";
    base.summary = "Intelligence stats are capability scores for player comparison and GM adjudication. They are not currently wired into BC, trade, population, debt, or yearly growth formulas.";
    base.formula = "No automatic economy formula uses this intelligence field yet.";
    base.components = [
      statExplainRow("HUMINT", intelligence.humint, { format: "number" }),
      statExplainRow("SIGINT", intelligence.sigint, { format: "number" }),
      statExplainRow("Counterintelligence", intelligence.counterintelligence, { format: "number" }),
      statExplainRow("Covert action", intelligence.covertAction, { format: "number" }),
      statExplainRow("Analysis & doctrine", intelligence.analysisDoctrine, { format: "number" }),
      statExplainRow("Global reach", intelligence.globalReach, { format: "number" }),
      statExplainRow("Internal surveillance", intelligence.internalSurveillance, { format: "number" }),
      statExplainRow("Secrecy & denial", intelligence.secrecyDenial, { format: "number" }),
      statExplainRow("Formula impact", "GM/adjudication only right now", { format: "text" })
    ];
    return base;
  }

  function explainCivicScheduleStat(data, id, dataset, key, options = {}) {
    if (!["eclipse", "elections"].includes(dataset)) return null;
    const row = data[dataset]?.[id] || {};
    const base = statExplainBase(data, id, dataset, key, { title: options.title });
    base.value = row[key];
    base.valueFormat = "text";
    base.summary = dataset === "eclipse"
      ? "Eclipse status is a civic/status record. It is visible for tracking but does not currently feed economy or yearly simulation formulas."
      : "Election fields are schedule records. They are visible for tracking but do not currently feed economy or yearly simulation formulas.";
    base.formula = "Recordkeeping only unless a GM applies separate effects.";
    base.components = [
      statExplainRow(statHumanLabel(key), row[key] || "Unknown", { format: "text" }),
      statExplainRow("Formula impact", "No automatic economy effect", { format: "text" })
    ];
    return base;
  }

  function explainStat(data, id, dataset, key, options = {}) {
    const admin = options.admin === true;
    const normalizedDataset = String(dataset || "");
    const normalizedKey = String(key || "");
    const specialized =
      (normalizedDataset === "national" && explainFiscalStat(data, id, normalizedKey, options))
      || (normalizedDataset === "national" && explainGovernanceStat(data, id, normalizedKey, options))
      || (normalizedDataset === "national" && explainNationalDriverStat(data, id, normalizedKey, options))
      || (normalizedDataset === "trade" && explainTradeStat(data, id, normalizedKey, options))
      || (normalizedDataset === "national" && explainDevelopmentStat(data, id, normalizedKey, options))
      || explainIndustryStat(data, id, normalizedDataset, normalizedKey, options)
      || explainMilitaryStat(data, id, normalizedDataset, normalizedKey, options)
      || explainPopulationStat(data, id, normalizedDataset, normalizedKey, options)
      || explainIntelligenceStat(data, id, normalizedDataset, normalizedKey, options)
      || explainCivicScheduleStat(data, id, normalizedDataset, normalizedKey, options);
    if (specialized) {
      specialized.components = publicStatRows(specialized.components || [], admin);
      specialized.hidden = publicStatRows(specialized.hidden || [], admin);
      specialized.warnings = publicStatRows(specialized.warnings || [], admin);
      return specialized;
    }

    const base = statExplainBase(data, id, normalizedDataset, normalizedKey, options);
    if (normalizedDataset === "military" && normalizedKey === "militarySupply") {
      const national = data.national?.[id] || {};
      base.summary = "Military supply is a visible readiness/output stat. Yearly growth is affected by mobilization, sophistication, literacy, and industrial depth.";
      base.components = [
        statExplainRow("Military supply", base.value, { format: "percent" }),
        statExplainRow("Industrial sophistication", national.industrialSophistication, { format: "percent" }),
        statExplainRow("Literacy", national.literacyRate, { format: "percent" })
      ];
    }
    return base;
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
    ensureState(data);
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
    const developmentScale = componentProfileScore(national, {
      urbanizationRate: 0.03,
      urbanDevelopment: 0.07,
      ruralDevelopment: 0.12,
      infrastructureLevel: 0.5,
      livingStandard: 0.28
    });
    const stabilityScale = clamp(number(national.governmentalStability, 70) / 100, 0, 1.2);
    const governance = governanceMetrics(national);
    const urbanStrain = urbanStrainMetrics(national);
    const corruptionDrag = clamp(governance.stateCapacityCorruption / 160, 0, 0.55);
    const bureaucracyScale = governance.efficiencyMultiplier;
    const healthSignal = HEALTH_GROWTH[healthStatus] * yearsAdvanced;
    const positiveScale = (1 + industrialScale / 28 + developmentScale / 55 + stabilityScale * 0.22 - corruptionDrag - urbanStrain.urbanStructuralStrain / 260) * bureaucracyScale;
    const negativeScale = (1 + industrialScale / 45 + corruptionDrag * 0.45 + urbanStrain.urbanStructuralStrain / 220 + clamp((65 - number(national.governmentalStability, 70)) / 120, 0, 0.35)) * governance.bureaucracyPressure;
    const impactFromHealth = healthSignal >= 0
      ? healthSignal * positiveScale * healthMomentum
      : healthSignal * negativeScale * healthMomentum;
    const economicImpactScore = number(trade.economicImpactScore, 50);
    const tariffRate = number(trade.tariffRate, 5);
    const tradeVolatility = (tariffRate - 5) * 0.5;
    const importReliance = number(trade.importReliance, 0);
    const minimumImports = Math.max(currentFactories * 0.5 + 5, 5);
    const importDependencyPenalty = Math.max(0, importReliance - minimumImports) * 0.05;
    const developmentImportRatio = developmentScale / Math.max(importReliance, 1);
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
    const techGap = Math.max(0, number(military.equipmentComplexity, 4) - maxComplexityForTechnology(national));
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
      national.temporaryBudgetExpenditure = temporaryBudgetExpenditureTotal(national);
      national.effectiveBudgetExpenditure = roundCurrency(number(national.budgetExpenditure, 0) + national.temporaryBudgetExpenditure);
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
    ensureState(data);
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
      for (const nation of activeNations) advanceTemporaryBudgetExpenditures(data, nation.id, 1);
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
    if (dataset === "national") {
      const row = data.national[id];
      if (path === "industrialSophistication") {
        if (isBlank(row.industrialSophisticationBaseline)) row.industrialSophisticationBaseline = clamp(number(row.industrialSophistication, 0), 0, 100);
      }
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
    componentScoreFromComponents,
    urbanStrainMetrics,
    fiscalModelForNation,
    temporaryBudgetExpenditureItems,
    temporaryBudgetExpenditureTotal,
    addTemporaryBudgetExpenditure,
    removeTemporaryBudgetExpenditure,
    calculateTaxBurdenForNation,
    calculateTariffBurdenForNation,
    calculateTariffRevenueForNation,
    calculateBudgetBreakdownForNation,
    calculateBudgetForNation,
    wartimeBudgetBonus,
    displayBudgetCapacity,
    calculateFiscalForNation,
    calculateAnnualDebtUpdate,
    explainStat,
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
    advanceTemporaryBudgetExpenditures,
    advanceToYear,
    updateValue,
    snapshot,
    exportDataJs,
    constants: { HEALTH_GROWTH, HEALTH_DEMOGRAPHICS, HEALTH_BUDGET, HEALTH_TRADE, CHILD_POLICY, CHILD_POLICY_POPULATION_EFFECT, MOBILIZATION, TRADE_POLICY, SANCTIONS, DEBT_RULES, BUDGET_FORMULAS, TARIFF_FORMULAS, POPULATION_FORMULAS, FISCAL_MODELS, TARIFF_POLICY_LIMITS, INDUSTRIAL_SECTOR_WEIGHTS, WIKI_CATEGORIES, WIKI_STATUSES, WIKI_FACT_TEMPLATES }
  };
})();
