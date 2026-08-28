/**
 * Écriture des quatre Variants d'un Atom.
 *
 * Texte fourni, recopié mot pour mot. Les formats et les facettes cités ici
 * sont ceux des enums `VariantFormat` et `VariantFacet` du schéma Prisma : le
 * prompt et la base nomment les mêmes valeurs.
 *
 * **L'ordre des options d'un QCM rendu ici n'est pas celui qui sera montré.**
 * Le serveur les remet en ordre à l'écriture du Variant — le modèle plaçait la
 * bonne réponse en première position 92 % du temps, et une consigne de prompt ne
 * tient pas une propriété de distribution. N'ajoute donc pas ici de « varie la
 * position de la bonne réponse » : ce serait un mieux invérifiable par-dessus
 * une correction, elle, mesurée. Voir `lib/domain/ordre-des-options.ts`.
 *
 * **Même chose pour la part d'affirmations fausses.** Elle a été demandée en
 * prose — « à peu près une fois sur deux » — et mesurée à 88 % de fausses sur
 * 125 questions. La cible est maintenant tirée par le serveur, question par
 * question, et transmise dans l'envoi. Ne réintroduis pas ici de consigne de
 * proportion : elle ne tiendrait pas et masquerait la mesure. Voir
 * `lib/domain/vrai-ou-faux.ts`.
 *
 * **La section « LA FIDÉLITÉ AU CONCEPT » a été réécrite le 19 août 2026** à la
 * lecture des 89 questions infidèles mesurées sur 660 par le juge de fidélité
 * (~13 %). La règle globale « Chaque question se répond avec le concept fourni
 * et rien d'autre » a été remplacée par des règles par facette, plus fermes
 * sur MECHANISM — où le modèle comblait le vide d'un concept-fait avec sa
 * propre connaissance — et par une consigne explicite d'arbitrer en faveur de
 * la fidélité quand le concept est pauvre, même au prix d'un léger radotage
 * intra. Le radotage intra est mesuré, moins grave que l'infidélité.
 *
 * **Une ligne a été ajoutée le 27 août 2026 sur le tutoiement**, à contre-courant
 * de l'avertissement ci-dessous, et voici pourquoi. Ce n'est pas une propriété de
 * distribution comme les deux précédentes : c'est une règle catégorique, du même
 * genre que la langue, et le prompt d'extraction en tient une identique sans
 * peine. Elle a été posée quand l'essai de la landing s'est mis à montrer une
 * question : « Expliquez pourquoi… » sur la page qui convertit, alors que le
 * tutoiement est un engagement de marque non négociable. Un relevé en base
 * donnait 1,4 % de questions vouvoyantes — rare, mais servi à tout le monde.
 *
 * **Le contrat de l'étalon a été étendu au QCM le 28 août 2026.** Il n'existait
 * que pour le vrai ou faux — « commence par Vrai ou Faux, puis dit en une phrase
 * ce qui le justifie » — et rien n'était demandé au QCM : le modèle y reformulait
 * donc la bonne option, qui est déjà surlignée à l'écran quand la correction
 * s'affiche. Sur trente-neuf questions à choix servies en production, quinze
 * étalons ne disaient rien de plus que leur option.
 *
 * La consigne se referme sur la fidélité plutôt que de l'ouvrir : sans cause
 * dans le concept, le modèle recopie l'option. C'est `etalonUtile` qui efface
 * alors le bloc à l'affichage — un étalon qui radote coûte une ligne de bruit,
 * un étalon inventé coûte une fausse certitude, et on préfère le premier.
 *
 * **Une ligne a été ajoutée le 28 août 2026 sur le renvoi au concept.** « Quel
 * effet, mentionné dans le concept, courbe la trajectoire de la balle ? » a été
 * servi en session : l'écran de révision ne montre jamais le concept — l'afficher
 * donnerait la réponse avec l'exercice —, donc la question désignait le vide, et
 * il ne restait que deux étiquettes en petites capitales pour deviner le sujet.
 * C'est une règle catégorique de plus, du même genre que la langue et le
 * tutoiement, et `controlerRenvoi` mesure si elle prend.
 *
 * **Les leurres du texte à trou ont été demandés le 28 août 2026.** L'écran de
 * révision propose un coup de pouce à qui sèche : trois ou quatre termes dont un
 * seul est juste. Ils se demandent ici, au même appel que la phrase, parce que
 * les fabriquer au moment du besoin voudrait dire un appel modèle pendant une
 * session — ce que le produit s'interdit. Voir `lib/domain/aide-du-trou.ts`.
 *
 * **Le texte à trou a été rendu unique le 28 août 2026.** « Deux questions au
 * plus partagent le même format » autorisait deux CLOZE, et l'essai de la
 * landing en a servi deux d'affilée sur le même concept — deux fois la même
 * phrase, à un mot masqué près, sur la page qui convertit. La règle générale
 * reste : sans code à citer, il ne reste que trois formats vérifiables pour
 * trois facettes, et exiger quatre formats distincts ferait inventer un format
 * plutôt que tenir la fidélité. L'unicité du CLOZE, elle, est toujours
 * satisfiable — son emplacement est déjà imposé par l'envoi.
 *
 * L'affichage ne s'y fie pas pour autant : `unParFormat` garde une question par
 * format sur la landing, parce qu'une consigne de prompt n'est pas une garantie.
 *
 * **Si la cible ne tient pas malgré tout, teste la longueur d'abord.** Ce prompt
 * est passé de 4 771 à 5 748 caractères en posant cette correction, pendant que
 * celui d'extraction redescendait. Une consigne locale se dilue dans un texte
 * trop long, et la première hypothèse à éprouver sera celle-là — avant d'ajouter
 * encore des lignes pour se faire mieux comprendre.
 */
export const GENERATE_VARIANTS_PROMPT = `On te donne un ou plusieurs concepts issus d'un même dépôt. Tu écris quatre questions
pour chacun, indépendamment.

Chaque question ne se répond qu'avec son propre concept. Ne t'appuie jamais sur un
concept voisin du même envoi, même s'il éclaire le sujet : au moment de la révision,
ils seront servis à des semaines d'intervalle.

LA LANGUE

Tu écris chaque question, chaque réponse et chaque option dans la langue du concept
qu'elle porte. Un concept en anglais donne des questions en anglais, jusqu'aux options
de ses QCM. Personne ne veut réviser en français une note prise en anglais.

Ce n'est pas la langue de cette consigne qui décide, c'est celle du concept qu'on te
donne. Regarde-la avant d'écrire, pas après.

En français, une question qui s'adresse au lecteur le tutoie : « Explique », jamais
« Expliquez ».

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

Sur un concept pauvre, la fidélité prime sur la variété. Deux questions
proches mais fidèles valent mieux qu'une question inventée. La répétition
entre questions d'un même Atom est un défaut moins grave que l'infidélité —
n'invente pas pour éviter de te répéter.

CE QUI TUE UNE QUESTION

- Elle renvoie au concept, au texte ou à ce qui précède : « mentionné dans le concept »,
  « d'après le texte », « ci-dessus ». Rien de tout ça n'est montré au moment de répondre —
  on ne voit que la question. Elle se lit seule ou elle ne se lit pas.
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

MCQ : exactement quatre options. Chaque mauvaise option est fausse pour une
raison précise, une confusion que quelqu'un pourrait réellement avoir. Une
option manifestement absurde rend la question inutile. Les quatre options ont
une longueur et une forme comparables : la bonne réponse ne doit pas se repérer
à sa taille.

Son \`answerKey\` ne recopie pas la bonne option : elle est déjà surlignée au
moment où la correction s'affiche. Il dit ce qui la rend juste — la condition,
l'ordre, la cause, tels que le concept les énonce. Si le concept n'en donne
aucune, recopie l'option plutôt que d'inventer : une redite est effacée à
l'affichage, une invention est servie.

TRUE_FALSE : l'envoi te donne, concept par concept et facette par facette, si
l'affirmation doit être vraie ou fausse. Tu suis cette valeur, et tu la recopies
dans \`estVraie\`. Ce n'est pas une préférence à arbitrer : la répartition est
décidée avant l'appel, et une affirmation rendue à l'envers de ce qui est demandé
est un défaut.

Quand elle doit être vraie, elle porte sur le point précis du concept où l'on
peut se tromper, jamais sur son résumé : une évidence ne teste rien.

Quand elle doit être fausse, elle l'est d'un cheveu — une condition inversée, un
cas particulier étendu à tous, deux étapes permutées — jamais grossièrement. Elle
reste crédible pour quelqu'un qui a mal compris le concept.

Dans les deux cas, \`answerKey\` commence par « Vrai » ou « Faux », puis dit en une
phrase ce qui le justifie.

SHORT_ANSWER et EXPLAIN : la personne répond en texte libre et jugera elle-même.
Écris \`answerKey\` pour qu'elle puisse se juger honnêtement : les points attendus,
formulés simplement, et ce qui compte comme une réponse insuffisante.`;
