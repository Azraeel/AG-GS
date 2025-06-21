let previousData = {}; // Declare globally to share across functions

function onEdit(e) {
  // Check if the edit was made in the Civilian Factories column (E), Military Factories column (D), or Shipyards column (F) in Industrial Status
  if (e.source.getSheetName() === "Industrial Status" && (e.range.getColumn() === 5 || e.range.getColumn() === 4 || e.range.getColumn() === 6)) {
    const row = e.range.getRow();
    calculateBudgetForRow(row);
  }
}

function calculateBudgetForRow(row) {
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const nationalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const populationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");
  const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");

  // Constants
  const baseBudget = 10;
  const baseContributionRate = 5;
  const scalingFactor = 0.75;
  const diminishingFactor = 0.0025;
  const shipyardMultiplier = 1.5; // Shipyards contribute 50% more than factories per unit
  const baseMaintenanceCost = 0.1; // Base maintenance cost per factory

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

  const HEADER_ROW = 4;
  const factoryColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
  const militaryFactoryColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const shipyardColumn = getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW);
  const budgetCapacityColumn = getColumnIndex(nationalSheet, "Budget Capacity", HEADER_ROW);
  const populationColumn = getColumnIndex(populationSheet, "Population", HEADER_ROW);
  const developmentLevelColumn = getColumnIndex(nationalSheet, "Development Level", HEADER_ROW);
  const corruptionColumn = getColumnIndex(nationalSheet, "Corruption", HEADER_ROW);
  const economicHealthColumn = getColumnIndex(nationalSheet, "Economic Health", HEADER_ROW);
  const taxRateColumn = getColumnIndex(nationalSheet, "Tax Rate", HEADER_ROW);
  const mobilizationColumn = getColumnIndex(militarySheet, "Mobilization Level", HEADER_ROW);

  // Fetch current budget capacities and balances (previous values before updating)
  const currentBudgetCapacities = nationalSheet.getRange(row, budgetCapacityColumn).getValue();

  // Fetch values for Civilian Factories, Military Factories, Shipyards, and other stats for the specific row
  const civFactories = industrialSheet.getRange(row, factoryColumn).getValue();
  const militaryFactories = industrialSheet.getRange(row, militaryFactoryColumn).getValue();
  const shipyards = industrialSheet.getRange(row, shipyardColumn).getValue();
  const developmentLevel = nationalSheet.getRange(row, developmentLevelColumn).getValue();
  const populationValues = populationSheet.getRange(row, populationColumn).getValue();
  const corruptionValues = nationalSheet.getRange(row, corruptionColumn).getValue();
  const economicHealthStatuses = nationalSheet.getRange(row, economicHealthColumn).getValue();
  const taxRates = nationalSheet.getRange(row, taxRateColumn).getValue();
  const mobilizationLevel = militarySheet.getRange(row, mobilizationColumn).getValue() || "None";
  const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];

  // Economic Health multipliers
  const economicHealthImpact = {
    "Prosperity": 1.1,
    "Expansion": 1.05,
    "Recovery": 1.0,
    "Slowdown": 0.9,
    "Recession": 0.8,
    "Depression": 0.6,
  };

  // Ensure values are numbers; if not, use defaults or skip calculation
  const validCivFactories = !isNaN(civFactories) ? civFactories : 0;
  const validMilitaryFactories = !isNaN(militaryFactories) ? militaryFactories : 0;
  const validShipyards = !isNaN(shipyards) ? shipyards : 0;
  const validDevelopmentLevel = !isNaN(developmentLevel) ? developmentLevel : 0;
  const validPopulation = !isNaN(populationValues) ? populationValues : 0;
  const validTaxRate = !isNaN(taxRates) ? taxRates : 0;
  const validCorruption = !isNaN(corruptionValues) ? corruptionValues : 0;
  const validEconomicHealthMultiplier = economicHealthImpact[economicHealthStatuses] || 1.0;

  // Calculate effective contribution rate based on development level
  const effectiveContributionRate = baseContributionRate + (validDevelopmentLevel * scalingFactor);

  // Calculate development multiplier
  const developmentMultiplier = 1 + (validDevelopmentLevel * 0.25);

  // Calculate industrial contribution with both factories and shipyards, including mobilization effects
  const industrialContribution = (
    (validCivFactories * effectiveContributionRate) + 
    (validMilitaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) +
    (validShipyards * effectiveContributionRate * shipyardMultiplier)
  ) / (1 + (validCivFactories + validMilitaryFactories + validShipyards) * diminishingFactor) * developmentMultiplier;

  // Calculate population-based tax contribution with correct scaling
  const developmentImpact = Math.pow(validDevelopmentLevel / 10, 3) * (1 + validDevelopmentLevel / 20);
  const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (validTaxRate * 100 - 1) / 100));
  const populationContribution = 
    (Math.log(validPopulation) + validPopulation / 250000) * // Combined logarithmic and direct scaling for population
    taxRateScalingFactor * // Adjust for tax rate
    developmentImpact * // Adjusted development impact
    ((100 - validCorruption) / 100) * // Adjust for corruption as a reducing factor
    validEconomicHealthMultiplier; // Apply economic health multiplier
  
  // Calculate maintenance costs with mobilization effects
  const maintenanceCost = (
    (validCivFactories + validShipyards + 
    (validMilitaryFactories * mobilization.maintenanceCost)) * 
    baseMaintenanceCost
  );

  // Calculate total budget with maintenance costs
  const totalBudget = Math.round(
    (baseBudget + industrialContribution + populationContribution) - maintenanceCost
  );

  // Set the updated budget capacity in the National Status sheet for the specific row
  nationalSheet.getRange(row, budgetCapacityColumn).setValue(totalBudget);

  // Store the previous capacity and balance for use in updateDebt
  previousData = {
    previousCapacity: currentBudgetCapacities,
    currentBudget: totalBudget
  };

  // Run UpdateDebt After calculateBudget 
  updateDebt(previousData, row);
}

function updateDebt(previousData, row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(sheet, "Nation", HEADER_ROW);
  const budgetCapacityColumn = getColumnIndex(sheet, "Budget Capacity", HEADER_ROW);
  const budgetBalanceColumn = getColumnIndex(sheet, "Budget Balance", HEADER_ROW);
  const debtColumn = getColumnIndex(sheet, "Debt", HEADER_ROW);
  const rowMap = buildRowMap(sheet, nameColumn);
  const nationName = sheet.getRange(row, nameColumn).getValue();
  const actualRow = rowMap[nationName] || row;

  const budgetCapacity = parseFloat(sheet.getRange(actualRow, budgetCapacityColumn).getValue()) || 0;
  const currentDebtValue = sheet.getRange(actualRow, debtColumn).getValue();
  let currentDebtPercent = parseFloat(currentDebtValue) || 0;

  if (typeof currentDebtValue === "string" && currentDebtValue.includes("%")) {
    currentDebtPercent = parseFloat(currentDebtValue.replace('%', '')) || 0;
  } else {
    currentDebtPercent = currentDebtPercent * 100;
  }

  const previousCapacity = previousData?.previousCapacity || budgetCapacity;

  if (budgetCapacity === 0) {
    sheet.getRange(actualRow, debtColumn).setValue("Error: Zero Budget Capacity");
    return;
  }

  let absoluteDebt = (currentDebtPercent / 100) * previousCapacity;
  const newDebtPercent = (absoluteDebt / budgetCapacity) * 100;

  sheet.getRange(actualRow, debtColumn).setValue(`${newDebtPercent.toFixed(2)}%`);
}