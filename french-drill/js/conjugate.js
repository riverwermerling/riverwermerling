// Rule engine + irregular data -> full conjugation tables.
// A verb spec only stores what cannot be derived (see verbs.js).

export const PERSONS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];

export const TENSES = [
  { id: 'present', fr: 'Présent', en: 'Present' },
  { id: 'passe_compose', fr: 'Passé composé', en: 'Perfect (I have done / I did)' },
  { id: 'imparfait', fr: 'Imparfait', en: 'Imperfect (I used to / I was doing)' },
  { id: 'futur', fr: 'Futur simple', en: 'Future (I will do)' },
  { id: 'conditionnel', fr: 'Conditionnel', en: 'Conditional (I would do)' },
  { id: 'subjonctif', fr: 'Subjonctif présent', en: 'Subjunctive (that I do)' },
  { id: 'imperatif', fr: 'Impératif', en: 'Imperative (do it!)' },
  { id: 'plus_que_parfait', fr: 'Plus-que-parfait', en: 'Pluperfect (I had done)' },
];

export const tenseById = (id) => TENSES.find((t) => t.id === id);
export const IMPERATIVE_PERSONS = [1, 3, 4];

const ENDINGS = {
  imparfait: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  conditionnel: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
};
const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœh]/i;

export const needsElision = (form) => VOWEL.test(form);

// mange+ons -> mangeons, commenc+ons -> commençons (soft g/c before a/o)
function attach(stem, ending) {
  const c = ending[0];
  if (c === 'a' || c === 'o') {
    if (stem.endsWith('g')) return stem + 'e' + ending;
    if (stem.endsWith('c')) return stem.slice(0, -1) + 'ç' + ending;
  }
  return stem + ending;
}

function regularPresent(inf) {
  const s = inf.slice(0, -2);
  if (inf.endsWith('er')) return [s + 'e', s + 'es', s + 'e', attach(s, 'ons'), s + 'ez', s + 'ent'];
  if (inf.endsWith('ir')) return [s + 'is', s + 'is', s + 'it', s + 'issons', s + 'issez', s + 'issent'];
  if (inf.endsWith('re')) return [s + 's', s + 's', s, s + 'ons', s + 'ez', s + 'ent'];
  throw new Error(`No regular pattern for ${inf}`);
}

export function presentOf(v) {
  return v.pres ?? regularPresent(v.inf);
}

export function participleOf(v) {
  if (v.pp) return v.pp;
  const s = v.inf.slice(0, -2);
  if (v.inf.endsWith('er')) return s + 'é';
  if (v.inf.endsWith('ir')) return s + 'i';
  return s + 'u';
}

export const auxOf = (v) => (v.refl ? 'être' : v.aux ?? 'avoir');

function imparfaitStem(v, pres) {
  if (v.imp) return v.imp;
  let s = pres[3].replace(/ons$/, '');
  if (v.inf.endsWith('ger') && s.endsWith('ge')) s = s.slice(0, -1);
  if (v.inf.endsWith('cer') && s.endsWith('ç')) s = s.slice(0, -1) + 'c';
  return s;
}

function futurStem(v) {
  return v.fut ?? (v.inf.endsWith('re') ? v.inf.slice(0, -1) : v.inf);
}

const AVOIR = { inf: 'avoir', pres: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], imp: 'av' };
const ETRE = { inf: 'être', pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], imp: 'ét' };

function simple(v, tense) {
  const pres = presentOf(v);
  switch (tense) {
    case 'present':
      return pres;
    case 'imparfait': {
      const st = imparfaitStem(v, pres);
      return ENDINGS.imparfait.map((e) => attach(st, e));
    }
    case 'futur': {
      const st = futurStem(v);
      return ENDINGS.futur.map((e) => st + e);
    }
    case 'conditionnel': {
      const st = futurStem(v);
      return ENDINGS.conditionnel.map((e) => st + e);
    }
    case 'subjonctif': {
      if (v.subj) return v.subj;
      const ils = v.sub ?? pres[5].replace(/ent$/, '');
      const nous = v.subN ?? imparfaitStem(v, pres);
      return [ils + 'e', ils + 'es', ils + 'e', nous + 'ions', nous + 'iez', ils + 'ent'];
    }
    default:
      throw new Error(`Unknown simple tense ${tense}`);
  }
}

// (e) and (s) mark optional agreement; see expandAnswer()
function agree(v, i) {
  const pp = participleOf(v);
  if (auxOf(v) !== 'être') return pp;
  if (i < 3) return pp + '(e)';
  if (i === 4) return pp + '(e)(s)';
  return pp + '(e)s';
}

function compound(v, auxTense) {
  const auxSpec = auxOf(v) === 'être' ? ETRE : AVOIR;
  return simple(auxSpec, auxTense).map((a, i) => `${a} ${agree(v, i)}`);
}

function imperative(v, pres) {
  if (v.noImp) return null;
  let [tu, nous, vous] = v.impr ?? [pres[1], pres[3], pres[4]];
  if (!v.impr) {
    if (tu === 'vas') tu = 'va';
    else if (tu.endsWith('es')) tu = tu.slice(0, -1); // parles -> parle
  }
  if (v.refl) return [null, `${tu}-toi`, null, `${nous}-nous`, `${vous}-vous`, null];
  return [null, tu, null, nous, vous, null];
}

function reflexive(forms) {
  return forms.map((f, i) => {
    if (f == null) return f;
    const p = REFL[i];
    if ([0, 1, 2, 5].includes(i) && VOWEL.test(f)) return `${p[0]}'${f}`;
    return `${p} ${f}`;
  });
}

const cache = new WeakMap();

/** Returns 6 strings (subject pronoun excluded). Imperative has nulls except tu/nous/vous. */
export function conjugate(v, tense) {
  let byTense = cache.get(v);
  if (!byTense) cache.set(v, (byTense = {}));
  if (byTense[tense] !== undefined) return byTense[tense];
  let forms;
  switch (tense) {
    case 'passe_compose':
      forms = compound(v, 'present');
      break;
    case 'plus_que_parfait':
      forms = compound(v, 'imparfait');
      break;
    case 'imperatif':
      forms = imperative(v, presentOf(v));
      byTense[tense] = forms;
      return forms;
    default:
      forms = simple(v, tense);
  }
  if (v.refl) forms = reflexive(forms);
  byTense[tense] = forms;
  return forms;
}

export const hasTense = (v, tense) => !(tense === 'imperatif' && v.noImp);
export const personsFor = (tense) => (tense === 'imperatif' ? IMPERATIVE_PERSONS : [0, 1, 2, 3, 4, 5]);

export function displayInf(v) {
  if (!v.refl) return v.inf;
  return VOWEL.test(v.inf) ? `s'${v.inf}` : `se ${v.inf}`;
}

export function subjectLabel(tense, i, form) {
  if (tense === 'imperatif') return '';
  const el = VOWEL.test(form);
  if (tense === 'subjonctif') {
    if (i === 0) return el ? "que j'" : 'que je';
    if (i === 2) return "qu'il/elle";
    if (i === 5) return "qu'ils/elles";
    return `que ${PERSONS[i]}`;
  }
  if (i === 0) return el ? "j'" : 'je';
  return PERSONS[i];
}

export function fullForm(tense, i, form) {
  const s = subjectLabel(tense, i, form);
  return s ? (s.endsWith("'") ? s + form : `${s} ${form}`) : form;
}

/** 'allé(e)(s)' -> allé, allée, allés, allées */
export function expandAnswer(form) {
  let out = [form];
  for (const tok of ['(e)', '(s)']) {
    out = out.flatMap((f) => (f.includes(tok) ? [f.replace(tok, ''), f.replace(tok, tok[1])] : [f]));
  }
  return out;
}

/** One-line "how this tense is built for this verb" (used as a hint and in study mode). */
export function stemNote(v, tense) {
  const pres = presentOf(v);
  const aux = auxOf(v);
  switch (tense) {
    case 'present':
      return v.pres ? 'irregular present: learn the shape of each row' : 'regular endings on the stem';
    case 'passe_compose':
      return `${aux} (présent) + ${participleOf(v)}`;
    case 'plus_que_parfait':
      return `${aux} (imparfait) + ${participleOf(v)}`;
    case 'imparfait':
      return `${imparfaitStem(v, pres)}- + ais, ais, ait, ions, iez, aient`;
    case 'futur':
      return `${futurStem(v)}- + ai, as, a, ons, ez, ont`;
    case 'conditionnel':
      return `${futurStem(v)}- + ais, ais, ait, ions, iez, aient`;
    case 'subjonctif': {
      if (v.subj) return 'irregular subjunctive: memorise it';
      const ils = v.sub ?? pres[5].replace(/ent$/, '');
      const nous = v.subN ?? imparfaitStem(v, pres);
      return ils === nous ? `${ils}- + e, es, e, ions, iez, ent` : `${ils}- + e, es, e, ent · ${nous}- + ions, iez`;
    }
    case 'imperatif':
      return v.impr ? 'irregular imperative' : 'tu / nous / vous of the present (tu drops its -s for -er verbs)';
    default:
      return '';
  }
}
