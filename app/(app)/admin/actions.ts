"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { poserLesReglages, type ReglagesPosés } from "@/lib/db/reglages";

/**
 * Poser les réglages d'exploitation depuis l'écran interne.
 *
 * L'autorisation est revérifiée ici et pas seulement à l'affichage de la page :
 * une Server Action est une route, atteignable sans passer par l'écran qui la
 * propose. Vérifier au rendu ne protège que le rendu.
 *
 * Rien de ce qui touche à l'autorisation n'est modifiable par ce chemin —
 * `ADMIN_EMAILS` reste une variable d'environnement. Un écran d'administration
 * qui peut étendre la liste de ses propres administrateurs n'a plus de porte.
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
  model: optionnel(z.string().min(1)),
  maxTokens: entierPositif,
});

export type EtatDesReglages = { erreur?: string; message?: string };

export async function poserLesReglagesAction(
  _precedent: EtatDesReglages,
  donnees: FormData,
): Promise<EtatDesReglages> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) return { erreur: "Session absente." };
  if (!estAdministrateur(utilisateur.email)) return { erreur: "Accès refusé." };

  const lu = schema.safeParse({
    enabled: donnees.get("enabled"),
    mock: donnees.get("mock"),
    dailyCallCap: donnees.get("dailyCallCap"),
    userDailyCallCap: donnees.get("userDailyCallCap"),
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

  revalidatePath(ROUTES.adminReglages);

  if (changements === 0) return { message: "Rien n'a changé." };

  return {
    message:
      changements === 1
        ? "Un réglage posé. Il s'applique au prochain appel."
        : `${changements} réglages posés. Ils s'appliquent au prochain appel.`,
  };
}
