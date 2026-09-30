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
 * **Le verdict a été interdit en tête d'étalon le 29 août 2026.** Un étalon de
 * QCM servi en production ouvrait par « Correct », et le bloc « Pourquoi » ne
 * s'affiche qu'après une **mauvaise** réponse : on félicitait quelqu'un que
 * l'écran venait de corriger. La consigne du vrai ou faux — « commence par Vrai
 * ou Faux » — est la source la plus probable de la tournure, et elle est
 * maintenant désignée comme une exception plutôt que comme un modèle.
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
 * **La phrase du concept a été rendue non recopiable le 23 septembre 2026.** Le
 * défaut est le même que celui du double CLOZE, par un autre chemin : sur un
 * concept d'une phrase, le modèle servait un vrai ou faux dont l'affirmation
 * était cette phrase **mot pour mot**, et un texte à trou construit sur la même
 * phrase. Deux onglets côte à côte montraient donc le même texte, à un trou
 * près, sur la page qui convertit — et l'on se dit que les quatre formats ne
 * changent rien à l'affaire. La règle du vrai ou faux interdisait déjà « son
 * résumé » ; elle ne disait pas qu'une copie exacte est pire qu'un résumé, parce
 * que le format prétend alors faire juger ce qu'il vient d'affirmer. Le trou,
 * lui, garde le droit de reprendre une phrase du concept : c'est son format, et
 * le masquage est ce qui la transforme en question.
 *
 * **Le verdict d'un vrai ou faux est devenu obligatoire le 4 septembre 2026**, et
 * cette ligne-là répare un écran cassé. `estVraie` désigne laquelle des deux
 * propositions est la bonne ; elle n'était écrite nulle part en base, et la seule
 * trace du verdict restait le mot « Vrai » ou « Faux » en tête d'étalon — que la
 * correction du 02/09 vient d'interdire, à raison. Toute affirmation réécrite
 * depuis a perdu ses deux boutons et a été servie en question ouverte : une
 * phrase posée à plat, qu'on lit comme le concept à retenir, alors qu'une sur
 * deux est fausse par construction. Le verdict s'écrit maintenant dans le
 * `payload`, et une affirmation qui ne le dit pas n'est plus écrite du tout —
 * voir `sansAffirmationMuette`.
 *
 * **Le terme masqué ne borde plus sa propre phrase, depuis le 4 septembre 2026.**
 * « une fenêtre de \_\_\_ semaines » avec « 52 semaines » pour terme affichait
 * « 52 semaines semaines » une fois le trou comblé, et comptait « 52 » — la bonne
 * réponse — comme fausse, la comparaison exigeant le même nombre de mots. La
 * lecture répare le stock (`trouSansRedite`), le contrôle mesure, et cette
 * consigne arrête d'en produire.
 *
 * **Deux étalons qui redisaient ce qui est déjà à l'écran, corrigés le 4
 * septembre 2026.** Le texte à trou n'avait aucune règle — le tour du 02/09 a mis
 * les autres formats à l'indicatif et l'a oublié —, et « Le terme attendu est
 * « collectivise » : … » annonçait un mot qui venait de se poser dans la phrase,
 * souligné, deux centimètres plus haut. Le QCM, lui, avait la sienne mais trop
 * lâche : « recopie l'option » est devenu « recopie l'option mot pour mot »,
 * parce que `etalonUtile` efface une redite exacte et pas une paraphrase.
 *
 * **Le renvoi au concept se fait aussi par le participe seul, relevé le 4
 * septembre 2026.** « Compare les deux indicateurs mentionnés et précise lequel
 * prédit le mieux l'issue d'un match » a été servi en session : aucun des deux
 * n'est nommé, et l'écran ne montre pas le concept. `renvoiAuConcept` le relève
 * maintenant, donc la question serait écartée sans être écrite — cette consigne
 * évite d'en perdre une pour rien.
 *
 * **Le trou ne se pose plus sur une relation, depuis le 8 septembre 2026.** Un
 * texte à trou servi en session masquait « effet inverse » dans « Le gazon
 * produit l'\_\_\_, en accélérant la balle » : le terme est bien porteur du sens
 * de la phrase, et c'est exactement ce qui le rendait impossible — il ne se
 * retrouve qu'en ayant le concept de la terre battue sous les yeux, que cet
 * écran ne montre pas. La cause première est en amont, dans le découpage, et
 * elle y est corrigée le même jour (voir `extract-atoms.ts`) ; cette consigne-ci
 * est la seconde barrière, pour le stock déjà découpé.
 *
 * **Les questions sont passées au français inconditionnel le 9 septembre 2026.**
 * La consigne disait « dans la langue du concept », et un concept français citant
 * une expression anglaise a suffi à faire basculer les quatre questions en
 * anglais. Sur la liste d'expressions de production — six concepts tous rédigés
 * en français, chacun citant sa tournure —, les vingt-quatre questions sont
 * sorties en anglais, énoncés, options et étalons compris. Le concept disait
 * « L'expression anglaise « to put up with » signifie « supporter » » et la
 * question demandait « Which meaning best matches “to put up with” ? ».
 *
 * Même cause qu'à l'extraction, corrigée le même jour et de la même manière : la
 * consigne demandait une décision, la décision se trompait, il n'y a plus de
 * décision. Ce qui reste est la distinction entre le texte qui **porte** la
 * question — français — et ce sur quoi elle porte, cité tel quel. Une option de
 * QCM peut donc être une forme étrangère, et c'est même ce qu'on veut sur du
 * vocabulaire : l'énoncé donne le sens en français, les options donnent les
 * formes, et la question se pose enfin dans le sens où elle est difficile.
 *
 * La ligne sur le trou d'un terme étranger vient de là. Sans elle, le modèle
 * masque indifféremment la forme ou la glose ; masquer la glose française d'un
 * mot anglais fait réviser du français à quelqu'un qui apprend l'anglais.
 *
 * **Le terme masqué a été interdit d'apparaître ailleurs dans sa phrase, le
 * 24 septembre 2026.** La consigne existait — « vérifie qu'on ne pourrait pas le
 * retrouver en lisant seulement le reste de la phrase » — et `trouDevoileSaReponse`
 * mesurait sans couper. Deux textes à trou servis en session le 23/09 sur un même
 * dépôt Android l'ont enfreinte de la même manière, par répétition littérale :
 * « \_\_\_ et Java utilisent la même plateforme, mais Kotlin n'est pas le même
 * langage que Java », « Google recommande \_\_\_ pour Android depuis 2019 avec
 * l'approche « Kotlin first » ». La consigne générale parlait de paraphrase et de
 * grammaire prévisible ; elle ne disait pas qu'un mot recopié tel quel est le cas
 * le plus simple et le plus fréquent. Elle le dit maintenant.
 *
 * La lecture répare le stock de son côté, et masque les autres occurrences à leur
 * tour plutôt que de jeter la question — voir `phraseSansDevoilement`.
 *
 * **Le verdict d'un vrai ou faux a cessé de recopier la cible, le 24 septembre
 * 2026.** Servi en session le 23/09 : « Kotlin est limité au développement mobile
 * et n'est pas utilisé pour le backend ni pour le multiplateforme », donnée vraie,
 * avec pour étalon « Kotlin n'est pas limité au mobile : il est aussi utilisé pour
 * le backend… ». L'affirmation est fausse, l'étalon le dit, et l'écran surlignait
 * « Vrai » en marquant « Faux » en rouge — on corrigeait quelqu'un qui avait
 * raison, avec une explication qui lui donnait raison.
 *
 * La consigne poussait à ça. Elle disait de recopier la cible dans `estVraie` et
 * qu'« une affirmation rendue à l'envers de ce qui est demandé est un défaut » :
 * un modèle qui n'arrive pas à écrire une affirmation vraie sur le point visé a
 * alors intérêt à mentir sur le verdict plutôt qu'à manquer la cible. Le contrôle,
 * lui, tolère l'écart depuis toujours — « un manquement et jamais un refus ». Le
 * prompt le dit enfin, et nomme le verdict pour ce qu'il est : une description de
 * ce qui vient d'être écrit, pas un accusé de réception.
 *
 * Un relevé du 24/09 donnait un cas sur soixante-huit affirmations vraies en
 * production. C'est rare, et c'est le seul défaut du produit qui enseigne le
 * contraire de ce qu'il faut retenir.
 *
 * **Si la cible ne tient pas malgré tout, teste la longueur d'abord.** Ce prompt
 * est passé de 4 771 à 5 748 caractères en posant cette correction, pendant que
 * celui d'extraction redescendait. Une consigne locale se dilue dans un texte
 * trop long, et la première hypothèse à éprouver sera celle-là — avant d'ajouter
 * encore des lignes pour se faire mieux comprendre.
 *
 * **Le code cité a quitté les guillemets le 30 septembre 2026**, ici comme à
 * l'extraction, et pour la même raison : le rendu en jetons ne voit que les
 * accents graves, et soixante questions vivantes de la production citaient un
 * terme de code entre guillemets contre vingt qui l'écrivaient comme il faut.
 * La règle est posée dans LA LANGUE, où vit déjà ce qui se recopie tel quel ;
 * la lecture relève le stock de son côté — voir `releverLeCodeCite`.
 */
export const GENERATE_VARIANTS_PROMPT = `On te donne un ou plusieurs concepts issus d'un même dépôt. Tu écris quatre questions
pour chacun, indépendamment.

Chaque question ne se répond qu'avec son propre concept. Ne t'appuie jamais sur un
concept voisin du même envoi, même s'il éclaire le sujet : au moment de la révision,
ils seront servis à des semaines d'intervalle.

LA LANGUE

Tu écris en français : l'énoncé, les options, la réponse-étalon. Toujours, quelle que
soit la langue du concept. Il n'y a pas de langue à choisir ici.

Ce que le concept cite — un mot, une expression, une phrase d'exemple, un terme
technique — se recopie dans sa langue, sans traduction ni translittération. C'est le
texte qui **porte** la question qui est en français, pas ce sur quoi elle porte : une
option de QCM peut donc être une forme étrangère, et un texte à trou peut masquer un
mot dans la phrase d'exemple citée telle quelle.

Une question qui s'adresse au lecteur le tutoie : « Explique », jamais « Expliquez ».

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

Quand le concept apparie un terme étranger et son sens en français, le trou tombe sur
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
