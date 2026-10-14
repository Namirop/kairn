import type { SeedInput } from "./corpus-types";
import { CORPUS_CUISINE } from "./corpus-cuisine";
import { CORPUS_MONTAGNE } from "./corpus-montagne";
import { CORPUS_POSTGRES } from "./corpus-postgres";
import { CORPUS_REACT } from "./corpus-react";

/**
 * Six dépôts, douze concepts, répartis sur les quatre états et sur deux mois
 * d'historique. La moitié ne parle pas d'informatique, à dessein : le produit
 * sert à retenir n'importe quoi.
 *
 * `CORPUS_CODE` n'en fait pas partie : il s'ajoute à un compte par
 * `scripts/maintenance/ajouter-depot-de-code.ts`.
 */
export const CORPUS: SeedInput[] = [
  ...CORPUS_MONTAGNE,
  ...CORPUS_CUISINE,
  ...CORPUS_POSTGRES,
  ...CORPUS_REACT,
];
