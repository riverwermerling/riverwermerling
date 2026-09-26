// Loads the unpacked extension into Chromium and checks it behaves on real
// pages: captures same-origin media, leaves cross-origin media alone (so it
// is never muted), and follows the on/off switch in the popup.
//
// Run: npm test
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Test the built Chromium package, exactly as it would ship.
const extensionPath = fileURLToPath(new URL('../dist/chromium', import.meta.url));

// Two seconds of a quiet 440 Hz tone, as a WAV file.
function toneWav() {
  const sr = 22050, n = sr * 2;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(3000 * Math.sin(2 * Math.PI * 440 * i / sr)), 44 + i * 2);
  return buf;
}
const wav = toneWav();

function serve(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler).listen(0, '127.0.0.1', () => resolve(server));
  });
}

const other = await serve((req, res) => {
  res.writeHead(200, { 'content-type': 'audio/wav' });
  res.end(wav);
});
const otherOrigin = `http://127.0.0.1:${other.address().port}`;

const main = await serve((req, res) => {
  if (req.url === '/tone.wav') {
    res.writeHead(200, { 'content-type': 'audio/wav' });
    return res.end(wav);
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(`<!doctype html>
    <audio id="local" src="/tone.wav" loop></audio>
    <audio id="remote" src="${otherOrigin}/tone.wav" loop></audio>
    <button id="play-local" onclick="document.getElementById('local').play()">local</button>
    <button id="play-remote" onclick="document.getElementById('remote').play()">remote</button>`);
});
const mainOrigin = `http://127.0.0.1:${main.address().port}`;

const userDataDir = mkdtempSync(join(tmpdir(), 'steady-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium',
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

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

try {
  const extensionId = await (async () => {
    // No background worker; find the ID from the extensions page instead.
    const p = await context.newPage();
    await p.goto('chrome://extensions');
    const id = await p.evaluate(async () => {
      const all = await chrome.management.getAll();
      return all.find((e) => e.name === 'Steady Volume')?.id;
    });
    await p.close();
    return id;
  })();
  assert.ok(extensionId, 'extension should load');

  await check('welcome page opens on install and shows ready (no extra step on Chromium)', async () => {
    const url = `chrome-extension://${extensionId}/welcome/welcome.html`;
    const welcome = context.pages().find((p) => p.url() === url)
      || await context.waitForEvent('page', { predicate: (p) => p.url() === url, timeout: 5000 });
    await welcome.waitForFunction(() => !document.getElementById('ready').hidden, null, { timeout: 5000 });
    assert.equal(await welcome.isHidden('#needs-access'), true);
  });

  const page = await context.newPage();
  await page.goto(mainOrigin);

  await check('same-origin media is captured after the user presses play', async () => {
    await page.click('#play-local');
    await page.waitForFunction(() => document.getElementById('local').dataset.steady === 'on', null, { timeout: 5000 });
  });

  await check('captured media keeps playing', async () => {
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => document.getElementById('local').currentTime);
    assert.ok(t > 0.1, `currentTime ${t}`);
  });

  await check('cross-origin media is left alone so it is never muted', async () => {
    await page.click('#play-remote');
    await page.waitForFunction(() => document.getElementById('remote').dataset.steady === 'skipped', null, { timeout: 5000 });
    const paused = await page.evaluate(() => document.getElementById('remote').paused);
    assert.equal(paused, false);
  });

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);

  await check('popup starts On with Balanced selected', async () => {
    await popup.waitForFunction(() => document.querySelector('input[value="balanced"]').checked);
    assert.equal(await popup.getAttribute('#power', 'aria-checked'), 'true');
  });

  await check('switching Off in the popup bypasses processing on the page', async () => {
    await popup.click('#power');
    await page.waitForFunction(() => document.getElementById('local').dataset.steady === 'off', null, { timeout: 5000 });
  });

  await check('switching back On resumes processing', async () => {
    await popup.click('#power');
    await page.waitForFunction(() => document.getElementById('local').dataset.steady === 'on', null, { timeout: 5000 });
  });

  await check('choosing a preset is remembered', async () => {
    await popup.click('input[value="night"]');
    await popup.reload();
    await popup.waitForFunction(() => document.querySelector('input[value="night"]').checked, null, { timeout: 5000 });
  });

  await check('no errors from the extension in the page console', async () => {
    const errors = [];
    const p = await context.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await p.goto(mainOrigin);
    await p.click('#play-local');
    await p.waitForFunction(() => document.getElementById('local').dataset.steady === 'on');
    assert.deepEqual(errors, []);
    await p.close();
  });
} finally {
  await context.close();
  main.close();
  other.close();
  rmSync(userDataDir, { recursive: true, force: true });
}

console.log('\nExtension checks:\n' + checks.join('\n'));
if (process.exitCode) console.log('\nSome extension checks failed.');
else console.log('\nAll extension checks passed.');
