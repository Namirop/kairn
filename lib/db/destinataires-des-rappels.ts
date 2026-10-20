import { prisma } from "@/lib/db/client";
import { jourEnDateUtc } from "@/lib/domain/jour-local";
import type { NotificationType } from "@/lib/db/types";

export type DestinataireDeRappel = {
  userId: string;
  email: string;
  name: string;
  timezone: string;
  dailyReminderHour: number;
};

/**
 * L'heure locale se filtre en mémoire, selon le fuseau de chacun. Quand la base
 * grossira, découper par tranche d'heure plutôt que relever la borne.
 */
export async function trouverLesDestinataires(
  type: NotificationType = "DAILY_REMINDER",
  limite = 500,
): Promise<DestinataireDeRappel[]> {
  const lignes = await prisma.userSettings.findMany({
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
    take: limite,
  });

  return lignes.map((ligne) => ({
    userId: ligne.userId,
    email: ligne.user.email,
    name: ligne.user.name,
    timezone: ligne.timezone,
    dailyReminderHour: ligne.dailyReminderHour,
  }));
}

/** Pour ne pas écrire deux fois le même jour. */
export async function trouverLesDejaNotifies(
  type: NotificationType,
  entrees: { userId: string; jour: string }[],
): Promise<Set<string>> {
  if (entrees.length === 0) return new Set();

  const lignes = await prisma.emailDelivery.findMany({
    where: {
      type,
      OR: entrees.map((entree) => ({
        userId: entree.userId,
        day: jourEnDateUtc(entree.jour),
      })),
    },
    select: { userId: true },
  });

  return new Set(lignes.map((ligne) => ligne.userId));
}

/** La clé primaire (userId, type, day) rend l'écriture idempotente. */
export async function enregistrerLEnvoi(
  userId: string,
  type: NotificationType,
  jour: string,
  providerId: string | null,
): Promise<void> {
  await prisma.emailDelivery.upsert({
    where: { userId_type_day: { userId, type, day: jourEnDateUtc(jour) } },
    create: { userId, type, day: jourEnDateUtc(jour), providerId },
    update: { providerId },
  });
}
