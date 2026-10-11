// Pure scheduling logic for reminders (no Deno or network APIs, so it is unit-tested with Node).
export type Target = {
  user_id: string;
  timezone: string;
  reminder_times: string[];
  due_count: number;
  streak: number;
  streak_last: string | null;
  last_study_day: string | null;
  last_push_at: string | null;
};

export const WINDOW_MIN = 15;

export function localParts(now: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hour12: false,
  }).formatToParts(now);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { minutes: (+g('hour') % 24) * 60 + +g('minute'), date: `${g('year')}-${g('month')}-${g('day')}` };
}

/** True when the user's local clock is inside [reminder, reminder + WINDOW_MIN). */
export function dueNow(now: Date, tz: string, times: string[]) {
  const { minutes } = localParts(now, tz);
  return times.some((t) => {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const start = h * 60 + m;
    return minutes >= start && minutes < start + WINDOW_MIN;
  });
}

export function message(t: Target, today: string) {
  const studied = t.last_study_day === today;
  const streakAlive = t.streak > 0 && t.streak_last !== today;
  if (t.due_count === 0 && studied) return null; // all done today: stay quiet
  if (t.due_count === 0) {
    return { title: 'Nothing due, but drill anyway 🇫🇷', body: 'Two minutes of Blitz keeps verbs automatic.', url: '#/blitz' };
  }
  const body = streakAlive
    ? `${t.due_count} cards due. Keep your ${t.streak}-day streak alive. 5 minutes is enough.`
    : `${t.due_count} cards are waiting. Verbs don't drill themselves.`;
  return { title: 'Time for your French 🇫🇷', body, url: '#/review' };
}

export function shouldSend(t: Target, now: Date) {
  if (!dueNow(now, t.timezone, t.reminder_times)) return null;
  if (t.last_push_at && now.getTime() - new Date(t.last_push_at).getTime() < 10 * 60_000) return null;
  return message(t, localParts(now, t.timezone).date);
}
