import { controlerQuestion, type VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";

/**
 * Ce qui se vérifie sur les quatre questions d'un même Atom en tant que lot :
 * les facettes servies, leur ordre, la diversité des formats, et la part de
 * questions qu'on ne peut noter soi-même.
 *
 * Ce qui se juge question par question — les options d'un QCM, le trou d'un
 * texte à trou, la réponse qui se lit dans l'énoncé — vit dans
 * `controle-question.ts`.
 */

export type { VariantAControler } from "./controle-question";

/** L'ordre annoncé par le prompt. Miroir de l'enum `VariantFacet`. */
export const FACETTES_ATTENDUES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

/**
 * Formats distincts attendus sur un lot de quatre questions.
 *
 * Le prompt tolère qu'un format revienne une fois : deux questions au plus le
 * partagent, ce qui laisse au moins trois formats sur quatre questions. En
 * dessous, la facette a repris le pas sur le contenu.
 */
export const FORMATS_MINIMUM = 3;

/**
 * Les formats où la personne écrit puis se juge elle-même.
 *
 * Trois questions à s'auto-noter d'affilée ne se notent plus : on clique « je
 * savais » pour avancer, et la planification enregistre du bruit. Le compte de
 * formats distincts ne voyait rien de ce défaut — un quatuor de quatre formats
 * dont trois sont auto-notés le satisfaisait.
 *
 * Depuis, le schéma de génération n'ouvre le texte libre que sur `MECHANISM` :
 * une sortie passée par `callAI()` ne peut plus déborder. Le contrôle reste,
 * parce que le banc doit pouvoir juger une génération d'hier ou un lot écrit à
 * la main — et parce qu'il mesure ce que la grammaire garantit.
 */
export const FORMATS_LIBRES = ["SHORT_ANSWER", "EXPLAIN"];
export const LIBRES_MAXIMUM = 1;

function controlerLot(variants: VariantAControler[]): Manquement[] {
  const facettes = variants.map((variant) => variant.facet);
  const formats = new Set(variants.map((variant) => variant.format));
  const libres = variants.filter((variant) => FORMATS_LIBRES.includes(variant.format));
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

  if (libres.length > LIBRES_MAXIMUM) {
    manquements.push({
      regle: "texte libre",
      detail: `${libres.length} questions à s'auto-noter : ${libres.map((variant) => variant.format).join(", ")}`,
    });
  }

  return manquements;
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
      controlerQuestion(variant).map((manquement) => ({ ...manquement, rang })),
    ),
  ];
}
