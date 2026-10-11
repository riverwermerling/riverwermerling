// Study guides. HTML strings, rendered in the Learn tab and offered before a tense is first drilled.
const t = (rows, head) =>
  `<table class="grid">${head ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
const ex = (fr, en) => `<p class="ex"><b>${fr}</b><br><span>${en}</span></p>`;

export const LESSONS = [
  {
    id: 'method',
    title: 'How to drill (read this once)',
    blurb: 'Why this app makes you type, and how to get the most from it.',
    html: `
<p>You remember what you <b>retrieve</b>, not what you re-read. Every card here makes you type the answer from memory, then fixes mistakes immediately by making you retype the correct form.</p>
<ul>
<li><b>Two sessions a day.</b> A new card is drilled once, comes back about 8 hours later (the evening reminder), then the next day, then spreads out. Morning + evening beats one long session.</li>
<li><b>Type, don't peek.</b> Guessing wrong is useful. A wrong guess followed by the right answer sticks far better than reading the answer.</li>
<li><b>Say it out loud.</b> Press 🔊 and repeat the whole row. Your mouth learns patterns your eyes skip.</li>
<li><b>Accents count.</b> <i>mangé</i> and <i>mange</i> are different forms. Use the accent bar under the keyboard.</li>
<li><b>Blitz is for speed.</b> Cards teach you the table; Blitz makes single forms automatic, with a sentence around them, and hunts your weak spots.</li>
<li><b>Missed forms come back sooner.</b> Wrong answers in Blitz pull that verb and tense back into your review queue.</li>
</ul>
<p>Learn order: meaning → present → past participle → passé composé → imparfait → futur → conditionnel → subjonctif → impératif → plus-que-parfait, mixed with vocabulary. You can switch tenses on or off in Settings.</p>`,
  },
  {
    id: 'foundations',
    title: 'Foundations: groups, pronouns, auxiliaries',
    blurb: 'The three verb families and the two helper verbs.',
    html: `
<h3>Three families (by infinitive ending)</h3>
${t(
  [
    ['<b>-er</b> (about 90% of verbs)', 'parler, manger, aimer', 'regular, with a few spelling tweaks'],
    ['<b>-ir</b> (2nd group)', 'finir, choisir, réussir', 'add <i>-iss-</i> in plural forms'],
    ['<b>-re</b>', 'vendre, attendre, répondre', 'drop the <i>-re</i>, add endings'],
    ['<b>irregular</b>', 'être, avoir, aller, faire, prendre…', 'must be memorised. This app drills them first'],
  ],
  ['Family', 'Examples', 'Pattern']
)}
<h3>Subject pronouns</h3>
<p><b>je</b> (j' before a vowel) · <b>tu</b> (informal one person) · <b>il / elle / on</b> · <b>nous</b> · <b>vous</b> (formal one person, or several) · <b>ils / elles</b>. <i>On</i> means "we" in speech and conjugates like <i>il</i>.</p>
<h3>Two helper verbs</h3>
<p><b>avoir</b> and <b>être</b> build every compound tense (passé composé, plus-que-parfait). Learn them cold: <i>être</i> and <i>avoir</i> are cards #1 and #2 for a reason.</p>
<h3>Spelling changes you will meet</h3>
<ul>
<li><b>-ger / -cer:</b> keep the sound soft before <i>a/o</i>: <i>nous mangeons, je mangeais, nous commençons, je commençais</i>.</li>
<li><b>acheter, lever:</b> è before a silent ending: <i>j'achète, nous achetons</i> (the "boot" shape: je/tu/il/ils change, nous/vous don't).</li>
<li><b>appeler, jeter:</b> double the consonant instead: <i>j'appelle, nous appelons</i>.</li>
<li><b>payer, envoyer, essayer:</b> y → i before a silent ending: <i>je paie, nous payons</i>.</li>
<li><b>préférer:</b> é → è before a silent ending: <i>je préfère, nous préférons</i>.</li>
</ul>`,
  },
  {
    id: 'present',
    tense: 'present',
    title: 'Présent',
    blurb: 'What is happening, what usually happens, what is true.',
    html: `
<h3>Use it for</h3>
<ul><li>Actions now and habits: <i>Je travaille à Londres. Nous mangeons à midi.</i></li>
<li>General truths: <i>L'eau bout à 100 degrés.</i></li>
<li>Near future (very common): <i>Je pars demain.</i></li>
<li>Something that started in the past and continues, with <i>depuis</i>: <i>J'habite ici depuis 2019.</i></li></ul>
<h3>Regular endings</h3>
${t(
  [
    ['je', 'parl<b>e</b>', 'fin<b>is</b>', 'vend<b>s</b>'],
    ['tu', 'parl<b>es</b>', 'fin<b>is</b>', 'vend<b>s</b>'],
    ['il/elle', 'parl<b>e</b>', 'fin<b>it</b>', 'vend'],
    ['nous', 'parl<b>ons</b>', 'fin<b>issons</b>', 'vend<b>ons</b>'],
    ['vous', 'parl<b>ez</b>', 'fin<b>issez</b>', 'vend<b>ez</b>'],
    ['ils/elles', 'parl<b>ent</b>', 'fin<b>issent</b>', 'vend<b>ent</b>'],
  ],
  ['', '-er', '-ir', '-re']
)}
<h3>The irregulars you must own</h3>
<p>Most irregular verbs share one of two skeletons. Learn the skeleton, then each stem:</p>
<ul><li><b>-s, -s, -t, -ons, -ez, -ent</b> (pars, pars, part…, dors, sors, lis, mets)</li>
<li><b>-x, -x, -t</b> for modals: <i>je peux, tu peux, il peut; je veux, tu veux, il veut</i></li>
<li>Famous odd ones: <i>vous êtes, vous dites, vous faites</i>, and <i>ils sont, ils ont, ils vont, ils font</i></li></ul>
<h3>Memory hook</h3>
<p>Say each verb as a rhythm: <i>je vais, tu vas, il va, nous allons, vous allez, ils vont</i>. The "boot" shapes (<i>je, tu, il, ils</i> share a stem; <i>nous, vous</i> have another) show up in <i>boire, venir, prendre, devoir, recevoir</i>.</p>`,
  },
  {
    id: 'participe',
    title: 'Past participles & être verbs',
    blurb: 'The building block for passé composé and plus-que-parfait.',
    html: `
<h3>Regular participles</h3>
${t([['-er', '→ <b>-é</b>', 'parlé, mangé, allé'], ['-ir (finir type)', '→ <b>-i</b>', 'fini, choisi, dormi'], ['-re', '→ <b>-u</b>', 'vendu, attendu, perdu']])}
<h3>Irregular participles to memorise</h3>
${t(
  [
    ['être → <b>été</b>', 'avoir → <b>eu</b>', 'faire → <b>fait</b>', 'dire → <b>dit</b>'],
    ['prendre → <b>pris</b>', 'mettre → <b>mis</b>', 'voir → <b>vu</b>', 'savoir → <b>su</b>'],
    ['pouvoir → <b>pu</b>', 'vouloir → <b>voulu</b>', 'devoir → <b>dû</b>', 'croire → <b>cru</b>'],
    ['lire → <b>lu</b>', 'écrire → <b>écrit</b>', 'boire → <b>bu</b>', 'vivre → <b>vécu</b>'],
    ['venir → <b>venu</b>', 'naître → <b>né</b>', 'mourir → <b>mort</b>', 'ouvrir → <b>ouvert</b>'],
    ['recevoir → <b>reçu</b>', 'connaître → <b>connu</b>', 'offrir → <b>offert</b>', 'suivre → <b>suivi</b>'],
  ]
)}
<h3>Which helper? avoir by default, être for…</h3>
<p><b>DR &amp; MRS VANDERTRAMP</b>: <b>D</b>evenir, <b>R</b>evenir, <b>M</b>onter, <b>R</b>ester, <b>S</b>ortir, <b>V</b>enir, <b>A</b>ller, <b>N</b>aître, <b>D</b>escendre, <b>E</b>ntrer, <b>R</b>entrer, <b>T</b>omber, <b>R</b>etourner, <b>A</b>rriver, <b>M</b>ourir, <b>P</b>artir. Plus <b>every reflexive verb</b> (se lever → <i>je me suis levé</i>).</p>
<p>Several of them switch to <i>avoir</i> when they take a direct object: <i>Elle est sortie</i> but <i>Elle a sorti la voiture</i>; <i>Il est monté</i> but <i>Il a monté les valises</i>.</p>
<h3>Agreement</h3>
<ul><li><b>With être</b> the participle agrees with the subject: <i>elle est allée, ils sont partis, elles sont arrivées</i>. In this app you will see <b>allé(e)(s)</b>: type the version that matches who you mean (both are accepted).</li>
<li><b>With avoir</b> it never agrees with the subject. It agrees only with a direct object that comes <i>before</i> the verb: <i>Les pommes que j'ai mangées</i>.</li></ul>`,
  },
  {
    id: 'passe_compose',
    tense: 'passe_compose',
    title: 'Passé composé',
    blurb: 'Finished actions: what happened.',
    html: `
<h3>Formation</h3>
<p><b>avoir or être (present) + past participle</b>: <i>j'ai mangé, elle est partie, nous nous sommes levés</i>.</p>
<h3>Use it for</h3>
<ul><li>Completed events: <i>Hier, j'ai fini le rapport.</i></li>
<li>A sequence of actions: <i>Il est entré, il a posé son sac, il s'est assis.</i></li>
<li>An action with a clear beginning or end, or a stated number of times: <i>J'ai habité trois ans à Paris. Nous y sommes allés deux fois.</i></li></ul>
<h3>Negation wraps the helper</h3>
${ex("Je n'ai pas mangé.", "I didn't eat.")}${ex("Elle n'est jamais venue.", 'She never came.')}
<h3>Passé composé vs imparfait</h3>
<p>One question: <b>is it a single event (passé composé) or a background / habit (imparfait)?</b></p>
${ex("Il pleuvait quand je suis sorti.", 'It was raining (background) when I went out (event).')}
<h3>Common traps</h3>
<ul><li>Forgetting to agree the participle with <i>être</i>.</li><li>Using <i>avoir</i> with a reflexive verb: it is always <i>être</i>.</li><li>Typing the infinitive (<i>j'ai manger</i>) instead of the participle (<i>j'ai mangé</i>).</li></ul>`,
  },
  {
    id: 'imparfait',
    tense: 'imparfait',
    title: 'Imparfait',
    blurb: 'Scenery, habits and "used to" in the past.',
    html: `
<h3>Formation</h3>
<p>Take the <b>nous</b> form of the present, delete <b>-ons</b>, add:</p>
${t([['je', '-ais'], ['tu', '-ais'], ['il/elle', '-ait'], ['nous', '-ions'], ['vous', '-iez'], ['ils/elles', '-aient']])}
<p><i>nous parlons → parl-</i> → je parl<b>ais</b>. <i>nous finissons → finiss-</i> → je finiss<b>ais</b>. <i>nous prenons → pren-</i> → je pren<b>ais</b>.</p>
<p>The only exception is <b>être</b>: <i>ét-</i> → j'étais, tu étais, il était, nous étions, vous étiez, ils étaient.</p>
<p>Spelling: <i>je mangeais, nous mangions · je commençais, nous commencions</i>; verbs in <i>-ier</i> keep both i's: <i>nous étudiions, vous oubliiez</i>.</p>
<h3>Use it for</h3>
<ul><li>Habits in the past: <i>Quand j'étais petit, je jouais dehors tous les jours.</i></li>
<li>Descriptions and background: <i>Il faisait beau. Elle portait une robe rouge.</i></li>
<li>States of mind: <i>Je voulais partir. Il pensait que…</i></li>
<li>An action in progress when something else happened: <i>Je dormais quand tu as appelé.</i></li>
<li>Polite suggestions: <i>Et si on allait au cinéma ?</i></li></ul>`,
  },
  {
    id: 'plus_que_parfait',
    tense: 'plus_que_parfait',
    title: 'Plus-que-parfait',
    blurb: 'The past before the past.',
    html: `
<h3>Formation</h3>
<p><b>avoir or être in the imparfait + past participle</b>: <i>j'avais mangé, elle était partie, nous nous étions levés</i>. Same helper choice and same agreement as the passé composé.</p>
<h3>Use it for</h3>
<ul><li>An action that finished before another past action: <i>Quand je suis arrivé, le train était déjà parti.</i></li>
<li>Reasons and background to a past event: <i>Il était fatigué parce qu'il avait mal dormi.</i></li>
<li>With <i>si</i> for regrets: <i>Si j'avais su, je serais venu.</i> (conditionnel passé)</li></ul>
<p>Memory hook: if the helper verb already sounds like "was/had been" (<i>étais, avais</i>), it is <b>one step earlier</b> in time.</p>`,
  },
  {
    id: 'futur',
    tense: 'futur',
    title: 'Futur simple',
    blurb: 'Will happen, predictions and promises.',
    html: `
<h3>Formation</h3>
<p><b>Infinitive (drop the final -e of -re verbs) + ai, as, a, ons, ez, ont.</b> These are the present tense of <i>avoir</i> stuck on the end.</p>
${t([['je', 'parler<b>ai</b>'], ['tu', 'parler<b>as</b>'], ['il/elle', 'parler<b>a</b>'], ['nous', 'parler<b>ons</b>'], ['vous', 'parler<b>ez</b>'], ['ils/elles', 'parler<b>ont</b>']])}
<h3>Irregular stems (the ending is always regular)</h3>
${t(
  [
    ['être → <b>ser-</b>', 'avoir → <b>aur-</b>', 'aller → <b>ir-</b>', 'faire → <b>fer-</b>'],
    ['pouvoir → <b>pourr-</b>', 'vouloir → <b>voudr-</b>', 'devoir → <b>devr-</b>', 'savoir → <b>saur-</b>'],
    ['voir → <b>verr-</b>', 'venir → <b>viendr-</b>', 'tenir → <b>tiendr-</b>', 'envoyer → <b>enverr-</b>'],
    ['recevoir → <b>recevr-</b>', 'courir → <b>courr-</b>', 'mourir → <b>mourr-</b>', 'acheter → <b>achèter-</b>'],
  ]
)}
<p>Every future stem ends in <b>-r</b>, so you hear an "r" before the ending. Learn the stem, not the whole table.</p>
<h3>Use it for</h3>
<ul><li>Future events and promises: <i>Je t'appellerai demain.</i></li>
<li>After <i>quand, dès que, lorsque</i> when the action is future (English uses the present): <i>Quand j'arriverai, je t'appellerai.</i></li>
<li>With <i>si</i> the verb in the "if" part stays present: <i>Si tu viens, nous mangerons ensemble.</i></li></ul>
<h3>Near future: aller + infinitive</h3>
${ex('Je vais partir.', 'I am going to leave.')}
<p>Also <b>venir de + infinitive</b> (just did): <i>Je viens de manger.</i> And <b>être en train de</b> (in the middle of): <i>Je suis en train de manger.</i></p>`,
  },
  {
    id: 'conditionnel',
    tense: 'conditionnel',
    title: 'Conditionnel',
    blurb: 'Would: politeness, hypotheses, advice.',
    html: `
<h3>Formation</h3>
<p><b>Future stem + imparfait endings</b> (ais, ais, ait, ions, iez, aient): <i>je parlerais, tu irais, il serait, nous pourrions</i>. If you know the future, you know the conditional.</p>
<h3>Use it for</h3>
<ul><li>Polite requests: <i>Je voudrais un café. Pourriez-vous m'aider ?</i></li>
<li>Advice: <i>Tu devrais dormir plus.</i></li>
<li>Hypotheses with <b>si + imparfait → conditionnel</b>: <i>Si j'avais le temps, je voyagerais plus.</i></li>
<li>Reported or unconfirmed news: <i>Selon la presse, il serait malade.</i></li></ul>
<h3>The golden rule of "si"</h3>
${t(
  [
    ['si + <b>présent</b>', '<b>futur</b>', 'Si tu viens, je serai content.'],
    ['si + <b>imparfait</b>', '<b>conditionnel</b>', 'Si tu venais, je serais content.'],
    ['si + <b>plus-que-parfait</b>', '<b>conditionnel passé</b>', 'Si tu étais venu, j\'aurais été content.'],
  ],
  ['If-part', 'Result', 'Example']
)}
<p>Never put the conditional (or future) directly after <i>si</i> in these "if" sentences.</p>`,
  },
  {
    id: 'subjonctif',
    tense: 'subjonctif',
    title: 'Subjonctif présent',
    blurb: 'Wishes, necessity, emotion, doubt: "that I do".',
    html: `
<h3>Formation</h3>
<p><b>Take the ils form of the present, drop -ent</b>, add <b>e, es, e, ions, iez, ent</b> (always after <i>que</i>).</p>
<p><i>ils parlent → parl-</i> → que je parl<b>e</b>, que nous parl<b>ions</b>. <i>ils finissent → finiss-</i> → que je finiss<b>e</b>.</p>
<p>For <i>nous / vous</i> verbs with two stems use the nous/imparfait stem: <i>que nous buvions</i> (but <i>qu'ils boivent</i>), <i>que nous venions</i> (but <i>qu'ils viennent</i>), <i>que nous prenions</i>.</p>
<h3>Irregular (memorise)</h3>
${t(
  [
    ['être', 'sois, sois, soit, soyons, soyez, soient'],
    ['avoir', 'aie, aies, ait, ayons, ayez, aient'],
    ['aller', 'aille, ailles, aille, allions, alliez, aillent'],
    ['faire', 'fasse, fasses, fasse, fassions, fassiez, fassent'],
    ['pouvoir', 'puisse, puisses, puisse, puissions, puissiez, puissent'],
    ['savoir', 'sache, saches, sache, sachions, sachiez, sachent'],
    ['vouloir', 'veuille, veuilles, veuille, voulions, vouliez, veuillent'],
  ]
)}
<h3>When it is triggered</h3>
<ul><li><b>Necessity:</b> <i>il faut que, il est important que, il vaut mieux que</i></li>
<li><b>Wanting/ordering:</b> <i>vouloir que, préférer que, exiger que</i></li>
<li><b>Emotion:</b> <i>être content que, avoir peur que, regretter que</i></li>
<li><b>Doubt:</b> <i>douter que, ne pas penser que, il se peut que</i></li>
<li><b>Conjunctions:</b> <i>pour que, avant que, bien que, afin que, jusqu'à ce que, à condition que</i></li></ul>
<p>Same subject in both halves? Use the infinitive instead: <i>Je veux partir</i> but <i>Je veux que tu partes.</i></p>
<p>Facts and certainty use the indicative: <i>Je pense qu'il vient, je sais qu'il est là.</i></p>`,
  },
  {
    id: 'imperatif',
    tense: 'imperatif',
    title: 'Impératif',
    blurb: 'Commands, instructions, invitations.',
    html: `
<h3>Formation</h3>
<p>Take the present <b>tu / nous / vous</b> forms with <b>no pronoun</b>: <i>Parle ! Parlons ! Parlez !</i></p>
<ul><li><b>-er verbs (and aller, ouvrir, offrir…): drop the -s of tu</b>: <i>Tu parles → Parle ! Tu vas → Va ! Tu ouvres → Ouvre !</i> The s comes back before <i>y</i> and <i>en</i>: <i>Vas-y ! Parles-en !</i></li>
<li><b>Four irregulars:</b> être → <i>sois, soyons, soyez</i> · avoir → <i>aie, ayons, ayez</i> · savoir → <i>sache, sachons, sachez</i> · vouloir → <i>veuillez</i> (formal "please").</li></ul>
<h3>Pronouns and negation</h3>
${t(
  [
    ['Affirmative', 'Lève-toi ! Donne-le-moi !', 'pronouns <b>after</b>, joined with hyphens'],
    ['Negative', 'Ne te lève pas ! Ne me le donne pas !', 'normal order, ne … pas around everything'],
  ]
)}`,
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
export const lessonForTense = (tenseId) => LESSONS.find((l) => l.tense === tenseId);
