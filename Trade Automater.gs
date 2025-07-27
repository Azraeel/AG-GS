// Add menu when spreadsheet opens
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Enhanced Trade System")
    .addItem("Initialize Enhanced Trade System", "initializeEnhancedTradeSystem")
    .addSeparator()
    .addItem("Apply Sanctions", "showSanctionsDialog")
    .addItem("Set Trade Policy", "showTradePolicyDialog")
    .addItem("Set Tariff Rate", "showTariffDialog")
    .addItem("Set Minimum Imports", "showMinimumImportsDialog")
    .addItem("Clear Autarky Adjustments", "clearAutarkyAdjustments")
    .addSeparator()
    .addItem("Update Trade Stats", "updateTradeStats")
    .addItem("Test System", "testEnhancedTradeSystem")
    .addItem("Trade System Help", "showTradeHelp")
    .addToUi();
}

// Dialog for applying sanctions
function showSanctionsDialog() {
  const ui = SpreadsheetApp.getUi();

  const nationResult = ui.prompt(
    'Apply Sanctions',
    'Enter the nation name to apply sanctions to:',
    ui.ButtonSet.OK_CANCEL
  );

  if (nationResult.getSelectedButton() == ui.Button.OK) {
    const nationName = nationResult.getResponseText().trim();

    const sanctionResult = ui.prompt(
      'Sanction Level',
      'Enter sanction level (None, Light, Moderate, Heavy, Total):',
      ui.ButtonSet.OK_CANCEL
    );

    if (sanctionResult.getSelectedButton() == ui.Button.OK) {
      const sanctionLevel = sanctionResult.getResponseText().trim();
      applySanctions(nationName, sanctionLevel);
    }
  }
}

// Dialog for setting trade policy
function showTradePolicyDialog() {
  const ui = SpreadsheetApp.getUi();

  const nationResult = ui.prompt(
    'Set Trade Policy',
    'Enter the nation name:',
    ui.ButtonSet.OK_CANCEL
  );

  if (nationResult.getSelectedButton() == ui.Button.OK) {
    const nationName = nationResult.getResponseText().trim();

    const policyResult = ui.prompt(
      'Trade Policy',
      'Enter trade policy (Protectionist, Balanced, Open Market, Free Trade):',
      ui.ButtonSet.OK_CANCEL
    );

    if (policyResult.getSelectedButton() == ui.Button.OK) {
      const policy = policyResult.getResponseText().trim();
      setTradePolicy(nationName, policy);
    }
  }
}

// Dialog for setting tariff rate
function showTariffDialog() {
  const ui = SpreadsheetApp.getUi();

  const nationResult = ui.prompt(
    'Set Tariff Rate',
    'Enter the nation name:',
    ui.ButtonSet.OK_CANCEL
  );

  if (nationResult.getSelectedButton() == ui.Button.OK) {
    const nationName = nationResult.getResponseText().trim();

    const tariffResult = ui.prompt(
      'Tariff Rate',
      'Enter tariff rate (e.g., "5%" or "15%"):',
      ui.ButtonSet.OK_CANCEL
    );

    if (tariffResult.getSelectedButton() == ui.Button.OK) {
      const tariffRate = tariffResult.getResponseText().trim();
      setTariffRate(nationName, tariffRate);
    }
  }
}

// Help dialog
function showTradeHelp() {
  const ui = SpreadsheetApp.getUi();

  const helpText = `Enhanced Trade System Help:

TRADE POLICIES:
• Protectionist: -15% efficiency, -10% capacity
• Balanced: No modifiers (default)
• Open Market: +10% efficiency, +8% capacity
• Free Trade: +20% efficiency, +15% capacity

SANCTIONS LEVELS:
• None: No penalties
• Light: -10% efficiency, -5% capacity, -15% flow, -20% balance
• Moderate: -25% efficiency, -15% capacity, -30% flow, -40% balance
• Heavy: -45% efficiency, -30% capacity, -50% flow, -60% balance
• Total: -70% efficiency, -50% capacity, -80% flow, -85% balance

TARIFF RATES:
• Format: Percentage (e.g., "5%" or "15%")
• Range: 0% to 50%
• Each 1% tariff reduces efficiency by 2% and capacity by 1.5%
• Tariffs generate government revenue (added to trade balance)
• Higher tariffs = less trade but more government income
• Default: 5%

TRADE SYSTEM MECHANICS:
• Trade Power = Economic influence and trading strength (the big number)
• Trade Capacity = Infrastructure limit (Development × 100 + Shipyards × 200)
• Trade Flow = Trade Power × Trade Capacity × Trade Efficiency
• Autarky Index = User-editable self-sufficiency level (0-100)

USER-EDITABLE VALUES:
• Import Reliance (0-100): How much you import relative to economy
• Export Reliance (0-100): How much you export relative to economy
• Economic Trade Diversity (1-500): Trade network size and variety
• Higher diversity = better export prices and trade power

REALISTIC TRADE BALANCE:
• Scales with actual trade volume (exports + imports)
• Based on export/import difference with trade volume scaling
• Autarky reduces import requirements
• Development improves import efficiency
• Diversity multiplies export value
• Trade balance reflects actual trade activity, not government budget

ECONOMIC IMPACT SCORE:
• Shows how much trade affects your economy
• Higher scores = more trade dependency
• Calculated from trade balance, import/export reliance, and autarky

MINIMUM IMPORT REQUIREMENTS:
• Use "Set Minimum Imports" to auto-calculate based on population and factories
• Formula: √(Population ÷ 1M) × 8 + √(Factories) × 3 + 10 minimum
• Autarky reduces import needs: Up to 60% reduction with exponential scaling
• Can go down to 50% of minimum needs with high autarky
• More balanced scaling for large nations

FEATURES:
• Manual edits to any trade category trigger immediate recalculation
• Trade balance significantly affects economic health and budget capacity
• Negative trade balance hurts growth more than positive helps
• Tariffs provide controllable trade-offs between efficiency and revenue
• Economic health can change based on trade performance
• All effects are player-controlled - no random events`;

  ui.alert('Enhanced Trade System Help', helpText, ui.ButtonSet.OK);
}

// Test function to verify the enhanced trade system
function testEnhancedTradeSystem() {
  const ui = SpreadsheetApp.getUi();

  try {
    const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
    if (!tradeSheet) {
      ui.alert("Error: Trade Status sheet not found!");
      return;
    }

    const HEADER_ROW = 4;

    // Test if enhanced columns exist
    let allColumnsExist = true;
    const requiredColumns = ["Trade Policy", "Sanctions Level", "Tariff Rate", "Economic Impact Score"];
    const missingColumns = [];

    requiredColumns.forEach(columnName => {
      try {
        getColumnIndex(tradeSheet, columnName, HEADER_ROW);
      } catch (e) {
        allColumnsExist = false;
        missingColumns.push(columnName);
      }
    });

    if (!allColumnsExist) {
      ui.alert(`Error: Missing columns: ${missingColumns.join(", ")}\nPlease run "Initialize Enhanced Trade System" first.`);
      return;
    }

    // Test basic functionality
    const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
    const rowMap = buildRowMap(tradeSheet, nameColumn);
    const names = Object.keys(rowMap);

    if (names.length === 0) {
      ui.alert("Error: No nations found in Trade Status sheet!");
      return;
    }

    // Test trade policy effects
    const testNation = names[0];
    const originalPolicy = getValueByName(tradeSheet, rowMap, testNation, getColumnIndex(tradeSheet, "Trade Policy", HEADER_ROW), "Balanced");

    // Test calculations
    updateTradeStats();

    // Test single nation update
    updateSingleNationTradeStats(testNation);

    ui.alert(`Enhanced Trade System Test Passed!

✓ All required columns exist
✓ Found ${names.length} nations
✓ Trade calculations completed successfully
✓ Single nation update tested
✓ Test nation: ${testNation}
✓ Current policy: ${originalPolicy}

Key Changes:
• Trade Capacity = Development + Shipyards only
• Trade Flow = Trade Power × Trade Capacity × Trade Efficiency
• Autarky Index is now user-editable
• Manual edits trigger immediate updates

The system is ready to use!`);

  } catch (error) {
    ui.alert(`Test Failed: ${error.toString()}`);
  }
}

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
        "Import Reliance",
        "Export Reliance",
        "Economic Trade Diversity",
        "Trade Policy",
        "Tariff Rate"
      ];
      if (validHeaders.indexOf(headerName) !== -1) {
        const newValue = e.value;
        const oldValue = e.oldValue;

        // Store manual adjustments for the core trade stats (excluding Autarky Index which is user-controlled)
        const adjustableStats = ["Trade Capacity", "Trade Efficiency", "Trade Balance", "Trade Flow", "Trade Power"];
        if (adjustableStats.includes(headerName) && !isNaN(newValue) && !isNaN(oldValue)) {
          const adjustment = newValue - oldValue;
          storeAdjustment(nationName, headerName, adjustment);
        }

        // Immediately recalculate this nation's trade stats
        updateSingleNationTradeStats(nationName);

        // Update budget capacity to reflect trade changes
        updateBudgetCapacityForNation(nationName);
      }
    }
  } else if (e.source.getSheetName() === "Industrial Status") {
    // Handle Industrial Status edits - check for any factory/shipyard columns
    const row = e.range.getRow();
    const col = e.range.getColumn();
    const HEADER_ROW = 4;

    // Only process if it's not a header row
    if (row > HEADER_ROW) {
      const industrialSheet = e.source.getActiveSheet();

      // Get the header name to identify which column was edited
      const headerName = industrialSheet.getRange(HEADER_ROW, col).getValue().toString().trim();

      // Check if it's one of the industrial columns we care about
      if (headerName === "Military Factories" || headerName === "Civilian Factories" || headerName === "Shipyards") {
        const nationNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
        const nationName = industrialSheet.getRange(row, nationNameColumn).getValue().toString().trim();

        if (nationName) {
          // Update budget capacity for this specific nation
          updateBudgetCapacityForNation(nationName);
        }
      }
    }
  } else if (e.source.getSheetName() === "National Status") {
    // Handle National Status edits that affect budget capacity
    const row = e.range.getRow();
    const col = e.range.getColumn();
    const HEADER_ROW = 4;

    if (row > HEADER_ROW) {
      const nationalSheet = e.source.getActiveSheet();
      const headerName = nationalSheet.getRange(HEADER_ROW, col).getValue().toString().trim();

      // Check if it's a column that affects budget capacity
      const budgetAffectingColumns = ["Development Level", "Corruption", "Economic Health", "Tax Rate"];
      if (budgetAffectingColumns.includes(headerName)) {
        const nationNameColumn = getColumnIndex(nationalSheet, "Nation", HEADER_ROW);
        const nationName = nationalSheet.getRange(row, nationNameColumn).getValue().toString().trim();

        if (nationName) {
          updateBudgetCapacityForNation(nationName);
        }
      }
    }
  } else if (e.source.getSheetName() === "Population Tracker") {
    // Handle Population changes that affect budget capacity
    const row = e.range.getRow();
    const col = e.range.getColumn();
    const HEADER_ROW = 4;

    if (row > HEADER_ROW) {
      const populationSheet = e.source.getActiveSheet();
      const headerName = populationSheet.getRange(HEADER_ROW, col).getValue().toString().trim();

      if (headerName === "Population") {
        const nationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);
        const nationName = populationSheet.getRange(row, nationNameColumn).getValue().toString().trim();

        if (nationName) {
          updateBudgetCapacityForNation(nationName);
        }
      }
    }
  } else if (e.source.getSheetName() === "Military Status") {
    // Handle Military Status edits that affect budget capacity
    const row = e.range.getRow();
    const col = e.range.getColumn();
    const HEADER_ROW = 4;

    if (row > HEADER_ROW) {
      const militarySheet = e.source.getActiveSheet();
      const headerName = militarySheet.getRange(HEADER_ROW, col).getValue().toString().trim();

      if (headerName === "Mobilization Level") {
        const nationNameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);
        const nationName = militarySheet.getRange(row, nationNameColumn).getValue().toString().trim();

        if (nationName) {
          updateBudgetCapacityForNation(nationName);
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
  // Performance optimization: Get all sheets once
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tradeSheet = ss.getSheetByName("Trade Status");
  const worldStatusSheet = ss.getSheetByName("World Status Tracker");
  const nationalStatusSheet = ss.getSheetByName("National Status");
  const industrialSheet = ss.getSheetByName("Industrial Status");
  const populationSheet = ss.getSheetByName("Population Tracker");

  const HEADER_ROW = 4;

  // Performance optimization: Build all row maps once
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const tradeRowMap = buildRowMap(tradeSheet, nameColumn);
  const nationalNameColumn = getColumnIndex(nationalStatusSheet, "Nation", HEADER_ROW);
  const nationalRowMap = buildRowMap(nationalStatusSheet, nationalNameColumn);
  const populationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);
  const populationRowMap = buildRowMap(populationSheet, populationNameColumn);
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);
  // Performance optimization: Get all column indices once
  const columns = {
    trade: {
      capacity: getColumnIndex(tradeSheet, "Trade Capacity", HEADER_ROW),
      efficiency: getColumnIndex(tradeSheet, "Trade Efficiency", HEADER_ROW),
      autarky: getColumnIndex(tradeSheet, "Autarky Index", HEADER_ROW),
      balance: getColumnIndex(tradeSheet, "Trade Balance", HEADER_ROW),
      flow: getColumnIndex(tradeSheet, "Trade Flow", HEADER_ROW),
      power: getColumnIndex(tradeSheet, "Trade Power", HEADER_ROW),
      importReliance: getColumnIndex(tradeSheet, "Import Reliance", HEADER_ROW),
      exportReliance: getColumnIndex(tradeSheet, "Export Reliance", HEADER_ROW),
      diversity: getColumnIndex(tradeSheet, "Economic Trade Diversity", HEADER_ROW)
    }
  };

  // Enhanced trade system columns (with error handling)
  try {
    columns.trade.policy = getColumnIndex(tradeSheet, "Trade Policy", HEADER_ROW);
    columns.trade.sanctions = getColumnIndex(tradeSheet, "Sanctions Level", HEADER_ROW);
    columns.trade.tariff = getColumnIndex(tradeSheet, "Tariff Rate", HEADER_ROW);
    columns.trade.impact = getColumnIndex(tradeSheet, "Economic Impact Score", HEADER_ROW);
  } catch (e) {
    // Enhanced columns don't exist yet
    columns.trade.policy = null;
  }

  // Performance optimization: Get all other column indices once
  columns.national = {
    budget: getColumnIndex(nationalStatusSheet, "Budget Capacity", HEADER_ROW),
    corruption: getColumnIndex(nationalStatusSheet, "Corruption", HEADER_ROW),
    development: getColumnIndex(nationalStatusSheet, "Development Level", HEADER_ROW),
    health: getColumnIndex(nationalStatusSheet, "Economic Health", HEADER_ROW)
  };

  columns.population = {
    total: getColumnIndex(populationSheet, "Population", HEADER_ROW)
  };

  columns.industrial = {
    civilian: getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW),
    military: getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW),
    shipyards: getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW)
  };

  const names = Object.keys(tradeRowMap);

  // Performance optimization: Get global data once
  const globalData = {
    economicHealth: worldStatusSheet.getRange("A6").getValue(),
    currencies: worldStatusSheet.getRange("G6:G10").getValues(),
    currencyPercentages: worldStatusSheet.getRange("I6:I10").getValues()
  };

  // Performance optimization: Pre-calculate constants
  const constants = {
    economicHealthImpact: {
      "Prosperity": 5, "Expansion": 3.5, "Recovery": 2,
      "Slowdown": -2, "Recession": -5, "Depression": -10
    },
    tradePolicyEffects: {
      "Protectionist": { efficiency: -15, capacity: -10 },
      "Balanced": { efficiency: 0, capacity: 0 },
      "Open Market": { efficiency: +10, capacity: +8 },
      "Free Trade": { efficiency: +20, capacity: +15 }
    },
    sanctionsEffects: {
      "None": { efficiency: 0, capacity: 0, flow: 0, balance: 0 },
      "Light": { efficiency: -10, capacity: -5, flow: -15, balance: -20 },
      "Moderate": { efficiency: -25, capacity: -15, flow: -30, balance: -40 },
      "Heavy": { efficiency: -45, capacity: -30, flow: -50, balance: -60 },
      "Total": { efficiency: -70, capacity: -50, flow: -80, balance: -85 }
    }
  };

  const updatedTradeStats = names.map((nationName) => {
    // Performance optimization: Get all nation data in one go
    const nationData = {
      budgetCapacity: parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, columns.national.budget, 0)),
      corruption: parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, columns.national.corruption, 0)) / 100,
      population: parseFloat(getValueByName(populationSheet, populationRowMap, nationName, columns.population.total, 0)),
      civilianFactories: parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, columns.industrial.civilian, 0)),
      militaryFactories: parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, columns.industrial.military, 0)),
      shipyards: parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, columns.industrial.shipyards, 0)),
      development: parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, columns.national.development, 0)),
      importReliance: parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.importReliance, 0)),
      exportReliance: parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.exportReliance, 0)),
      tradeDiversity: parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.diversity, 0)),
      economicHealth: getValueByName(nationalStatusSheet, nationalRowMap, nationName, columns.national.health, "Recovery")
    };

    // Enhanced trade system variables
    const tradePolicy = columns.trade.policy ? getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.policy, "Balanced") : "Balanced";
    const sanctionsLevel = columns.trade.sanctions ? getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.sanctions, "None") : "None";
    const tariffRateStr = columns.trade.tariff ? getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.tariff, "5%") : "5%";
    const tariffRate = parseFloat(tariffRateStr.toString().replace('%', '')) || 5;

    // Performance optimization: Quick validation
    if (Object.values(nationData).some(val => isNaN(val) && typeof val === 'number')) {
      return ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
    }

    // Economic Health Impact
    const nationalEconomicImpact = constants.economicHealthImpact[nationData.economicHealth] || 0;

    // Performance optimization: Currency bonus calculation
    let currencyBonusImpact = 0;
    for (let i = 0; i < globalData.currencies.length; i++) {
      const currencyNation = globalData.currencies[i][0]?.trim();
      if (currencyNation === nationName) {
        currencyBonusImpact = parseFloat(globalData.currencyPercentages[i][0] || 0) * 100;
        break;
      }
    }

    // Performance optimization: Use pre-calculated effects
    const policyEffect = constants.tradePolicyEffects[tradePolicy] || constants.tradePolicyEffects["Balanced"];
    const sanctionEffect = constants.sanctionsEffects[sanctionsLevel] || constants.sanctionsEffects["None"];

    // Performance optimization: Calculate effects once
    const tariffEfficiency = Math.max(-30, -tariffRate * 2);
    const tariffCapacity = Math.max(-25, -tariffRate * 1.5);
    const tariffRevenue = tariffRate * 0.01;

    // Calculate enhanced trade diversity effects (1-500 scale)
    const diversityBonus = (nationData.tradeDiversity / 500) * 100;
    const exportMultiplier = 1 + (nationData.tradeDiversity / 250);

    // Calculate base values with enhanced effects
    let tradePower =
      nationData.budgetCapacity * 0.5 +
      nationData.exportReliance * 150 * exportMultiplier +
      nationData.development * 50 +
      nationData.civilianFactories * 25 +
      nationData.shipyards * 40 +
      currencyBonusImpact +
      diversityBonus;

    let tradeCapacity =
      nationData.development * 100 +
      nationData.shipyards * 200;

    // Apply policy, sanctions, and tariff effects to capacity
    tradeCapacity *= (1 + (policyEffect.capacity + sanctionEffect.capacity + tariffCapacity) / 100);

    let tradeEfficiency =
      50 - nationData.corruption * 50 + nationData.development * 1.5 + nationalEconomicImpact + constants.economicHealthImpact[globalData.economicHealth];

    // Apply policy, sanctions, and tariff effects to efficiency
    tradeEfficiency += policyEffect.efficiency + sanctionEffect.efficiency + tariffEfficiency;
    tradeEfficiency = Math.max(Math.min(tradeEfficiency, 100), 0);

    // Get user-set Autarky Index
    const clampedAutarkyIndex = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, columns.trade.autarky, 50)) || 50;

    let tradeFlow =
      tradePower * (tradeCapacity / 1000) * (tradeEfficiency / 100) *
      (1 + currencyBonusImpact / 100);

    // Apply sanctions to trade flow
    tradeFlow *= (1 + sanctionEffect.flow / 100);

    // Calculate minimum imports needed (more balanced scaling)
    // Square root scaling prevents massive import requirements for large nations
    // Example: 273M pop = √273 × 8 ≈ 132 vs old 273×2 = 546
    const populationNeeds = Math.sqrt(nationData.population / 1000000) * 8; // Square root scaling for large populations
    const factoryNeeds = Math.sqrt(nationData.civilianFactories + nationData.militaryFactories * 1.5) * 3; // Combined factory scaling
    const minimumImports = Math.max(
      populationNeeds + factoryNeeds + 10, // Base minimum of 10
      15 // Absolute floor
    );

    // Adjust imports based on autarky (stronger reduction for high autarky)
    const autarkyReduction = Math.pow(clampedAutarkyIndex / 100, 1.5) * 0.6; // Up to 60% reduction with exponential scaling
    const effectiveImports = Math.max(
      nationData.importReliance * (1 - autarkyReduction),
      minimumImports * 0.5 // Can go down to 50% of minimum needs with high autarky
    );

    // Realistic trade balance calculation
    const exportValue = nationData.exportReliance * exportMultiplier; // Diversity multiplies export value
    const importCost = effectiveImports * (1 + nationData.development * 0.01); // Development improves efficiency

    // Calculate trade balance with more balanced scaling
    const tradeBalanceRatio = (exportValue - importCost) / Math.max(exportValue + importCost, 1);
    const tradeVolumeBase = Math.sqrt(nationData.exportReliance + effectiveImports) * 200; // Square root scaling to reduce dramatic swings
    const baseBalance = tradeBalanceRatio * tradeVolumeBase * 100; // More stable calculation
    let tradeBalance = baseBalance + (tradeFlow * 0.01); // Smaller trade flow impact to prevent extreme values

    // Apply sanctions to trade balance
    tradeBalance *= (1 + sanctionEffect.balance / 100);

    // Add tariff revenue to trade balance (tariffs generate government income)
    const tariffRevenueBenefit = Math.abs(tradeBalance) * tariffRevenue;
    tradeBalance += tariffRevenueBenefit;

    // Calculate Economic Impact Score (how much trade affects the economy)
    const economicImpactScore = Math.round(
      (Math.abs(tradeBalance) / nationData.budgetCapacity) * 100 +
      (nationData.importReliance + nationData.exportReliance) / 2 +
      (100 - clampedAutarkyIndex) * 0.5
    );

    // Add stored adjustments to the calculated values (Autarky Index is user-controlled, no adjustments)
    const adjustedTradeCapacity = Math.round(tradeCapacity) + getAdjustment(nationName, "Trade Capacity");
    const adjustedTradeEfficiency = Math.round(tradeEfficiency) + getAdjustment(nationName, "Trade Efficiency");
    const adjustedAutarkyIndex = clampedAutarkyIndex; // No adjustments - user-controlled
    const adjustedTradeBalance = Math.round(tradeBalance) + getAdjustment(nationName, "Trade Balance");
    const adjustedTradeFlow = Math.round(tradeFlow) + getAdjustment(nationName, "Trade Flow");
    const adjustedTradePower = Math.round(tradePower) + getAdjustment(nationName, "Trade Power");

    // Return enhanced trade data
    if (columns.trade.policy) {
      return [
        adjustedTradeCapacity,
        adjustedTradeEfficiency,
        adjustedAutarkyIndex,
        adjustedTradeBalance,
        adjustedTradeFlow,
        adjustedTradePower,
        tradePolicy,
        sanctionsLevel,
        tariffRateStr,
        economicImpactScore
      ];
    } else {
      // Legacy return for existing columns
      return [
        adjustedTradeCapacity,
        adjustedTradeEfficiency,
        adjustedAutarkyIndex,
        adjustedTradeBalance,
        adjustedTradeFlow,
        adjustedTradePower
      ];
    }
  });

  // Performance optimization: Batch update all rows at once
  const updateData = [];
  const updateRows = [];

  names.forEach((nationName, idx) => {
    const row = tradeRowMap[nationName];
    if (row != null) {
      updateRows.push(row);
      updateData.push(updatedTradeStats[idx].slice(0, 6)); // Core trade stats
    }
  });

  // Batch update core trade stats
  if (updateData.length > 0) {
    const startRow = Math.min(...updateRows);
    const endRow = Math.max(...updateRows);

    // Update core columns in batch
    updateRows.forEach((row, idx) => {
      tradeSheet.getRange(row, columns.trade.capacity, 1, 6).setValues([updateData[idx]]);
    });

    // Update economic impact scores if enhanced columns exist
    if (columns.trade.impact) {
      updateRows.forEach((row, idx) => {
        const nationName = names[idx];
        const stats = updatedTradeStats[idx];
        if (stats.length > 9) {
          tradeSheet.getRange(row, columns.trade.impact).setValue(stats[9]);
        }
      });
    }
  }

  // Update budget capacities for all nations after trade stats are updated
  names.forEach(nationName => {
    updateBudgetCapacityForNation(nationName);
  });
}

// Function to update a single nation's trade stats when manually edited
function updateSingleNationTradeStats(nationName) {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const worldStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
  const nationalStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const populationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");

  if (!tradeSheet || !nationalStatusSheet || !industrialSheet || !populationSheet) return;

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const tradeRowMap = buildRowMap(tradeSheet, nameColumn);
  const nationalNameColumn = getColumnIndex(nationalStatusSheet, "Nation", HEADER_ROW);
  const nationalRowMap = buildRowMap(nationalStatusSheet, nationalNameColumn);
  const populationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);
  const populationRowMap = buildRowMap(populationSheet, populationNameColumn);
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);

  // Get column indices
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
  const populationColumn = getColumnIndex(populationSheet, "Population", HEADER_ROW);
  const civilianFactoriesColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
  const militaryFactoriesColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const shipyardsColumn = getColumnIndex(industrialSheet, "Shipyards", HEADER_ROW);
  const developmentColumn = getColumnIndex(nationalStatusSheet, "Development Level", HEADER_ROW);
  const economicHealthColumn = getColumnIndex(nationalStatusSheet, "Economic Health", HEADER_ROW);

  // Enhanced trade system columns
  let tradePolicyColumn, sanctionsLevelColumn, tariffRateColumn, economicImpactColumn;
  try {
    tradePolicyColumn = getColumnIndex(tradeSheet, "Trade Policy", HEADER_ROW);
    sanctionsLevelColumn = getColumnIndex(tradeSheet, "Sanctions Level", HEADER_ROW);
    tariffRateColumn = getColumnIndex(tradeSheet, "Tariff Rate", HEADER_ROW);
    economicImpactColumn = getColumnIndex(tradeSheet, "Economic Impact Score", HEADER_ROW);
  } catch (e) {
    tradePolicyColumn = null;
    sanctionsLevelColumn = null;
    tariffRateColumn = null;
    economicImpactColumn = null;
  }

  // Check if nation exists
  if (!tradeRowMap[nationName]) return;

  // Calculate stats for this nation using the same logic as updateTradeStats
  const updatedStats = calculateSingleNationStats(
    nationName, tradeRowMap, nationalRowMap, industrialRowMap, populationRowMap,
    tradeSheet, nationalStatusSheet, industrialSheet, populationSheet, worldStatusSheet,
    budgetCapacityColumn, corruptionColumn, populationColumn, civilianFactoriesColumn,
    militaryFactoriesColumn, shipyardsColumn, developmentColumn, economicHealthColumn, importRelianceColumn,
    exportRelianceColumn, economicTradeDiversityColumn, autarkyIndexColumn,
    tradePolicyColumn, sanctionsLevelColumn, tariffRateColumn, economicImpactColumn
  );

  // Update only this nation's row
  const row = tradeRowMap[nationName];
  if (row != null && updatedStats) {
    if (tradePolicyColumn && sanctionsLevelColumn && tariffRateColumn && economicImpactColumn) {
      tradeSheet.getRange(row, tradeCapacityColumn, 1, 6).setValues([updatedStats.slice(0, 6)]);
      tradeSheet.getRange(row, economicImpactColumn).setValue(updatedStats[9]);
    } else {
      tradeSheet.getRange(row, tradeCapacityColumn, 1, 6).setValues([updatedStats]);
    }

    // Update budget capacity after trade stats change
    updateBudgetCapacityForNation(nationName);
  }
}

// Helper function to calculate trade stats for a single nation
function calculateSingleNationStats(
  nationName, tradeRowMap, nationalRowMap, industrialRowMap, populationRowMap,
  tradeSheet, nationalStatusSheet, industrialSheet, populationSheet, worldStatusSheet,
  budgetCapacityColumn, corruptionColumn, populationColumn, civilianFactoriesColumn,
  militaryFactoriesColumn, shipyardsColumn, developmentColumn, economicHealthColumn, importRelianceColumn,
  exportRelianceColumn, economicTradeDiversityColumn, autarkyIndexColumn,
  tradePolicyColumn, sanctionsLevelColumn, tariffRateColumn, economicImpactColumn
) {
  const HEADER_ROW = 4; // Define HEADER_ROW constant

  // Get global data
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

  // Get nation data
  const budgetCapacity = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, budgetCapacityColumn, 0));
  const corruption = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, corruptionColumn, 0)) / 100;
  const population = parseFloat(getValueByName(populationSheet, populationRowMap, nationName, populationColumn, 0));
  const factories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, civilianFactoriesColumn, 0));
  const militaryFactories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, militaryFactoriesColumn, 0));
  const shipyardCount = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, shipyardsColumn, 0));
  const development = parseFloat(getValueByName(nationalStatusSheet, nationalRowMap, nationName, developmentColumn, 0));
  const importReliance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, importRelianceColumn, 0));
  const exportReliance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, exportRelianceColumn, 0));
  const tradeDiversity = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, economicTradeDiversityColumn, 0));
  const nationalEconomicHealth = getValueByName(nationalStatusSheet, nationalRowMap, nationName, economicHealthColumn, "Recovery");

  // Enhanced trade system variables
  const tradePolicy = tradePolicyColumn ? getValueByName(tradeSheet, tradeRowMap, nationName, tradePolicyColumn, "Balanced") : "Balanced";
  const sanctionsLevel = sanctionsLevelColumn ? getValueByName(tradeSheet, tradeRowMap, nationName, sanctionsLevelColumn, "None") : "None";
  const tariffRateStr = tariffRateColumn ? getValueByName(tradeSheet, tradeRowMap, nationName, tariffRateColumn, "5%") : "5%";
  const tariffRate = parseFloat(tariffRateStr.toString().replace('%', '')) || 5;

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

  // Enhanced Trade System: Policy Effects (removed diversity and autarky effects)
  const tradePolicyEffects = {
    "Protectionist": { efficiency: -15, capacity: -10 },
    "Balanced": { efficiency: 0, capacity: 0 },
    "Open Market": { efficiency: +10, capacity: +8 },
    "Free Trade": { efficiency: +20, capacity: +15 }
  };

  // Enhanced Trade System: Sanctions Effects
  const sanctionsEffects = {
    "None": { efficiency: 0, capacity: 0, flow: 0, balance: 0 },
    "Light": { efficiency: -10, capacity: -5, flow: -15, balance: -20 },
    "Moderate": { efficiency: -25, capacity: -15, flow: -30, balance: -40 },
    "Heavy": { efficiency: -45, capacity: -30, flow: -50, balance: -60 },
    "Total": { efficiency: -70, capacity: -50, flow: -80, balance: -85 }
  };

  // Enhanced Trade System: Tariff Effects
  const tariffEfficiency = Math.max(-30, -tariffRate * 2);
  const tariffCapacity = Math.max(-25, -tariffRate * 1.5);
  const tariffRevenue = tariffRate * 0.01;

  const policyEffect = tradePolicyEffects[tradePolicy] || tradePolicyEffects["Balanced"];
  const sanctionEffect = sanctionsEffects[sanctionsLevel] || sanctionsEffects["None"];

  // Calculate enhanced trade diversity effects (1-500 scale)
  const diversityBonus = (tradeDiversity / 500) * 100; // 0-20% bonus at max diversity
  const exportMultiplier = 1 + (tradeDiversity / 250); // Up to 3x export value at max diversity

  // Calculate base values with enhanced effects
  let tradePower =
    budgetCapacity * 0.5 +
    exportReliance * 150 * exportMultiplier + // Diversity multiplies export power
    development * 50 +
    factories * 25 +
    shipyardCount * 40 +
    currencyBonusImpact +
    diversityBonus; // Direct diversity bonus

  let tradeCapacity =
    development * 100 +  // Increased from 25 to 100
    shipyardCount * 200; // Increased from 50 to 200

  // Apply policy, sanctions, and tariff effects to capacity
  tradeCapacity *= (1 + (policyEffect.capacity + sanctionEffect.capacity + tariffCapacity) / 100);

  let tradeEfficiency =
    50 - corruption * 50 + development * 1.5 + nationalEconomicImpact + economicHealthImpact[globalEconomicHealth];

  // Apply policy, sanctions, and tariff effects to efficiency
  tradeEfficiency += policyEffect.efficiency + sanctionEffect.efficiency + tariffEfficiency;
  tradeEfficiency = Math.max(Math.min(tradeEfficiency, 100), 0);

  // Get user-set Autarky Index instead of calculating it
  const clampedAutarkyIndex = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, autarkyIndexColumn, 50)) || 50;

  let tradeFlow =
    tradePower * (tradeCapacity / 1000) * (tradeEfficiency / 100) *
    (1 + currencyBonusImpact / 100);

  // Apply sanctions to trade flow
  tradeFlow *= (1 + sanctionEffect.flow / 100);

  // Calculate minimum imports needed (more balanced scaling)
  const populationNeeds = Math.sqrt(population / 1000000) * 8; // Square root scaling for large populations
  const factoryNeeds = Math.sqrt(factories + militaryFactories * 1.5) * 3; // Combined factory scaling
  const minimumImports = Math.max(
    populationNeeds + factoryNeeds + 10, // Base minimum of 10
    15 // Absolute floor
  );

  // Adjust imports based on autarky (stronger reduction for high autarky)
  const autarkyReduction = Math.pow(clampedAutarkyIndex / 100, 1.5) * 0.6; // Up to 60% reduction with exponential scaling
  const effectiveImports = Math.max(
    importReliance * (1 - autarkyReduction),
    minimumImports * 0.5 // Can go down to 50% of minimum needs with high autarky
  );

  // Realistic trade balance calculation
  const exportValue = exportReliance * exportMultiplier; // Diversity multiplies export value
  const importCost = effectiveImports * (1 + development * 0.01); // Development improves efficiency

  // Calculate trade balance with more balanced scaling
  const tradeBalanceRatio = (exportValue - importCost) / Math.max(exportValue + importCost, 1);
  const tradeVolumeBase = Math.sqrt(exportReliance + effectiveImports) * 200; // Square root scaling to reduce dramatic swings
  const baseBalance = tradeBalanceRatio * tradeVolumeBase * 100; // More stable calculation
  let tradeBalance = baseBalance + (tradeFlow * 0.01); // Smaller trade flow impact to prevent extreme values

  // Apply sanctions to trade balance
  tradeBalance *= (1 + sanctionEffect.balance / 100);

  // Add tariff revenue to trade balance
  const tariffRevenueBenefit = Math.abs(tradeBalance) * tariffRevenue;
  tradeBalance += tariffRevenueBenefit;

  // Calculate Economic Impact Score
  const economicImpactScore = Math.round(
    (Math.abs(tradeBalance) / budgetCapacity) * 100 +
    (importReliance + exportReliance) / 2 +
    (100 - clampedAutarkyIndex) * 0.5
  );

  // Add stored adjustments to the calculated values (Autarky Index is user-controlled, no adjustments)
  const adjustedTradeCapacity = Math.round(tradeCapacity) + getAdjustment(nationName, "Trade Capacity");
  const adjustedTradeEfficiency = Math.round(tradeEfficiency) + getAdjustment(nationName, "Trade Efficiency");
  const adjustedAutarkyIndex = clampedAutarkyIndex; // No adjustments - user-controlled
  const adjustedTradeBalance = Math.round(tradeBalance) + getAdjustment(nationName, "Trade Balance");
  const adjustedTradeFlow = Math.round(tradeFlow) + getAdjustment(nationName, "Trade Flow");
  const adjustedTradePower = Math.round(tradePower) + getAdjustment(nationName, "Trade Power");

  // Return enhanced trade data
  if (tradePolicyColumn && sanctionsLevelColumn && tariffRateColumn && economicImpactColumn) {
    return [
      adjustedTradeCapacity,
      adjustedTradeEfficiency,
      adjustedAutarkyIndex,
      adjustedTradeBalance,
      adjustedTradeFlow,
      adjustedTradePower,
      tradePolicy,
      sanctionsLevel,
      tariffRateStr,
      economicImpactScore
    ];
  } else {
    return [
      adjustedTradeCapacity,
      adjustedTradeEfficiency,
      adjustedAutarkyIndex,
      adjustedTradeBalance,
      adjustedTradeFlow,
      adjustedTradePower,
    ];
  }
}

// Function to initialize new trade system columns
function initializeEnhancedTradeSystem() {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const HEADER_ROW = 4;

  // Check if new columns exist, if not, add them
  const lastColumn = tradeSheet.getLastColumn();
  const headers = tradeSheet.getRange(HEADER_ROW, 1, 1, lastColumn).getValues()[0];

  const newColumns = ["Trade Policy", "Sanctions Level", "Tariff Rate", "Economic Impact Score"];
  let columnToAdd = lastColumn + 1;

  newColumns.forEach(columnName => {
    if (!headers.includes(columnName)) {
      tradeSheet.getRange(HEADER_ROW, columnToAdd).setValue(columnName);

      // Set default values for all nations
      const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
      const rowMap = buildRowMap(tradeSheet, nameColumn);
      const names = Object.keys(rowMap);

      names.forEach(nationName => {
        const row = rowMap[nationName];
        let defaultValue;
        switch(columnName) {
          case "Trade Policy":
            defaultValue = "Balanced";
            break;
          case "Sanctions Level":
            defaultValue = "None";
            break;
          case "Tariff Rate":
            defaultValue = "5%"; // Default 5% tariff rate
            break;
          case "Economic Impact Score":
            defaultValue = 50;
            break;
        }
        tradeSheet.getRange(row, columnToAdd).setValue(defaultValue);
      });

      columnToAdd++;
    }
  });

  // Set default values for existing nations if they're empty or zero
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);
  const autarkyColumn = getColumnIndex(tradeSheet, "Autarky Index", HEADER_ROW);
  const diversityColumn = getColumnIndex(tradeSheet, "Economic Trade Diversity", HEADER_ROW);
  const names = Object.keys(rowMap);

  names.forEach(nationName => {
    const row = rowMap[nationName];

    // Update Economic Trade Diversity to new scale (1-500) - but only once during initialization
    const currentDiversity = tradeSheet.getRange(row, diversityColumn).getValue();
    if (currentDiversity && currentDiversity <= 100) {
      // Scale up existing values from 0-100 to 1-500 range
      const newDiversity = Math.max(1, Math.round(currentDiversity * 5));
      tradeSheet.getRange(row, diversityColumn).setValue(newDiversity);
    } else if (!currentDiversity || currentDiversity === 0) {
      tradeSheet.getRange(row, diversityColumn).setValue(100); // Default moderate diversity
    }
  });

  SpreadsheetApp.getUi().alert("Enhanced Trade System initialized! New columns added: Trade Policy, Sanctions Level, Tariff Rate, Economic Impact Score\n\nKey Changes:\n• Economic Trade Diversity scaled to 1-500\n• New 'Open Market' trade policy added\n• Realistic trade balance (no more 17/17 = 0)\n• Import/Export Reliance and Autarky Index are user-editable\n• Trade Capacity scaling increased 4x for better balance");
}

// Function to set tariff rate for a nation
function setTariffRate(nationName, tariffRate) {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");

  if (!tradeSheet) {
    SpreadsheetApp.getUi().alert("Trade Status sheet not found!");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);

  let tariffColumn;
  try {
    tariffColumn = getColumnIndex(tradeSheet, "Tariff Rate", HEADER_ROW);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Enhanced Trade System not initialized. Please run initializeEnhancedTradeSystem() first.");
    return;
  }

  const targetRow = rowMap[nationName];
  if (!targetRow) {
    SpreadsheetApp.getUi().alert(`Nation "${nationName}" not found!`);
    return;
  }

  // Handle both "5%" and "5" formats
  let rate;
  if (tariffRate.includes('%')) {
    rate = parseFloat(tariffRate.replace('%', ''));
  } else {
    rate = parseFloat(tariffRate);
  }

  if (isNaN(rate) || rate < 0 || rate > 50) {
    SpreadsheetApp.getUi().alert("Invalid tariff rate. Please enter a number between 0 and 50 (e.g., '5%' or '5').");
    return;
  }

  tradeSheet.getRange(targetRow, tariffColumn).setValue(`${rate}%`);
  SpreadsheetApp.getUi().alert(`Set ${nationName}'s tariff rate to ${rate}%`);
}

// Function to apply sanctions to a specific nation
function applySanctions(targetNation, sanctionLevel) {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");

  if (!tradeSheet) {
    SpreadsheetApp.getUi().alert("Trade Status sheet not found!");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);

  let sanctionsColumn;
  try {
    sanctionsColumn = getColumnIndex(tradeSheet, "Sanctions Level", HEADER_ROW);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Enhanced Trade System not initialized. Please run initializeEnhancedTradeSystem() first.");
    return;
  }

  const targetRow = rowMap[targetNation];
  if (!targetRow) {
    SpreadsheetApp.getUi().alert(`Nation "${targetNation}" not found!`);
    return;
  }

  const validSanctions = ["None", "Light", "Moderate", "Heavy", "Total"];
  if (!validSanctions.includes(sanctionLevel)) {
    SpreadsheetApp.getUi().alert(`Invalid sanction level. Use: ${validSanctions.join(", ")}`);
    return;
  }

  tradeSheet.getRange(targetRow, sanctionsColumn).setValue(sanctionLevel);
  SpreadsheetApp.getUi().alert(`Applied ${sanctionLevel} sanctions to ${targetNation}`);
}

// Function to set trade policy for a nation
function setTradePolicy(nationName, policy) {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");

  if (!tradeSheet) {
    SpreadsheetApp.getUi().alert("Trade Status sheet not found!");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);

  let policyColumn;
  try {
    policyColumn = getColumnIndex(tradeSheet, "Trade Policy", HEADER_ROW);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Enhanced Trade System not initialized. Please run initializeEnhancedTradeSystem() first.");
    return;
  }

  const targetRow = rowMap[nationName];
  if (!targetRow) {
    SpreadsheetApp.getUi().alert(`Nation "${nationName}" not found!`);
    return;
  }

  const validPolicies = ["Protectionist", "Balanced", "Open Market", "Free Trade"];
  if (!validPolicies.includes(policy)) {
    SpreadsheetApp.getUi().alert(`Invalid trade policy. Use: ${validPolicies.join(", ")}`);
    return;
  }

  tradeSheet.getRange(targetRow, policyColumn).setValue(policy);
  SpreadsheetApp.getUi().alert(`Set ${nationName}'s trade policy to ${policy}`);
}

// Function to set minimum import requirements for all nations
function setMinimumImportRequirements() {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const nationalStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const populationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");

  if (!tradeSheet || !nationalStatusSheet || !industrialSheet || !populationSheet) {
    SpreadsheetApp.getUi().alert("Required sheets not found!");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);

  let importColumn;
  try {
    importColumn = getColumnIndex(tradeSheet, "Import Reliance", HEADER_ROW);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Import Reliance column not found!");
    return;
  }

  // Get column indices for calculations
  const nationalNameColumn = getColumnIndex(nationalStatusSheet, "Nation", HEADER_ROW);
  const nationalRowMap = buildRowMap(nationalStatusSheet, nationalNameColumn);
  const populationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);
  const populationRowMap = buildRowMap(populationSheet, populationNameColumn);
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);

  const populationColumn = getColumnIndex(populationSheet, "Population", HEADER_ROW);
  const civilianFactoriesColumn = getColumnIndex(industrialSheet, "Civilian Factories", HEADER_ROW);
  const militaryFactoriesColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const autarkyColumn = getColumnIndex(tradeSheet, "Autarky Index", HEADER_ROW);

  const names = Object.keys(rowMap);
  let updatedCount = 0;

  names.forEach(nationName => {
    const row = rowMap[nationName];

    // Get nation data
    const population = parseFloat(getValueByName(populationSheet, populationRowMap, nationName, populationColumn, 0)) || 0;
    const civilianFactories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, civilianFactoriesColumn, 0)) || 0;
    const militaryFactories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, militaryFactoriesColumn, 0)) || 0;
    const autarky = parseFloat(getValueByName(tradeSheet, rowMap, nationName, autarkyColumn, 50)) || 50;

    // Calculate minimum imports needed (more balanced scaling)
    const populationNeeds = Math.sqrt(population / 1000000) * 8; // Square root scaling for large populations
    const factoryNeeds = Math.sqrt(civilianFactories + militaryFactories * 1.5) * 3; // Combined factory scaling
    const minimumImports = Math.max(
      populationNeeds + factoryNeeds + 10, // Base minimum of 10
      15 // Absolute floor
    );

    // Adjust for autarky (stronger reduction for high autarky)
    const autarkyReduction = Math.pow(autarky / 100, 1.5) * 0.6; // Up to 60% reduction with exponential scaling
    const adjustedMinimum = Math.max(
      minimumImports * (1 - autarkyReduction),
      minimumImports * 0.5 // Can go down to 50% of minimum needs with high autarky
    );

    // Set the minimum import requirement
    tradeSheet.getRange(row, importColumn).setValue(Math.round(adjustedMinimum));
    updatedCount++;
  });

  SpreadsheetApp.getUi().alert(`Minimum import requirements set for ${updatedCount} nations!\n\nNew Balanced Calculation:\n• Population needs: √(Population ÷ 1M) × 8 (square root scaling)\n• Factory needs: √(Civilian + Military×1.5) × 3\n• Autarky reduction: Up to 60% with exponential scaling\n• Minimum floor: 50% of calculated needs\n• Much more reasonable for large nations\n\nYou can manually adjust these values as needed.`);
}

// Dialog for setting minimum import requirements
function showMinimumImportsDialog() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    'Set Minimum Import Requirements',
    'This will automatically calculate and set minimum import requirements for all nations based on:\n\n• Population needs\n• Industrial capacity\n• Autarky level\n\nExisting import values will be overwritten. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (result == ui.Button.YES) {
    setMinimumImportRequirements();
  }
}

// Function to clear Autarky Index adjustments (run this once to fix existing issues)
function clearAutarkyAdjustments() {
  const tradeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trade Status");
  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(tradeSheet, nameColumn);
  const names = Object.keys(rowMap);

  const scriptProperties = PropertiesService.getScriptProperties();
  let clearedCount = 0;

  names.forEach(nationName => {
    const key = `${nationName}_Autarky Index`;
    const existingAdjustment = scriptProperties.getProperty(key);
    if (existingAdjustment) {
      scriptProperties.deleteProperty(key);
      clearedCount++;
    }
  });

  SpreadsheetApp.getUi().alert(`Cleared Autarky Index adjustments for ${clearedCount} nations.\n\nAutarky Index values will now stay exactly as you set them!`);
}

// Function to update budget capacity when trade changes
function updateBudgetCapacityForNation(nationName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nationalSheet = ss.getSheetByName("National Status");
  const industrialSheet = ss.getSheetByName("Industrial Status");
  const populationSheet = ss.getSheetByName("Population Tracker");
  const militarySheet = ss.getSheetByName("Military Status");
  const tradeSheet = ss.getSheetByName("Trade Status");

  if (!nationalSheet || !industrialSheet || !populationSheet || !militarySheet || !tradeSheet) {
    return;
  }

  const HEADER_ROW = 4;

  // Build row maps
  const nationalNameColumn = getColumnIndex(nationalSheet, "Nation", HEADER_ROW);
  const nationalRowMap = buildRowMap(nationalSheet, nationalNameColumn);
  const industrialNameColumn = getColumnIndex(industrialSheet, "Nation", HEADER_ROW);
  const industrialRowMap = buildRowMap(industrialSheet, industrialNameColumn);
  const populationNameColumn = getColumnIndex(populationSheet, "Nation", HEADER_ROW);
  const populationRowMap = buildRowMap(populationSheet, populationNameColumn);
  const militaryNameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);
  const militaryRowMap = buildRowMap(militarySheet, militaryNameColumn);
  const tradeNameColumn = getColumnIndex(tradeSheet, "Nation", HEADER_ROW);
  const tradeRowMap = buildRowMap(tradeSheet, tradeNameColumn);

  const nationalRow = nationalRowMap[nationName];
  if (!nationalRow) return;

  // Calculate budget using integrated logic with trade impact
  calculateBudgetForNation(nationName, nationalRow, nationalSheet, industrialSheet, populationSheet, militarySheet, tradeSheet,
    nationalRowMap, industrialRowMap, populationRowMap, militaryRowMap, tradeRowMap);
}

// Integrated budget calculation function that includes trade impact
function calculateBudgetForNation(nationName, row, nationalSheet, industrialSheet, populationSheet, militarySheet, tradeSheet,
  nationalRowMap, industrialRowMap, populationRowMap, militaryRowMap, tradeRowMap) {

  const HEADER_ROW = 4;

  // Constants from ManualCalculateBudget.gs
  const baseBudget = 10;
  const baseContributionRate = 5;
  const scalingFactor = 0.75;
  const diminishingFactor = 0.0025;
  const shipyardMultiplier = 1.5;
  const baseMaintenanceCost = 0.1;

  // Mobilization impact levels
  const mobilizationImpact = {
    "None": { militaryFactoryMultiplier: 0.4, maintenanceCost: 1.0 },
    "Partial": { militaryFactoryMultiplier: 0.6, maintenanceCost: 1.5 },
    "Full": { militaryFactoryMultiplier: 0.8, maintenanceCost: 2.0 },
    "Total": { militaryFactoryMultiplier: 1.0, maintenanceCost: 3.0 }
  };

  // Economic Health multipliers
  const economicHealthImpact = {
    "Prosperity": 1.1, "Expansion": 1.05, "Recovery": 1.0,
    "Slowdown": 0.9, "Recession": 0.8, "Depression": 0.6
  };

  // Get column indices
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
  const tradeBalanceColumn = getColumnIndex(tradeSheet, "Trade Balance", HEADER_ROW);

  // Get values
  const civFactories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, factoryColumn, 0)) || 0;
  const militaryFactories = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, militaryFactoryColumn, 0)) || 0;
  const shipyards = parseFloat(getValueByName(industrialSheet, industrialRowMap, nationName, shipyardColumn, 0)) || 0;
  const developmentLevel = parseFloat(getValueByName(nationalSheet, nationalRowMap, nationName, developmentLevelColumn, 0)) || 0;
  const population = parseFloat(getValueByName(populationSheet, populationRowMap, nationName, populationColumn, 0)) || 0;
  const corruption = parseFloat(getValueByName(nationalSheet, nationalRowMap, nationName, corruptionColumn, 0)) || 0;
  const economicHealth = getValueByName(nationalSheet, nationalRowMap, nationName, economicHealthColumn, "Recovery");
  const taxRate = parseFloat(getValueByName(nationalSheet, nationalRowMap, nationName, taxRateColumn, 0)) || 0;
  const mobilizationLevel = getValueByName(militarySheet, militaryRowMap, nationName, mobilizationColumn, "None");
  const tradeBalance = parseFloat(getValueByName(tradeSheet, tradeRowMap, nationName, tradeBalanceColumn, 0)) || 0;

  const mobilization = mobilizationImpact[mobilizationLevel] || mobilizationImpact["None"];
  const economicHealthMultiplier = economicHealthImpact[economicHealth] || 1.0;

  // Calculate effective contribution rate based on development level
  const effectiveContributionRate = baseContributionRate + (developmentLevel * scalingFactor);
  const developmentMultiplier = 1 + (developmentLevel * 0.25);

  // Calculate industrial contribution with mobilization effects
  const industrialContribution = (
    (civFactories * effectiveContributionRate) +
    (militaryFactories * effectiveContributionRate * mobilization.militaryFactoryMultiplier) +
    (shipyards * effectiveContributionRate * shipyardMultiplier)
  ) / (1 + (civFactories + militaryFactories + shipyards) * diminishingFactor) * developmentMultiplier;

  // Calculate population-based tax contribution
  const developmentImpact = Math.pow(developmentLevel / 10, 3) * (1 + developmentLevel / 20);
  const taxRateScalingFactor = 1 + Math.sqrt(Math.max(0, (taxRate * 100 - 1) / 100));
  const populationContribution =
    (Math.log(population) + population / 250000) *
    taxRateScalingFactor *
    developmentImpact *
    ((100 - corruption) / 100) *
    economicHealthMultiplier;

  // Calculate maintenance costs with mobilization effects
  const maintenanceCost = (
    (civFactories + shipyards + (militaryFactories * mobilization.maintenanceCost)) *
    baseMaintenanceCost
  );

  // Calculate base budget before trade impact
  const baseBudgetTotal = baseBudget + industrialContribution + populationContribution - maintenanceCost;

  // Apply trade impact using Economic Automater logic
  let tradeImpactOnBudget = 1.0;
  const tradeToGDPRatio = tradeBalance / Math.max(baseBudgetTotal, 100);
  tradeImpactOnBudget = 1 + (tradeToGDPRatio * 0.1); // 10% of trade-to-GDP ratio affects budget
  tradeImpactOnBudget = Math.max(0.1, Math.min(2.0, tradeImpactOnBudget)); // Cap between 10% and 200%

  // Calculate final budget with trade impact
  const totalBudget = Math.round(baseBudgetTotal * tradeImpactOnBudget);

  // Update the budget capacity
  nationalSheet.getRange(row, budgetCapacityColumn).setValue(totalBudget);
}