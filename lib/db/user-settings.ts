import { prisma } from "@/lib/db/client";
import type { UserSettings, UserStats } from "@/lib/db/types";

/** Réglages et compteurs d'un compte. Toujours lus par l'id de session. */

export async function findUserSettings(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({ where: { userId } });
}

export async function findUserStats(userId: string): Promise<UserStats | null> {
  return prisma.userStats.findUnique({ where: { userId } });
}

/** Écrit le fuseau détecté côté client. Sans effet s'il n'a pas changé. */
export async function setTimezone(userId: string, timezone: string): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { timezone },
  });
}

/**
 * Coupe les emails. Appelé par le lien de désinscription, qui ne demande pas de
 * session : le jeton signé du lien fait foi.
 */
export async function optOutOfEmails(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { emailOptOutAt: at, dailyReminderEnabled: false, streakAlertEnabled: false },
  });
}
