import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { doitRegenerer, type VarianteServable } from "@/lib/domain/rotation-variantes";

/**
 * Renouvellement par l'usure, session et entraînement additionnés ; la
 * légitimité se juge dans `demanderDesQuestions`.
 */

/**
 * `variantes` porte l'état d'après le passage écrit, pour voir le seuil
 * franchi sans attendre le suivant. Pas de report : il se redéclenchera.
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
