import fs from 'fs';
import path from 'path';
const target = path.resolve('public', 'model-export', 'FOLHA DE MEDICAO.xlsx');
const buffer = fs.readFileSync(target);
process.stdout.write(buffer);

