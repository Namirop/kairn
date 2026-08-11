import { prisma } from "@/lib/db/client";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import {
  assezEspacee,
  doitRegenerer,
  type VarianteServable,
} from "@/lib/domain/rotation-variantes";

/**
 * Le renouvellement des questions d'un concept.
 *
 * Il se déclenche sur l'usage réel, les deux modes additionnés : personne n'a
 * de bouton à trouver ni de décision à prendre. Quelqu'un qui tourne beaucoup
 * en entraînement use ses formulations plus vite, et c'est très bien — c'est
 * exactement le moment où en réécrire sert à quelque chose.
 *
 * La régénération part par le chemin groupé de la phase 2 : c'est du travail
 * qui peut attendre le lendemain, contrairement aux premières questions d'un
 * dépôt, qu'on veut tout de suite.
 */

/**
 * La dernière fois qu'on a demandé des questions pour ce concept.
 *
 * On lit les jobs et non les Variants écrits : c'est la dépense qu'on
 * plafonne, pas le résultat. Un job qui a échoué a quand même coûté un appel,
 * et une génération qui échoue en boucle est précisément ce contre quoi le
 * plafond existe.
 */
async function derniereDemande(atomId: string): Promise<Date | null> {
  const job = await prisma.generationJob.findFirst({
    where: { kind: "VARIANTS", atomIds: { has: atomId } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return job?.createdAt ?? null;
}

/**
 * Met en file une régénération si les questions ont fait leur temps.
 *
 * Trois conditions, dans cet ordre de coût croissant : le seuil d'usure, puis
 * le plafond de fréquence, puis l'absence de job déjà en attente sur ce
 * concept — sans quoi chaque passage au-delà du seuil en empilerait un de plus.
 *
 * `variantes` porte l'état d'après le passage qu'on vient d'écrire : la lecture
 * a eu lieu avant l'incrément, et compter le passage en cours évite d'attendre
 * le suivant pour s'apercevoir que le seuil est franchi.
 */
export async function regenererSiUsees(
  atome: { id: string; inputId: string },
  variantes: VarianteServable[],
  maintenant: Date = new Date(),
): Promise<boolean> {
  if (!doitRegenerer(variantes)) return false;

  if (!assezEspacee(await derniereDemande(atome.id), maintenant)) return false;

  const dejaEnFile = await prisma.generationJob.count({
    where: {
      kind: "VARIANTS",
      status: { in: ["QUEUED", "RUNNING"] },
      atomIds: { has: atome.id },
    },
  });

  if (dejaEnFile > 0) return false;

  await creerJobsDeQuestions(atome.inputId, [atome.id]);

  return true;
}
