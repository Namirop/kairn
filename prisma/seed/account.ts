import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db/client";

/**
 * Le compte de démonstration. Ses identifiants vivent ici et dans `.env`,
 * jamais dans la documentation du dépôt.
 */
export const SEED_USER_ID = "seed-compte-demonstration";
export const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@cairn.test";
export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "sentier-de-pierres-2026";
export const SEED_TIMEZONE = process.env.SEED_USER_TIMEZONE ?? "Europe/Brussels";

/**
 * Efface le compte de démonstration et, par cascade, tout ce qui lui appartient.
 * La portée est volontairement limitée à cet identifiant : le seed est rejouable
 * sans jamais toucher aux autres comptes ni au schéma.
 */
export async function resetSeedAccount(): Promise<void> {
  // AiCall se détache du compte au lieu de disparaître avec lui : la
  // comptabilité doit survivre à une suppression. Pour le seed, c'est l'inverse
  // qu'on veut — sinon chaque rejeu empile un registre de plus.
  await prisma.aiCall.deleteMany({ where: { userId: SEED_USER_ID } });
  await prisma.user.deleteMany({ where: { id: SEED_USER_ID } });
}

export async function createSeedAccount(): Promise<string> {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: SEED_USER_ID,
        name: "Compte de démonstration",
        email: SEED_EMAIL,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.account.create({
      data: {
        id: `${SEED_USER_ID}-credential`,
        accountId: SEED_USER_ID,
        providerId: "credential",
        userId: SEED_USER_ID,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: SEED_USER_ID,
        timezone: SEED_TIMEZONE,
        dailyReminderEnabled: true,
        dailyReminderHour: 19,
        streakAlertEnabled: true,
      },
    }),
    prisma.userStats.create({ data: { userId: SEED_USER_ID } }),
  ]);

  return SEED_USER_ID;
}
