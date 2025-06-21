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
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const economicSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");  
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const worldstatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
  
  // Define the cell that holds the Year in World Status Tracker (C6)
  const yearCell = worldstatusSheet.getRange("C6");
  
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
    
    const HEADER_ROW = 4;
    const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
    const economicNameColumn = getColumnIndex(economicSheet, "Nation", HEADER_ROW);
    const tradeNameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
    const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
    const militaryNameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);

    const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);
    const economicRowMap = buildRowMap(economicSheet, economicNameColumn);
    const tradeRowMap = buildRowMap(tradeSheet, tradeNameColumn);
    const militaryRowMap = buildRowMap(militarySheet, militaryNameColumn);

    const factoryColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
    const militaryFactoryColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
    const shipyardColumn = getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW);
    const healthColumn = getColumnIndex(economicSheet, "Economic Health", HEADER_ROW);
    const tradeBalanceColumn = getColumnIndex(tradeSheet, "Trade Balance", HEADER_ROW);
    const mobilizationColumn = getColumnIndex(militarySheet, "Mobilization Level", HEADER_ROW);

    const names = Object.keys(industrialRowMap);
    
    // Define hard values for each Economic Health status
    const healthImpact = {
      "Depression": -3,
      "Recession": -2,
      "Slowdown": -1,
      "Recovery": 1,
      "Expansion": 2,
      "Prosperity": 3
    };

    const updatedIndustrial = names.map((nation) => {
      const iRow = industrialRowMap[nation];

      const currentFactories = parseFloat(industrialSheet.getRange(iRow, factoryColumn).getValue());
      const currentMilitaryFactories = parseFloat(industrialSheet.getRange(iRow, militaryFactoryColumn).getValue());
      const currentShipyards = parseFloat(industrialSheet.getRange(iRow, shipyardColumn).getValue());
      const healthStatus = getValueByName(economicSheet, economicRowMap, nation, healthColumn, "Recovery");
      const tradeBalance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nation, tradeBalanceColumn, 0)) || 0;
      const mobilizationLevel = getValueByName(militarySheet, militaryRowMap, nation, mobilizationColumn, "None") || "None";
      const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

      // Check if values are numbers and healthStatus is recognized
      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentFactories];
      }
      
      // Calculate impact from Economic Health
      const impactFromHealth = healthImpact[healthStatus] * yearDifference;

      // Scale Trade Balance impact with diminishing returns based on total industrial capacity
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 200));
      const impactFromTradeBalance = tradeBalance >= 2500 ? Math.max(Math.floor((tradeBalance / 2500) * tradeImpactScaling), 1) : 0;

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

    const updatedMilitary = names.map((nation) => {
      const iRow = industrialRowMap[nation];

      const currentFactories = parseFloat(industrialSheet.getRange(iRow, factoryColumn).getValue());
      const currentMilitaryFactories = parseFloat(industrialSheet.getRange(iRow, militaryFactoryColumn).getValue());
      const currentShipyards = parseFloat(industrialSheet.getRange(iRow, shipyardColumn).getValue());
      const healthStatus = getValueByName(economicSheet, economicRowMap, nation, healthColumn, "Recovery");
      const tradeBalance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nation, tradeBalanceColumn, 0)) || 0;
      const mobilizationLevel = getValueByName(militarySheet, militaryRowMap, nation, mobilizationColumn, "None") || "None";
      const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentMilitaryFactories];
      }

      const impactFromHealth = healthImpact[healthStatus] * yearDifference;
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 200));
      const impactFromTradeBalance = tradeBalance >= 2500 ? Math.max(Math.floor((tradeBalance / 2500) * tradeImpactScaling), 1) : 0;
      const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
      const militaryGrowth = baseGrowth * mobilization.militaryGrowthMultiplier;

      return [Math.max(currentMilitaryFactories + Math.floor(militaryGrowth), 0)];
    });

    const updatedShipyards = names.map((nation) => {
      const iRow = industrialRowMap[nation];

      const currentFactories = parseFloat(industrialSheet.getRange(iRow, factoryColumn).getValue());
      const currentMilitaryFactories = parseFloat(industrialSheet.getRange(iRow, militaryFactoryColumn).getValue());
      const currentShipyards = parseFloat(industrialSheet.getRange(iRow, shipyardColumn).getValue());
      const healthStatus = getValueByName(economicSheet, economicRowMap, nation, healthColumn, "Recovery");
      const tradeBalance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nation, tradeBalanceColumn, 0)) || 0;

      if (isNaN(currentFactories) || isNaN(currentMilitaryFactories) || isNaN(currentShipyards) || !(healthStatus in healthImpact)) {
        return [currentShipyards];
      }

      const impactFromHealth = healthImpact[healthStatus] * yearDifference;
      const totalIndustrialCapacity = currentFactories + (currentMilitaryFactories * 0.5) + currentShipyards;
      const tradeImpactScaling = 1 / (1 + (totalIndustrialCapacity / 200));
      const impactFromTradeBalance = tradeBalance >= 2500 ? Math.max(Math.floor((tradeBalance / 2500) * tradeImpactScaling), 1) : 0;
      const baseGrowth = impactFromHealth + Math.max(impactFromTradeBalance, 0);
      const shipyardGrowth = Math.floor(baseGrowth / 3);

      return [Math.max(currentShipyards + shipyardGrowth, 0)];
    });
    
    names.forEach((nation, idx) => {
      const iRow = industrialRowMap[nation];
      if (iRow != null) {
        industrialSheet.getRange(iRow, factoryColumn).setValue(updatedIndustrial[idx][0]);
        industrialSheet.getRange(iRow, militaryFactoryColumn).setValue(updatedMilitary[idx][0]);
        industrialSheet.getRange(iRow, shipyardColumn).setValue(updatedShipyards[idx][0]);
      }
    });

    // Call calculateBudget after updating industrial values
    calculateBudget();
  }
}

function calculateBudget() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const industrialSheet = ss.getSheetByName("Industrial Status");
  const nationalSheet = ss.getSheetByName("National Status");
  const populationSheet = ss.getSheetByName("Population Tracker");
  const militarySheet = ss.getSheetByName("Military Status");

  const HEADER_ROW = 4;
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const nationalNameColumn = getColumnIndex(nationalSheet, "Nation", HEADER_ROW);
  const populationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);

  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);
  const nationalRowMap = buildRowMap(nationalSheet, nationalNameColumn);
  const populationRowMap = buildRowMap(populationSheet, populationNameColumn);
  const militaryNameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);
  const militaryRowMap = buildRowMap(militarySheet, militaryNameColumn);

  const names = Object.keys(industrialRowMap);

  const factoryColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
  const militaryFactoryColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const shipyardColumn = getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW);
  const budgetCapacityColumn = getColumnIndex(nationalSheet, "Budget Capacity", HEADER_ROW);
  const budgetBalanceColumn = getColumnIndex(nationalSheet, "Budget Balance", HEADER_ROW);
  const populationColumn = getColumnIndex(populationSheet, "Population", HEADER_ROW);
  const developmentLevelColumn = getColumnIndex(nationalSheet, "Development Level", HEADER_ROW);
  const corruptionColumn = getColumnIndex(nationalSheet, "Corruption", HEADER_ROW);
  const economicHealthColumn = getColumnIndex(nationalSheet, "Economic Health", HEADER_ROW);
  const taxRateColumn = getColumnIndex(nationalSheet, "Tax Rate", HEADER_ROW);
  const mobilizationColumn = getColumnIndex(militarySheet, "Mobilization Level", HEADER_ROW);

  // Fetch current budget capacities and balances (previous values before updating)
  const currentBudgetCapacities = names.map(n => getValueByName(nationalSheet, nationalRowMap, n, budgetCapacityColumn, 0));
  const currentBudgetBalances = names.map(n => getValueByName(nationalSheet, nationalRowMap, n, budgetBalanceColumn, 0));

  // Constants
  const baseBudget = 10;
  const baseContributionRate = 5;
  const scalingFactor = 0.75;
  const diminishingFactor = 0.0025;
  const shipyardMultiplier = 1.5; // Shipyards contribute 50% more than factories
  const militaryFactoryMultiplier = 0.4; // Military factories contribute 40% of civilian factories
  const baseMaintenanceCost = 0.1; // Base maintenance cost per factory

  const factoryValues = names.map(n => [getValueByName(industrialSheet, industrialRowMap, n, factoryColumn, 0)]);
  const militaryFactoryValues = names.map(n => [getValueByName(industrialSheet, industrialRowMap, n, militaryFactoryColumn, 0)]);
  const shipyardValues = names.map(n => [getValueByName(industrialSheet, industrialRowMap, n, shipyardColumn, 0)]);
  const developmentLevels = names.map(n => [getValueByName(nationalSheet, nationalRowMap, n, developmentLevelColumn, 0)]);
  const populationValues = names.map(n => [getValueByName(populationSheet, populationRowMap, n, populationColumn, 0)]);
  const corruptionValues = names.map(n => [getValueByName(nationalSheet, nationalRowMap, n, corruptionColumn, 0)]);
  const economicHealthStatuses = names.map(n => [getValueByName(nationalSheet, nationalRowMap, n, economicHealthColumn, "Recovery")]);
  const taxRates = names.map(n => [getValueByName(nationalSheet, nationalRowMap, n, taxRateColumn, 0)]);

  // Economic Health multipliers
  const economicHealthImpact = {
    "Prosperity": 1.1,
    "Expansion": 1.05,
    "Recovery": 1.0,
    "Slowdown": 0.9,
    "Recession": 0.8,
    "Depression": 0.6,
  };

  const mobilizationLevels = names.map(n => getValueByName(militarySheet, militaryRowMap, n, mobilizationColumn, "None"));

  const updatedBudgets = names.map((nation, index) => {
    const civFactories = factoryValues[index][0];
    const militaryFactories = militaryFactoryValues[index][0];
    const shipyards = shipyardValues[index][0];
    const developmentLevel = developmentLevels[index][0];
    const population = populationValues[index][0];
    const corruption = parseFloat(corruptionValues[index][0]);
    const economicHealth = economicHealthStatuses[index][0];
    const taxRate = parseFloat(taxRates[index][0]);
    const mobilizationLevel = mobilizationLevels[index] || "None";
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
    const populationContribution = 
      (Math.log(validPopulation) + validPopulation / 250000) * // Combined logarithmic and direct scaling for population
      taxRateScalingFactor * // Adjust for tax rate
      developmentImpact * // Adjusted development impact
      ((100 - validCorruption) / 100) * // Adjust for corruption as a reducing factor
      validEconomicHealthMultiplier; // Apply economic health multiplier

    // Apply maintenance cost modifier from mobilization
    const maintenanceCost = (
      (validCivFactories + validShipyards + 
      (validMilitaryFactories * mobilization.maintenanceCost)) * 
      baseMaintenanceCost
    );

    // Total budget capacity with maintenance costs
    const totalBudget = Math.round(
      (baseBudget + industrialContribution + populationContribution) - maintenanceCost
    );

    // Store the previous capacity and balance for use in updateDebt
    previousData[nation] = {
      previousCapacity: currentBudgetCapacities[index],
      previousBalance: currentBudgetBalances[index],
      currentBudget: totalBudget
    };

    return [totalBudget];
  });

  // Set the updated budget capacities in the National Status sheet
  names.forEach((nation, idx) => {
    const nRow = nationalRowMap[nation];
    if (nRow != null) {
      nationalSheet.getRange(nRow, budgetCapacityColumn).setValue(updatedBudgets[idx][0]);
    }
  });

  // Run UpdateDebt After calculateBudget 
  updateDebt(previousData);
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