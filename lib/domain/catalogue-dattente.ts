import { CATALOGUES_EN } from "./catalogue-dattente-en";
import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Ce qu'on dit pendant que ça travaille : les phrases, et rien que les phrases.
 *
 * La mécanique — les paliers, la relève, le tirage — vit à côté, dans
 * `phrases-dattente.ts`. Ce fichier-ci ne porte que du texte d'interface, et il
 * a été séparé le jour où une troisième étape l'a fait déborder : on ne relit
 * pas un catalogue et un calcul d'index pour la même raison.
 *
 * **Trois étapes, trois catalogues, et ce n'est pas un détail.** La lecture
 * parle à quelqu'un dont même le texte n'existe pas encore ; le découpage à
 * quelqu'un qui n'a encore rien vu ; l'écriture à quelqu'un dont les concepts
 * sont déjà à l'écran, donc à moitié convaincu et beaucoup moins inquiet.
 * Servir « on lit ce que tu as déposé » pendant qu'on écrit les questions serait
 * faux au mot près, et le mot est tout ce qu'on a ici.
 *
 * **Le ton suit le temps, et il descend.** Au début on dit ce qu'on fait. Passé
 * quelques secondes on reconnaît que ça dure. Plus loin on en rit à ses propres
 * dépens — c'est la seule chose honnête qui reste à dire, et c'est beaucoup plus
 * tenable qu'un tourniquet muet. Au dernier palier on arrête de plaisanter : ce
 * qui compte alors, c'est que fermer l'onglet ne coûte rien.
 *
 * **L'auto-dérision reste dans le registre du produit.** Pince-sans-rire, sans
 * point d'exclamation, sans emoji, sans excuse. On se moque du travail en cours,
 * jamais de celui qui attend — et on ne le félicite de rien. Les tests en font
 * une règle mécanique plutôt qu'une bonne intention.
 */

/**
 * Les trois temps d'une chaîne d'ingestion.
 *
 * L'essai de la landing n'en connaît que deux — il n'accepte pas de capture —,
 * l'écran d'un dépôt les voit tous les trois.
 */
export type EtapeDeLAttente = "LECTURE" | "DECOUPAGE" | "ECRITURE";

export const ETAPES: readonly EtapeDeLAttente[] = ["LECTURE", "DECOUPAGE", "ECRITURE"];

/**
 * Les phrases d'un palier de ton.
 *
 * Deux au minimum, et c'est le **type** qui l'impose : un palier d'une seule
 * phrase est un palier qui se répète, ce qui est précisément le défaut qu'on
 * répare ici. Le tuple garantit au passage qu'il y a toujours une phrase à
 * rendre, sans jamais forcer un type.
 */
export type PhrasesDunPalier = readonly [string, string, ...string[]];

/** Les quatre paliers d'une étape, du plus assuré au plus dépouillé. */
export type Catalogue = readonly [
  PhrasesDunPalier,
  PhrasesDunPalier,
  PhrasesDunPalier,
  PhrasesDunPalier,
];

/**
 * La lecture d'une capture : on parle à quelqu'un dont l'écran est vide, et dont
 * le texte lui-même n'existe pas encore. C'est la seule étape où le produit ne
 * peut rien montrer de ce qui a été déposé — pas même le texte —, donc la seule
 * où la phrase est tout ce qu'il y a à lire.
 */
const LECTURE: Catalogue = [
  ["On lit ta capture.", "On relève le texte écrit dessus.", "On regarde ce qu'il y a à en tirer."],
  [
    "Il y a du texte là-dedans, visiblement.",
    "La capture est chargée. On prend le temps.",
    "On déchiffre encore deux ou trois lignes.",
  ],
  [
    "Lire une image est plus lent que lire un texte.",
    "On relit une ligne qui se refuse.",
    "Toujours dessus. L'image ne se rend pas vite.",
  ],
  [
    "On arrête de promettre une durée.",
    "Tu peux fermer. La lecture continue sans toi.",
    "Ta capture est en lieu sûr. Elle t'attendra ici.",
  ],
];

/** Le découpage : on parle à quelqu'un qui n'a encore rien vu. */
const DECOUPAGE: Catalogue = [
  [
    "On lit ce que tu as déposé.",
    "On cherche les idées qui tiennent toutes seules.",
    "On met de côté ce qui n'a pas à être retenu.",
  ],
  [
    "Il y a de la matière, visiblement.",
    "C'est un peu plus long que d'habitude.",
    "On relit. Certains passages se discutent.",
  ],
  [
    "Le découpage prend son temps. Il n'est pas pressé.",
    "On a déjà vu des cairns se monter plus vite.",
    "Toujours dessus. On ne s'était engagés sur rien.",
    "À ce stade, on relit par principe.",
  ],
  [
    "On ne promet plus de date.",
    "Tu peux fermer l'onglet, ça continue sans toi.",
    "Ton texte est en lieu sûr. Il t'attendra ici.",
  ],
];

/**
 * L'écriture : on parle à quelqu'un qui voit déjà ses concepts.
 *
 * Le ton part donc plus léger — la preuve est faite, il ne manque qu'un
 * échantillon — et le dernier palier rappelle que le lot est déjà acquis. C'est
 * la différence qui compte à cette étape : ce n'est plus l'essai qui est en jeu.
 */
const ECRITURE: Catalogue = [
  [
    "On cherche par quel bout te le redemander.",
    "Une même idée, plusieurs façons de la demander.",
    "On formule, puis on reformule.",
  ],
  [
    "On en écrit quatre, pas une.",
    "On évite les questions qui donnent la réponse.",
    "Celle-ci mérite mieux qu'un vrai ou faux.",
  ],
  [
    "L'écriture est plus lente que le découpage.",
    "On hésite sur un mot. Ça arrive.",
    "Toujours en train de choisir les mots.",
  ],
  [
    "Tes concepts sont gardés. C'est l'échantillon qui traîne.",
    "Tu peux fermer, on continue de notre côté.",
    "Là, on n'a plus vraiment d'explication.",
  ],
];

/** Les catalogues de chaque langue. L'anglais vit à côté : `catalogue-dattente-en.ts`. */
export const CATALOGUES: Record<LangueDuProduit, Record<EtapeDeLAttente, Catalogue>> = {
  FR: { LECTURE, DECOUPAGE, ECRITURE },
  EN: CATALOGUES_EN,
};
