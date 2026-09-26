(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const $ = (id) => document.getElementById(id);

  const power = $('power');
  const presets = $('presets');
  const presetHint = $('preset-hint');
  const pill = $('pill');
  const pillText = $('pill-text');
  const graphNote = $('graph-note');
  const status = $('status');
  const needsAccess = $('needs-access');

  const PRESETS = ['gentle', 'balanced', 'night'];
  const HINTS = {
    gentle: 'Takes the edge off. The film still sounds like the film.',
    balanced: 'No more reaching for the remote. Best for most people.',
    night: 'Clear voices, soft bangs. For late nights and sensitive ears.',
  };

  const settings = { enabled: true, preset: 'balanced' };

  // ---- Controls ----------------------------------------------------------

  function render() {
    power.setAttribute('aria-checked', String(settings.enabled));
    $('power-title').textContent = settings.enabled ? 'On' : 'Off';
    $('power-hint').textContent = settings.enabled
      ? 'Whispers up, explosions down'
      : 'Playing the original sound';
    document.body.classList.toggle('off', !settings.enabled);
    presets.disabled = !settings.enabled;

    const i = Math.max(0, PRESETS.indexOf(settings.preset));
    presets.querySelector(`input[value="${PRESETS[i]}"]`).checked = true;
    presets.style.setProperty('--i', i);
    setHint(HINTS[PRESETS[i]]);
  }

  function setHint(text) {
    if (presetHint.textContent === text) return;
    if (!presetHint.textContent) {
      presetHint.textContent = text;
      return;
    }
    presetHint.classList.add('fading');
    setTimeout(() => {
      presetHint.textContent = text;
      presetHint.classList.remove('fading');
    }, 160);
  }

  power.addEventListener('click', () => {
    settings.enabled = !settings.enabled;
    api.storage.sync.set({ enabled: settings.enabled });
    render();
  });

  presets.addEventListener('change', (e) => {
    settings.preset = e.target.value;
    api.storage.sync.set({ preset: settings.preset });
    render();
  });

  $('grant').addEventListener('click', async () => {
    // Firefox closes the popup while its prompt is open; the welcome page
    // has the same button for that case.
    if (await SteadyAccess.requestAccess()) {
      needsAccess.hidden = true;
      status.textContent = 'Done. Reload any page that already has a video.';
    }
  });

  // ---- Live graph --------------------------------------------------------

  const canvas = $('graph');
  const g = canvas.getContext('2d');
  const WINDOW_MS = 8000;
  const DB_MIN = -60;
  const DB_MAX = -6;
  const samples = []; // { t, inDb, outDb } or { t, gap: true }
  let colors = readColors();

  function readColors() {
    const css = getComputedStyle(document.documentElement);
    return {
      in: css.getPropertyValue('--line-in').trim(),
      out: css.getPropertyValue('--accent').trim(),
      grid: css.getPropertyValue('--border').trim(),
    };
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
  });

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    g.clearRect(0, 0, w, h);

    // Quiet guide lines at -40, -20 dB.
    g.strokeStyle = colors.grid;
    g.lineWidth = 1;
    g.setLineDash([2, 4]);
    for (const db of [-40, -20]) {
      const y = Math.round(yFor(db, h)) + 0.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.setLineDash([]);

    while (samples.length && samples[0].t < now - WINDOW_MS - 1000) samples.shift();
    const runs = splitRuns(samples);

    for (const run of runs) {
      const pin = run.map((s) => [xFor(s.t, now, w), yFor(s.inDb, h)]);
      const pout = run.map((s) => [xFor(s.t, now, w), yFor(s.outDb, h)]);

      // Film: soft filled area.
      g.beginPath();
      g.moveTo(pin[0][0], h);
      smoothLine(pin, true);
      g.lineTo(pin[pin.length - 1][0], h);
      g.closePath();
      g.globalAlpha = 0.45;
      g.fillStyle = colors.in;
      g.fill();
      g.globalAlpha = 1;

      // You hear: crisp line.
      g.beginPath();
      smoothLine(pout, false);
      g.strokeStyle = colors.out;
      g.lineWidth = 2.5;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke();
    }

    requestAnimationFrame(draw);
  }

  function splitRuns(list) {
    const runs = [];
    let cur = [];
    for (const s of list) {
      if (s.gap) {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      } else {
        cur.push(s);
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs;
  }

  function smoothLine(pts, continuing) {
    if (continuing) g.lineTo(pts[0][0], pts[0][1]);
    else g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    g.lineTo(last[0], last[1]);
  }

  // Samples arrive in bursts; drawing them a moment behind real time keeps
  // the scroll perfectly smooth.
  const LAG_MS = 250;
  const xFor = (t, now, w) => w - ((now - LAG_MS - t) / WINDOW_MS) * w;
  const yFor = (db, h) => {
    const v = Math.min(Math.max(db, DB_MIN), DB_MAX);
    return 4 + (1 - (v - DB_MIN) / (DB_MAX - DB_MIN)) * (h - 8);
  };

  // ---- Talking to the page ----------------------------------------------

  // Tab mode exists only where the browser can capture a tab (Chrome, Edge).
  const CAN_TAB_MODE = !!(api.tabCapture && api.tabCapture.getMediaStreamId);
  const tabmode = $('tabmode');
  const tabmodeTitle = $('tabmode-title');
  const tabmodeBody = $('tabmode-body');
  const tabmodeButton = $('tabmode-button');

  let tabId = null;
  let tabModeOn = false;
  let lastNoteAt = 0;

  function onStatus(page, tab) {
    const now = performance.now();
    tabModeOn = !!(tab && tab.active);
    const m = tabModeOn ? tab.meter : page && page.meter;
    const hearing = m && m.inDb > -90;

    if (hearing) samples.push({ t: now, inDb: m.inDb, outDb: m.outDb });
    else samples.push({ t: now, gap: true });

    renderTabMode(page);

    if (!settings.enabled) {
      setPill('Off', false);
      note('Off: you’re hearing the original mix.');
    } else if (page && page.needsReload && !tabModeOn) {
      setPill('Reload', false);
      note('This video is copy-protected. Reload the page once to fix the sound.');
    } else if (hearing) {
      setPill('Working', true);
      if (now - lastNoteAt > 1200) {
        lastNoteAt = now;
        note(describe());
      }
    } else if (tabModeOn) {
      setPill('On for tab', true);
      note('Play something to see it working.');
    } else if (page && page.protectedSite) {
      setPill('Ready', false);
      note(CAN_TAB_MODE
        ? 'Switch on above to use it on this site.'
        : 'Copy-protected sites can’t be adjusted in this browser yet.');
    } else if (page && page.waiting > 0) {
      setPill('Ready', false);
      note('Click anywhere on the page to start.');
    } else if (page && page.skipped > 0 && !page.active) {
      setPill('Ready', false);
      note('This site’s player can’t be adjusted.');
    } else {
      setPill('Ready', false);
      note('Play a video to see it working.');
    }
  }

  function renderTabMode(page) {
    const show = CAN_TAB_MODE && (tabModeOn || (page && page.protectedSite));
    tabmode.hidden = !show;
    if (!show) return;
    tabmode.classList.toggle('active', tabModeOn);
    if (tabmodeButton.disabled) return; // mid-switch; keep the button as is
    if (tabModeOn) {
      tabmodeTitle.textContent = 'On for this tab';
      tabmodeBody.textContent = 'Stays on until you close the tab. The sharing icon on the tab is Steady Volume.';
      tabmodeButton.textContent = 'Turn off for this tab';
    } else {
      const site = page && page.host ? page.host.replace(/^www\./, '') : 'This site';
      tabmodeTitle.textContent = `${site} needs one click`;
      tabmodeBody.textContent = 'Its videos are copy-protected, so switch Steady Volume on for this tab. Your browser shows a small sharing icon on the tab while it works.';
      tabmodeButton.textContent = 'Turn on for this tab';
    }
  }

  tabmodeButton.addEventListener('click', async () => {
    tabmodeButton.disabled = true;
    try {
      if (tabModeOn) {
        await toBackground({ type: 'tab:stop', tabId });
        api.tabs.sendMessage(tabId, { type: 'steady:tabmode', on: false }).catch(() => {});
      } else {
        tabmodeButton.textContent = 'Switching on…';
        const streamId = await api.tabCapture.getMediaStreamId({ targetTabId: tabId });
        const res = await toBackground({ type: 'tab:start', tabId, streamId });
        if (!res || !res.ok) throw new Error(res && res.error);
        api.tabs.sendMessage(tabId, { type: 'steady:tabmode', on: true }).catch(() => {});
      }
      status.textContent = '';
    } catch (e) {
      status.textContent = 'Couldn’t switch on for this tab. Reload the page and try again.';
    } finally {
      tabmodeButton.disabled = false;
    }
  });

  const toBackground = (msg) => api.runtime.sendMessage({ target: 'background', ...msg });

  // Plain-language summary of the last two seconds.
  function describe() {
    const recent = samples.filter((s) => !s.gap && s.t > performance.now() - 2000);
    if (!recent.length) return 'Holding steady.';
    const diff = recent.reduce((a, s) => a + (s.outDb - s.inDb), 0) / recent.length;
    if (diff > 2) return `Lifting quiet sound by ${Math.round(diff)} dB.`;
    if (diff < -2) return `Taming loud sound by ${Math.round(-diff)} dB.`;
    return 'Holding steady.';
  }

  function setPill(text, live) {
    pillText.textContent = text;
    pill.classList.toggle('live', live);
  }

  function note(text) {
    if (graphNote.textContent !== text) graphNote.textContent = text;
  }

  async function poll() {
    const [page, tab] = await Promise.all([
      api.tabs.sendMessage(tabId, { type: 'steady:status' }).catch(() => null),
      CAN_TAB_MODE ? toBackground({ type: 'tab:status', tabId }).catch(() => null) : null,
    ]);
    if (!page && !(tab && tab.active)) {
      // Browser pages, the web store, or a tab opened before install.
      onStatus(null, null);
      note('Nothing to adjust on this page.');
      status.textContent = 'Opened this page before installing? Reload it once.';
    } else {
      if (status.textContent.startsWith('Opened this page')) status.textContent = '';
      onStatus(page, tab);
    }
    setTimeout(poll, 120);
  }

  // ---- Start -------------------------------------------------------------

  SteadyAccess.hasAccess().then((ok) => {
    needsAccess.hidden = ok;
  });

  api.storage.sync.get(settings).then(async (stored) => {
    Object.assign(settings, stored);
    render();
    // Only animate after the first paint, so the popup opens in place.
    requestAnimationFrame(() => document.body.classList.add('ready'));
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      tabId = tab.id;
      poll();
    }
  });

  sizeCanvas();
  requestAnimationFrame(draw);
})();
