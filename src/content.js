/*
 * Steady Volume — content script.
 *
 * Runs in every page and frame. Finds <video> and <audio> elements as they
 * play and routes their sound through the Steady engine. No setup: if the
 * extension is installed and switched on, it just works.
 *
 * Browser rules that shape this file (each one, ignored, means silence):
 *
 *  - Autoplay: an AudioContext cannot start until the user has interacted with
 *    the page. Capturing a media element into a suspended context would mute
 *    it, so we only capture once the context is actually running.
 *
 *  - Cross-origin media: Web Audio outputs silence for media loaded from
 *    another site without CORS. We leave those elements alone.
 *
 *  - Copy protection (DRM/EME): Chrome, Edge and Safari feed Web Audio
 *    silence for protected media, and a captured element can't be released.
 *    So on those browsers we never capture protected media or anything on a
 *    known protected site; Chrome and Edge get "tab mode" from the popup
 *    instead. Firefox allows it, so there we capture as normal once playback
 *    (and so decryption) has actually started.
 */
(function () {
  'use strict';

  if (window.__steadyVolumeLoaded) return;
  window.__steadyVolumeLoaded = true;

  const api = globalThis.browser || globalThis.chrome;
  const { createSteadyEngine, DEFAULT_PRESET } = globalThis.SteadyEngine;
  const { isProtectedHost } = globalThis.SteadySites;

  // Only Firefox has getBrowserInfo; only Firefox lets Web Audio hear DRM media.
  const DRM_IS_SILENT = !(globalThis.browser && browser.runtime && typeof browser.runtime.getBrowserInfo === 'function');

  const TICK_MS = 100;
  const HOST = location.hostname;

  const settings = { enabled: true, preset: DEFAULT_PRESET };
  let learnedProtected = [];
  let loaded = false;
  // Chrome/Edge tab mode is processing this whole tab already.
  let tabModeHere = false;

  const engines = new Map(); // element -> engine
  const waiting = new Set(); // elements waiting for the audio context to start
  let ctx = null;
  let timer = null;
  let lastTick = 0;

  function siteIsProtected() {
    return DRM_IS_SILENT && isProtectedHost(HOST, learnedProtected);
  }

  function audioContext() {
    if (!ctx) {
      // Default ('interactive') latency: the lowest the device offers. Our
      // path adds delay the browser doesn't compensate for, so keeping it
      // small keeps voices in sync with lips.
      ctx = new AudioContext();
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
    // Safari plays HLS playlists natively, and its Web Audio outputs silence
    // for them whatever the origin.
    if (/\.m3u8$/i.test(url.pathname)) return false;
    if (url.origin === location.origin) return true;
    // With a crossorigin attribute the browser only plays it if CORS passed.
    return el.crossOrigin !== null;
  }

  function capture(el) {
    if (!loaded || tabModeHere || engines.has(el) || !settings.enabled) return;
    if (DRM_IS_SILENT && (el.mediaKeys || siteIsProtected())) {
      el.dataset.steady = 'protected';
      if (el.mediaKeys) learnProtected();
      return;
    }
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
    engine.setVolume(el.volume);
    el.addEventListener('volumechange', () => engine.setVolume(el.muted ? 0 : el.volume));
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
    const on = settings.enabled && !tabModeHere;
    for (const [el, engine] of engines) {
      engine.setPreset(settings.preset);
      engine.setEnabled(on);
      if (el.dataset.steady !== 'protected') el.dataset.steady = on ? 'on' : 'off';
    }
    if (on) scan();
  }

  function scan() {
    const playing = [...document.querySelectorAll('video, audio')].filter((el) => !el.paused && el.readyState > 2);
    if (playing.length) checkTabMode().then(() => playing.forEach(capture));
  }

  // Remember this site as copy-protected so every future visit is safe from
  // the first second.
  function learnProtected() {
    if (!DRM_IS_SILENT || isProtectedHost(HOST, learnedProtected)) return;
    learnedProtected = [...learnedProtected, HOST];
    api.storage.local.set({ learnedProtected });
  }

  // Protected media detected. If we'd already captured this element (a site
  // that plays unprotected video first, then protected), its sound is now
  // lost until the page reloads; say so plainly rather than leave silence.
  function onEncrypted(event) {
    const el = event.target;
    if (!(el instanceof HTMLMediaElement) || !DRM_IS_SILENT) return;
    learnProtected();
    if (engines.has(el)) {
      el.dataset.steady = 'protected';
      showReloadNotice();
    } else {
      waiting.delete(el);
      el.dataset.steady = 'protected';
    }
  }

  // 'playing' (sound is actually coming out, and any decryption is set up)
  // does not bubble, but it can be caught on the way down.
  document.addEventListener('playing', (e) => {
    if (e.target instanceof HTMLMediaElement) checkTabMode().then(() => capture(e.target));
  }, true);

  // Asked once, the first time anything plays (not on every page load):
  // is this tab already in Chrome/Edge tab mode, say after navigating?
  // Elsewhere nobody answers and the answer is simply no.
  let tabModeChecked = null;
  function checkTabMode() {
    if (!tabModeChecked) {
      tabModeChecked = api.runtime.sendMessage({ target: 'background', type: 'tab:am-i-captured' })
        .then((res) => { if (res && res.active) tabModeHere = true; })
        .catch(() => {});
    }
    return tabModeChecked;
  }
  document.addEventListener('encrypted', onEncrypted, true);

  // Every user interaction is a chance to start a context the browser held back.
  function onGesture() {
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    else if (waiting.size) flushWaiting();
  }
  for (const type of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(type, onGesture, true);
  }

  Promise.all([
    api.storage.sync.get(settings),
    api.storage.local.get({ learnedProtected: [] }),
  ]).then(([stored, local]) => {
    Object.assign(settings, stored);
    learnedProtected = local.learnedProtected;
    loaded = true;
    applySettings();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.learnedProtected) {
      learnedProtected = changes.learnedProtected.newValue || [];
      return;
    }
    if (area !== 'sync') return;
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.preset) settings.preset = changes.preset.newValue;
    applySettings();
  });

  // ---- In-page notice (rare: only when protection starts mid-playback) ----

  let notice = null;
  function showReloadNotice() {
    // In an embedded player's frame, the notice appears over the player.
    if (notice) return;
    notice = document.createElement('div');
    const shadow = notice.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        .box { position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; max-width: 360px;
          display: flex; gap: 14px; align-items: center; padding: 14px 16px;
          background: #14203a; color: #eef1f6; border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35);
          font: 15px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          animation: in 300ms cubic-bezier(.2,.8,.2,1) both; }
        p { margin: 0; }
        b { display: block; }
        button { flex: none; padding: 9px 14px; border: 0; border-radius: 10px; cursor: pointer;
          background: #45c9b7; color: #06201c; font: inherit; font-weight: 650; }
        @keyframes in { from { opacity: 0; transform: translateY(8px); } }
      </style>
      <div class="box" role="alert">
        <p><b>Sound missing?</b>This video is copy-protected. Reload once and Steady Volume will handle it properly from now on.</p>
        <button type="button">Reload</button>
      </div>`;
    shadow.querySelector('button').addEventListener('click', () => location.reload());
    document.documentElement.appendChild(notice);
  }

  // ---- Status for the popup ----------------------------------------------

  // Before/after loudness of whichever playing element is loudest right now,
  // for the popup's live meter.
  function loudestMeter() {
    let best = null;
    for (const [el, engine] of engines) {
      if (el.paused || !el.isConnected) continue;
      const m = engine.meter();
      if (!best || m.inDb > best.inDb) best = m;
    }
    return best;
  }

  // Frames with active media answer straight away; the top frame always
  // answers, a moment later, so the popup is never left hanging.
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'steady:tabmode') {
      tabModeHere = !!msg.on;
      applySettings();
      return;
    }
    if (!msg || msg.type !== 'steady:status') return;
    const status = () => ({
      host: HOST,
      active: tabModeHere ? 0 : [...engines.keys()].filter((el) => el.isConnected && el.dataset.steady !== 'protected').length,
      skipped: document.querySelectorAll('[data-steady="skipped"]').length,
      waiting: waiting.size,
      protectedSite: siteIsProtected() || document.querySelector('[data-steady="protected"]') !== null,
      needsReload: notice !== null,
      meter: tabModeHere ? null : loudestMeter(),
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
