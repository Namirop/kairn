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

LA RÈGLE QUI COMPTE

Les quatre questions portent sur quatre facettes différentes. Ce n'est pas quatre
habillages de la même question : quelqu'un qui a retenu une phrase par cœur sans
comprendre doit réussir la première et échouer aux trois autres.

RECOGNITION — de quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on
MECHANISM   — pourquoi ça marche, ce qui se passe réellement, dans quel ordre
BOUNDARY    — ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique
APPLICATION — s'en servir dans une situation concrète qui n'est pas celle du concept

Une facette par question, dans cet ordre.

RÉPONDABLE DEPUIS LE CONCEPT SEUL

Chaque question se répond avec le concept fourni et rien d'autre. Pas de connaissance
extérieure exigée, même évidente pour toi. Si une facette ne peut pas être couverte
sans sortir du concept, écris une question plus modeste sur cette facette plutôt que
d'élargir le périmètre.

CE QUI TUE UNE QUESTION

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

Deux questions au plus partagent le même format.

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

MCQ : exactement quatre options. Chaque mauvaise option est fausse pour une
raison précise, une confusion que quelqu'un pourrait réellement avoir. Une
option manifestement absurde rend la question inutile. Les quatre options ont
une longueur et une forme comparables : la bonne réponse ne doit pas se repérer
à sa taille.

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
