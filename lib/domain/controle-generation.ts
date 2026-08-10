/**
 * Ce qu'on peut reprocher à une génération sans jugement humain.
 *
 * Le banc d'évaluation lit ces manquements pour dire « regarde ici » ; il ne
 * dit pas si la question est bonne, ça se juge à l'œil. Ce sont des détecteurs
 * de fumée : ils ratent des mauvaises questions, ils ne doivent pas crier sur
 * des bonnes.
 *
 * Certaines règles sont déjà refusées par les schémas Zod de `lib/ai/`. Elles
 * restent ici parce que le banc doit pouvoir juger une sortie qui ne vient pas
 * de `callAI()` — un dump, une génération d'hier, un contre-exemple écrit à la
 * main.
 */

export type Manquement = {
  /** Le nom de la règle enfreinte, court, réutilisé d'un rapport à l'autre. */
  regle: string;
  detail: string;
  /**
   * L'index de la variante en cause, quand le manquement en vise une. Un
   * compteur sans emplacement est inutilisable : il annonce un problème et
   * laisse le chercher dans huit cents lignes.
   */
  rang?: number;
};

export type VariantAControler = {
  format: string;
  facet: string;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
};

/** L'ordre annoncé par le prompt. Miroir de l'enum `VariantFacet`. */
export const FACETTES_ATTENDUES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

/**
 * Ce qu'on tolère entre la plus longue et la plus courte option d'un MCQ.
 *
 * Deux seuils, parce qu'un seul se trompe : sur des options courtes — quatre
 * expressions de code — le rapport s'envole sans que la bonne réponse se
 * repère, et sur des options longues c'est l'écart absolu qui ne dit rien.
 * Une option n'est signalée que si elle dépasse les deux.
 */
export const ECART_MAX_OPTIONS = 2;
export const ECART_MINIMUM_SIGNIFICATIF = 30;

/** Nombre de mots en deçà duquel une réponse citée ne prouve rien. */
const MOTS_MINIMUM_POUR_CITER = 3;

/**
 * Formats distincts attendus sur un lot de quatre questions.
 *
 * Le prompt tolère qu'un format revienne une fois : deux questions au plus le
 * partagent, ce qui laisse au moins trois formats sur quatre questions. En
 * dessous, la facette a repris le pas sur le contenu.
 */
export const FORMATS_MINIMUM = 3;

const RENVOIS =
  /ci-dessus|ci-dessous|ci-avant|plus haut dans|comme vu|comme expliqué|précédemment|le précédent|la précédente|susmentionné|évoqué plus haut/i;

/** Une ouverture qui reprend un antécédent absent du concept. */
const OUVERTURE_REPRISE = /^(il|elle|ils|elles|cela|ça|celui|celle|ceux|celles|cette|ces|cet)\b/i;

/** « Il faut », « il existe » : le pronom ne reprend rien, il est impersonnel. */
const OUVERTURE_IMPERSONNELLE =
  /^il (faut|existe|est|y a|n'y a|s'agit|suffit|vaut|arrive|reste)\b/i;

/**
 * Ce qui déclenche la règle CODE du prompt : une citation, pas un jugement sur
 * le sujet. Un fragment entre accents graves, ou un appel écrit tel qu'on
 * l'écrirait dans un fichier — `at(-1)`, `Promise.all(`.
 *
 * Sert à mesurer, pas à sanctionner : on veut savoir combien de concepts
 * déclenchent la règle et combien de lots la respectent. Une question CODE
 * posée pour respecter une règle plutôt que pour éprouver quelque chose ne se
 * verra qu'à l'œil.
 */
const CITATIONS_DE_CODE = [
  /`[^`]+`/, // un fragment entre accents graves
  /\b[A-Za-z_$][\w$]*\(/, // un appel : at(, Promise.all(
  /\b[a-z][\w$]*[A-Z][\w$]*/, // un identifiant en casse mixte : setTimeout, useEffect
  /\b[A-Z][A-Z_]{2,}\b/, // une instruction ou une variable : COPY, DATABASE_URL
  /\b[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*/, // un chemin pointé : Promise.all
];

export function citeDuCode(concept: string): boolean {
  return CITATIONS_DE_CODE.some((marqueur) => marqueur.test(concept));
}

function motsNormalises(texte: string): string {
  return ` ${texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

/** Le concept se comprend-il seul, sans le texte d'origine ni ses voisins ? */
export function controlerConcept(concept: string): Manquement[] {
  const manquements: Manquement[] = [];
  const texte = concept.trim();
  const renvoi = RENVOIS.exec(texte);

  if (renvoi) {
    manquements.push({ regle: "renvoi", detail: `« ${renvoi[0]} » renvoie hors du concept` });
  }

  if (OUVERTURE_REPRISE.test(texte) && !OUVERTURE_IMPERSONNELLE.test(texte)) {
    const premiersMots = texte.split(/\s+/).slice(0, 3).join(" ");
    manquements.push({ regle: "antécédent", detail: `« ${premiersMots}… » reprend un absent` });
  }

  return manquements;
}

function controlerLot(variants: VariantAControler[]): Manquement[] {
  const facettes = variants.map((variant) => variant.facet);
  const formats = new Set(variants.map((variant) => variant.format));
  const manquements: Manquement[] = [];

  if (variants.length !== FACETTES_ATTENDUES.length) {
    manquements.push({ regle: "nombre", detail: `${variants.length} variantes au lieu de quatre` });
  }

  if (new Set(facettes).size !== facettes.length) {
    manquements.push({ regle: "facettes", detail: `facettes répétées : ${facettes.join(", ")}` });
  } else if (facettes.join() !== FACETTES_ATTENDUES.join()) {
    manquements.push({ regle: "ordre", detail: `ordre servi : ${facettes.join(", ")}` });
  }

  if (formats.size < FORMATS_MINIMUM) {
    manquements.push({
      regle: "formats",
      detail: `${formats.size} formats distincts sur quatre questions : ${[...formats].join(", ")}`,
    });
  }

  return manquements;
}

function controlerMcq(variant: VariantAControler): Manquement[] {
  const { options, correctIndex } = variant;

  if (variant.format !== "MCQ") {
    return options === null && correctIndex === null
      ? []
      : [{ regle: "options", detail: `format ${variant.format} avec des options` }];
  }

  if (options === null || options.length !== 4) {
    return [{ regle: "options", detail: `${options?.length ?? 0} options au lieu de quatre` }];
  }

  if (correctIndex === null || correctIndex < 0 || correctIndex >= options.length) {
    return [{ regle: "options", detail: `correctIndex hors des options : ${correctIndex}` }];
  }

  const longueurs = options.map((option) => option.length);
  const plusCourte = Math.min(...longueurs);
  const plusLongue = Math.max(...longueurs);
  const rapport = plusLongue / plusCourte;

  if (rapport <= ECART_MAX_OPTIONS || plusLongue - plusCourte <= ECART_MINIMUM_SIGNIFICATIF)
    return [];

  return [
    {
      regle: "longueurs",
      detail: `la plus longue option fait ${rapport.toFixed(1)}× la plus courte (${plusLongue} contre ${plusCourte} signes)`,
    },
  ];
}

/** La réponse attendue ne doit pas se lire dans l'énoncé. */
function controlerReponseCachee(variant: VariantAControler): Manquement[] {
  const [premierePhrase = ""] = variant.answerKey.split(/[.\n]/);
  const reponse = motsNormalises(premierePhrase);

  if (reponse.trim().split(" ").filter(Boolean).length < MOTS_MINIMUM_POUR_CITER) return [];
  if (!motsNormalises(variant.question).includes(reponse)) return [];

  return [
    { regle: "réponse citée", detail: `« ${premierePhrase.trim()} » figure dans la question` },
  ];
}

/**
 * Les manquements des quatre variantes d'un même Atom, dans l'ordre servi.
 *
 * Ceux qui visent une variante portent son rang : le rapport les affiche sous
 * elle, pas dans une liste à la fin qu'il faudrait recouper à la main.
 */
export function controlerVariants(variants: VariantAControler[]): Manquement[] {
  return [
    ...controlerLot(variants),
    ...variants.flatMap((variant, rang) =>
      [...controlerMcq(variant), ...controlerReponseCachee(variant)].map((manquement) => ({
        ...manquement,
        rang,
      })),
    ),
  ];
}
