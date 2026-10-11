// Spaced repetition scheduler (SM-2 flavoured, with an extra same-day learning pass).
// Pure functions: card in, card out.

export const MIN = 60e3;
export const HOUR = 3600e3;
export const DAY = 86400e3;
export const RATING = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export const INTENSITY = {
  standard: { label: 'Standard', factor: 1 },
  drill: { label: 'Drill (recommended)', factor: 0.75 },
  max: { label: 'Max drill', factor: 0.55 },
};

const MAX_IVL = 365;

export function newCard(id, kind, ref, tense = null, now = Date.now()) {
  return { id, kind, ref, tense, state: 'new', due: now, ivl: 0, ease: 2.4, reps: 0, lapses: 0, step: 0, relearn: false, last: 0, upd: now };
}

const fuzz = (d) => (d < 7 ? d : d * (0.95 + Math.random() * 0.1));

/**
 * New cards: pass 1 (today) -> pass 2 (+8h, usually the evening session) -> review at +1 day.
 * Lapsed cards relearn with a single successful pass.
 */
export function schedule(card, rating, now = Date.now(), { intensity = 0.75 } = {}) {
  const c = { ...card, reps: card.reps + 1, last: now, upd: now };

  if (c.state !== 'review') {
    c.state = 'learning';
    const need = c.relearn ? 1 : 2;
    const graduate = (easy) => {
      c.state = 'review';
      c.relearn = false;
      c.step = 0;
      c.ivl = Math.max(c.ivl || 0, easy ? 3 : 1);
      c.due = now + c.ivl * DAY;
    };
    if (rating === RATING.AGAIN) {
      c.step = 0;
      c.due = now + 10 * MIN;
    } else if (rating === RATING.HARD) {
      c.due = now + 30 * MIN;
    } else if (rating === RATING.EASY) {
      graduate(true);
    } else {
      c.step += 1;
      if (c.step >= need) graduate(false);
      else c.due = now + 8 * HOUR;
    }
    return c;
  }

  // review state
  if (rating === RATING.AGAIN) {
    c.lapses += 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.ivl = Math.max(1, Math.round(c.ivl * 0.4));
    c.state = 'learning';
    c.relearn = true;
    c.step = 0;
    c.due = now + 10 * MIN;
    return c;
  }
  let factor;
  if (rating === RATING.HARD) {
    c.ease = Math.max(1.3, c.ease - 0.15);
    factor = 1.2;
  } else if (rating === RATING.GOOD) {
    factor = c.ease;
  } else {
    c.ease += 0.15;
    factor = c.ease * 1.3;
  }
  const grown = c.ivl * (1 + (factor - 1) * intensity);
  c.ivl = Math.min(MAX_IVL, Math.max(c.ivl + 1, Math.round(fuzz(grown))));
  c.due = now + c.ivl * DAY;
  return c;
}

/** Map a first attempt to a rating. `wrong` = number of wrong answers out of `total`. */
export function rate({ wrong, total, accentOnly = 0, msPerItem = Infinity, reps = 0 }) {
  if (wrong === 0 && accentOnly === 0) return msPerItem < 3500 && reps >= 3 ? RATING.EASY : RATING.GOOD;
  if (total === 1) return wrong === 0 ? RATING.HARD : RATING.AGAIN;
  const bad = wrong + accentOnly;
  if (bad === 1) return RATING.HARD;
  return RATING.AGAIN;
}

export const isDue = (c, now = Date.now()) => c.state !== 'new' && c.due <= now;
