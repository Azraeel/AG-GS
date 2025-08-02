let previousData = {}; // Declare globally to share across functions

// Define mobilization impact levels
const mobilizationImpact = {
  "None": {
    militaryGrowthMultiplier: 0.25,    // Base peacetime growth for military factories
    civilianPenalty: 0,                 // No penalty to civilian production
    militaryFactoryMultiplier: 0.4,     // Base peacetime economic contribution
    maintenanceCost: 1.0                // Base maintenance cost
  },
  "Partial": {
    militaryGrowthMultiplier: 0.5,      // Doubled military factory growth
    civilianPenalty: -0.2,              // 20% reduction in civilian factory growth
    militaryFactoryMultiplier: 0.6,     // Increased economic contribution
    maintenanceCost: 1.5                // 50% increased maintenance
  },
  "Full": {
    militaryGrowthMultiplier: 1.0,      // Military factories grow at full rate
    civilianPenalty: -0.4,              // 40% reduction in civilian factory growth
    militaryFactoryMultiplier: 0.8,     // High economic contribution
    maintenanceCost: 2.0                // Double maintenance cost
  },
  "Total": {
    militaryGrowthMultiplier: 1.5,      // Military factories grow 50% faster than civilian
    civilianPenalty: -0.6,              // 60% reduction in civilian factory growth
    militaryFactoryMultiplier: 1.0,     // Full economic contribution
    maintenanceCost: 3.0                // Triple maintenance cost
  }
};

function onEdit(e) {
  // ULTRA OPTIMIZATION: Cache all sheet references once
  const sheets = {
    industrial: getSheetCached("Industrial Status"),
    economic: getSheetCached("National Status"),
    trade: getSheetCached("Trade Status"),
    world: getSheetCached("World Status Tracker"),
    military: getSheetCached("Military Status")
  };

  // Define the cell that holds the Year in World Status Tracker (C6)
  const yearCell = sheets.world.getRange("C6");

  // Check if the edited cell is the year cell
  if (e.range.getA1Notation() === yearCell.getA1Notation()) {
    const newYear = parseInt(e.value, 10);
    const oldYear = parseInt(e.oldValue, 10);

    // Ensure the year is a valid number and that oldYear is defined
    if (isNaN(newYear) || newYear <= 0 || isNaN(oldYear)) {
      SpreadsheetApp.getUi().alert("Please enter a valid year.");
      return;
    }

    // Calculate the difference in years
    const yearDifference = newYear - oldYear;
    if (yearDifference <= 0) return; // Only proceed if the year has advanced

    // ULTRA OPTIMIZATION: Cache all column indices once
    const HEADER_ROW = 4;
    const columns = {
      industrial: {
        nation: getColumnIndexCached(sheets.industrial, "Nation", HEADER_ROW),
        factories: getColumnIndexCached(sheets.industrial, "Civilian Factories", HEADER_ROW),
        military: getColumnIndexCached(sheets.industrial, "Military Factories", HEADER_ROW),
        shipyards: getColumnIndexCached(sheets.industrial, "Shipyards", HEADER_ROW)
      },
      economic: {
        nation: getColumnIndexCached(sheets.economic, "Nation", HEADER_ROW),
        health: getColumnIndexCached(sheets.economic, "Economic Health", HEADER_ROW),
        development: getColumnIndexCached(sheets.economic, "Development Level", HEADER_ROW)
      },
      trade: {
        nation: getColumnIndexCached(sheets.trade, "Nation", HEADER_ROW),
        balance: getColumnIndexCached(sheets.trade, "Trade Balance", HEADER_ROW)
      },
      military: {
        nation: getColumnIndexCached(sheets.military, "Nation", HEADER_ROW),
        mobilization: getColumnIndexCached(sheets.military, "Mobilization Level", HEADER_ROW)
      }
    };

    // ULTRA OPTIMIZATION: Build row maps once
    const rowMaps = {
      industrial: buildRowMapCached(sheets.industrial, columns.industrial.nation),
      economic: buildRowMapCached(sheets.economic, columns.economic.nation),
      trade: buildRowMapCached(sheets.trade, columns.trade.nation),
      military: buildRowMapCached(sheets.military, columns.military.nation)
    };

    const names = Object.keys(rowMaps.industrial);

    // ULTRA OPTIMIZATION: Try to add enhanced trade columns
    try {
      columns.trade.economicImpact = getColumnIndexCached(sheets.trade, "Economic Impact Score", HEADER_ROW);
      columns.trade.tariffRate = getColumnIndexCached(sheets.trade, "Tariff Rate", HEADER_ROW);
      columns.trade.importReliance = getColumnIndexCached(sheets.trade, "Import Reliance", HEADER_ROW);
      columns.trade.exportReliance = getColumnIndexCached(sheets.trade, "Export Reliance", HEADER_ROW);
    } catch (e) {
      // Enhanced columns don't exist yet
    }

    // ULTRA OPTIMIZATION: Batch read ALL data once
    const allData = {
      industrial: getBatchDataByNames(sheets.industrial, rowMaps.industrial, names,
        [columns.industrial.factories, columns.industrial.military, columns.industrial.shipyards]),
      economic: getBatchDataByNames(sheets.economic, rowMaps.economic, names,
        [columns.economic.health, columns.economic.development]),
      trade: getBatchDataByNames(sheets.trade, rowMaps.trade, names,
        columns.trade.economicImpact ?
          [columns.trade.balance, columns.trade.economicImpact, columns.trade.tariffRate, columns.trade.importReliance, columns.trade.exportReliance] :
          [columns.trade.balance]),
      military: getBatchDataByNames(sheets.military, rowMaps.military, names, columns.military.mobilization)
    };

    // Define hard values for each Economic Health status
    const healthImpact = {
      "Depression": -3,
      "Recession": -2,
      "Slowdown": -1,
      "Recovery": 1,
      "Expansion": 2,
      "Prosperity": 3
    };

    // ULTRA OPTIMIZATION: Process civilian factories using cached data
    const updatedIndustrial = names.map((nation) => {
      const industrialData = allData.industrial[nation] || {};
      const economicData = allData.economic[nation] || {};
      const tradeData = allData.trade[nation] || {};
      const militaryData = allData.military[nation];

      const currentFactories = parseFloat(industrialData[columns.industrial.factories]) || 0;
      const currentMilitaryFactories = parseFloat(industrialData[columns.industrial.military]) || 0;
      const currentShipyards = parseFloat(industrialData[columns.industrial.shipyards]) || 0;
      const healthStatus = economicData[columns.economic.health] || "Recovery";
      const tradeBalance = parseFloat(tradeData[columns.trade.balance]) || 0;
      const mobilizationLevel = militaryData || "None";
      const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentFactories];
      }

      const impactFromHealth = healthImpact[healthStatus] * yearDifference;
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;

      // Use cached enhanced trade data
      const economicImpactScore = columns.trade.economicImpact ? (parseFloat(tradeData[columns.trade.economicImpact]) || 50) : 50;
      const tariffRate = columns.trade.tariffRate ? (parseFloat(tradeData[columns.trade.tariffRate]?.toString().replace('%', '')) || 5) : 5;
      const tradeVolatility = (tariffRate - 5) * 0.5;
      const importReliance = columns.trade.importReliance ? (parseFloat(tradeData[columns.trade.importReliance]) || 0) : 0;
      const exportReliance = columns.trade.exportReliance ? (parseFloat(tradeData[columns.trade.exportReliance]) || 0) : 0;

      // Calculate minimum imports needed
      const minimumImports = Math.max(
        (currentFactories * 0.5) + 5, // Industrial needs + base
        5
      );

      // Calculate import dependency penalty for industrial growth
      const excessImports = Math.max(0, importReliance - minimumImports);
      const importDependencyPenalty = excessImports * 0.05; // 5% penalty per excess import point

      // High imports with low development hurt industrial growth
      const developmentLevel = parseFloat(economicData[columns.economic.development]) || 0;
      const developmentImportRatio = developmentLevel / Math.max(importReliance, 1);
      const industrialGrowthModifier = Math.min(1.5, Math.max(0.5, developmentImportRatio * 0.1));

      // More realistic trade impact calculation
      const tradeImpactBase = tradeBalance / 1000; // Base impact per 1000 trade balance
      const economicImpactMultiplier = economicImpactScore / 50; // Scale by economic impact score
      const volatilityPenalty = Math.abs(tradeVolatility) * 0.1; // Volatility reduces growth
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 150)); // Less diminishing returns

      let impactFromTradeBalance = (tradeImpactBase * economicImpactMultiplier * tradeImpactScaling * industrialGrowthModifier) - volatilityPenalty - importDependencyPenalty;

      // Negative trade balance should hurt growth more significantly
      if (tradeBalance < 0) {
        impactFromTradeBalance *= 1.5; // Negative trade balance has 50% more impact
      }

      // Cap the impact to prevent extreme values
      impactFromTradeBalance = Math.max(Math.min(impactFromTradeBalance, 5), -3);

      // Calculate base growth
      const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
      
      // Apply mobilization effects to growth
      const civilianGrowth = baseGrowth * (1 + mobilization.civilianPenalty);
      const militaryGrowth = baseGrowth * mobilization.militaryGrowthMultiplier;
      const shipyardGrowth = Math.floor(baseGrowth / 3); // Shipyards maintain standard growth rate

      // Calculate new values
      const newFactories = Math.max(currentFactories + Math.floor(civilianGrowth), 0);
      const newMilitaryFactories = Math.max(currentMilitaryFactories + Math.floor(militaryGrowth), 0);
      const newShipyards = Math.max(currentShipyards + shipyardGrowth, 0);

      return [newFactories];
    });

    // ULTRA OPTIMIZATION: Process military factories using cached data
    const updatedMilitary = names.map((nation) => {
      const industrialData = allData.industrial[nation] || {};
      const economicData = allData.economic[nation] || {};
      const tradeData = allData.trade[nation] || {};
      const militaryData = allData.military[nation];

      const currentFactories = parseFloat(industrialData[columns.industrial.factories]) || 0;
      const currentMilitaryFactories = parseFloat(industrialData[columns.industrial.military]) || 0;
      const currentShipyards = parseFloat(industrialData[columns.industrial.shipyards]) || 0;
      const healthStatus = economicData[columns.economic.health] || "Recovery";
      const tradeBalance = parseFloat(tradeData[columns.trade.balance]) || 0;
      const mobilizationLevel = militaryData || "None";
      const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentMilitaryFactories];
      }

      const impactFromHealth = healthImpact[healthStatus] * yearDifference;
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;

      // Use cached enhanced trade data
      const economicImpactScore = columns.trade.economicImpact ? (parseFloat(tradeData[columns.trade.economicImpact]) || 50) : 50;
      const tariffRate = columns.trade.tariffRate ? (parseFloat(tradeData[columns.trade.tariffRate]?.toString().replace('%', '')) || 5) : 5;
      const tradeVolatility = (tariffRate - 5) * 0.5;

      const tradeImpactBase = tradeBalance / 1000;
      const economicImpactMultiplier = economicImpactScore / 50;
      const volatilityPenalty = Math.abs(tradeVolatility) * 0.1;
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 150));

      let impactFromTradeBalance = tradeImpactBase * economicImpactMultiplier * tradeImpactScaling - volatilityPenalty;

      if (tradeBalance < 0) {
        impactFromTradeBalance *= 1.5;
      }

      impactFromTradeBalance = Math.max(Math.min(impactFromTradeBalance, 5), -3);
      const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
      const militaryGrowth = baseGrowth * mobilization.militaryGrowthMultiplier;

      return [Math.max(currentMilitaryFactories + Math.floor(militaryGrowth), 0)];
    });

    // ULTRA OPTIMIZATION: Process shipyards using cached data
    const updatedShipyards = names.map((nation) => {
      const industrialData = allData.industrial[nation] || {};
      const economicData = allData.economic[nation] || {};
      const tradeData = allData.trade[nation] || {};

      const currentFactories = parseFloat(industrialData[columns.industrial.factories]) || 0;
      const currentMilitaryFactories = parseFloat(industrialData[columns.industrial.military]) || 0;
      const currentShipyards = parseFloat(industrialData[columns.industrial.shipyards]) || 0;
      const healthStatus = economicData[columns.economic.health] || "Recovery";
      const tradeBalance = parseFloat(tradeData[columns.trade.balance]) || 0;

      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentShipyards];
      }

      const impactFromHealth = healthImpact[healthStatus] * yearDifference;
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;

      // Use cached enhanced trade data
      const economicImpactScore = columns.trade.economicImpact ? (parseFloat(tradeData[columns.trade.economicImpact]) || 50) : 50;
      const tariffRate = columns.trade.tariffRate ? (parseFloat(tradeData[columns.trade.tariffRate]?.toString().replace('%', '')) || 5) : 5;
      const tradeVolatility = (tariffRate - 5) * 0.5;

      const tradeImpactBase = tradeBalance / 1000;
      const economicImpactMultiplier = economicImpactScore / 50;
      const volatilityPenalty = Math.abs(tradeVolatility) * 0.1;
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 150));

      let impactFromTradeBalance = tradeImpactBase * economicImpactMultiplier * tradeImpactScaling - volatilityPenalty;

      if (tradeBalance < 0) {
        impactFromTradeBalance *= 1.5;
      }

      impactFromTradeBalance = Math.max(Math.min(impactFromTradeBalance, 5), -3);
      const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
      const shipyardGrowth = Math.floor(baseGrowth / 3);

      return [Math.max(currentShipyards + shipyardGrowth, 0)];
    });
    
    // ULTRA OPTIMIZATION: Write industrial data using cached references
    names.forEach((nation, idx) => {
      const iRow = rowMaps.industrial[nation];
      if (iRow != null) {
        sheets.industrial.getRange(iRow, columns.industrial.factories).setValue(updatedIndustrial[idx][0]);
        sheets.industrial.getRange(iRow, columns.industrial.military).setValue(updatedMilitary[idx][0]);
        sheets.industrial.getRange(iRow, columns.industrial.shipyards).setValue(updatedShipyards[idx][0]);
      }
    });

    // Call calculateBudget after updating industrial values
    calculateBudget();
  }


}

function calculateBudget() {
  // ULTRA OPTIMIZATION: Use cached sheet references and column indices
  const sheets = {
    industrial: getSheetCached("Industrial Status"),
    national: getSheetCached("National Status"),
    population: getSheetCached("Population Tracker"),
    military: getSheetCached("Military Status"),
    trade: getSheetCached("Trade Status")
  };

  const HEADER_ROW = 4;
  const columns = {
    industrial: {
      nation: getColumnIndexCached(sheets.industrial, "Nation", HEADER_ROW),
      factories: getColumnIndexCached(sheets.industrial, "Civilian Factories", HEADER_ROW),
      military: getColumnIndexCached(sheets.industrial, "Military Factories", HEADER_ROW),
      shipyards: getColumnIndexCached(sheets.industrial, "Shipyards", HEADER_ROW)
    },
    national: {
      nation: getColumnIndexCached(sheets.national, "Nation", HEADER_ROW),
      budgetCapacity: getColumnIndexCached(sheets.national, "Budget Capacity", HEADER_ROW),
      budgetBalance: getColumnIndexCached(sheets.national, "Budget Balance", HEADER_ROW),
      developmentLevel: getColumnIndexCached(sheets.national, "Development Level", HEADER_ROW),
      corruption: getColumnIndexCached(sheets.national, "Corruption", HEADER_ROW),
      economicHealth: getColumnIndexCached(sheets.national, "Economic Health", HEADER_ROW),
      taxRate: getColumnIndexCached(sheets.national, "Tax Rate", HEADER_ROW)
    },
    population: {
      nation: getColumnIndexCached(sheets.population, "Nation", HEADER_ROW),
      population: getColumnIndexCached(sheets.population, "Population", HEADER_ROW)
    },
    military: {
      nation: getColumnIndexCached(sheets.military, "Nation", HEADER_ROW),
      mobilization: getColumnIndexCached(sheets.military, "Mobilization Level", HEADER_ROW)
    },
    trade: {
      nation: getColumnIndexCached(sheets.trade, "Nation", HEADER_ROW),
      balance: getColumnIndexCached(sheets.trade, "Trade Balance", HEADER_ROW)
    }
  };

  const rowMaps = {
    industrial: buildRowMapCached(sheets.industrial, columns.industrial.nation),
    national: buildRowMapCached(sheets.national, columns.national.nation),
    population: buildRowMapCached(sheets.population, columns.population.nation),
    military: buildRowMapCached(sheets.military, columns.military.nation),
    trade: buildRowMapCached(sheets.trade, columns.trade.nation)
  };

  const names = Object.keys(rowMaps.industrial);

  // Try to add enhanced trade columns
  try {
    columns.trade.economicImpact = getColumnIndexCached(sheets.trade, "Economic Impact Score", HEADER_ROW);
    columns.trade.tariffRate = getColumnIndexCached(sheets.trade, "Tariff Rate", HEADER_ROW);
  } catch (e) {
    // Enhanced columns don't exist yet
  }

  // ULTRA OPTIMIZATION: Batch read ALL budget data once
  const allBudgetData = {
    industrial: getBatchDataByNames(sheets.industrial, rowMaps.industrial, names,
      [columns.industrial.factories, columns.industrial.military, columns.industrial.shipyards]),
    national: getBatchDataByNames(sheets.national, rowMaps.national, names,
      [columns.national.budgetCapacity, columns.national.budgetBalance, columns.national.developmentLevel,
       columns.national.corruption, columns.national.economicHealth, columns.national.taxRate]),
    population: getBatchDataByNames(sheets.population, rowMaps.population, names, columns.population.population),
    military: getBatchDataByNames(sheets.military, rowMaps.military, names, columns.military.mobilization),
    trade: getBatchDataByNames(sheets.trade, rowMaps.trade, names,
      columns.trade.economicImpact ?
        [columns.trade.balance, columns.trade.economicImpact, columns.trade.tariffRate] :
        [columns.trade.balance])
  };

  // Constants
  const baseBudget = 10;
  const baseContributionRate = 5;
  const scalingFactor = 0.75;
  const diminishingFactor = 0.0025;
  const shipyardMultiplier = 1.5; // Shipyards contribute 50% more than factories
  const militaryFactoryMultiplier = 0.4; // Military factories contribute 40% of civilian factories
  const baseMaintenanceCost = 0.1; // Base maintenance cost per factory

  // Economic Health multipliers
  const economicHealthImpact = {
    "Prosperity": 1.1,
    "Expansion": 1.05,
    "Recovery": 1.0,
    "Slowdown": 0.9,
    "Recession": 0.8,
    "Depression": 0.6,
  };

  // ULTRA OPTIMIZATION: Process budget calculations using cached data
  const updatedBudgets = names.map((nation, index) => {
    const industrialData = allBudgetData.industrial[nation] || {};
    const nationalData = allBudgetData.national[nation] || {};
    const populationData = allBudgetData.population[nation];
    const militaryData = allBudgetData.military[nation];
    const tradeData = allBudgetData.trade[nation] || {};

    const civFactories = parseFloat(industrialData[columns.industrial.factories]) || 0;
    const militaryFactories = parseFloat(industrialData[columns.industrial.military]) || 0;
    const shipyards = parseFloat(industrialData[columns.industrial.shipyards]) || 0;
    const developmentLevel = parseFloat(nationalData[columns.national.developmentLevel]) || 0;
    const population = parseFloat(populationData) || 0;
    const corruption = parseFloat(nationalData[columns.national.corruption]) || 0;
    const economicHealth = nationalData[columns.national.economicHealth] || "Recovery";
    const taxRate = parseFloat(nationalData[columns.national.taxRate]) || 0;
    const mobilizationLevel = militaryData || "None";
    const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

    // Ensure values are valid numbers
    const validCivFactories = !isNaN(civFactories) ? civFactories : 0;
    const validMilitaryFactories = !isNaN(militaryFactories) ? militaryFactories : 0;
    const validShipyards = !isNaN(shipyards) ? shipyards : 0;
    const validDevelopmentLevel = !isNaN(developmentLevel) ? developmentLevel : 0;
    const validPopulation = !isNaN(population) ? population : 0;
    const validTaxRate = !isNaN(taxRate) ? taxRate : 0;
    const validCorruption = !isNaN(corruption) ? corruption : 0;
    const validEconomicHealthMultiplier = economicHealthImpact[economicHealth] || 1.0;

    // Calculate effective contribution rate based on development level
    const effectiveContributionRate = baseContributionRate + (validDevelopmentLevel * scalingFactor);

    // Calculate development multiplier
    const developmentMultiplier = 1 + (validDevelopmentLevel * 0.25);

    // Calculate industrial contribution with mobilization effects
    const industrialContribution = (
      (validCivFactories * effectiveContributionRate) + 
      (validMilitaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) +
      (validShipyards * effectiveContributionRate * shipyardMultiplier)
    ) / (1 + (validCivFactories + validMilitaryFactories + validShipyards) * diminishingFactor) * developmentMultiplier;

    // Calculate population-based tax contribution with correct scaling
    const developmentImpact = Math.pow(validDevelopmentLevel / 10, 3) * (1 + validDevelopmentLevel / 20);
    const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));

    // CORRECTED: Calculate population contribution (EXACT Trade Automater logic)
    const populationContribution =
      (Math.log(validPopulation) + validPopulation / 250000) *
      taxRateScalingFactor *
      developmentImpact *
      ((100 - validCorruption) / 100) *
      validEconomicHealthMultiplier;

    // CORRECTED: Calculate maintenance costs with mobilization effects
    const maintenanceCost = (
      (validCivFactories + validShipyards + (validMilitaryFactories * mobilization.maintenanceCost)) *
      baseMaintenanceCost
    );

    // CORRECTED: Calculate base budget before trade impact
    const baseBudgetTotal = baseBudget + industrialContribution + populationContribution - maintenanceCost;

    // CORRECTED: Apply trade impact using EXACT Trade Automater logic
    const tradeBalance = parseFloat(tradeData[columns.trade.balance]) || 0;
    let tradeImpactOnBudget = 1.0;
    const tradeToGDPRatio = tradeBalance / Math.max(baseBudgetTotal, 100);
    tradeImpactOnBudget = 1 + (tradeToGDPRatio * 0.1); // CORRECTED: 10% not 50%
    tradeImpactOnBudget = Math.max(0.1, Math.min(2.0, tradeImpactOnBudget)); // CORRECTED: 10% not 50%

    // CORRECTED: Calculate final budget with trade impact
    const totalBudget = Math.round(baseBudgetTotal * tradeImpactOnBudget);

    // Store the previous capacity and balance for use in updateDebt using cached data
    const currentCapacity = parseFloat(nationalData[columns.national.budgetCapacity]) || 0;
    const currentBalance = parseFloat(nationalData[columns.national.budgetBalance]) || 0;

    previousData[nation] = {
      previousCapacity: currentCapacity,
      previousBalance: currentBalance,
      currentBudget: totalBudget
    };

    return [totalBudget];
  });

  // ULTRA OPTIMIZATION: Set the updated budget capacities using cached references
  names.forEach((nation, idx) => {
    const nRow = rowMaps.national[nation];
    if (nRow != null) {
      sheets.national.getRange(nRow, columns.national.budgetCapacity).setValue(updatedBudgets[idx][0]);
    }
  });

  // Run UpdateDebt After calculateBudget
  updateDebt(previousData);

  // Economic health is manually controlled - no automatic updates from trade
}



function updateDebt(previousData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(sheet, "Nation", HEADER_ROW);
  const budgetCapacityColumn = getColumnIndex(sheet, "Budget Capacity", HEADER_ROW);
  const budgetBalanceColumn = getColumnIndex(sheet, "Budget Balance", HEADER_ROW);
  const debtColumn = getColumnIndex(sheet, "Debt", HEADER_ROW);
  const rowMap = buildRowMap(sheet, nameColumn);
  const names = Object.keys(rowMap);

  const budgetCapacities = names.map(n => [sheet.getRange(rowMap[n], budgetCapacityColumn).getValue()]);
  const budgetBalances = names.map(n => [sheet.getRange(rowMap[n], budgetBalanceColumn).getValue()]);
  const currentDebts = names.map(n => [sheet.getRange(rowMap[n], debtColumn).getValue()]);

  const updatedDebts = budgetCapacities.map((capacityRow, index) => {
    const budgetCapacity = parseFloat(capacityRow[0]) || 0;
    const budgetBalance = parseFloat(budgetBalances[index][0]) || 0;
    let currentDebtPercent = parseFloat(currentDebts[index][0]) || 0;
    const nation = names[index];
    const prev = previousData[nation] || {};
    const previousCapacity = prev.previousCapacity ?? budgetCapacity;
    const previousBalance = parseFloat(prev.previousBalance || 0);

    if (typeof currentDebts[index][0] === "string" && currentDebts[index][0].includes("%")) {
      currentDebtPercent = parseFloat(currentDebts[index][0].replace('%', '')) || 0;
    } else {
      currentDebtPercent = currentDebtPercent * 100;
    }

    let absoluteDebt = (currentDebtPercent / 100) * previousCapacity;

    if (previousBalance < 0) {
      absoluteDebt += Math.abs(previousBalance);
    } else {
      absoluteDebt = Math.max(absoluteDebt - previousBalance, 0);
    }

    const newDebtPercent = (absoluteDebt / budgetCapacity) * 100;

    return [`${newDebtPercent.toFixed(2)}%`];
  });

  names.forEach((nation, idx) => {
    const row = rowMap[nation];
    sheet.getRange(row, debtColumn).setValue(updatedDebts[idx][0]);
  });
}
