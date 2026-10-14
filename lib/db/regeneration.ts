import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { doitRegenerer, type VarianteServable } from "@/lib/domain/rotation-variantes";

/**
 * Le renouvellement des questions d'un concept, déclenché par l'usure : session
 * et entraînement additionnés, sans geste de l'utilisateur. Savoir si une
 * demande est légitime revient à `demanderDesQuestions`.
 */

/**
 * Met en file une régénération si les questions ont fait leur temps.
 *
 * `variantes` doit porter l'état d'après le passage qu'on vient d'écrire, pour
 * ne pas attendre le suivant pour voir le seuil franchi.
 *
 * Rend vrai si une demande est partie. Pas de report : le seuil se
 * redéclenchera au passage suivant.
 */
export async function regenererSiUsees(
  atome: { id: string; inputId: string },
  variantes: VarianteServable[],
  maintenant: Date = new Date(),
): Promise<boolean> {
  if (!doitRegenerer(variantes)) return false;

  const demande = await demanderDesQuestions(atome, maintenant, { reporter: false });

  return demande.etat === "partie";
}
