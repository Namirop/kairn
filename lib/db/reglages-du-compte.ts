import { prisma } from "@/lib/db/client";
import type { Langue, UserSettings, UserStats } from "@/lib/db/types";

/** Réglages et compteurs d'un compte. Toujours lus par l'id de session. */

/** Un compte sans réglages n'aurait pas dû être créé : les deux sont écrits
 *  dans la même transaction à l'inscription. */
export class ReglagesIntrouvablesError extends Error {
  readonly code = "REGLAGES_INTROUVABLES";

  constructor(readonly userId: string) {
    super(`Aucun UserSettings pour le compte ${userId}.`);
    this.name = "ReglagesIntrouvablesError";
  }
}

/** Lecture tolérante, pour les chemins qui savent traiter l'absence (l'envoi
 *  d'email se contente de ne rien envoyer). */
export async function trouverLesReglages(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({ where: { userId } });
}

/** Lecture stricte, pour les écrans : un réglage par défaut inventé mentirait
 *  sur l'état du compte. */
export async function lireReglages(userId: string): Promise<UserSettings> {
  const reglages = await trouverLesReglages(userId);

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages;
}

/**
 * Le fuseau de l'utilisateur, sans repli sur « UTC » : mieux vaut signaler un
 * compte cassé qu'afficher une échéance fausse.
 */
export async function lireFuseauUtilisateur(userId: string): Promise<string> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages.timezone;
}

/**
 * Le fuseau et le plafond de session, lus ensemble : la session et le tableau
 * de bord les demandent toujours tous les deux.
 */
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

/** Écrit le fuseau détecté côté client. Sans effet s'il n'a pas changé. */
export async function poserLeFuseau(userId: string, timezone: string): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { timezone },
  });
}

/**
 * Note que le principe de l'entraînement libre a été expliqué. N'écrit que si
 * la date est vide : c'est le premier passage qui compte.
 */
export async function marquerPrincipeVu(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, trainingIntroSeenAt: null },
    data: { trainingIntroSeenAt: quand },
  });
}

/**
 * Ce qu'un compte peut changer depuis ses réglages : le plafond de session et
 * les notifications. Le fuseau se détecte, l'adresse est l'identité du compte.
 * Tout s'écrit d'un coup, pour ne jamais laisser un état à moitié appliqué.
 */
export type ReglagesModifiables = {
  /** Concepts au plus dans une session. Ce qui déborde revient le lendemain. */
  sessionCap: number;
  dailyReminderEnabled: boolean;
  /** Heure locale, 0 à 23. Le passage horaire la compare à l'heure de chacun. */
  dailyReminderHour: number;
  streakAlertEnabled: boolean;
};

/**
 * Enregistre les réglages modifiables d'un compte. `updateMany` pour rendre
 * `false` quand aucune ligne n'existe, là où `update` lèverait.
 */
export async function enregistrerLesReglages(
  userId: string,
  reglages: ReglagesModifiables,
): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({ where: { userId }, data: reglages });

  return count > 0;
}

/**
 * Rend les emails à quelqu'un qui les avait coupés. `couperLesEmails` éteint
 * aussi le rappel et l'alerte de série ; on ne les rallume pas à sa place.
 */
export async function reprendreLesEmails(userId: string): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({
    where: { userId },
    data: { emailOptOutAt: null },
  });

  return count > 0;
}

/**
 * Coupe les emails. Appelé par le lien de désinscription, qui ne demande pas de
 * session : le jeton signé du lien fait foi.
 */
export async function couperLesEmails(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { emailOptOutAt: quand, dailyReminderEnabled: false, streakAlertEnabled: false },
  });
}

/**
 * Note que l'espacement a été expliqué, à la fin de la première session. Même
 * écriture conditionnelle que `marquerPrincipeVu`.
 */
export async function marquerEspacementVu(userId: string, quand: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, spacingIntroSeenAt: null },
    data: { spacingIntroSeenAt: quand },
  });
}

/**
 * La langue de la personne, sans repli : un dépôt généré dans une langue
 * inventée reste figé.
 */
export async function lireLangueUtilisateur(userId: string): Promise<Langue> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { langue: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages.langue;
}

/** La langue du compte. Rien de ce qui est déjà déposé ne change avec elle. */
export async function changerDeLangue(userId: string, langue: Langue): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({ where: { userId }, data: { langue } });

  return count > 0;
}
