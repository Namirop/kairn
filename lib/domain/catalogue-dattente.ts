import { CATALOGUES_EN } from "./catalogue-dattente-en";
import type { LangueDuProduit } from "./langue-du-produit";

/**
 * Les phrases d'attente pendant l'ingestion. La mécanique (paliers, relève,
 * tirage) vit dans `phrases-dattente.ts`.
 *
 * Une étape, un catalogue : chacune parle à quelqu'un qui en est à un point
 * différent (rien à l'écran, rien vu, concepts déjà affichés).
 *
 * Le ton suit le temps : on dit ce qu'on fait, on reconnaît que ça dure, on en
 * rit à ses dépens, puis on rappelle que fermer l'onglet ne coûte rien.
 * Pince-sans-rire, sans exclamation, sans emoji, sans excuse ; on se moque du
 * travail, jamais de celui qui attend. Les tests en font une règle.
 */

/**
 * Les trois temps d'une chaîne d'ingestion. L'essai de la landing n'en connaît
 * que deux : il n'accepte pas de capture.
 */
export type EtapeDeLAttente = "LECTURE" | "DECOUPAGE" | "ECRITURE";

export const ETAPES: readonly EtapeDeLAttente[] = ["LECTURE", "DECOUPAGE", "ECRITURE"];

/**
 * Les phrases d'un palier de ton. Le type impose au moins deux phrases : un
 * palier d'une seule se répéterait. Le tuple garantit aussi qu'il y a toujours
 * une phrase à rendre.
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
 * La lecture d'une capture : le texte n'existe pas encore, la phrase est tout ce
 * qu'il y a à lire.
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
 * L'écriture : on parle à quelqu'un qui voit déjà ses concepts. Le ton part plus
 * léger, et le dernier palier rappelle que les concepts sont acquis.
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
