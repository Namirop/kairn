import { findComptesARelancer } from "@/lib/db/comptes-a-relancer";
import { estLHeureDeLaRelance } from "@/lib/domain/relance-du-compte-vide";
import { sendNotification } from "@/lib/email/notifications";
import { journaliser, passage, type Passage } from "./passage-de-notification";

/**
 * La relance des comptes restés vides, depuis le même passage horaire.
 *
 * Le troisième envoi, et le seul qui s'adresse à quelqu'un dont le produit ne
 * sait rien. Les deux autres supposent quelque chose d'échu ; un compte qui n'a
 * jamais déposé n'a rien d'échu, et sortait du produit sans qu'aucun message ne
 * le rattrape.
 *
 * **Pas d'écart des déjà-notifiés ici**, contrairement aux deux autres passages.
 * `aNotifier` écarte sur `(compte, type, jour local)`, ce qui empêche un
 * doublon dans la journée mais autoriserait une relance par jour pendant toute
 * la fenêtre. La lecture qui sélectionne les candidats écarte déjà, en SQL, tout
 * compte portant **une** relance quelle qu'en soit la date — c'est strictement
 * plus fort, et c'est ce qui rend l'envoi unique dans une vie de compte.
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
