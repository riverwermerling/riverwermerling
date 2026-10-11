import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer, checkVocab, norm } from '../js/check.js';
import { VOCAB } from '../js/vocab.js';

test('exact, with and without subject pronoun', () => {
  assert.equal(checkAnswer('mange', 'mange').ok, true);
  assert.equal(checkAnswer('je mange', 'mange').ok, true);
  assert.equal(checkAnswer("j'ai mangé", 'ai mangé').ok, true);
  assert.equal(checkAnswer("qu'il aille", 'aille').ok, true);
  assert.equal(checkAnswer('que nous allions', 'allions').ok, true);
  assert.equal(checkAnswer('  MANGE  ', 'mange').ok, true);
});

test('reflexive pronoun nous is not swallowed', () => {
  assert.equal(checkAnswer('nous levons', 'nous levons').ok, true);
  assert.equal(checkAnswer('nous nous levons', 'nous levons').ok, true);
  assert.equal(checkAnswer('levons', 'nous levons').ok, false);
});

test('agreement variants', () => {
  assert.equal(checkAnswer('suis allée', 'suis allé(e)').ok, true);
  assert.equal(checkAnswer('suis allé', 'suis allé(e)').ok, true);
  assert.equal(checkAnswer('sommes allés', 'sommes allé(e)s').ok, true);
  assert.equal(checkAnswer('sommes allé', 'sommes allé(e)s').ok, false);
  assert.equal(checkAnswer('êtes allées', 'êtes allé(e)(s)').ok, true);
});

test('accents are enforced but flagged as accent-only', () => {
  const r = checkAnswer('mange', 'mangé');
  assert.deepEqual(r, { ok: false, accentOnly: true });
  assert.equal(checkAnswer('prefere', 'préfère').accentOnly, true);
  assert.equal(checkAnswer('mangez', 'mange').accentOnly, false);
  assert.equal(checkAnswer('', 'mange').ok, false);
});

test('apostrophes and hyphens normalise', () => {
  assert.equal(norm("J’ai  "), "j'ai");
  assert.equal(checkAnswer('lève - toi', 'lève-toi').ok, true);
});

test('vocab needs the article', () => {
  const maison = VOCAB.find((w) => w.fr === 'la maison');
  assert.equal(checkVocab('la maison', maison).ok, true);
  assert.equal(checkVocab('maison', maison).missingArticle, true);
  assert.equal(checkVocab('le maison', maison).ok, false);
  const q = VOCAB.find((w) => w.fr === 'comment ça va');
  assert.equal(checkVocab('Comment ça va ?', q).ok, true);
  const rdv = VOCAB.find((w) => w.fr === 'le week-end');
  assert.equal(checkVocab('le weekend', rdv).ok, true);
});

test('vocab ids unique', () => {
  const ids = VOCAB.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(VOCAB.length >= 140);
});
