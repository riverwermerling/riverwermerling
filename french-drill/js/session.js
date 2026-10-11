// The spaced-repetition review session.
import { state, getCard, saveCard, introduce, dueCards, newAllowance, newCandidates, logReview, recordForm, markLessonSeen, addExtraNew } from './store.js';
import { schedule, rate, RATING } from './srs.js';
import { conjugate, personsFor, subjectLabel, tenseById, participleOf, auxOf, stemNote, fullForm } from './conjugate.js';
import { verbById } from './verbs.js';
import { vocabById } from './vocab.js';
import { checkAnswer, checkVocab } from './check.js';
import { INTENSITY } from './srs.js';
import { lessonForTense } from './lessons.js';
import { render, esc, $, $$, speak, speakBtn, accentBar, fmtDue, inputAttrs } from './ui.js';
import { markStudied, autoSync } from './sync.js';
import { setBadge } from './push.js';

const MAX_REVIEWS = 150;
let S = null;

export function buildQueue() {
  const due = dueCards().slice(0, MAX_REVIEWS);
  const learning = due.filter((c) => c.state === 'learning');
  const reviews = due.filter((c) => c.state === 'review');
  const items = [...learning, ...reviews].map((c) => ({ id: c.id }));
  const fresh = newCandidates(newAllowance()).map((spec) => ({ id: spec.id, spec }));
  const out = [];
  const gap = fresh.length ? Math.max(2, Math.floor(items.length / (fresh.length + 1))) : Infinity;
  let f = 0;
  items.forEach((it, i) => {
    out.push(it);
    if ((i + 1) % gap === 0 && f < fresh.length) out.push(fresh[f++]);
  });
  while (f < fresh.length) out.push(fresh[f++]);
  return out;
}

export function start() {
  const queue = buildQueue();
  if (!queue.length) return render(emptyView());
  S = { queue, i: 0, total: queue.length, answered: 0, wrongCards: 0, newCards: 0, forms: 0, formsWrong: 0, startedAt: Date.now(), cur: null };
  showCard();
}

function emptyView() {
  return `<section class="panel center"><h1>All caught up 🎉</h1>
  <p>Nothing is due and today's new-card allowance is used. Don't stop here: drill speed or pull in more cards.</p>
  <div class="stack"><a class="btn primary" href="#/blitz?tense=all">Start a Blitz</a>
  <button class="btn" data-act="more-new">Learn 6 more new cards</button>
  <a class="btn ghost" href="#/">Home</a></div></section>`;
}

// ---------- tasks ----------
function buildTask(card) {
  if (card.kind === 'conj') {
    const v = verbById(card.ref);
    const t = tenseById(card.tense);
    return { type: 'table', v, tense: card.tense, forms: conjugate(v, card.tense), persons: personsFor(card.tense), tag: t.fr, tagEn: t.en, title: v.label, sub: v.en, refl: v.refl };
  }
  if (card.kind === 'meaning') {
    const v = verbById(card.ref);
    return { type: 'single', tag: 'Meaning', title: v.en, sub: v.refl ? 'reflexive verb (se …)' : 'type the infinitive', expected: v.label, answers: [v.label, ...(v.refl ? [v.inf] : [])], v, reveal: `${v.label} <small>${esc(v.en)}</small>`, speakText: v.label, extra: `<p class="ex"><b>${esc(v.ex)}</b><br><span>${esc(v.exEn)}</span></p>`, speakAlso: v.ex };
  }
  if (card.kind === 'pp') {
    const v = verbById(card.ref);
    return { type: 'pp', tag: 'Past participle', title: v.label, sub: `${v.en}: type the participle and pick the helper`, v, expected: participleOf(v), aux: auxOf(v), speakText: `${auxOf(v) === 'être' ? 'être' : 'avoir'} ${participleOf(v)}`, reveal: `<b>${auxOf(v)}</b> + <b>${esc(participleOf(v))}</b>`, extra: v.note ? `<p class="note">${v.note}</p>` : '' };
  }
  const w = vocabById(card.ref);
  return { type: 'single', tag: w.cat, title: w.en, sub: 'type it in French (with the article for nouns)', expected: w.fr, entry: w, reveal: esc(w.fr), speakText: w.fr, answers: [w.fr] };
}

function evaluate(task, values) {
  let rows;
  if (task.type === 'table') {
    rows = task.persons.map((p, k) => ({ ...checkAnswer(values[k] ?? '', task.forms[p]), expected: task.forms[p] }));
  } else if (task.type === 'pp') {
    const a = checkAnswer(values[0] ?? '', task.expected, { stripSubject: false });
    rows = [
      { ...a, expected: task.expected },
      { ok: values[1] === task.aux, accentOnly: false, expected: task.aux },
    ];
  } else {
    const r = task.entry ? checkVocab(values[0] ?? '', task.entry) : checkAnswer(values[0] ?? '', task.answers, { stripSubject: false });
    rows = [{ ...r, expected: task.expected }];
  }
  return {
    rows,
    wrong: rows.filter((r) => !r.ok && !r.accentOnly).length,
    accentOnly: rows.filter((r) => r.accentOnly).length,
    total: rows.length,
  };
}

// ---------- flow ----------
function showCard() {
  const q = S.queue[S.i];
  if (!q) return finish();
  const card = getCard(q.id) ?? introduce(q.spec);
  const task = buildTask(card);
  S.cur = { q, card, task, phase: card.state === 'new' && !q.retry ? 'study' : 'test', t0: 0, hinted: false, rated: false, rows: null, fixed: false };
  draw();
  if (S.cur.phase === 'study') speak(task.speakText ?? '');
}

const progress = () => `<div class="progress" aria-label="Session progress"><i style="width:${Math.round((S.i / S.queue.length) * 100)}%"></i></div>`;

function head(card, task) {
  const q = S.cur.q;
  const flag = q.retry ? '<span class="chip warn">retry</span>' : card.state === 'new' ? '<span class="chip new">new</span>' : card.state === 'learning' ? '<span class="chip">learning</span>' : '';
  return `${progress()}<div class="session-top"><a class="back" href="#/" data-keepfocus>✕ End</a><span class="count">${S.i + 1} / ${S.queue.length}</span></div>
  <div class="meta"><span class="chip tense">${esc(task.tag)}</span>${flag}</div>`;
}

function draw() {
  const { card, task, phase } = S.cur;
  const lesson = card.kind === 'conj' ? lessonForTense(card.tense) : null;
  let body;
  if (phase === 'study') body = studyBody(task, lesson);
  else {
    S.cur.t0 = Date.now();
    body = testBody(task);
  }
  render(`<section class="panel card-view">${head(card, task)}${body}</section>`, { scroll: false });
  if (phase === 'test') focusFirst();
}

function studyBody(task, lesson) {
  let answer;
  if (task.type === 'table') {
    answer = `<h1 class="verb">${esc(task.title)} ${speakBtn(task.forms.filter(Boolean).map((f, i) => f).join(', '))}</h1><p class="sub">${esc(task.sub)}</p>
    <table class="forms">${task.persons.map((p) => `<tr><td class="subj">${esc(subjectLabel(task.tense, p, task.forms[p]))}</td><td class="form">${esc(task.forms[p])}</td><td>${speakBtn(fullForm(task.tense, p, task.forms[p]))}</td></tr>`).join('')}</table>
    <p class="how"><b>How it's built:</b> ${esc(stemNote(task.v, task.tense))}</p>${task.v.note ? `<p class="note">${task.v.note}</p>` : ''}
    ${lesson ? `<p><a href="#/learn/${lesson.id}" target="_blank" rel="noopener" data-lesson="${lesson.id}">📖 Read the ${esc(task.tag)} guide</a></p>` : ''}`;
  } else if (task.type === 'pp') {
    answer = `<h1 class="verb">${esc(task.title)}</h1><p class="sub">${esc(task.v.en)}</p><p class="big">${task.reveal} ${speakBtn(task.speakText)}</p>${task.extra}
    <p class="how">Used in the passé composé: <b>${esc(fullForm('passe_compose', 2, conjugate(task.v, 'passe_compose')[2]))}</b></p>`;
  } else {
    answer = `<h1 class="verb">${task.reveal} ${speakBtn(task.speakText)}</h1><p class="sub">${esc(task.type === 'single' && task.entry ? task.entry.en : task.title)}</p>${task.extra ?? ''}`;
  }
  return `<div class="study" data-answer="${esc(task.expected ?? '')}" data-aux="${esc(task.aux ?? '')}">${answer}<p class="hint-line">Study it, say it out loud, then type it from memory.</p>
  <button class="btn primary big" data-act="test" data-keepfocus>Test me →</button></div>`;
}

const rowHtml = (label, k, extra = '') => `<label class="row${label ? '' : ' solo'}">${label ? `<span class="subj">${esc(label)}</span>` : ''}<input class="ans" data-k="${k}" ${inputAttrs} aria-label="${esc(label || 'answer')}" ${extra}></label>`;

function testBody(task) {
  let inner;
  if (task.type === 'table') {
    const rows = task.persons.map((p, k) => rowHtml(subjectLabel(task.tense, p, task.forms[p]) || ['', 'tu', '', 'nous', 'vous', ''][p], k)).join('');
    inner = `<h1 class="verb">${esc(task.title)} ${task.refl ? '<span class="chip">reflexive</span>' : ''}</h1><p class="sub">${esc(task.sub)} · <i>${esc(task.tagEn)}</i></p>
    <div class="rows" id="rows">${rows}</div>`;
  } else if (task.type === 'pp') {
    inner = `<h1 class="verb">${esc(task.title)}</h1><p class="sub">${esc(task.sub)}</p>
    <div class="rows" id="rows">${rowHtml('participe passé', 0)}
    <div class="row aux"><span class="subj">auxiliaire</span><div class="seg" role="radiogroup" aria-label="Helper verb">
      <label><input type="radio" name="aux" value="avoir"><span>avoir</span></label><label><input type="radio" name="aux" value="être"><span>être</span></label></div></div></div>`;
  } else {
    inner = `<h1 class="verb">${esc(task.title)}</h1><p class="sub">${esc(task.sub)}</p><div class="rows" id="rows">${rowHtml('', 0)}</div>`;
  }
  return `<form id="answer-form" novalidate>${inner}<div class="fb" id="fb" aria-live="polite"></div>
  ${accentBar()}
  <div class="actions"><button type="button" class="btn ghost" data-act="hint" data-keepfocus>💡 Hint</button><button type="submit" class="btn primary" id="check-btn">Check</button></div></form>`;
}

function focusFirst() {
  const el = $('input.ans');
  el?.focus({ preventScroll: true });
}

const values = () => {
  const v = $$('input.ans').map((i) => i.value);
  const aux = $('input[name="aux"]:checked');
  if (S.cur.task.type === 'pp') v[1] = aux ? aux.value : '';
  return v;
};

function onHint() {
  const { task } = S.cur;
  S.cur.hinted = true;
  const fb = $('#fb');
  if (task.type === 'table') fb.innerHTML = `<div class="hint">Hint · ${esc(stemNote(task.v, task.tense))}</div>`;
  else if (task.type === 'pp') fb.innerHTML = `<div class="hint">Hint · starts with <b>${esc(task.expected[0])}</b> (${task.expected.length} letters)</div>`;
  else fb.innerHTML = `<div class="hint">Hint · starts with <b>${esc(task.expected.slice(0, 2))}…</b> (${task.expected.length} characters)</div>`;
}

function onSubmit() {
  const cur = S.cur;
  if (cur.phase === 'test') return firstCheck();
  if (cur.phase === 'fix') return fixCheck();
  if (cur.phase === 'done') return next();
}

function markRow(inputRow, res) {
  inputRow.classList.toggle('ok', res.ok);
  inputRow.classList.toggle('bad', !res.ok);
}

function firstCheck() {
  const cur = S.cur;
  const { task, card, q } = cur;
  const vals = values();
  const ev = evaluate(task, vals);
  cur.rows = ev.rows;
  const rowEls = $$('#rows .row');
  const inputs = $$('input.ans');

  ev.rows.forEach((r, k) => {
    const el = rowEls[k];
    if (task.type === 'pp' && k === 1) markRow(el, r);
    else markRow(el, r);
  });

  // stats
  if (task.type === 'table') {
    ev.rows.forEach((r, k) => recordForm(task.v.id, task.tense, task.persons[k], r.ok));
    S.forms += ev.total;
    S.formsWrong += ev.wrong + ev.accentOnly;
  }

  if (!q.retry && !cur.rated) {
    cur.rated = true;
    const ms = Date.now() - cur.t0;
    let rating = rate({ wrong: ev.wrong, total: ev.total, accentOnly: ev.accentOnly, msPerItem: ms / ev.total, reps: card.reps });
    if (cur.hinted) rating = Math.min(rating, RATING.HARD);
    const updated = schedule(card, rating, Date.now(), { intensity: INTENSITY[state.settings.intensity]?.factor ?? 0.75 });
    if (card.state === 'new') S.newCards++;
    saveCard(updated);
    logReview({ card: card.id, rating, wrong: ev.wrong + ev.accentOnly, total: ev.total, ms });
    S.answered++;
    cur.nextDue = updated.due;
    cur.rating = rating;
    if (rating === RATING.AGAIN) {
      S.wrongCards++;
      const at = Math.min(S.i + 4, S.queue.length);
      S.queue.splice(at, 0, { id: card.id, retry: true });
    } else if (ev.wrong + ev.accentOnly > 0) S.wrongCards++;
  }

  const bad = ev.rows.map((r, k) => ({ r, k })).filter((x) => !x.r.ok);
  if (!bad.length) {
    inputs.forEach((i) => (i.disabled = true));
    cur.phase = 'done';
    return showDone(true);
  }
  // fix phase: show the right answer under each wrong row, make the learner retype it
  cur.phase = 'fix';
  bad.forEach(({ r, k }) => {
    const el = rowEls[k];
    if (task.type === 'pp' && k === 1) {
      el.insertAdjacentHTML('beforeend', `<div class="answer-key">${esc(r.expected)}</div>`);
      $$('input[name="aux"]', el).forEach((i) => (i.disabled = true));
      return;
    }
    const msg = r.missingArticle ? 'Include the article: it carries the gender.' : r.accentOnly ? 'Check the accents.' : '';
    el.insertAdjacentHTML('beforeend', `<div class="answer-key"><b>${esc(r.expected)}</b>${msg ? ` <em>${msg}</em>` : ''} ${speakBtn(task.type === 'table' ? fullForm(task.tense, task.persons[k], r.expected) : r.expected)}</div>`);
    inputs[k].value = '';
    inputs[k].dataset.fix = '1';
  });
  inputs.forEach((i) => {
    if (!i.dataset.fix) i.disabled = true;
  });
  $('#fb').innerHTML = `<div class="bad-msg">${ev.rows.length > 1 ? `${bad.length} to fix.` : 'Not quite.'} Retype the correct answer${bad.length > 1 ? 's' : ''} below. Typing it is what makes it stick.</div>`;
  if ($$('input.ans[data-fix]').length) {
    $('#check-btn').textContent = 'Check fix';
    $('input.ans[data-fix]').focus();
  } else {
    $('#fb').innerHTML = `<div class="bad-msg">The helper verb is <b>${esc(task.aux ?? '')}</b>. Say "${esc(auxOf(task.v))} ${esc(task.expected ?? '')}" out loud once.</div>`;
    $('#check-btn').textContent = 'Got it';
  }
}

function fixCheck() {
  const { task, rows } = S.cur;
  const inputs = $$('input.ans');
  let allOk = true;
  inputs.forEach((el, k) => {
    if (!el.dataset.fix) return;
    const exp = rows[k].expected;
    const r = task.entry
      ? checkVocab(el.value, task.entry)
      : checkAnswer(el.value, task.type === 'pp' ? exp : exp, { stripSubject: task.type === 'table' });
    const row = el.closest('.row');
    if (r.ok) {
      row.classList.remove('bad');
      row.classList.add('fixed');
      el.disabled = true;
      delete el.dataset.fix;
    } else allOk = false;
  });
  // pp aux needs no retyping, only the participle
  if (allOk) {
    S.cur.phase = 'done';
    showDone(false);
  } else {
    $('input.ans[data-fix]')?.focus();
    $('#fb').innerHTML = '<div class="bad-msg">Still off. Compare letter by letter, accents included.</div>';
  }
}

function showDone(perfect) {
  const { task, nextDue, q } = S.cur;
  const when = q.retry ? 'You will see it again later in this session.' : S.cur.rating === RATING.AGAIN ? 'Coming back in a few cards, then again soon.' : `Next review ${fmtDue(nextDue)}.`;
  const extra = task.type === 'single' && task.extra ? task.extra : '';
  $('#fb').innerHTML = `<div class="${perfect ? 'ok-msg' : 'fixed-msg'}">${perfect ? 'Correct ✓' : 'Fixed ✓'} <span class="when">${esc(when)}</span> ${speakBtn(task.speakText ?? '')}</div>${extra}`;
  const actions = $('.actions');
  actions.innerHTML = `<button type="submit" class="btn primary big" id="check-btn">Continue →</button>`;
  $('#check-btn').focus();
  if (perfect) speak(task.speakAlso ?? task.speakText ?? '');
}

function next() {
  S.i++;
  showCard();
}

function finish() {
  markStudied();
  autoSync();
  const mins = Math.max(1, Math.round((Date.now() - S.startedAt) / 60000));
  const acc = S.forms ? Math.round(100 * (1 - S.formsWrong / S.forms)) : null;
  const left = dueCards().length;
  setBadge(left);
  const goal = state.daily.reviews >= state.settings.dailyGoal;
  render(`<section class="panel center"><h1>Session complete 🎯</h1>
  <div class="tiles"><div><b>${S.answered}</b><span>cards</span></div><div><b>${S.newCards}</b><span>new</span></div>${acc != null ? `<div><b>${acc}%</b><span>forms right</span></div>` : ''}<div><b>${mins}</b><span>min</span></div></div>
  <p>${goal ? `Daily goal hit (${state.daily.reviews}/${state.settings.dailyGoal}). 🔥 Streak: <b>${state.streak.count}</b> day${state.streak.count === 1 ? '' : 's'}.` : `${state.daily.reviews}/${state.settings.dailyGoal} cards towards today's goal.`}</p>
  <div class="stack"><a class="btn primary" href="#/blitz?tense=all">Speed it up: Blitz</a>
  ${left ? '<button class="btn" data-act="restart">Keep going</button>' : '<button class="btn" data-act="more-new">Learn 6 more new cards</button>'}
  <a class="btn ghost" href="#/">Home</a></div></section>`);
  S = null;
}

export const abort = () => {
  S = null;
};

export function bind() {
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'answer-form' && S) {
      e.preventDefault();
      onSubmit();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!S?.cur || e.key !== 'Enter') return;
    const t = e.target;
    if (S.cur.phase === 'study' && !(t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement)) {
      e.preventDefault();
      startTest();
    } else if (S.cur.phase === 'test' || S.cur.phase === 'fix') {
      if (t.matches?.('input.ans')) {
        const ins = $$('input.ans:not([disabled])');
        const k = ins.indexOf(t);
        if (k >= 0 && k < ins.length - 1 && S.cur.phase === 'test') {
          e.preventDefault();
          ins[k + 1].focus();
        }
      }
    }
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'test' && S) startTest();
    else if (a.dataset.act === 'hint' && S) onHint();
    else if (a.dataset.act === 'more-new') (addExtraNew(6), start());
    else if (a.dataset.act === 'restart') start();
    const ls = e.target.closest('[data-lesson]');
    if (ls) markLessonSeen(ls.dataset.lesson);
  });
}

function startTest() {
  S.cur.phase = 'test';
  draw();
}
