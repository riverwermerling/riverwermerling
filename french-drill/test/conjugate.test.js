import test from 'node:test';
import assert from 'node:assert/strict';
import { conjugate, TENSES, fullForm, expandAnswer, hasTense, personsFor } from '../js/conjugate.js';
import { VERBS, verbById } from '../js/verbs.js';

const V = (id) => verbById(id);
const eq = (id, tense, expected) => assert.deepEqual(conjugate(V(id), tense), expected, `${id} ${tense}`);

test('regular verbs by group', () => {
  eq('parler', 'present', ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']);
  eq('finir', 'present', ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent']);
  eq('vendre', 'present', ['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent']);
});

test('soft g/c spelling', () => {
  assert.equal(conjugate(V('manger'), 'present')[3], 'mangeons');
  assert.equal(conjugate(V('manger'), 'imparfait')[0], 'mangeais');
  assert.equal(conjugate(V('manger'), 'imparfait')[3], 'mangions');
  assert.equal(conjugate(V('commencer'), 'present')[3], 'commençons');
  assert.equal(conjugate(V('commencer'), 'imparfait')[2], 'commençait');
  assert.equal(conjugate(V('commencer'), 'imparfait')[4], 'commenciez');
});

test('être / avoir / aller across tenses', () => {
  eq('etre', 'imparfait', ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient']);
  eq('etre', 'futur', ['serai', 'seras', 'sera', 'serons', 'serez', 'seront']);
  eq('etre', 'subjonctif', ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient']);
  eq('avoir', 'conditionnel', ['aurais', 'aurais', 'aurait', 'aurions', 'auriez', 'auraient']);
  eq('aller', 'futur', ['irai', 'iras', 'ira', 'irons', 'irez', 'iront']);
  eq('aller', 'subjonctif', ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent']);
});

test('passé composé and plus-que-parfait', () => {
  eq('manger', 'passe_compose', ['ai mangé', 'as mangé', 'a mangé', 'avons mangé', 'avez mangé', 'ont mangé']);
  eq('aller', 'passe_compose', ['suis allé(e)', 'es allé(e)', 'est allé(e)', 'sommes allé(e)s', 'êtes allé(e)(s)', 'sont allé(e)s']);
  eq('faire', 'plus_que_parfait', ['avais fait', 'avais fait', 'avait fait', 'avions fait', 'aviez fait', 'avaient fait']);
  assert.equal(conjugate(V('venir'), 'plus_que_parfait')[3], 'étions venu(e)s');
});

test('irregular futur / subjonctif stems', () => {
  eq('venir', 'futur', ['viendrai', 'viendras', 'viendra', 'viendrons', 'viendrez', 'viendront']);
  eq('pouvoir', 'conditionnel', ['pourrais', 'pourrais', 'pourrait', 'pourrions', 'pourriez', 'pourraient']);
  eq('faire', 'subjonctif', ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent']);
  eq('boire', 'subjonctif', ['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent']);
  eq('prendre', 'subjonctif', ['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent']);
  eq('voir', 'subjonctif', ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient']);
  eq('vouloir', 'subjonctif', ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent']);
  eq('savoir', 'subjonctif', ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent']);
  eq('finir', 'subjonctif', ['finisse', 'finisses', 'finisse', 'finissions', 'finissiez', 'finissent']);
  eq('lire', 'futur', ['lirai', 'liras', 'lira', 'lirons', 'lirez', 'liront']);
  eq('connaitre', 'futur', ['connaîtrai', 'connaîtras', 'connaîtra', 'connaîtrons', 'connaîtrez', 'connaîtront']);
});

test('stem-changing -er verbs', () => {
  eq('acheter', 'futur', ['achèterai', 'achèteras', 'achètera', 'achèterons', 'achèterez', 'achèteront']);
  eq('acheter', 'subjonctif', ['achète', 'achètes', 'achète', 'achetions', 'achetiez', 'achètent']);
  eq('payer', 'subjonctif', ['paie', 'paies', 'paie', 'payions', 'payiez', 'paient']);
  eq('envoyer', 'futur', ['enverrai', 'enverras', 'enverra', 'enverrons', 'enverrez', 'enverront']);
  eq('etudier', 'imparfait', ['étudiais', 'étudiais', 'étudiait', 'étudiions', 'étudiiez', 'étudiaient']);
});

test('imperative', () => {
  eq('parler', 'imperatif', [null, 'parle', null, 'parlons', 'parlez', null]);
  eq('aller', 'imperatif', [null, 'va', null, 'allons', 'allez', null]);
  eq('etre', 'imperatif', [null, 'sois', null, 'soyons', 'soyez', null]);
  eq('finir', 'imperatif', [null, 'finis', null, 'finissons', 'finissez', null]);
  eq('ouvrir', 'imperatif', [null, 'ouvre', null, 'ouvrons', 'ouvrez', null]);
  assert.equal(hasTense(V('pouvoir'), 'imperatif'), false);
  assert.deepEqual(personsFor('imperatif'), [1, 3, 4]);
});

test('reflexive verbs', () => {
  eq('se-lever', 'present', ['me lève', 'te lèves', 'se lève', 'nous levons', 'vous levez', 'se lèvent']);
  eq('se-lever', 'passe_compose', ['me suis levé(e)', "t'es levé(e)", "s'est levé(e)", 'nous sommes levé(e)s', 'vous êtes levé(e)(s)', 'se sont levé(e)s']);
  assert.equal(conjugate(V('se-appeler'), 'present')[0], "m'appelle");
  assert.equal(conjugate(V('se-appeler'), 'imparfait')[0], "m'appelais");
  assert.equal(conjugate(V('se-lever'), 'imperatif')[1], 'lève-toi');
  assert.equal(conjugate(V('se-lever'), 'imperatif')[3], 'levons-nous');
  eq('se-souvenir', 'futur', ['me souviendrai', 'te souviendras', 'se souviendra', 'nous souviendrons', 'vous souviendrez', 'se souviendront']);
});

test('subject labels and elision', () => {
  assert.equal(fullForm('present', 0, 'ai'), "j'ai");
  assert.equal(fullForm('present', 0, 'mange'), 'je mange');
  assert.equal(fullForm('present', 0, "m'appelle"), "je m'appelle");
  assert.equal(fullForm('subjonctif', 2, 'aille'), "qu'il/elle aille");
  assert.equal(fullForm('subjonctif', 0, 'aie'), "que j'aie");
  assert.equal(fullForm('imperatif', 1, 'parle'), 'parle');
});

test('agreement expansion', () => {
  assert.deepEqual(expandAnswer('allé(e)').sort(), ['allé', 'allée']);
  assert.deepEqual(expandAnswer('allé(e)(s)').sort(), ['allé', 'allée', 'allées', 'allés']);
  assert.deepEqual(expandAnswer('sommes allé(e)s').sort(), ['sommes allées', 'sommes allés']);
});

test('every verb conjugates every tense without gaps', () => {
  const ids = new Set();
  for (const v of VERBS) {
    assert.ok(!ids.has(v.id), `duplicate id ${v.id}`);
    ids.add(v.id);
    if (v.pres && !v.inf.endsWith('er')) assert.ok(v.pp, `${v.id} irregular needs pp`);
    for (const t of TENSES) {
      if (!hasTense(v, t.id)) continue;
      const forms = conjugate(v, t.id);
      assert.equal(forms.length, 6);
      for (const i of personsFor(t.id)) {
        assert.ok(forms[i] && !/undefined|null|NaN/.test(forms[i]), `${v.id} ${t.id} ${i}: ${forms[i]}`);
      }
    }
  }
  assert.ok(VERBS.length >= 95);
});
