function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Tools")
    .addItem("Visualize Budget", "visualizeBudget")
    .addToUi();
}

function visualizeBudget() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const selectedRange = sheet.getActiveRange();
  if (!selectedRange || selectedRange.getNumRows() > 1) {
    SpreadsheetApp.getUi().alert("Please select a single row to visualize.");
    return;
  }
  const row = selectedRange.getRow();
  createPieChartForNation(row);
}

function createPieChartForNation(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("National Status");
  const chartSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Charts") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Charts");

  const nation = sheet.getRange(row, 1).getValue(); // Nation name
  const budgetCapacity = sheet.getRange(row, 2).getValue(); // Budget Capacity
  const categories = ["Healthcare", "Military", "Education", "Infrastructure"];
  const percentages = sheet.getRange(row, 3, 1, categories.length).getValues()[0]; // Fetch category percentages

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