// Supabase auth + two-way sync. Local state is the source of truth; remote rows are merged by `upd`.
import { state, mergeRemoteCard, touch, flush } from './store.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const cfg = () => window.FRENCH_DRILL_CONFIG || {};

let client = null;
let user = null;
let syncing = false;
export const status = { text: 'Guest mode (local only)', error: null, last: 0 };
const subs = new Set();
export const onStatus = (fn) => (subs.add(fn), () => subs.delete(fn));
const setStatus = (text, error = null) => {
  status.text = text;
  status.error = error;
  subs.forEach((f) => f());
};

export const configured = () => !!(cfg().SUPABASE_URL && cfg().SUPABASE_ANON_KEY);
export const currentUser = () => user;
export const getClient = () => client;

export async function init(createClientImpl) {
  if (!configured()) return;
  try {
    const createClient = createClientImpl ?? (await import(SUPABASE_ESM)).createClient;
    client = createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data } = await client.auth.getSession();
    user = data.session?.user ?? null;
    client.auth.onAuthStateChange((_e, session) => {
      user = session?.user ?? null;
      setStatus(user ? `Signed in as ${user.email}` : 'Signed out');
    });
    if (user) {
      setStatus(`Signed in as ${user.email}`);
      sync();
    } else setStatus('Not signed in. Sign in to sync across devices.');
  } catch (e) {
    client = null;
    setStatus('Offline: sync unavailable', String(e.message || e));
  }
}

export async function signUp(email, password) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  user = data.session?.user ?? null;
  if (!user) throw new Error('Check your email to confirm the account, then sign in.');
  await sync();
}
export async function signIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  user = data.user;
  await sync();
}
export async function signOut() {
  await client.auth.signOut();
  user = null;
  setStatus('Signed out');
}

const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
const ms = (s) => (s ? new Date(s).getTime() : 0);

const cardToRow = (c) => ({
  user_id: user.id, id: c.id, kind: c.kind, ref: c.ref, tense: c.tense, state: c.state,
  due: iso(c.due), ivl: c.ivl, ease: c.ease, reps: c.reps, lapses: c.lapses, step: c.step,
  relearn: !!c.relearn, last_review: iso(c.last), upd: iso(c.upd),
});
const rowToCard = (r) => ({
  id: r.id, kind: r.kind, ref: r.ref, tense: r.tense, state: r.state, due: ms(r.due), ivl: r.ivl, ease: r.ease,
  reps: r.reps, lapses: r.lapses, step: r.step, relearn: r.relearn, last: ms(r.last_review), upd: ms(r.upd),
});

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const check = ({ error }) => {
  if (error) throw error;
};

export async function sync() {
  if (!client || !user || syncing) return;
  syncing = true;
  setStatus('Syncing…');
  try {
    await pull();
    await push();
    status.last = Date.now();
    setStatus(`Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${user.email}`);
  } catch (e) {
    setStatus('Sync failed (will retry)', String(e.message || e));
  } finally {
    syncing = false;
  }
}

async function pull() {
  const since = iso(state.sync.lastPull - 60e3) || '1970-01-01T00:00:00Z';
  const startedAt = Date.now();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('cards').select('*').gt('upd', since).order('upd').range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => {
      mergeRemoteCard(rowToCard(r)); // last write wins, by `upd`
    });
    if (data.length < 1000) break;
  }
  const { data: forms, error: fe } = await client.from('form_stats').select('*');
  if (fe) throw fe;
  forms.forEach((r) => {
    const k = `${r.verb}|${r.tense}|${r.person}`;
    const l = state.forms[k];
    if (!l || r.n_right + r.n_wrong > l.r + l.w) state.forms[k] = { r: r.n_right, w: r.n_wrong, lw: ms(r.last_wrong) };
  });
  const { data: s } = await client.from('user_settings').select('*').maybeSingle();
  if (s && !state.sync.settingsDirty) {
    state.settings = {
      ...state.settings, newPerDay: s.new_per_day, dailyGoal: s.daily_goal, intensity: s.intensity,
      tenses: s.tenses, reminderTimes: s.reminder_times, timezone: s.timezone, pushOn: s.push_on,
    };
    if (s.streak > state.streak.count || (s.streak_last && s.streak_last > state.streak.last)) {
      state.streak = { count: s.streak, last: s.streak_last || '' };
    }
  }
  state.sync.lastPull = startedAt;
  touch();
}

async function push() {
  const ids = [...new Set(state.sync.dirtyCards)].filter((id) => state.cards[id]);
  for (const part of chunks(ids, 200)) {
    check(await client.from('cards').upsert(part.map((id) => cardToRow(state.cards[id])), { onConflict: 'user_id,id' }));
    state.sync.dirtyCards = state.sync.dirtyCards.filter((id) => !part.includes(id));
  }
  while (state.sync.pendingLog.length) {
    const log = state.sync.pendingLog.slice(0, 500);
    check(await client.from('review_log').insert(log.map((e) => ({ user_id: user.id, card_id: e.card, reviewed_at: iso(e.t), rating: e.rating, wrong: e.wrong, total: e.total, ms: e.ms }))));
    state.sync.pendingLog.splice(0, log.length);
  }
  const keys = [...new Set(state.sync.dirtyForms)];
  for (const part of chunks(keys, 200)) {
    const rows = part.map((k) => {
      const [verb, tense, person] = k.split('|');
      const f = state.forms[k];
      return { user_id: user.id, verb, tense, person: +person, n_right: f.r, n_wrong: f.w, last_wrong: iso(f.lw) };
    });
    check(await client.from('form_stats').upsert(rows, { onConflict: 'user_id,verb,tense,person' }));
    state.sync.dirtyForms = state.sync.dirtyForms.filter((k) => !part.includes(k));
  }
  if (state.sync.settingsDirty) {
    const s = state.settings;
    check(await client.from('user_settings').upsert({
      user_id: user.id, new_per_day: s.newPerDay, daily_goal: s.dailyGoal, intensity: s.intensity, tenses: s.tenses,
      reminder_times: s.reminderTimes, timezone: s.timezone, push_on: s.pushOn,
      streak: state.streak.count, streak_last: state.streak.last || null, last_study_day: state.daily.reviews ? state.daily.date : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }));
    state.sync.settingsDirty = false;
  }
  touch();
  flush();
}

/** Streak / study-day metadata is read by the reminder function, so push it after each session. */
export function markStudied() {
  state.sync.settingsDirty = true;
  touch();
}

let timer = 0;
export function autoSync() {
  clearTimeout(timer);
  timer = setTimeout(sync, 4000);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sync();
});
