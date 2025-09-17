import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = await import(path.resolve(__dirname, '..', 'node_modules', 'xlsx', 'xlsx.mjs'));
const workbookBuffer = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'model-export', 'FOLHA DE MEDICAO.xlsx'));
const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
console.log('sheet ref before', sheet['!ref']);
const keys = Object.keys(sheet).filter((k) => !k.startsWith('!'));
console.log('initial keys', keys);
