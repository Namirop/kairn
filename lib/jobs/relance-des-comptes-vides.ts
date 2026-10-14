import { findComptesARelancer } from "@/lib/db/comptes-a-relancer";
import { estLHeureDeLaRelance } from "@/lib/domain/relance-du-compte-vide";
import { sendNotification } from "@/lib/email/notifications";
import { journaliser, passage, type Passage } from "./passage-de-notification";

/**
 * La relance des comptes restés vides, depuis le même passage horaire.
 *
 * Pas d'`aNotifier` ici, contrairement aux autres passages : il écarte sur
 * `(compte, type, jour local)`, ce qui autoriserait une relance par jour. La
 * sélection des candidats écarte déjà en SQL tout compte portant une relance,
 * quelle qu'en soit la date : l'envoi est unique dans la vie d'un compte.
 *
 * Les journaux ne portent que des comptes, jamais une adresse ni un contenu.
 */
export async function relancerLesComptesVides(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await findComptesARelancer(maintenant);
  const alHeure = candidats.filter((candidat) => estLHeureDeLaRelance(maintenant, candidat));
  const resultat = passage(candidats.length, alHeure.length, 0);

  for (const candidat of alHeure) {
    const envoi = await sendNotification(candidat.userId, {
      type: "RELANCE_COMPTE_VIDE",
      payload: {},
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Relance des comptes vides", resultat);

  return resultat;
}
