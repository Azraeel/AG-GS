function onEdit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const worldstatusSheet = ss.getSheetByName("World Status Tracker");
  const tradeSheet = ss.getSheetByName("Trade Status");
  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);

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
    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row >= 5) {
      const nationName = tradeSheet.getRange(row, nameColumn).getValue().toString().trim();
      const headerName = tradeSheet.getRange(HEADER_ROW, col).getValue().toString().trim();
      const validHeaders = [
        "Trade Capacity",
        "Trade Efficiency",
        "Autarky Index",
        "Trade Balance",
        "Trade Flow",
        "Trade Power",
      ];
      if (validHeaders.indexOf(headerName) !== -1) {
        const newValue = e.value;
        const oldValue = e.oldValue;
        if (!isNaN(newValue) && !isNaN(oldValue)) {
          const adjustment = newValue - oldValue;
          storeAdjustment(nationName, headerName, adjustment);
        }
      }
    }
  }
}

function storeAdjustment(nationName, headerName, adjustment) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const key = `${nationName}_${headerName}`;
  
  // Get existing adjustment or default to 0
  let existingAdjustment = parseFloat(scriptProperties.getProperty(key)) || 0;
  
  // Add new adjustment
  existingAdjustment += adjustment;
  
  // Store the updated adjustment
  scriptProperties.setProperty(key, existingAdjustment.toString());
}

function getAdjustment(nationName, headerName) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const key = `${nationName}_${headerName}`;
  return parseFloat(scriptProperties.getProperty(key)) || 0;
}

function updateTradeStats() {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const worldStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
  const nationalStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const tradeRowMap = buildRowMap(tradeSheet, nameColumn);
  const nationalNameColumn = getColumnIndex(nationalStatusSheet, "Nation", HEADER_ROW);
  const nationalRowMap = buildRowMap(nationalStatusSheet, nationalNameColumn);
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);
  const tradeCapacityColumn = getColumnIndex(tradeSheet, "Trade Capacity", HEADER_ROW);
  const tradeEfficiencyColumn = getColumnIndex(tradeSheet, "Trade Efficiency", HEADER_ROW);
  const autarkyIndexColumn = getColumnIndex(tradeSheet, "Autarky Index", HEADER_ROW);
  const tradeBalanceColumn = getColumnIndex(tradeSheet, "Trade Balance", HEADER_ROW);
  const tradeFlowColumn = getColumnIndex(tradeSheet, "Trade Flow", HEADER_ROW);
  const tradePowerColumn = getColumnIndex(tradeSheet, "Trade Power", HEADER_ROW);
  const importRelianceColumn = getColumnIndex(tradeSheet, "Import Reliance", HEADER_ROW);
  const exportRelianceColumn = getColumnIndex(tradeSheet, "Export Reliance", HEADER_ROW);
  const economicTradeDiversityColumn = getColumnIndex(tradeSheet, "Economic Trade Diversity", HEADER_ROW);

  const budgetCapacityColumn = getColumnIndex(nationalStatusSheet, "Budget Capacity", HEADER_ROW);
  const corruptionColumn = getColumnIndex(nationalStatusSheet, "Corruption", HEADER_ROW);
  const populationColumn = getColumnIndex(nationalStatusSheet, "Population", HEADER_ROW);
  const civilianFactoriesColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
  const shipyardsColumn = getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW);
  const developmentColumn = getColumnIndex(nationalStatusSheet, "Development Level", HEADER_ROW);
  const economicHealthColumn = getColumnIndex(nationalStatusSheet, "Economic Health", HEADER_ROW);

  const names = Object.keys(tradeRowMap);

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

  const updatedTradeStats = names.map((nationName) => {
    const tradeRow = tradeRowMap[nationName];
    const nationalRow = nationalRowMap[nationName];
    const industrialRow = industrialRowMap[nationName];

    const budgetCapacity = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, budgetCapacityColumn, 0));
    const corruption = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, corruptionColumn, 0)) / 100;
    const population = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, populationColumn, 0));
    const factories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, civilianFactoriesColumn, 0));
    const shipyardCount = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, shipyardsColumn, 0));
    const development = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, developmentColumn, 0));
    const importReliance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, importRelianceColumn, 0));
    const exportReliance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, exportRelianceColumn, 0));
    const tradeDiversity = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, economicTradeDiversityColumn, 0));
    const nationalEconomicHealth = getValueByName(nationalStatusSheet, nationalRowMap, nationName, economicHealthColumn, "Recovery");

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
    const adjustedTradeCapacity = Math.round(tradeCapacity) + getAdjustment(nationName, "Trade Capacity");
    const adjustedTradeEfficiency = Math.round(tradeEfficiency) + getAdjustment(nationName, "Trade Efficiency");
    const adjustedAutarkyIndex = clampedAutarkyIndex + getAdjustment(nationName, "Autarky Index");
    const adjustedTradeBalance = Math.round(tradeBalance) + getAdjustment(nationName, "Trade Balance");
    const adjustedTradeFlow = Math.round(tradeFlow) + getAdjustment(nationName, "Trade Flow");
    const adjustedTradePower = Math.round(tradePower) + getAdjustment(nationName, "Trade Power");

    return [
      adjustedTradeCapacity,
      adjustedTradeEfficiency,
      adjustedAutarkyIndex,
      adjustedTradeBalance,
      adjustedTradeFlow,
      adjustedTradePower,
    ];
  });

  // Update each nation's row individually
  names.forEach((nationName, idx) => {
    const row = tradeRowMap[nationName];
    if (row != null) {
      tradeSheet.getRange(row, tradeCapacityColumn, 1, 6).setValues([updatedTradeStats[idx]]);
    }
  });
}