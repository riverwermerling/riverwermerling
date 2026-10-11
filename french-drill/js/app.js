import * as store from './store.js';
import { state, dueCards, newAllowance, stats, weakSpots } from './store.js';
import { TENSES, tenseById, PERSONS, conjugate, personsFor, subjectLabel, fullForm, hasTense } from './conjugate.js';
import { VERBS, verbById } from './verbs.js';
import { VOCAB, VOCAB_CATEGORIES } from './vocab.js';
import { LESSONS, lessonById } from './lessons.js';
import { INTENSITY } from './srs.js';
import { render, esc, $, $$, toast, speakBtn } from './ui.js';
import * as session from './session.js';
import * as blitz from './blitz.js';
import * as sync from './sync.js';
import * as push from './push.js';

store.load();
session.bind();
blitz.bind();

let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
});

// ---------- routing ----------
const routes = [
  [/^$/, () => home()],
  [/^review$/, () => (blitz.abort(), session.start())],
  [/^blitz$/, (_, q) => (session.abort(), blitz.start(q.get('tense') || 'all'))],
  [/^learn$/, () => learn()],
  [/^learn\/([\w-]+)$/, (m) => lesson(m[1])],
  [/^verbs$/, () => verbList()],
  [/^verb\/([\w-]+)$/, (m) => verbPage(m[1])],
  [/^vocab$/, () => vocabList()],
  [/^stats$/, () => statsView()],
  [/^settings$/, () => settingsView()],
];

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  const live = /^(review|blitz)$/.test(path);
  if (!live) (session.abort(), blitz.abort());
  store.refreshDay();
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      fn(m, q);
      break;
    }
  }
  const tab = path.split('/')[0];
  $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (tab === 'verbs' || tab === 'verb' || tab === 'vocab' ? 'learn' : tab)));
  document.body.classList.toggle('immersive', live);
  updateHeader();
}
window.addEventListener('hashchange', route);

function updateHeader() {
  const el = $('#streak-chip');
  if (el) {
    el.textContent = `🔥 ${state.streak.count}`;
    el.title = `${state.streak.count}-day streak`;
  }
  push.setBadge(dueCards().length);
}

// ---------- home ----------
function home() {
  const due = dueCards().length;
  const allowance = newAllowance();
  const avail = Math.min(allowance, store.newCandidates(allowance).length);
  const total = due + avail;
  const goal = state.settings.dailyGoal;
  const pct = Math.min(100, Math.round((state.daily.reviews / goal) * 100));
  const weak = weakSpots(6);
  const first = !Object.keys(state.cards).length;
  const needMethod = !state.seenLessons.includes('method');
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  render(`
  <section class="panel hero">
    <p class="eyebrow">${hi} 👋</p>
    <h1>${first ? 'Let’s start drilling' : total ? `${total} card${total === 1 ? '' : 's'} to drill` : 'You’re all caught up'}</h1>
    <p class="sub">${due} due · ${avail} new today · ${state.daily.reviews}/${goal} daily goal</p>
    <div class="progress goal" aria-label="Daily goal"><i style="width:${pct}%"></i></div>
    ${total ? '<a class="btn primary big" href="#/review">Start session</a>' : '<a class="btn primary big" href="#/blitz?tense=all">Speed drill (Blitz)</a>'}
    ${!total ? '<button class="btn" data-more="1">Learn 6 more new cards</button>' : ''}
  </section>

  ${needMethod ? `<a class="panel link" href="#/learn/method"><b>📖 How to drill (2 min read)</b><span>Why you type everything, and how the schedule works.</span></a>` : ''}

  <section class="panel">
    <h2>⚡ Blitz <small>${state.settings.blitzSeconds}s speed rounds</small></h2>
    <p class="sub">Single forms inside a sentence. Makes the table automatic.</p>
    <div class="chips">${blitz.blitzModes().map((m) => `<a class="chip pick" href="#/blitz?tense=${m.id}">${esc(m.label)}</a>`).join('')}</div>
  </section>

  ${weak.length ? `<section class="panel"><h2>🎯 Weak spots</h2><ul class="weak">${weak.map(weakRow).join('')}</ul><a class="btn" href="#/blitz?tense=weak">Drill these</a></section>` : ''}

  ${reminderPrompt()}
  `);
}

const weakRow = (f) => {
  const [vid, tense, p] = f.key.split('|');
  const v = verbById(vid);
  if (!v) return '';
  return `<li><span><b>${esc(v.label)}</b> · ${esc(tenseById(tense).fr)} · ${esc(PERSONS[+p])}</span><em>${f.w}✗ / ${f.n}</em></li>`;
};

function reminderPrompt() {
  if (state.settings.pushOn) return '';
  return `<a class="panel link" href="#/settings"><b>🔔 Turn on study reminders</b><span>${sync.configured() ? 'Get a nudge morning and evening so the schedule actually happens.' : 'Connect Supabase to enable push reminders (see README).'}</span></a>`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-more]')) {
    store.addExtraNew(6);
    if (location.hash === '#/review') route();
    else location.hash = '#/review';
  }
});

// ---------- learn ----------
function learn() {
  const progress = TENSES.map((t) => {
    const cards = Object.values(state.cards).filter((c) => c.kind === 'conj' && c.tense === t.id);
    const total = VERBS.filter((v) => hasTense(v, t.id)).length;
    return { t, known: cards.filter((c) => c.state === 'review').length, started: cards.length, total };
  });
  render(`
  <h1 class="page">Learn</h1>
  <section class="panel"><h2>Guides</h2><ul class="list">
    ${LESSONS.map((l) => `<li><a href="#/learn/${l.id}"><b>${esc(l.title)}</b><span>${esc(l.blurb)}</span></a>${state.seenLessons.includes(l.id) ? '<i class="tick" title="Read">✓</i>' : ''}</li>`).join('')}
  </ul></section>
  <section class="panel"><h2>Tense progress</h2><ul class="bars">
    ${progress.map(({ t, known, started, total }) => `<li><span>${esc(t.fr)}</span><div class="bar"><i class="a" style="width:${(started / total) * 100}%"></i><i class="b" style="width:${(known / total) * 100}%"></i></div><em>${known}/${total}</em></li>`).join('')}
  </ul><p class="sub">Solid bar = graduated to long-term review · light = started.</p></section>
  <section class="panel two"><a class="btn" href="#/verbs">📚 Verb library <small>${VERBS.length}</small></a><a class="btn" href="#/vocab">🗂️ Vocabulary <small>${VOCAB.length}</small></a></section>`);
}

function lesson(id) {
  const l = lessonById(id);
  if (!l) return (location.hash = '#/learn');
  store.markLessonSeen(id);
  render(`<a class="back" href="#/learn">← Learn</a><article class="panel lesson"><h1>${esc(l.title)}</h1><p class="sub">${esc(l.blurb)}</p>${l.html}
  ${l.tense ? `<div class="stack"><a class="btn primary" href="#/blitz?tense=${l.tense}">Blitz ${esc(tenseById(l.tense).fr)}</a></div>` : ''}</article>`);
}

// ---------- verbs ----------
function verbList() {
  render(`<a class="back" href="#/learn">← Learn</a><h1 class="page">Verb library</h1>
  <input id="vq" class="search" type="search" placeholder="Search verbs (aller, to go…)" autocomplete="off" aria-label="Search verbs">
  <ul class="list verbs" id="vlist"></ul>`);
  const draw = (q = '') => {
    const n = q.trim().toLowerCase();
    $('#vlist').innerHTML = VERBS.filter((v) => !n || v.label.includes(n) || v.inf.includes(n) || v.en.toLowerCase().includes(n))
      .map((v) => `<li><a href="#/verb/${v.id}"><b>${esc(v.label)}</b><span>${esc(v.en)}</span></a>${v.irregular ? '<i class="tag">irr.</i>' : ''}${(v.aux === 'être' || v.refl) ? '<i class="tag etre">être</i>' : ''}</li>`)
      .join('') || '<li class="empty">No match</li>';
  };
  draw();
  $('#vq').addEventListener('input', (e) => draw(e.target.value));
}

function verbPage(id) {
  const v = verbById(id);
  if (!v) return (location.hash = '#/verbs');
  render(`<a class="back" href="#/verbs">← Verbs</a>
  <section class="panel"><h1>${esc(v.label)} ${speakBtn(v.label)}</h1><p class="sub">${esc(v.en)}</p>
  <p class="ex"><b>${esc(v.ex)}</b> ${speakBtn(v.ex)}<br><span>${esc(v.exEn)}</span></p>
  <p class="how">Helper: <b>${esc(v.refl ? 'être (reflexive)' : v.aux ?? 'avoir')}</b> · Past participle: <b>${esc(conjugate(v, 'passe_compose')[2].split(' ').pop().replace('(e)', ''))}</b></p>
  ${v.note ? `<p class="note">${v.note}</p>` : ''}</section>
  ${TENSES.filter((t) => hasTense(v, t.id)).map((t, i) => {
    const forms = conjugate(v, t.id);
    return `<details class="panel tense-block" ${i === 0 ? 'open' : ''}><summary><b>${esc(t.fr)}</b> <small>${esc(t.en)}</small></summary>
    <table class="forms">${personsFor(t.id).map((p) => `<tr><td class="subj">${esc(subjectLabel(t.id, p, forms[p]))}</td><td class="form">${esc(forms[p])}</td><td>${speakBtn(fullForm(t.id, p, forms[p]))}</td></tr>`).join('')}</table></details>`;
  }).join('')}`);
}

function vocabList() {
  render(`<a class="back" href="#/learn">← Learn</a><h1 class="page">Vocabulary</h1>
  ${VOCAB_CATEGORIES.map((cat) => `<section class="panel"><h2>${esc(cat)}</h2><ul class="vocab">${VOCAB.filter((w) => w.cat === cat).map((w) => {
    const c = state.cards[store.cardId.vocab(w.id)];
    return `<li class="${c ? c.state : 'new'}"><span><b>${esc(w.fr)}</b> <em>${esc(w.en)}</em></span>${speakBtn(w.fr)}</li>`;
  }).join('')}</ul></section>`).join('')}`);
}

// ---------- stats ----------
function statsView() {
  const s = stats();
  const max = Math.max(1, ...s.days.map((d) => d.n));
  const fmax = Math.max(1, ...s.forecast);
  const weak = weakSpots(10);
  render(`<h1 class="page">Progress</h1>
  <section class="panel tiles">
    <div><b>${state.streak.count}</b><span>day streak</span></div>
    <div><b>${s.total}</b><span>cards started</span></div>
    <div><b>${s.byState.mature}</b><span>mature (21d+)</span></div>
    <div><b>${s.accuracy7 ?? '–'}${s.accuracy7 != null ? '%' : ''}</b><span>right first time (7d)</span></div>
  </section>
  <section class="panel"><h2>Last 14 days</h2><div class="chart">${s.days.map((d) => `<div class="col" title="${d.key}: ${d.n} reviews"><i style="height:${(d.n / max) * 100}%"></i><span>${d.label}</span><em>${d.n || ''}</em></div>`).join('')}</div></section>
  <section class="panel"><h2>Due in the next 7 days</h2><div class="chart">${s.forecast.map((n, i) => `<div class="col f" title="${n} cards"><i style="height:${(n / fmax) * 100}%"></i><span>${i === 0 ? 'now' : '+' + i + 'd'}</span><em>${n || ''}</em></div>`).join('')}</div></section>
  <section class="panel"><h2>Card stages</h2><div class="stages">
    ${['learning', 'review', 'mature'].map((k) => `<div class="${k}"><b>${s.byState[k]}</b><span>${k === 'review' ? 'young' : k}</span></div>`).join('')}
  </div></section>
  <section class="panel"><h2>Accuracy by tense <small>30 days</small></h2><ul class="bars">
    ${TENSES.map((t) => {
      const p = s.perTense[t.id];
      if (!p) return `<li><span>${esc(t.fr)}</span><div class="bar"></div><em>–</em></li>`;
      const pct = Math.round((100 * p.ok) / p.n);
      return `<li><span>${esc(t.fr)}</span><div class="bar"><i class="b" style="width:${pct}%"></i></div><em>${pct}% <small>(${p.n})</small></em></li>`;
    }).join('')}</ul></section>
  <section class="panel"><h2>Weak spots</h2>${weak.length ? `<ul class="weak">${weak.map(weakRow).join('')}</ul><a class="btn" href="#/blitz?tense=weak">Drill these</a>` : '<p class="sub">Nothing flagged yet. Blitz and reviews will surface the forms you keep missing.</p>'}</section>`);
}

// ---------- settings ----------
function settingsView() {
  const s = state.settings;
  const u = sync.currentUser();
  render(`<h1 class="page">Settings</h1>
  <section class="panel"><h2>Study plan</h2>
    <label class="field">New cards per day <input type="number" id="s-new" min="0" max="60" value="${s.newPerDay}"></label>
    <label class="field">Daily goal (reviews, keeps the streak) <input type="number" id="s-goal" min="5" max="300" value="${s.dailyGoal}"></label>
    <label class="field">Intensity <select id="s-int">${Object.entries(INTENSITY).map(([k, v]) => `<option value="${k}" ${s.intensity === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <p class="sub">Higher intensity = shorter gaps between reviews = more drilling. Max drill is for the first month of a tense.</p>
    <label class="field">Blitz length (seconds) <input type="number" id="s-blitz" min="30" max="300" step="10" value="${s.blitzSeconds}"></label>
    <label class="check"><input type="checkbox" id="s-speech" ${s.speech ? 'checked' : ''}> Read answers aloud (🔊, French voice)</label>
    <fieldset class="tenses"><legend>Tenses to drill</legend>${TENSES.map((t) => `<label class="check"><input type="checkbox" class="s-tense" value="${t.id}" ${s.tenses.includes(t.id) ? 'checked' : ''}> ${esc(t.fr)}</label>`).join('')}</fieldset>
  </section>

  <section class="panel"><h2>Reminders</h2>
    <p class="sub">Push notifications at these local times, only when cards are due (or your streak needs saving). They are sent by your Supabase project, so they work with the app closed.</p>
    <div class="times">${[0, 1, 2].map((i) => `<label class="field">Reminder ${i + 1} <input type="time" class="s-time" value="${esc(s.reminderTimes[i] || '')}"></label>`).join('')}</div>
    <label class="field">Time zone <input id="s-tz" value="${esc(s.timezone)}"></label>
    <div class="stack" id="push-box"><span class="sub">Checking…</span></div>
  </section>

  <section class="panel"><h2>Account & sync</h2>${accountHtml(u)}</section>

  <section class="panel"><h2>Your data</h2>
    <div class="stack"><button class="btn" id="export">Export backup (JSON)</button>
    <label class="btn file">Import backup<input type="file" id="import" accept="application/json" hidden></label>
    ${installEvt ? '<button class="btn" id="install">Install app</button>' : ''}
    <button class="btn danger" id="reset">Reset all progress…</button></div></section>`);
  wireSettings();
  pushBox();
}

function accountHtml(u) {
  if (!sync.configured()) return `<p class="sub">Guest mode: progress is saved on this device only. To sync and get push reminders, add your Supabase URL and anon key to <code>config.js</code> (step-by-step in the README).</p>`;
  if (u) return `<p>Signed in as <b>${esc(u.email)}</b></p><p class="sub" id="sync-status">${esc(sync.status.text)}${sync.status.error ? ' · ' + esc(sync.status.error) : ''}</p><div class="stack"><button class="btn" id="sync-now">Sync now</button><button class="btn ghost" id="sign-out">Sign out</button></div>`;
  return `<form id="auth-form"><label class="field">Email <input type="email" id="a-email" autocomplete="email" required></label>
  <label class="field">Password <input type="password" id="a-pass" autocomplete="current-password" minlength="8" required></label>
  <div class="stack"><button class="btn primary" type="submit">Sign in</button><button class="btn" type="button" id="sign-up">Create account</button></div><p class="sub" id="auth-msg">${esc(sync.status.text)}</p></form>`;
}

async function pushBox() {
  const box = $('#push-box');
  if (!box) return;
  if (!push.pushSupported()) return (box.innerHTML = '<span class="sub">This browser does not support push. On iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then open it from there.</span>');
  const on = await push.isSubscribed();
  box.innerHTML = `${on && Notification.permission === 'granted' ? '<span class="chip ok">Reminders on for this device</span><button class="btn ghost" id="push-off">Turn off</button>' : `<button class="btn primary" id="push-on">Enable reminders on this device</button>`}<button class="btn ghost" id="push-test">Show a test notification</button>`;
}

function readSettings() {
  const times = $$('.s-time').map((i) => i.value).filter(Boolean);
  return {
    newPerDay: Math.max(0, +$('#s-new').value || 0),
    dailyGoal: Math.max(1, +$('#s-goal').value || 25),
    intensity: $('#s-int').value,
    blitzSeconds: Math.min(300, Math.max(30, +$('#s-blitz').value || 90)),
    speech: $('#s-speech').checked,
    tenses: $$('.s-tense:checked').map((i) => i.value),
    reminderTimes: times,
    timezone: $('#s-tz').value.trim() || 'Europe/London',
  };
}

function wireSettings() {
  const save = () => {
    const next = readSettings();
    if (!next.tenses.length) {
      toast('Keep at least one tense on');
      return settingsView();
    }
    store.updateSettings(next);
    sync.autoSync();
  };
  $$('#app input:not([type=file]):not(#a-email):not(#a-pass), #app select').forEach((el) => el.addEventListener('change', save));
  $('#export')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportData()], { type: 'application/json' }));
    a.download = `french-drill-${store.dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#import')?.addEventListener('change', async (e) => {
    try {
      store.importData(await e.target.files[0].text());
      toast('Backup imported');
      settingsView();
    } catch (err) {
      toast(err.message);
    }
  });
  $('#reset')?.addEventListener('click', () => {
    if (confirm('Delete ALL progress on this device? (Synced data in your account is kept until you reset it there.)') && confirm('Really reset? This cannot be undone.')) {
      store.reset();
      toast('Progress reset');
      location.hash = '#/';
      route();
    }
  });
  $('#install')?.addEventListener('click', async () => {
    installEvt.prompt();
    await installEvt.userChoice;
    installEvt = null;
    settingsView();
  });
  $('#sync-now')?.addEventListener('click', async () => {
    await sync.sync();
    $('#sync-status').textContent = sync.status.text + (sync.status.error ? ' · ' + sync.status.error : '');
  });
  $('#sign-out')?.addEventListener('click', async () => {
    await sync.signOut();
    settingsView();
  });
  const auth = async (fn) => {
    const msg = $('#auth-msg');
    try {
      msg.textContent = 'Working…';
      await fn($('#a-email').value.trim(), $('#a-pass').value);
      settingsView();
    } catch (err) {
      msg.textContent = err.message;
    }
  };
  $('#auth-form')?.addEventListener('submit', (e) => (e.preventDefault(), auth(sync.signIn)));
  $('#sign-up')?.addEventListener('click', () => auth(sync.signUp));

}

// settings buttons (delegated once)
document.addEventListener('click', async (e) => {
  const id = e.target.id;
  try {
    if (id === 'push-on') {
      await push.enablePush();
      store.updateSettings({ ...readSettings(), pushOn: true });
      sync.sync();
      toast('Reminders enabled 🔔');
      pushBox();
    } else if (id === 'push-off') {
      await push.disablePush();
      store.updateSettings({ pushOn: false });
      sync.sync();
      pushBox();
    } else if (id === 'push-test') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return toast('Notifications are blocked for this site');
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('Time for your French 🇫🇷', { body: `${dueCards().length} cards due.`, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: location.origin + location.pathname + '#/review' } });
    }
  } catch (err) {
    toast(err.message || String(err), 5000);
  }
});

// ---------- boot ----------
async function boot() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch {
      /* offline install unavailable, app still works */
    }
  }
  store.onChange(updateHeader);
  route();
  await sync.init();
  sync.onStatus(() => {
    const el = $('#sync-status');
    if (el) el.textContent = sync.status.text + (sync.status.error ? ' · ' + sync.status.error : '');
  });
  setInterval(() => sync.autoSync(), 120000);
  window.addEventListener('online', () => sync.sync());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      store.refreshDay();
      if (location.hash === '' || location.hash === '#/') home();
      sync.sync();
    } else store.flush();
  });
  window.addEventListener('pagehide', store.flush);
}
boot();
