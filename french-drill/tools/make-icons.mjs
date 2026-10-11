// Renders icons/icon.svg to the PNG sizes needed for install + Apple touch icon (uses Playwright's Chromium).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, name, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable ? `<div style="width:100vw;height:100vh;background:#2447d6;display:grid;place-items:center"><div style="width:72%;height:72%">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div></div>` : svg.replace('<svg', '<svg width="100%" height="100%"');
  await page.setContent(`<body style="margin:0;background:transparent">${inner}</body>`);
  writeFileSync(join(dir, name), await page.screenshot({ omitBackground: true }));
}
await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(180, 'icon-180.png');
await render(512, 'icon-maskable-512.png', { maskable: true });
await browser.close();
console.log('icons written');
