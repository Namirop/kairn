import { trouverLesComptesARelancer } from "@/lib/db/comptes-a-relancer";
import { estLHeureDeLaRelance } from "@/lib/domain/relance-du-compte-vide";
import { envoyerLaNotification } from "@/lib/email/notifications";
import { journaliser, passage, type Passage } from "./passage-de-notification";

/**
 * Pas d'`aNotifier`, qui écarte par jour local et permettrait une relance par
 * jour : la sélection SQL écarte tout compte déjà relancé, à vie.
 */
export async function relancerLesComptesVides(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await trouverLesComptesARelancer(maintenant);
  const alHeure = candidats.filter((candidat) => estLHeureDeLaRelance(maintenant, candidat));
  const resultat = passage(candidats.length, alHeure.length, 0);

  for (const candidat of alHeure) {
    const envoi = await envoyerLaNotification(candidat.userId, {
      type: "RELANCE_COMPTE_VIDE",
      payload: {},
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Relance des comptes vides", resultat);

  return resultat;
}
