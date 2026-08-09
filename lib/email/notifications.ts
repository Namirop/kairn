import { ROUTES } from "@/lib/auth/routes";
import { recordEmailDelivery } from "@/lib/db/reminder-audience";
import { findUserEmail } from "@/lib/db/user";
import { findUserSettings } from "@/lib/db/user-settings";
import { localDay } from "@/lib/domain/local-day";
import { sendEmail } from "./client";
import { renderDailyReminder, type DailyReminderPayload } from "./templates/daily-reminder";
import { createUnsubscribeToken } from "./unsubscribe";

/**
 * Point d'entrée unique des notifications. Un seul canal pour l'instant,
 * l'email, et un seul type. Le refus de l'utilisateur est vérifié ici, pas chez
 * l'appelant : aucun chemin ne peut le contourner.
 */

export type NotificationPayloads = {
  DAILY_REMINDER: DailyReminderPayload;
};

export type NotificationType = keyof NotificationPayloads;

export type NotificationOutcome =
  | { status: "SENT"; providerId: string | null }
  | { status: "SKIPPED"; reason: "OPTED_OUT" | "DISABLED" | "NO_SETTINGS" | "NO_EMAIL" };

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendNotification<T extends NotificationType>(
  userId: string,
  type: T,
  payload: NotificationPayloads[T],
): Promise<NotificationOutcome> {
  const settings = await findUserSettings(userId);

  if (!settings) return { status: "SKIPPED", reason: "NO_SETTINGS" };
  if (settings.emailOptOutAt) return { status: "SKIPPED", reason: "OPTED_OUT" };
  if (type === "DAILY_REMINDER" && !settings.dailyReminderEnabled) {
    return { status: "SKIPPED", reason: "DISABLED" };
  }

  const recipient = await findUserEmail(userId);

  if (!recipient) return { status: "SKIPPED", reason: "NO_EMAIL" };

  const unsubscribeUrl = `${baseUrl()}/desinscription?jeton=${createUnsubscribeToken(userId)}`;
  const email = renderDailyReminder(payload, {
    sessionUrl: `${baseUrl()}${ROUTES.aujourdhui}`,
    unsubscribeUrl,
  });

  const delivery = await sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  await recordEmailDelivery(
    userId,
    type,
    localDay(new Date(), settings.timezone),
    delivery.providerId,
  );

  return { status: "SENT", providerId: delivery.providerId };
}
