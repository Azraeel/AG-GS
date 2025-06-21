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
    
    // Define the columns for Civilian Factories (E), Military Factories (D), Shipyards (F) in Industrial Status
    const factoryColumn = 5; // Column E in Industrial Status
    const militaryFactoryColumn = 4; // Column D in Industrial Status
    const shipyardColumn = 6; // Column F in Industrial Status
    const healthColumn = 12; // Column L in National Status
    const tradeBalanceColumn = 6; // Column F in Trade Status
    const lastRow = industrialSheet.getLastRow();
    
    // Get the ranges for all industrial values
    const healthRange = economicSheet.getRange(5, healthColumn, lastRow - 4, 1).getValues();
    const tradeBalanceRange = tradeSheet.getRange(5, tradeBalanceColumn, lastRow - 4, 1).getValues();
    const factoryRange = industrialSheet.getRange(5, factoryColumn, lastRow - 4, 1);
    const factoryValues = factoryRange.getValues();
    const militaryFactoryRange = industrialSheet.getRange(5, militaryFactoryColumn, lastRow - 4, 1);
    const militaryFactoryValues = militaryFactoryRange.getValues();
    const shipyardRange = industrialSheet.getRange(5, shipyardColumn, lastRow - 4, 1);
    const shipyardValues = shipyardRange.getValues();
    
    // Define hard values for each Economic Health status
    const healthImpact = {
      "Depression": -3,
      "Recession": -2,
      "Slowdown": -1,
      "Recovery": 1,
      "Expansion": 2,
      "Prosperity": 3
    };

    // Add mobilization level column
    const mobilizationColumn = 5; // Column E in Military Status
    const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
    
    // Get mobilization levels
    const mobilizationLevels = militarySheet.getRange(5, mobilizationColumn, lastRow - 4, 1).getValues();

    // Calculate the new industrial values based on Economic Health and Trade Balance
    const updatedIndustrial = factoryValues.map((row, index) => {
      const currentFactories = row[0];
      const currentMilitaryFactories = militaryFactoryValues[index][0];
      const currentShipyards = shipyardValues[index][0];
      const healthStatus = healthRange[index][0];
      const tradeBalance = parseFloat(tradeBalanceRange[index][0]) || 0;
      const mobilizationLevel = mobilizationLevels[index][0] || "None";
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

    const updatedMilitary = factoryValues.map((row, index) => {
      const currentFactories = row[0];
      const currentMilitaryFactories = militaryFactoryValues[index][0];
      const currentShipyards = shipyardValues[index][0];
      const healthStatus = healthRange[index][0];
      const tradeBalance = parseFloat(tradeBalanceRange[index][0]) || 0;
      const mobilizationLevel = mobilizationLevels[index][0] || "None";
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

    const updatedShipyards = factoryValues.map((row, index) => {
      const currentFactories = row[0];
      const currentMilitaryFactories = militaryFactoryValues[index][0];
      const currentShipyards = shipyardValues[index][0];
      const healthStatus = healthRange[index][0];
      const tradeBalance = parseFloat(tradeBalanceRange[index][0]) || 0;

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
    
    // Set the updated industrial values separately for each column
    industrialSheet.getRange(5, factoryColumn, lastRow - 4, 1).setValues(updatedIndustrial);
    industrialSheet.getRange(5, militaryFactoryColumn, lastRow - 4, 1).setValues(updatedMilitary);
    industrialSheet.getRange(5, shipyardColumn, lastRow - 4, 1).setValues(updatedShipyards);

    // Call calculateBudget after updating industrial values
    calculateBudget();
  }
}

function calculateBudget() {
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const nationalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const populationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");

  // Get the last row with data in Industrial Status
  const lastRow = industrialSheet.getLastRow();

  // Columns in Industrial Status, National Status, and Trade Status sheets
  const factoryColumn = 5; // Column E for Civilian Factories
  const militaryFactoryColumn = 4; // Column D for Military Factories
  const shipyardColumn = 6; // Column F for Shipyards
  const budgetCapacityColumn = 8; // Column H for Budget Capacity
  const budgetBalanceColumn = 10; // Column J for Budget Balance
  const populationColumn = 4; // Column D for Population
  const developmentLevelColumn = 7; // Column G for Development Level
  const corruptionColumn = 6; // Column F for Corruption
  const economicHealthColumn = 12; // Column L for Economic Health
  const taxRateColumn = 14; // Column N for Tax Rate

  // Fetch current budget capacities and balances (previous values before updating)
  const currentBudgetCapacities = nationalSheet.getRange(5, budgetCapacityColumn, lastRow - 4, 1).getValues();
  const currentBudgetBalances = nationalSheet.getRange(5, budgetBalanceColumn, lastRow - 4, 1).getValues();

  // Constants
  const baseBudget = 10;
  const baseContributionRate = 5;
  const scalingFactor = 0.75;
  const diminishingFactor = 0.0025;
  const shipyardMultiplier = 1.5; // Shipyards contribute 50% more than factories
  const militaryFactoryMultiplier = 0.4; // Military factories contribute 40% of civilian factories
  const baseMaintenanceCost = 0.1; // Base maintenance cost per factory

  // Fetch values for Civilian Factories, Military Factories, Shipyards, Development Levels, Population, Corruption, Economic Health, and Tax Rate
  const factoryValues = industrialSheet.getRange(5, factoryColumn, lastRow - 4, 1).getValues();
  const militaryFactoryValues = industrialSheet.getRange(5, militaryFactoryColumn, lastRow - 4, 1).getValues();
  const shipyardValues = industrialSheet.getRange(5, shipyardColumn, lastRow - 4, 1).getValues();
  const developmentLevels = nationalSheet.getRange(5, developmentLevelColumn, lastRow - 4, 1).getValues();
  const populationValues = populationSheet.getRange(5, populationColumn, lastRow - 4, 1).getValues();
  const corruptionValues = nationalSheet.getRange(5, corruptionColumn, lastRow - 4, 1).getValues();
  const economicHealthStatuses = nationalSheet.getRange(5, economicHealthColumn, lastRow - 4, 1).getValues();
  const taxRates = nationalSheet.getRange(5, taxRateColumn, lastRow - 4, 1).getValues();

  // Economic Health multipliers
  const economicHealthImpact = {
    "Prosperity": 1.1,
    "Expansion": 1.05,
    "Recovery": 1.0,
    "Slowdown": 0.9,
    "Recession": 0.8,
    "Depression": 0.6,
  };

  // Get mobilization levels for budget calculation
  const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
  const mobilizationLevels = militarySheet.getRange(5, 4, lastRow - 4, 1).getValues();

  const updatedBudgets = factoryValues.map((row, index) => {
    const civFactories = row[0];
    const militaryFactories = militaryFactoryValues[index][0];
    const shipyards = shipyardValues[index][0];
    const developmentLevel = developmentLevels[index][0];
    const population = populationValues[index][0];
    const corruption = parseFloat(corruptionValues[index][0]);
    const economicHealth = economicHealthStatuses[index][0];
    const taxRate = parseFloat(taxRates[index][0]);
    const mobilizationLevel = mobilizationLevels[index][0] || "None";
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
    previousData[index] = {
      previousCapacity: currentBudgetCapacities[index][0],
      previousBalance: currentBudgetBalances[index][0],
      currentBudget: totalBudget
    };

    return [totalBudget];
  });

  // Set the updated budget capacities in the National Status sheet
  nationalSheet.getRange(5, budgetCapacityColumn, lastRow - 4, 1).setValues(updatedBudgets);

  // Run UpdateDebt After calculateBudget 
  updateDebt(previousData);
}

function updateDebt(previousData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");

  // Define columns and range
  const budgetCapacityColumn = 8; // Column H
  const budgetBalanceColumn = 10; // Column J
  const debtColumn = 11;          // Column K
  const firstDataRow = 5;         // Start from row 5
  const lastRow = sheet.getLastRow();

  // Fetch data
  const budgetCapacities = sheet.getRange(firstDataRow, budgetCapacityColumn, lastRow - firstDataRow + 1, 1).getValues();
  const budgetBalances = sheet.getRange(firstDataRow, budgetBalanceColumn, lastRow - firstDataRow + 1, 1).getValues();
  const currentDebts = sheet.getRange(firstDataRow, debtColumn, lastRow - firstDataRow + 1, 1).getValues();

  const updatedDebts = budgetCapacities.map((capacityRow, index) => {
    const budgetCapacity = parseFloat(capacityRow[0]) || 0;
    const budgetBalance = parseFloat(budgetBalances[index][0]) || 0;
    let currentDebtPercent = parseFloat(currentDebts[index][0]) || 0;
    const previousCapacity = previousData[index]?.previousCapacity || budgetCapacity;
    const previousBalance = parseFloat(previousData[index]?.previousBalance || 0);

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

  sheet.getRange(firstDataRow, debtColumn, lastRow - firstDataRow + 1, 1).setValues(updatedDebts);
}