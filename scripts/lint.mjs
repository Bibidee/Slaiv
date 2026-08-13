import { readFile } from 'node:fs/promises';
const files=['src/main.js','src/domain.js','src/fixtures.js','src/adapter.js']; const banned=['alert(','Math.random','localStorage','0x71…A92','18,492,114'];
for(const f of files){const s=await readFile(f,'utf8');for(const x of banned)if(s.includes(x))throw Error(`${f}: prohibited ${x}`)} console.log(`Linted ${files.length} source modules.`);
