import { readFile } from 'node:fs/promises';

const files = [
  'app/app-shell.jsx',
  'app/wallet-provider.jsx',
  'app/lib/genlayer.js',
  'src/domain.js',
  'src/fixtures.js',
  'src/adapter.js',
];
const banned = ['alert(', 'Math.random', 'localStorage', '0x71…A92', '18,492,114'];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const token of banned) {
    if (source.includes(token)) throw Error(`${file}: prohibited ${token}`);
  }
}

console.log(`Audited ${files.length} source modules for fixture and wallet regressions.`);
