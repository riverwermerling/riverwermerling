/*
 * Steady Volume — tab mode (Chrome and Edge).
 *
 * Copy-protected sites (Netflix, Disney+ ...) can't be processed from inside
 * the page, so for those the user switches on "tab mode" from the popup.
 * Chrome then hands us the tab's finished sound as a stream, mutes the tab's
 * own output, and we play the stream through the same engine.
 *
 * This hidden page lives as long as at least one tab is in tab mode. It only
 * has access to chrome.runtime, so the background passes settings in.
 */
(function () {
  'use strict';

  const { createSteadyEngine } = globalThis.SteadyEngine;
  const TICK_MS = 100;

  const tabs = new Map(); // tabId -> { stream, source, engine }
  let settings = { enabled: true, preset: 'balanced' };
  let ctx = null;
  let timer = null;

  async function start(tabId, streamId, initial) {
    if (initial) settings = initial;
    if (tabs.has(tabId)) stop(tabId);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
      video: false,
    });

    if (!ctx) ctx = new AudioContext();
    if (ctx.state !== 'running') await ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    const engine = createSteadyEngine(ctx, settings);
    source.connect(engine.input);
    engine.output.connect(ctx.destination);
    tabs.set(tabId, { stream, source, engine });

    // Tab closed, or capture stopped by Chrome: clean up.
    for (const track of stream.getAudioTracks()) {
      track.addEventListener('ended', () => {
        stop(tabId);
        chrome.runtime.sendMessage({ target: 'background', type: 'tab:ended', tabId }).catch(() => {});
      });
    }

    if (!timer) {
      let last = performance.now();
      timer = setInterval(() => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 1);
        last = now;
        if (settings.enabled) for (const t of tabs.values()) t.engine.tick(dt);
      }, TICK_MS);
    }
  }

  function stop(tabId) {
    const t = tabs.get(tabId);
    if (!t) return;
    tabs.delete(tabId);
    t.source.disconnect();
    t.engine.output.disconnect();
    for (const track of t.stream.getTracks()) track.stop();
    if (!tabs.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function applySettings(next) {
    settings = next;
    for (const t of tabs.values()) {
      t.engine.setPreset(settings.preset);
      t.engine.setEnabled(settings.enabled);
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.target !== 'offscreen') return;
    switch (msg.type) {
      case 'start':
        start(msg.tabId, msg.streamId, msg.settings).then(
          () => sendResponse({ ok: true }),
          (e) => sendResponse({ ok: false, error: String(e && e.message || e) })
        );
        return true;
      case 'stop':
        stop(msg.tabId);
        sendResponse({ ok: true, remaining: tabs.size });
        return;
      case 'settings':
        applySettings(msg.settings);
        sendResponse({ ok: true });
        return;
      case 'status': {
        const t = tabs.get(msg.tabId);
        sendResponse({
          active: !!t,
          meter: t ? t.engine.meter() : null,
          // For diagnosing "active but silent" reports.
          audio: ctx ? ctx.state : 'none',
          track: t ? t.stream.getAudioTracks().map((k) => `${k.readyState}${k.muted ? '/muted' : ''}`).join(',') : '',
        });
        return;
      }
    }
  });
})();
