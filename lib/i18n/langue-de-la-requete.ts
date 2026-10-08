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
 * Une page publique dont l'adresse porte la langue la suit, même pour
 * quelqu'un de connecté : l'adresse est ce qu'on partage, elle doit montrer la
 * même chose à tout le monde. Ailleurs, c'est le réglage du compte, et pour
 * qui n'en a pas encore — la connexion, l'inscription —, le choix retenu en
 * cookie ou à défaut le navigateur.
 *
 * Mémoïsée sur le rendu, comme la session dont elle dépend.
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
