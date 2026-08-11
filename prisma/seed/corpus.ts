import type { SeedInput } from "./corpus-types";
import { CORPUS_CUISINE } from "./corpus-cuisine";
import { CORPUS_MONTAGNE } from "./corpus-montagne";
import { CORPUS_POSTGRES } from "./corpus-postgres";
import { CORPUS_REACT } from "./corpus-react";

/**
 * Six dépôts, douze concepts, répartis sur les quatre états et sur deux mois
 * d'historique. De quoi regarder tous les écrans sans appeler le modèle.
 *
 * La moitié ne parle pas d'informatique, et c'est délibéré : le produit sert à
 * retenir n'importe quoi, et une démonstration entièrement faite de code disait
 * le contraire de ce qu'on affirme sur la page d'accueil.
 */
export const CORPUS: SeedInput[] = [
  ...CORPUS_MONTAGNE,
  ...CORPUS_CUISINE,
  ...CORPUS_POSTGRES,
  ...CORPUS_REACT,
];
