import { prisma } from "@/lib/db/client";

/**
 * Le compte de démonstration. Pas de mot de passe : on y entre en demandant un
 * lien depuis l'écran de connexion, et better-auth ouvre le compte existant.
 *
 * L'adresse par défaut est neutre à dessein : la vraie vit dans `.env`, non
 * versionné.
 */
export const ID_DE_DEMONSTRATION = "seed-compte-demonstration";
export const ADRESSE_DE_DEMONSTRATION = process.env.SEED_USER_EMAIL ?? "demo@cairn.test";
export const FUSEAU_DE_DEMONSTRATION = process.env.SEED_USER_TIMEZONE ?? "Europe/Brussels";

/**
 * Efface le compte de démonstration et, par cascade, tout ce qui lui appartient.
 * La portée est volontairement limitée à cet identifiant : le seed est rejouable
 * sans jamais toucher aux autres comptes ni au schéma.
 */
export async function effacerLeCompteDeDemonstration(): Promise<void> {
  // AiCall survit à la suppression d'un compte (la comptabilité doit rester) ;
  // pour le seed on l'efface, sinon chaque rejeu empile un registre de plus.
  await prisma.aiCall.deleteMany({ where: { userId: ID_DE_DEMONSTRATION } });
  await prisma.user.deleteMany({ where: { id: ID_DE_DEMONSTRATION } });
}

export async function creerLeCompteDeDemonstration(): Promise<string> {
  const maintenant = new Date();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: ID_DE_DEMONSTRATION,
        name: "Compte de démonstration",
        email: ADRESSE_DE_DEMONSTRATION,
        emailVerified: true,
        createdAt: maintenant,
        updatedAt: maintenant,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: ID_DE_DEMONSTRATION,
        timezone: FUSEAU_DE_DEMONSTRATION,
        dailyReminderEnabled: true,
        dailyReminderHour: 19,
        streakAlertEnabled: true,
      },
    }),
    prisma.userStats.create({ data: { userId: ID_DE_DEMONSTRATION } }),
  ]);

  return ID_DE_DEMONSTRATION;
}
