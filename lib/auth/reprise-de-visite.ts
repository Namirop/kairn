import { creerJobsDeQuestions } from "@/lib/db/lots";
import { compterLaVisiteReprise } from "@/lib/db/comptage-de-la-periode";
import { rattacherAuCompte } from "@/lib/db/depot-de-visite";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { lireLaVisite, oublierLaVisite } from "@/lib/auth/visite";
import { conceptsAQuestionner } from "@/lib/domain/nature-du-depot";
import { declencher } from "@/lib/jobs/queue";

/**
 * Ce qu'un visiteur avait déposé lui revient à la création de son compte, et
 * c'est ici que la dépense reprend : l'essai s'arrête à l'extraction, les
 * questions n'arrivent qu'une fois le compte créé.
 *
 * Rien ne lève : une inscription ne doit pas échouer pour un dépôt d'essai.
 * L'échec est journalisé, et la personne redéposera.
 */
export async function reprendreLaVisite(userId: string): Promise<void> {
  try {
    const visite = await lireLaVisite();

    if (!visite) return;

    const repris = await rattacherAuCompte(visite, userId);

    await oublierLaVisite();

    if (repris.length === 0) return;

    const concepts = repris.reduce((total, depot) => total + depot.concepts.length, 0);

    // Le chemin anonyme ne passe par aucun quota : les concepts de l'essai
    // entrent au compteur du mois ici, premier instant où ils ont un compte.
    await compterLaVisiteReprise(userId, await lireFuseauUtilisateur(userId), concepts);

    // Les questions sont lancées tout de suite, un jeu par dépôt : accrocher
    // les concepts à un autre dépôt, souvent `REJECTED`, laisserait des jobs
    // que rien ne peut plus refermer. Même règle du doute qu'au découpage, et
    // rien pour le concept que l'essai a déjà questionné.
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
