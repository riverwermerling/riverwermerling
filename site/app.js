(function () {
  'use strict';

  const config = window.STEADY_CONFIG || {};
  const guides = window.TV_GUIDES || [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Sending data ------------------------------------------------------

  // Sign-ups and feedback. Without an endpoint (testing), keep them in this
  // browser only so nothing is lost during a demo and nothing leaves it.
  async function send(record) {
    const payload = { ...record, at: new Date().toISOString(), page: location.pathname };
    if (!config.signupEndpoint) {
      try {
        const saved = JSON.parse(localStorage.getItem('steady-signups') || '[]');
        saved.push(payload);
        localStorage.setItem('steady-signups', JSON.stringify(saved));
      } catch (e) { /* private mode: fine for a demo */ }
      console.info('[Steady] No signupEndpoint set; kept locally:', payload);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(config.signupEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // Fire-and-forget interest signals (button clicks) for the demand test.
  function track(event, data) {
    if (!config.signupEndpoint) return;
    send({ type: 'event', event, ...data }).catch(() => {});
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track);
  });

  // ---- Nav + reveal ------------------------------------------------------

  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  // ---- Hero graph --------------------------------------------------------

  // A made-up film soundtrack that loops: talking, a whisper, an explosion,
  // talking, a jump-scare. The line shows roughly what Steady Volume does.
  const SCENES = [
    { name: 'Talking', secs: 3.2, db: -26, wobble: 5, speed: 5 },
    { name: 'Whispering', secs: 3.4, db: -43, wobble: 4, speed: 4 },
    { name: 'Explosion', secs: 2.2, db: -5, decay: 9, wobble: 2, speed: 9 },
    { name: 'Talking', secs: 3.0, db: -24, wobble: 5, speed: 5 },
    { name: 'Jump scare', secs: 1.0, db: -3, decay: 14, wobble: 1, speed: 12 },
    { name: 'Quiet scene', secs: 3.2, db: -38, wobble: 4, speed: 3 },
  ];
  const LOOP = SCENES.reduce((a, s) => a + s.secs, 0);

  function sceneAt(t) {
    let x = ((t % LOOP) + LOOP) % LOOP;
    for (const s of SCENES) {
      if (x < s.secs) return { scene: s, into: x };
      x -= s.secs;
    }
    return { scene: SCENES[0], into: 0 };
  }

  // Film level (dBFS) at time t, and what you'd hear.
  function filmDb(t) {
    const { scene, into } = sceneAt(t);
    const syll = Math.sin(t * scene.speed) * 0.6 + Math.sin(t * scene.speed * 2.3 + 1) * 0.4;
    let db = scene.db + syll * scene.wobble;
    if (scene.decay) db -= into * scene.decay;
    return db;
  }

  function heardDb(t) {
    // Loud and quiet both pulled towards a comfortable -24 dB, with a hard
    // ceiling, smoothed a little like the real leveler.
    let acc = 0;
    for (let i = 0; i < 6; i++) {
      const f = filmDb(t - i * 0.05);
      acc += -24 + (f + 24) * 0.2;
    }
    return Math.min(acc / 6, -17);
  }

  const canvas = $('#hero-graph');
  const label = $('#scene-label');
  if (canvas) {
    const g = canvas.getContext('2d');
    const WINDOW = 10; // seconds visible
    const DB_MIN = -58;
    const DB_MAX = 0;
    let colors = readColors();
    let visible = true;
    let lastScene = null;
    const start = performance.now();

    function readColors() {
      const css = getComputedStyle(document.documentElement);
      return {
        in: css.getPropertyValue('--line-in').trim(),
        out: css.getPropertyValue('--accent').trim(),
        grid: css.getPropertyValue('--border').trim(),
      };
    }
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { colors = readColors(); });

    function size() {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener('resize', size);
    size();

    const y = (db, h) => 6 + (1 - (Math.min(Math.max(db, DB_MIN), DB_MAX) - DB_MIN) / (DB_MAX - DB_MIN)) * (h - 12);

    function draw(now) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const t = reducedMotion ? 12.5 : (now - start) / 1000 + 6;
      g.clearRect(0, 0, w, h);

      g.strokeStyle = colors.grid;
      g.lineWidth = 1;
      g.setLineDash([3, 5]);
      for (const db of [-40, -24, -8]) {
        const yy = Math.round(y(db, h)) + 0.5;
        g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
      }
      g.setLineDash([]);

      const step = WINDOW / Math.max(60, Math.floor(w / 3));
      const pts = [];
      for (let s = t - WINDOW; s <= t + 1e-6; s += step) {
        const x = ((s - (t - WINDOW)) / WINDOW) * w;
        pts.push([x, y(filmDb(s), h), y(heardDb(s), h)]);
      }

      // Film: soft area.
      g.beginPath();
      g.moveTo(0, h);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.lineTo(w, h);
      g.closePath();
      g.globalAlpha = 0.5;
      g.fillStyle = colors.in;
      g.fill();
      g.globalAlpha = 1;

      // What you hear: crisp line.
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[2]) : g.moveTo(p[0], p[2])));
      g.strokeStyle = colors.out;
      g.lineWidth = 3;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke();

      // Current scene, named at the leading edge.
      const { scene } = sceneAt(t);
      if (scene !== lastScene) {
        lastScene = scene;
        label.classList.remove('show');
        setTimeout(() => {
          label.textContent = scene.name;
          label.classList.add('show');
        }, reducedMotion ? 0 : 120);
      }

      if (!reducedMotion && visible) requestAnimationFrame(draw);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const was = visible;
        visible = entry.isIntersecting;
        if (visible && !was && !reducedMotion) requestAnimationFrame(draw);
      }).observe(canvas);
    }
    requestAnimationFrame(draw);
  }

  // ---- TV guide ----------------------------------------------------------

  const brandsEl = $('#brands');
  const guideEl = $('#guide');

  function renderBrands() {
    guides.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'brand-btn';
      btn.role = 'tab';
      btn.id = `tab-${b.id}`;
      btn.textContent = b.name;
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-controls', 'guide');
      btn.tabIndex = i === 0 ? 0 : -1;
      btn.addEventListener('click', () => select(b.id, true));
      brandsEl.appendChild(btn);
    });

    // Arrow keys move between brands, as in any tab list.
    brandsEl.addEventListener('keydown', (e) => {
      const tabs = [...brandsEl.children];
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        next.focus();
        next.click();
      }
    });
  }

  function select(id, byUser) {
    const b = guides.find((x) => x.id === id);
    if (!b) return;
    for (const btn of brandsEl.children) {
      const on = btn.id === `tab-${id}`;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    }
    guideEl.setAttribute('aria-labelledby', `tab-${id}`);
    guideEl.innerHTML = `
      <div class="guide-content">
        <div class="guide-head">
          <h3>${b.name}</h3>
          ${b.setting ? `<span class="setting-chip">Look for: ${b.setting}</span>` : ''}
        </div>
        ${b.note ? `<p class="guide-note">${b.note}</p>` : ''}
        <ol class="guide-steps">${b.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        ${b.extra ? `<p class="guide-extra">${b.extra}</p>` : ''}
        <div class="guide-feedback">
          <p>Did this work?</p>
          <button type="button" class="button ghost" data-worked="yes">Yes, it helped</button>
          <button type="button" class="button ghost" data-worked="no">Not quite</button>
        </div>
      </div>`;
    guideEl.querySelectorAll('[data-worked]').forEach((btn) => {
      btn.addEventListener('click', () => onFeedback(b, btn.dataset.worked === 'yes'));
    });
    if (byUser) track('guide_view', { brand: id });
  }

  function onFeedback(brand, worked) {
    send({ type: 'guide_feedback', brand: brand.id, worked }).catch(() => {});
    const box = guideEl.querySelector('.guide-feedback');
    box.innerHTML = worked
      ? '<p class="guide-thanks">Wonderful. Enjoy the film.</p>'
      : '<p class="guide-thanks">Thanks for telling us. Built-in settings often aren&rsquo;t enough, which is exactly why we&rsquo;re making the <a href="#box">Steady Box</a>.</p>';
  }

  if (brandsEl && guideEl) renderBrands();

  // ---- Steady Box reservation -------------------------------------------

  const priceEl = $('#price');
  if (priceEl) priceEl.textContent = config.boxPrice || '';

  const form = $('#signup');
  const thanks = $('#thanks');
  const tvSelect = form && form.querySelector('select[name="tv"]');
  if (tvSelect) {
    for (const b of guides.filter((x) => x.id !== 'other')) tvSelect.add(new Option(b.name, b.id));
    tvSelect.add(new Option('Another brand', 'other'));
    tvSelect.add(new Option('Not sure', 'unsure'));
  }

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = !msg;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = $('#signup-error');
      const email = form.email.value.trim();
      const who = form.querySelector('input[name="for"]:checked');
      form.email.setAttribute('aria-invalid', String(!EMAIL.test(email)));
      if (!EMAIL.test(email)) {
        showError(errorEl, 'Please enter a valid email address.');
        form.email.focus();
        return;
      }
      if (!who) {
        showError(errorEl, 'Please choose who it’s for.');
        form.querySelector('input[name="for"]').focus();
        return;
      }
      showError(errorEl, '');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Reserving…';
      try {
        await send({ type: 'box_reservation', email, for: who.value, tv: tvSelect.value, price: config.boxPrice });
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      } catch (err) {
        showError(errorEl, 'Sorry, that didn’t go through. Please check your connection and try again.');
        button.disabled = false;
        button.textContent = 'Reserve my place';
      }
    });
  }

  // ---- Extension beta dialog --------------------------------------------

  const dialog = $('#beta');
  const betaForm = $('#beta-form');
  const betaThanks = $('#beta-thanks');
  const openBeta = $('#beta-open');

  if (dialog && openBeta) {
    openBeta.addEventListener('click', () => {
      betaForm.hidden = false;
      betaThanks.hidden = true;
      dialog.showModal();
    });
    $('#beta-close').addEventListener('click', () => dialog.close());
    $('#beta-done').addEventListener('click', () => dialog.close());
    // Click outside the card closes it.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

    betaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = $('#beta-error');
      const email = betaForm.email.value.trim();
      betaForm.email.setAttribute('aria-invalid', String(!EMAIL.test(email)));
      if (!EMAIL.test(email)) {
        showError(errorEl, 'Please enter a valid email address.');
        betaForm.email.focus();
        return;
      }
      showError(errorEl, '');
      const button = betaForm.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await send({ type: 'extension_beta', email });
        betaForm.hidden = true;
        betaThanks.hidden = false;
        $('#beta-done').focus();
      } catch (err) {
        showError(errorEl, 'Sorry, that didn’t go through. Please try again.');
      } finally {
        button.disabled = false;
      }
    });
  }
})();
