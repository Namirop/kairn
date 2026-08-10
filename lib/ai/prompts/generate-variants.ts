/**
 * Écriture des quatre Variants d'un Atom.
 *
 * Texte fourni, recopié mot pour mot. Les formats et les facettes cités ici
 * sont ceux des enums `VariantFormat` et `VariantFacet` du schéma Prisma : le
 * prompt et la base nomment les mêmes valeurs.
 */
export const GENERATE_VARIANTS_PROMPT = `Tu écris quatre questions sur un même concept, pour qu'une personne vérifie plus tard
qu'elle le sait encore.

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

Choisis le format qui sert la facette, parmi MCQ, TRUE_FALSE, SHORT_ANSWER, CODE,
EXPLAIN. Les quatre questions n'utilisent pas quatre formats différents par obligation :
un format peut revenir si c'est le bon, mais les quatre facettes, elles, sont
obligatoires.

CODE ne s'emploie que si le concept porte réellement sur du code. La question montre
alors un extrait court et demande ce qu'il produit, ce qui manque, ou ce qui casse.

MCQ : exactement quatre options. Chaque mauvaise option doit être fausse pour une
raison précise — une confusion réelle que quelqu'un pourrait avoir. Une option
manifestement absurde rend la question inutile. Les quatre options ont une longueur et
une forme comparables : la bonne réponse ne doit pas être repérable à sa taille.

TRUE_FALSE : l'affirmation est fausse à peu près une fois sur deux. Quand elle est
fausse, elle l'est d'un cheveu — une condition inversée, un cas particulier étendu à
tous — pas grossièrement.

SHORT_ANSWER et EXPLAIN : la personne répond en texte libre et jugera elle-même. Écris
\`answerKey\` pour qu'elle puisse se juger honnêtement : les points attendus, formulés
simplement, et ce qui compte comme une réponse insuffisante.

Écris dans la langue du concept.`;
