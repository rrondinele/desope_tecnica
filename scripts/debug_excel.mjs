import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const templatePath = path.resolve('public', 'model-export', 'FOLHA DE MEDICAO.xlsx');

if (!fs.existsSync(templatePath)) {
  console.error('Template not found:', templatePath);
  process.exit(1);
}

const templateBuffer = fs.readFileSync(templatePath);
const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('Workbook loaded. First sheet:', sheetName);
console.log('Initial !ref range:', sheet['!ref']);
