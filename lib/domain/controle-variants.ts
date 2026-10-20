import { controlerQuestion, type VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";

/**
 * Ce qui se vérifie sur les quatre questions d'un Atom en tant que lot. Ce qui
 * se juge question par question vit dans `controle-question.ts`.
 */

export type { VariantAControler } from "./controle-question";

/** L'ordre annoncé par le prompt. Miroir de l'enum `VariantFacet`. */
export const FACETTES_ATTENDUES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

/** Le prompt tolère qu'un format revienne une fois. */
export const FORMATS_MINIMUM = 3;

/**
 * Les formats qu'on s'auto-note. Plusieurs d'affilée, on clique « je savais »
 * pour avancer et la planification enregistre du bruit. Le schéma le garantit
 * déjà ; le contrôle reste pour un lot ancien ou écrit à la main.
 */
export const FORMATS_LIBRES = ["SHORT_ANSWER", "EXPLAIN"];
export const LIBRES_MAXIMUM = 1;

/**
 * Sans lui, le modèle glisse vers QCM et vrai ou faux, qui ne demandent que de
 * reconnaître. Le texte à trou est le seul format de rappel valable sur tout
 * concept (`CODE` ne vaut que pour le technique).
 */
export const CLOZE_MINIMUM = 1;

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

  const trous = variants.filter((variant) => variant.format === "CLOZE");

  if (trous.length < CLOZE_MINIMUM) {
    manquements.push({
      regle: "rappel",
      detail: `aucun texte à trou : ${variants.map((variant) => variant.format).join(", ")}`,
    });
  }

  return manquements;
}

/** Ceux qui visent une variante portent son rang, pour que le rapport les affiche sous elle. */
export function controlerVariants(variants: VariantAControler[]): Manquement[] {
  return [
    ...controlerLot(variants),
    ...variants.flatMap((variant, rang) =>
      controlerQuestion(variant).map((manquement) => ({ ...manquement, rang })),
    ),
  ];
}
