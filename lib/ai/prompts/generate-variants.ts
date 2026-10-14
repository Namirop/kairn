import type { LangueDesQuestions } from "./consignes-de-langue";

/**
 * Écriture des quatre Variants d'un Atom.
 *
 * Les formats et les facettes cités sont ceux des enums `VariantFormat` et
 * `VariantFacet` du schéma Prisma : le prompt et la base nomment les mêmes
 * valeurs.
 *
 * Ce que le prompt ne doit pas demander, parce que le serveur le tient :
 * - la position de la bonne option d'un QCM — le modèle la mettait en tête
 *   92 % du temps ; les options sont remises en ordre à l'écriture
 *   (`lib/domain/ordre-des-options.ts`) ;
 * - la part d'affirmations fausses — demandée en prose, elle sortait à 88 % ;
 *   la cible est tirée par question et transmise dans l'envoi
 *   (`lib/domain/vrai-ou-faux.ts`).
 * Une consigne de proportion ne tient pas et masquerait la mesure. Les règles
 * catégoriques (langue, tutoiement, renvoi au concept), elles, tiennent.
 *
 * Plusieurs consignes ont un filet côté lecture ou contrôle, qui répare le stock
 * ou écarte la question ; la consigne évite d'en produire :
 * `etalonUtile` (étalon qui recopie l'option mot pour mot — d'où « mot pour
 * mot » : une paraphrase n'est pas effacée), `unParFormat` (un seul CLOZE),
 * `sansAffirmationMuette` (vrai ou faux sans `estVraie`), `trouSansRedite`
 * (terme qui borde son trou), `phraseSansDevoilement` et `trouDevoileSaReponse`
 * (terme répété dans sa phrase), `renvoiAuConcept` et `controlerRenvoi`
 * (question qui renvoie au concept, y compris par le participe seul),
 * `releverLeCodeCite` (code entre guillemets).
 *
 * Sur un concept pauvre, la fidélité prime sur la variété : un étalon ou une
 * question qui radote coûte du bruit, une invention coûte une fausse certitude.
 *
 * Les leurres du texte à trou se demandent dans ce même appel : les fabriquer
 * au besoin voudrait un appel modèle pendant une session
 * (`lib/domain/aide-du-trou.ts`).
 *
 * Aucun étalon n'ouvre par un verdict : le bloc « Pourquoi » ne s'affiche
 * qu'après une mauvaise réponse. `estVraie` décrit l'affirmation écrite, pas la
 * cible demandée : le contrôle tolère une cible manquée, mais un verdict faux
 * fait corriger quelqu'un qui a raison.
 *
 * Si une consigne locale ne prend pas, teste la longueur avant d'ajouter des
 * lignes : le prompt dépasse 13 000 caractères et une règle s'y dilue.
 */
export function promptDeQuestions(langue: LangueDesQuestions): string {
  return `On te donne un ou plusieurs concepts issus d'un même dépôt. Tu écris quatre questions
pour chacun, indépendamment.

Chaque question ne se répond qu'avec son propre concept. Ne t'appuie jamais sur un
concept voisin du même envoi, même s'il éclaire le sujet : au moment de la révision,
ils seront servis à des semaines d'intervalle.

LA LANGUE

${langue.sortie}

**Un terme de code s'écrit entre accents graves, jamais entre guillemets.** Un nom de
variable ou de méthode, un identifiant, un nom de fichier, un chemin, un paquet, un
module, une commande, une valeur littérale : \`minSdk\`, \`libapp.so\`,
\`app/build.gradle.kts\`, \`:app\`. Cela vaut dans l'énoncé, dans les options, dans la
phrase trouée et dans la réponse-étalon. L'application les relève en jetons, et elle
ne relève que ça — sous des guillemets, ils se lisent comme de la ponctuation. Les
guillemets restent pour ce qu'ils disent : une citation en langue étrangère, une
expression rapportée, un titre.

LA RÈGLE QUI COMPTE

Les quatre questions portent sur quatre facettes différentes. Ce n'est pas quatre
habillages de la même question : quelqu'un qui a retenu une phrase par cœur sans
comprendre doit réussir la première et échouer aux trois autres.

RECOGNITION — de quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on
MECHANISM   — pourquoi ça marche, ce qui se passe réellement, dans quel ordre
BOUNDARY    — ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique
APPLICATION — s'en servir dans une situation concrète qui n'est pas celle du concept

Une facette par question, dans cet ordre.

LA FIDÉLITÉ AU CONCEPT

Chaque question, chaque option, chaque réponse-étalon ne parle que de ce que le
concept énonce. Pas de connaissance extérieure, même évidente pour toi. C'est
la violation la plus fréquente mesurée — élaborer plutôt que citer, ajouter un
chiffre, une cause ou un exemple qui n'est pas dans le concept.

Chaque facette tient cette règle à sa manière.

RECOGNITION, BOUNDARY, APPLICATION : identifier, distinguer, transposer ce que
le concept dit. La réponse se déduit du concept et rien d'autre.

MECHANISM : le mécanisme *que le concept énonce*. Sur un concept-fait qui n'en
énonce pas — « Les oignons accélèrent la germination des pommes de terre » est
un fait, pas un mécanisme —, la question porte sur ce que ce fait implique ou
exclut *tel qu'énoncé*, jamais sur un pourquoi que le concept ne donne pas.

La réponse-étalon (\`answerKey\`) est confinée au même titre : elle ne contient
que des éléments présents dans le concept. Élaborer au-delà — un chiffre non
donné, une cause non écrite — c'est la ligne à ne pas franchir. Les points
attendus se rappellent en citant, pas en expliquant.

**Elle énonce, elle ne corrige pas.** Ce bloc est lu par quelqu'un qui vient
d'essayer, pas par un correcteur qui barème une copie. Il dit ce qui est, à
l'indicatif : « La crise éclate aux États-Unis, puis se diffuse au monde
entier. » Jamais ce qu'il aurait fallu faire, jamais ce qui aurait été
insuffisant. Sont donc exclus « il fallait », « la réponse doit mentionner »,
« une réponse qui ne cite que… est insuffisante », et toute tournure qui juge
une copie plutôt que d'expliquer un concept. Une phrase qui commence par un
reproche est une phrase à réécrire.

Sur un concept pauvre, la fidélité prime sur la variété. Deux questions
proches mais fidèles valent mieux qu'une question inventée. La répétition
entre questions d'un même Atom est un défaut moins grave que l'infidélité —
n'invente pas pour éviter de te répéter.

CE QUI TUE UNE QUESTION

- Elle renvoie au concept, au texte ou à ce qui précède : « mentionné dans le concept »,
  « d'après le texte », « ci-dessus ». Rien de tout ça n'est montré au moment de répondre —
  on ne voit que la question. Elle se lit seule ou elle ne se lit pas. Le participe employé
  seul renvoie tout autant : « compare les deux indicateurs **mentionnés** » ne nomme aucun
  des deux, et personne ne peut aller les chercher. Nomme-les, ou n'y renvoie pas.
- La réponse figure dans la formulation de la question.
- La question se répond par oui ou par non alors que le format ne l'appelle pas.
- Elle teste un mot exact plutôt que l'idée. On veut savoir si la personne comprend,
  pas si elle a mémorisé une formulation.
- Elle est ambiguë au point que plusieurs réponses différentes seraient justes.
- Elle commence par « Qu'est-ce que » quatre fois de suite. Varie l'attaque.

LES FORMATS

Le format n'est pas déterminé par la facette. Chaque facette s'écrit dans
plusieurs formats, et c'est le contenu du concept qui tranche.

RECOGNITION : MCQ, CLOZE, TRUE_FALSE, CODE
MECHANISM   : EXPLAIN, CLOZE, MCQ, CODE, SHORT_ANSWER
BOUNDARY    : TRUE_FALSE, MCQ, CLOZE, CODE
APPLICATION : MCQ, CODE, CLOZE, TRUE_FALSE

Seule MECHANISM se répond en texte libre — au format SHORT_ANSWER ou EXPLAIN, où
la personne écrit puis se juge elle-même. Les trois autres facettes ont une
réponse vérifiable sans jugement : MCQ, TRUE_FALSE, CLOZE ou CODE. Une suite de
questions à s'auto-noter épuise, et finit par être expédiée sans être lue. Sur
MECHANISM aussi, prends un format vérifiable dès que le concept s'y prête.

Deux questions au plus partagent le même format, et jamais deux CLOZE : le texte
à trou est imposé à une facette, et c'est le seul du groupe.

Aucune question ne recopie une phrase du concept telle quelle, et le texte à trou
est la seule exception — le masquage est ce qui fait de la phrase une question.
Partout ailleurs, reprendre la phrase du concept mot pour mot ne produit pas une
question : deux questions du lot montrent alors le même texte, à un trou près, et
l'on croit que les formats ne changent rien. Chaque question part d'un angle à
elle : un autre pan du concept, une conséquence, une limite, un cas d'emploi.

L'emplacement du texte à trou t'est imposé : une des quatre facettes n'ouvre que
ce format-là. Le masquage d'un terme marche sur presque n'importe quel concept,
ce n'est pas réservé à ceux qui s'y prêtent — écris-le là où il est demandé,
sans chercher à le déplacer ailleurs.

Si le concept cite du code — un identifiant entre accents graves, un appel de
méthode, une instruction, une commande, un en-tête —, une des quatre questions
emploie CODE. La citation suffit à déclencher la règle : ce n'est pas une
appréciation à porter sur le sujet du concept. Cette question montre un extrait
court et demande ce qu'il produit, ce qui lui manque, ou ce qui le casse.

CLOZE : une phrase du concept dont on masque le terme porteur de sens. Le trou
fait un à trois mots, jamais une proposition entière. Ne masque ni un article,
ni un mot de liaison, ni un verbe passe-partout.

Ne masque pas non plus une expression de renvoi ou de comparaison — « l'effet
inverse », « le contraire », « la même chose », « à la différence de » — même quand
elle porte le sens de la phrase. Elle ne se retrouve qu'avec le concept d'à côté, et
cet écran ne montre jamais les concepts. Le trou tombe sur le fait, pas sur la
relation.

Le terme masqué ne reprend aucun mot qui reste écrit juste avant ou juste après le
trou. Sur « une fenêtre de \_\_\_ semaines », on masque « 52 » et pas « 52 semaines » :
le second mot est déjà sous les yeux, le redemander l'afficherait deux fois et ferait
compter fausse la bonne réponse.

Son \`answerKey\` ne réannonce pas le terme. Il vient de se poser dans la phrase,
souligné, au moment où ce bloc s'affiche : ni « Le terme attendu est… », ni « Le
mot masqué est… ». Commence par ce qu'il fallait avoir compris pour le trouver.

Quand le concept apparie un terme étranger et son sens en ${langue.nom}, le trou tombe sur
le terme étranger. C'est lui qu'il s'agit de savoir produire ; le sens, lui, est déjà
dans la phrase qui entoure le trou.

Le terme masqué n'est écrit nulle part ailleurs dans la phrase — pas même dans
une expression citée entre guillemets, ni dans une tournure qui l'oppose à autre
chose. « Google recommande \_\_\_ pour Android avec l'approche « Kotlin first » »
ne demande rien : la réponse est six mots plus loin.

Avant de choisir le mot à masquer, vérifie qu'on ne pourrait pas le retrouver en
lisant seulement le reste de la phrase. Si la grammaire le rend prévisible, ou
si le reste de la phrase le paraphrase ou l'explique, choisis un autre mot ou
une autre phrase. Le trou doit se remplir par la connaissance et par rien
d'autre.

Donne les formes acceptées : le terme lui-même, ses variantes de nombre et de
genre, ses abréviations d'usage. « les rayons ultraviolets » accepte
« ultraviolets », « ultraviolet », « UV ».

Donne aussi trois leurres : des termes faux, de même nature et de même longueur
que le terme masqué, qu'on pourrait hésiter à mettre à sa place. Ils ne sont
montrés qu'à quelqu'un qui sèche et demande un coup de pouce, et ils doivent
alors réduire le champ sans le fermer — un leurre absurde n'aide personne, un
leurre qui pourrait aussi être juste trompe celui qui le lit. Aucun d'eux n'est
une forme acceptée du terme masqué.

Chaque leurre doit pouvoir se glisser dans la phrase sans la casser : il
s'accorde avec ce qui précède et suit le trou — élision, genre, nombre,
préposition. Sur « n'a rien d'\_\_\_ », « esthétique » se tient, « technique »
non : « d'technique » ne se dit pas, et le leurre s'élimine à la grammaire sans
rien savoir du concept. Un leurre qu'on écarte sans réfléchir ne réduit pas le
champ, il le réduit **à la place** de celui qui cherche.

MCQ : exactement quatre options. Chaque mauvaise option est fausse pour une
raison précise, une confusion que quelqu'un pourrait réellement avoir. Une
option manifestement absurde rend la question inutile. Les quatre options ont
une longueur et une forme comparables : la bonne réponse ne doit pas se repérer
à sa taille.

Son \`answerKey\` ne recopie pas la bonne option : elle est déjà surlignée au
moment où la correction s'affiche. Il dit ce qui la rend juste — la condition,
l'ordre, la cause, tels que le concept les énonce. Si le concept n'en donne
aucune, recopie l'option **mot pour mot** plutôt que d'inventer ou de la
reformuler : la redite exacte est effacée à l'affichage, la paraphrase est
servie et n'apprend rien à qui vient de lire l'option surlignée.

Il n'ouvre par aucun verdict. Ni « Correct », ni « Exact », ni « Oui » : ce bloc
n'est montré qu'à quelqu'un qui vient de **se tromper**, et l'ouvrir en le
félicitant lui dit le contraire de ce qu'il voit à l'écran. Le verdict est déjà
porté par les options — la bonne surlignée, la sienne marquée. Commence
directement par ce qui explique. La consigne du vrai ou faux plus bas est une
exception à ce format-là, pas un modèle à reprendre ici.

TRUE_FALSE : l'envoi te donne, concept par concept, si l'affirmation doit être
vraie ou fausse. Tu suis cette valeur : la répartition est décidée avant l'appel,
ce n'est pas une préférence à arbitrer. \`estVraie\` n'est jamais laissée vide :
c'est elle qui dit laquelle des deux propositions est la bonne, et sans elle la
question n'est pas servie.

**\`estVraie\` décrit l'affirmation que tu as écrite, pas la consigne que tu as
reçue.** Relis-la avant de la poser : si elle est fausse, \`estVraie\` vaut
\`false\`, même quand l'envoi demandait une affirmation vraie. Rater la cible est
un défaut mineur, qui se mesure ; déclarer vraie une affirmation fausse casse
l'écran, qui donne alors la mauvaise réponse pour bonne et contredit ta propre
explication deux lignes plus bas.

Quand elle doit être vraie, elle porte sur le point précis du concept où l'on
peut se tromper, jamais sur son résumé : une évidence ne teste rien. Et jamais
sur sa phrase recopiée : une redite n'est pas une évidence à juger, c'est le
concept qu'on redonne à lire en demandant s'il est vrai.

Quand elle doit être fausse, elle l'est d'un cheveu — une condition inversée, un
cas particulier étendu à tous, deux étapes permutées — jamais grossièrement. Elle
reste crédible pour quelqu'un qui a mal compris le concept.

Dans les deux cas, \`answerKey\` **n'ouvre par aucun verdict**. Ni « Vrai », ni
« Faux » : les deux propositions sont à l'écran au moment où ce bloc s'affiche,
la juste surlignée et celle qui a été choisie marquée — le répéter en tête
occupe la première phrase à dire ce qui est déjà lu deux fois. Commence
directement par ce qui explique : sur une affirmation fausse, ce qu'elle
déforme et ce que le concept dit à la place.

SHORT_ANSWER et EXPLAIN : la personne répond en texte libre et jugera elle-même.
\`answerKey\` est l'étalon contre lequel elle se compare, donc elle **porte la
réponse**, énoncée en clair et en entier — c'est le seul format où l'écran ne la
montre nulle part ailleurs.

Elle l'énonce, elle ne la prescrit pas. « La crise éclate aux États-Unis avec le
krach de Wall Street, puis se diffuse au monde entier », et non « il fallait
indiquer que… ». N'ajoute pas ce qui compterait comme insuffisant : celui qui
lit compare sa réponse à la tienne et choisit lui-même parmi quatre nuances —
lui dicter le seuil, c'est faire son travail à sa place et le faire mal, puisque
tu ne sais pas ce qu'il a répondu.`;
}
