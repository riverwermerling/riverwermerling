// Blitz: timed single-form drill inside a sentence frame. Targets weak spots; misses pull cards back into review.
import { state, weakSpots, recordForm, pullForward, cardId } from './store.js';
import { VERBS, verbById } from './verbs.js';
import { conjugate, personsFor, subjectLabel, tenseById, TENSES, hasTense, fullForm } from './conjugate.js';
import { checkAnswer } from './check.js';
import { render, esc, $, speak, accentBar, inputAttrs } from './ui.js';
import { markStudied, autoSync } from './sync.js';

const FRAMES = {
  present: ['Maintenant,', "D'habitude,", 'En ce moment,', 'Chaque jour,'],
  passe_compose: ['Hier,', 'La semaine dernière,', 'Ce matin,', 'Hier soir,'],
  imparfait: ["Quand j'étais petit,", 'Autrefois,', 'Chaque été,', 'À cette époque,'],
  plus_que_parfait: ['Déjà hier,', 'Avant la réunion,', 'À huit heures,', 'Avant mon arrivée,'],
  futur: ['Demain,', "L'année prochaine,", 'Bientôt,', 'Dans dix ans,'],
  conditionnel: ["Si j'avais le temps,", "Avec plus d'argent,", "À ta place,", 'Un jour peut-être,'],
  subjonctif: ['Il faut', 'Je veux', 'Il est important', 'Je suis content'],
  imperatif: [''],
};

let B = null;
export const abort = () => {
  if (B) clearInterval(B.timer);
  B = null;
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function learnedPairs() {
  const set = new Set();
  Object.values(state.cards).forEach((c) => {
    if (c.kind === 'conj' && c.state !== 'new' && state.settings.tenses.includes(c.tense)) set.add(`${c.ref}|${c.tense}`);
  });
  return [...set].map((k) => k.split('|'));
}

function weights(verb, tense, persons) {
  return persons.map((p) => {
    const f = state.forms[`${verb}|${tense}|${p}`];
    return f ? 1 + (6 * (f.w + 0.5)) / (f.r + f.w + 1) : 1.6;
  });
}

function pick(items, w) {
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i];
  return items[items.length - 1];
}

function nextItem(mode) {
  let pairs;
  if (mode === 'weak') {
    const spots = weakSpots(20);
    if (spots.length) {
      const s = pick(spots, spots.map((x) => 1 + x.w));
      const [verb, tense, person] = s.key.split('|');
      return { verb: verbById(verb), tense, person: +person };
    }
  }
  pairs = learnedPairs();
  if (mode !== 'all' && mode !== 'weak') pairs = pairs.filter(([, t]) => t === mode);
  if (!pairs.length) {
    const t = mode !== 'all' && mode !== 'weak' ? mode : 'present';
    pairs = VERBS.filter((v) => hasTense(v, t)).slice(0, 15).map((v) => [v.id, t]);
  }
  // avoid the same pair twice in a row
  const cand = pairs.length > 1 ? pairs.filter(([v, t]) => `${v}|${t}` !== B?.lastPair) : pairs;
  const [vid, tense] = rand(cand);
  const v = verbById(vid);
  const persons = personsFor(tense);
  const person = pick(persons, weights(vid, tense, persons));
  return { verb: v, tense, person };
}

export function start(mode = 'all') {
  const seconds = state.settings.blitzSeconds;
  B = { mode, seconds, end: Date.now() + seconds * 1000, ok: 0, wrong: 0, streak: 0, best: 0, misses: [], item: null, locked: false, times: [], lastPair: '' };
  B.timer = setInterval(tick, 200);
  nextQ();
}

function frame(it) {
  const forms = conjugate(it.verb, it.tense);
  const form = forms[it.person];
  const label = subjectLabel(it.tense, it.person, form);
  const t = tenseById(it.tense);
  const lead = rand(FRAMES[it.tense]);
  const who = ['', 'tu', '', 'nous', 'vous', ''][it.person];
  const sentence =
    it.tense === 'imperatif'
      ? `<span class="blank">______</span> ! <small>(${esc(who)})</small>`
      : `${esc(lead)} ${esc(label)} <span class="blank">______</span>`;
  return { form, sentence, t };
}

function nextQ() {
  B.item = nextItem(B.mode);
  B.lastPair = `${B.item.verb.id}|${B.item.tense}`;
  B.f = frame(B.item);
  B.locked = false;
  B.qStart = Date.now();
  draw();
}

function topBar() {
  return `<div class="blitz-top"><a class="back" href="#/">✕</a><span id="timer" class="timer">${B.seconds}</span><span class="score">✓ <b id="score">${B.ok}</b></span><span class="streak">🔥 <b id="streak">${B.streak}</b></span></div>
  <div class="progress timebar"><i id="timebar" style="width:100%"></i></div>`;
}

function draw() {
  const { verb } = B.item;
  render(`<section class="panel blitz">${topBar()}
  <div class="meta"><span class="chip tense">${esc(B.f.t.fr)}</span><span class="chip">${esc(verb.label)} · ${esc(verb.en)}</span></div>
  <form id="blitz-form" novalidate>
    <p class="sentence">${B.f.sentence}</p>
    <input class="ans big-input" ${inputAttrs} enterkeyhint="go" aria-label="Your answer" autofocus>
    <div class="fb" id="bfb" aria-live="polite"></div>
    ${accentBar()}
    <button type="submit" class="btn primary" id="bgo">Check</button>
  </form></section>`, { scroll: false });
  $('input.ans').focus({ preventScroll: true });
}

function tick() {
  if (!B) return;
  const left = Math.max(0, B.end - Date.now());
  const tEl = $('#timer');
  if (tEl) {
    tEl.textContent = Math.ceil(left / 1000);
    $('#timebar').style.width = `${(left / (B.seconds * 1000)) * 100}%`;
    tEl.classList.toggle('low', left < 10000);
  }
  if (left <= 0) end();
}

function submit() {
  if (!B) return;
  const input = $('input.ans');
  if (B.locked) return nextQ();
  const { verb, tense, person } = B.item;
  const res = checkAnswer(input.value, B.f.form);
  const ms = Date.now() - B.qStart;
  recordForm(verb.id, tense, person, res.ok);
  B.locked = true;
  input.disabled = true;
  const fb = $('#bfb');
  if (res.ok) {
    B.ok++;
    B.streak++;
    B.best = Math.max(B.best, B.streak);
    B.times.push(ms);
    input.classList.add('ok');
    fb.innerHTML = `<div class="ok-msg">✓ ${esc(fullForm(tense, person, B.f.form))}</div>`;
    $('#score').textContent = B.ok;
    $('#streak').textContent = B.streak;
    setTimeout(() => B && B.locked && nextQ(), 450);
  } else {
    B.wrong++;
    B.streak = 0;
    B.misses.push({ verb: verb.label, tense, person, expected: fullForm(tense, person, B.f.form), given: input.value, accentOnly: res.accentOnly });
    pullForward(cardId.conj(verb.id, tense));
    input.classList.add('bad');
    fb.innerHTML = `<div class="bad-msg"><b>${esc(fullForm(tense, person, B.f.form))}</b> ${res.accentOnly ? '<em>Mind the accents.</em>' : ''}</div>`;
    $('#bgo').textContent = 'Next →';
    $('#bgo').focus();
    $('#streak').textContent = 0;
    speak(fullForm(tense, person, B.f.form));
  }
}

function end() {
  clearInterval(B.timer);
  const { ok, wrong, best, misses, times, mode } = B;
  B = null;
  markStudied();
  autoSync();
  const total = ok + wrong;
  const acc = total ? Math.round((100 * ok) / total) : 0;
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1) : '–';
  const seen = new Map();
  misses.forEach((m) => seen.set(m.expected, m));
  render(`<section class="panel center"><h1>Time! ⏱️</h1>
  <div class="tiles"><div><b>${ok}</b><span>correct</span></div><div><b>${acc}%</b><span>accuracy</span></div><div><b>${best}</b><span>best streak</span></div><div><b>${avg}s</b><span>avg / answer</span></div></div>
  ${misses.length ? `<h2>Fix these</h2><ul class="misses">${[...seen.values()].map((m) => `<li><b>${esc(m.expected)}</b> <span>${esc(m.verb)} · ${esc(tenseById(m.tense).fr)}</span>${m.given ? `<small>you wrote “${esc(m.given)}”</small>` : ''}</li>`).join('')}</ul>` : '<p>Flawless. 🔥</p>'}
  <div class="stack"><button class="btn primary" data-blitz="${esc(mode === 'weak' ? 'all' : mode)}">Go again</button>
  ${misses.length ? '<button class="btn" data-blitz="weak">Drill my weak spots</button>' : ''}<a class="btn ghost" href="#/">Home</a></div></section>`);
}

export function bind() {
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'blitz-form') {
      e.preventDefault();
      submit();
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-blitz]');
    if (b) start(b.dataset.blitz);
  });
}

export const blitzModes = () => [
  { id: 'all', label: 'Mixed' },
  ...TENSES.filter((t) => state.settings.tenses.includes(t.id)).map((t) => ({ id: t.id, label: t.fr })),
];
