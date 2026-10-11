// Local-first state. Everything lives in localStorage so the app works offline and without an account;
// sync.js mirrors it to Supabase when signed in.
import { VERBS, verbById } from './verbs.js';
import { VOCAB } from './vocab.js';
import { TENSES, hasTense } from './conjugate.js';
import { newCard, isDue, DAY } from './srs.js';

const KEY = 'frdrill.v1';
const LOG_CAP = 4000;

export const DEFAULT_SETTINGS = {
  newPerDay: 12,
  dailyGoal: 25,
  intensity: 'drill',
  tenses: TENSES.map((t) => t.id),
  blitzSeconds: 90,
  speech: true,
  reminderTimes: ['08:00', '19:30'],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
  pushOn: false,
};

const blank = () => ({
  cards: {},
  settings: { ...DEFAULT_SETTINGS },
  log: [],
  forms: {},
  daily: { date: '', reviews: 0, newIntroduced: 0, extraNew: 0 },
  streak: { count: 0, last: '' },
  sync: { lastPull: 0, dirtyCards: [], dirtyForms: [], pendingLog: [], settingsDirty: false },
  seenLessons: [],
});

export let state = blank();
const listeners = new Set();
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep running in memory */
    }
  }, 150);
  listeners.forEach((fn) => fn());
}
export function flush() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) {
      const b = blank();
      state = { ...b, ...raw, settings: { ...b.settings, ...raw.settings }, sync: { ...b.sync, ...raw.sync }, daily: { ...b.daily, ...raw.daily } };
    }
  } catch {
    state = blank();
  }
  rollDay();
  return state;
}

export const dayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function rollDay() {
  const today = dayKey();
  if (state.daily.date !== today) state.daily = { date: today, reviews: 0, newIntroduced: 0, extraNew: 0 };
  if (state.streak.last && state.streak.last !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (state.streak.last !== dayKey(y)) state.streak = { count: 0, last: '' };
  }
}
export const refreshDay = rollDay;

// ---------- card universe ----------
export const cardId = {
  conj: (verb, tense) => `c:${verb}:${tense}`,
  meaning: (verb) => `m:${verb}`,
  pp: (verb) => `p:${verb}`,
  vocab: (id) => `w:${id}`,
};

const OFFSET = { present: 2, pp: 12, passe_compose: 16, imparfait: 30, futur: 45, conditionnel: 60, subjonctif: 80, imperatif: 95, plus_que_parfait: 110 };

let universe;
/** Every card that can exist, with a learning priority. Built once. */
export function allCards() {
  if (universe) return universe;
  universe = [];
  VERBS.forEach((v, rank) => {
    universe.push({ id: cardId.meaning(v.id), kind: 'meaning', ref: v.id, tense: null, prio: rank });
    universe.push({ id: cardId.pp(v.id), kind: 'pp', ref: v.id, tense: null, prio: rank + OFFSET.pp });
    for (const t of TENSES) {
      if (!hasTense(v, t.id)) continue;
      universe.push({ id: cardId.conj(v.id, t.id), kind: 'conj', ref: v.id, tense: t.id, prio: rank + OFFSET[t.id] });
    }
  });
  VOCAB.forEach((w, i) => universe.push({ id: cardId.vocab(w.id), kind: 'vocab', ref: w.id, tense: null, prio: i * 0.85 + 4 }));
  universe.sort((a, b) => a.prio - b.prio);
  return universe;
}

export const getCard = (id) => state.cards[id];

export function saveCard(card) {
  rollDay();
  if (!state.cards[card.id]) state.daily.newIntroduced += 1;
  state.cards[card.id] = card;
  if (!state.sync.dirtyCards.includes(card.id)) state.sync.dirtyCards.push(card.id);
  persist();
}

function cardActive(c) {
  if (c.kind === 'conj') return state.settings.tenses.includes(c.tense);
  return true;
}

export function dueCards(now = Date.now()) {
  return Object.values(state.cards)
    .filter((c) => isDue(c, now) && cardActive(c) && cardRefExists(c))
    .sort((a, b) => a.due - b.due);
}

function cardRefExists(c) {
  return c.kind === 'vocab' ? VOCAB.some((w) => w.id === c.ref) : !!verbById(c.ref);
}

export function newAllowance() {
  rollDay();
  return Math.max(0, state.settings.newPerDay + state.daily.extraNew - state.daily.newIntroduced);
}

export function newCandidates(n) {
  const out = [];
  for (const c of allCards()) {
    if (out.length >= n) break;
    if (state.cards[c.id]) continue;
    if (c.kind === 'conj' && !state.settings.tenses.includes(c.tense)) continue;
    out.push(c);
  }
  return out;
}

export function introduce(spec) {
  return newCard(spec.id, spec.kind, spec.ref, spec.tense);
}

export function addExtraNew(n) {
  state.daily.extraNew += n;
  persist();
}

// ---------- logging ----------
export function logReview({ card, rating, wrong, total, ms }) {
  rollDay();
  const entry = { t: Date.now(), card, rating, wrong, total, ms: Math.round(ms || 0) };
  state.log.push(entry);
  if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP);
  state.sync.pendingLog.push(entry);
  state.daily.reviews += 1;
  if (state.daily.reviews >= state.settings.dailyGoal) bumpStreak();
  persist();
}

function bumpStreak() {
  const today = dayKey();
  if (state.streak.last === today) return;
  state.streak = { count: state.streak.count + 1, last: today };
  state.sync.settingsDirty = true;
}

export function recordForm(verb, tense, person, ok) {
  const k = `${verb}|${tense}|${person}`;
  const f = state.forms[k] || { r: 0, w: 0, lw: 0 };
  if (ok) f.r += 1;
  else (f.w += 1), (f.lw = Date.now());
  state.forms[k] = f;
  if (!state.sync.dirtyForms.includes(k)) state.sync.dirtyForms.push(k);
  persist();
}

/** A miss in Blitz pulls the card back into the queue (but never creates or resets it). */
export function pullForward(cardIdStr) {
  const c = state.cards[cardIdStr];
  if (c && c.state === 'review' && c.due > Date.now()) saveCard({ ...c, due: Date.now(), upd: Date.now() });
}

export function weakSpots(limit = 10) {
  return Object.entries(state.forms)
    .map(([k, f]) => ({ key: k, ...f, n: f.r + f.w, rate: f.w / (f.r + f.w) }))
    .filter((f) => f.w >= 1 && f.n >= 2 && f.rate >= 0.34)
    .sort((a, b) => b.w * b.rate - a.w * a.rate)
    .slice(0, limit);
}

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  state.sync.settingsDirty = true;
  persist();
}

export function markLessonSeen(id) {
  if (!state.seenLessons.includes(id)) {
    state.seenLessons.push(id);
    persist();
  }
}

export function stats() {
  const cards = Object.values(state.cards);
  const byState = { new: 0, learning: 0, review: 0, mature: 0 };
  cards.forEach((c) => {
    if (c.state === 'review') (c.ivl >= 21 ? byState.mature++ : byState.review++);
    else byState[c.state] = (byState[c.state] || 0) + 1;
  });
  const now = Date.now();
  const forecast = Array.from({ length: 7 }, () => 0);
  cards.forEach((c) => {
    if (c.state === 'new') return;
    const d = Math.floor((c.due - startOfToday()) / DAY);
    if (d <= 0) forecast[0]++;
    else if (d < 7) forecast[d]++;
  });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), n: 0, ok: 0 };
  });
  const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  const perTense = {};
  state.log.forEach((e) => {
    const i = idx[dayKey(new Date(e.t))];
    const good = e.wrong === 0 ? 1 : 0;
    if (i != null) (days[i].n++, (days[i].ok += good));
    const c = state.cards[e.card];
    if (c?.kind === 'conj' && now - e.t < 30 * DAY) {
      const p = (perTense[c.tense] ||= { n: 0, ok: 0 });
      p.n++;
      p.ok += good;
    }
  });
  return { total: cards.length, byState, forecast, days, perTense, accuracy7: accuracy(7) };
}

function accuracy(d) {
  const since = Date.now() - d * DAY;
  const e = state.log.filter((x) => x.t >= since);
  return e.length ? Math.round((100 * e.filter((x) => x.wrong === 0).length) / e.length) : null;
}

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();

export function exportData() {
  return JSON.stringify({ app: 'french-drill', v: 1, state }, null, 2);
}

export function importData(text) {
  const j = JSON.parse(text);
  if (j.app !== 'french-drill' || !j.state?.cards) throw new Error('Not a French Drill backup');
  const b = blank();
  state = { ...b, ...j.state, settings: { ...b.settings, ...j.state.settings } };
  state.sync.dirtyCards = Object.keys(state.cards);
  state.sync.settingsDirty = true;
  persist();
  flush();
}

export function reset() {
  state = blank();
  persist();
  flush();
}

// handy for sync/merge
export function mergeRemoteCard(remote) {
  const local = state.cards[remote.id];
  if (!local || remote.upd > local.upd) state.cards[remote.id] = remote;
}
export function touch() {
  persist();
}
export const verbCount = () => VERBS.length;
