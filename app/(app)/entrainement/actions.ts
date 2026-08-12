"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur, marquerPrincipeVu } from "@/lib/db/user-settings";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Les gestes de l'entraînement libre.
 *
 * Rien de ce qui est écrit ici ne déplace une échéance. La note donnée sert
 * l'historique, pas la planification — et c'est `lib/db/entrainement.ts` qui le
 * garantit, pas cette couche.
 */

/**
 * Borne haute du temps de réponse, la même qu'en session : un onglet laissé
 * ouvert une nuit ne doit pas écrire un nombre qui ne veut rien dire.
 */
const TEMPS_MAXIMUM_MS = 15 * 60 * 1000;

const passageSchema = z.object({
  atomId: z.string().min(1),
  variantId: z.string().min(1),
  note: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  tempsMs: z.number().int().min(0).max(TEMPS_MAXIMUM_MS).catch(TEMPS_MAXIMUM_MS),
});

export type PassageDonne = z.input<typeof passageSchema>;

export async function sentrainerAction(donnees: PassageDonne): Promise<boolean> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return false;

  const valide = passageSchema.safeParse(donnees);

  if (!valide.success) return false;

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return false;
  }

  return enregistrerEntrainement({ userId: utilisateur.id, ...valide.data });
}

/**
 * Un tour de plus, sans quitter l'écran.
 *
 * Le geste le plus cher en lecture des trois — il parcourt les concepts du
 * compte pour en tirer douze questions. Il passe donc par la même limite de
 * débit, et la lecture qu'il déclenche est bornée côté base.
 */
export async function tourSuivantAction(): Promise<QuestionServie[]> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return [];

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return [];
  }

  return lireTourDentrainement(utilisateur.id);
}

/**
 * L'explication du principe a été lue. Elle ne reviendra plus.
 *
 * Une fenêtre qui barre la route à chaque fois devient un péage : on apprend à
 * la cliquer sans la lire, et ce qu'elle disait est perdu pour de bon.
 */
export async function principeVuAction(): Promise<void> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return;

  await marquerPrincipeVu(utilisateur.id);
}
