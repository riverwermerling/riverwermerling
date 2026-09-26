// Builds a ready-to-publish package for each browser family.
//
//   dist/chromium/  Chrome, Edge, Brave, Opera, Vivaldi, Samsung Internet
//   dist/firefox/   Firefox desktop and Firefox for Android
//   dist/safari/    Safari on Mac, iPhone and iPad (needs a Mac to finish)
//
// The source tree is the Chromium build, so "Load unpacked" on the repo root
// keeps working during development. Other browsers differ only in manifest.
//
// Run: npm run build
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const base = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'));
const FILES = ['src', 'popup', 'welcome', 'icons'];

const targets = {
  chromium: (m) => m,

  firefox: (m) => {
    delete m.minimum_chrome_version;
    // Firefox runs background pages, not service workers.
    m.background = { scripts: ['src/background.js'] };
    m.browser_specific_settings = {
      gecko: {
        id: 'steady-volume@riverwermerling',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    };
    return m;
  },

  safari: (m) => {
    delete m.minimum_chrome_version;
    m.background = { scripts: ['src/background.js'], persistent: false };
    m.browser_specific_settings = { safari: { strict_min_version: '16.4' } };
    return m;
  },
};

rmSync(root + 'dist', { recursive: true, force: true });

for (const [name, adapt] of Object.entries(targets)) {
  const dir = `${root}dist/${name}/`;
  mkdirSync(dir, { recursive: true });
  for (const f of FILES) {
    cpSync(root + f, dir + f, { recursive: true, filter: (src) => !src.endsWith('.svg') });
  }
  const manifest = adapt(structuredClone(base));
  writeFileSync(dir + 'manifest.json', JSON.stringify(manifest, null, 2) + '\n');

  const zip = `steady-volume-${name}-${base.version}.zip`;
  execFileSync('zip', ['-q', '-r', '-X', `../${zip}`, '.'], { cwd: dir });
  console.log(`dist/${zip}`);
}

console.log(`
Safari: on a Mac with Xcode, run
  xcrun safari-web-extension-converter dist/safari --app-name "Steady Volume"
then build and submit the generated project through App Store Connect.`);
