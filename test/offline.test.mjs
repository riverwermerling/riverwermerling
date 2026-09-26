// Renders a synthetic "film soundtrack" through the engine in an
// OfflineAudioContext and checks that loud and quiet scenes end up close
// together, with no peaks past the ceiling.
//
// Run: npm test
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const engineSrc = readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');

// [name, seconds, rms dBFS, character]
const SCENES = [
  ['whisper', 5, -44, 'speech'],
  ['explosion', 1.5, -10, 'boom'],
  ['dialogue', 5, -24, 'speech'],
  ['jump scare', 0.6, -4, 'noise'],
  ['quiet dialogue', 5, -36, 'speech'],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addScriptTag({ content: engineSrc });

const results = await page.evaluate(async (scenes) => {
  const SR = 48000;
  const total = scenes.reduce((s, x) => s + x[1], 0);
  const len = Math.ceil(total * SR);

  // Deterministic noise so runs are comparable.
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  const signal = new Float32Array(len);
  let pos = 0;
  const bounds = [];
  for (const [name, secs, db, kind] of scenes) {
    const n = Math.floor(secs * SR);
    const tmp = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if (kind === 'speech') {
        // Band-limited noise with a syllable-rate envelope and short pauses.
        lp += 0.3 * (rand() - lp);
        const syll = Math.max(0, Math.sin(2 * Math.PI * 4 * t));
        const phrase = (t % 2.5) < 2 ? 1 : 0;
        tmp[i] = lp * syll * phrase;
      } else if (kind === 'boom') {
        lp += 0.02 * (rand() - lp);
        tmp[i] = (lp * 6 + 0.3 * rand()) * Math.exp(-t * 1.2);
      } else {
        tmp[i] = rand();
      }
    }
    let sq = 0;
    for (let i = 0; i < n; i++) sq += tmp[i] * tmp[i];
    const scale = Math.pow(10, db / 20) / Math.sqrt(sq / n);
    for (let i = 0; i < n; i++) signal[pos + i] = tmp[i] * scale;
    bounds.push([name, pos, pos + n]);
    pos += n;
  }

  async function render(presetName) {
    const ctx = new OfflineAudioContext(1, len, SR);
    const buf = ctx.createBuffer(1, len, SR);
    buf.copyToChannel(signal, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (!presetName) {
      src.connect(ctx.destination);
    } else {
      const eng = SteadyEngine.createSteadyEngine(ctx, { preset: presetName });
      src.connect(eng.input);
      eng.output.connect(ctx.destination);
      const step = 0.1;
      for (let t = step; t < total; t += step) {
        ctx.suspend(t).then(() => { eng.tick(step); ctx.resume(); });
      }
    }
    src.start();
    const out = await ctx.startRendering();
    return out.getChannelData(0);
  }

  // Loudness of each scene as heard: RMS over the non-silent 200 ms windows,
  // skipping the start so the measurement reflects the scene, not the
  // transition into it.
  function measure(data) {
    return bounds.map(([name, a, b]) => {
      const start = a + Math.floor(Math.min(0.3, (b - a) / SR / 4) * SR);
      const win = Math.floor(0.2 * SR);
      let sq = 0, n = 0, peak = 0;
      for (let w = start; w + win <= b; w += win) {
        let s = 0;
        for (let i = w; i < w + win; i++) s += data[i] * data[i];
        if (s / win > 1e-7) { sq += s; n += win; }
      }
      for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(data[i]));
      const rms = n ? 20 * Math.log10(Math.sqrt(sq / n)) : -120;
      return { name, rmsDb: +rms.toFixed(1), peakDb: +(20 * Math.log10(peak)).toFixed(1) };
    });
  }

  const out = { dry: measure(await render(null)) };
  for (const p of Object.keys(SteadyEngine.PRESETS)) out[p] = measure(await render(p));
  return out;
}, SCENES);

await browser.close();

const spread = (rows) => {
  const v = rows.map((r) => r.rmsDb);
  return Math.max(...v) - Math.min(...v);
};

for (const [label, rows] of Object.entries(results)) {
  console.log(`\n${label.toUpperCase()}  (loudest-to-quietest gap: ${spread(rows).toFixed(1)} dB)`);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(15)} ${String(r.rmsDb).padStart(6)} dB avg   ${String(r.peakDb).padStart(6)} dB peak`);
  }
}

const dryGap = spread(results.dry);
const { PRESETS } = await (async () => {
  globalThis.eval(engineSrc);
  return globalThis.SteadyEngine;
})();

for (const [name, preset] of Object.entries(PRESETS)) {
  const rows = results[name];
  const gap = spread(rows);
  const maxPeak = Math.max(...rows.map((r) => r.peakDb));
  assert.ok(gap < dryGap * 0.6, `${name}: gap ${gap.toFixed(1)} dB should be well under dry ${dryGap.toFixed(1)} dB`);
  assert.ok(maxPeak <= preset.ceilingDb + 1.5, `${name}: peak ${maxPeak} dB exceeds ceiling ${preset.ceilingDb} dB`);
}
// The main promise: Night mode keeps the whole film within a narrow window.
assert.ok(spread(results.night) <= 12, `night gap ${spread(results.night).toFixed(1)} dB should be <= 12 dB`);

console.log('\nAll offline checks passed.');
