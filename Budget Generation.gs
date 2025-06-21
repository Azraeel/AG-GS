function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Tools")
    .addItem("Visualize Budget", "visualizeBudget")
    .addToUi();
}

function visualizeBudget() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(sheet, "Nation", HEADER_ROW);
  const rowMap = buildRowMap(sheet, nameColumn);
  const selectedRange = sheet.getActiveRange();
  if (!selectedRange || selectedRange.getNumRows() > 1) {
    SpreadsheetApp.getUi().alert("Please select a single row to visualize.");
    return;
  }
  const nationName = sheet.getRange(selectedRange.getRow(), nameColumn).getValue();
  createPieChartForNation(nationName, rowMap);
}

function createPieChartForNation(nationName, rowMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const chartSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Charts") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Charts");

  const HEADER_ROW = 4;
  const nameColumn = getColumnIndex(sheet, "Nation", HEADER_ROW);
  const budgetCapacityColumn = getColumnIndex(sheet, "Budget Capacity", HEADER_ROW);
  const firstCategoryColumn = getColumnIndex(sheet, "Healthcare", HEADER_ROW);
  const categories = ["Healthcare", "Military", "Education", "Infrastructure"];
  const row = rowMap[nationName];
  const nation = sheet.getRange(row, nameColumn).getValue();
  const budgetCapacity = sheet.getRange(row, budgetCapacityColumn).getValue();
  const percentages = sheet.getRange(row, firstCategoryColumn, 1, categories.length).getValues()[0];

  // Ensure data is valid
  if (!budgetCapacity || percentages.reduce((a, b) => a + b, 0) !== 100) {
    SpreadsheetApp.getUi().alert("Invalid data. Percentages must sum to 100%.");
    return;
  }

  // Clear existing chart on the Charts sheet
  chartSheet.clear();

  // Prepare data for chart
  const chartData = [["Category", "Budget"]];
  categories.forEach((category, index) => {
    const amount = (percentages[index] / 100) * budgetCapacity;
    chartData.push([category, amount]);
  });

  // Add data to the Charts sheet
  chartSheet.getRange(1, 1, chartData.length, chartData[0].length).setValues(chartData);

  // Create the pie chart
  const chart = chartSheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartSheet.getRange(1, 1, chartData.length, chartData[0].length))
    .setPosition(2, 2, 0, 0)
    .setOption("title", `Budget Breakdown for ${nation}`)
    .build();

  chartSheet.insertChart(chart);

  // Provide feedback to the user
  SpreadsheetApp.getUi().alert(`Chart for ${nation} created successfully.`);
}