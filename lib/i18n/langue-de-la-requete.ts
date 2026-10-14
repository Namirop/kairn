import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserSettings } from "@/lib/db/user-settings";
import type { Langue } from "@/lib/db/types";
import { langueDepuisCode, langueDevinee } from "@/lib/domain/langue-devinee";
import { COOKIE_DE_LANGUE, EN_TETE_DE_LANGUE } from "./langues";

/**
 * La langue dans laquelle rendre cette requête.
 *
 * Une page publique dont l'adresse porte la langue la suit, même connecté :
 * une adresse partagée montre la même chose à tous. Ailleurs, le réglage du
 * compte ; sans compte, le cookie, puis le navigateur.
 */
export const langueDeLaRequete = cache(async (): Promise<Langue> => {
  const enTetes = await headers();
  const imposee = langueDepuisCode(enTetes.get(EN_TETE_DE_LANGUE));

  if (imposee) return imposee;

  const user = await getCurrentUser();

  if (user) return (await findUserSettings(user.id))?.langue ?? "FR";

  return langueDevinee({
    choix: (await cookies()).get(COOKIE_DE_LANGUE)?.value,
    acceptLanguage: enTetes.get("accept-language"),
  });
});
