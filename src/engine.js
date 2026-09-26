/*
 * Steady Volume — audio engine.
 *
 * Builds a broadcast-style loudness chain out of plain Web Audio nodes:
 *
 *   input ─┬─ rumble cut ─ dialogue lift ─ leveler ─ compressor ─ makeup ─ limiter ─ wet ─┬─ output
 *          │                   └─ analyser (feeds the leveler)                           │
 *          └──────────────────────────────── dry ─────────────────────────────────────────┘
 *
 * 1. Rumble cut (high-pass) removes the sub-bass that makes explosions feel
 *    like a physical jolt. Speech has almost nothing down there.
 * 2. Dialogue lift (peaking EQ around 2.5 kHz) is where consonants live —
 *    the part of speech older ears lose first.
 * 3. Leveler: a slow automatic gain that brings whispered scenes up and
 *    long loud scenes down. It pauses in silence so it never pumps up
 *    background hiss between lines.
 * 4. Compressor: fast, catches the sudden jump from whisper to shout.
 * 5. Limiter: a hard ceiling. Nothing gets past it, whatever the film does.
 *
 * The dry/wet pair lets us switch processing off without disconnecting the
 * media element (which Web Audio does not allow once it is captured).
 *
 * Works in any BaseAudioContext, including OfflineAudioContext for tests.
 */
(function (root) {
  'use strict';

  const PRESETS = {
    gentle: {
      label: 'Gentle',
      highpassHz: 50,
      presenceDb: 2,
      levelerTargetDb: -28,
      levelerMaxBoostDb: 6,
      levelerMaxCutDb: 6,
      thresholdDb: -26,
      kneeDb: 10,
      ratio: 3,
      makeupDb: 0,
      ceilingDb: -2,
    },
    balanced: {
      label: 'Balanced',
      highpassHz: 80,
      presenceDb: 3,
      levelerTargetDb: -26,
      levelerMaxBoostDb: 12,
      levelerMaxCutDb: 10,
      thresholdDb: -30,
      kneeDb: 8,
      ratio: 6,
      makeupDb: 0,
      ceilingDb: -3,
    },
    night: {
      label: 'Night',
      highpassHz: 120,
      presenceDb: 4.5,
      levelerTargetDb: -26,
      levelerMaxBoostDb: 18,
      levelerMaxCutDb: 14,
      thresholdDb: -34,
      kneeDb: 6,
      ratio: 12,
      makeupDb: 0,
      ceilingDb: -6,
    },
  };

  const DEFAULT_PRESET = 'balanced';

  // Leveler behaviour, shared by all presets.
  const GATE_DB = -55;        // below this we treat it as silence and hold
  const RISE_DB_PER_SEC = 3;  // bring quiet scenes up gently
  const FALL_DB_PER_SEC = 18; // pull loud scenes down quickly
  const LEVEL_SMOOTHING_SEC = 0.4;

  const dbToGain = (db) => Math.pow(10, db / 20);
  const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-9));

  function createSteadyEngine(ctx, options) {
    const opts = options || {};
    let preset = PRESETS[opts.preset] || PRESETS[DEFAULT_PRESET];
    let enabled = opts.enabled !== false;

    const input = ctx.createGain();
    const output = ctx.createGain();

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.Q.value = 0.707;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2500;
    presence.Q.value = 0.8;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    const analyserBuf = new Float32Array(analyser.fftSize);

    const leveler = ctx.createGain();

    const compressor = ctx.createDynamicsCompressor();
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;

    const makeup = ctx.createGain();

    const limiter = ctx.createDynamicsCompressor();
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;

    // The limiter's built-in makeup gain would push output back up; this
    // trims the output so the ceiling is where we say it is.
    const ceiling = ctx.createGain();

    const wet = ctx.createGain();
    const dry = ctx.createGain();

    input.connect(highpass);
    highpass.connect(presence);
    presence.connect(analyser);
    presence.connect(leveler);
    leveler.connect(compressor);
    compressor.connect(makeup);
    makeup.connect(limiter);
    limiter.connect(ceiling);
    ceiling.connect(wet);
    wet.connect(output);
    input.connect(dry);
    dry.connect(output);

    let levelDb = null;
    let levelerDb = 0;

    function applyPreset() {
      const t = ctx.currentTime;
      highpass.frequency.setValueAtTime(preset.highpassHz, t);
      presence.gain.setValueAtTime(preset.presenceDb, t);
      compressor.threshold.setValueAtTime(preset.thresholdDb, t);
      compressor.knee.setValueAtTime(preset.kneeDb, t);
      compressor.ratio.setValueAtTime(preset.ratio, t);
      makeup.gain.setValueAtTime(dbToGain(preset.makeupDb), t);
      limiter.threshold.setValueAtTime(preset.ceilingDb, t);
      ceiling.gain.setValueAtTime(dbToGain(-limiterMakeupDb(preset.ceilingDb)), t);
      levelerDb = Math.min(Math.max(levelerDb, -preset.levelerMaxCutDb), preset.levelerMaxBoostDb);
    }

    function applyEnabled(immediate) {
      const t = ctx.currentTime;
      const tc = immediate ? 0 : 0.05;
      setParam(wet.gain, enabled ? 1 : 0, t, tc);
      setParam(dry.gain, enabled ? 0 : 1, t, tc);
    }

    // Call regularly (~10x a second). dtSec is time since the last call.
    function tick(dtSec) {
      analyser.getFloatTimeDomainData(analyserBuf);
      let sum = 0;
      for (let i = 0; i < analyserBuf.length; i++) sum += analyserBuf[i] * analyserBuf[i];
      const blockDb = gainToDb(Math.sqrt(sum / analyserBuf.length));

      if (blockDb < GATE_DB) return; // silence: hold the current gain

      const a = Math.min(1, dtSec / LEVEL_SMOOTHING_SEC);
      levelDb = levelDb === null ? blockDb : levelDb + a * (blockDb - levelDb);

      const wanted = Math.min(
        Math.max(preset.levelerTargetDb - levelDb, -preset.levelerMaxCutDb),
        preset.levelerMaxBoostDb
      );
      // Anything much louder than the smoothed level is a spike; cut for it
      // immediately rather than waiting for the average to catch up.
      const spikeWanted = Math.max(preset.levelerTargetDb - blockDb, -preset.levelerMaxCutDb);
      if (spikeWanted < levelerDb && blockDb > levelDb + 6) {
        levelerDb = Math.max(spikeWanted, levelerDb - FALL_DB_PER_SEC * dtSec * 3);
      } else if (wanted > levelerDb) {
        levelerDb = Math.min(wanted, levelerDb + RISE_DB_PER_SEC * dtSec);
      } else {
        levelerDb = Math.max(wanted, levelerDb - FALL_DB_PER_SEC * dtSec);
      }
      setParam(leveler.gain, dbToGain(levelerDb), ctx.currentTime, 0.03);
    }

    applyPreset();
    applyEnabled(true);

    return {
      input,
      output,
      tick,
      setPreset(name) {
        if (!PRESETS[name]) return;
        preset = PRESETS[name];
        applyPreset();
      },
      setEnabled(on) {
        enabled = !!on;
        applyEnabled(false);
      },
      get stats() {
        return {
          enabled,
          levelDb,
          levelerDb,
          reductionDb: compressor.reduction + limiter.reduction,
        };
      },
    };
  }

  // The Web Audio spec gives DynamicsCompressorNode automatic makeup gain of
  // (1 / fullRangeGain) ^ 0.6. For a hard-knee limiter at ratio 20 that is:
  function limiterMakeupDb(thresholdDb) {
    const fullRangeDb = thresholdDb + (0 - thresholdDb) / 20;
    return -fullRangeDb * 0.6;
  }

  function setParam(param, value, t, timeConstant) {
    param.cancelScheduledValues(t);
    if (timeConstant > 0) {
      param.setTargetAtTime(value, t, timeConstant);
    } else {
      param.setValueAtTime(value, t);
    }
  }

  root.SteadyEngine = { createSteadyEngine, PRESETS, DEFAULT_PRESET };
})(globalThis);
