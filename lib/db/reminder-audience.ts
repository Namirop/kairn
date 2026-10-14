import { prisma } from "@/lib/db/client";
import { dayToUtcDate } from "@/lib/domain/local-day";
import type { NotificationType } from "@/lib/db/types";

/** Ce dont le rappel quotidien a besoin pour être écrit et adressé. */
export type ReminderCandidate = {
  userId: string;
  email: string;
  name: string;
  timezone: string;
  dailyReminderHour: number;
};

/**
 * Comptes qui acceptent encore ce type d'envoi ; chaque type a son propre
 * réglage.
 *
 * L'heure locale se filtre en mémoire, car elle dépend du fuseau de chacun. La
 * borne évite un tour complet de la table : quand la base grossira, il faudra
 * découper par tranche d'heure plutôt que relever la borne.
 */
export async function findReminderCandidates(
  type: NotificationType = "DAILY_REMINDER",
  limit = 500,
): Promise<ReminderCandidate[]> {
  const rows = await prisma.userSettings.findMany({
    where: {
      emailOptOutAt: null,
      ...(type === "DAILY_REMINDER"
        ? { dailyReminderEnabled: true }
        : { streakAlertEnabled: true }),
    },
    select: {
      userId: true,
      timezone: true,
      dailyReminderHour: true,
      user: { select: { email: true, name: true } },
    },
    take: limit,
  });

  return rows.map((row) => ({
    userId: row.userId,
    email: row.user.email,
    name: row.user.name,
    timezone: row.timezone,
    dailyReminderHour: row.dailyReminderHour,
  }));
}

/** Ceux déjà notifiés ce jour-là, pour ne pas écrire deux fois. */
export async function findAlreadyNotified(
  type: NotificationType,
  entries: { userId: string; day: string }[],
): Promise<Set<string>> {
  if (entries.length === 0) return new Set();

  const rows = await prisma.emailDelivery.findMany({
    where: {
      type,
      OR: entries.map((entry) => ({
        userId: entry.userId,
        day: dayToUtcDate(entry.day),
      })),
    },
    select: { userId: true },
  });

  return new Set(rows.map((row) => row.userId));
}

/** Trace l'envoi. La clé primaire (userId, type, day) le rend idempotent. */
export async function recordEmailDelivery(
  userId: string,
  type: NotificationType,
  day: string,
  providerId: string | null,
): Promise<void> {
  await prisma.emailDelivery.upsert({
    where: { userId_type_day: { userId, type, day: dayToUtcDate(day) } },
    create: { userId, type, day: dayToUtcDate(day), providerId },
    update: { providerId },
  });
}
