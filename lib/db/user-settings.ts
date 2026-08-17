import { prisma } from "@/lib/db/client";
import type { UserSettings, UserStats } from "@/lib/db/types";

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

/** Lecture tolérante, pour les chemins qui savent traiter l'absence — l'envoi
 *  d'email, par exemple, qui se contente de ne rien envoyer. */
export async function findUserSettings(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({ where: { userId } });
}

/** Lecture stricte, pour les écrans : afficher un réglage par défaut inventé
 *  serait mentir à l'utilisateur sur l'état de son compte. */
export async function lireReglages(userId: string): Promise<UserSettings> {
  const reglages = await findUserSettings(userId);

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages;
}

/**
 * Le fuseau de l'utilisateur, sans repli.
 *
 * Aucun affichage d'échéance ne doit se rabattre sur « UTC » : ce serait
 * afficher une date fausse à quelqu'un plutôt que de signaler que son compte
 * est cassé.
 */
export async function lireFuseauUtilisateur(userId: string): Promise<string> {
  const reglages = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true },
  });

  if (!reglages) throw new ReglagesIntrouvablesError(userId);

  return reglages.timezone;
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
 * Note que le principe de l'entraînement libre a été expliqué.
 *
 * Écrit une fois pour toutes, sans jamais réécrire : la date du premier
 * passage est celle qui compte, et une seconde ouverture ne doit pas la
 * repousser.
 */
export async function marquerPrincipeVu(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, trainingIntroSeenAt: null },
    data: { trainingIntroSeenAt: at },
  });
}

/**
 * Ce qu'un compte peut changer de ses notifications.
 *
 * Trois réglages et rien d'autre : le fuseau se détecte, l'adresse est
 * l'identité du compte. Tout est écrit d'un coup — un formulaire qui enregistre
 * champ par champ laisse un état à moitié appliqué si un envoi échoue.
 */
export type ReglagesModifiables = {
  dailyReminderEnabled: boolean;
  /** Heure locale, 0 à 23. Le passage horaire la compare à l'heure de chacun. */
  dailyReminderHour: number;
  streakAlertEnabled: boolean;
};

/**
 * Enregistre les réglages de notification d'un compte.
 *
 * `updateMany` et non `update` : la clause porte l'`userId`, donc une ligne qui
 * n'appartient pas à l'appelant ne peut pas être touchée même si l'identifiant
 * était forgé. Rend `false` quand rien n'a été écrit.
 */
export async function enregistrerLesReglages(
  userId: string,
  reglages: ReglagesModifiables,
): Promise<boolean> {
  const { count } = await prisma.userSettings.updateMany({ where: { userId }, data: reglages });

  return count > 0;
}

/**
 * Rend les emails à quelqu'un qui les avait coupés.
 *
 * Le refus global partait en même temps que les deux réglages de contenu — c'est
 * ce que fait `optOutOfEmails`. Les remettre ici serait décider à sa place : on
 * lève le refus, et il choisit ensuite ce qu'il veut recevoir.
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
export async function optOutOfEmails(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { emailOptOutAt: at, dailyReminderEnabled: false, streakAlertEnabled: false },
  });
}

/**
 * Note que l'espacement a été expliqué, à la fin de la première session.
 *
 * Même écriture conditionnelle que `marquerPrincipeVu`, et pour la même raison :
 * la date du premier passage est celle qui compte, et une seconde session ne
 * doit pas la repousser.
 */
export async function marquerEspacementVu(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.userSettings.updateMany({
    where: { userId, spacingIntroSeenAt: null },
    data: { spacingIntroSeenAt: at },
  });
}
