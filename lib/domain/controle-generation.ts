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

const RENVOIS =
  /ci-dessus|ci-dessous|ci-avant|plus haut dans|comme vu|comme expliqué|précédemment|le précédent|la précédente|susmentionné|évoqué plus haut/i;

/** Une ouverture qui reprend un antécédent absent du concept. */
const OUVERTURE_REPRISE = /^(il|elle|ils|elles|cela|ça|celui|celle|ceux|celles|cette|ces|cet)\b/i;

/** « Il faut », « il existe » : le pronom ne reprend rien, il est impersonnel. */
const OUVERTURE_IMPERSONNELLE =
  /^il (faut|existe|est|y a|n'y a|s'agit|suffit|vaut|arrive|reste)\b/i;

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

function controlerFacettes(variants: VariantAControler[]): Manquement[] {
  const facettes = variants.map((variant) => variant.facet);
  const manquements: Manquement[] = [];

  if (variants.length !== FACETTES_ATTENDUES.length) {
    manquements.push({ regle: "nombre", detail: `${variants.length} variantes au lieu de quatre` });
  }

  if (new Set(facettes).size !== facettes.length) {
    manquements.push({ regle: "facettes", detail: `facettes répétées : ${facettes.join(", ")}` });
  } else if (facettes.join() !== FACETTES_ATTENDUES.join()) {
    manquements.push({ regle: "ordre", detail: `ordre servi : ${facettes.join(", ")}` });
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

/** Les manquements des quatre variantes d'un même Atom, dans l'ordre servi. */
export function controlerVariants(variants: VariantAControler[]): Manquement[] {
  return [
    ...controlerFacettes(variants),
    ...variants.flatMap((variant, rang) =>
      [...controlerMcq(variant), ...controlerReponseCachee(variant)].map((manquement) => ({
        ...manquement,
        detail: `variante ${rang + 1} — ${manquement.detail}`,
      })),
    ),
  ];
}
