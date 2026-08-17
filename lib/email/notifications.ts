import { ROUTES } from "@/lib/auth/routes";
import { recordEmailDelivery } from "@/lib/db/reminder-audience";
import { findUserEmail } from "@/lib/db/user";
import { findUserSettings } from "@/lib/db/user-settings";
import { localDay } from "@/lib/domain/local-day";
import { sendEmail } from "./client";
import { renderAlerteDeStreak, type AlerteDeStreakPayload } from "./templates/alerte-de-streak";
import {
  renderDailyReminder,
  type DailyReminderPayload,
  type RenderedEmail,
} from "./templates/daily-reminder";
import { createUnsubscribeToken } from "./unsubscribe";

/**
 * Point d'entrée unique des notifications. Un seul canal, l'email, et deux
 * types. Le refus de l'utilisateur est vérifié ici, pas chez l'appelant : aucun
 * chemin ne peut le contourner.
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
  | { type: "STREAK_ALERT"; payload: AlerteDeStreakPayload };

export type NotificationType = Notification["type"];

export type NotificationOutcome =
  | { status: "SENT"; providerId: string | null }
  | { status: "SKIPPED"; reason: "OPTED_OUT" | "DISABLED" | "NO_SETTINGS" | "NO_EMAIL" };

type Liens = { sessionUrl: string; unsubscribeUrl: string };

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Le réglage qui gouverne ce type-là. Chacun a le sien, et il est respecté ici. */
function estActive(
  type: NotificationType,
  reglages: { dailyReminderEnabled: boolean; streakAlertEnabled: boolean },
): boolean {
  return type === "DAILY_REMINDER" ? reglages.dailyReminderEnabled : reglages.streakAlertEnabled;
}

function composer(notification: Notification, liens: Liens): RenderedEmail {
  if (notification.type === "DAILY_REMINDER") {
    return renderDailyReminder(notification.payload, liens);
  }

  return renderAlerteDeStreak(notification.payload, liens);
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

  const unsubscribeUrl = `${baseUrl()}/desinscription?jeton=${createUnsubscribeToken(userId)}`;
  const email = composer(notification, {
    sessionUrl: `${baseUrl()}${ROUTES.aujourdhui}`,
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
