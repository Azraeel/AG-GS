function onEdit(e) {
  const worldstatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("World Status Tracker");

  // Define the cell that holds the Year in World Status Tracker (C6)
  const yearCell = worldstatusSheet.getRange("C6");
  
  // Check if the edited cell is the year cell
  if (e.range.getA1Notation() === yearCell.getA1Notation()) {
    const newYear = parseInt(e.value, 10);
    const oldYear = parseInt(e.oldValue, 10);

    // Ensure the year is valid and incremented
    if (isNaN(newYear) || newYear <= 0 || isNaN(oldYear) || newYear <= oldYear) {
      SpreadsheetApp.getUi().alert("Please enter a valid year.");
      return;
    }

    // Trigger the Population Update function with the new year
    updatePopulation(newYear);
  }
}

function updatePopulation(currentYear) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");
  const nationalStatusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(sheet, "Nation", HEADER_ROW);
  const nationalNameColumn = getColumnIndex(nationalStatusSheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(sheet, nameColumn);
  const nationalRowMap = buildRowMap(nationalStatusSheet, nationalNameColumn);

  const populationColumn = getColumnIndex(sheet, "Population", HEADER_ROW);
  const policyColumn = getColumnIndex(sheet, "Mandatory Child Policy", HEADER_ROW);
  const stabilityColumn = getColumnIndex(nationalStatusSheet, "Governmental Stability", HEADER_ROW);
  const unrestColumn = getColumnIndex(nationalStatusSheet, "Public Unrest", HEADER_ROW);
  const developmentColumn = getColumnIndex(nationalStatusSheet, "Development Level", HEADER_ROW);
  const economicHealthColumn = getColumnIndex(nationalStatusSheet, "Economic Health", HEADER_ROW);
  const immigrationRateColumn = getColumnIndex(nationalStatusSheet, "Immigration Rate", HEADER_ROW);

  const names = Object.keys(rowMap);
  const rowOffset = HEADER_ROW + 1;
  const numRows = sheet.getLastRow() - HEADER_ROW;
  const lastRow = sheet.getLastRow();

  const populations = getColumnValues(sheet, populationColumn, HEADER_ROW);
  const policyValues = getColumnValues(sheet, policyColumn, HEADER_ROW);
  const stabilityValues = getColumnValues(nationalStatusSheet, stabilityColumn, HEADER_ROW);
  const unrestValues = getColumnValues(nationalStatusSheet, unrestColumn, HEADER_ROW);
  const developmentValues = getColumnValues(nationalStatusSheet, developmentColumn, HEADER_ROW);
  const economicHealthValues = getColumnValues(nationalStatusSheet, economicHealthColumn, HEADER_ROW);
  const immigrationRates = getColumnValues(nationalStatusSheet, immigrationRateColumn, HEADER_ROW);

  const economicHealthImpact = {
    "Prosperity": 2,
    "Expansion": 1.5,
    "Recovery": 1,
    "Slowdown": 0.5,
    "Recession": -1,
    "Depression": -2
  };

  const policyImpact = {
    "5 Child Policy": 5, // Adds 5% to growth rate
    "4 Child Policy": 3.75, // Adds 3.75% to growth rate
    "3 Child Policy": 2.5, // Adds 2.5% to growth rate
    "2 Child Policy": 0.5, // Adds 0.5% from growth rate
    "1 Child Policy": 0.25, // Adds 0.25% from growth rate
    "No Policy": 0 // Neutral effect
  };

  const maxPopulationThreshold = 175000000; // Threshold for diminishing returns

  // Shift existing columns to the right to make room for the new year column
  sheet.insertColumnAfter(populationColumn);
  const newPopulationColumn = populationColumn + 1;

  // Update header for the old population
  sheet.getRange(4, newPopulationColumn).setValue(`Population (${currentYear - 1})`);

  // Copy old population to the new column
  sheet
    .getRange(5, newPopulationColumn, lastRow - 4, 1)
    .setValues(populations.map((v) => [v]));

  // Calculate and update the new population
  const updatedPopulations = names.map((nation) => {
    const idx = rowMap[nation] - rowOffset;
    const nIdx = nationalRowMap[nation] - rowOffset;

    const currentPopulation = populations[idx];
    const policy = policyValues[idx];
    const stability = stabilityValues[nIdx];
    const unrest = unrestValues[nIdx];
    const development = developmentValues[nIdx];
    const economicHealth = economicHealthValues[nIdx];
    const immigrationRate = immigrationRates[nIdx];

    if (
      !currentPopulation ||
      isNaN(currentPopulation) ||
      isNaN(stability) ||
      isNaN(unrest) ||
      isNaN(development) ||
      isNaN(immigrationRate) ||
      !(economicHealth in economicHealthImpact)
    ) {
      return [currentPopulation]; // Skip invalid rows
    }

    // Calculate diminishing returns factor
    const scalingFactor = Math.max(
      0.2, // Minimum scaling factor to ensure some growth always occurs
      1 - (Math.log10(currentPopulation) / Math.log10(maxPopulationThreshold)) * 0.8 // Scaled logarithm impact
    );

    // Get policy effect
    const policyEffect = policyImpact[policy] || 0; // Default to neutral effect if no policy matches

    // Calculate development impact
    let developmentImpact = 0;
    if (development <= 7) {
      developmentImpact = 0.1 * (7 - development); // +0.1% for each level below 7
      developmentImpact = Math.min(developmentImpact, 0.5); // Cap at +0.5%
    } else if (development >= 15) {
      developmentImpact = -0.1 * (development - 15); // -0.1% for each level above 15
      developmentImpact = Math.max(developmentImpact, -0.5); // Cap at -0.5%
    }

    // Calculate growth rate
    const baseGrowth = economicHealthImpact[economicHealth];
    const stabilityImpact = stability / 100; // Convert stability percentage to a multiplier
    const unrestImpact = unrest * 0.1;
    const immigrationImpact = immigrationRate * 0.5; // Scale immigration rate impact

    let growthRate =
      baseGrowth +
      (stabilityImpact * baseGrowth) +
      policyEffect +
      developmentImpact +
      immigrationImpact -
      unrestImpact;

    // Apply diminishing returns
    growthRate *= scalingFactor;

    // Calculate new population
    const newPopulation = Math.round(currentPopulation * (1 + growthRate / 100));
    return [newPopulation];
  });

  names.forEach((nation, idx) => {
    const row = rowMap[nation] - rowOffset;
    populations[row] = updatedPopulations[idx][0];
  });

  sheet
    .getRange(rowOffset, populationColumn, numRows, 1)
    .setValues(populations.map((v) => [v]));

  // Update the year in the Population column header
  sheet.getRange(4, populationColumn).setValue(`Population (${currentYear})`);

  // Update Population Status Header
  mergePopulationHeader();
}

function mergePopulationHeader() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Population Tracker");

  // Get the last column with data
  const lastColumn = sheet.getLastColumn();

  // Clear any previous merges in rows 1, 2, and 3
  sheet.getRange(1, 1, 3, sheet.getMaxColumns()).breakApart();

  // Merge rows 1, 2, and 3 dynamically for all populated columns
  const mergeRange = sheet.getRange(1, 1, 3, lastColumn);
  mergeRange.merge();

  // Apply center alignment to the merged range
  mergeRange.setHorizontalAlignment("center").setVerticalAlignment("middle");
}