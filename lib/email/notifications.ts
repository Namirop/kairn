import { ROUTES } from "@/lib/auth/routes";
import { enregistrerLEnvoi } from "@/lib/db/destinataires-des-rappels";
import type { Langue } from "@/lib/db/types";
import { trouverLAdresse } from "@/lib/db/adresse-du-compte";
import { trouverLesReglages } from "@/lib/db/reglages-du-compte";
import { jourLocal } from "@/lib/domain/jour-local";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { envoyerLEmail } from "./client";
import { composerLAccueil, type AccueilPayload } from "./templates/accueil";
import { composerLAlerteDeStreak, type AlerteDeStreakPayload } from "./templates/alerte-de-streak";
import {
  composerLeRappelQuotidien,
  type RappelQuotidienPayload,
} from "./templates/rappel-quotidien";
import type { EmailRendu } from "./templates/gabarit";
import {
  composerLaRelanceDuCompteVide,
  type RelanceDuCompteVidePayload,
} from "./templates/relance-du-compte-vide";
import { creerLeJetonDeDesinscription } from "./desinscription";

/**
 * Point d'entrée unique des notifications, par email. Le refus de
 * l'utilisateur est vérifié ici, pas chez l'appelant : aucun chemin ne peut le
 * contourner.
 *
 * Le rappel, l'alerte de série et la relance partent du passage horaire ;
 * l'accueil part du hook d'inscription. L'unicité de l'accueil et de la relance
 * est garantie chez l'appelant (pour la relance, une lecture d'`EmailDelivery`
 * sur le type, sans condition de jour).
 *
 * Le lien de connexion ne passe pas par ici : transactionnel, il doit partir
 * même à qui a coupé ses emails (`connexion.ts`).
 */

export type Notification =
  | { type: "DAILY_REMINDER"; payload: RappelQuotidienPayload }
  | { type: "STREAK_ALERT"; payload: AlerteDeStreakPayload }
  | { type: "ACCUEIL"; payload: AccueilPayload }
  | { type: "RELANCE_COMPTE_VIDE"; payload: RelanceDuCompteVidePayload };

export type TypeDeNotification = Notification["type"];

export type IssueDeNotification =
  | { status: "SENT"; providerId: string | null }
  | { status: "SKIPPED"; reason: "OPTED_OUT" | "DISABLED" | "NO_SETTINGS" | "NO_EMAIL" };

type Liens = { lienDeSession: string; lienDeDepot: string; lienDeDesinscription: string };

/**
 * Le réglage qui gouverne ce type-là.
 *
 * Une table plutôt qu'un ternaire : un type ajouté sans sa ligne ne compile
 * pas, au lieu d'hériter d'un interrupteur qui ne le concerne pas.
 *
 * L'accueil et la relance n'ont pas d'interrupteur, puisqu'on les reçoit une
 * fois ; le refus global, vérifié avant, les arrête comme les autres.
 */
function estActive(
  type: TypeDeNotification,
  reglages: { dailyReminderEnabled: boolean; streakAlertEnabled: boolean },
): boolean {
  const gouverne: Record<TypeDeNotification, boolean> = {
    DAILY_REMINDER: reglages.dailyReminderEnabled,
    STREAK_ALERT: reglages.streakAlertEnabled,
    ACCUEIL: true,
    RELANCE_COMPTE_VIDE: true,
  };

  return gouverne[type];
}

/** L'email est écrit dans la langue du compte, celle de son interface. */
function composer(notification: Notification, liens: Liens, langue: Langue): EmailRendu {
  switch (notification.type) {
    case "DAILY_REMINDER":
      return composerLeRappelQuotidien(notification.payload, liens, langue);
    case "STREAK_ALERT":
      return composerLAlerteDeStreak(notification.payload, liens, langue);
    case "ACCUEIL":
      return composerLAccueil(notification.payload, liens, langue);
    case "RELANCE_COMPTE_VIDE":
      return composerLaRelanceDuCompteVide(notification.payload, liens, langue);
  }
}

export async function envoyerLaNotification(
  userId: string,
  notification: Notification,
): Promise<IssueDeNotification> {
  const reglages = await trouverLesReglages(userId);

  if (!reglages) return { status: "SKIPPED", reason: "NO_SETTINGS" };
  if (reglages.emailOptOutAt) return { status: "SKIPPED", reason: "OPTED_OUT" };
  if (!estActive(notification.type, reglages)) return { status: "SKIPPED", reason: "DISABLED" };

  const destinataire = await trouverLAdresse(userId);

  if (!destinataire) return { status: "SKIPPED", reason: "NO_EMAIL" };

  const lienDeDesinscription = `${adresseDeLApp()}/desinscription?jeton=${creerLeJetonDeDesinscription(userId)}`;
  const email = composer(
    notification,
    {
      lienDeSession: `${adresseDeLApp()}${ROUTES.aujourdhui}`,
      lienDeDepot: `${adresseDeLApp()}${ROUTES.depotNouveau}`,
      lienDeDesinscription,
    },
    reglages.langue,
  );

  const envoi = await envoyerLEmail({
    to: destinataire,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Désabonnement en un clic (RFC 8058) : sans ces en-têtes, Gmail range
    // plus volontiers l'envoi en indésirable.
    headers: {
      "List-Unsubscribe": `<${lienDeDesinscription}>`,
      // i18n-ignore — valeur d'en-tête fixée par la RFC 8058.
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  await enregistrerLEnvoi(
    userId,
    notification.type,
    jourLocal(new Date(), reglages.timezone),
    envoi.providerId,
  );

  return { status: "SENT", providerId: envoi.providerId };
}
