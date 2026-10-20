import { cookies, headers } from "next/headers";
import { cache } from "react";
import { lireLUtilisateur } from "@/lib/auth/session";
import { trouverLesReglages } from "@/lib/db/reglages-du-compte";
import type { Langue } from "@/lib/db/types";
import { langueDepuisCode, langueDevinee } from "@/lib/domain/langue-devinee";
import { COOKIE_DE_LANGUE, EN_TETE_DE_LANGUE } from "./langues";

/**
 * Une adresse qui porte la langue l'impose, même connecté : partagée, elle
 * montre la même chose à tous. Sinon le réglage du compte ; sans compte, le
 * cookie, puis le navigateur.
 */
export const langueDeLaRequete = cache(async (): Promise<Langue> => {
  const enTetes = await headers();
  const imposee = langueDepuisCode(enTetes.get(EN_TETE_DE_LANGUE));

  if (imposee) return imposee;

  const user = await lireLUtilisateur();

  if (user) return (await trouverLesReglages(user.id))?.langue ?? "FR";

  return langueDevinee({
    choix: (await cookies()).get(COOKIE_DE_LANGUE)?.value,
    acceptLanguage: enTetes.get("accept-language"),
  });
});
