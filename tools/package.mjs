// Zips just the files the browser needs, ready to upload to the
// Chrome Web Store, Edge Add-ons or Firefox Add-ons.
// Run: npm run package
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const { version } = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'));
const out = `dist/steady-volume-${version}.zip`;

mkdirSync(root + 'dist', { recursive: true });
rmSync(root + out, { force: true });
execFileSync('zip', ['-r', '-X', out, 'manifest.json', 'src', 'popup', 'icons', '-x', 'icons/icon.svg'], { cwd: root, stdio: 'inherit' });
console.log(`\nWrote ${out}`);
