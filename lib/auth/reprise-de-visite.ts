import { creerJobsDeQuestions } from "@/lib/db/lots";
import { compterLaVisiteReprise } from "@/lib/db/quota-depots";
import { rattacherAuCompte } from "@/lib/db/session-anonyme";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { lireLaVisite, oublierLaVisite } from "@/lib/auth/visite";
import { declencher } from "@/lib/jobs/queue";

/**
 * Ce qu'un visiteur avait déposé lui revient à la création de son compte.
 *
 * C'est ici que la dépense reprend, et c'est voulu : l'essai s'arrête à
 * l'extraction, les questions n'arrivent qu'une fois que quelqu'un s'est engagé.
 * Un visiteur qui repart coûte une extraction ; un visiteur qui reste coûte ce
 * que coûte un utilisateur.
 *
 * Rien ne lève ici. Un compte qui vient d'être créé ne doit pas échouer parce
 * qu'un dépôt d'essai n'a pas pu être repris : on perdrait le compte pour sauver
 * le brouillon. L'échec est journalisé, et la personne redéposera.
 */
export async function reprendreLaVisite(userId: string): Promise<void> {
  try {
    const visite = await lireLaVisite();

    if (!visite) return;

    const repris = await rattacherAuCompte(visite, userId);

    await oublierLaVisite();

    if (repris.inputIds.length === 0) return;

    // Ce que l'essai a produit entre au compteur du mois. Avant, il n'y entrait
    // nulle part : le chemin anonyme ne passe par aucun quota, si bien qu'un
    // compte neuf démarrait avec ses concepts d'essai en plus des trente
    // annoncés. Compté ici parce que c'est le premier instant où ces concepts
    // ont un compte à qui appartenir.
    await compterLaVisiteReprise(
      userId,
      await lireFuseauUtilisateur(userId),
      repris.atomIds.length,
    );

    if (repris.atomIds.length === 0) return;

    // Le premier jeu de questions de ces concepts : groupé par trois, comme
    // pour un dépôt ordinaire, et lancé tout de suite. Quelqu'un qui vient de
    // créer un compte veut jouer, pas attendre le lendemain.
    const inputId = repris.inputIds[0];

    if (!inputId) return;

    for (const job of await creerJobsDeQuestions(inputId, repris.atomIds)) {
      declencher(job.id);
    }
  } catch (erreur) {
    console.error(`La reprise de la visite a échoué pour le compte ${userId}.`, erreur);
  }
}
