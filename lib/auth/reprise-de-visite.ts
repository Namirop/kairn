import { creerJobsDeQuestions } from "@/lib/db/lots";
import { compterLaVisiteReprise } from "@/lib/db/comptage-de-la-periode";
import { rattacherAuCompte } from "@/lib/db/depot-de-visite";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { lireLaVisite, oublierLaVisite } from "@/lib/auth/visite";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import { declencher } from "@/lib/jobs/queue";

/**
 * L'essai revient au compte, et la dépense reprend ici : les questions
 * attendaient le compte. Rien ne lève : une inscription n'échoue pas pour un essai.
 */
export async function reprendreLaVisite(userId: string): Promise<void> {
  try {
    const visite = await lireLaVisite();

    if (!visite) return;

    const repris = await rattacherAuCompte(visite, userId);

    await oublierLaVisite();

    if (repris.length === 0) return;

    const concepts = repris.reduce((total, depot) => total + depot.concepts.length, 0);

    // L'essai n'a passé aucun quota : ses concepts entrent ici au compteur du mois.
    await compterLaVisiteReprise(userId, await lireFuseauUtilisateur(userId), concepts);

    // Un jeu par dépôt : accrochés à un autre, souvent `REJECTED`, les jobs ne
    // se refermeraient plus. Même règle du doute qu'au découpage.
    for (const depot of repris) {
      const aQuestionner = conceptsAQuestionner(depot.concepts, depot.nature)
        .filter((concept) => !concept.dejaQuestionne)
        .map((concept) => concept.id);

      if (aQuestionner.length === 0) continue;

      for (const job of await creerJobsDeQuestions(depot.inputId, aQuestionner)) {
        declencher(job.id);
      }
    }
  } catch (erreur) {
    console.error(`La reprise de la visite a échoué pour le compte ${userId}.`, erreur);
  }
}
