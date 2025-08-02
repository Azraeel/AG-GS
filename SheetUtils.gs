// GLOBAL CACHE for sheet references, column indices, and row maps
const SHEET_CACHE = {};
const COLUMN_CACHE = {};
const ROW_MAP_CACHE = {};

function getSheetCached(sheetName) {
  if (!SHEET_CACHE[sheetName]) {
    SHEET_CACHE[sheetName] = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  }
  return SHEET_CACHE[sheetName];
}

function getColumnIndexCached(sheet, headerName, headerRow) {
  const cacheKey = `${sheet.getName()}_${headerName}_${headerRow}`;
  if (!COLUMN_CACHE[cacheKey]) {
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i] && headers[i].toString().trim();
      if (header === headerName || (header && header.startsWith(headerName))) {
        COLUMN_CACHE[cacheKey] = i + 1;
        break;
      }
    }
    if (!COLUMN_CACHE[cacheKey]) {
      throw new Error('Header "' + headerName + '" not found in sheet ' + sheet.getName());
    }
  }
  return COLUMN_CACHE[cacheKey];
}

function buildRowMapCached(sheet, nameColumn) {
  const cacheKey = `${sheet.getName()}_${nameColumn}`;
  if (!ROW_MAP_CACHE[cacheKey]) {
    const lastRow = sheet.getLastRow();
    const names = sheet.getRange(5, nameColumn, Math.max(lastRow - 4, 0), 1).getValues();
    const map = {};
    names.forEach((row, idx) => {
      const name = row[0];
      if (name) {
        map[name.toString().trim()] = idx + 5;
      }
    });
    ROW_MAP_CACHE[cacheKey] = map;
  }
  return ROW_MAP_CACHE[cacheKey];
}

// Batch data reading function for multiple columns
function getBatchDataByNames(sheet, rowMap, names, columns, defaultValue = null) {
  const result = {};
  names.forEach(name => {
    const row = rowMap[name];
    if (row != null) {
      if (Array.isArray(columns)) {
        // Multiple columns - read in one operation
        const minCol = Math.min(...columns);
        const maxCol = Math.max(...columns);
        const values = sheet.getRange(row, minCol, 1, maxCol - minCol + 1).getValues()[0];
        result[name] = {};
        columns.forEach(col => {
          result[name][col] = values[col - minCol] || defaultValue;
        });
      } else {
        // Single column
        result[name] = sheet.getRange(row, columns).getValue() || defaultValue;
      }
    } else {
      result[name] = Array.isArray(columns) ? {} : defaultValue;
    }
  });
  return result;
}

// Clear cache function (call when sheets change structure)
function clearSheetCache() {
  Object.keys(SHEET_CACHE).forEach(key => delete SHEET_CACHE[key]);
  Object.keys(COLUMN_CACHE).forEach(key => delete COLUMN_CACHE[key]);
  Object.keys(ROW_MAP_CACHE).forEach(key => delete ROW_MAP_CACHE[key]);
}

// Legacy functions for backward compatibility
function getColumnIndex(sheet, headerName, headerRow) {
  return getColumnIndexCached(sheet, headerName, headerRow);
}

function buildRowMap(sheet, nameColumn) {
  return buildRowMapCached(sheet, nameColumn);
}

function getValueByName(sheet, rowMap, name, column, defaultValue) {
  const row = rowMap[name];
  if (row != null) {
    return sheet.getRange(row, column).getValue();
  }
  return defaultValue;
}
