import test from 'node:test';
import assert from 'node:assert/strict';
import { dueNow, localParts, message, shouldSend } from '../supabase/functions/send-reminders/schedule.ts';

const base = { user_id: 'u', timezone: 'Europe/London', reminder_times: ['08:00', '19:30'], due_count: 12, streak: 5, streak_last: '2026-10-10', last_study_day: '2026-10-10', last_push_at: null };

test('local time respects the time zone and daylight saving', () => {
  // 2026-10-11 07:05 UTC = 08:05 BST in London, 03:05 in New York, 16:05 in Tokyo
  const t = new Date('2026-10-11T07:05:00Z');
  assert.deepEqual(localParts(t, 'Europe/London'), { minutes: 8 * 60 + 5, date: '2026-10-11' });
  assert.equal(localParts(t, 'America/New_York').minutes, 3 * 60 + 5);
  assert.equal(localParts(t, 'Asia/Tokyo').minutes, 16 * 60 + 5);
  // after the clocks go back (2026-10-25) London is on GMT
  assert.equal(localParts(new Date('2026-10-26T08:05:00Z'), 'Europe/London').minutes, 8 * 60 + 5);
});

test('fires only inside the 15 minute window after a reminder time', () => {
  const at = (iso) => dueNow(new Date(iso), 'Europe/London', ['08:00', '19:30']);
  assert.equal(at('2026-10-11T06:59:00Z'), false); // 07:59 BST
  assert.equal(at('2026-10-11T07:00:00Z'), true); // 08:00 BST
  assert.equal(at('2026-10-11T07:14:59Z'), true);
  assert.equal(at('2026-10-11T07:15:00Z'), false);
  assert.equal(at('2026-10-11T18:35:00Z'), true); // 19:35 BST
});

test('midnight reminders and junk times do not throw', () => {
  assert.equal(dueNow(new Date('2026-10-10T23:05:00Z'), 'Europe/London', ['00:00']), true); // 00:05 BST
  assert.equal(dueNow(new Date('2026-10-11T07:00:00Z'), 'Europe/London', ['nope']), false);
});

test('messages: streak at risk, nothing due, already studied', () => {
  const today = '2026-10-11';
  assert.match(message(base, today).body, /12 cards due.*5-day streak/);
  assert.equal(message({ ...base, due_count: 0, last_study_day: today }, today), null);
  assert.match(message({ ...base, due_count: 0 }, today).title, /Nothing due/);
  assert.doesNotMatch(message({ ...base, streak_last: today }, today).body, /streak/);
  assert.equal(message(base, today).url, '#/review');
});

test('does not send twice within 10 minutes', () => {
  const now = new Date('2026-10-11T07:05:00Z');
  assert.ok(shouldSend(base, now));
  assert.equal(shouldSend({ ...base, last_push_at: '2026-10-11T07:00:00Z' }, now), null);
  assert.ok(shouldSend({ ...base, last_push_at: '2026-10-10T18:35:00Z' }, now));
  assert.equal(shouldSend(base, new Date('2026-10-11T10:00:00Z')), null);
});
