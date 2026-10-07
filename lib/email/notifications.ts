import { ROUTES } from "@/lib/auth/routes";
import { recordEmailDelivery } from "@/lib/db/reminder-audience";
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
 * Point d'entrée unique des notifications. Un seul canal, l'email. Le refus de
 * l'utilisateur est vérifié ici, pas chez l'appelant : aucun chemin ne peut le
 * contourner.
 *
 * Trois types partent du passage horaire — le rappel, l'alerte de série et la
 * relance d'un compte vide. Le quatrième, l'accueil, part du hook d'inscription :
 * même enveloppe, même vérification du refus, même trace dans `EmailDelivery`,
 * mais déclenché par un geste et non par une heure.
 *
 * L'accueil et la relance n'ont pas d'interrupteur : on les reçoit une fois. Ce
 * qui garantit cette unicité n'est pas ici mais chez l'appelant — pour la
 * relance, une lecture d'`EmailDelivery` sur le type, sans condition de jour.
 *
 * Le lien de connexion, lui, ne passe pas par ici — c'est un envoi
 * transactionnel qui doit partir même à quelqu'un qui a coupé ses emails. Voir
 * `connexion.ts`.
 *
 * Le type et sa charge voyagent ensemble, en union discriminée : c'est ce qui
 * permet au compilateur de savoir quel gabarit reçoit quoi, sans une seule
 * assertion de type.
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
 * Le réglage qui gouverne ce type-là. Chacun a le sien, et il est respecté ici.
 *
 * Une table plutôt qu'un ternaire : avec deux types, « sinon » voulait dire
 * l'alerte de série ; avec trois, il ferait hériter le nouveau venu d'un
 * interrupteur qui ne le concerne pas, sans que rien ne le signale. Ici, un type
 * ajouté sans sa ligne ne compile pas.
 *
 * L'accueil et la relance n'ont pas d'interrupteur : on les reçoit une fois, et
 * il n'y a pas d'instant où l'on aurait pu les refuser à l'avance. Le refus
 * global, lui, les arrête comme les autres — il est vérifié avant cette table.
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

function composer(notification: Notification, liens: Liens): RenderedEmail {
  switch (notification.type) {
    case "DAILY_REMINDER":
      return renderDailyReminder(notification.payload, liens);
    case "STREAK_ALERT":
      return renderAlerteDeStreak(notification.payload, liens);
    case "ACCUEIL":
      return renderAccueil(notification.payload, liens);
    case "RELANCE_COMPTE_VIDE":
      return renderRelanceDuCompteVide(notification.payload, liens);
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
  const email = composer(notification, {
    sessionUrl: `${adresseDeLApp()}${ROUTES.aujourdhui}`,
    depotUrl: `${adresseDeLApp()}${ROUTES.depotNouveau}`,
    unsubscribeUrl,
  });

  const delivery = await sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Ce que les clients mail attendent d'un envoi périodique : un
    // désabonnement en un clic, sans passer par une page. Sans ces en-têtes,
    // Gmail range plus volontiers l'envoi en indésirable.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
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
