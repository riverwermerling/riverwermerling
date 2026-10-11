import { expandAnswer } from './conjugate.js';

export const norm = (s) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*[?!.,;:]+\s*$/g, '')
    .trim();

export const stripAccents = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

const SUBJECT = /^(qu'|que )?(j'|je |tu |il\/elle |ils\/elles |il |elle |ils |elles |on |nous |vous )/;

/**
 * Compare typed input against an expected form (may contain (e)/(s) markers).
 * The typed answer may include or omit the subject pronoun.
 * -> { ok, accentOnly }
 */
export function checkAnswer(input, expected, { stripSubject = true } = {}) {
  const variants = (Array.isArray(expected) ? expected : [expected]).flatMap(expandAnswer).map(norm);
  const n = norm(input);
  if (!n) return { ok: false, accentOnly: false };
  const cands = new Set([n]);
  if (stripSubject) cands.add(n.replace(SUBJECT, ''));
  for (const c of cands) if (variants.includes(c)) return { ok: true, accentOnly: false };
  const plain = variants.map(stripAccents);
  for (const c of cands) if (plain.includes(stripAccents(c))) return { ok: false, accentOnly: true };
  return { ok: false, accentOnly: false };
}

/** Nouns need their article: 'maison' for 'la maison' is a gender error, not a pass. */
export function checkVocab(input, entry) {
  const answers = [entry.fr, ...(entry.alt ?? [])];
  const res = checkAnswer(input, answers, { stripSubject: false });
  if (res.ok || res.accentOnly) return res;
  const bare = answers.map((a) => norm(a).replace(/^(le |la |l'|les |un |une )/, ''));
  const n = norm(input);
  if (bare.includes(n) || bare.map(stripAccents).includes(stripAccents(n))) {
    return { ok: false, accentOnly: false, missingArticle: true };
  }
  return res;
}
