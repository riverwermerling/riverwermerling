import { state } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function render(html, { scroll = true } = {}) {
  const el = document.getElementById('app');
  el.innerHTML = html;
  if (scroll) window.scrollTo(0, 0);
  return el;
}

let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => v.lang === 'fr-FR') || vs.find((v) => v.lang?.startsWith('fr')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
export function speak(text) {
  if (!('speechSynthesis' in window) || !state.settings.speech || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(e\)|\(s\)/g, ''));
  u.lang = 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
export const speakBtn = (text) =>
  state.settings.speech && 'speechSynthesis' in window
    ? `<button type="button" class="icon-btn" data-speak="${esc(text)}" aria-label="Listen">🔊</button>`
    : '';

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'ë', 'œ'];
export const accentBar = () =>
  `<div class="accents" role="group" aria-label="Accented letters">${ACCENTS.map((a) => `<button type="button" class="acc" data-ch="${a}">${a}</button>`).join('')}</div>`;

let lastInput = null;
document.addEventListener('focusin', (e) => {
  if (e.target.matches?.('input.ans')) lastInput = e.target;
});
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('.acc, [data-keepfocus]')) e.preventDefault();
});
document.addEventListener('click', (e) => {
  const sp = e.target.closest('[data-speak]');
  if (sp) return speak(sp.dataset.speak);
  const acc = e.target.closest('.acc');
  if (acc) {
    const el = lastInput && document.contains(lastInput) ? lastInput : $('input.ans:not([disabled])');
    if (!el) return;
    el.focus();
    el.setRangeText(acc.dataset.ch, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

export function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => (t.classList.remove('show'), setTimeout(() => t.remove(), 300)), ms);
}

export function fmtDue(due, now = Date.now()) {
  const d = due - now;
  if (d < 3600e3) return `in ${Math.max(1, Math.round(d / 60e3))} min`;
  if (d < 20 * 3600e3) return `in ${Math.round(d / 3600e3)} h`;
  if (d < 36 * 3600e3) return 'tomorrow';
  return `in ${Math.round(d / 86400e3)} days`;
}

export const inputAttrs = 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"';
