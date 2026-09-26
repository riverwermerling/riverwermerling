// Renders icons/icon.svg to the PNG sizes the browser stores need.
// Run: npm run icons
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`
  );
  await page.locator('svg').screenshot({
    path: new URL(`../icons/icon${size}.png`, import.meta.url).pathname,
    omitBackground: true,
  });
}

await browser.close();
console.log('Icons written.');
