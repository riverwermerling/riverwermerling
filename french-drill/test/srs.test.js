import test from 'node:test';
import assert from 'node:assert/strict';
import { newCard, schedule, rate, RATING, DAY, HOUR, MIN } from '../js/srs.js';

const T0 = 1_700_000_000_000;
const fresh = () => newCard('c:test', 'conj', 'etre', 'present', T0);

test('new card: two good passes graduate to a 1 day review', () => {
  let c = schedule(fresh(), RATING.GOOD, T0);
  assert.equal(c.state, 'learning');
  assert.equal(c.due, T0 + 8 * HOUR);
  c = schedule(c, RATING.GOOD, T0 + 8 * HOUR);
  assert.equal(c.state, 'review');
  assert.equal(c.ivl, 1);
  assert.equal(c.due, T0 + 8 * HOUR + DAY);
});

test('new card: again repeats within minutes; easy graduates to 3 days', () => {
  const again = schedule(fresh(), RATING.AGAIN, T0);
  assert.equal(again.state, 'learning');
  assert.equal(again.due, T0 + 10 * MIN);
  const easy = schedule(fresh(), RATING.EASY, T0);
  assert.equal(easy.state, 'review');
  assert.equal(easy.ivl, 3);
});

test('review: intervals grow, lapses shrink and relearn', () => {
  let c = { ...fresh(), state: 'review', ivl: 10, ease: 2.5, reps: 5, due: T0 };
  const good = schedule(c, RATING.GOOD, T0, { intensity: 1 });
  assert.ok(good.ivl >= 23 && good.ivl <= 27, `got ${good.ivl}`);
  const gentle = schedule(c, RATING.GOOD, T0, { intensity: 0.55 });
  assert.ok(gentle.ivl < good.ivl);
  const hard = schedule(c, RATING.HARD, T0, { intensity: 1 });
  assert.ok(hard.ivl > 10 && hard.ivl < good.ivl);
  assert.ok(hard.ease < 2.5);
  const lapse = schedule(c, RATING.AGAIN, T0);
  assert.equal(lapse.state, 'learning');
  assert.equal(lapse.lapses, 1);
  assert.equal(lapse.ivl, 4);
  assert.equal(lapse.due, T0 + 10 * MIN);
  const back = schedule(lapse, RATING.GOOD, T0 + 11 * MIN);
  assert.equal(back.state, 'review');
  assert.equal(back.ivl, 4);
});

test('ease floor and interval cap', () => {
  let c = { ...fresh(), state: 'review', ivl: 300, ease: 1.35, reps: 9 };
  assert.equal(schedule(c, RATING.EASY, T0).ivl, 365);
  for (let i = 0; i < 6; i++) c = schedule({ ...c, state: 'review' }, RATING.HARD, T0);
  assert.ok(c.ease >= 1.3);
});

test('rating from performance', () => {
  assert.equal(rate({ wrong: 0, total: 6 }), RATING.GOOD);
  assert.equal(rate({ wrong: 0, total: 6, msPerItem: 2000, reps: 5 }), RATING.EASY);
  assert.equal(rate({ wrong: 0, total: 6, msPerItem: 2000, reps: 1 }), RATING.GOOD);
  assert.equal(rate({ wrong: 1, total: 6 }), RATING.HARD);
  assert.equal(rate({ wrong: 2, total: 6 }), RATING.AGAIN);
  assert.equal(rate({ wrong: 0, accentOnly: 1, total: 6 }), RATING.HARD);
  assert.equal(rate({ wrong: 1, total: 1 }), RATING.AGAIN);
  assert.equal(rate({ wrong: 0, accentOnly: 1, total: 1 }), RATING.HARD);
});
