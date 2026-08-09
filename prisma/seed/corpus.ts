import type { SeedInput } from "./corpus-types";
import { CORPUS_OUTILLAGE } from "./corpus-outillage";
import { CORPUS_POSTGRES } from "./corpus-postgres";
import { CORPUS_REACT } from "./corpus-react";
import { CORPUS_WEB } from "./corpus-web";

/**
 * Six dépôts, quatorze concepts, répartis sur les quatre états et sur trois mois
 * d'historique. De quoi regarder tous les écrans sans appeler le modèle.
 */
export const CORPUS: SeedInput[] = [
  ...CORPUS_WEB,
  ...CORPUS_POSTGRES,
  ...CORPUS_REACT,
  ...CORPUS_OUTILLAGE,
];
