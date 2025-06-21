// Equipment Complexity Levels and their production multipliers
// Based on historical production rates and technological complexity
const complexityImpact = {
  // Pre-WW2 Era
  1: {
    multiplier: 3.0,    // Basic Equipment (1920s) - Rifles, basic artillery, etc.
    examples: "Bolt action rifles, horse-drawn artillery, biplanes",
    monthlyOutput: "Thousands of small arms, hundreds of artillery pieces",
    era: "1920s"
  },
  2: {
    multiplier: 2.0,    // Interwar Equipment (1930s) - Early tanks, early monoplanes
    examples: "Panzer I, BT tanks, CR.32 fighters",
    monthlyOutput: "Hundreds of vehicles, dozens of aircraft",
    era: "1930s"
  },
  // WW2 Era
  3: {
    multiplier: 1.5,    // Early WW2 (1939-1941) - Early war tanks and aircraft
    examples: "Panzer III, T-34/76, Bf-109E",
    monthlyOutput: "Hundreds of tanks, hundred+ aircraft",
    era: "1939-1941"
  },
  4: {
    multiplier: 1.0,    // Mid WW2 (1942-1943) - Standard baseline
    examples: "T-34/85, Sherman, Bf-109G",
    monthlyOutput: "Base production rate",
    era: "1942-1943"
  },
  5: {
    multiplier: 0.8,    // Late WW2 (1944-1945) - Advanced equipment
    examples: "Panther, IS-2, Me-262",
    monthlyOutput: "Reduced rate due to complexity",
    era: "1944-1945"
  },
  // Cold War Era
  6: {
    multiplier: 0.5,    // Early Cold War (1945-1960)
    examples: "M48 Patton, T-54, F-86 Sabre",
    monthlyOutput: "Dozens of tanks, 20-30 aircraft",
    era: "1945-1960"
  },
  7: {
    multiplier: 0.35,   // Mid Cold War (1960-1975)
    examples: "M60, T-62, F-4 Phantom",
    monthlyOutput: "15-20 tanks, 10-15 aircraft",
    era: "1960-1975"
  },
  8: {
    multiplier: 0.25,   // Late Cold War (1975-1990)
    examples: "M1 Abrams, T-72, F-15 Eagle",
    monthlyOutput: "10-15 tanks, 5-8 aircraft",
    era: "1975-1990"
  },
  // Modern Era
  9: {
    multiplier: 0.15,   // Early Modern (1990-2000)
    examples: "M1A2, T-90, F-22 Raptor",
    monthlyOutput: "5-8 tanks, 2-3 aircraft",
    era: "1990-2000"
  },
  10: {
    multiplier: 0.1,    // Modern (2000-2015)
    examples: "Leopard 2A7, T-14 Armata, F-35",
    monthlyOutput: "3-5 tanks, 1-2 aircraft",
    era: "2000-2015"
  },
  11: {
    multiplier: 0.05,   // Advanced Modern (2015+)
    examples: "Latest MBT variants, 5th gen+ aircraft",
    monthlyOutput: "1-2 tanks, 1 aircraft",
    era: "2015+"
  }
};

// Global constants
const baseSupplyRate = 100; // Base rate representing 100%
const militaryOrgImpact = 0.01; // Each military organization point impacts efficiency by 1%
const factoryMonthlyProduction = 0.2; // Each military factory adds 0.2% per month base rate
const maxEffectiveDevelopment = 20; // Development level where most advanced tech can be produced
const maxComplexityLevel = 11; // Maximum complexity level

// Define mobilization impact on production
const mobilizationImpact = {
  "None": 1.0,
  "Partial": 1.25,
  "Full": 1.5,
  "Total": 2.0
};

function calculateMaxComplexity(devLevel) {
  if (devLevel <= 1) return 1;
  if (devLevel >= maxEffectiveDevelopment) return maxComplexityLevel;
  
  // Parameters for the curve
  const minComplexity = 1;
  const complexityRange = maxComplexityLevel - minComplexity;
  const developmentRange = maxEffectiveDevelopment - 1;
  
  // Calculate position along the curve (0 to 1)
  const normalizedDev = (devLevel - 1) / developmentRange;
  
  // Apply logarithmic scaling
  // This creates a curve that starts steep and levels off
  // The 1.5 power makes the curve more gradual at higher levels
  const curvePosition = Math.pow(normalizedDev, 1.5);
  
  // Calculate final complexity
  return minComplexity + (complexityRange * curvePosition);
}

function onEdit(e) {
  // Only trigger supply updates on year/month changes, not on complexity changes
  if (e.source.getSheetName() === "World Status Tracker") {
    const worldstatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");
    const yearCell = worldstatusSheet.getRange("C6");  // Year is in B6
    const monthCell = worldstatusSheet.getRange("E6"); // Month is in C6
    
    // Check if the edited cell is either the year or month cell
    if (e.range.getA1Notation() === yearCell.getA1Notation() || 
        e.range.getA1Notation() === monthCell.getA1Notation()) {
          
      const oldValue = e.oldValue ? e.oldValue.toString() : "";
      const newValue = e.value ? e.value.toString() : "";
      
      // If either month changed or year changed, update all nations' supply
      if (oldValue !== newValue) {
        updateAllNationsSupply();
      }
    }
  }
}

function getInterpolatedComplexityMultiplier(complexityLevel) {
  // Get the floor and ceiling of the complexity level
  const floorLevel = Math.floor(complexityLevel);
  const ceilingLevel = Math.ceil(complexityLevel);
  
  // If it's a whole number, return that level's multiplier directly
  if (floorLevel === ceilingLevel) {
    return complexityImpact[floorLevel]?.multiplier || complexityImpact[4].multiplier;
  }
  
  // Get the multipliers for the floor and ceiling levels
  const floorMultiplier = complexityImpact[floorLevel]?.multiplier || complexityImpact[4].multiplier;
  const ceilingMultiplier = complexityImpact[ceilingLevel]?.multiplier || complexityImpact[4].multiplier;
  
  // Calculate the decimal portion
  const fraction = complexityLevel - floorLevel;
  
  // Interpolate between the two multipliers
  return floorMultiplier + (ceilingMultiplier - floorMultiplier) * fraction;
}

function calculateMilitarySupply(row) {
  // Add guard clauses
  if (!row || typeof row !== 'number') return;
  
  const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const nationalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");

  // Verify sheets exist
  if (!militarySheet || !industrialSheet || !nationalSheet) {
    console.error("One or more required sheets not found");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);
  const militaryOrgColumn = getColumnIndex(militarySheet, "Military Organization", HEADER_ROW);
  const militarySupplyColumn = getColumnIndex(militarySheet, "Military Supply", HEADER_ROW);
  const mobilizationColumn = getColumnIndex(militarySheet, "Mobilization Level", HEADER_ROW);
  const complexityColumn = getColumnIndex(militarySheet, "Equipment Complexity", HEADER_ROW);
  const militaryFactoryColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const developmentLevelColumn = getColumnIndex(nationalSheet, "Development Level", HEADER_ROW);
  const rowMap = buildRowMap(militarySheet, nameColumn);
  const nationName = militarySheet.getRange(row, nameColumn).getValue();
  const actualRow = rowMap[nationName] || row;

  try {
    // Get the current supply value
    const currentCell = militarySheet.getRange(actualRow, militarySupplyColumn);
    const currentValue = currentCell.getValue();
    
    // Parse current supply percentage - Fixed to handle values like "121%" correctly
    let currentSupply;
    if (typeof currentValue === 'string') {
      // Remove the % sign and any whitespace, then parse directly
      currentSupply = parseFloat(currentValue.replace(/[%\s]/g, ''));
    } else if (typeof currentValue === 'number') {
      // If it's already a number, multiply by 100 if it's less than 100 (assuming it's in decimal form)
      currentSupply = currentValue < 100 ? currentValue * 100 : currentValue;
    } else {
      currentSupply = 0;
    }
    
    // If no valid current supply, use 0
    if (isNaN(currentSupply)) {
      currentSupply = 0;
    }

    // console.log("Current supply before update:", currentSupply + "%");

    // Fetch other values
    const militaryOrg = militarySheet.getRange(actualRow, militaryOrgColumn).getValue() || 0;
    const mobilizationLevel = militarySheet.getRange(actualRow, mobilizationColumn).getValue() || "None";
    const equipmentComplexity = militarySheet.getRange(actualRow, complexityColumn).getValue() || 4;
    const militaryFactories = industrialSheet.getRange(actualRow, militaryFactoryColumn).getValue() || 0;
    const developmentLevel = nationalSheet.getRange(actualRow, developmentLevelColumn).getValue() || 0;

    // Calculate modifiers
    const mobMultiplier = mobilizationImpact[mobilizationLevel] || 1.0;
    const complexityMultiplier = getInterpolatedComplexityMultiplier(equipmentComplexity);
    const maxComplexityForDevelopment = calculateMaxComplexity(developmentLevel);
    const techGap = Math.max(0, equipmentComplexity - maxComplexityForDevelopment);
    const maxPossibleGap = maxComplexityLevel;
    const penaltyPerGapUnit = 0.95 / maxPossibleGap;
    const techGapPenalty = Math.max(0.05, 1 - (techGap * penaltyPerGapUnit));

    // Calculate the increment to add
    const monthlyIncrement = (
      militaryFactories * 
      factoryMonthlyProduction * 
      mobMultiplier *
      complexityMultiplier *
      techGapPenalty *
      (1 + (militaryOrg * militaryOrgImpact))
    );

    // console.log("Monthly increment to add:", monthlyIncrement + "%");

    // Add increment to current supply
    const newSupply = currentSupply + monthlyIncrement;
    
    // Format with one decimal place
    const formattedSupply = Math.round(newSupply * 10) / 10 + "%";

    // console.log("Final supply after increment:", formattedSupply);

    // Only update if there's an actual change
    if (formattedSupply !== currentValue) {
      currentCell.setValue(formattedSupply);
    }
  } catch (error) {
    console.error("Error in calculateMilitarySupply:", error, error.stack);
  }
}

// Function to convert existing numeric values to percentages
function convertExistingSupplyToPercentage() {
  const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
  const dataRange = militarySheet.getRange("C5:C100"); // Adjust range as needed
  const values = dataRange.getValues();
  
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] !== "") {
      // Convert existing number to percentage
      // Assuming current values are on a scale where 0 = 100%, positive numbers increase percentage, negative numbers decrease
      const currentValue = values[i][0];
      const percentageValue = 100 + (currentValue * 10); // Each point is worth 10%
      const formattedValue = percentageValue + "%";
      dataRange.getCell(i + 1, 1).setValue(formattedValue);
    }
  }
}

// Function to update all nations' military supply
function updateAllNationsSupply() {
  const militarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Military Status");
  const industrialSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Industrial Status");
  const nationalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  
  // Verify sheets exist
  if (!militarySheet || !industrialSheet || !nationalSheet) {
    console.error("One or more required sheets not found");
    return;
  }

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(militarySheet, "Nation", HEADER_ROW);
  const militaryOrgColumn = getColumnIndex(militarySheet, "Military Organization", HEADER_ROW);
  const militarySupplyColumn = getColumnIndex(militarySheet, "Military Supply", HEADER_ROW);
  const mobilizationColumn = getColumnIndex(militarySheet, "Mobilization Level", HEADER_ROW);
  const complexityColumn = getColumnIndex(militarySheet, "Equipment Complexity", HEADER_ROW);
  const militaryFactoryColumn = getColumnIndex(industrialSheet, "Military Factories", HEADER_ROW);
  const developmentLevelColumn = getColumnIndex(nationalSheet, "Development Level", HEADER_ROW);
  const rowMap = buildRowMap(militarySheet, nameColumn);
  const names = Object.keys(rowMap);

  const updates = [];

  names.forEach(name => {
    const row = rowMap[name];
    const currentSupply = militarySheet.getRange(row, militarySupplyColumn).getValue();
    const militaryOrg = militarySheet.getRange(row, militaryOrgColumn).getValue();
    const mobilizationLevel = militarySheet.getRange(row, mobilizationColumn).getValue();
    const equipmentComplexity = militarySheet.getRange(row, complexityColumn).getValue();
    const militaryFactories = industrialSheet.getRange(row, militaryFactoryColumn).getValue();
    const developmentLevel = nationalSheet.getRange(row, developmentLevelColumn).getValue();

    const newSupply = calculateMilitarySupplyForRow(
      currentSupply,
      militaryOrg,
      mobilizationLevel,
      equipmentComplexity,
      militaryFactories,
      developmentLevel
    );

    if (newSupply !== null) {
      updates.push([row, newSupply]);
    }
  });

  if (updates.length > 0) {
    updates.forEach(([row, value]) => {
      militarySheet.getRange(row, militarySupplyColumn).setValue(value);
    });
  }
}

function calculateMilitarySupplyForRow(
  currentSupply,
  militaryOrg,
  mobilizationLevel,
  equipmentComplexity,
  militaryFactories,
  developmentLevel
) {
  try {
    // Parse current supply percentage
    let currentSupplyValue;
    if (typeof currentSupply === 'string') {
      currentSupplyValue = parseFloat(currentSupply.replace(/[%\s]/g, ''));
    } else if (typeof currentSupply === 'number') {
      currentSupplyValue = currentSupply < 100 ? currentSupply * 100 : currentSupply;
    } else {
      currentSupplyValue = 0;
    }
    
    if (isNaN(currentSupplyValue)) {
      currentSupplyValue = 0;
    }

    // Calculate modifiers
    const mobMultiplier = mobilizationImpact[mobilizationLevel] || 1.0;
    const complexityMultiplier = getInterpolatedComplexityMultiplier(equipmentComplexity);
    const maxComplexityForDevelopment = calculateMaxComplexity(developmentLevel);
    const techGap = Math.max(0, equipmentComplexity - maxComplexityForDevelopment);
    const maxPossibleGap = maxComplexityLevel;
    const penaltyPerGapUnit = 0.95 / maxPossibleGap;
    const techGapPenalty = Math.max(0.05, 1 - (techGap * penaltyPerGapUnit));

    // Calculate the increment to add
    const monthlyIncrement = (
      militaryFactories * 
      factoryMonthlyProduction * 
      mobMultiplier *
      complexityMultiplier *
      techGapPenalty *
      (1 + (militaryOrg * militaryOrgImpact))
    );

    // Add increment to current supply
    const newSupply = currentSupplyValue + monthlyIncrement;
    
    // Format with one decimal place
    return Math.round(newSupply * 10) / 10 + "%";
  } catch (error) {
    console.error("Error in calculateMilitarySupplyForRow:", error, error.stack);
    return null;
  }
}

// Add a manual trigger function for testing
function manuallyUpdateAllSupply() {
  console.log("Manual update triggered");
  updateAllNationsSupply();
}