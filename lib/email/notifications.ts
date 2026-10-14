import { ROUTES } from "@/lib/auth/routes";
import { recordEmailDelivery } from "@/lib/db/reminder-audience";
import type { Langue } from "@/lib/db/types";
import { findUserEmail } from "@/lib/db/user";
import { findUserSettings } from "@/lib/db/user-settings";
import { localDay } from "@/lib/domain/local-day";
import { adresseDeLApp } from "@/lib/site/adresse-de-lapp";
import { sendEmail } from "./client";
import { renderAccueil, type AccueilPayload } from "./templates/accueil";
import { renderAlerteDeStreak, type AlerteDeStreakPayload } from "./templates/alerte-de-streak";
import {
  renderDailyReminder,
  type DailyReminderPayload,
  type RenderedEmail,
} from "./templates/daily-reminder";
import {
  renderRelanceDuCompteVide,
  type RelanceDuCompteVidePayload,
} from "./templates/relance-du-compte-vide";
import { createUnsubscribeToken } from "./unsubscribe";

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
  | { type: "DAILY_REMINDER"; payload: DailyReminderPayload }
  | { type: "STREAK_ALERT"; payload: AlerteDeStreakPayload }
  | { type: "ACCUEIL"; payload: AccueilPayload }
  | { type: "RELANCE_COMPTE_VIDE"; payload: RelanceDuCompteVidePayload };

export type NotificationType = Notification["type"];

export type NotificationOutcome =
  | { status: "SENT"; providerId: string | null }
  | { status: "SKIPPED"; reason: "OPTED_OUT" | "DISABLED" | "NO_SETTINGS" | "NO_EMAIL" };

type Liens = { sessionUrl: string; depotUrl: string; unsubscribeUrl: string };

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
  type: NotificationType,
  reglages: { dailyReminderEnabled: boolean; streakAlertEnabled: boolean },
): boolean {
  const gouverne: Record<NotificationType, boolean> = {
    DAILY_REMINDER: reglages.dailyReminderEnabled,
    STREAK_ALERT: reglages.streakAlertEnabled,
    ACCUEIL: true,
    RELANCE_COMPTE_VIDE: true,
  };

  return gouverne[type];
}

/** L'email est écrit dans la langue du compte, celle de son interface. */
function composer(notification: Notification, liens: Liens, langue: Langue): RenderedEmail {
  switch (notification.type) {
    case "DAILY_REMINDER":
      return renderDailyReminder(notification.payload, liens, langue);
    case "STREAK_ALERT":
      return renderAlerteDeStreak(notification.payload, liens, langue);
    case "ACCUEIL":
      return renderAccueil(notification.payload, liens, langue);
    case "RELANCE_COMPTE_VIDE":
      return renderRelanceDuCompteVide(notification.payload, liens, langue);
  }
}

export async function sendNotification(
  userId: string,
  notification: Notification,
): Promise<NotificationOutcome> {
  const settings = await findUserSettings(userId);

  if (!settings) return { status: "SKIPPED", reason: "NO_SETTINGS" };
  if (settings.emailOptOutAt) return { status: "SKIPPED", reason: "OPTED_OUT" };
  if (!estActive(notification.type, settings)) return { status: "SKIPPED", reason: "DISABLED" };

  const recipient = await findUserEmail(userId);

  if (!recipient) return { status: "SKIPPED", reason: "NO_EMAIL" };

  const unsubscribeUrl = `${adresseDeLApp()}/desinscription?jeton=${createUnsubscribeToken(userId)}`;
  const email = composer(
    notification,
    {
      sessionUrl: `${adresseDeLApp()}${ROUTES.aujourdhui}`,
      depotUrl: `${adresseDeLApp()}${ROUTES.depotNouveau}`,
      unsubscribeUrl,
    },
    settings.langue,
  );

  const delivery = await sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Désabonnement en un clic (RFC 8058) : sans ces en-têtes, Gmail range
    // plus volontiers l'envoi en indésirable.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      // i18n-ignore — valeur d'en-tête fixée par la RFC 8058.
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  await recordEmailDelivery(
    userId,
    notification.type,
    localDay(new Date(), settings.timezone),
    delivery.providerId,
  );

  return { status: "SENT", providerId: delivery.providerId };
}
