// Browser end-to-end test (needs Playwright + Chromium; skipped when unavailable).
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  /* skip below */
}
const skip = !chromium && 'playwright not installed';

test('end to end: learn, fix a mistake, blitz, browse', { skip, timeout: 120000 }, async () => {
  const server = await serve(4190);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const url = 'http://localhost:4190/';

  try {
    await page.goto(`${url}#/`);
    await page.waitForSelector('.hero');
    await page.click('a[href="#/review"]');

    // Session 1: study each new card, then type the answer exactly as shown.
    let done = 0;
    for (let guard = 0; guard < 60; guard++) {
      await page.waitForSelector('.study, .panel.center h1', { timeout: 5000 });
      if (await page.$('.panel.center h1')) break;
      const forms = await page.$$eval('.study td.form', (els) => els.map((e) => e.textContent));
      const answer = await page.$eval('.study', (e) => e.dataset.answer);
      const aux = await page.$eval('.study', (e) => e.dataset.aux);
      await page.click('[data-act=test]');
      await page.waitForSelector('input.ans');
      const inputs = await page.$$('input.ans');
      if (forms.length) for (let i = 0; i < inputs.length; i++) await inputs[i].fill(forms[i]);
      else await inputs[0].fill(answer);
      if (aux) await page.check(`input[name=aux][value="${aux}"]`);
      await page.click('#check-btn');
      await page.waitForSelector('#fb .ok-msg');
      await page.click('#check-btn'); // Continue
      done++;
    }
    assert.ok(done >= 10, `expected a full session, got ${done} cards`);
    assert.match(await page.textContent('.panel.center h1'), /Session complete/);

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('frdrill.v1')));
    assert.ok(Object.keys(saved.cards).length >= 10, 'cards persisted');
    assert.ok(Object.values(saved.cards).every((c) => c.state === 'learning' || c.state === 'review'));

    // Session 2: make cards due, answer wrong, then fix by retyping
    await page.evaluate(async () => {
      const m = await import('/js/store.js');
      Object.values(m.state.cards).forEach((c) => (c.due = Date.now() - 1000));
      m.state.daily.newIntroduced = 99;
      m.touch();
    });
    await page.goto(`${url}#/learn`);
    await page.goto(`${url}#/`);
    await page.click('a[href="#/review"]');
    await page.waitForSelector('#answer-form input.ans');
    await page.fill('input.ans', 'zzz');
    await page.press('input.ans', 'Enter').catch(() => {});
    await page.click('#check-btn').catch(() => {});
    await page.waitForSelector('.answer-key');
    const keyText = await page.$eval('.answer-key b', (e) => e.textContent);
    await page.fill('input.ans[data-fix]', keyText);
    await page.click('#check-btn');
    await page.waitForSelector('#fb .fixed-msg');

    // Blitz: a deliberately wrong answer shows the right one and is recorded
    await page.goto(`${url}#/blitz?tense=present`);
    await page.waitForSelector('#blitz-form');
    await page.fill('input.ans', 'zzz');
    await page.press('input.ans', 'Enter');
    await page.waitForSelector('#bfb .bad-msg');
    const forms = await page.evaluate(() => JSON.parse(localStorage.getItem('frdrill.v1')).forms);
    // pending writes are debounced
    await page.waitForTimeout(300);
    assert.ok(Object.keys(await page.evaluate(() => JSON.parse(localStorage.getItem('frdrill.v1')).forms)).length >= 1 || Object.keys(forms).length >= 1);

    // Every other screen renders without errors
    for (const r of ['learn', 'learn/present', 'learn/subjonctif', 'verbs', 'verb/aller', 'verb/se-lever', 'vocab', 'stats', 'settings']) {
      await page.goto(`${url}#/${r}`);
      await page.waitForSelector('#app h1');
    }
    assert.match(await page.textContent('#app h1'), /Settings/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
