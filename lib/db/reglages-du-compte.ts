import { prisma } from "@/lib/db/client";
import type { Langue, UserSettings, UserStats } from "@/lib/db/types";

/** Réglages et compteurs d'un compte, toujours lus par l'id de session. */

/** Impossible en principe : compte et réglages naissent dans une même transaction. */
export class ReglagesIntrouvablesError extends Error {
  readonly code = "REGLAGES_INTROUVABLES";

  constructor(readonly userId: string) {
    super(`Aucun UserSettings pour le compte ${userId}.`);
    this.name = "ReglagesIntrouvablesError";
  }
}

/** Pour les chemins qui savent traiter l'absence, comme l'envoi d'email. */
export async function trouverLesReglages(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({ where: { userId } });
}

/** Stricte : un réglage par défaut inventé mentirait sur l'état du compte. */
export async function lireReglages(userId: string): Promise<UserSettings> {
  const reglages = await trouverLesReglages(userId);

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages;
}

/** Sans repli sur UTC : mieux vaut un compte cassé signalé qu'une échéance fausse. */
export async function lireFuseauUtilisateur(userId: string): Promise<string> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages.timezone;
}

/** Lus ensemble : session et tableau de bord demandent toujours les deux. */
export type CadreDeSession = { fuseau: string; plafond: number };

export async function lireCadreDeSession(userId: string): Promise<CadreDeSession> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true, sessionCap: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return { fuseau: reglages.timezone, plafond: reglages.sessionCap };
}

export async function trouverLesCompteurs(userId: string): Promise<UserStats | null> {
  return prisma.userStats.findUnique({ where: { userId } });
}

/** Le fuseau détecté côté client. */
export async function poserLeFuseau(userId: string, timezone: string): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { timezone },
  });
}

/** N'écrit que si la date est vide : c'est le premier passage qui compte. */
export async function marquerPrincipeVu(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, trainingIntroSeenAt: null },
    data: { trainingIntroSeenAt: quand },
  });
}

/**
 * Le fuseau se détecte, l'adresse est l'identité du compte. Tout s'écrit d'un
 * coup, jamais à moitié appliqué.
 */
export type ReglagesModifiables = {
  /** Ce qui déborde revient le lendemain. */
  sessionCap: number;
  dailyReminderEnabled: boolean;
  /** Heure locale, 0 à 23, comparée à l'heure de chacun par le passage horaire. */
  dailyReminderHour: number;
  streakAlertEnabled: boolean;
};

/** `updateMany` rend `false` sans ligne, là où `update` lèverait. */
export async function enregistrerLesReglages(
  userId: string,
  reglages: ReglagesModifiables,
): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({ where: { userId }, data: reglages });

  return count > 0;
}

/** Rappel et alerte de série, éteints par `couperLesEmails`, ne se rallument pas à sa place. */
export async function reprendreLesEmails(userId: string): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({
    where: { userId },
    data: { emailOptOutAt: null },
  });

  return count > 0;
}

/** Appelé par le lien de désinscription, sans session : son jeton signé fait foi. */
export async function couperLesEmails(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { emailOptOutAt: quand, dailyReminderEnabled: false, streakAlertEnabled: false },
  });
}

/** À la fin de la première session ; même écriture conditionnelle que `marquerPrincipeVu`. */
export async function marquerEspacementVu(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, spacingIntroSeenAt: null },
    data: { spacingIntroSeenAt: quand },
  });
}

/** Sans repli : un dépôt généré dans une langue inventée reste figé. */
export async function lireLangueUtilisateur(userId: string): Promise<Langue> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { langue: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages.langue;
}

/** Rien de ce qui est déjà déposé ne change avec elle. */
export async function changerDeLangue(userId: string, langue: Langue): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({ where: { userId }, data: { langue } });

  return count > 0;
}
