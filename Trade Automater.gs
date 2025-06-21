function onEdit(e) {
  const worldstatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");

  // Define the cell that holds the Year in World Status Tracker (C6)
  const yearCell = worldstatusSheet.getRange("C6");
  
  // Check if the edited cell is the year cell or in the Trade Status sheet
  if (e.range.getA1Notation() === yearCell.getA1Notation()) {
    const newYear = parseInt(e.value, 10);
    const oldYear = parseInt(e.oldValue, 10);

    // Ensure the year is valid and incremented
    if (isNaN(newYear) || newYear <= 0 || isNaN(oldYear) || newYear <= oldYear) {
      SpreadsheetApp.getUi().alert("Please enter a valid year.");
      return;
    }

    // Trigger the Trade Update function with the new year
    updateTradeStats();
  } else if (e.source.getActiveSheet().getName() === "Trade Status") {
    // Store manual adjustments when editing trade stats
    const row = e.range.getRow();
    const col = e.range.getColumn();
    
    // Only process if editing main trade stat columns (Trade Capacity through Trade Power)
    if (row >= 5 && col >= 3 && col <= 8) {
      const newValue = e.value;
      const oldValue = e.oldValue;
      
      if (!isNaN(newValue) && !isNaN(oldValue)) {
        const adjustment = newValue - oldValue;
        storeAdjustment(row, col, adjustment);
      }
    }
  }
}

function storeAdjustment(row, col, adjustment) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const key = `adjustment_${row}_${col}`;
  
  // Get existing adjustment or default to 0
  let existingAdjustment = parseFloat(scriptProperties.getProperty(key)) || 0;
  
  // Add new adjustment
  existingAdjustment += adjustment;
  
  // Store the updated adjustment
  scriptProperties.setProperty(key, existingAdjustment.toString());
}

function getAdjustment(row, col) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const key = `adjustment_${row}_${col}`;
  return parseFloat(scriptProperties.getProperty(key)) || 0;
}

function updateTradeStats() {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const worldStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
  const nationalStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");

  // Column definitions
  const tradeCapacityColumn = 3;
  const tradeEfficiencyColumn = 4;
  const autarkyIndexColumn = 5;
  const tradeBalanceColumn = 6;
  const tradeFlowColumn = 7;
  const tradePowerColumn = 8;
  const importRelianceColumn = 9;
  const exportRelianceColumn = 10;
  const economicTradeDiversityColumn = 11;

  const budgetCapacityColumn = 8; // National Status
  const corruptionColumn = 6;
  const populationColumn = 4;
  const civilianFactoriesColumn = 5; // Industrial Status
  const shipyardsColumn = 6; // Industrial Status
  const developmentColumn = 7;
  const economicHealthColumn = 12;

  const lastRow = tradeSheet.getLastRow();

  // Retrieve values from sheets
  const budgetCapacities = nationalStatusSheet.getRange(5, budgetCapacityColumn, lastRow - 4, 1).getValues();
  const corruptions = nationalStatusSheet.getRange(5, corruptionColumn, lastRow - 4, 1).getValues();
  const populations = nationalStatusSheet.getRange(5, populationColumn, lastRow - 4, 1).getValues();
  const civilianFactories = industrialSheet.getRange(5, civilianFactoriesColumn, lastRow - 4, 1).getValues();
  const shipyards = industrialSheet.getRange(5, shipyardsColumn, lastRow - 4, 1).getValues();
  const developmentLevels = nationalStatusSheet.getRange(5, developmentColumn, lastRow - 4, 1).getValues();
  const importReliances = tradeSheet.getRange(5, importRelianceColumn, lastRow - 4, 1).getValues();
  const exportReliances = tradeSheet.getRange(5, exportRelianceColumn, lastRow - 4, 1).getValues();
  const tradeDiversities = tradeSheet.getRange(5, economicTradeDiversityColumn, lastRow - 4, 1).getValues();
  const economicHealthStatuses = nationalStatusSheet.getRange(5, economicHealthColumn, lastRow - 4, 1).getValues();

  const globalEconomicHealth = worldStatusSheet.getRange("A6").getValue();
  const mostUsedCurrencies = worldStatusSheet.getRange("G6:G10").getValues();
  const currencyPercentages = worldStatusSheet.getRange("I6:I10").getValues();

  const economicHealthImpact = {
    "Prosperity": 5,
    "Expansion": 3.5,
    "Recovery": 2,
    "Slowdown": -2,
    "Recession": -5,
    "Depression": -10,
  };

  const updatedTradeStats = budgetCapacities.map((row, index) => {
    const budgetCapacity = parseFloat(row[0]);
    const corruption = parseFloat(corruptions[index][0]) / 100;
    const population = parseFloat(populations[index][0]);
    const factories = parseFloat(civilianFactories[index][0]);
    const shipyardCount = parseFloat(shipyards[index][0]);
    const development = parseFloat(developmentLevels[index][0]);
    const importReliance = parseFloat(importReliances[index][0]);
    const exportReliance = parseFloat(exportReliances[index][0]);
    const tradeDiversity = parseFloat(tradeDiversities[index][0]);
    const nationalEconomicHealth = economicHealthStatuses[index][0];

    // Handle invalid data
    if (
      isNaN(budgetCapacity) ||
      isNaN(corruption) ||
      isNaN(population) ||
      isNaN(factories) ||
      isNaN(shipyardCount) ||
      isNaN(development) ||
      isNaN(importReliance) ||
      isNaN(exportReliance) ||
      isNaN(tradeDiversity)
    ) {
      return ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
    }

    // Economic Health Impact
    const nationalEconomicImpact = economicHealthImpact[nationalEconomicHealth] || 0;

    // Currency Bonus Impact
    const nationName = tradeSheet.getRange(5 + index, 1).getValue().trim();
    let currencyBonusImpact = 0;

    for (let i = 0; i < mostUsedCurrencies.length; i++) {
      const currencyNation = mostUsedCurrencies[i][0]?.trim();
      if (currencyNation === nationName) {
        currencyBonusImpact = parseFloat(currencyPercentages[i][0] || 0) * 100;
        break;
      }
    }

    // Calculate base values
    let tradePower =
      budgetCapacity * 0.5 +
      exportReliance * 150 +
      tradeDiversity * 3 +
      development * 50 +
      factories * 25 +
      shipyardCount * 40 +
      currencyBonusImpact;

    if (importReliance >= 18 && exportReliance >= 18) {
      tradePower *= 2;
    }

    const tradeCapacity =
      tradePower * 0.6 +
      tradeDiversity * 50 +
      factories * 10 +
      shipyardCount * 15 +
      (population / 1000000) * 10 +
      development * 25;

    let tradeEfficiency =
      50 - corruption * 50 + development * 1.5 + nationalEconomicImpact + economicHealthImpact[globalEconomicHealth];
    tradeEfficiency = Math.max(Math.min(tradeEfficiency, 100), 0);

    // Autarky Index calculation - rebalanced for better distribution
    const autarkyIndex = Math.round(
      25 + // Base value
      (Math.log(factories + 1) * 4) + // Logarithmic scaling for factories
      (Math.log(shipyardCount + 1) * 3) - // Logarithmic scaling for shipyards
      Math.pow(population / 1000000, 1.1) * 0.7 - // Population penalty
      Math.pow(importReliance, 1.3) * 0.9 - // Progressive import penalty
      Math.pow(exportReliance, 1.2) * 0.6 + // Progressive export penalty
      (Math.log(tradeDiversity + 1) * 2) + // Logarithmic scaling for trade diversity
      (Math.log(development + 1) * 3) // Logarithmic scaling for development
    );
    const clampedAutarkyIndex = Math.max(Math.min(autarkyIndex, 85), 5); // Set maximum to 85 and minimum to 5

    const tradeFlow = 
      tradeCapacity * 
      Math.pow(tradeEfficiency / 100, 0.6) *
      (1 + currencyBonusImpact / 100) *
      (1 + (shipyardCount / 100));

    let tradeBalance;
    if (importReliance >= 18 && exportReliance >= 18) {
      tradeBalance =
        tradeFlow * (1 + exportReliance / 20 + tradeDiversity / 100 - importReliance / 20)
    } else {
      tradeBalance =
        tradeFlow * (1 + exportReliance / 20 + tradeDiversity / 100 - importReliance / 6.5)
    }

    // Add stored adjustments to the calculated values
    const currentRow = index + 5;
    const adjustedTradeCapacity = Math.round(tradeCapacity) + getAdjustment(currentRow, tradeCapacityColumn);
    const adjustedTradeEfficiency = Math.round(tradeEfficiency) + getAdjustment(currentRow, tradeEfficiencyColumn);
    const adjustedAutarkyIndex = clampedAutarkyIndex + getAdjustment(currentRow, autarkyIndexColumn);
    const adjustedTradeBalance = Math.round(tradeBalance) + getAdjustment(currentRow, tradeBalanceColumn);
    const adjustedTradeFlow = Math.round(tradeFlow) + getAdjustment(currentRow, tradeFlowColumn);
    const adjustedTradePower = Math.round(tradePower) + getAdjustment(currentRow, tradePowerColumn);

    return [
      adjustedTradeCapacity,
      adjustedTradeEfficiency,
      adjustedAutarkyIndex,
      adjustedTradeBalance,
      adjustedTradeFlow,
      adjustedTradePower,
    ];
  });

  // Update the sheet
  tradeSheet.getRange(5, tradeCapacityColumn, lastRow - 4, 6).setValues(updatedTradeStats);
}