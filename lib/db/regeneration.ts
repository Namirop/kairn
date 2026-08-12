import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { doitRegenerer, type VarianteServable } from "@/lib/domain/rotation-variantes";

/**
 * Le renouvellement des questions d'un concept, déclenché par l'usure.
 *
 * Il se déclenche sur l'usage réel, les deux modes additionnés : personne n'a
 * de bouton à trouver ni de décision à prendre. Quelqu'un qui tourne beaucoup
 * en entraînement use ses formulations plus vite, et c'est très bien — c'est
 * exactement le moment où en réécrire sert à quelque chose.
 *
 * Ce fichier ne décide plus quand une demande est légitime : c'est
 * `demanderDesQuestions` qui le fait, pour tous les chemins à la fois. Il ne
 * reste ici que la question qui lui est propre — les questions ont-elles fait
 * leur temps ?
 */

/**
 * Met en file une régénération si les questions ont fait leur temps.
 *
 * `variantes` porte l'état d'après le passage qu'on vient d'écrire : la lecture
 * a eu lieu avant l'incrément, et compter le passage en cours évite d'attendre
 * le suivant pour s'apercevoir que le seuil est franchi.
 *
 * Rend vrai quand une demande vient d'être mise en file. L'usure ne reporte
 * pas : les questions du concept existent encore, et le seuil se redéclenchera
 * de lui-même au passage suivant si la personne continue.
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
