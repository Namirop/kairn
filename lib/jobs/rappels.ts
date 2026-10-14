import { compterDusAujourdhui } from "@/lib/db/session-du-jour";
import { trouverLesDestinataires } from "@/lib/db/destinataires-des-rappels";
import { trouverLesCompteurs } from "@/lib/db/reglages-du-compte";
import { envoyerLaNotification } from "@/lib/email/notifications";
import { aNotifier, journaliser, passage, type Passage } from "./passage-de-notification";
import { estLHeureDeLAlerte, serieEnSursis } from "@/lib/domain/alerte-de-streak";
import { jourLocal } from "@/lib/domain/jour-local";
import { choisirLesRappelsDus } from "@/lib/domain/selection-des-rappels";

/**
 * Les envois du passage horaire : rappel quotidien et alerte de série.
 *
 * Les fonctions pures tranchent qui est à l'heure ; `envoyerLaNotification` vérifie
 * en dernier le refus d'emails et le réglage du type, et aucun chemin ne le
 * contourne. `EmailDelivery` (clé compte, type, jour local) empêche un second
 * envoi le même jour, même si le passage est rejoué.
 */

/**
 * Le rappel quotidien, pour ceux dont l'heure locale est arrivée. Un compte
 * sans rien à revoir ne reçoit rien : un rappel qui n'annonce rien apprend à ne
 * plus ouvrir les suivants.
 */
export async function envoyerLesRappels(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await trouverLesDestinataires();
  const alHeure = choisirLesRappelsDus(candidats, maintenant);

  const { restants, deja } = await aNotifier("DAILY_REMINDER", alHeure);
  const resultat = passage(candidats.length, alHeure.length, deja);

  for (const { cible } of restants) {
    const dus = await compterDusAujourdhui(cible.userId, maintenant);

    if (dus === 0) {
      resultat.ignores += 1;
      continue;
    }

    const stats = await trouverLesCompteurs(cible.userId);
    const envoi = await envoyerLaNotification(cible.userId, {
      type: "DAILY_REMINDER",
      payload: { dus, currentStreak: stats?.currentStreak ?? 0 },
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Rappel quotidien", resultat);

  return resultat;
}

/**
 * L'alerte de série, pour ceux qui vont perdre la leur ce soir : l'heure est
 * venue, la série est en sursis, et il reste quelque chose de dû. Sans rien de
 * dû, la série casse quoi qu'on fasse ; l'alerte se tait plutôt que d'annoncer
 * l'inévitable.
 */
export async function envoyerLesAlertesDeStreak(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await trouverLesDestinataires("STREAK_ALERT");
  const alHeure = candidats
    .filter((cible) => estLHeureDeLAlerte(maintenant, cible))
    .map((cible) => ({ cible, jour: jourLocal(maintenant, cible.timezone) }));

  const { restants, deja } = await aNotifier("STREAK_ALERT", alHeure);
  const resultat = passage(candidats.length, alHeure.length, deja);

  for (const { cible } of restants) {
    const stats = await trouverLesCompteurs(cible.userId);
    const enSursis = serieEnSursis(maintenant, {
      timezone: cible.timezone,
      currentStreak: stats?.currentStreak ?? 0,
      dernierJourRevise: stats?.lastReviewedOn
        ? stats.lastReviewedOn.toISOString().slice(0, 10)
        : null,
    });

    if (!enSursis) {
      resultat.ignores += 1;
      continue;
    }

    const dus = await compterDusAujourdhui(cible.userId, maintenant);

    if (dus === 0) {
      resultat.ignores += 1;
      continue;
    }

    const envoi = await envoyerLaNotification(cible.userId, {
      type: "STREAK_ALERT",
      payload: { currentStreak: stats?.currentStreak ?? 0, dus },
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Alerte de série", resultat);

  return resultat;
}
