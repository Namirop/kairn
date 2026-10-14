"use server";
// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { poserLesReglages, type ReglagesPosés } from "@/lib/db/reglages";

/**
 * Poser les réglages d'exploitation depuis l'écran interne.
 *
 * L'autorisation est revérifiée ici : une Server Action est une route,
 * atteignable sans passer par l'écran. `ADMIN_EMAILS` reste hors de portée de
 * ce chemin : un écran qui étend ses propres administrateurs n'a plus de porte.
 */

/** Un champ vide veut dire « rends la main à l'environnement ». */
const optionnel = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (valeur) => (valeur === "" || valeur === undefined ? null : valeur),
    schema.nullable(),
  );

const booleen = optionnel(z.enum(["true", "false"]).transform((valeur) => valeur === "true"));
const entierPositif = optionnel(z.coerce.number().int().positive());

const schema = z.object({
  enabled: booleen,
  mock: booleen,
  dailyCallCap: entierPositif,
  userDailyCallCap: entierPositif,
  anonymousDailyCallCap: entierPositif,
  model: optionnel(z.string().min(1)),
  maxTokens: entierPositif,
});

export type EtatDesReglages = { erreur?: string; message?: string };

export async function poserLesReglagesAction(
  _precedent: EtatDesReglages,
  donnees: FormData,
): Promise<EtatDesReglages> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) return { erreur: "Session absente." };
  if (!estAdministrateur(utilisateur.email)) return { erreur: "Accès refusé." };

  const lu = schema.safeParse({
    enabled: donnees.get("enabled"),
    mock: donnees.get("mock"),
    dailyCallCap: donnees.get("dailyCallCap"),
    userDailyCallCap: donnees.get("userDailyCallCap"),
    anonymousDailyCallCap: donnees.get("anonymousDailyCallCap"),
    model: donnees.get("model"),
    maxTokens: donnees.get("maxTokens"),
  });

  if (!lu.success) {
    const premier = lu.error.issues[0];

    return {
      erreur: premier ? `${premier.path.join(".")} : ${premier.message}` : "Réglage invalide.",
    };
  }

  const voulus: ReglagesPosés = lu.data;
  const { changements } = await poserLesReglages(voulus, utilisateur.email);

  revalidatePath(ROUTES.adminPilotage);

  if (changements === 0) return { message: "Rien n'a changé." };

  return {
    message:
      changements === 1
        ? "Un réglage posé. Il s'applique au prochain appel."
        : `${changements} réglages posés. Ils s'appliquent au prochain appel.`,
  };
}
