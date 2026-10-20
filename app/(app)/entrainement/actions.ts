"use server";

import { z } from "zod";
import { lireLUtilisateur } from "@/lib/auth/session";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import { prendreUnGeste } from "@/lib/db/limite-de-gestes";
import { lireFuseauUtilisateur, marquerPrincipeVu } from "@/lib/db/reglages-du-compte";
import type { QuestionServie } from "@/lib/db/question-servie";

/** Rien ne déplace une échéance : `lib/db/entrainement.ts` le garantit, pas cette couche. */

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
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return false;

  const valide = passageSchema.safeParse(donnees);

  if (!valide.success) return false;

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return false;
  }

  return enregistrerEntrainement({ userId: utilisateur.id, ...valide.data });
}

/** Le geste le plus cher en lecture : limite de débit, et lecture bornée côté base. */
export async function tourSuivantAction(): Promise<QuestionServie[]> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return [];

  if (!(await prendreUnGeste(utilisateur.id, await lireFuseauUtilisateur(utilisateur.id)))) {
    return [];
  }

  return lireTourDentrainement(utilisateur.id);
}

/** Une explication qui revient devient un péage. */
export async function principeVuAction(): Promise<void> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return;

  await marquerPrincipeVu(utilisateur.id);
}
