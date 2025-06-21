function getColumnIndex(sheet, headerName, headerRow) {
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] && headers[i].toString().trim();
    if (header === headerName || (header && header.startsWith(headerName))) {
      return i + 1;
    }
  }
  throw new Error('Header "' + headerName + '" not found in sheet ' + sheet.getName());
}

function buildRowMap(sheet, nameColumn) {
  const lastRow = sheet.getLastRow();
  const names = sheet.getRange(5, nameColumn, Math.max(lastRow - 4, 0), 1).getValues();
  const map = {};
  names.forEach((row, idx) => {
    const name = row[0];
    if (name) {
      map[name.toString().trim()] = idx + 5;
    }
  });
  return map;
}

function getValueByName(sheet, rowMap, name, column, defaultValue) {
  const row = rowMap[name];
  if (row != null) {
    return sheet.getRange(row, column).getValue();
  }
  return defaultValue;
}

function getColumnValues(sheet, column, headerRow) {
  const lastRow = sheet.getLastRow();
  const numRows = Math.max(lastRow - headerRow, 0);
  if (numRows === 0) return [];
  return sheet
    .getRange(headerRow + 1, column, numRows, 1)
    .getValues()
    .map((r) => r[0]);
}
