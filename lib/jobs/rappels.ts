import { compterDusAujourdhui } from "@/lib/db/session-du-jour";
import { findReminderCandidates } from "@/lib/db/reminder-audience";
import { findUserStats } from "@/lib/db/user-settings";
import { sendNotification } from "@/lib/email/notifications";
import { aNotifier, journaliser, passage, type Passage } from "./passage-de-notification";
import { estLHeureDeLAlerte, serieEnSursis } from "@/lib/domain/alerte-de-streak";
import { localDay } from "@/lib/domain/local-day";
import { selectDueForReminder } from "@/lib/domain/reminder-selection";

/**
 * Les deux envois du soir et du matin, depuis le passage horaire.
 *
 * Le passage ne décide rien lui-même : il lit les candidats, laisse les
 * fonctions pures trancher qui est à l'heure et dont la série est en sursis, puis
 * appelle `sendNotification` — qui vérifie une dernière fois le refus d'emails et
 * le réglage du type. Aucun chemin ne contourne ce dernier contrôle.
 *
 * Rien n'est envoyé deux fois le même jour : `EmailDelivery` porte la clé
 * `(compte, type, jour local)`, et elle est consultée avant l'envoi comme écrite
 * après. Un passage rejoué à la même heure ne réécrit donc rien.
 *
 * Les journaux ne portent que des identifiants et des comptes, jamais une adresse
 * ni un contenu.
 */

/**
 * Le rappel quotidien, pour ceux dont l'heure locale est arrivée.
 *
 * Un compte sans rien à revoir ne reçoit rien. Le rappel dit ce qui est dû ; à
 * zéro il n'a rien à dire, et un message quotidien qui annonce régulièrement
 * qu'il n'y a rien à faire est un message qu'on apprend à ne plus ouvrir — ce qui
 * abîme aussi la remise des suivants.
 */
export async function envoyerLesRappels(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await findReminderCandidates();
  const alHeure = selectDueForReminder(candidats, maintenant).map((entree) => ({
    cible: entree.target,
    jour: entree.day,
  }));

  const { restants, deja } = await aNotifier("DAILY_REMINDER", alHeure);
  const resultat = passage(candidats.length, alHeure.length, deja);

  for (const { cible } of restants) {
    const dus = await compterDusAujourdhui(cible.userId, maintenant);

    if (dus === 0) {
      resultat.ignores += 1;
      continue;
    }

    const stats = await findUserStats(cible.userId);
    const envoi = await sendNotification(cible.userId, {
      type: "DAILY_REMINDER",
      payload: { dueCount: dus, currentStreak: stats?.currentStreak ?? 0 },
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Rappel quotidien", resultat);

  return resultat;
}

/**
 * L'alerte de série, pour ceux qui vont perdre la leur ce soir.
 *
 * Trois conditions, dans cet ordre : il est l'heure chez la personne, sa série
 * existe et rien n'a été revu aujourd'hui, et il reste quelque chose de dû —
 * sans quoi l'alerte annoncerait une perte qu'on ne peut pas éviter.
 *
 * Cette dernière condition dit aussi une limite du produit telle qu'il est
 * aujourd'hui : une journée sans rien à revoir casse la série, et personne ne
 * peut rien y faire. L'alerte se tait alors plutôt que d'annoncer l'inévitable.
 */
export async function envoyerLesAlertesDeStreak(maintenant: Date = new Date()): Promise<Passage> {
  const candidats = await findReminderCandidates("STREAK_ALERT");
  const alHeure = candidats
    .filter((cible) => estLHeureDeLAlerte(maintenant, cible))
    .map((cible) => ({ cible, jour: localDay(maintenant, cible.timezone) }));

  const { restants, deja } = await aNotifier("STREAK_ALERT", alHeure);
  const resultat = passage(candidats.length, alHeure.length, deja);

  for (const { cible } of restants) {
    const stats = await findUserStats(cible.userId);
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

    const envoi = await sendNotification(cible.userId, {
      type: "STREAK_ALERT",
      payload: { currentStreak: stats?.currentStreak ?? 0, dueCount: dus },
    });

    if (envoi.status === "SENT") resultat.envoyes += 1;
    else resultat.ignores += 1;
  }

  journaliser("Alerte de série", resultat);

  return resultat;
}
