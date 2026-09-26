// Checks the website works end to end: every TV guide renders, forms
// validate and submit, sign-ups reach the backend when one is configured,
// nothing overflows on a phone, and the console stays clean.
//
// Run: npm test
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../site', import.meta.url));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

// Serves the site, plus a fake sign-up backend at /api/signup.
const received = [];
const server = createServer((req, res) => {
  if (req.url === '/api/signup' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push(JSON.parse(body));
      res.writeHead(204).end();
    });
    return;
  }
  let path = join(root, decodeURIComponent(req.url.split('?')[0]));
  if (path.endsWith('/')) path += 'index.html';
  if (!path.startsWith(root) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.on('listening', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push(`  ok   ${name}`);
  } catch (e) {
    checks.push(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}

async function open({ endpoint = '', width = 1280 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Web fonts come from Google; the page must work without them.
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: `window.STEADY_CONFIG = { signupEndpoint: ${JSON.stringify(endpoint)}, boxPrice: '£79' };`,
  }));
  await page.goto(origin + '/');
  return { page, errors };
}

try {
  await check('page loads with no errors and every image loads', async () => {
    const { page, errors } = await open();
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    assert.deepEqual(broken, []);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('every TV brand shows numbered steps', async () => {
    const { page } = await open();
    const ids = await page.evaluate(() => window.TV_GUIDES.map((g) => g.id));
    assert.ok(ids.length >= 8, `${ids.length} brands`);
    for (const id of ids) {
      await page.click(`#tab-${id}`);
      const n = await page.locator('#guide .guide-steps li').count();
      assert.ok(n >= 3, `${id}: ${n} steps`);
      assert.equal(await page.getAttribute(`#tab-${id}`, 'aria-selected'), 'true');
    }
    await page.close();
  });

  await check('arrow keys move between brands', async () => {
    const { page } = await open();
    await page.click('#tab-samsung');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#tab-lg', 'aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getAttribute('#tab-samsung', 'aria-selected'), 'true');
    await page.close();
  });

  await check('reservation form rejects a bad email, then a missing choice', async () => {
    const { page } = await open();
    await page.fill('#signup input[name="email"]', 'not-an-email');
    await page.click('#signup button[type="submit"]');
    assert.match(await page.textContent('#signup-error'), /valid email/);
    await page.fill('#signup input[name="email"]', 'test@example.com');
    await page.click('#signup button[type="submit"]');
    assert.match(await page.textContent('#signup-error'), /who it/);
    assert.equal(await page.isVisible('#thanks'), false);
    await page.close();
  });

  await check('without a backend, a reservation is kept in the browser only', async () => {
    const { page } = await open();
    await page.fill('#signup input[name="email"]', 'local@example.com');
    await page.click('#signup .chips label:has(input[value="parent"])');
    await page.click('#signup button[type="submit"]');
    await page.waitForSelector('#thanks:not([hidden])');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('steady-signups')));
    assert.equal(saved.at(-1).email, 'local@example.com');
    await page.close();
  });

  await check('with a backend, the reservation arrives with all its details', async () => {
    received.length = 0;
    const { page } = await open({ endpoint: origin + '/api/signup' });
    await page.fill('#signup input[name="email"]', 'real@example.com');
    await page.click('#signup .chips label:has(input[value="me"])');
    await page.selectOption('#signup select[name="tv"]', 'lg');
    await page.click('#signup button[type="submit"]');
    await page.waitForSelector('#thanks:not([hidden])');
    const r = received.find((x) => x.type === 'box_reservation');
    assert.ok(r, 'reservation received');
    assert.equal(r.email, 'real@example.com');
    assert.equal(r.for, 'me');
    assert.equal(r.tv, 'lg');
    assert.equal(r.price, '£79');
    await page.close();
  });

  await check('a failing backend shows a friendly retry message', async () => {
    const { page } = await open({ endpoint: origin + '/api/missing' });
    await page.fill('#signup input[name="email"]', 'x@example.com');
    await page.click('#signup .chips label:has(input[value="me"])');
    await page.click('#signup button[type="submit"]');
    await page.waitForFunction(() => !document.getElementById('signup-error').hidden);
    assert.match(await page.textContent('#signup-error'), /try again/);
    assert.equal(await page.isEnabled('#signup button[type="submit"]'), true);
    await page.close();
  });

  await check('TV guide feedback and interest clicks are recorded', async () => {
    received.length = 0;
    const { page } = await open({ endpoint: origin + '/api/signup' });
    await page.click('#tab-sony');
    await page.click('#guide [data-worked="no"]');
    await page.click('.cta-row [data-track="hero_tv"]');
    await page.waitForTimeout(300);
    assert.ok(received.some((x) => x.type === 'guide_feedback' && x.brand === 'sony' && x.worked === false), 'feedback');
    assert.ok(received.some((x) => x.type === 'event' && x.event === 'hero_tv'), 'click event');
    await page.close();
  });

  await check('extension beta dialog opens, validates and thanks', async () => {
    received.length = 0;
    const { page } = await open({ endpoint: origin + '/api/signup' });
    await page.click('#beta-open');
    assert.equal(await page.isVisible('#beta'), true);
    await page.click('#beta-form button[type="submit"]');
    assert.match(await page.textContent('#beta-error'), /valid email/);
    await page.fill('#beta-form input[name="email"]', 'beta@example.com');
    await page.click('#beta-form button[type="submit"]');
    await page.waitForSelector('#beta-thanks:not([hidden])');
    assert.ok(received.some((x) => x.type === 'extension_beta' && x.email === 'beta@example.com'));
    await page.click('#beta-done');
    assert.equal(await page.isVisible('#beta'), false);
    await page.close();
  });

  await check('nothing overflows sideways on a phone', async () => {
    const { page } = await open({ width: 360 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.equal(overflow, 0);
    await page.close();
  });

  await check('content is visible without JavaScript', async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.goto(origin + '/');
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length);
    assert.equal(hidden, 0);
    await page.close();
  });
} finally {
  await browser.close();
  server.close();
}

console.log('\nSite checks:\n' + checks.join('\n'));
console.log(process.exitCode ? '\nSome site checks failed.' : '\nAll site checks passed.');
