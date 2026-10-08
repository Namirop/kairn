import { headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserSettings } from "@/lib/db/user-settings";
import type { Langue } from "@/lib/db/types";
import { langueDepuisCode } from "@/lib/domain/langue-devinee";
import { EN_TETE_DE_LANGUE } from "./langues";

/**
 * La langue dans laquelle rendre cette requête.
 *
 * Une page publique dont l'adresse porte la langue la suit, même pour
 * quelqu'un de connecté : l'adresse est ce qu'on partage, elle doit montrer la
 * même chose à tout le monde. Ailleurs, c'est le réglage du compte.
 *
 * Mémoïsée sur le rendu, comme la session dont elle dépend.
 */
export const langueDeLaRequete = cache(async (): Promise<Langue> => {
  const imposee = langueDepuisCode((await headers()).get(EN_TETE_DE_LANGUE));

  if (imposee) return imposee;

  const user = await getCurrentUser();

  if (user) return (await findUserSettings(user.id))?.langue ?? "FR";

  return "FR";
});
