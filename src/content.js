/*
 * Steady Volume — content script.
 *
 * Runs in every page and frame. Finds <video> and <audio> elements as they
 * appear and routes their sound through the Steady engine. No setup: if the
 * extension is installed and switched on, it just works.
 *
 * Two browser rules shape this file:
 *
 *  - Autoplay: an AudioContext cannot start until the user has interacted with
 *    the page. Capturing a media element into a suspended context would mute
 *    it, so we only capture once the context is actually running.
 *
 *  - Cross-origin media: Web Audio outputs silence for media loaded from
 *    another site without CORS. Capturing that would mute it, so we leave
 *    those elements alone. Streaming services (Netflix, YouTube, Prime, etc.)
 *    use Media Source blobs, which are fine.
 */
(function () {
  'use strict';

  if (window.__steadyVolumeLoaded) return;
  window.__steadyVolumeLoaded = true;

  const api = globalThis.browser || globalThis.chrome;
  const { createSteadyEngine, DEFAULT_PRESET } = globalThis.SteadyEngine;

  const TICK_MS = 100;

  const settings = { enabled: true, preset: DEFAULT_PRESET };
  const engines = new Map(); // element -> engine
  const waiting = new Set(); // elements waiting for the audio context to start
  let ctx = null;
  let timer = null;
  let lastTick = 0;

  function audioContext() {
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: 'playback' });
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running') flushWaiting();
      });
    }
    return ctx;
  }

  function sourceIsSafe(el) {
    if (el.srcObject) return false; // live streams / calls: not our business
    const src = el.currentSrc || el.src;
    if (!src) return false;
    let url;
    try {
      url = new URL(src, location.href);
    } catch (e) {
      return false;
    }
    if (url.protocol === 'blob:' || url.protocol === 'data:') return true;
    if (url.origin === location.origin) return true;
    // With a crossorigin attribute the browser only plays it if CORS passed.
    return el.crossOrigin !== null;
  }

  function capture(el) {
    if (engines.has(el) || !settings.enabled) return;
    if (!sourceIsSafe(el)) {
      el.dataset.steady = 'skipped';
      return;
    }
    const c = audioContext();
    if (c.state !== 'running') {
      waiting.add(el);
      c.resume().catch(() => {});
      return;
    }
    let source;
    try {
      source = c.createMediaElementSource(el);
    } catch (e) {
      // Already captured by the page's own Web Audio graph. Leave it.
      el.dataset.steady = 'in-use';
      return;
    }
    const engine = createSteadyEngine(c, settings);
    source.connect(engine.input);
    engine.output.connect(c.destination);
    engines.set(el, engine);
    waiting.delete(el);
    el.dataset.steady = 'on';
    startTicking();
  }

  function flushWaiting() {
    for (const el of [...waiting]) {
      waiting.delete(el);
      if (el.isConnected && !el.paused) capture(el);
    }
  }

  function startTicking() {
    if (timer) return;
    lastTick = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, 1);
      lastTick = now;
      if (!settings.enabled) return;
      for (const [el, engine] of engines) {
        if (!el.paused) engine.tick(dt);
      }
    }, TICK_MS);
  }

  function applySettings() {
    for (const [el, engine] of engines) {
      engine.setPreset(settings.preset);
      engine.setEnabled(settings.enabled);
      el.dataset.steady = settings.enabled ? 'on' : 'off';
    }
    if (settings.enabled) scan();
  }

  function onPlay(event) {
    const el = event.target;
    if (el instanceof HTMLMediaElement) capture(el);
  }

  function scan() {
    for (const el of document.querySelectorAll('video, audio')) {
      if (!el.paused) capture(el);
    }
  }

  // Every user interaction is a chance to start a context the browser held back.
  function onGesture() {
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    else if (waiting.size) flushWaiting();
  }

  // 'play' does not bubble, but it can be caught on the way down.
  document.addEventListener('play', onPlay, true);
  document.addEventListener('playing', onPlay, true);
  for (const type of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(type, onGesture, true);
  }

  api.storage.sync.get(settings).then((stored) => {
    Object.assign(settings, stored);
    applySettings();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.preset) settings.preset = changes.preset.newValue;
    applySettings();
  });

  // Status for the popup. Frames with active media answer straight away; the
  // top frame always answers, a moment later, so the popup is never left
  // hanging on a page with no video.
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== 'steady:status') return;
    const status = () => ({
      active: [...engines.keys()].filter((el) => el.isConnected).length,
      skipped: document.querySelectorAll('[data-steady="skipped"]').length,
      waiting: waiting.size,
    });
    if (engines.size) {
      sendResponse(status());
      return;
    }
    if (window === window.top) {
      setTimeout(() => sendResponse(status()), 150);
      return true;
    }
  });
})();
