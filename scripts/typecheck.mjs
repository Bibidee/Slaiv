import { readdir } from 'node:fs/promises'; import { execFileSync } from 'node:child_process';
const files=(await readdir('src')).filter(x=>x.endsWith('.js')).map(x=>`src/${x}`); for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'inherit'}); console.log(`Syntax checked ${files.length} source modules.`);
