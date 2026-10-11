// ~100 verbs ordered by learning priority. Regular verbs only need infinitive + meaning;
// the engine derives everything. Irregulars list what cannot be derived:
//   pres  present forms          pp   past participle        aux  'être' (default avoir)
//   imp   imparfait stem         fut  future/conditional stem
//   sub   subjunctive "ils" stem subN subjunctive "nous" stem (defaults to imp stem)
//   subj  full subjunctive       impr [tu, nous, vous] imperative override
import { displayInf } from './conjugate.js';

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();

const v = (inf, en, ex, o = {}) => {
  const [fr, exEn] = ex.split('|');
  const verb = { inf, en, ex: fr, exEn, ...o };
  verb.id = (o.refl ? 'se-' : '') + slug(inf);
  verb.label = displayInf(verb);
  verb.irregular = !!o.pres;
  return verb;
};
const refl = { refl: true };

export const VERBS = [
  v('être', 'to be', 'Je suis fatigué ce soir.|I am tired tonight.', { pp: 'été', pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], imp: 'ét', fut: 'ser', subj: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'], impr: ['sois', 'soyons', 'soyez'] }),
  v('avoir', 'to have', "J'ai deux frères.|I have two brothers.", { pp: 'eu', pres: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], imp: 'av', fut: 'aur', subj: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'], impr: ['aie', 'ayons', 'ayez'] }),
  v('aller', 'to go', 'Nous allons à Paris demain.|We are going to Paris tomorrow.', { aux: 'être', pp: 'allé', pres: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], imp: 'all', fut: 'ir', sub: 'aill', subN: 'all' }),
  v('faire', 'to do / to make', 'Il fait ses devoirs.|He is doing his homework.', { pp: 'fait', pres: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], imp: 'fais', fut: 'fer', sub: 'fass', subN: 'fass' }),
  v('pouvoir', 'to be able to / can', 'Je peux venir à dix heures.|I can come at ten.', { pp: 'pu', pres: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], imp: 'pouv', fut: 'pourr', sub: 'puiss', subN: 'puiss', noImp: true }),
  v('vouloir', 'to want', 'Elle veut un café.|She wants a coffee.', { pp: 'voulu', pres: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], imp: 'voul', fut: 'voudr', sub: 'veuill', subN: 'voul', impr: ['veuille', 'veuillons', 'veuillez'] }),
  v('devoir', 'to have to / must / to owe', 'Nous devons partir.|We have to leave.', { pp: 'dû', pres: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'], imp: 'dev', fut: 'devr', sub: 'doiv', subN: 'dev', noImp: true }),
  v('savoir', 'to know (a fact / how to)', 'Je sais nager.|I know how to swim.', { pp: 'su', pres: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'], imp: 'sav', fut: 'saur', sub: 'sach', subN: 'sach', impr: ['sache', 'sachons', 'sachez'] }),
  v('voir', 'to see', 'Tu vois la mer ?|Do you see the sea?', { pp: 'vu', pres: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], imp: 'voy', fut: 'verr', sub: 'voi', subN: 'voy' }),
  v('venir', 'to come', 'Ils viennent de Lyon.|They come from Lyon.', { aux: 'être', pp: 'venu', pres: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], imp: 'ven', fut: 'viendr', sub: 'vienn', subN: 'ven' }),
  v('dire', 'to say / to tell', 'Que dites-vous ?|What are you saying?', { pp: 'dit', pres: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], imp: 'dis' }),
  v('prendre', 'to take', 'Je prends le train de huit heures.|I take the eight o\'clock train.', { pp: 'pris', pres: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], imp: 'pren', sub: 'prenn', subN: 'pren' }),
  v('donner', 'to give', 'Elle donne un cadeau à son frère.|She gives her brother a present.'),
  v('parler', 'to speak / to talk', 'Nous parlons français.|We speak French.'),
  v('aimer', 'to like / to love', "J'aime le fromage.|I like cheese."),
  v('passer', 'to pass / to spend (time)', "Il passe l'été en France.|He spends the summer in France."),
  v('mettre', 'to put / to put on', 'Elle met son manteau.|She puts on her coat.', { pp: 'mis', pres: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'], imp: 'mett' }),
  v('trouver', 'to find', "Je trouve mes clés.|I find my keys."),
  v('croire', 'to believe / to think', 'Je crois que tu as raison.|I think you are right.', { pp: 'cru', pres: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'], imp: 'croy', sub: 'croi', subN: 'croy' }),
  v('demander', 'to ask', 'Il demande son chemin.|He asks the way.'),
  v('penser', 'to think', 'Je pense à toi.|I am thinking of you.'),
  v('manger', 'to eat', 'Nous mangeons à midi.|We eat at noon.'),
  v('finir', 'to finish', 'Je finis le rapport ce soir.|I am finishing the report tonight.'),
  v('choisir', 'to choose', 'Tu choisis le vin.|You choose the wine.'),
  v('attendre', 'to wait (for)', "J'attends le bus.|I am waiting for the bus."),
  v('vendre', 'to sell', 'Ils vendent des logiciels.|They sell software.'),
  v('partir', 'to leave / to depart', 'Le train part à neuf heures.|The train leaves at nine.', { aux: 'être', pp: 'parti', pres: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'], imp: 'part' }),
  v('sortir', 'to go out / to take out', 'Nous sortons ce soir.|We are going out tonight.', { aux: 'être', pp: 'sorti', pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], imp: 'sort', note: "Takes avoir when it has a direct object: <i>J'ai sorti la poubelle</i>." }),
  v('dormir', 'to sleep', 'Le bébé dort.|The baby is sleeping.', { pp: 'dormi', pres: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'], imp: 'dorm' }),
  v('lire', 'to read', 'Elle lit un roman.|She is reading a novel.', { pp: 'lu', pres: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'], imp: 'lis' }),
  v('écrire', 'to write', 'Il écrit un courriel.|He is writing an email.', { pp: 'écrit', pres: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'], imp: 'écriv' }),
  v('comprendre', 'to understand', 'Je ne comprends pas.|I don\'t understand.', { pp: 'compris', pres: ['comprends', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent'], imp: 'compren', sub: 'comprenn', subN: 'compren' }),
  v('apprendre', 'to learn', "J'apprends le français.|I am learning French.", { pp: 'appris', pres: ['apprends', 'apprends', 'apprend', 'apprenons', 'apprenez', 'apprennent'], imp: 'appren', sub: 'apprenn', subN: 'appren' }),
  v('connaître', 'to know (a person / place)', 'Tu connais Marie ?|Do you know Marie?', { pp: 'connu', pres: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'], imp: 'connaiss' }),
  v('boire', 'to drink', "Nous buvons de l'eau.|We drink water.", { pp: 'bu', pres: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'], imp: 'buv', sub: 'boiv', subN: 'buv' }),
  v('ouvrir', 'to open', 'Il ouvre la fenêtre.|He opens the window.', { pp: 'ouvert', pres: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'], imp: 'ouvr' }),
  v('appeler', 'to call', 'Je t\'appelle demain.|I\'ll call you tomorrow.', { pres: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'], fut: 'appeller' }),
  v('acheter', 'to buy', 'Elle achète du pain.|She buys bread.', { pres: ['achète', 'achètes', 'achète', 'achetons', 'achetez', 'achètent'], fut: 'achèter' }),
  v('commencer', 'to begin / to start', 'Le cours commence à dix heures.|The class starts at ten.'),
  v('payer', 'to pay', 'Je paie par carte.|I pay by card.', { pres: ['paie', 'paies', 'paie', 'payons', 'payez', 'paient'], fut: 'paier' }),
  v('préférer', 'to prefer', 'Je préfère le thé.|I prefer tea.', { pres: ['préfère', 'préfères', 'préfère', 'préférons', 'préférez', 'préfèrent'] }),
  v('jouer', 'to play', 'Les enfants jouent dehors.|The children play outside.'),
  v('travailler', 'to work', 'Elle travaille à Londres.|She works in London.'),
  v('habiter', 'to live (reside)', "J'habite à Southampton.|I live in Southampton."),
  v('regarder', 'to watch / to look at', 'Nous regardons un film.|We are watching a film.'),
  v('écouter', 'to listen (to)', 'Tu écoutes la radio ?|Are you listening to the radio?'),
  v('arriver', 'to arrive / to happen', 'Elle arrive demain.|She arrives tomorrow.', { aux: 'être' }),
  v('rester', 'to stay / to remain', 'Je reste à la maison.|I am staying at home.', { aux: 'être' }),
  v('tomber', 'to fall', 'Les feuilles tombent.|The leaves are falling.', { aux: 'être' }),
  v('entrer', 'to enter / to come in', 'Entrez, je vous en prie.|Come in, please.', { aux: 'être' }),
  v('rentrer', 'to go home / to return', 'Je rentre à six heures.|I get home at six.', { aux: 'être' }),
  v('monter', 'to go up / to climb', "Il monte l'escalier.|He goes up the stairs.", { aux: 'être', note: "Takes avoir with a direct object: <i>J'ai monté les valises</i>." }),
  v('descendre', 'to go down / to get off', 'Nous descendons à la gare.|We get off at the station.', { aux: 'être', note: "Takes avoir with a direct object: <i>J'ai descendu la valise</i>." }),
  v('retourner', 'to return / to go back', 'Elle retourne en Écosse.|She is going back to Scotland.', { aux: 'être' }),
  v('naître', 'to be born', 'Il naît en mai.|He is born in May.', { aux: 'être', pp: 'né', pres: ['nais', 'nais', 'naît', 'naissons', 'naissez', 'naissent'], imp: 'naiss' }),
  v('mourir', 'to die', 'Les fleurs meurent sans eau.|Flowers die without water.', { aux: 'être', pp: 'mort', pres: ['meurs', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent'], imp: 'mour', fut: 'mourr', sub: 'meur', subN: 'mour' }),
  v('devenir', 'to become', 'Il devient ingénieur.|He is becoming an engineer.', { aux: 'être', pp: 'devenu', pres: ['deviens', 'deviens', 'devient', 'devenons', 'devenez', 'deviennent'], imp: 'deven', fut: 'deviendr', sub: 'devienn', subN: 'deven' }),
  v('revenir', 'to come back', 'Je reviens tout de suite.|I\'ll be right back.', { aux: 'être', pp: 'revenu', pres: ['reviens', 'reviens', 'revient', 'revenons', 'revenez', 'reviennent'], imp: 'reven', fut: 'reviendr', sub: 'revienn', subN: 'reven' }),
  v('tenir', 'to hold / to keep', 'Elle tient la porte.|She is holding the door.', { pp: 'tenu', pres: ['tiens', 'tiens', 'tient', 'tenons', 'tenez', 'tiennent'], imp: 'ten', fut: 'tiendr', sub: 'tienn', subN: 'ten' }),
  v('recevoir', 'to receive', 'Nous recevons beaucoup de courriels.|We receive lots of emails.', { pp: 'reçu', pres: ['reçois', 'reçois', 'reçoit', 'recevons', 'recevez', 'reçoivent'], imp: 'recev', fut: 'recevr', sub: 'reçoiv', subN: 'recev' }),
  v('offrir', 'to offer / to give (a gift)', 'Il offre des fleurs à sa mère.|He gives his mother flowers.', { pp: 'offert', pres: ['offre', 'offres', 'offre', 'offrons', 'offrez', 'offrent'], imp: 'offr' }),
  v('découvrir', 'to discover', 'Nous découvrons la ville.|We are discovering the city.', { pp: 'découvert', pres: ['découvre', 'découvres', 'découvre', 'découvrons', 'découvrez', 'découvrent'], imp: 'découvr' }),
  v('courir', 'to run', 'Elle court tous les matins.|She runs every morning.', { pp: 'couru', pres: ['cours', 'cours', 'court', 'courons', 'courez', 'courent'], imp: 'cour', fut: 'courr' }),
  v('vivre', 'to live (be alive)', 'Ils vivent à la campagne.|They live in the countryside.', { pp: 'vécu', pres: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'], imp: 'viv' }),
  v('suivre', 'to follow', 'Je suis un cours en ligne.|I am taking an online course.', { pp: 'suivi', pres: ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'], imp: 'suiv' }),
  v('conduire', 'to drive / to lead', 'Il conduit trop vite.|He drives too fast.', { pp: 'conduit', pres: ['conduis', 'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent'], imp: 'conduis' }),
  v('envoyer', 'to send', "J'envoie le fichier.|I'm sending the file.", { pp: 'envoyé', pres: ['envoie', 'envoies', 'envoie', 'envoyons', 'envoyez', 'envoient'], imp: 'envoy', fut: 'enverr', sub: 'envoi', subN: 'envoy' }),
  v('essayer', 'to try', 'Nous essayons encore.|We are trying again.', { pp: 'essayé', pres: ['essaie', 'essaies', 'essaie', 'essayons', 'essayez', 'essaient'], fut: 'essaier' }),
  v('répondre', 'to answer / to reply', 'Il répond au client.|He replies to the customer.'),
  v('perdre', 'to lose', 'Tu perds ton temps.|You are wasting your time.'),
  v('entendre', 'to hear', 'Je n\'entends rien.|I can\'t hear anything.'),
  v('rendre', 'to give back / to make', 'Elle rend le livre.|She gives the book back.'),
  v('réfléchir', 'to think (about) / to reflect', 'Je réfléchis à ta proposition.|I am thinking over your proposal.'),
  v('réussir', 'to succeed / to pass', "Elle réussit son examen.|She passes her exam."),
  v('remplir', 'to fill (in)', 'Il remplit le formulaire.|He fills in the form.'),
  v('grandir', 'to grow (up)', 'Les enfants grandissent vite.|Children grow up fast.'),
  v('chercher', 'to look for', 'Je cherche mon téléphone.|I am looking for my phone.'),
  v('aider', 'to help', 'Pouvez-vous m\'aider ?|Can you help me?'),
  v('utiliser', 'to use', "Nous utilisons ce logiciel.|We use this software."),
  v('oublier', 'to forget', "J'oublie toujours mon parapluie.|I always forget my umbrella."),
  v('étudier', 'to study', 'Elle étudie le droit.|She studies law.'),
  v('porter', 'to wear / to carry', 'Il porte une veste bleue.|He is wearing a blue jacket.'),
  v('marcher', 'to walk / to work (function)', 'Ça marche bien.|It works well.'),
  v('rencontrer', 'to meet', 'Je rencontre un client demain.|I am meeting a customer tomorrow.'),
  v('laisser', 'to leave (behind) / to let', 'Laisse-moi tranquille.|Leave me alone.'),
  v('chanter', 'to sing', 'Ils chantent dans la rue.|They sing in the street.'),
  v('danser', 'to dance', 'Nous dansons toute la nuit.|We dance all night.'),
  v('cuisiner', 'to cook', 'Il cuisine très bien.|He cooks very well.'),
  v('changer', 'to change', 'Tout change.|Everything changes.'),
  v('voyager', 'to travel', 'Elle voyage beaucoup.|She travels a lot.'),
  v('partager', 'to share', 'Nous partageons le coût.|We share the cost.'),
  v('nager', 'to swim', 'Je nage tous les week-ends.|I swim every weekend.'),
  v('sentir', 'to feel / to smell', 'Je sens une odeur de pain.|I smell bread.', { pp: 'senti', pres: ['sens', 'sens', 'sent', 'sentons', 'sentez', 'sentent'], imp: 'sent' }),
  v('servir', 'to serve', 'Le restaurant sert du poisson.|The restaurant serves fish.', { pp: 'servi', pres: ['sers', 'sers', 'sert', 'servons', 'servez', 'servent'], imp: 'serv' }),
  // Reflexive verbs: the base infinitive is stored; the engine adds me/te/se..., être, and agreement.
  v('lever', 'to get up', 'Je me lève à sept heures.|I get up at seven.', { ...refl, pres: ['lève', 'lèves', 'lève', 'levons', 'levez', 'lèvent'], pp: 'levé', fut: 'lèver' }),
  v('appeler', 'to be called', 'Elle s\'appelle Claire.|Her name is Claire.', { ...refl, pres: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'], pp: 'appelé', fut: 'appeller' }),
  v('coucher', 'to go to bed', 'Nous nous couchons tard.|We go to bed late.', refl),
  v('réveiller', 'to wake up', 'Il se réveille à six heures.|He wakes up at six.', refl),
  v('souvenir', 'to remember', 'Tu te souviens de moi ?|Do you remember me?', { ...refl, pp: 'souvenu', pres: ['souviens', 'souviens', 'souvient', 'souvenons', 'souvenez', 'souviennent'], imp: 'souven', fut: 'souviendr', sub: 'souvienn', subN: 'souven' }),
];

export const verbById = (id) => VERBS.find((x) => x.id === id);
export const verbRank = (verb) => VERBS.indexOf(verb);
