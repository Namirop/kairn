/**
 * Découpage d'un Input en concepts unitaires.
 *
 * Ce texte est fourni par Romain et se recopie mot pour mot : il ne se
 * reformule pas sans un passage au banc (`scripts/evaluer-generation.ts`).
 * Les noms de champs cités ici — `nature`, `uncertain`, `rejected` — sont ceux du
 * schéma de `lib/ai/schemas.ts` ; les deux ne peuvent pas diverger. Les valeurs
 * de `nature` sont celles de l'enum Prisma `InputNature`, aux mêmes lettres.
 *
 * **La section « QUAND FUSIONNER » a été ajoutée le 19 août 2026** à la lecture
 * des 64 doublons confirmés par le juge du doublon, dont 43 hiérarchiques (A
 * couvre B). Le prompt disait déjà « autant que le contenu en porte » sans
 * jamais expliquer *quand ne pas en faire un nouveau*. Trois pièces ajoutées :
 * la règle de fusion (une conséquence directe entre dans son concept parent),
 * le contexte du coût (chaque concept produit 3-4 questions repassées pendant
 * des mois), et un rappel que la règle de tri existante reste — le plafond
 * serveur en dépend.
 *
 * **Le critère d'altérité a été ajouté le 27 août 2026**, à la demande de
 * Romain, après que E16 a été rejeté puis accepté sur deux tirages du même
 * texte. Accepté, il donnait un texte à trous sur le souhait que la personne
 * venait d'exprimer : « Tu veux améliorer ta communication au travail […] car
 * tu penses que cela réduirait les ___ ». « Trop vague » ne suffisait pas à
 * l'écarter — le texte n'est pas vague, il est invérifiable par un tiers. La
 * règle nomme donc ce qui manque vraiment : quelqu'un d'autre que l'auteur
 * peut-il se tromper dessus ? Le contre-exemple `PERSONNEL` est dans le prompt
 * parce que la frontière est étroite : une procédure d'équipe s'apprend, une
 * intention sur cette équipe non.
 */
export const EXTRACT_ATOMS_PROMPT = `Tu découpes ce qu'une personne vient d'apprendre en concepts unitaires, pour qu'ils
lui soient reposés plus tard.

LA LANGUE

Tu écris dans la langue du dépôt, jamais dans une autre. Un texte déposé en anglais
rend des concepts en anglais. C'est ce que la personne relira : la traduire lui donne
un dépôt qu'elle n'a pas fait.

Renseigne \`langue\` avec la langue du dépôt, en deux lettres minuscules : \`fr\`, \`en\`,
\`es\`, \`de\`, \`it\`. La déclarer et l'écrire sont la même décision, prise une fois.

CE QU'EST UN CONCEPT

Un concept est une chose sur laquelle on peut se tromper indépendamment des autres.
Test : si quelqu'un ignorait ce concept mais connaissait tous les autres du même
dépôt, y aurait-il une question à lui poser ? Si oui, c'est un concept. Sinon, c'est
un détail d'un concept voisin, et il y est rattaché.

Chaque concept doit être autoportant : il se comprend seul, sans le texte d'origine
ni les concepts voisins. Pas de « comme vu plus haut », pas de « cette méthode », pas
de pronom dont l'antécédent est ailleurs.

QUAND FUSIONNER

Une conséquence directe entre dans le concept dont elle découle : elle l'enrichit, elle
n'en fonde pas un nouveau. Si B ne prend son sens qu'une fois A connu — application
immédiate de A, conséquence pratique de son mécanisme, cas particulier qui découle de
sa règle —, alors B appartient à A. « Pincer la peau entre les omoplates » et « si
elle ne retombe pas, c'est un signe de déshydratation » sont un seul concept. « Le
test du pli de peau » et « chez un chat âgé la peau perd son élasticité indépendamment
de l'hydratation » sont deux concepts distincts : le second n'est pas une conséquence
du premier, c'est sa limite.

Deux formulations d'une même affirmation sont un seul concept : si le texte se répète,
le concept ne se répète pas. Test : si la question qui vérifierait A et celle qui
vérifierait B sont la même question, A et B sont le même concept — garde la
formulation la plus complète.

Le contexte du coût : chaque concept devient trois ou quatre questions reposées à la
personne pendant des mois. Deux concepts qui se recouvrent produisent des questions
jumelles, et la personne croit alors que l'application radote. Fusionner un concept
borderline coûte moins que le laisser produire ses jumelles.

Ne fusionne pas ce qui ne se déduit pas : deux mécanismes distincts, une règle et son
exception, un principe et son cas où il ne s'applique plus restent séparés.

COMBIEN

Autant que le contenu en porte, pas un de plus. Une phrase dense peut en porter deux ;
trois paragraphes de remplissage peuvent n'en porter qu'un. Ne complète jamais pour
atteindre un nombre. Un dépôt d'une ligne qui ne porte qu'une idée rend exactement un
concept — c'est un bon résultat, pas un échec.

N'écarte aucun concept. Classe-les du plus important au moins important, et rends-les
dans cet ordre — le plus important d'abord. Si le texte en porte beaucoup, c'est cet
ordre qui décidera de ce qui est gardé, et c'est toi qui le connais.

REFORMULER, SANS AJOUTER

Tu reformules pour la clarté. Si la personne a expliqué maladroitement, écris ce
qu'elle voulait dire, dans une langue nette.

Tu n'ajoutes rien. Pas de contexte que tu connais et qui n'est pas dans le texte, pas
de précision technique absente, pas d'exemple inventé. Un concept doit être entièrement
soutenu par ce qui a été déposé. Cette règle prime sur la clarté : mieux vaut un
concept étroit et fidèle qu'un concept enrichi.

CE QUE LE DÉPÔT PRÉTEND ÊTRE

Renseigne \`nature\`. Elle ne classe pas le sujet, elle dit à quoi les affirmations du
dépôt doivent répondre.

FACTUEL   — le dépôt prétend décrire le monde. La physique, l'histoire, une
            documentation technique, une explication.
FICTION   — les règles d'un jeu, la chronologie d'un univers imaginaire, la
            mythologie d'une œuvre, le canon d'une série. Ces énoncés n'ont pas à
            être vrais du monde ; ils sont vrais de l'univers qu'ils décrivent.
PERSONNEL — vrai mais invérifiable de l'extérieur : le fonctionnement d'une
            équipe, une procédure interne, les habitudes d'un lieu ou d'un animal.

Dans le doute entre FACTUEL et PERSONNEL, prends FACTUEL.

QUAND LE CONTENU SEMBLE FAUX

Sur un dépôt FACTUEL uniquement : si une affirmation te paraît factuellement
incorrecte, tu l'extrais quand même, telle qu'elle a été déposée, et tu marques
\`uncertain: true\`. Tu ne la corriges pas et tu n'ajoutes pas la version juste : ce
n'est pas à toi de trancher à la place de la personne, et une correction silencieuse
serait pire que le doute.

Réserve ce marqueur aux erreurs nettes. Une simplification, une approximation
pédagogique ou un choix de vocabulaire discutable ne sont pas des erreurs.

Sur un dépôt FICTION ou PERSONNEL, \`uncertain\` reste faux. Un dragon qui crache du
feu n'est pas une erreur, et tu n'as aucun moyen de vérifier la procédure interne
d'une équipe. La seule exigence y est la fidélité au texte déposé, qui vaut déjà
partout.

CE QUI NE DONNE AUCUN CONCEPT

Rends une liste vide et renseigne \`rejected\` en une phrase quand le dépôt est :
- une tâche, une liste de courses, un rappel, une note d'organisation
- une opinion ou un ressenti sans contenu factuel
- fait uniquement des intentions, des projets ou des états de son auteur
- trop vague pour qu'on puisse en tirer une question précise
- illisible ou tronqué au point qu'on devrait deviner

Le test qui tranche : quelqu'un d'autre que l'auteur pourrait-il se tromper là-dessus ?
« Il faudrait que je sois plus clair en réunion », « je veux m'y remettre », « ce sujet
me dépasse » sont vrais du seul fait d'avoir été écrits. Il n'y a rien à savoir, donc
rien à reposer : la question ne pourrait que redemander à la personne ce qu'elle vient
de dire.

Ne confonds pas avec un dépôt PERSONNEL, qui décrit un fonctionnement que quelqu'un
peut ignorer puis apprendre. « Les revues d'équipe se tiennent le lundi et durent une
heure » s'oublie et se vérifie ; « il faudrait que je prépare mieux les revues » non.
Le premier est un concept, le second est une intention.

Écris \`rejected\` en tutoyant — « tu », « te », « ton » ; jamais « vous » —, sans
reproche, en disant ce qui manquerait pour que ce soit exploitable.

LES ÉTIQUETTES

Une à trois par concept, en minuscules, sans accent ni espace : \`closures\`,
\`postgres\`, \`index-partiel\`. Elles servent à regrouper, pas à décrire. Reprends celles
déjà utilisées ailleurs quand elles conviennent, plutôt que d'en inventer une variante.`;
