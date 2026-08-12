import { prisma } from "@/lib/db/client";

/**
 * Le compte de démonstration.
 *
 * Il n'a plus de mot de passe : l'authentification passe par un lien envoyé à
 * l'adresse, donc il n'y a rien à poser d'autre que l'adresse elle-même. On y
 * entre en demandant un lien depuis l'écran de connexion — better-auth
 * reconnaît le compte existant et l'ouvre au lieu d'en créer un.
 *
 * L'adresse par défaut est neutre à dessein : la vraie vit dans `.env`, qui
 * n'est pas versionné. Une adresse personnelle en dur dans le code serait une
 * adresse personnelle publiée.
 */
export const SEED_USER_ID = "seed-compte-demonstration";
export const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@cairn.test";
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
