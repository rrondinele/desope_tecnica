import fs from 'fs';
import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('public/model-export/FOLHA DE MEDICAO.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const DEFAULT_START_ROW = 2;

const columnLettersToIndex = (letters) => {
  return (
    letters
      .toUpperCase()
      .split('')
      .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1
  );
};

const parseCellReference = (ref, fallbackRow = DEFAULT_START_ROW) => {
  if (!ref) {
    return { column: 'A', row: fallbackRow };
  }

  const match = /^([A-Z]+)(\d+)?$/i.exec(ref.trim());
  if (!match) {
    return { column: ref.toString().toUpperCase(), row: fallbackRow };
  }

  const [, columnLetters, rowPart] = match;
  const row = rowPart ? parseInt(rowPart, 10) : fallbackRow;
  return { column: columnLetters.toUpperCase(), row };
};

const ensureSheetRange = (sheet, cellAddress) => {
  const cell = XLSX.utils.decode_cell(cellAddress);
  const currentRange = sheet['!ref']
    ? XLSX.utils.decode_range(sheet['!ref'])
    : { s: { c: cell.c, r: cell.r }, e: { c: cell.c, r: cell.r } };
  const updated = {
    s: {
      c: Math.min(currentRange.s.c, cell.c),
      r: Math.min(currentRange.s.r, cell.r),
    },
    e: {
      c: Math.max(currentRange.e.c, cell.c),
      r: Math.max(currentRange.e.r, cell.r),
    },
  };

  sheet['!ref'] = XLSX.utils.encode_range(updated);
};

const createCellValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { t: 'n', v: value };
  }
  if (typeof value === 'boolean') {
    return { t: 'b', v: value };
  }
  if (value instanceof Date) {
    return { t: 'd', v: value };
  }
  return { t: 's', v: value ?? '' };
};

const setSheetValue = (sheet, cellRef, rawValue) => {
  const { column, row } = parseCellReference(cellRef);
  const colIndex = columnLettersToIndex(column);
  const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row - 1 });
  sheet[cellAddress] = createCellValue(rawValue);
  ensureSheetRange(sheet, cellAddress);
};

setSheetValue(worksheet, 'A2', 'hello');
console.log('A2 after', worksheet['A2']);

