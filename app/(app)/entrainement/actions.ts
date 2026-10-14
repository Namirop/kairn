"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur, marquerPrincipeVu } from "@/lib/db/user-settings";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Les gestes de l'entraînement libre. Rien ici ne déplace une échéance : c'est
 * `lib/db/entrainement.ts` qui le garantit, pas cette couche.
 */

/** Même plafond qu'en session : un onglet ouvert une nuit ne mesure plus rien. */
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
 * Un tour de plus, sans quitter l'écran. Le geste le plus cher en lecture : il
 * passe par la limite de débit, et sa lecture est bornée côté base.
 */
export async function tourSuivantAction(): Promise<QuestionServie[]> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return [];

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return [];
  }

  return lireTourDentrainement(utilisateur.id);
}

/** L'explication du principe a été vue : une fenêtre qui revient devient un péage. */
export async function principeVuAction(): Promise<void> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return;

  await marquerPrincipeVu(utilisateur.id);
}
