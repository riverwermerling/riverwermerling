import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser globals so the modules can load under Node.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
globalThis.window = { FRENCH_DRILL_CONFIG: { SUPABASE_URL: 'http://fake', SUPABASE_ANON_KEY: 'k' } };

/** In-memory stand-in for the slice of supabase-js that sync.js uses. */
function fakeClient(tables, user) {
  const pk = { cards: ['user_id', 'id'], user_settings: ['user_id'], form_stats: ['user_id', 'verb', 'tense', 'person'], push_subscriptions: ['endpoint'] };
  const from = (name) => {
    const rows = (tables[name] ??= []);
    let op = 'select', payload, filters = [], range, order, single = false;
    const b = {
      select() { op = 'select'; return b; },
      gt(col, v) { filters.push((r) => r[col] > v); return b; },
      eq(col, v) { filters.push((r) => r[col] === v); return b; },
      order(c) { order = c; return b; },
      range(a, z) { range = [a, z]; return b; },
      maybeSingle() { single = true; return b; },
      upsert(r) { op = 'upsert'; payload = [].concat(r); return b; },
      insert(r) { op = 'insert'; payload = [].concat(r); return b; },
      delete() { op = 'delete'; return b; },
      then(resolve) {
        if (op === 'upsert') {
          payload.forEach((r) => {
            const keys = pk[name];
            const i = rows.findIndex((x) => keys.every((k) => x[k] === r[k]));
            if (i >= 0) rows[i] = { ...rows[i], ...r }; else rows.push({ ...r });
          });
          return resolve({ data: null, error: null });
        }
        if (op === 'insert') { rows.push(...payload.map((r) => ({ ...r }))); return resolve({ data: null, error: null }); }
        if (op === 'delete') { tables[name] = rows.filter((r) => !filters.every((f) => f(r))); return resolve({ error: null }); }
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (order) out = [...out].sort((a, b2) => (a[order] < b2[order] ? -1 : 1));
        if (range) out = out.slice(range[0], range[1] + 1);
        resolve({ data: single ? out[0] ?? null : out, error: null });
      },
    };
    return b;
  };
  return {
    from,
    auth: {
      getSession: async () => ({ data: { session: { user } } }),
      onAuthStateChange() {},
    },
  };
}

const store = await import('../js/store.js');
const sync = await import('../js/sync.js');
const { newCard, schedule, RATING } = await import('../js/srs.js');

const USER = { id: 'u1', email: 'me@example.com' };

test('pushes dirty cards, form stats, review log and settings', async () => {
  store.load();
  const c = schedule(newCard('c:aller:present', 'conj', 'aller', 'present'), RATING.GOOD);
  store.saveCard(c);
  store.recordForm('aller', 'present', 3, false);
  store.logReview({ card: c.id, rating: 2, wrong: 1, total: 6, ms: 9000 });
  store.updateSettings({ newPerDay: 20, reminderTimes: ['07:30'] });

  const tables = {};
  await sync.init(() => fakeClient(tables, USER));
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(tables.cards.length, 1);
  assert.equal(tables.cards[0].id, 'c:aller:present');
  assert.equal(tables.cards[0].user_id, 'u1');
  assert.equal(tables.cards[0].state, 'learning');
  assert.match(tables.cards[0].due, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(tables.form_stats.map((r) => [r.verb, r.tense, r.person, r.n_right, r.n_wrong]), [['aller', 'present', 3, 0, 1]]);
  assert.equal(tables.review_log.length, 1);
  assert.equal(tables.user_settings[0].new_per_day, 20);
  assert.deepEqual(tables.user_settings[0].reminder_times, ['07:30']);
  assert.deepEqual(store.state.sync.dirtyCards, []);
  assert.deepEqual(store.state.sync.pendingLog, []);
  assert.equal(store.state.sync.settingsDirty, false);
});

test('pull: newer remote card wins, older remote card loses', async () => {
  store.load();
  const now = Date.now();
  const mk = (id, upd, ivl) => ({ ...newCard(id, 'meaning', 'x', null, now), state: 'review', ivl, upd });
  store.state.cards['m:newer'] = mk('m:newer', now - 5000, 1);
  store.state.cards['m:older'] = mk('m:older', now, 9);
  store.state.sync.dirtyCards = [];
  store.state.sync.lastPull = 0;

  const iso = (ms) => new Date(ms).toISOString();
  const remote = (id, upd, ivl) => ({ user_id: 'u1', id, kind: 'meaning', ref: 'x', tense: null, state: 'review', due: iso(now), ivl, ease: 2.4, reps: 3, lapses: 0, step: 0, relearn: false, last_review: iso(now), upd: iso(upd) });
  const tables = { cards: [remote('m:newer', now, 30), remote('m:older', now - 9000, 2), remote('m:fresh', now, 4)] };

  await sync.init(() => fakeClient(tables, USER));
  await new Promise((r) => setTimeout(r, 30)); // init() starts a background sync

  assert.equal(store.state.cards['m:newer'].ivl, 30, 'remote newer overwrites');
  assert.equal(store.state.cards['m:older'].ivl, 9, 'local newer is kept');
  assert.equal(store.state.cards['m:fresh'].ivl, 4, 'unknown remote card is added');
  assert.ok(store.state.sync.lastPull > 0);
});

test('guest mode: no config means init does nothing', async () => {
  const saved = window.FRENCH_DRILL_CONFIG;
  window.FRENCH_DRILL_CONFIG = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
  assert.equal(sync.configured(), false);
  window.FRENCH_DRILL_CONFIG = saved;
});
